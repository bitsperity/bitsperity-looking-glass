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
      // Anthropic pricing
      // claude-3-5-haiku-latest: $0.80 input / $4 output per 1M
      // claude-3-5-sonnet-latest: $3 input / $15 output per 1M
      const rates = model.includes('haiku')
        ? { input: 0.80, output: 4 }
        : { input: 3, output: 15 };

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
