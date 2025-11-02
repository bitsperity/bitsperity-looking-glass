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
  description: "Send a video file to Telegram. Chat ID is automatically used from TELEGRAM_DEFAULT_CHAT_ID config. Video can be a local file path, HTTP/HTTPS URL, or Telegram file_id. Supports MP4, MOV, AVI, and other video formats up to Telegram's size limits (typically 50MB). Optionally specify duration, dimensions (width/height), caption with formatting, or enable streaming support. Returns message ID, video file_id, duration, dimensions, and file size. Use this for sharing video content, recordings, or media files.",
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
      video: {
        type: "string",
        description: "Video to send: local file path (e.g., '/path/to/video.mp4'), HTTP/HTTPS URL (e.g., 'https://example.com/video.mp4'), or Telegram file_id (from previous message). Supported formats: MP4, MOV, AVI, etc."
      },
      duration: {
        type: "number",
        description: "Video duration in seconds (optional). Helps Telegram optimize video handling. If omitted, Telegram may extract from file metadata."
      },
      width: {
        type: "number",
        description: "Video width in pixels (optional). Helps Telegram optimize video handling. If omitted, Telegram may extract from file metadata."
      },
      height: {
        type: "number",
        description: "Video height in pixels (optional). Helps Telegram optimize video handling. If omitted, Telegram may extract from file metadata."
      },
      caption: {
        type: "string",
        description: "Video caption text (optional). Max 1024 characters. Can include formatting if parseMode is set."
      },
      parseMode: {
        type: "string",
        enum: ["HTML", "Markdown", "MarkdownV2"],
        description: "Parse mode for rich text formatting in caption: HTML (supports <b>, <i>, <code>, <a href>), Markdown (*bold*, _italic_, `code`, [link](url)), or MarkdownV2 (more strict syntax). Leave empty for plain text caption."
      },
      supportsStreaming: {
        type: "boolean",
        description: "If true: indicates video is suitable for streaming (allows playback while downloading). If false or omitted: video must be fully downloaded before playback."
      },
      disableNotification: {
        type: "boolean",
        description: "If true: sends video silently without triggering notification sound/vibration on recipient devices. Useful for non-urgent videos or bulk sends."
      },
      replyToMessageId: {
        type: "number",
        description: "Optional message ID to reply to. Creates a threaded reply to the specified message. Get message IDs from previous message responses."
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