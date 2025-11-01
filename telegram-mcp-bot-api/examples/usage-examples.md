# Telegram MCP Usage Examples

This document provides practical examples of how to use the Telegram MCP server tools.

## Prerequisites

1. Get a Telegram bot token from [@BotFather](https://t.me/botfather)
2. Configure the MCP server in Claude Desktop
3. Know your chat ID or username

## Finding Your Chat ID

To find your chat ID:
1. Send a message to your bot
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Look for the `chat.id` field in the response

## Tool Usage Examples

### 1. Send a Simple Text Message

```
Please send a message to my Telegram chat:
- Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
- Chat ID: -1001234567890
- Message: "Hello from Claude! 👋"
```

### 2. Send a Formatted Message

```
Send a formatted message using HTML:
- Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
- Chat ID: @mychannel
- Message: "<b>Important Update</b>\n\n<i>System maintenance scheduled for tonight.</i>\n\n<code>Status: Active</code>"
- Parse Mode: HTML
```

### 3. Send a Photo with Caption

```
Send a photo to my Telegram:
- Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
- Chat ID: 123456789
- Photo: https://example.com/image.jpg
- Caption: "Beautiful sunset from today! 🌅"
- Parse Mode: HTML
```

### 4. Send a Document

```
Upload a document to Telegram:
- Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
- Chat ID: -1001234567890
- Document: C:\\Users\\Documents\\report.pdf
- Caption: "Monthly report - Please review"
- Filename: "Monthly_Report_December.pdf"
```

### 5. Send a Video

```
Share a video file:
- Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
- Chat ID: @mygroup
- Video: https://example.com/video.mp4
- Caption: "Demo video for the new feature"
- Duration: 120
- Width: 1920
- Height: 1080
- Supports Streaming: true
```

### 6. Get Chat Information

```
Get information about my Telegram chat:
- Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
- Chat ID: -1001234567890
```

### 7. Forward a Message

```
Forward a message between chats:
- Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
- Destination Chat ID: -1001234567890
- Source Chat ID: -1009876543210
- Message ID: 1234
```

### 8. Delete a Message

```
Delete a specific message:
- Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
- Chat ID: -1001234567890
- Message ID: 1234
```

## Advanced Usage Patterns

### Batch Operations

You can ask Claude to perform multiple operations in sequence:

```
Please do the following:
1. Send a message "Starting backup process..." to chat -1001234567890
2. Send the backup.zip file as a document
3. Send another message "Backup completed successfully! ✅"

Use token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### Conditional Operations

```
First, get information about chat @mychannel. If it's a channel with more than 100 members, send an announcement about the new feature. Otherwise, just send a simple update message.

Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### Error Handling

The MCP server provides detailed error messages. Common issues:

- **Invalid token**: Check your bot token from BotFather
- **Chat not found**: Verify the chat ID or username
- **Insufficient permissions**: Ensure your bot has the required permissions
- **File not found**: Check file paths for document/photo uploads

## Tips and Best Practices

1. **Use usernames when possible**: `@username` is more readable than numeric IDs
2. **Test with small groups first**: Before sending to large channels
3. **Use silent notifications**: Set `disableNotification: true` for non-urgent messages
4. **Format messages properly**: Use HTML or Markdown for better readability
5. **Handle file sizes**: Telegram has limits on file sizes (50MB for bots)
6. **Rate limiting**: Don't send too many messages too quickly

## Troubleshooting

### Bot Not Responding
- Check if the bot token is correct
- Ensure the bot is added to the chat/channel
- Verify the bot has necessary permissions

### Permission Errors
- For channels: Bot needs to be an admin
- For groups: Bot needs appropriate permissions
- For private chats: User must have started the bot

### File Upload Issues
- Check file size limits (50MB for bots)
- Ensure file path is accessible
- Use absolute paths for local files
- For URLs, ensure they're publicly accessible