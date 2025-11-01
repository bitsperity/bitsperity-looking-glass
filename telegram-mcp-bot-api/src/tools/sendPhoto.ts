import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { createBot, getChatId } from '../utils/bot.js';

const SendPhotoSchema = z.object({
  token: z.string().optional().describe("Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)"),
  chatId: z.union([z.string(), z.number()]).optional().describe("Chat ID or username (optional, uses TELEGRAM_DEFAULT_CHAT_ID if not provided)"),
  photo: z.string().describe("Photo file path, URL, or file_id"),
  caption: z.string().optional().describe("Photo caption"),
  parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional().describe("Parse mode for caption"),
  disableNotification: z.boolean().optional().describe("Send photo silently"),
  replyToMessageId: z.number().optional().describe("Reply to specific message ID")
});

export const sendPhoto = {
  name: "send_photo",
  description: "Send a photo to the default Telegram chat. Chat ID is automatically used from config.",
  parameters: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "Telegram bot token (optional, uses TELEGRAM_BOT_TOKEN env var)"
      },
      chatId: {
        type: ["string", "number"],
        description: "Chat ID or username (optional, automatically uses TELEGRAM_DEFAULT_CHAT_ID from config)"
      },
      photo: {
        type: "string",
        description: "Photo file path, URL, or Telegram file_id"
      },
      caption: {
        type: "string",
        description: "Photo caption (optional)"
      },
      parseMode: {
        type: "string",
        enum: ["HTML", "Markdown", "MarkdownV2"],
        description: "Parse mode for caption formatting"
      },
      disableNotification: {
        type: "boolean",
        description: "Send photo silently (no notification)"
      },
      replyToMessageId: {
        type: "number",
        description: "Reply to specific message ID"
      }
    },
    required: ["photo"]
  },
  
  async run(args: z.infer<typeof SendPhotoSchema>) {
    try {
      // Parameter validation
      const validatedArgs = SendPhotoSchema.parse(args);
      
      // Get chat ID (from args or default from env)
      const chatId = getChatId(validatedArgs.chatId);
      
      // Create bot instance
      const bot = createBot(validatedArgs.token);
      
      // Prepare options
      const options: any = {};
      if (validatedArgs.caption) options.caption = validatedArgs.caption;
      if (validatedArgs.parseMode) options.parse_mode = validatedArgs.parseMode;
      if (validatedArgs.disableNotification) options.disable_notification = validatedArgs.disableNotification;
      if (validatedArgs.replyToMessageId) options.reply_to_message_id = validatedArgs.replyToMessageId;
      
      // Send photo
      const result = await bot.sendPhoto(chatId, validatedArgs.photo, options);
      
      return {
        content: [{
          type: "text",
          text: `✅ Photo sent successfully!\n\n**Message ID:** ${result.message_id}\n**Chat ID:** ${result.chat.id}\n**Date:** ${new Date(result.date * 1000).toISOString()}\n**Photo ID:** ${result.photo?.[0]?.file_id}\n**Caption:** ${result.caption || 'No caption'}`
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to send photo: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
};