import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { createBot } from '../utils/bot.js';

const DeleteMessageSchema = z.object({
  token: z.string().optional().describe("Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)"),
  chatId: z.union([z.string(), z.number()]).describe("Chat ID or username"),
  messageId: z.number().describe("Message ID to delete")
});

export const deleteMessage = {
  name: "delete_message",
  description: "Delete a message from a Telegram chat",
  parameters: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "Telegram bot token"
      },
      chatId: {
        type: ["string", "number"],
        description: "Chat ID or username (e.g., @username or -1001234567890)"
      },
      messageId: {
        type: "number",
        description: "ID of the message to delete"
      }
    },
    required: ["chatId", "messageId"]
  },
  
  async run(args: z.infer<typeof DeleteMessageSchema>) {
    try {
      // Parameter validation
      const validatedArgs = DeleteMessageSchema.parse(args);
      
      // Create bot instance
      const bot = createBot(validatedArgs.token);
      
      // Delete message
      const result = await bot.deleteMessage(validatedArgs.chatId, validatedArgs.messageId);
      
      if (result) {
        return {
          content: [{
            type: "text",
            text: `✅ Message deleted successfully!\n\n**Chat ID:** ${validatedArgs.chatId}\n**Message ID:** ${validatedArgs.messageId}\n**Deleted at:** ${new Date().toISOString()}`
          }]
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `⚠️ Message deletion failed or message was already deleted.\n\n**Chat ID:** ${validatedArgs.chatId}\n**Message ID:** ${validatedArgs.messageId}`
          }],
          isError: true
        };
      }
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to delete message: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
};