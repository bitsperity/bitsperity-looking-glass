import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { createBot, getChatId } from '../utils/bot.js';

const SendDocumentSchema = z.object({
  token: z.string().optional().describe("Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)"),
  chatId: z.union([z.string(), z.number()]).optional().describe("Chat ID or username (optional, uses TELEGRAM_DEFAULT_CHAT_ID if not provided)"),
  document: z.string().describe("Document file path, URL, or file_id"),
  caption: z.string().optional().describe("Document caption"),
  parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional().describe("Parse mode for caption"),
  disableNotification: z.boolean().optional().describe("Send document silently"),
  replyToMessageId: z.number().optional().describe("Reply to specific message ID"),
  filename: z.string().optional().describe("Custom filename for the document")
});

export const sendDocument = {
  name: "send_document",
  description: "Send a document/file to Telegram. Chat ID is automatically used from TELEGRAM_DEFAULT_CHAT_ID config. Document can be a local file path, HTTP/HTTPS URL, or Telegram file_id. Supports any file type (PDF, DOCX, XLSX, ZIP, etc.) up to Telegram's size limits (typically 50MB). Optionally specify custom filename or add caption with formatting. Returns message ID, document file_id, filename, and file size. Use this for sharing reports, data files, exports, or any documents.",
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
      document: {
        type: "string",
        description: "Document to send: local file path (e.g., '/path/to/file.pdf'), HTTP/HTTPS URL (e.g., 'https://example.com/data.csv'), or Telegram file_id (from previous message). Any file type supported (PDF, DOCX, CSV, JSON, etc.)."
      },
      caption: {
        type: "string",
        description: "Document caption text (optional). Max 1024 characters. Can include formatting if parseMode is set."
      },
      parseMode: {
        type: "string",
        enum: ["HTML", "Markdown", "MarkdownV2"],
        description: "Parse mode for rich text formatting in caption: HTML (supports <b>, <i>, <code>, <a href>), Markdown (*bold*, _italic_, `code`, [link](url)), or MarkdownV2 (more strict syntax). Leave empty for plain text caption."
      },
      disableNotification: {
        type: "boolean",
        description: "If true: sends document silently without triggering notification sound/vibration on recipient devices. Useful for non-urgent file shares or bulk sends."
      },
      replyToMessageId: {
        type: "number",
        description: "Optional message ID to reply to. Creates a threaded reply to the specified message. Get message IDs from previous message responses."
      },
      filename: {
        type: "string",
        description: "Custom filename for the document (optional). Overrides default filename from file path. Useful for renaming files or setting display names."
      }
    },
    required: ["document"]
  },
  
  async run(args: z.infer<typeof SendDocumentSchema>) {
    try {
      // Parameter validation
      const validatedArgs = SendDocumentSchema.parse(args);
      
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
      
      // Handle custom filename
      let documentInput = validatedArgs.document;
      if (validatedArgs.filename && !validatedArgs.document.startsWith('http') && !validatedArgs.document.includes('/')) {
        // If it's a file_id and we have a custom filename, we need to handle it differently
        documentInput = validatedArgs.document;
        options.filename = validatedArgs.filename;
      }
      
      // Send document
      const result = await bot.sendDocument(chatId, documentInput, options);
      
      return {
        content: [{
          type: "text",
          text: `✅ Document sent successfully!\n\n**Message ID:** ${result.message_id}\n**Chat ID:** ${result.chat.id}\n**Date:** ${new Date(result.date * 1000).toISOString()}\n**Document ID:** ${result.document?.file_id}\n**Filename:** ${result.document?.file_name || 'Unknown'}\n**Size:** ${result.document?.file_size ? `${Math.round(result.document.file_size / 1024)} KB` : 'Unknown'}\n**Caption:** ${result.caption || 'No caption'}`
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to send document: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
};