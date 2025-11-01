<div align="center">

# 🤖 Telegram MCP Server

[![npm version](https://badge.fury.io/js/@xingyuchen%2Ftelegram-mcp.svg)](https://badge.fury.io/js/@xingyuchen%2Ftelegram-mcp)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-26A5E4?logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)

**A comprehensive Model Context Protocol (MCP) server for seamless Telegram Bot API integration**

*Empower your AI assistants with full Telegram functionality through a modern, type-safe interface*

[📚 Documentation](#-usage) • [🚀 Quick Start](#-installation) • [🛠️ API Reference](#-available-tools) • [💡 Examples](./examples/usage-examples.md)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 💬 **Core Messaging**
- 📝 **Rich Text Messages** - HTML, Markdown & MarkdownV2 support
- 🖼️ **Photo Sharing** - Images with captions and formatting
- 📎 **Document Upload** - Files with custom names and descriptions
- 🎥 **Video Content** - Videos with metadata and streaming support
- ↗️ **Message Forwarding** - Cross-chat message forwarding
- 🗑️ **Message Management** - Delete and manage messages

</td>
<td width="50%">

### 🏢 **Chat Management**
- ℹ️ **Chat Information** - Detailed chat data and permissions
- 👥 **User Management** - Member info and administration
- 🔒 **Permission Control** - Fine-grained access control
- 📊 **Analytics Ready** - Comprehensive data extraction

</td>
</tr>
</table>

## 🚀 Installation

### Option 1: NPM Package (Recommended)

```bash
# Install the package
npm install @xingyuchen/telegram-mcp

# Or using yarn
yarn add @xingyuchen/telegram-mcp
```

### Option 2: From Source

```bash
# Clone the repository
git clone https://github.com/guangxiangdebizi/telegram-mcp.git
cd telegram-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## 📋 Usage

### 🔧 Setup Your Telegram Bot

> **First time?** You'll need a Telegram Bot Token:

1. 💬 Message [@BotFather](https://t.me/botfather) on Telegram
2. 🤖 Send `/newbot` command
3. 📝 Follow the instructions to create your bot
4. 🔑 Copy the bot token provided by BotFather
5. ✅ Use this token in the MCP tool calls

### 🚀 Deployment Options

<details>
<summary><strong>📡 Option 1: Local Development (Stdio)</strong></summary>

**Step 1:** Start the MCP server
```bash
npm start
```

**Step 2:** Configure Claude Desktop
```json
{
  "mcpServers": {
    "telegram-mcp": {
      "command": "node",
      "args": ["path/to/@xingyuchen/telegram-mcp/build/index.js"]
    }
  }
}
```

</details>

<details>
<summary><strong>🌐 Option 2: SSE Deployment (Supergateway)</strong></summary>

**Step 1:** Start the SSE server
```bash
npm run sse
```

**Step 2:** Configure Claude Desktop with SSE
```json
{
  "mcpServers": {
    "telegram-mcp": {
      "type": "sse",
      "url": "http://localhost:3100/sse",
      "timeout": 600
    }
  }
}
```

</details>

## 🛠️ Available Tools

<div align="center">

| 🔧 **Tool** | 📝 **Description** | 🎯 **Use Case** |
|-------------|-------------------|------------------|
| [`send_message`](#send_message) | Send rich text messages | Basic communication, notifications |
| [`send_photo`](#send_photo) | Share images with captions | Visual content, screenshots |
| [`send_document`](#send_document) | Upload files and documents | File sharing, reports |
| [`send_video`](#send_video) | Send video content | Media sharing, tutorials |
| [`forward_message`](#forward_message) | Forward messages between chats | Content distribution |
| [`delete_message`](#delete_message) | Remove messages | Content moderation |
| [`get_chat`](#get_chat) | Retrieve chat information | Analytics, administration |

</div>

---

### 📤 `send_message`
> 📝 **Send rich text messages with formatting support**

<details>
<summary>📋 <strong>Parameters</strong></summary>

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | `string` | ✅ | Telegram bot token |
| `chatId` | `string\|number` | ✅ | Chat ID or username |
| `text` | `string` | ✅ | Message text |
| `parseMode` | `string` | ❌ | HTML, Markdown, or MarkdownV2 |
| `disableWebPagePreview` | `boolean` | ❌ | Disable link previews |
| `disableNotification` | `boolean` | ❌ | Send silently |
| `replyToMessageId` | `number` | ❌ | Reply to specific message |

</details>

### 🖼️ `send_photo`
> 📸 **Share images with captions and formatting**

<details>
<summary>📋 <strong>Parameters</strong></summary>

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | `string` | ✅ | Telegram bot token |
| `chatId` | `string\|number` | ✅ | Chat ID or username |
| `photo` | `string` | ✅ | Photo file path, URL, or file_id |
| `caption` | `string` | ❌ | Photo caption |
| `parseMode` | `string` | ❌ | Caption formatting |
| `disableNotification` | `boolean` | ❌ | Send silently |
| `replyToMessageId` | `number` | ❌ | Reply to specific message |

</details>

### 📎 `send_document`
> 📄 **Upload files and documents with custom names**

<details>
<summary>📋 <strong>Parameters</strong></summary>

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | `string` | ✅ | Telegram bot token |
| `chatId` | `string\|number` | ✅ | Chat ID or username |
| `document` | `string` | ✅ | Document file path, URL, or file_id |
| `caption` | `string` | ❌ | Document caption |
| `parseMode` | `string` | ❌ | Caption formatting |
| `filename` | `string` | ❌ | Custom filename |
| `disableNotification` | `boolean` | ❌ | Send silently |
| `replyToMessageId` | `number` | ❌ | Reply to specific message |

</details>

### 🎥 `send_video`
> 🎬 **Send video content with metadata and streaming**

<details>
<summary>📋 <strong>Parameters</strong></summary>

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | `string` | ✅ | Telegram bot token |
| `chatId` | `string\|number` | ✅ | Chat ID or username |
| `video` | `string` | ✅ | Video file path, URL, or file_id |
| `duration` | `number` | ❌ | Video duration in seconds |
| `width` | `number` | ❌ | Video width |
| `height` | `number` | ❌ | Video height |
| `caption` | `string` | ❌ | Video caption |
| `parseMode` | `string` | ❌ | Caption formatting |
| `supportsStreaming` | `boolean` | ❌ | Enable streaming |
| `disableNotification` | `boolean` | ❌ | Send silently |
| `replyToMessageId` | `number` | ❌ | Reply to specific message |

</details>

### ↗️ `forward_message`
> 🔄 **Forward messages between different chats**

<details>
<summary>📋 <strong>Parameters</strong></summary>

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | `string` | ✅ | Telegram bot token |
| `chatId` | `string\|number` | ✅ | Destination chat ID |
| `fromChatId` | `string\|number` | ✅ | Source chat ID |
| `messageId` | `number` | ✅ | Message ID to forward |
| `disableNotification` | `boolean` | ❌ | Send silently |

</details>

### 🗑️ `delete_message`
> ❌ **Remove messages from chats**

<details>
<summary>📋 <strong>Parameters</strong></summary>

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | `string` | ✅ | Telegram bot token |
| `chatId` | `string\|number` | ✅ | Chat ID or username |
| `messageId` | `number` | ✅ | Message ID to delete |

</details>

### ℹ️ `get_chat`
> 📊 **Retrieve detailed chat information and permissions**

<details>
<summary>📋 <strong>Parameters</strong></summary>

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | `string` | ✅ | Telegram bot token |
| `chatId` | `string\|number` | ✅ | Chat ID or username |

</details>

---

## 🔧 Development

### 📁 Project Structure

```
📦 telegram-mcp/
├── 📂 src/
│   ├── 📄 index.ts          # 🚀 MCP server entry point
│   └── 📂 tools/           # 🛠️ Business tool modules
│       ├── 📄 sendMessage.ts    # 💬 Text messaging
│       ├── 📄 sendPhoto.ts      # 🖼️ Photo sharing
│       ├── 📄 sendDocument.ts   # 📎 Document upload
│       ├── 📄 sendVideo.ts      # 🎥 Video sharing
│       ├── 📄 getChat.ts        # ℹ️ Chat information
│       ├── 📄 forwardMessage.ts # ↗️ Message forwarding
│       └── 📄 deleteMessage.ts  # 🗑️ Message deletion
├── 📂 examples/
│   ├── 📄 claude-config.json    # ⚙️ Claude configuration
│   └── 📄 usage-examples.md     # 💡 Usage examples
├── 📄 package.json
├── 📄 tsconfig.json
└── 📄 README.md
```

### 🔨 Adding New Tools

1. **Create** a new tool file in `src/tools/`
2. **Follow** the existing tool pattern:
   ```typescript
   export const yourTool = {
     name: "your_tool_name",
     description: "Tool description",
     parameters: { /* JSON Schema */ },
     async run(args: any) { /* Implementation */ }
   };
   ```
3. **Import** and register in `src/index.ts`
4. **Add** to both `ListToolsRequestSchema` and `CallToolRequestSchema` handlers

### 🚀 Development Scripts

| Command | Description | Usage |
|---------|-------------|-------|
| `npm run build` | 🔨 Compile TypeScript | Production builds |
| `npm run dev` | 👀 Watch mode | Development |
| `npm start` | 🚀 Start MCP server | Stdio mode |
| `npm run sse` | 🌐 Start SSE server | Port 3100 |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

---

## 🗺️ Roadmap

See [telegram-api-planning.md](./telegram-api-planning.md) for the complete feature roadmap and implementation priorities.

---

## 📄 License

<div align="center">

**Apache License 2.0**

See [LICENSE](./LICENSE) file for details.

</div>

---

## 👤 Author

<div align="center">

**Xingyu Chen**

[![Email](https://img.shields.io/badge/Email-guangxiangdebizi%40gmail.com-red?style=flat-square&logo=gmail)](mailto:guangxiangdebizi@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-guangxiangdebizi-black?style=flat-square&logo=github)](https://github.com/guangxiangdebizi/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Xingyu%20Chen-blue?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/xingyu-chen-b5b3b0313/)
[![NPM](https://img.shields.io/badge/NPM-xingyuchen-red?style=flat-square&logo=npm)](https://www.npmjs.com/~xingyuchen)

---

⭐ **Star this repo if you find it helpful!** ⭐

</div>