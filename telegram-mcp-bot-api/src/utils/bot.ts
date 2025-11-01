import TelegramBot from 'node-telegram-bot-api';

/**
 * Get Telegram bot token from arguments or environment variable
 */
export function getBotToken(token?: string): string {
  const finalToken = token || process.env.TELEGRAM_BOT_TOKEN;
  if (!finalToken) {
    throw new Error("Telegram bot token is required. Provide it as 'token' parameter or set TELEGRAM_BOT_TOKEN environment variable.");
  }
  return finalToken;
}

/**
 * Get default chat ID from environment variable
 * This allows agents to send messages without specifying chatId
 */
export function getDefaultChatId(): string | number | undefined {
  const chatId = process.env.TELEGRAM_DEFAULT_CHAT_ID;
  if (!chatId) {
    return undefined;
  }
  // Try to parse as number if it's a numeric string
  const numChatId = Number(chatId);
  if (!isNaN(numChatId)) {
    return numChatId;
  }
  return chatId;
}

/**
 * Get chat ID from args or use default from environment
 */
export function getChatId(chatId?: string | number): string | number {
  if (chatId !== undefined) {
    return chatId;
  }
  const defaultChatId = getDefaultChatId();
  if (defaultChatId === undefined) {
    throw new Error("Chat ID is required. Provide it as 'chatId' parameter or set TELEGRAM_DEFAULT_CHAT_ID environment variable.");
  }
  return defaultChatId;
}

/**
 * Create a Telegram bot instance with token from args or env
 */
export function createBot(token?: string): TelegramBot {
  return new TelegramBot(getBotToken(token));
}

