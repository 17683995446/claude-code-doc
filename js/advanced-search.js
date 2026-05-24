/**
 * 高级搜索模块 v1.0
 * 全文搜索、索引、自动补全
 * @version 1.0.0
 */

const AdvancedSearch = {
    // 配置
    _config: {
        minQueryLength: 2,
        maxResults: 20,
        highlightClass: 'search-highlight',
        indexFields: ['title', 'content', 'heading'],
        debounceMs: 150
    },

    // 索引数据
    _index: {
        documents: [],
        terms: new Map(),
        headings: []
    },

    // 状态
    _state: {
        initialized: false,
        indexing: false,
        lastQuery: '',
        searchHistory: []
    },

    // DOM 元素
    _elements: {},

    // Fuse.js 实例
    _fuse: null,

    /**
     * 初始化高级搜索
     */
    init() {
        if (this._state.initialized) return this;

        this._elements.input = document.getElementById('search-input');
        this._elements.results = document.getElementById('search-results');
        this._elements.suggestions = document.getElementById('search-suggestions');

        if (!this._elements.input) {
            console.warn('[AdvancedSearch] 搜索输入框未找到');
            return this;
        }

        // 构建索引
        this._buildIndex();

        // 绑定事件
        this._bindEvents();

        this._state.initialized = true;
        console.log('[AdvancedSearch] 高级搜索已初始化');

        return this;
    },

    /**
     * 构建搜索索引
     * @private
     */
    _buildIndex() {
        this._state.indexing = true;
        const content = document.querySelector('.content');
        if (!content) return;

        const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const documents = [];

        headings.forEach((heading, index) => {
            const section = this._getSectionContent(heading);
            const doc = {
                id: index,
                title: heading.textContent.trim(),
                heading: heading.tagName,
                content: section.text,
                anchor: heading.id || `section-${index}`
            };
            documents.push(doc);
        });

        this._index.documents = documents;

        // 初始化 Fuse.js
        if (window.Fuse) {
            const fuseOptions = {
                keys: [
                    { name: 'title', weight: 0.7 },
                    { name: 'content', weight: 0.3 }
                ],
                threshold: 0.3,
                includeScore: true,
                includeMatches: true
            };
            this._fuse = new Fuse(documents, fuseOptions);
        }

        this._state.indexing = false;
        console.log(`[AdvancedSearch] 索引构建完成: ${documents.length} 个文档`);
    },

    /**
     * 获取章节内容
     * @private
     */
    _getSectionContent(heading) {
        let text = '';
        let sibling = heading.nextElementSibling;

        while (sibling && !/^H[1-6]$/.test(sibling.tagName)) {
            text += sibling.textContent + ' ';
            sibling = sibling.nextElementSibling;
        }

        return { text: text.trim() };
    },

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        const { input } = this._elements;
        this._boundEvents = [];
        let debounceTimer;

        // 输入防抖搜索
        const inputHandler = (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();

            if (query.length < this._config.minQueryLength) {
                this._hideSuggestions();
                return;
            }

            debounceTimer = setTimeout(() => {
                this._showSuggestions(query);
            }, this._config.debounceMs);
        };
        input.addEventListener('input', inputHandler);
        this._boundEvents.push({ el: input, event: 'input', handler: inputHandler });

        // 键盘导航
        const keydownHandler = (e) => {
            this._handleKeyNavigation(e);
        };
        input.addEventListener('keydown', keydownHandler);
        this._boundEvents.push({ el: input, event: 'keydown', handler: keydownHandler });

        // 失去焦点隐藏建议
        const blurHandler = () => {
            setTimeout(() => this._hideSuggestions(), 200);
        };
        input.addEventListener('blur', blurHandler);
        this._boundEvents.push({ el: input, event: 'blur', handler: blurHandler });

        this._debounceTimer = debounceTimer;
    },

    /**
     * 显示搜索建议
     * @private
     */
    _showSuggestions(query) {
        if (!this._fuse) return;

        const results = this._fuse.search(query, { limit: 8 });
        const suggestions = this._elements.suggestions;

        if (!suggestions) return;

        if (results.length === 0) {
            suggestions.innerHTML = '<div class="search-no-results">无搜索结果</div>';
            suggestions.hidden = false;
            return;
        }

        const html = results.map((result, index) => {
            const doc = result.item;
            const score = Math.round((1 - result.score) * 100);
            const highlighted = this._highlightMatches(doc.title, result.matches);

            return `
                <div class="search-suggestion-item" data-index="${index}" data-anchor="${doc.anchor}">
                    <div class="suggestion-title">${highlighted}</div>
                    <div class="suggestion-meta">
                        <span class="suggestion-type">${doc.heading}</span>
                        <span class="suggestion-score">${score}% 匹配</span>
                    </div>
                    <div class="suggestion-preview">${this._getPreview(doc.content, query)}</div>
                </div>
            `;
        }).join('');

        suggestions.innerHTML = html;
        suggestions.hidden = false;

        // 绑定点击事件
        suggestions.querySelectorAll('.search-suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const anchor = item.dataset.anchor;
                this._navigateToResult(anchor, query);
                this._hideSuggestions();
            });
        });
    },

    /**
     * 高亮匹配文本
     * @private
     */
    _highlightMatches(text, matches) {
        if (!matches) return this._escapeHtml(text);

        // 先对整个文本进行 HTML 转义
        let highlighted = this._escapeHtml(text);
        const titleMatch = matches.find(m => m.key === 'title');

        if (titleMatch) {
            // 反向处理索引，避免插入 <mark> 标签后字符串长度变化导致偏移错误
            const indices = [...titleMatch.indices].reverse();
            indices.forEach(([start, end]) => {
                const before = highlighted.slice(0, start);
                const match = highlighted.slice(start, end + 1);
                const after = highlighted.slice(end + 1);
                highlighted = `${before}<mark>${match}</mark>${after}`;
            });
        }

        return highlighted;
    },

    /**
     * 转义正则表达式特殊字符
     * @private
     */
    _escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /**
     * HTML 转义 - 防止 XSS
     * @private
     */
    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * 获取预览文本
     * @private
     */
    _getPreview(content, query) {
        const index = content.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) return this._escapeHtml(content.slice(0, 100)) + '...';

        const start = Math.max(0, index - 40);
        const end = Math.min(content.length, index + query.length + 40);
        let preview = content.slice(start, end);

        if (start > 0) preview = '...' + preview;
        if (end < content.length) preview = preview + '...';

        // 先对整个预览文本进行 HTML 转义
        preview = this._escapeHtml(preview);

        // 高亮查询词（先转义正则特殊字符，防止注入）
        const escapedQuery = this._escapeRegExp(this._escapeHtml(query));
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        preview = preview.replace(regex, '<mark>$1</mark>');

        return preview;
    },

    /**
     * 隐藏搜索建议
     * @private
     */
    _hideSuggestions() {
        if (this._elements.suggestions) {
            this._elements.suggestions.hidden = true;
        }
    },

    /**
     * 键盘导航
     * @private
     */
    _handleKeyNavigation(e) {
        const suggestions = this._elements.suggestions;
        if (!suggestions || suggestions.hidden) return;

        const items = suggestions.querySelectorAll('.search-suggestion-item');
        const activeItem = suggestions.querySelector('.active');
        let activeIndex = -1;

        if (activeItem) {
            activeIndex = Array.from(items).indexOf(activeItem);
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                this._setActiveItem(items, activeIndex);
                break;
            case 'ArrowUp':
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                this._setActiveItem(items, activeIndex);
                break;
            case 'Enter':
                e.preventDefault();
                if (activeItem) {
                    activeItem.click();
                }
                break;
            case 'Escape':
                this._hideSuggestions();
                break;
        }
    },

    /**
     * 设置活动项
     * @private
     */
    _setActiveItem(items, index) {
        items.forEach(item => item.classList.remove('active'));
        if (items[index]) {
            items[index].classList.add('active');
            items[index].scrollIntoView({ block: 'nearest' });
        }
    },

    /**
     * 导航到结果
     * @private
     */
    _navigateToResult(anchor, query) {
        const element = document.getElementById(anchor);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            element.classList.add('search-target-highlight');
            setTimeout(() => {
                element.classList.remove('search-target-highlight');
            }, 3000);
        }

        // 记录搜索历史
        this._state.searchHistory.push({
            query: query || this._state.lastQuery || '',
            anchor: anchor,
            time: Date.now()
        });
    },

    /**
     * 执行搜索
     * @param {string} query - 搜索查询
     * @returns {Array} 搜索结果
     */
    search(query) {
        if (!this._fuse || query.length < this._config.minQueryLength) {
            return [];
        }

        this._state.lastQuery = query;
        const results = this._fuse.search(query, { limit: this._config.maxResults });

        return results.map(result => ({
            ...result.item,
            score: result.score,
            matches: result.matches
        }));
    },

    /**
     * 获取搜索建议
     * @param {string} query - 部分查询
     * @returns {Array} 建议列表
     */
    getSuggestions(query) {
        if (!this._fuse || query.length < this._config.minQueryLength) {
            return [];
        }

        const results = this._fuse.search(query, { limit: 5 });
        return results.map(r => r.item.title);
    },

    /**
     * 获取搜索历史
     * @returns {Array} 搜索历史
     */
    getHistory() {
        return this._state.searchHistory.slice(-10);
    },

    /**
     * 清除搜索历史
     */
    clearHistory() {
        this._state.searchHistory = [];
    },

    /**
     * 重新构建索引
     */
    reindex() {
        this._buildIndex();
    },

    /**
     * 获取索引统计
     */
    getStats() {
        return {
            documents: this._index.documents.length,
            terms: this._index.terms.size,
            indexed: !this._state.indexing
        };
    },

    /**
     * 销毁高级搜索模块
     */
    destroy() {
        // 清理防抖定时器
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }

        // 清理事件监听器
        if (this._boundEvents) {
            this._boundEvents.forEach(({ el, event, handler }) => {
                el.removeEventListener(event, handler);
            });
            this._boundEvents = [];
        }

        this._fuse = null;
        this._state.initialized = false;
        console.log('[AdvancedSearch] 高级搜索已销毁');
    }
};

// 全局暴露
window.AdvancedSearch = AdvancedSearch;
