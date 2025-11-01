import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { createBot } from '../utils/bot.js';

const GetChatSchema = z.object({
  token: z.string().optional().describe("Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)"),
  chatId: z.union([z.string(), z.number()]).describe("Chat ID or username")
});

export const getChat = {
  name: "get_chat",
  description: "Get information about a Telegram chat",
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
      }
    },
    required: ["chatId"]
  },
  
  async run(args: z.infer<typeof GetChatSchema>) {
    try {
      // Parameter validation
      const validatedArgs = GetChatSchema.parse(args);
      
      // Create bot instance
      const bot = createBot(validatedArgs.token);
      
      // Get chat information
      const chat = await bot.getChat(validatedArgs.chatId);
      
      // Format chat information
      let chatInfo = `# Chat Information\n\n`;
      chatInfo += `**ID:** ${chat.id}\n`;
      chatInfo += `**Type:** ${chat.type}\n`;
      
      if (chat.title) chatInfo += `**Title:** ${chat.title}\n`;
      if (chat.username) chatInfo += `**Username:** @${chat.username}\n`;
      if (chat.first_name) chatInfo += `**First Name:** ${chat.first_name}\n`;
      if (chat.last_name) chatInfo += `**Last Name:** ${chat.last_name}\n`;
      if (chat.description) chatInfo += `**Description:** ${chat.description}\n`;
      if (chat.invite_link) chatInfo += `**Invite Link:** ${chat.invite_link}\n`;
      
      // Additional information for groups/supergroups
      if (chat.type === 'group' || chat.type === 'supergroup') {
        if ('all_members_are_administrators' in chat) {
          chatInfo += `**All Members Are Administrators:** ${chat.all_members_are_administrators}\n`;
        }
        if ('permissions' in chat && chat.permissions) {
          chatInfo += `\n## Chat Permissions\n`;
          const perms = chat.permissions as any;
          chatInfo += `- **Can Send Messages:** ${perms.can_send_messages || false}\n`;
          chatInfo += `- **Can Send Media:** ${perms.can_send_media_messages || perms.can_send_messages || false}\n`;
          chatInfo += `- **Can Send Polls:** ${perms.can_send_polls || false}\n`;
          chatInfo += `- **Can Send Other Messages:** ${perms.can_send_other_messages || false}\n`;
          chatInfo += `- **Can Add Web Page Previews:** ${perms.can_add_web_page_previews || false}\n`;
          chatInfo += `- **Can Change Info:** ${perms.can_change_info || false}\n`;
          chatInfo += `- **Can Invite Users:** ${perms.can_invite_users || false}\n`;
          chatInfo += `- **Can Pin Messages:** ${perms.can_pin_messages || false}\n`;
        }
      }
      
      // Channel specific information
      if (chat.type === 'channel') {
        if ('linked_chat_id' in chat && chat.linked_chat_id) {
          chatInfo += `**Linked Chat ID:** ${chat.linked_chat_id}\n`;
        }
      }
      
      return {
        content: [{
          type: "text",
          text: chatInfo
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to get chat information: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
};