# OpenRouter LLM Chat

一个功能丰富的多模型 LLM 聊天应用，基于 OpenRouter API 构建。

## 功能特性

- 🤖 **多模型支持**: 支持 GPT-4o, Claude 3.5 Sonnet, Gemini Pro, Llama 3.1 等多种模型
- 🔄 **实时模型切换**: 在对话过程中可以随时切换不同的AI模型
- 💬 **对话历史**: 保持完整的对话记录，切换模型时历史不丢失
- 🎨 **现代化UI**: 响应式设计，支持桌面和移动设备
- 🔒 **安全存储**: API Key 本地安全存储
- ⚡ **实时响应**: 流畅的用户体验和快速的API调用

## 支持的模型

- **OpenAI**: GPT-4o, GPT-4o Mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku  
- **Google**: Gemini Pro 1.5
- **Meta**: Llama 3.1 405B, Llama 3.1 70B
- **Mistral**: Mistral Large
- **Cohere**: Command R+
- **Perplexity**: Sonar Large

## 快速开始

### 1. 获取 OpenRouter API Key

1. 访问 [OpenRouter.ai](https://openrouter.ai)
2. 注册账户并登录
3. 前往 [API Keys 页面](https://openrouter.ai/keys)
4. 创建新的API Key（格式为 `sk-or-v1-...`）

### 2. 运行应用

#### 方法一：直接打开文件
直接在浏览器中打开 `index.html` 文件即可使用。

#### 方法二：本地服务器（推荐）
```bash
# 使用 Python 启动本地服务器
python -m http.server 8000

# 或使用 Node.js
npx serve .

# 然后在浏览器中访问 http://localhost:8000
```

### 3. 配置 API Key

1. 首次打开应用会自动弹出API Key设置窗口
2. 输入您的 OpenRouter API Key
3. 点击"保存"按钮

### 4. 开始对话

1. 在下方输入框中输入您的消息
2. 选择想要使用的AI模型
3. 点击发送按钮或按 Enter 键
4. 在对话过程中可以随时切换模型

## 使用说明

### 模型切换
- 使用顶部的模型选择下拉菜单切换AI模型
- 切换模型不会清除对话历史
- 新的回复将使用新选择的模型生成

### 快捷键
- `Enter`: 发送消息
- `Shift + Enter`: 换行

### 功能按钮
- **API Key**: 重新设置或更改API Key
- **清空对话**: 清除所有对话记录
- **模型选择**: 切换当前使用的AI模型

## 技术架构

### 前端技术
- **HTML5**: 语义化标记
- **CSS3**: 现代化样式，支持响应式设计
- **JavaScript (ES6+)**: 原生JavaScript，无框架依赖
- **Font Awesome**: 图标库

### API集成
- **OpenRouter API**: 统一的多模型API接口
- **RESTful调用**: 标准的HTTP请求
- **错误处理**: 完善的错误提示和处理机制

### 存储
- **LocalStorage**: 本地存储API Key和用户偏好
- **内存存储**: 对话历史临时存储

## 文件结构

```
aichat/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 主要功能逻辑
└── README.md          # 说明文档
```

## 安全注意事项

1. **API Key安全**: API Key仅存储在本地浏览器中，不会发送到第三方服务器
2. **HTTPS使用**: 建议在HTTPS环境下使用以确保数据传输安全
3. **API配额**: 注意OpenRouter的API使用配额和费用

## 故障排除

### 常见问题

**Q: API调用失败怎么办？**
A: 检查以下几点：
- API Key是否正确设置
- 网络连接是否正常
- OpenRouter账户是否有足够余额
- 选择的模型是否可用

**Q: 无法发送消息？**
A: 确保：
- 已设置有效的API Key
- 输入框中有内容
- 不在加载状态中

**Q: 模型切换不生效？**
A: 模型切换会在下一条消息中生效，当前正在生成的回复仍使用之前的模型。

## 开发和自定义

### 添加新模型
在 `script.js` 中的 `getModelDisplayName()` 方法和 HTML 的 `<select>` 元素中添加新的模型选项。

### 自定义样式
修改 `styles.css` 文件来自定义应用的外观和感觉。

### 功能扩展
- 添加对话导出功能
- 实现对话保存和加载
- 添加更多API参数控制
- 集成语音输入/输出

## 许可证

本项目采用 MIT 许可证。

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

---

**注意**: 使用本应用需要有效的 OpenRouter API Key，API调用会产生费用，请注意控制使用量。
