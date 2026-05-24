/**
 * 协作模块 v1.1
 * 评论、讨论、阅读进度同步
 * @version 1.1.0
 */

(function() {
    'use strict';

    // 防止重复声明
    if (typeof window.CollaborationModule !== 'undefined') {
        console.warn('[CollaborationModule] 模块已存在，跳过重复声明');
        return;
    }

const CollaborationModule = {
    // 配置
    _config: {
        storageKey: 'claude_doc_collab',
        maxCommentsPerSection: 50,
        syncInterval: 30000, // 30秒同步一次
        enableRealtime: false // 是否启用实时协作
    },

    // 状态
    _state: {
        initialized: false,
        userId: null,
        userName: null,
        comments: new Map(), // section -> comments[]
        readingProgress: {},
        onlineUsers: [],
        lastSync: 0
    },

    // DOM 元素
    _elements: {},

    /**
     * 初始化协作模块
     */
    init() {
        if (this._state.initialized) return this;

        // 生成或恢复用户ID
        this._state.userId = this._getOrCreateUserId();
        this._state.userName = this._getStoredUserName() || '访客';

        // 加载存储的数据
        this._loadFromStorage();

        // 初始化UI
        this._initUI();

        // 绑定事件
        this._bindEvents();

        // 启动同步
        if (this._config.enableRealtime) {
            this._startSync();
        }

        this._state.initialized = true;
        console.log('[Collaboration] 协作模块已初始化');

        return this;
    },

    /**
     * 获取或创建用户ID
     * @private
     */
    _getOrCreateUserId() {
        let userId = localStorage.getItem('claude_doc_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('claude_doc_user_id', userId);
        }
        return userId;
    },

    /**
     * 获取存储的用户名
     * @private
     */
    _getStoredUserName() {
        return localStorage.getItem('claude_doc_user_name');
    },

    /**
     * 从存储加载数据
     * @private
     */
    _loadFromStorage() {
        const data = localStorage.getItem(this._config.storageKey);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this._state.comments = new Map(Object.entries(parsed.comments || {}));
                this._state.readingProgress = parsed.readingProgress || {};
            } catch (e) {
                console.warn('[Collaboration] 加载存储数据失败');
            }
        }
    },

    /**
     * 保存到存储
     * @private
     */
    _saveToStorage() {
        try {
            const data = {
                comments: Object.fromEntries(this._state.comments),
                readingProgress: this._state.readingProgress,
                lastSync: Date.now()
            };
            localStorage.setItem(this._config.storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('[Collaboration] 保存到 localStorage 失败（可能配额已满）:', e.message);
        }
    },

    /**
     * 初始化UI
     * @private
     */
    _initUI() {
        // 为每个标题添加评论按钮
        const headings = document.querySelectorAll('.content h1, .content h2, .content h3');
        headings.forEach(heading => {
            if (!heading.id) {
                heading.id = 'section-' + Math.random().toString(36).substr(2, 9);
            }

            // 防止重复添加按钮（例如 importData 再次调用 _initUI 时）
            if (heading.querySelector('.comment-toggle-btn')) return;

            const commentBtn = document.createElement('button');
            commentBtn.className = 'comment-toggle-btn';
            commentBtn.innerHTML = '💬';
            commentBtn.title = '添加评论';
            commentBtn.dataset.section = heading.id;

            // 添加评论计数徽章
            const count = this._getCommentCount(heading.id);
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'comment-count';
                badge.textContent = count;
                commentBtn.appendChild(badge);
            }

            heading.appendChild(commentBtn);
        });

        // 创建评论面板
        this._createCommentPanel();
    },

    /**
     * 创建评论面板
     * @private
     */
    _createCommentPanel() {
        const panel = document.createElement('div');
        panel.id = 'comment-panel';
        panel.className = 'comment-panel';
        panel.hidden = true;

        panel.innerHTML = `
            <div class="comment-panel-header">
                <h3>💬 评论</h3>
                <button class="comment-panel-close">✕</button>
            </div>
            <div class="comment-panel-body">
                <div class="comment-list"></div>
                <div class="comment-form">
                    <input type="text" class="comment-user-name" placeholder="您的名字" value="${this._escapeHtml(this._state.userName)}">
                    <textarea class="comment-input" placeholder="写下您的评论..."></textarea>
                    <div class="comment-form-actions">
                        <button class="comment-submit">发表评论</button>
                        <button class="comment-cancel">取消</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._elements.panel = panel;
        this._elements.commentList = panel.querySelector('.comment-list');
        this._elements.commentInput = panel.querySelector('.comment-input');
        this._elements.userNameInput = panel.querySelector('.comment-user-name');
        this._elements.currentSection = null;
    },

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 评论按钮点击（保存引用以便 destroy 时移除）
        this._boundEvents = this._boundEvents || [];
        this._onDocumentClick = (e) => {
            if (e.target.closest('.comment-toggle-btn')) {
                const btn = e.target.closest('.comment-toggle-btn');
                const sectionId = btn.dataset.section;
                this._openCommentPanel(sectionId);
            }
        };
        document.addEventListener('click', this._onDocumentClick);
        this._boundEvents.push({ el: document, event: 'click', handler: this._onDocumentClick });

        // 面板关闭
        const closeHandler = () => {
            this._closeCommentPanel();
        };
        this._elements.panel.querySelector('.comment-panel-close').addEventListener('click', closeHandler);
        this._boundEvents.push({ el: this._elements.panel.querySelector('.comment-panel-close'), event: 'click', handler: closeHandler });

        // 发表评论
        const submitHandler = () => {
            this._submitComment();
        };
        this._elements.panel.querySelector('.comment-submit').addEventListener('click', submitHandler);
        this._boundEvents.push({ el: this._elements.panel.querySelector('.comment-submit'), event: 'click', handler: submitHandler });

        // 取消
        const cancelHandler = () => {
            this._closeCommentPanel();
        };
        this._elements.panel.querySelector('.comment-cancel').addEventListener('click', cancelHandler);
        this._boundEvents.push({ el: this._elements.panel.querySelector('.comment-cancel'), event: 'click', handler: cancelHandler });

        // 用户名变更
        const changeHandler = (e) => {
            this._state.userName = e.target.value;
            localStorage.setItem('claude_doc_user_name', e.target.value);
        };
        this._elements.userNameInput.addEventListener('change', changeHandler);
        this._boundEvents.push({ el: this._elements.userNameInput, event: 'change', handler: changeHandler });

        // 记录阅读进度
        this._trackReadingProgress();
    },

    /**
     * 打开评论面板
     * @private
     */
    _openCommentPanel(sectionId) {
        this._elements.currentSection = sectionId;
        this._renderComments(sectionId);
        this._elements.panel.hidden = false;
        this._elements.commentInput.focus();
    },

    /**
     * 关闭评论面板
     * @private
     */
    _closeCommentPanel() {
        this._elements.panel.hidden = true;
        this._elements.currentSection = null;
        this._elements.commentInput.value = '';
    },

    /**
     * 渲染评论列表
     * @private
     */
    _renderComments(sectionId) {
        const comments = this._state.comments.get(sectionId) || [];
        const list = this._elements.commentList;

        if (comments.length === 0) {
            list.innerHTML = '<div class="comment-empty">暂无评论，来发表第一条吧！</div>';
            return;
        }

        list.innerHTML = comments.map(comment => `
            <div class="comment-item ${comment.userId === this._state.userId ? 'comment-own' : ''}" data-id="${this._escapeHtml(comment.id)}">
                <div class="comment-header">
                    <span class="comment-author">${this._escapeHtml(comment.userName)}</span>
                    <span class="comment-time">${this._escapeHtml(this._formatTime(comment.timestamp))}</span>
                </div>
                <div class="comment-content">${this._escapeHtml(comment.content)}</div>
                <div class="comment-actions">
                    <button class="comment-reply" data-parent="${this._escapeHtml(comment.id)}">回复</button>
                    ${comment.userId === this._state.userId ? `
                        <button class="comment-edit" data-id="${this._escapeHtml(comment.id)}">编辑</button>
                        <button class="comment-delete" data-id="${this._escapeHtml(comment.id)}">删除</button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // 绑定评论操作
        list.querySelectorAll('.comment-delete').forEach(btn => {
            btn.addEventListener('click', () => this._deleteComment(btn.dataset.id));
        });
    },

    /**
     * 提交评论
     * @private
     */
    _submitComment() {
        const content = this._elements.commentInput.value.trim();
        if (!content) return;

        const sectionId = this._elements.currentSection;
        const comment = {
            id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            userId: this._state.userId,
            userName: this._state.userName,
            content: content,
            timestamp: Date.now(),
            sectionId: sectionId
        };

        // 添加到评论列表
        const comments = this._state.comments.get(sectionId) || [];
        comments.push(comment);
        this._state.comments.set(sectionId, comments);

        // 保存并刷新
        this._saveToStorage();
        this._renderComments(sectionId);
        this._updateCommentBadge(sectionId);

        // 清空输入
        this._elements.commentInput.value = '';

        // 触发事件
        this._emit('comment:added', comment);
    },

    /**
     * 公共API：以编程方式添加评论
     * @param {string} sectionId - 章节ID
     * @param {string} content - 评论内容
     * @returns {Object} 创建的评论对象
     */
    addComment(sectionId, content) {
        if (!sectionId || !content || !content.trim()) {
            console.warn('[CollaborationModule] addComment: sectionId 和 content 不能为空');
            return null;
        }

        const comment = {
            id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            userId: this._state.userId || 'anonymous',
            userName: this._state.userName || '匿名用户',
            content: content.trim(),
            timestamp: Date.now(),
            sectionId: sectionId
        };

        const comments = this._state.comments.get(sectionId) || [];
        if (comments.length >= this._config.maxCommentsPerSection) {
            console.warn(`[CollaborationModule] 章节 ${sectionId} 评论数已达上限`);
            return null;
        }

        comments.push(comment);
        this._state.comments.set(sectionId, comments);

        this._saveToStorage();
        this._updateCommentBadge(sectionId);
        this._emit('comment:added', comment);

        return comment;
    },

    /**
     * 公共API：删除评论
     * @param {string} commentId - 评论ID
     * @returns {boolean} 是否成功删除
     */
    deleteComment(commentId) {
        if (!commentId) return false;

        for (const [sectionId, comments] of this._state.comments) {
            const index = comments.findIndex(c => c.id === commentId);
            if (index !== -1) {
                comments.splice(index, 1);
                this._state.comments.set(sectionId, comments);
                this._saveToStorage();
                this._updateCommentBadge(sectionId);
                this._emit('comment:deleted', { commentId, sectionId });
                return true;
            }
        }
        return false;
    },

    /**
     * 公共API：获取指定章节的评论
     * @param {string} sectionId - 章节ID
     * @returns {Array} 评论列表
     */
    getComments(sectionId) {
        return this._state.comments.get(sectionId) || [];
    },

    /**
     * 删除评论
     * @private
     */
    _deleteComment(commentId) {
        if (!confirm('确定要删除这条评论吗？')) return;

        const sectionId = this._elements.currentSection;
        if (!sectionId) {
            console.warn('[Collaboration] _deleteComment: currentSection 为空，无法删除');
            return;
        }
        let comments = this._state.comments.get(sectionId) || [];
        comments = comments.filter(c => c.id !== commentId);

        if (comments.length === 0) {
            this._state.comments.delete(sectionId);
        } else {
            this._state.comments.set(sectionId, comments);
        }

        this._saveToStorage();
        this._renderComments(sectionId);
        this._updateCommentBadge(sectionId);

        this._emit('comment:deleted', { commentId, sectionId });
    },

    /**
     * 更新评论徽章
     * @private
     */
    _updateCommentBadge(sectionId) {
        const btn = document.querySelector(`.comment-toggle-btn[data-section="${sectionId}"]`);
        if (!btn) return;

        const count = this._getCommentCount(sectionId);
        let badge = btn.querySelector('.comment-count');

        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'comment-count';
                btn.appendChild(badge);
            }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    },

    /**
     * 获取评论数量
     * @private
     */
    _getCommentCount(sectionId) {
        const comments = this._state.comments.get(sectionId) || [];
        return comments.length;
    },

    /**
     * 追踪阅读进度
     * @private
     */
    _trackReadingProgress() {
        this._readProgressDebounceTimer = null;

        this._state.readingObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    this._state.readingProgress[sectionId] = {
                        timestamp: Date.now(),
                        percent: this._calculateReadPercent(entry.target)
                    };
                    if (this._readProgressDebounceTimer) {
                        clearTimeout(this._readProgressDebounceTimer);
                    }
                    this._readProgressDebounceTimer = setTimeout(() => {
                        this._saveToStorage();
                    }, 2000);
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('.content h1, .content h2, .content h3').forEach(heading => {
            this._state.readingObserver.observe(heading);
        });
    },

    /**
     * 计算阅读百分比
     * @private
     */
    _calculateReadPercent(element) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        return Math.min(100, Math.max(0, (windowHeight - rect.top) / windowHeight * 100));
    },

    /**
     * 格式化时间
     * @private
     */
    _formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        return date.toLocaleDateString();
    },

    /**
     * HTML转义
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        // textContent→innerHTML 不转义引号，需手动补充（用于HTML属性上下文）
        return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    /**
     * 触发事件
     * @private
     */
    _emit(event, data) {
        if (window.AppCore?.bus) {
            AppCore.bus.emit(event, data);
        }
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    },

    /**
     * 启动同步
     * @private
     */
    _startSync() {
        this._state.syncTimerId = setInterval(() => {
            this._syncWithServer();
        }, this._config.syncInterval);
    },

    /**
     * 与服务器同步
     * @private
     */
    async _syncWithServer() {
        // 这里可以实现与后端服务器的同步逻辑
        // 目前仅使用本地存储
        this._saveToStorage();
    },

    /**
     * 获取阅读进度
     */
    getReadingProgress() {
        return this._state.readingProgress;
    },

    /**
     * 获取所有评论
     */
    getAllComments() {
        return Object.fromEntries(this._state.comments);
    },

    /**
     * 导出数据
     */
    exportData() {
        return {
            userId: this._state.userId,
            userName: this._state.userName,
            comments: Object.fromEntries(this._state.comments),
            readingProgress: this._state.readingProgress,
            exportTime: Date.now()
        };
    },

    /**
     * 导入数据
     */
    importData(data) {
        if (data.comments) {
            this._state.comments = new Map(Object.entries(data.comments));
        }
        if (data.readingProgress) {
            this._state.readingProgress = data.readingProgress;
        }
        this._saveToStorage();
        this._initUI(); // 刷新UI
    },

    /**
     * 销毁模块
     */
    destroy() {
        this._saveToStorage();
        if (this._state.syncTimerId) {
            clearInterval(this._state.syncTimerId);
            this._state.syncTimerId = null;
        }
        if (this._readProgressDebounceTimer) {
            clearTimeout(this._readProgressDebounceTimer);
            this._readProgressDebounceTimer = null;
        }
        if (this._state.readingObserver) {
            this._state.readingObserver.disconnect();
            this._state.readingObserver = null;
        }
        // 清理事件监听器
        if (this._boundEvents) {
            this._boundEvents.forEach(({ el, event, handler }) => {
                el.removeEventListener(event, handler);
            });
            this._boundEvents = [];
        }
        if (this._elements.panel) {
            this._elements.panel.remove();
        }
        this._state.initialized = false;
    }
};

// 全局暴露
window.CollaborationModule = CollaborationModule;

console.log('[CollaborationModule] 模块已加载');
})();
