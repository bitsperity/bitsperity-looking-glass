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
    const provider = process.env.LLM_PROVIDER || 'openai';

    if (provider === 'openai' || model.includes('gpt')) {
      // OpenAI pricing (much cheaper for testing!)
      // gpt-4o-mini: $0.15 input / $0.60 output per 1M
      // gpt-4o: $2.50 input / $10 output per 1M
      const rates = model.includes('mini') || model.includes('haiku')
        ? { input: 0.15, output: 0.60 }
        : { input: 2.50, output: 10 };

      return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
    } else {
      // Anthropic pricing
      // Haiku 4.5: $1 input / $5 output per 1M
      // Sonnet 4.5: $3 input / $15 output per 1M
      const rates = model.includes('haiku')
        ? { input: 1, output: 5 }
        : { input: 3, output: 15 };

      return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
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
