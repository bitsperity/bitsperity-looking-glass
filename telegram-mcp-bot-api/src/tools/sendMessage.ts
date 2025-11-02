import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { createBot, getChatId } from '../utils/bot.js';

const SendMessageSchema = z.object({
  token: z.string().optional().describe("Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)"),
  chatId: z.union([z.string(), z.number()]).optional().describe("Chat ID or username (optional, uses TELEGRAM_DEFAULT_CHAT_ID if not provided)"),
  text: z.string().describe("Message text to send"),
  parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional().describe("Parse mode for formatting"),
  disableWebPagePreview: z.boolean().optional().describe("Disable web page preview"),
  disableNotification: z.boolean().optional().describe("Send message silently"),
  replyToMessageId: z.number().optional().describe("Reply to specific message ID")
});

export const sendMessage = {
  name: "send_message",
  description: "Send a text message to Telegram. Chat ID is automatically used from TELEGRAM_DEFAULT_CHAT_ID config - agents typically only need to provide the message text. Supports rich text formatting via parse_mode (HTML, Markdown, MarkdownV2). Can disable link previews, send silently (no notification), or reply to specific messages. Returns message ID and confirmation. Essential for agent notifications, summaries, alerts, or user communication. Max message length: 4096 characters (split longer messages into multiple calls).",
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
      text: {
        type: "string",
        description: "Message text to send. Max 4096 characters. Can include formatting if parseMode is set. For longer messages, split into multiple calls."
      },
      parseMode: {
        type: "string",
        enum: ["HTML", "Markdown", "MarkdownV2"],
        description: "Parse mode for rich text formatting: HTML (supports <b>, <i>, <code>, <a href>), Markdown (*bold*, _italic_, `code`, [link](url)), or MarkdownV2 (more strict Markdown syntax). Leave empty for plain text."
      },
      disableWebPagePreview: {
        type: "boolean",
        description: "If true: disables automatic link previews for URLs in the message. Useful when sending raw URLs without wanting preview cards."
      },
      disableNotification: {
        type: "boolean",
        description: "If true: sends message silently without triggering notification sound/vibration on recipient devices. Useful for non-urgent updates or bulk messages."
      },
      replyToMessageId: {
        type: "number",
        description: "Optional message ID to reply to. Creates a threaded reply to the specified message. Get message IDs from previous message responses."
      }
    },
      required: ["text"]
  },
  
  async run(args: z.infer<typeof SendMessageSchema>) {
    try {
      // Parameter validation
      const validatedArgs = SendMessageSchema.parse(args);
      
      // Get chat ID (from args or default from env)
      const chatId = getChatId(validatedArgs.chatId);
      
      // Create bot instance
      const bot = createBot(validatedArgs.token);
      
      // Prepare options
      const options: any = {};
      if (validatedArgs.parseMode) options.parse_mode = validatedArgs.parseMode;
      if (validatedArgs.disableWebPagePreview) options.disable_web_page_preview = validatedArgs.disableWebPagePreview;
      if (validatedArgs.disableNotification) options.disable_notification = validatedArgs.disableNotification;
      if (validatedArgs.replyToMessageId) options.reply_to_message_id = validatedArgs.replyToMessageId;
      
      // Send message
      const result = await bot.sendMessage(chatId, validatedArgs.text, options);
      
      return {
        content: [{
          type: "text",
          text: `✅ Message sent successfully!\n\n**Message ID:** ${result.message_id}\n**Chat ID:** ${result.chat.id}\n**Date:** ${new Date(result.date * 1000).toISOString()}\n**Text:** ${result.text}`
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to send message: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
};