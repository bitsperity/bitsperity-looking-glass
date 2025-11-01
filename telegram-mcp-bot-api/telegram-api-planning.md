# Telegram Bot API 完整接口规划

基于 `node-telegram-bot-api` 库的完整功能分析和 MCP 工具集成规划。

## 1. 消息发送类 (Message Sending)

### 1.1 基础消息
- **sendMessage** - 发送文本消息 ✅ (已实现)
- **forwardMessage** - 转发单条消息
- **forwardMessages** - 转发多条消息
- **copyMessage** - 复制单条消息
- **copyMessages** - 复制多条消息

### 1.2 媒体消息
- **sendPhoto** - 发送图片 ✅ (已实现)
- **sendAudio** - 发送音频文件
- **sendDocument** - 发送文档
- **sendVideo** - 发送视频
- **sendAnimation** - 发送动画/GIF
- **sendVoice** - 发送语音消息
- **sendVideoNote** - 发送视频笔记(圆形视频)
- **sendPaidMedia** - 发送付费媒体
- **sendMediaGroup** - 发送媒体组(相册)

### 1.3 位置和联系人
- **sendLocation** - 发送位置信息
- **sendVenue** - 发送场所信息
- **sendContact** - 发送联系人信息

### 1.4 交互式内容
- **sendPoll** - 发送投票
- **sendDice** - 发送骰子动画
- **sendChatAction** - 发送聊天动作(正在输入等)

## 2. 消息编辑类 (Message Editing)

- **editMessageText** - 编辑消息文本
- **editMessageCaption** - 编辑媒体标题
- **editMessageMedia** - 编辑媒体内容
- **editMessageReplyMarkup** - 编辑回复标记
- **editMessageLiveLocation** - 编辑实时位置
- **stopMessageLiveLocation** - 停止实时位置
- **deleteMessage** - 删除消息
- **deleteMessages** - 批量删除消息

## 3. 消息反应和互动 (Reactions & Interactions)

- **setMessageReaction** - 设置消息反应
- **pinChatMessage** - 置顶消息
- **unpinChatMessage** - 取消置顶消息
- **unpinAllChatMessages** - 取消所有置顶消息

## 4. 聊天管理类 (Chat Management)

### 4.1 聊天信息
- **getChat** - 获取聊天信息
- **getChatAdministrators** - 获取管理员列表
- **getChatMemberCount** - 获取成员数量
- **getChatMember** - 获取成员信息
- **setChatPhoto** - 设置聊天头像
- **deleteChatPhoto** - 删除聊天头像
- **setChatTitle** - 设置聊天标题
- **setChatDescription** - 设置聊天描述
- **leaveChat** - 离开聊天

### 4.2 成员管理
- **banChatMember** - 封禁成员
- **unbanChatMember** - 解封成员
- **restrictChatMember** - 限制成员权限
- **promoteChatMember** - 提升成员权限
- **setChatAdministratorCustomTitle** - 设置管理员自定义标题
- **banChatSenderChat** - 封禁发送者聊天
- **unbanChatSenderChat** - 解封发送者聊天
- **setChatPermissions** - 设置聊天权限

### 4.3 邀请链接管理
- **exportChatInviteLink** - 导出邀请链接
- **createChatInviteLink** - 创建邀请链接
- **editChatInviteLink** - 编辑邀请链接
- **revokeChatInviteLink** - 撤销邀请链接
- **createChatSubscriptionInviteLink** - 创建订阅邀请链接
- **editChatSubscriptionInviteLink** - 编辑订阅邀请链接
- **approveChatJoinRequest** - 批准加入请求
- **declineChatJoinRequest** - 拒绝加入请求

## 5. 贴纸管理类 (Sticker Management)

- **setChatStickerSet** - 设置聊天贴纸集
- **deleteChatStickerSet** - 删除聊天贴纸集
- **getStickerSet** - 获取贴纸集
- **getCustomEmojiStickers** - 获取自定义表情贴纸
- **uploadStickerFile** - 上传贴纸文件
- **createNewStickerSet** - 创建新贴纸集
- **addStickerToSet** - 添加贴纸到集合
- **setStickerPositionInSet** - 设置贴纸在集合中的位置
- **deleteStickerFromSet** - 从集合中删除贴纸
- **setStickerSetThumbnail** - 设置贴纸集缩略图

## 6. 论坛主题管理 (Forum Topic Management)

