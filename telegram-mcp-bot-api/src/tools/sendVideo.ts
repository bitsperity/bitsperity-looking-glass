import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { createBot, getChatId } from '../utils/bot.js';

const SendVideoSchema = z.object({
  token: z.string().optional().describe("Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)"),
  chatId: z.union([z.string(), z.number()]).optional().describe("Chat ID or username (optional, uses TELEGRAM_DEFAULT_CHAT_ID if not provided)"),
  video: z.string().describe("Video file path, URL, or file_id"),
  duration: z.number().optional().describe("Video duration in seconds"),
  width: z.number().optional().describe("Video width"),
  height: z.number().optional().describe("Video height"),
  caption: z.string().optional().describe("Video caption"),
  parseMode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional().describe("Parse mode for caption"),
  supportsStreaming: z.boolean().optional().describe("Pass True if the video is suitable for streaming"),
  disableNotification: z.boolean().optional().describe("Send video silently"),
  replyToMessageId: z.number().optional().describe("Reply to specific message ID")
});

export const sendVideo = {
  name: "send_video",
  description: "Send a video to the default Telegram chat. Chat ID is automatically used from config.",
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
      video: {
        type: "string",
        description: "Video file path, URL, or Telegram file_id"
      },
      duration: {
        type: "number",
        description: "Video duration in seconds (optional)"
      },
      width: {
        type: "number",
        description: "Video width in pixels (optional)"
      },
      height: {
        type: "number",
        description: "Video height in pixels (optional)"
      },
      caption: {
        type: "string",
        description: "Video caption (optional)"
      },
      parseMode: {
        type: "string",
        enum: ["HTML", "Markdown", "MarkdownV2"],
        description: "Parse mode for caption formatting"
      },
      supportsStreaming: {
        type: "boolean",
        description: "Pass True if the video is suitable for streaming"
      },
      disableNotification: {
        type: "boolean",
        description: "Send video silently (no notification)"
      },
      replyToMessageId: {
        type: "number",
        description: "Reply to specific message ID"
      }
    },
    required: ["video"]
  },
  
  async run(args: z.infer<typeof SendVideoSchema>) {
    try {
      // Parameter validation
      const validatedArgs = SendVideoSchema.parse(args);
      
      // Get chat ID (from args or default from env)
      const chatId = getChatId(validatedArgs.chatId);
      
      // Create bot instance
      const bot = createBot(validatedArgs.token);
      
      // Prepare options
      const options: any = {};
      if (validatedArgs.duration) options.duration = validatedArgs.duration;
      if (validatedArgs.width) options.width = validatedArgs.width;
      if (validatedArgs.height) options.height = validatedArgs.height;
      if (validatedArgs.caption) options.caption = validatedArgs.caption;
      if (validatedArgs.parseMode) options.parse_mode = validatedArgs.parseMode;
      if (validatedArgs.supportsStreaming) options.supports_streaming = validatedArgs.supportsStreaming;
      if (validatedArgs.disableNotification) options.disable_notification = validatedArgs.disableNotification;
      if (validatedArgs.replyToMessageId) options.reply_to_message_id = validatedArgs.replyToMessageId;
      
      // Send video
      const result = await bot.sendVideo(chatId, validatedArgs.video, options);
      
      return {
        content: [{
          type: "text",
          text: `✅ Video sent successfully!\n\n**Message ID:** ${result.message_id}\n**Chat ID:** ${result.chat.id}\n**Date:** ${new Date(result.date * 1000).toISOString()}\n**Video ID:** ${result.video?.file_id}\n**Duration:** ${result.video?.duration ? `${result.video.duration}s` : 'Unknown'}\n**Dimensions:** ${result.video?.width && result.video?.height ? `${result.video.width}x${result.video.height}` : 'Unknown'}\n**Size:** ${result.video?.file_size ? `${Math.round(result.video.file_size / 1024)} KB` : 'Unknown'}\n**Caption:** ${result.caption || 'No caption'}`
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to send video: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
};