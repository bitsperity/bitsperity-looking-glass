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
  description: "Send a text message to the default Telegram chat. Chat ID is automatically used from config - agents only need to provide the message text.",
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
      text: {
        type: "string",
        description: "Message text to send"
      },
      parseMode: {
        type: "string",
        enum: ["HTML", "Markdown", "MarkdownV2"],
        description: "Parse mode for text formatting"
      },
      disableWebPagePreview: {
        type: "boolean",
        description: "Disable web page preview for links"
      },
      disableNotification: {
        type: "boolean",
        description: "Send message silently (no notification)"
      },
      replyToMessageId: {
        type: "number",
        description: "Reply to specific message ID"
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