- **getForumTopicIconStickers** - 获取论坛主题图标贴纸
- **createForumTopic** - 创建论坛主题
- **editForumTopic** - 编辑论坛主题
- **closeForumTopic** - 关闭论坛主题
- **reopenForumTopic** - 重新打开论坛主题
- **deleteForumTopic** - 删除论坛主题
- **unpinAllForumTopicMessages** - 取消置顶论坛主题所有消息
- **editGeneralForumTopic** - 编辑通用论坛主题
- **closeGeneralForumTopic** - 关闭通用论坛主题
- **reopenGeneralForumTopic** - 重新打开通用论坛主题
- **hideGeneralForumTopic** - 隐藏通用论坛主题
- **unhideGeneralForumTopic** - 显示通用论坛主题

## 7. 用户信息类 (User Information)

- **getMe** - 获取机器人信息
- **getUserProfilePhotos** - 获取用户头像
- **setUserEmojiStatus** - 设置用户表情状态

## 8. 文件处理类 (File Handling)

- **getFile** - 获取文件信息
- **getFileLink** - 获取文件下载链接
- **getFileStream** - 获取文件流
- **downloadFile** - 下载文件

## 9. Webhook 管理类 (Webhook Management)

- **setWebHook** - 设置 Webhook
- **deleteWebHook** - 删除 Webhook
- **getWebHookInfo** - 获取 Webhook 信息
- **openWebHook** - 打开 Webhook
- **closeWebHook** - 关闭 Webhook
- **hasOpenWebHook** - 检查是否有打开的 Webhook

## 10. 更新和轮询 (Updates & Polling)

- **getUpdates** - 获取更新
- **startPolling** - 开始轮询
- **stopPolling** - 停止轮询
- **initPolling** - 初始化轮询
- **isPolling** - 检查是否正在轮询
- **processUpdate** - 处理更新

## 11. 事件监听类 (Event Listeners)

- **on** - 监听事件
- **onText** - 监听文本消息
- **onReplyToMessage** - 监听回复消息
- **removeTextListener** - 移除文本监听器
- **clearTextListeners** - 清除所有文本监听器
- **removeReplyListener** - 移除回复监听器
- **clearReplyListeners** - 清除所有回复监听器

## 12. 会话管理类 (Session Management)

- **logOut** - 登出
- **close** - 关闭连接

## 13. 游戏相关 (Games)

- **sendGame** - 发送游戏
- **setGameScore** - 设置游戏分数
- **getGameHighScores** - 获取游戏高分

## 14. 内联查询 (Inline Queries)

- **answerInlineQuery** - 回答内联查询
- **answerCallbackQuery** - 回答回调查询

## 15. 支付相关 (Payments)

- **sendInvoice** - 发送发票
- **createInvoiceLink** - 创建发票链接
- **answerShippingQuery** - 回答运输查询
- **answerPreCheckoutQuery** - 回答预结账查询

## 16. 护照相关 (Passport)

- **setPassportDataErrors** - 设置护照数据错误

## 实现优先级规划

### 第一阶段 (高优先级) - 基础功能
1. ✅ sendMessage (已完成)
2. ✅ sendPhoto (已完成)
3. sendDocument
4. sendVideo
5. sendAudio
6. sendVoice
7. sendLocation
8. sendContact
9. forwardMessage
10. deleteMessage

### 第二阶段 (中优先级) - 聊天管理
1. getChat
2. getChatMember
3. banChatMember
4. unbanChatMember
5. pinChatMessage
6. unpinChatMessage
7. setChatTitle
8. setChatDescription

### 第三阶段 (低优先级) - 高级功能
1. 贴纸管理
2. 论坛主题管理
3. 游戏功能
4. 支付功能
5. 内联查询

### 第四阶段 (特殊功能) - 企业功能
1. Webhook 管理
2. 文件处理
3. 护照验证

## 技术实现注意事项

1. **参数验证**: 每个工具都需要严格的参数验证
2. **错误处理**: 统一的错误处理机制
3. **文件上传**: 支持本地文件路径、URL 和 Buffer
4. **异步处理**: 所有操作都是异步的，需要正确处理 Promise
5. **权限检查**: 某些操作需要特定的机器人权限
6. **速率限制**: 需要考虑 Telegram API 的速率限制

## 下一步行动计划

1. 按优先级逐步实现各个工具
2. 为每个工具编写详细的参数验证
3. 添加完整的错误处理和日志记录
4. 编写测试用例
5. 更新文档和使用示例