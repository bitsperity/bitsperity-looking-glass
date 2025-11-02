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
  description: "Send a photo image to Telegram. Chat ID is automatically used from TELEGRAM_DEFAULT_CHAT_ID config - agents typically only need to provide the photo. Photo can be a local file path, HTTP/HTTPS URL, or Telegram file_id (from previous message). Optionally add caption with rich text formatting (HTML/Markdown). Supports sending silently (no notification) or replying to specific messages. Returns message ID and photo file_id. Use this for sharing images, charts, screenshots, or visual content.",
  parameters: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "Telegram bot token (optional, defaults to TELEGRAM_BOT_TOKEN environment variable if not provided)"
      },
      chatId: {
        type: ["string", "number"],
        description: "Chat ID or username (optional, automatically uses TELEGRAM_DEFAULT_CHAT_ID from config if not provided). Use this to override default chat."
      },
      photo: {
        type: "string",
        description: "Photo to send: local file path (e.g., '/path/to/image.jpg'), HTTP/HTTPS URL (e.g., 'https://example.com/image.png'), or Telegram file_id (from previous message). Supported formats: JPG, PNG, GIF, WebP."
      },
      caption: {
        type: "string",
        description: "Photo caption text (optional). Max 1024 characters. Can include formatting if parseMode is set."
      },
      parseMode: {
        type: "string",
        enum: ["HTML", "Markdown", "MarkdownV2"],
        description: "Parse mode for rich text formatting in caption: HTML (supports <b>, <i>, <code>, <a href>), Markdown (*bold*, _italic_, `code`, [link](url)), or MarkdownV2 (more strict syntax). Leave empty for plain text caption."
      },
      disableNotification: {
        type: "boolean",
        description: "If true: sends photo silently without triggering notification sound/vibration on recipient devices. Useful for non-urgent images or bulk sends."
      },
      replyToMessageId: {
        type: "number",
        description: "Optional message ID to reply to. Creates a threaded reply to the specified message. Get message IDs from previous message responses."
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