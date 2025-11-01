import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Import business tools
import { sendMessage } from "./tools/sendMessage.js";
import { sendPhoto } from "./tools/sendPhoto.js";
import { sendDocument } from "./tools/sendDocument.js";
import { sendVideo } from "./tools/sendVideo.js";
import { getChat } from "./tools/getChat.js";
import { forwardMessage } from "./tools/forwardMessage.js";
import { deleteMessage } from "./tools/deleteMessage.js";
import { getUpdates } from "./tools/getUpdates.js";
import { findDefaultChat } from "./tools/findDefaultChat.js";

// Create MCP server
const server = new Server({
  name: "telegram-mcp",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

// Tool registration
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: sendMessage.name,
        description: sendMessage.description,
        inputSchema: sendMessage.parameters
      },
      {
        name: sendPhoto.name,
        description: sendPhoto.description,
        inputSchema: sendPhoto.parameters
      },
      {
        name: sendDocument.name,
        description: sendDocument.description,
        inputSchema: sendDocument.parameters
      },
      {
        name: sendVideo.name,
        description: sendVideo.description,
        inputSchema: sendVideo.parameters
      },
      {
        name: getChat.name,
        description: getChat.description,
        inputSchema: getChat.parameters
      },
      {
        name: forwardMessage.name,
        description: forwardMessage.description,
        inputSchema: forwardMessage.parameters
      },
      {
        name: deleteMessage.name,
        description: deleteMessage.description,
        inputSchema: deleteMessage.parameters
      },
      {
        name: getUpdates.name,
        description: getUpdates.description,
        inputSchema: getUpdates.parameters
      },
      {
        name: findDefaultChat.name,
        description: findDefaultChat.description,
        inputSchema: findDefaultChat.parameters
      }
    ]
  };
});

// Tool call handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};
  
  switch (request.params.name) {
    case "send_message":
      return await sendMessage.run(args as any);
    case "send_photo":
      return await sendPhoto.run(args as any);
    case "send_document":
      return await sendDocument.run(args as any);
    case "send_video":
      return await sendVideo.run(args as any);
    case "get_chat":
      return await getChat.run(args as any);
    case "forward_message":
      return await forwardMessage.run(args as any);
    case "delete_message":
      return await deleteMessage.run(args as any);
    case "get_updates":
      return await getUpdates.run(args as any);
    case "find_default_chat":
      return await findDefaultChat.run(args as any);
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Telegram MCP server running on stdio");
}

main().catch(console.error);