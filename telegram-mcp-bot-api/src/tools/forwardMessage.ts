import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { createBot } from '../utils/bot.js';

const ForwardMessageSchema = z.object({
  token: z.string().optional().describe("Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)"),
  chatId: z.union([z.string(), z.number()]).describe("Destination chat ID or username"),
  fromChatId: z.union([z.string(), z.number()]).describe("Source chat ID or username"),
  messageId: z.number().describe("Message ID to forward"),
  disableNotification: z.boolean().optional().describe("Send message silently")
});

export const forwardMessage = {
  name: "forward_message",
  description: "Forward a message from one chat to another",
  parameters: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "Telegram bot token"
      },
      chatId: {
        type: ["string", "number"],
        description: "Destination chat ID or username (e.g., @username or -1001234567890)"
      },
      fromChatId: {
        type: ["string", "number"],
        description: "Source chat ID or username where the message is located"
      },
      messageId: {
        type: "number",
        description: "ID of the message to forward"
      },
      disableNotification: {
        type: "boolean",
        description: "Send message silently (no notification)"
      }
    },
    required: ["chatId", "fromChatId", "messageId"]
  },
  
  async run(args: z.infer<typeof ForwardMessageSchema>) {
    try {
      // Parameter validation
      const validatedArgs = ForwardMessageSchema.parse(args);
      
      // Create bot instance
      const bot = createBot(validatedArgs.token);
      
      // Prepare options
      const options: any = {};
      if (validatedArgs.disableNotification) {
        options.disable_notification = validatedArgs.disableNotification;
      }
      
      // Forward message
      const result = await bot.forwardMessage(
        validatedArgs.chatId,
        validatedArgs.fromChatId,
        validatedArgs.messageId,
        options
      );
      
      return {
        content: [{
          type: "text",
          text: `✅ Message forwarded successfully!\n\n**New Message ID:** ${result.message_id}\n**Destination Chat ID:** ${result.chat.id}\n**Source Chat ID:** ${validatedArgs.fromChatId}\n**Original Message ID:** ${validatedArgs.messageId}\n**Date:** ${new Date(result.date * 1000).toISOString()}\n**Forward Date:** ${result.forward_date ? new Date(result.forward_date * 1000).toISOString() : 'N/A'}`
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to forward message: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
};