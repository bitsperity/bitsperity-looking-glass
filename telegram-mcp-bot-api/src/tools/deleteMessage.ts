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
  description: "Delete a message from a Telegram chat. The bot must be able to delete messages in the chat (admin permissions for groups/channels, or own messages in private chats). Returns deletion confirmation. Useful for cleanup, removing outdated information, or content moderation. Note: Can only delete messages the bot sent or messages in chats where the bot has delete permission.",
  parameters: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "Telegram bot token (optional, defaults to TELEGRAM_BOT_TOKEN environment variable if not provided)"
      },
      chatId: {
        type: ["string", "number"],
        description: "Chat ID or username where the message to delete is located. Format: numeric ID (e.g., -1001234567890 for groups) or @username (for channels/public chats)."
      },
      messageId: {
        type: "number",
        description: "ID of the message to delete. Get message IDs from previous message responses (message_id field) or by inspecting chat messages."
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