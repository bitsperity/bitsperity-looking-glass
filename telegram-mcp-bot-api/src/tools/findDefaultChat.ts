import TelegramBot from 'node-telegram-bot-api';
import { z } from 'zod';
import { createBot, getDefaultChatId, getBotToken } from '../utils/bot.js';

const FindDefaultChatSchema = z.object({
  token: z.string().optional().describe("Telegram bot token (defaults to TELEGRAM_BOT_TOKEN env var)")
});

export const findDefaultChat = {
  name: "find_default_chat",
  description: "Find and verify the default Telegram chat configured via TELEGRAM_DEFAULT_CHAT_ID environment variable. Returns detailed chat information including ID, title/name, type (private/group/supergroup/channel), username, description, and metadata. Helps agents understand which chat they're automatically using for send_message, send_photo, etc. If no default chat is configured, returns error with setup instructions. Use this to verify chat configuration or discover the active chat.",
  parameters: {
    type: "object",
    properties: {
      token: {
        type: "string",
        description: "Telegram bot token (optional, defaults to TELEGRAM_BOT_TOKEN environment variable if not provided)"
      }
    },
    required: []
  },
  
  async run(args: z.infer<typeof FindDefaultChatSchema>) {
    try {
      // Parameter validation
      const validatedArgs = FindDefaultChatSchema.parse(args);
      
      // Get default chat ID from env
      const defaultChatId = getDefaultChatId();
      
      if (!defaultChatId) {
        return {
          content: [{
            type: "text",
            text: `⚠️ Keine Standard-Chat-ID konfiguriert.

**Setup:**
Setze die Environment Variable TELEGRAM_DEFAULT_CHAT_ID in der MCP-Config.

**Beispiel:**
\`\`\`yaml
env:
  TELEGRAM_DEFAULT_CHAT_ID: "-5049991716"
\`\`\`

Oder verwende send_message mit expliziter chatId.`
          }],
          isError: true
        };
      }
      
      // Create bot instance
      const bot = createBot(validatedArgs.token);
      
      // Get chat information
      const chatInfo = await bot.getChat(defaultChatId);
      
      const result = `# Standard Telegram Chat Info

**Chat ID:** \`${chatInfo.id}\`
**Titel:** ${chatInfo.title || chatInfo.first_name || 'Unbekannt'}
**Typ:** ${chatInfo.type}
${chatInfo.username ? `**Username:** @${chatInfo.username}` : ''}
${chatInfo.description ? `**Beschreibung:** ${chatInfo.description}` : ''}

✅ Dieser Chat wird automatisch für alle send_message Aufrufe verwendet.

**Usage für Agents:**
Einfach \`send_message\` mit nur dem \`text\` Parameter aufrufen - die Chat-ID wird automatisch verwendet!`;

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
          text: `❌ Fehler beim Finden des Standard-Chats: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
};

