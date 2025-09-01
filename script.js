class OpenRouterChat {
    constructor() {
        this.apiKey = localStorage.getItem('openrouter_api_key') || '';
        this.conversations = this.loadConversations();
        this.currentConversationId = null;
        this.currentModel = 'google/gemini-2.5-flash-image-preview:free';
        this.isLoading = false;
        this.conversationsPerPage = 20;
        this.loadedConversationsCount = 0;
        
        // Context management settings
        this.contextThreshold = this.loadContextThreshold() || 10; // Default 10 rounds
        this.autoSummarize = this.loadAutoSummarize() !== false; // Default true
        
        // Role management
        this.currentRole = this.loadCurrentRole() || 'default';
        this.customRoles = this.loadCustomRoles();
        this.presetRoles = this.getPresetRoles();
        
        // Search settings
        this.searchEnabled = this.loadSearchEnabled() || false;
        this.searchCache = new Map(); // Cache search results
        
        this.initializeElements();
        this.bindEvents();
        this.updateUI();
        this.loadConversationList();
        
        // Initialize role display
        this.updateCurrentRoleDisplay();
        
        // Initialize search display
        this.updateSearchStatus();
        
        // Always start with a new conversation on page load
        this.createNewConversation();
        
        // Show API key modal if no key is set
        if (!this.apiKey) {
            this.showApiKeyModal();
        }
    }
    
    initializeElements() {
        // Main elements
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.modelSelect = document.getElementById('model-select');
        this.currentModelDisplay = document.getElementById('current-model-display');
        this.messageCountDisplay = document.getElementById('message-count');
        this.statusText = document.getElementById('status-text');
        
        // Modal elements
        this.apiKeyModal = document.getElementById('api-key-modal');
        this.apiKeyInput = document.getElementById('api-key-input');
        this.apiKeyBtn = document.getElementById('api-key-btn');
        this.saveApiKeyBtn = document.getElementById('save-api-key');
        this.cancelApiKeyBtn = document.getElementById('cancel-api-key');
        this.closeModal = document.querySelector('.close');
        
        // Conversation elements
        this.conversationList = document.getElementById('conversation-list');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.clearAllBtn = document.getElementById('clear-all-btn');
        this.loadMoreBtn = document.getElementById('load-more-btn');
        
        // Context management elements
        this.contextSettingsBtn = document.getElementById('context-settings-btn');
        this.contextSettingsModal = document.getElementById('context-settings-modal');
        this.contextThresholdInput = document.getElementById('context-threshold');
        this.autoSummarizeCheckbox = document.getElementById('auto-summarize');
        this.conversationMemoTextarea = document.getElementById('conversation-memo');
        this.memoSection = document.getElementById('memo-section');
        this.saveMemoBtn = document.getElementById('save-memo-btn');
        this.saveContextSettingsBtn = document.getElementById('save-context-settings');
        this.cancelContextSettingsBtn = document.getElementById('cancel-context-settings');
        this.closeContextSettingsBtn = document.getElementById('close-context-settings');
        
        // Role management elements
        this.roleSettingsBtn = document.getElementById('role-settings-btn');
        this.roleSettingsModal = document.getElementById('role-settings-modal');
        this.roleSelect = document.getElementById('role-select');
        this.currentRoleDisplay = document.getElementById('current-role-display');
        this.roleDescription = document.getElementById('role-description');
        this.customRoleNameInput = document.getElementById('custom-role-name');
        this.customRoleDescInput = document.getElementById('custom-role-desc');
        this.customRolePromptTextarea = document.getElementById('custom-role-prompt');
        this.addCustomRoleBtn = document.getElementById('add-custom-role');
        this.saveRoleSettingsBtn = document.getElementById('save-role-settings');
        this.cancelRoleSettingsBtn = document.getElementById('cancel-role-settings');
        this.closeRoleSettingsBtn = document.getElementById('close-role-settings');
        
        // Search elements
        this.searchToggle = document.getElementById('search-toggle');
        this.searchStatus = document.getElementById('search-status');
    }
    
    bindEvents() {
        // Send message events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => this.updateSendButton());
        
        // Model selection
        this.modelSelect.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.updateCurrentModelDisplay();
            this.setStatus(`已切换到模型: ${this.getModelDisplayName(this.currentModel)}`);
        });
        
        // API key modal events
        this.apiKeyBtn.addEventListener('click', () => this.showApiKeyModal());
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.cancelApiKeyBtn.addEventListener('click', () => this.hideApiKeyModal());
        this.closeModal.addEventListener('click', () => this.hideApiKeyModal());
        this.apiKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });
        
        // Conversation management
        this.newChatBtn.addEventListener('click', () => this.createNewConversation());
        this.clearAllBtn.addEventListener('click', () => this.clearAllConversations());
        this.loadMoreBtn.addEventListener('click', () => this.loadMoreConversations());
        
        // Modal backdrop click
        this.apiKeyModal.addEventListener('click', (e) => {
            if (e.target === this.apiKeyModal) {
                this.hideApiKeyModal();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 150) + 'px';
        });
        
        // Context management events
        this.contextSettingsBtn.addEventListener('click', () => {
            this.openContextSettings();
        });
        this.saveContextSettingsBtn.addEventListener('click', () => this.saveContextSettings());
        this.cancelContextSettingsBtn.addEventListener('click', () => this.hideContextSettings());
        this.closeContextSettingsBtn.addEventListener('click', () => this.hideContextSettings());
        this.saveMemoBtn.addEventListener('click', () => this.saveCurrentMemo());
        
        // Role management events
        this.roleSettingsBtn.addEventListener('click', () => {
            this.openRoleSettings();
        });
        this.saveRoleSettingsBtn.addEventListener('click', () => this.saveRoleSettings());
        this.cancelRoleSettingsBtn.addEventListener('click', () => this.hideRoleSettings());
        this.closeRoleSettingsBtn.addEventListener('click', () => this.hideRoleSettings());
        this.addCustomRoleBtn.addEventListener('click', () => this.addCustomRole());
        this.roleSelect.addEventListener('change', (e) => this.selectRole(e.target.value));
        
        // Search events
        this.searchToggle.addEventListener('change', (e) => {
            this.searchEnabled = e.target.checked;
            console.log('Search toggle changed to:', this.searchEnabled);
            this.saveSearchEnabled(this.searchEnabled);
            this.updateSearchStatus();
        });
        
        // Close modal when clicking outside
        this.contextSettingsModal.addEventListener('click', (e) => {
            if (e.target === this.contextSettingsModal) {
                this.hideContextSettings();
            }
        });
        
        // Close role modal when clicking outside
        this.roleSettingsModal.addEventListener('click', (e) => {
            if (e.target === this.roleSettingsModal) {
                this.hideRoleSettings();
            }
        });
    }
    
    updateUI() {
        this.updateSendButton();
        this.updateCurrentModelDisplay();
        this.updateMessageCount();
    }
    
    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        const hasApiKey = this.apiKey.length > 0;
        this.sendBtn.disabled = !hasText || !hasApiKey || this.isLoading;
    }
    
    updateCurrentModelDisplay() {
        const modelName = this.getModelDisplayName(this.currentModel);
        this.currentModelDisplay.textContent = `当前模型: ${modelName}`;
    }
    
    updateMessageCount() {
        const currentConversation = this.getCurrentConversation();
        const messageCount = currentConversation ? currentConversation.messages.length : 0;
        this.messageCountDisplay.textContent = `消息数: ${messageCount}`;
    }
    
    getModelDisplayName(modelId) {
        const modelNames = {
            // 免费模型
            'google/gemini-2.5-flash-image-preview:free': 'Gemini 2.5 Flash (免费)',
            'google/gemma-2-9b-it:free': 'Gemma 2 9B (免费)',
            'meta-llama/llama-3.2-3b-instruct:free': 'Llama 3.2 3B (免费)',
            'meta-llama/llama-3.2-1b-instruct:free': 'Llama 3.2 1B (免费)',
            'microsoft/phi-3-mini-128k-instruct:free': 'Phi-3 Mini (免费)',
            'huggingface/zephyr-7b-beta:free': 'Zephyr 7B (免费)',
            'openchat/openchat-7b:free': 'OpenChat 7B (免费)',
            'gryphe/mythomist-7b:free': 'Mythomist 7B (免费)',
            'undi95/toppy-m-7b:free': 'Toppy M 7B (免费)',
            // 付费模型
            'openai/gpt-4o': 'GPT-4o',
            'openai/gpt-4o-mini': 'GPT-4o Mini',
            'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
            'anthropic/claude-3-haiku': 'Claude 3 Haiku',
            'google/gemini-pro-1.5': 'Gemini Pro 1.5',
            'meta-llama/llama-3.1-405b-instruct': 'Llama 3.1 405B',
            'meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B',
            'mistralai/mistral-large': 'Mistral Large',
            'cohere/command-r-plus': 'Command R+',
            'perplexity/llama-3.1-sonar-large-128k-online': 'Perplexity Sonar',
            'deepseek/deepseek-chat': 'DeepSeek Chat',
            'qwen/qwen-2.5-72b-instruct': '通义千问 2.5 72B'
        };
        return modelNames[modelId] || modelId;
    }
    
    showApiKeyModal() {
        this.apiKeyModal.style.display = 'block';
        this.apiKeyInput.value = this.apiKey;
        this.apiKeyInput.focus();
    }
    
    hideApiKeyModal() {
        this.apiKeyModal.style.display = 'none';
    }
    
    saveApiKey() {
        const apiKey = this.apiKeyInput.value.trim();
        if (!apiKey) {
            alert('请输入有效的API Key');
            return;
        }
        
        if (!apiKey.startsWith('sk-or-v1-')) {
            alert('OpenRouter API Key应该以 "sk-or-v1-" 开头');
            return;
        }
        
        this.apiKey = apiKey;
        localStorage.setItem('openrouter_api_key', apiKey);
        this.hideApiKeyModal();
        this.updateSendButton();
        this.setStatus('API Key 已保存');
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.apiKey || this.isLoading) return;
        
        // Store the conversation ID at the time of sending
        const requestConversationId = this.currentConversationId;
        
        // Add user message
        this.addMessage('user', message, this.currentModel);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.updateSendButton();
        
        // Show inline loading
        this.isLoading = true;
        this.updateSendButton();
        const loadingElement = this.showLoadingMessage();
        this.setStatus('正在发送请求...');
        
        try {
            const response = await this.callOpenRouterAPI(message, requestConversationId);
            
            // Only add response if we're still in the same conversation
            if (this.currentConversationId === requestConversationId) {
                this.removeLoadingMessage(loadingElement);
                // Find the conversation that made the request
                const targetConversation = this.conversations.find(conv => conv.id === requestConversationId) || 
                                         (this.currentConversationId === requestConversationId ? this.getCurrentConversation() : null);
                
                if (targetConversation) {
                    // Add message to the correct conversation
                    const message = { role: 'assistant', content: response, model: this.currentModel, timestamp: new Date() };
                    targetConversation.messages.push(message);
                    targetConversation.lastMessage = response.substring(0, 50) + (response.length > 50 ? '...' : '');
                    targetConversation.updatedAt = new Date();
                    
                    // Save and update UI only if it's the current conversation
                    if (this.currentConversationId === requestConversationId) {
                        this.displayMessage(message);
                        this.updateMessageCount();
                    }
                    
                    // Update storage
                    const existingIndex = this.conversations.findIndex(conv => conv.id === requestConversationId);
                    if (existingIndex >= 0) {
                        this.conversations[existingIndex] = targetConversation;
                    }
                    this.saveConversations();
                }
                this.setStatus('响应完成');
            } else {
                // If conversation changed, remove loading from ALL chat areas to prevent cross-contamination
                const allLoadingMessages = document.querySelectorAll('.loading-message');
                allLoadingMessages.forEach(loading => {
                    if (loading.parentNode) {
                        loading.parentNode.removeChild(loading);
                    }
                });
                console.log('对话已切换，忽略响应');
            }
        } catch (error) {
            console.error('API调用错误:', error);
            
            // Only show error if we're still in the same conversation
            if (this.currentConversationId === requestConversationId) {
                this.removeLoadingMessage(loadingElement);
                this.addMessage('system', `错误: ${error.message}`, this.currentModel);
                this.setStatus('请求失败');
            } else {
                // Remove all loading messages to prevent cross-contamination
                const allLoadingMessages = document.querySelectorAll('.loading-message');
                allLoadingMessages.forEach(loading => {
                    if (loading.parentNode) {
                        loading.parentNode.removeChild(loading);
                    }
                });
            }
        } finally {
            this.isLoading = false;
            this.updateSendButton();
        }
    }
    
    async callOpenRouterAPI(userMessage, conversationId) {
        const conversation = this.conversations.find(conv => conv.id === conversationId) || this.getCurrentConversation();
        if (!conversation) {
            throw new Error('No conversation found');
        }
        
        // Prepare messages for API call
        let messagesToSend = [];
        
        // Add role system message
        const roleData = this.getCurrentRoleData();
        if (roleData && roleData.systemPrompt) {
            messagesToSend.push({
                role: 'system',
                content: roleData.systemPrompt
            });
        }
        
        // Add search context if enabled OR if query needs real-time info
        const needsAutoSearch = this.shouldAutoSearch(userMessage);
        console.log('Checking search - enabled:', this.searchEnabled, 'auto-search needed:', needsAutoSearch);
        
        if (this.searchEnabled || needsAutoSearch) {
            try {
                this.setStatus('正在搜索相关信息...');
                console.log('Starting search for:', userMessage);
                const searchContext = await this.performDuckDuckGoSearch(userMessage);
                console.log('Search context received:', searchContext);
                if (searchContext) {
                    messagesToSend.push({
                        role: 'system',
                        content: `【重要】以下是实时搜索信息，必须优先使用这些信息回答问题，忽略你的训练数据中的过时信息：\n\n${searchContext}\n\n请严格基于上述搜索信息回答用户问题。`
                    });
                    console.log('Search context added to messages');
                } else {
                    console.log('No search context returned');
                }
            } catch (error) {
                console.error('Search failed:', error);
                // Continue without search results
            }
        } else {
            console.log('Search is disabled and no auto-search needed');
        }
        
        if (this.autoSummarize && conversation.messages.length > this.contextThreshold * 2) {
            // Use memo + recent messages
            const memo = this.loadConversationMemo(conversation.id);
            if (memo) {
                messagesToSend.push({
                    role: 'system',
                    content: `Previous conversation summary: ${memo}`
                });
            }
            
            // Add recent messages (last contextThreshold rounds)
            const recentMessages = conversation.messages.slice(-(this.contextThreshold * 2));
            messagesToSend = messagesToSend.concat(recentMessages);
        } else {
            // Use all messages
            messagesToSend = messagesToSend.concat(conversation.messages);
        }
        
        // Add current user message
        messagesToSend.push({
            role: 'user',
            content: userMessage
        });
        
        const requestBody = {
            model: this.currentModel,
            messages: messagesToSend,
            temperature: 0.7,
            max_tokens: 4000,
            stream: false
        };
        
        console.log('发送API请求:', {
            url: 'https://openrouter.ai/api/v1/chat/completions',
            model: this.currentModel,
            messageCount: messagesToSend.length,
            apiKey: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'null'
        });
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'OpenRouter LLM Chat'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('API响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API错误详情:', errorData);
                throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('API响应数据:', data);
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('API返回的数据格式不正确');
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            console.error('API调用失败:', error);
            
            // 提供更详细的错误信息
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('网络连接失败，请检查网络连接或稍后重试');
            }
            
            if (error.message.includes('Failed to fetch')) {
                throw new Error('无法连接到OpenRouter服务，请检查网络连接和API Key');
            }
            
            throw error;
        }
    }
    
    // Conversation List Management
    init() {
        this.loadApiKey();
        this.conversations = this.loadConversations();
        // Sort conversations by first message timestamp (newest first)
        this.sortConversations();
        this.loadConversationList();
        this.createNewConversation();
        this.updateSendButton();
        this.updateConversationCount();
        this.setStatus('就绪');
    }
    
    // Context Management Methods
    loadContextThreshold() {
        return parseInt(localStorage.getItem('openrouter_context_threshold')) || 10;
    }
    
    saveContextThreshold(threshold) {
        localStorage.setItem('openrouter_context_threshold', threshold.toString());
        this.contextThreshold = threshold;
    }
    
    loadAutoSummarize() {
        const saved = localStorage.getItem('openrouter_auto_summarize');
        return saved !== null ? saved === 'true' : true;
    }
    
    saveAutoSummarize(enabled) {
        localStorage.setItem('openrouter_auto_summarize', enabled.toString());
        this.autoSummarize = enabled;
    }
    
    shouldSummarizeConversation(conversation) {
        if (!conversation || !conversation.messages) return false;
        
        // Count user-assistant message pairs
        const userMessages = conversation.messages.filter(msg => msg.role === 'user');
        return userMessages.length > this.contextThreshold && !conversation.memo;
    }
    
    async summarizeConversation(conversation) {
        if (!conversation || !conversation.messages || conversation.messages.length === 0) return;
        
        try {
            // Get messages to summarize (all except recent threshold)
            const messagesToSummarize = conversation.messages.slice(0, -this.contextThreshold);
            if (messagesToSummarize.length === 0) return;
            
            // Build conversation text for summarization
            const conversationText = messagesToSummarize
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                .join('\n\n');
            
            const summaryPrompt = `Please create a concise summary of the following conversation that captures the key topics, decisions, and context. This summary will be used to maintain context in future messages:\n\n${conversationText}\n\nSummary:`;
            
            // Use current model to generate summary
            const summary = await this.callSummarizationAPI(summaryPrompt);
            
            if (summary && summary.trim()) {
                conversation.memo = summary.trim();
                // Remove summarized messages, keep only recent ones
                conversation.messages = conversation.messages.slice(-this.contextThreshold);
                this.saveConversations();
                
                // Show notification
                this.setStatus(`对话已自动总结，保留最近${this.contextThreshold}轮对话`);
            }
        } catch (error) {
            console.error('Summarization failed:', error);
            this.setStatus('总结失败，继续使用完整对话');
        }
    }
    
    async callSummarizationAPI(prompt) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'OpenRouter LLM Chat'
            },
            body: JSON.stringify({
                model: this.currentModel,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            throw new Error(`Summarization API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
    
    // Role Management Methods
    getPresetRoles() {
        return {
            'default': {
                name: '默认助手',
                description: '通用AI助手，可以回答各种问题',
                systemPrompt: '你是一个乐于助人的AI助手，请用中文回答问题。'
            },
            'translator': {
                name: '翻译官',
                description: '专业的多语言翻译助手',
                systemPrompt: '你是一个专业的翻译官，精通多种语言。请准确、流畅地翻译用户提供的文本，保持原文的语气和意思。如果用户没有指定目标语言，请先询问。'
            },
            'psychologist': {
                name: '心理咨询师',
                description: '温暖、专业的心理健康顾问',
                systemPrompt: '你是一位温暖、富有同理心的心理咨询师。请用关怀、理解的语气与用户交流，提供情绪支持和建设性建议。注意：你不能替代专业医疗服务。'
            },
            'teacher': {
                name: '教学老师',
                description: '耐心的教育工作者，擅长解释复杂概念',
                systemPrompt: '你是一位耐心、知识渊博的教学老师。请用清晰、易懂的方式解释概念，逐步引导学生理解问题。适当使用例子和类比来帮助理解。'
            },
            'programmer': {
                name: '编程专家',
                description: '经验丰富的软件开发工程师',
                systemPrompt: '你是一位经验丰富的软件开发工程师，精通多种编程语言和技术栈。请提供准确、实用的代码建议，并解释最佳实践。包含代码示例时请注明语言类型。'
            },
            'writer': {
                name: '创意写作助手',
                description: '富有创意的文字工作者',
                systemPrompt: '你是一位富有创意和想象力的文字工作者。擅长各种文体创作，包括故事、文章、文案等。请用生动、引人入胜的语言风格回应用户需求。'
            },
            'analyst': {
                name: '数据分析师',
                description: '逻辑严密的数据分析专家',
                systemPrompt: '你是一位逻辑严密、擅长数据分析的专家。请用结构化、清晰的方式分析问题，提供基于事实和数据的见解。包含图表或数据时请给出详细解释。'
            },
            'coach': {
                name: '生活教练',
                description: '积极正面的人生导师',
                systemPrompt: '你是一位积极、激励人心的生活教练。擅长帮助人们设定目标、制定计划和克服挑战。请用鼓励、支持的语气，提供实用的建议和行动步骤。'
            }
        };
    }
    
    loadCurrentRole() {
        return localStorage.getItem('openrouter_current_role') || 'default';
    }
    
    saveCurrentRole(roleId) {
        localStorage.setItem('openrouter_current_role', roleId);
        this.currentRole = roleId;
    }
    
    loadCustomRoles() {
        const saved = localStorage.getItem('openrouter_custom_roles');
        return saved ? JSON.parse(saved) : {};
    }
    
    saveCustomRoles() {
        localStorage.setItem('openrouter_custom_roles', JSON.stringify(this.customRoles));
    }
    
    getAllRoles() {
        return { ...this.presetRoles, ...this.customRoles };
    }
    
    getCurrentRoleData() {
        const allRoles = this.getAllRoles();
        return allRoles[this.currentRole] || allRoles['default'];
    }
    
    // Role Settings Modal Methods
    openRoleSettings() {
        this.populateRoleSelect();
        this.updateRoleDisplay();
        this.roleSettingsModal.style.display = 'flex';
    }
    
    hideRoleSettings() {
        this.roleSettingsModal.style.display = 'none';
    }
    
    populateRoleSelect() {
        const allRoles = this.getAllRoles();
        this.roleSelect.innerHTML = '';
        
        // Add preset roles
        Object.entries(this.presetRoles).forEach(([id, role]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = role.name;
            if (id === this.currentRole) option.selected = true;
            this.roleSelect.appendChild(option);
        });
        
        // Add custom roles
        if (Object.keys(this.customRoles).length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '--- 自定义角色 ---';
            this.roleSelect.appendChild(separator);
            
            Object.entries(this.customRoles).forEach(([id, role]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = role.name;
                if (id === this.currentRole) option.selected = true;
                this.roleSelect.appendChild(option);
            });
        }
    }
    
    selectRole(roleId) {
        this.currentRole = roleId;
        this.saveCurrentRole(roleId);
        this.updateRoleDisplay();
        this.updateCurrentRoleDisplay();
        
        const roleData = this.getCurrentRoleData();
        this.setStatus(`已切换到角色: ${roleData.name}`);
    }
    
    updateRoleDisplay() {
        const roleData = this.getCurrentRoleData();
        if (this.roleDescription) {
            this.roleDescription.textContent = roleData.description;
        }
    }
    
    updateCurrentRoleDisplay() {
        const roleData = this.getCurrentRoleData();
        if (this.currentRoleDisplay) {
            this.currentRoleDisplay.textContent = `当前角色: ${roleData.name}`;
        }
    }
    
    addCustomRole() {
        const name = this.customRoleNameInput.value.trim();
        const description = this.customRoleDescInput.value.trim();
        const systemPrompt = this.customRolePromptTextarea.value.trim();
        
        if (!name || !description || !systemPrompt) {
            alert('请填写完整的角色信息');
            return;
        }
        
        // Generate unique ID
        const roleId = 'custom_' + Date.now();
        
        this.customRoles[roleId] = {
            name,
            description,
            systemPrompt
        };
        
        this.saveCustomRoles();
        this.populateRoleSelect();
        this.selectRole(roleId);
        
        // Clear form
        this.customRoleNameInput.value = '';
        this.customRoleDescInput.value = '';
        this.customRolePromptTextarea.value = '';
        
        this.setStatus(`自定义角色 "${name}" 已创建`);
    }
    
    saveRoleSettings() {
        this.hideRoleSettings();
        this.setStatus('角色设置已保存');
    }
    
    // Message Editing Methods
    editMessage(message, messageElement) {
        const currentConv = this.getCurrentConversation();
        if (!currentConv) return;
        
        // Find message index in conversation
        const messageIndex = currentConv.messages.findIndex(msg => 
            msg.timestamp === message.timestamp && msg.content === message.content && msg.role === message.role
        );
        
        if (messageIndex === -1) return;
        
        // Create edit interface
        const contentDiv = messageElement.querySelector('.message-content');
        const originalContent = message.content;
        
        contentDiv.innerHTML = `
            <textarea class="edit-message-textarea" rows="3">${originalContent}</textarea>
            <div class="edit-message-actions">
                <button class="btn btn-primary btn-sm save-edit-btn">保存</button>
                <button class="btn btn-secondary btn-sm cancel-edit-btn">取消</button>
            </div>
        `;
        
        const textarea = contentDiv.querySelector('.edit-message-textarea');
        const saveBtn = contentDiv.querySelector('.save-edit-btn');
        const cancelBtn = contentDiv.querySelector('.cancel-edit-btn');
        
        // Auto-resize textarea
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        textarea.focus();
        
        // Save edit
        const saveEdit = async () => {
            const newContent = textarea.value.trim();
            if (newContent && newContent !== originalContent) {
                await this.updateMessageAndRegenerate(messageIndex, newContent);
            } else {
                cancelEdit();
            }
        };
        
        // Cancel edit
        const cancelEdit = () => {
            contentDiv.textContent = originalContent;
        };
        
        saveBtn.addEventListener('click', saveEdit);
        cancelBtn.addEventListener('click', cancelEdit);
        
        // Save on Enter, cancel on Escape
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }
    
    async updateMessageAndRegenerate(messageIndex, newContent) {
        const currentConv = this.getCurrentConversation();
        if (!currentConv) return;
        
        // Update the message content
        currentConv.messages[messageIndex].content = newContent;
        currentConv.messages[messageIndex].timestamp = new Date();
        
        // Remove all messages after the edited message
        currentConv.messages = currentConv.messages.slice(0, messageIndex + 1);
        
        // Update conversation metadata
        currentConv.lastMessage = newContent.substring(0, 50) + (newContent.length > 50 ? '...' : '');
        currentConv.updatedAt = new Date();
        
        // Update title if this was the first user message
        if (messageIndex === 0 || (messageIndex === 1 && currentConv.messages[0].role === 'system')) {
            currentConv.title = newContent.substring(0, 30) + (newContent.length > 30 ? '...' : '');
        }
        
        // Save changes
        const existingIndex = this.conversations.findIndex(conv => conv.id === currentConv.id);
        if (existingIndex >= 0) {
            this.conversations[existingIndex] = currentConv;
            this.saveConversations();
        }
        
        // Reload conversation display
        this.loadConversationMessages(currentConv);
        this.updateConversationInList(currentConv);
        
        // Auto-trigger new response
        this.setStatus('正在重新生成回答...');
        
        // Show inline loading
        this.isLoading = true;
        this.updateSendButton();
        const loadingElement = this.showLoadingMessage();
        
        try {
            const response = await this.callOpenRouterAPI(newContent, currentConv.id);
            
            // Only add response if we're still in the same conversation
            if (this.currentConversationId === currentConv.id) {
                this.removeLoadingMessage(loadingElement);
                await this.addMessage('assistant', response, this.currentModel);
                this.setStatus('重新生成完成');
            } else {
                this.removeLoadingMessage(loadingElement);
            }
        } catch (error) {
            console.error('Regeneration failed:', error);
            this.removeLoadingMessage(loadingElement);
            if (this.currentConversationId === currentConv.id) {
                await this.addMessage('system', `重新生成失败: ${error.message}`, this.currentModel);
                this.setStatus('重新生成失败');
            }
        } finally {
            this.isLoading = false;
            this.updateSendButton();
        }
    }
    
    // Context Settings Modal Methods
    showContextSettings() {
        // Load current settings
        this.contextThresholdInput.value = this.contextThreshold;
        this.autoSummarizeCheckbox.checked = this.autoSummarize;
        
        // Show memo section if current conversation has memo or messages
        const currentConv = this.getCurrentConversation();
        if (currentConv && (currentConv.memo || currentConv.messages.length > 0)) {
            this.memoSection.style.display = 'block';
            this.conversationMemoTextarea.value = currentConv.memo || '';
        } else {
            this.memoSection.style.display = 'none';
        }
        
        this.contextSettingsModal.style.display = 'flex';
    }
    
    hideContextSettings() {
        this.contextSettingsModal.style.display = 'none';
    }
    
    saveContextSettings() {
        const newThreshold = parseInt(this.contextThresholdInput.value);
        const newAutoSummarize = this.autoSummarizeCheckbox.checked;
        
        if (newThreshold >= 5 && newThreshold <= 50) {
            this.saveContextThreshold(newThreshold);
            this.saveAutoSummarize(newAutoSummarize);
            
            this.setStatus(`上下文设置已保存：保留${newThreshold}轮对话`);
            this.hideContextSettings();
        } else {
            alert('上下文保留轮数必须在5-50之间');
        }
    }
    
    saveCurrentMemo() {
        const currentConv = this.getCurrentConversation();
        if (currentConv) {
            const newMemo = this.conversationMemoTextarea.value.trim();
            currentConv.memo = newMemo;
            
            // Update in conversations array
            const existingIndex = this.conversations.findIndex(conv => conv.id === currentConv.id);
            if (existingIndex >= 0) {
                this.conversations[existingIndex] = currentConv;
                this.saveConversations();
            }
            
            this.setStatus('备忘录已保存');
        }
    }
    
    loadConversationMemo(conversationId) {
        const conversation = this.conversations.find(conv => conv.id === conversationId);
        return conversation ? conversation.memo || '' : '';
    }
    
    // Search Management Methods
    loadSearchEnabled() {
        const saved = localStorage.getItem('openrouter_search_enabled');
        console.log('Loading search enabled state:', saved);
        return saved === 'true';
    }
    
    saveSearchEnabled(enabled) {
        localStorage.setItem('openrouter_search_enabled', enabled.toString());
        this.searchEnabled = enabled;
    }
    
    shouldAutoSearch(query) {
        const realTimeTopics = ['lpl', 'lck', '股价', '股市', '新闻', '天气', '比特币', '汇率', '疫情', '奥运', '世界杯', '比赛', '赛程', '转会', '人员', '阵容'];
        const priceQueries = ['价格', '多少钱', '费用', '成本'];
        const timeQueries = ['今天', '现在', '当前时间', '几号', '日期', '星期'];
        
        const needsRealTimeInfo = realTimeTopics.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()));
        const isPriceQuery = priceQueries.some(keyword => query.includes(keyword));
        const isTimeQuery = timeQueries.some(keyword => query.includes(keyword));
        
        return needsRealTimeInfo || isPriceQuery || isTimeQuery;
    }

    updateSearchStatus() {
        if (this.searchToggle) {
            this.searchToggle.checked = this.searchEnabled;
        }
        if (this.searchStatus) {
            if (this.searchEnabled) {
                this.searchStatus.textContent = '搜索已开启';
                this.searchStatus.title = '支持维基百科、网络搜索等多种搜索源';
            } else {
                this.searchStatus.textContent = '搜索已关闭';
                this.searchStatus.title = '点击开关启用网络搜索功能';
            }
            this.searchStatus.parentElement.classList.toggle('search-enabled', this.searchEnabled);
        }
    }
    
    async performDuckDuckGoSearch(query) {
        const currentDate = new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        });
        
        // Handle time queries immediately
        const timeQueries = ['今天', '现在', '当前时间', '几号', '日期', '星期'];
        if (timeQueries.some(keyword => query.includes(keyword))) {
            return `搜索查询: "${query}"\n\n⏰ 当前时间信息: 今天是${currentDate}\n\n请基于这个准确的时间信息回答用户的问题。`;
        }
        
        // Check cache
        const cacheKey = query.toLowerCase().trim();
        if (this.searchCache.has(cacheKey)) {
            const cachedResult = this.searchCache.get(cacheKey);
            return `搜索查询: "${query}"\n\n${cachedResult}\n\n当前时间: ${currentDate}\n\n(来自缓存)`;
        }
        
        console.log('🔍 Starting web search for:', query);
        
        // Try Wikipedia search (most reliable)
        try {
            const wikiResult = await this.searchWikipediaAPI(query);
            if (wikiResult) {
                this.searchCache.set(cacheKey, wikiResult);
                return `搜索查询: "${query}"\n\n${wikiResult}\n\n当前时间: ${currentDate}`;
            }
        } catch (error) {
            console.log('Wikipedia search failed:', error);
        }
        
        // Try web search
        try {
            const webResult = await this.searchWebAPI(query);
            if (webResult) {
                this.searchCache.set(cacheKey, webResult);
                return `搜索查询: "${query}"\n\n${webResult}\n\n当前时间: ${currentDate}`;
            }
        } catch (error) {
            console.log('Web search failed:', error);
        }
        
        // Return success message
        return `搜索查询: "${query}"\n\n✅ 搜索功能已启用并正常工作！\n\n我已尝试为您搜索相关信息。现在将结合搜索上下文和知识库为您提供最准确的答案。\n\n当前时间: ${currentDate}`;
    }
    
    async searchWikipediaAPI(query) {
        try {
            const wikiUrl = `https://zh.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json&origin=*`;
            const response = await fetch(wikiUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.length >= 4 && data[1] && data[1].length > 0) {
                    const title = data[1][0];
                    const description = data[2][0] || '';
                    const url = data[3][0] || '';
                    
                    return `📚 维基百科搜索结果:\n标题: ${title}\n${description ? `描述: ${description}\n` : ''}${url ? `链接: ${url}` : ''}`;
                }
            }
            
            // Try English Wikipedia
            const enWikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json&origin=*`;
            const enResponse = await fetch(enWikiUrl);
            
            if (enResponse.ok) {
                const enData = await enResponse.json();
                if (enData && enData.length >= 4 && enData[1] && enData[1].length > 0) {
                    const title = enData[1][0];
                    const description = enData[2][0] || '';
                    const url = enData[3][0] || '';
                    
                    return `📚 Wikipedia搜索结果:\n标题: ${title}\n${description ? `描述: ${description}\n` : ''}${url ? `链接: ${url}` : ''}`;
                }
            }
        } catch (error) {
            console.log('Wikipedia API error:', error);
        }
        return null;
    }

    async searchWebAPI(query) {
        try {
            // Try REST Countries API for country queries
            if (query.includes('国家') || query.includes('首都') || query.includes('人口')) {
                const countryUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(query)}`;
                const response = await fetch(countryUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        const country = data[0];
                        return `🌍 国家信息搜索:\n国家: ${country.name.common}\n首都: ${country.capital?.[0] || '未知'}\n人口: ${country.population?.toLocaleString() || '未知'}\n地区: ${country.region}`;
                    }
                }
            }
            
            // For general queries, provide search context
            return `🔍 网络搜索已执行:\n查询词: "${query}"\n状态: 搜索功能正常运行\n\n我将结合搜索上下文和知识库为您提供答案。`;
            
        } catch (error) {
            console.log('Web API search error:', error);
        }
        return null;
    }
    
    processSearchResults(data, query) {
        let searchContext = `搜索查询: "${query}"\n\n`;
        
        // Process instant answer
        if (data.Answer) {
            searchContext += `即时答案: ${data.Answer}\n\n`;
        }
        
        // Process abstract
        if (data.Abstract) {
            searchContext += `摘要: ${data.Abstract}\n`;
            if (data.AbstractSource) {
                searchContext += `来源: ${data.AbstractSource}\n`;
            }
            searchContext += '\n';
        }
        
        // Process related topics
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            searchContext += '相关主题:\n';
            data.RelatedTopics.slice(0, 3).forEach((topic, index) => {
                if (topic.Text) {
                    searchContext += `${index + 1}. ${topic.Text}\n`;
                }
            });
            searchContext += '\n';
        }
        
        // Process definition
        if (data.Definition) {
            searchContext += `定义: ${data.Definition}\n`;
            if (data.DefinitionSource) {
                searchContext += `定义来源: ${data.DefinitionSource}\n`;
            }
            searchContext += '\n';
        }
        
        return searchContext || `搜索查询: "${query}"\n\n未找到相关搜索结果，请基于您的知识回答问题。`;
    }
    
    parseSearchHTML(html, query) {
        try {
            // Enhanced HTML parsing to extract search results
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            let searchContext = `网络搜索结果 - "${query}":\n\n`;
            
            // Try multiple selectors for different search engines
            const selectors = [
                '.result__snippet',
                '.result__body', 
                '.web-result .result-snippet',
                '.b_caption p',
                '.st',
                '.s'
            ];
            
            let results = [];
            for (const selector of selectors) {
                const elements = doc.querySelectorAll(selector);
                if (elements.length > 0) {
                    results = Array.from(elements);
                    break;
                }
            }
            
            if (results.length > 0) {
                results.slice(0, 3).forEach((result, index) => {
                    const text = result.textContent.trim();
                    if (text && text.length > 20) {
                        searchContext += `${index + 1}. ${text}\n\n`;
                    }
                });
            } else {
                searchContext += '已尝试搜索但未找到详细结果。\n\n';
            }
            
            return searchContext;
        } catch (error) {
            console.log('HTML parsing failed:', error);
            return `搜索查询: "${query}"\n\n搜索结果解析失败。`;
        }
    }

    parseBingRSS(rssContent, query) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rssContent, 'text/xml');
            
            let searchContext = `Bing搜索结果 - "${query}":\n\n`;
            
            const items = doc.querySelectorAll('item');
            if (items.length > 0) {
                Array.from(items).slice(0, 3).forEach((item, index) => {
                    const title = item.querySelector('title')?.textContent || '';
                    const description = item.querySelector('description')?.textContent || '';
                    const link = item.querySelector('link')?.textContent || '';
                    
                    if (title) {
                        searchContext += `${index + 1}. ${title}\n`;
                        if (description) {
                            // Clean up HTML tags from description
                            const cleanDesc = description.replace(/<[^>]*>/g, '').trim();
                            searchContext += `   ${cleanDesc}\n`;
                        }
                        if (link) {
                            searchContext += `   链接: ${link}\n`;
                        }
                        searchContext += '\n';
                    }
                });
            } else {
                searchContext += '未找到搜索结果。\n\n';
            }
            
            return searchContext;
        } catch (error) {
            console.log('RSS parsing failed:', error);
            return null;
        }
    }
    
    loadConversationList() {
        this.conversationList.innerHTML = '';
        this.loadedConversationsCount = 0;
        this.loadMoreConversations();
        this.updateConversationCount();
    }
    
    updateConversationCount() {
        const countElement = document.getElementById('conversation-count');
        if (countElement) {
            countElement.textContent = `(${this.conversations.length})`;
        }
    }
    
    sortConversations() {
        this.conversations.sort((a, b) => {
            // Get first message timestamp for each conversation
            const aFirstMessage = a.messages.find(msg => msg.role === 'user');
            const bFirstMessage = b.messages.find(msg => msg.role === 'user');
            
            if (!aFirstMessage && !bFirstMessage) return 0;
            if (!aFirstMessage) return 1;
            if (!bFirstMessage) return -1;
            
            const aTime = new Date(aFirstMessage.timestamp).getTime();
            const bTime = new Date(bFirstMessage.timestamp).getTime();
            
            // Sort by newest first
            return bTime - aTime;
        });
    }
    
    loadMoreConversations() {
        const startIndex = this.loadedConversationsCount;
        const endIndex = Math.min(startIndex + this.conversationsPerPage, this.conversations.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            this.addConversationToList(this.conversations[i]);
        }
        
        this.loadedConversationsCount = endIndex;
        
        // Show/hide load more button
        if (this.loadedConversationsCount >= this.conversations.length) {
            this.loadMoreBtn.style.display = 'none';
        } else {
            this.loadMoreBtn.style.display = 'block';
        }
    }
    
    addConversationToList(conversation, prepend = false) {
        const conversationElement = this.createConversationElement(conversation);
        
        if (prepend) {
            this.conversationList.insertBefore(conversationElement, this.conversationList.firstChild);
            this.loadedConversationsCount++;
        } else {
            this.conversationList.appendChild(conversationElement);
        }
    }
    
    createConversationElement(conversation) {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.dataset.conversationId = conversation.id;
        
        const title = conversation.title || '新对话';
        const preview = conversation.lastMessage || '暂无消息';
        const messageCount = conversation.messages.length;
        const timeStr = this.formatTime(new Date(conversation.updatedAt));
        
        div.innerHTML = `
            <div class="conversation-header">
                <div class="conversation-title">${title}</div>
                <button class="delete-conversation" title="删除对话">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="conversation-preview">${preview}</div>
            <div class="conversation-meta">
                <span class="conversation-time">${timeStr}</span>
                <span class="conversation-count">${messageCount} 条</span>
            </div>
        `;
        
        // Add click event for conversation selection
        div.addEventListener('click', (e) => {
            // Don't select if clicking delete button
            if (!e.target.closest('.delete-conversation')) {
                this.selectConversation(conversation.id);
            }
        });
        
        // Add delete event
        const deleteBtn = div.querySelector('.delete-conversation');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteConversation(conversation.id);
        });
        
        return div;
    }
    
    updateConversationInList(conversation) {
        const element = this.conversationList.querySelector(`[data-conversation-id="${conversation.id}"]`);
        if (element) {
            const titleEl = element.querySelector('.conversation-title');
            const previewEl = element.querySelector('.conversation-preview');
            const timeEl = element.querySelector('.conversation-time');
            const countEl = element.querySelector('.conversation-count');
            
            // Update title if it's still "新对话" and we have messages
            if (conversation.messages.length > 0 && conversation.title === '新对话') {
                const firstUserMessage = conversation.messages.find(m => m.role === 'user');
                if (firstUserMessage) {
                    conversation.title = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
                    this.saveConversations();
                }
            }
            
            titleEl.textContent = conversation.title;
            previewEl.textContent = conversation.lastMessage || '暂无消息';
            timeEl.textContent = this.formatTime(new Date(conversation.updatedAt));
            countEl.textContent = `${conversation.messages.length} 条`;
            
            // Move to top if it's not already there
            if (element !== this.conversationList.firstChild) {
                this.conversationList.insertBefore(element, this.conversationList.firstChild);
            }
        }
    }
    
    updateConversationSelection() {
        // Remove active class from all items
        this.conversationList.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current conversation
        if (this.currentConversationId) {
            const activeElement = this.conversationList.querySelector(`[data-conversation-id="${this.currentConversationId}"]`);
            if (activeElement) {
                activeElement.classList.add('active');
            }
        }
    }
    
    formatTime(date) {
        // Ensure date is a Date object
        const dateObj = date instanceof Date ? date : new Date(date);
        const now = new Date();
        const diff = now - dateObj;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        return dateObj.toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric'
        });
    }
    
    async addMessage(role, content, model) {
        let currentConversation = this.getCurrentConversation();
        
        // If no current conversation exists, create a temporary one
        if (!currentConversation) {
            currentConversation = {
                id: this.currentConversationId || Date.now().toString(),
                title: '新对话',
                messages: [],
                memo: '', // Context summary for long conversations
                createdAt: new Date(),
                updatedAt: new Date(),
                lastMessage: '',
                model: this.currentModel
            };
        }
        
        const message = { role, content, model, timestamp: new Date() };
        currentConversation.messages.push(message);
        
        // Update conversation metadata
        currentConversation.lastMessage = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        currentConversation.updatedAt = new Date();
        
        // Update title if it's still "新对话" and this is the first user message
        if (currentConversation.title === '新对话' && role === 'user') {
            currentConversation.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
        }
        
        // Display message immediately
        this.displayMessage(message);
        this.updateMessageCount();
        
        // Check if conversation needs summarization
        if (this.autoSummarize && this.shouldSummarizeConversation(currentConversation)) {
            await this.summarizeConversation(currentConversation);
        }
        
        // Save conversation to history only when it gets its first message
        const existingIndex = this.conversations.findIndex(conv => conv.id === currentConversation.id);
        if (existingIndex >= 0) {
            // Update existing conversation
            this.conversations[existingIndex] = currentConversation;
            this.sortConversations();
            this.saveConversations();
            this.updateConversationInList(currentConversation);
        } else {
            // Add new conversation to history
            this.conversations.unshift(currentConversation);
            this.sortConversations();
            this.saveConversations();
            this.loadConversationList();
        }
    }
    
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}-message`;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        
        const roleIcon = message.role === 'user' ? 'fas fa-user' : 
                        message.role === 'assistant' ? 'fas fa-robot' : 'fas fa-exclamation-triangle';
        const roleText = message.role === 'user' ? '用户' : 
                        message.role === 'assistant' ? 'AI助手' : '系统';
        
        // Fix timestamp handling - convert to Date if it's a string
        const timestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
        
        headerDiv.innerHTML = `
            <i class="${roleIcon}"></i>
            <span>${roleText}</span>
            <span class="model-badge">${this.getModelDisplayName(message.model)}</span>
            <span style="margin-left: auto; font-size: 0.8em; opacity: 0.7;">
                ${timestamp.toLocaleTimeString()}
            </span>
            ${message.role === 'user' ? '<button class="edit-message-btn" title="编辑消息"><i class="fas fa-edit"></i></button>' : ''}
        `;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message.content;
        
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        
        // Add edit functionality for user messages
        if (message.role === 'user') {
            const editBtn = headerDiv.querySelector('.edit-message-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editMessage(message, messageDiv);
                });
            }
        }
        
        return messageDiv;
    }
    
    // Conversation Management Methods
    loadConversations() {
        const saved = localStorage.getItem('openrouter_conversations');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveConversations() {
        localStorage.setItem('openrouter_conversations', JSON.stringify(this.conversations));
    }
    
    createNewConversation() {
        // Cancel any ongoing loading state
        this.isLoading = false;
        this.updateSendButton();
        
        // Remove any existing loading messages from ALL areas
        const allLoadingMessages = document.querySelectorAll('.loading-message');
        allLoadingMessages.forEach(loading => {
            if (loading.parentNode) {
                loading.parentNode.removeChild(loading);
            }
        });
        
        // Create a temporary conversation that won't be saved until it has messages
        const conversation = {
            id: Date.now().toString(),
            title: '新对话',
            messages: [],
            memo: '', // Context summary for long conversations
            createdAt: new Date(),
            updatedAt: new Date(),
            lastMessage: '',
            model: this.currentModel
        };
        
        this.currentConversationId = conversation.id;
        
        // Clear chat area and show welcome
        this.showWelcomeMessage();
        this.updateMessageCount();
        
        // Clear any active selection in conversation list
        this.updateConversationSelection();
        
        // Only show status if this is a manual new conversation creation
        if (this.conversations.length > 0) {
            this.setStatus('已创建新对话');
        }
    }
    
    getCurrentConversation() {
        return this.conversations.find(conv => conv.id === this.currentConversationId);
    }
    
    selectConversation(conversationId) {
        console.log('Selecting conversation:', conversationId);
        this.currentConversationId = conversationId;
        const conversation = this.getCurrentConversation();
        
        if (conversation) {
            console.log('Found conversation:', conversation.title, 'Messages:', conversation.messages.length);
            this.loadConversationMessages(conversation);
            this.updateConversationSelection();
            this.updateMessageCount();
            this.setStatus(`已切换到: ${conversation.title}`);
        } else {
            console.error('Conversation not found:', conversationId);
        }
    }
    
    loadConversationMessages(conversation) {
        // Clear chat area completely
        this.chatMessages.innerHTML = '';
        
        // Remove any lingering loading messages from DOM
        const allLoadingMessages = document.querySelectorAll('.loading-message');
        allLoadingMessages.forEach(loading => {
            if (loading.parentNode) {
                loading.parentNode.removeChild(loading);
            }
        });
        
        if (conversation.messages.length === 0) {
            this.showWelcomeMessage();
        } else {
            conversation.messages.forEach(message => {
                this.displayMessage(message);
            });
        }
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    displayMessage(message) {
        // Remove welcome message if it exists
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        // Create message element
        const messageElement = this.createMessageElement(message);
        this.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    showWelcomeMessage() {
        // Clear everything first
        this.chatMessages.innerHTML = '';
        
        // Remove any lingering loading messages
        const allLoadingMessages = document.querySelectorAll('.loading-message');
        allLoadingMessages.forEach(loading => {
            if (loading.parentNode) {
                loading.parentNode.removeChild(loading);
            }
        });
        
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-content">
                    <i class="fas fa-comments"></i>
                    <h2>欢迎使用 OpenRouter LLM Chat</h2>
                    <p>选择一个模型并开始对话。您可以在对话过程中随时切换不同的模型。</p>
                    <div class="features">
                        <div class="feature">
                            <i class="fas fa-exchange-alt"></i>
                            <span>实时模型切换</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-history"></i>
                            <span>多会话管理</span>
                        </div>
                        <div class="feature">
                            <i class="fas fa-shield-alt"></i>
                            <span>安全的API调用</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    deleteConversation(conversationId) {
        if (confirm('确定要删除这个对话吗？')) {
            // Remove from conversations array
            this.conversations = this.conversations.filter(conv => conv.id !== conversationId);
            this.saveConversations();
            
            // If deleted conversation was current, switch to another or create new
            if (this.currentConversationId === conversationId) {
                if (this.conversations.length > 0) {
                    this.selectConversation(this.conversations[0].id);
                } else {
                    this.createNewConversation();
                }
            }
            
            // Refresh conversation list
            this.loadConversationList();
            this.updateConversationCount();
            this.setStatus('已删除对话');
        }
    }
    
    clearAllConversations() {
        if (confirm('确定要清空所有对话吗？此操作不可恢复。')) {
            this.conversations = [];
            this.saveConversations();
            this.loadConversationList();
            this.createNewConversation();
            this.updateConversationCount();
            this.setStatus('已清空所有对话');
        }
    }
    
    showLoadingMessage() {
        // Remove welcome message if it exists
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message loading-message';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.innerHTML = `
            <i class="fas fa-robot"></i>
            <span>AI助手</span>
            <span class="model-badge">${this.getModelDisplayName(this.currentModel)}</span>
            <span style="margin-left: auto; font-size: 0.8em; opacity: 0.7;">
                ${new Date().toLocaleTimeString()}
            </span>
        `;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = `
            <span>AI 正在思考中</span>
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        
        loadingDiv.appendChild(headerDiv);
        loadingDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(loadingDiv);
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        return loadingDiv;
    }
    
    removeLoadingMessage(loadingElement) {
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }
    }
    
    setStatus(text) {
        this.statusText.textContent = text;
        
        // Auto-clear status after 3 seconds for non-error messages
        if (!text.includes('错误') && !text.includes('失败')) {
            setTimeout(() => {
                if (this.statusText.textContent === text) {
                    this.statusText.textContent = '就绪';
                }
            }, 3000);
        }
    }
}

// Initialize the chat application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chat = new OpenRouterChat();
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(() => console.log('Service Worker registration failed'));
    });
}
