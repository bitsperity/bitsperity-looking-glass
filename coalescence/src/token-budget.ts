import { logger } from './logger.js';
import { getModelPricing } from './model-mapper.js';

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

  async calculateCost(inputTokens: number, outputTokens: number, model: string): Promise<number> {
    // Use model mapper to get pricing
    const pricing = await getModelPricing(model);
    
    const cost = (inputTokens * pricing.input_mtok + outputTokens * pricing.output_mtok) / 1_000_000;
    
    logger.debug(
      { 
        model, 
        inputTokens, 
        outputTokens, 
        pricing,
        cost 
      },
      'Cost calculated'
    );
    
    return cost;
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
