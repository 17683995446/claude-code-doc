/**
 * Claude Code Architecture Documentation - 搜索模块
 * 全文搜索 + 搜索历史记录
 * 使用 Fuse.js 实现模糊搜索
 *
 * @version 2.0.0
 * @author Claude Code Architecture Team
 */

const SearchModule = {
    fuse: null,
    isOpen: false,
    results: [],
    selectedIndex: 0,
    _logger: 'Search',
    _history: [],           // 搜索历史记录
    _maxHistory: 10,        // 最大历史记录数
    _storageKey: 'claude-code-doc-search-history',
    _boundEvents: [],

    // 搜索数据 - 所有章节内容
    searchData: [
        { id: 'overview', title: '全局架构概览', icon: '🏗️', keywords: '架构 编排层 orchestration layer 全局 分层 表示层 业务层 工具层', content: 'Claude Code 不是新 AI 模型，而是编排层。把 Claude 大模型包装起来，赋予读写文件、执行命令、搜索代码、启动子代理等能力。' },
        { id: 'master-loop', title: '核心循环', icon: '🔄', keywords: '循环 loop agent while tool_call 伪代码 流程图', content: '核心是一个简单的 while 循环：调用 Claude API → 检查工具调用 → 执行工具 → 追加结果 → 循环。没有意图分类器、没有任务路由器。' },
        { id: 'tools', title: '工具系统', icon: '🔧', keywords: '工具 bash read edit write grep glob task todowrite 工具集 arsenal', content: '8 个核心工具：Bash 万能适配器、Read 文件读取、Edit 文件编辑、Write 文件创建、Grep 内容搜索、Glob 文件匹配、Task 子代理、TodoWrite 任务追踪。' },
        { id: 'context', title: '上下文管理', icon: '📦', keywords: '上下文 context token 200K 压缩 compact CLAUDE.md 配置', content: '200K Token 预算分配：系统提示 5-15K、CLAUDE.md 1-10K、对话历史（可变）、工具结果（可变）、响应预留 40-45K。5 层压缩管道。' },
        { id: 'subagent', title: '子代理架构', icon: '🤖', keywords: '子代理 sub-agent task explore plan general team 并行 隔离', content: 'Task 工具生成子代理，深度限制为 1。子代理有独立上下文窗口，仅返回摘要。支持 Explore、Plan、General、Team 四种类型。' },
        { id: 'permission', title: '权限安全', icon: '🔒', keywords: '权限 permission 安全 default auto-accept plan bypass yolo custom managed hooks', content: '7 种权限模式：default、auto-accept、plan、bypassPermissions、yolo、custom、managed。ML 分类器 + 规则引擎 + Hooks 三重防护。' },
        { id: 'plugin', title: '插件生态', icon: '🧩', keywords: '插件 plugin commands agents skills hooks settings MCP', content: '5 种组件类型：Commands 斜杠命令、Agents 代理定义、Skills 技能、Hooks 钩子、Settings 设置。MCP 协议连接外部工具。' },
        { id: 'dataflow', title: '数据流图', icon: '📊', keywords: '数据流 dataflow 输入 处理 输出 持久化 流转', content: '输入层（用户输入+CLAUDE.md+Memory）→ 处理层（上下文构建+QueryEngine+工具执行+压缩）→ 输出层（响应+文件变更+Shell输出）→ 持久化层（会话+记忆+遥测）。' },
        { id: 'session', title: '会话生命周期', icon: '💾', keywords: '会话 session 生命周期 lifecycle 状态机 init ready running stopped', content: '会话状态：INIT（初始化）→ READY（就绪）→ RUNNING（运行）→ COMPACTING（压缩）→ WAITING（等待）→ STOPPED（停止）。' },
        { id: 'directory', title: '源码目录结构', icon: '📂', keywords: '目录 src main.tsx QueryEngine query.ts Tool tools commands components services', content: 'src/ 下 ~1900 个 TypeScript 文件。核心文件：main.tsx(入口)、QueryEngine.ts(46K行)、query.ts(785KB)、Tool.ts(29K行)。' },
        { id: 'tech-stack', title: '技术栈', icon: '⚡', keywords: '技术栈 typescript bun react ink commander zod ripgrep mcp', content: 'TypeScript strict + Bun 运行时 + React/Ink 终端 UI + Commander.js CLI + Zod v4 Schema + ripgrep 搜索 + MCP SDK。' },
        { id: 'hidden', title: '隐藏功能', icon: '🕵️', keywords: '隐藏 codenames capybara tengu fennec numbat undercover 卧底 遥测 远程控制 daemon proactive coordinator KAIROS', content: '模型代号：Capybara(v8)、Tengu(实验)、Fennec(Opus 4.6)、Numbat(下一代)。108 个隐藏模块通过 feature() 编译时移除。' },
        { id: 'compare', title: '竞品对比', icon: '⚔️', keywords: '竞品 对比 copilot cursor aider github 优势 局限', content: 'Claude Code vs GitHub Copilot vs Cursor vs Aider。优势：200K 上下文、原生多文件、Shell 集成、子代理、MCP。局限：仅在线、CLI 优先。' },
        { id: 'philosophy', title: '设计哲学', icon: '💡', keywords: '设计哲学 less scaffolding more model search don\'t index isolation progressive enhancement', content: '核心原则：Less Scaffolding More Model（少搭脚手架多信模型）、Search Don\'t Index（搜索而非索引）、Isolation by Default（默认隔离）、Progressive Enhancement（渐进增强）。' }
    ],

    init() {
        this.loadHistory();
        this.createUI();
        this.bindEvents();
        // initFuse 延迟到 initSearchEngine() 中执行（等 Fuse.js CDN 加载完成）
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '搜索模块 UI 初始化完成');
        }
        return this;
    },

    /**
     * 延迟初始化 Fuse.js 搜索引擎
     * 在外部 CDN 库加载完成后调用
     */
    initSearchEngine() {
        if (typeof Fuse === 'undefined') {
            if (window.AppCore) {
                window.AppCore.logger.warn(this._logger, 'Fuse.js 未加载，模糊搜索不可用');
            }
            return this;
        }
        this.initFuse();
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '搜索引擎初始化完成');
        }
        return this;
    },

    // ==================== 搜索历史 ====================

    /**
     * 从 localStorage 加载搜索历史
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem(this._storageKey);
            this._history = saved ? JSON.parse(saved) : [];
        } catch (e) {
            this._history = [];
        }
        return this;
    },

    /**
     * 保存搜索历史到 localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem(this._storageKey, JSON.stringify(this._history));
        } catch (e) {
            // localStorage 不可用，静默失败
        }
        return this;
    },

    /**
     * 添加搜索记录到历史
     * @param {string} query - 搜索关键词
     */
    addToHistory(query) {
        const trimmed = query.trim();
        if (!trimmed) return this;

        // 移除重复项
        this._history = this._history.filter(item => item !== trimmed);

        // 添加到开头
        this._history.unshift(trimmed);

        // 限制最大数量
        if (this._history.length > this._maxHistory) {
            this._history = this._history.slice(0, this._maxHistory);
        }

        this.saveHistory();
        return this;
    },

    /**
     * 清除搜索历史
     */
    clearHistory() {
        this._history = [];
        this.saveHistory();
        if (this.isOpen) {
            this.showHistory();
        }
        return this;
    },

    /**
     * 获取搜索历史
     * @returns {string[]} 历史记录列表
     */
    getHistory() {
        return [...this._history];
    },

    // ==================== UI 创建 ====================

    createUI() {
        const modal = document.createElement('div');
        modal.id = 'search-modal';
        modal.className = 'search-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', '搜索文档');
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="search-overlay" id="search-overlay"></div>
            <div class="search-container">
                <div class="search-input-wrapper">
                    <span class="search-icon">🔍</span>
                    <input
                        type="text"
                        id="search-input"
                        class="search-input"
                        placeholder="搜索文档内容..."
                        autocomplete="off"
                        aria-label="搜索输入"
                    />
                    <kbd class="search-kbd">ESC</kbd>
                </div>
                <div class="search-results" id="search-results" role="listbox" aria-label="搜索结果">
                    <div class="search-hint">
                        <span>💡 输入关键词搜索</span>
                        <span class="search-shortcut-hint">
                            <kbd>↑</kbd><kbd>↓</kbd> 导航 · <kbd>Enter</kbd> 跳转 · <kbd>Esc</kbd> 关闭
                        </span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return this;
    },

    initFuse() {
        this.fuse = new Fuse(this.searchData, {
            keys: [
                { name: 'title', weight: 0.4 },
                { name: 'keywords', weight: 0.35 },
                { name: 'content', weight: 0.25 }
            ],
            threshold: 0.35,
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 1,
            ignoreLocation: true
        });
        return this;
    },

    bindEvents() {
        // Ctrl+K / Cmd+K 打开搜索
        const keyHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
            // Ctrl+Shift+F 打开搜索
            if (e.ctrlKey && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                this.open();
            }
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
            if (this.isOpen) {
                if (e.key === 'ArrowDown') { e.preventDefault(); this.navigate(1); }
                if (e.key === 'ArrowUp') { e.preventDefault(); this.navigate(-1); }
                if (e.key === 'Enter') { e.preventDefault(); this.selectCurrent(); }
            }
        };
        document.addEventListener('keydown', keyHandler);
        this._boundEvents.push({ el: document, event: 'keydown', handler: keyHandler });

        // 搜索输入（带防抖）
        const input = document.getElementById('search-input');
        if (input) {
            const debouncedSearch = window.AppCore?.utils?.debounce
                ? AppCore.utils.debounce((value) => this.search(value), 200)
                : (value) => this.search(value);
            const inputHandler = (e) => {
                const value = e.target.value;
                if (value.trim()) {
                    debouncedSearch(value);
                } else {
                    // 空输入时显示搜索历史
                    this.showHistory();
                }
            };
            input.addEventListener('input', inputHandler);
            this._boundEvents.push({ el: input, event: 'input', handler: inputHandler });

            // 聚焦时显示搜索历史
            const focusHandler = () => {
                if (!input.value.trim()) {
                    this.showHistory();
                }
            };
            input.addEventListener('focus', focusHandler);
            this._boundEvents.push({ el: input, event: 'focus', handler: focusHandler });
        }

        // 点击遮罩关闭
        const overlay = document.getElementById('search-overlay');
        if (overlay) {
            const overlayHandler = () => this.close();
            overlay.addEventListener('click', overlayHandler);
            this._boundEvents.push({ el: overlay, event: 'click', handler: overlayHandler });
        }

        return this;
    },

    // ==================== 搜索历史 UI ====================

    /**
     * 显示搜索历史
     */
    showHistory() {
        const resultsEl = document.getElementById('search-results');
        if (!resultsEl) return this;

        if (this._history.length === 0) {
            this.showHint();
            return this;
        }

        resultsEl.innerHTML = `
            <div class="search-history-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                color: var(--text-muted);
                font-size: 12px;
            ">
                <span>🕐 最近搜索</span>
                <button id="clear-search-history" style="
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    font-size: 12px;
                    padding: 2px 6px;
                    border-radius: 4px;
                ">清除</button>
            </div>
            ${this._history.map((item, index) => `
                <div class="search-history-item" data-query="${this._escapeAttr(item)}" data-index="${index}" style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 16px;
                    cursor: pointer;
                    transition: background 0.15s;
                    color: var(--text-secondary);
                    font-size: 14px;
                ">
                    <span style="color: var(--text-muted);">🕐</span>
                    <span style="flex: 1;">${this._escapeHtml(item)}</span>
                </div>
            `).join('')}
        `;

        // 绑定历史项点击
        resultsEl.querySelectorAll('.search-history-item').forEach(el => {
            el.addEventListener('click', () => {
                const query = el.dataset.query;
                const input = document.getElementById('search-input');
                if (input) {
                    input.value = query;
                    this.search(query);
                }
            });
            el.addEventListener('mouseenter', () => {
                el.style.background = 'var(--bg-hover)';
            });
            el.addEventListener('mouseleave', () => {
                el.style.background = '';
            });
        });

        // 绑定清除按钮
        const clearBtn = document.getElementById('clear-search-history');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearHistory();
                if (typeof ToastModule !== 'undefined') {
                    ToastModule.show('搜索历史已清除', 'info', 2000);
                }
            });
            clearBtn.addEventListener('mouseenter', () => {
                clearBtn.style.background = 'var(--bg-hover)';
            });
            clearBtn.addEventListener('mouseleave', () => {
                clearBtn.style.background = '';
            });
        }

        return this;
    },

    // ==================== 搜索功能 ====================

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
        return this;
    },

    open() {
        const modal = document.getElementById('search-modal');
        const input = document.getElementById('search-input');

        if (modal) {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            this.isOpen = true;

            if (input) {
                input.value = '';
                input.focus();
                // 打开时显示搜索历史
                this.showHistory();
            }
        }
        return this;
    },

    close() {
        const modal = document.getElementById('search-modal');
        if (modal) {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            this.isOpen = false;
        }
        return this;
    },

    search(query) {
        const resultsEl = document.getElementById('search-results');
        if (!resultsEl) return this;

        if (!query.trim()) {
            this.showHistory();
            return this;
        }

        if (!this.fuse) {
            resultsEl.innerHTML = '<div class="search-no-results">搜索引擎未就绪，请稍后再试...</div>';
            return this;
        }

        this.results = this.fuse.search(query);
        this.selectedIndex = 0;

        // 添加到搜索历史
        this.addToHistory(query);

        this.renderResults();
        return this;
    },

    showHint() {
        const resultsEl = document.getElementById('search-results');
        if (resultsEl) {
            resultsEl.innerHTML = `
                <div class="search-hint">
                    <span>💡 输入关键词搜索</span>
                    <span class="search-shortcut-hint">
                        <kbd>↑</kbd><kbd>↓</kbd> 导航 · <kbd>Enter</kbd> 跳转 · <kbd>Esc</kbd> 关闭
                    </span>
                </div>
            `;
        }
        return this;
    },

    renderResults() {
        const resultsEl = document.getElementById('search-results');
        if (!resultsEl) return this;

        if (this.results.length === 0) {
            resultsEl.innerHTML = `
                <div class="search-empty">
                    <span>😕 未找到相关内容</span>
                    <span class="search-empty-hint">试试其他关键词</span>
                </div>
            `;
            return this;
        }

        // 搜索结果计数
        const countHtml = `<div style="
            padding: 6px 16px;
            color: var(--text-muted);
            font-size: 12px;
            border-bottom: 1px solid var(--border-color);
        ">找到 ${this.results.length} 个结果</div>`;

        resultsEl.innerHTML = countHtml + this.results.map((result, index) => {
            const item = result.item;
            const score = Math.round((1 - result.score) * 100);
            const matches = result.matches || [];

            // 高亮匹配文本
            let highlightedContent = item.content;
            const contentMatch = matches.find(m => m.key === 'content');
            if (contentMatch && contentMatch.indices && contentMatch.indices.length > 0) {
                const [start, end] = contentMatch.indices[0];
                const contextStart = Math.max(0, start - 20);
                const contextEnd = Math.min(item.content.length, end + 20);
                const prefix = contextStart > 0 ? '...' : '';
                const suffix = contextEnd < item.content.length ? '...' : '';
                highlightedContent = this._escapeHtml(prefix) +
                    this._escapeHtml(item.content.slice(contextStart, start)) +
                    '<mark>' + this._escapeHtml(item.content.slice(start, end)) + '</mark>' +
                    this._escapeHtml(item.content.slice(end, contextEnd)) +
                    this._escapeHtml(suffix);
            }

            return `
                <div class="search-result-item ${index === this.selectedIndex ? 'selected' : ''}"
                     data-index="${index}"
                     data-id="${item.id}"
                     role="option"
                     aria-selected="${index === this.selectedIndex}"
                     tabindex="-1">
                    <div class="search-result-header">
                        <span class="search-result-icon">${this._escapeHtml(item.icon)}</span>
                        <span class="search-result-title">${this._escapeHtml(item.title)}</span>
                        <span class="search-result-score">${score}%</span>
                    </div>
                    <div class="search-result-content">${highlightedContent}</div>
                </div>
            `;
        }).join('');

        // 绑定点击事件
        resultsEl.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                this.close();
                if (typeof NavigationModule !== 'undefined') {
                    NavigationModule.scrollToSection(id);
                }
            });
            el.addEventListener('mouseenter', () => {
                this.selectedIndex = parseInt(el.dataset.index);
                this.updateSelection();
            });
        });

        return this;
    },

    navigate(direction) {
        if (this.results.length === 0) return this;

        this.selectedIndex = (this.selectedIndex + direction + this.results.length) % this.results.length;
        this.updateSelection();
        return this;
    },

    updateSelection() {
        const items = document.querySelectorAll('.search-result-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === this.selectedIndex);
            item.setAttribute('aria-selected', i === this.selectedIndex);
            if (i === this.selectedIndex) {
                item.scrollIntoView({ block: 'nearest' });
            }
        });
        return this;
    },

    selectCurrent() {
        if (this.results.length === 0) return this;

        const current = this.results[this.selectedIndex];
        if (current) {
            this.close();
            if (typeof NavigationModule !== 'undefined') {
                NavigationModule.scrollToSection(current.item.id);
            }
        }
        return this;
    },

    destroy() {
        this._boundEvents.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });
        this._boundEvents = [];
        this._history = [];

        const modal = document.getElementById('search-modal');
        if (modal) modal.remove();
    },

    // ==================== 安全工具方法 ====================

    /**
     * HTML 转义 - 防止 XSS
     * @param {string} str
     * @returns {string}
     */
    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * HTML 属性值转义 - 防止属性注入
     * @param {string} str
     * @returns {string}
     */
    _escapeAttr(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
};
