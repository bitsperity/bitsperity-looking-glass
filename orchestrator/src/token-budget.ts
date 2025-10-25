import { logger } from './logger.js';

export class TokenBudgetManager {
  private dailyLimit: number;
  private used: Map<string, number>;  // agent -> tokens used today

  constructor(config: { daily_tokens: number; monthly_budget_usd: number }) {
    this.dailyLimit = config.daily_tokens;
    this.used = new Map();
  }

  canSpend(agent: string, tokens: number): boolean {
    const totalUsed = Array.from(this.used.values()).reduce((a, b) => a + b, 0);
    const canSpend = totalUsed + tokens <= this.dailyLimit;

    if (!canSpend) {
      logger.warn(
        { agent, requestedTokens: tokens, totalUsed, dailyLimit: this.dailyLimit },
        'Budget check failed'
      );
    }

    return canSpend;
  }

  record(agent: string, tokens: number): void {
    const current = this.used.get(agent) || 0;
    this.used.set(agent, current + tokens);

    const totalUsed = Array.from(this.used.values()).reduce((a, b) => a + b, 0);
    logger.info(
      { agent, tokensAdded: tokens, agentTotal: current + tokens, dailyTotal: totalUsed },
      'Tokens recorded'
    );
  }

  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    // Auto-detect provider from model name
    if (model.startsWith('gpt-')) {
      // OpenAI pricing
      // gpt-4o-mini: $0.15 input / $0.60 output per 1M
      // gpt-4o: $2.50 input / $10 output per 1M
      const rates = model.includes('mini')
        ? { input: 0.15, output: 0.60 }
        : { input: 2.50, output: 10 };

      return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
    } else if (model.startsWith('claude-')) {
      // Anthropic pricing - handle all versions
      let rates = { input: 0.80, output: 4 }; // Default to Haiku 3.5 (cheapest)

      // Claude 4.5 models (Oct 2025)
      if (model.includes('haiku-4-5')) {
        rates = { input: 1, output: 5 };
      } else if (model.includes('sonnet-4-5')) {
        rates = { input: 3, output: 15 };
      } else if (model.includes('opus-4-1')) {
        rates = { input: 15, output: 75 };
      }
      // Claude 3.7 models
      else if (model.includes('3-7-sonnet')) {
        rates = { input: 3, output: 15 };
      }
      // Claude 3.5 models (default)
      else if (model.includes('3-5-haiku')) {
        rates = { input: 0.80, output: 4 };
      } else if (model.includes('3-5-sonnet')) {
        rates = { input: 3, output: 15 };
      } else if (model.includes('3-5-opus')) {
        rates = { input: 15, output: 75 };
      }
      // Claude 3 models
      else if (model.includes('3-haiku')) {
        rates = { input: 0.25, output: 1.25 };
      } else if (model.includes('3-sonnet')) {
        rates = { input: 3, output: 15 };
      } else if (model.includes('3-opus')) {
        rates = { input: 15, output: 75 };
      }

      return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
    } else {
      // Unknown model - use default Anthropic Haiku pricing
      logger.warn({ model }, 'Unknown model for cost calculation, using Haiku pricing');
      return (inputTokens * 0.80 + outputTokens * 4) / 1_000_000;
    }
  }

  getDailyUsage(): { total: number; limit: number; percentage: number } {
    const total = Array.from(this.used.values()).reduce((a, b) => a + b, 0);
    return {
      total,
      limit: this.dailyLimit,
      percentage: (total / this.dailyLimit) * 100
    };
  }

  resetDaily(): void {
    logger.info(this.getDailyUsage(), 'Daily budget reset');
    this.used.clear();
  }
}
