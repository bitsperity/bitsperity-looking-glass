import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { createBot, getBotToken } from '../utils/bot.js';

const GetUpdatesSchema = z.object({
  token: z.string().optional().describe("Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)"),
  offset: z.number().optional().describe("Identifier of the first update to be returned"),
  limit: z.number().optional().describe("Limits the number of updates to be retrieved (1-100)"),
  deleteWebhook: z.boolean().optional().describe("Delete webhook before getting updates (default: true)")
});

export const getUpdates = {
  name: "get_updates",
  description: "Get recent updates from Telegram (useful for finding chat IDs). Automatically deletes webhooks to enable polling.",
  parameters: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)"
      },
      offset: {
        type: "number",
        description: "Identifier of the first update to be returned"
      },
      limit: {
        type: "number",
        description: "Limits the number of updates to be retrieved (1-100, default: 100)"
      },
      deleteWebhook: {
        type: "boolean",
        description: "Delete webhook before getting updates (default: true)"
      }
    },
    required: []
  },
  
  async run(args: z.infer<typeof GetUpdatesSchema>) {
    try {
      // Parameter validation
      const validatedArgs = GetUpdatesSchema.parse(args);
      
      // Get token
      const token = getBotToken(validatedArgs.token);
      
      // Create bot instance
      const bot = createBot(token);
      
      // Delete webhook first if requested (default: true)
      const shouldDeleteWebhook = validatedArgs.deleteWebhook !== false;
      if (shouldDeleteWebhook) {
        try {
          await bot.deleteWebHook();
          // Small delay to ensure webhook deletion is processed
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          // Ignore errors if webhook doesn't exist
          console.error("Webhook deletion note:", error instanceof Error ? error.message : String(error));
        }
      }
      
      // Prepare options
      const options: any = {};
      if (validatedArgs.offset !== undefined) options.offset = validatedArgs.offset;
      if (validatedArgs.limit !== undefined) options.limit = validatedArgs.limit;
      
      // Get updates
      const updates = await bot.getUpdates(options);
      
      if (updates.length === 0) {
        return {
          content: [{
            type: "text",
            text: `📭 Keine Updates gefunden.

**Hinweise:**
1. Stelle sicher, dass der Bot (@no3sis_bot) in der Gruppe ist
2. Sende eine Nachricht an den Bot in der Gruppe (z.B. "hi" oder "/start")
3. Der Bot muss die Nachricht empfangen können (Gruppenrechte prüfen)
4. Warte ein paar Sekunden und versuche es erneut

**Alternative:** Du kannst die Chat-ID manuell herausfinden:
- Für Gruppen: Die Chat-ID ist meist negativ (z.B. -1001234567890)
- Öffne: https://api.telegram.org/bot${token}/getUpdates
- Suche nach "chat":{"id": in der JSON-Antwort

**Direkt senden:** Wenn du die Chat-ID kennst, kannst du direkt send_message verwenden!`
          }]
        };
      }
      
      // Format updates
      let result = `# Recent Updates (${updates.length})\n\n`;
      
      for (const update of updates) {
        if (update.message) {
          const msg = update.message;
          result += `## Update ID: ${update.update_id}\n`;
          result += `**Chat ID:** \`${msg.chat.id}\`\n`;
          result += `**Chat Type:** ${msg.chat.type}\n`;
          
          if (msg.chat.title) result += `**Group Title:** ${msg.chat.title}\n`;
          if (msg.chat.username) result += `**Username:** @${msg.chat.username}\n`;
          if (msg.chat.first_name) result += `**First Name:** ${msg.chat.first_name}\n`;
          if (msg.text) result += `**Message:** ${msg.text}\n`;
          
          result += `\n---\n\n`;
        }
      }
      
      // Extract unique chat IDs with better formatting
      const chatMap = new Map();
      for (const update of updates) {
        if (update.message?.chat) {
          const chat = update.message.chat;
          const chatId = chat.id;
          if (!chatMap.has(chatId)) {
            chatMap.set(chatId, {
              id: chatId,
              type: chat.type,
              title: chat.title,
              username: chat.username,
              first_name: chat.first_name,
              last_name: chat.last_name,
              lastMessage: update.message.text || '[Media/Other]',
              lastUpdate: update.update_id
            });
          }
        }
      }
      
      result += `## 📋 Found Chats:\n\n`;
      
      // Group by type
      const groups = Array.from(chatMap.values()).filter(c => c.type === 'group' || c.type === 'supergroup');
      const privates = Array.from(chatMap.values()).filter(c => c.type === 'private');
      
      if (groups.length > 0) {
        result += `### 👥 Groups (${groups.length}):\n`;
        for (const chat of groups) {
          result += `- **${chat.title || 'Unnamed Group'}**\n`;
          result += `  - Chat ID: \`${chat.id}\`\n`;
          result += `  - Type: ${chat.type}\n`;
          if (chat.username) result += `  - Username: @${chat.username}\n`;
          result += `  - Last message: ${chat.lastMessage.substring(0, 50)}${chat.lastMessage.length > 50 ? '...' : ''}\n`;
          result += `\n`;
        }
      }
      
      if (privates.length > 0) {
        result += `### 💬 Private Chats (${privates.length}):\n`;
        for (const chat of privates) {
          const name = chat.first_name ? `${chat.first_name} ${chat.last_name || ''}`.trim() : chat.username || 'Unknown';
          result += `- **${name}**\n`;
          result += `  - Chat ID: \`${chat.id}\`\n`;
          if (chat.username) result += `  - Username: @${chat.username}\n`;
          result += `  - Last message: ${chat.lastMessage.substring(0, 50)}${chat.lastMessage.length > 50 ? '...' : ''}\n`;
          result += `\n`;
        }
      }
      
      result += `\n💡 **Tipp:** Verwende die Chat ID (z.B. \`${groups[0]?.id || privates[0]?.id || 'N/A'}\`) für send_message!\n`;
      
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Failed to get updates: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
};

