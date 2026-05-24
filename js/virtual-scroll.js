/**
 * 虚拟滚动组件 v1.0
 * 处理长文档渲染性能，只渲染可视区域内容
 * @version 1.0.0
 */

const VirtualScroll = {
    // 配置
    _config: {
        itemHeight: 50,      // 预估每项高度
        bufferSize: 5,       // 缓冲区大小（上下各多渲染几项）
        containerSelector: '.main-content',
        contentSelector: '.content'
    },

    // 状态
    _state: {
        initialized: false,
        totalHeight: 0,
        visibleRange: { start: 0, end: 0 },
        scrollTop: 0,
        containerHeight: 0
    },

    // DOM 元素
    _elements: {},

    // 原始内容
    _originalContent: null,
    _sections: [],

    /**
     * 初始化虚拟滚动
     * @param {Object} options - 配置选项
     */
    init(options = {}) {
        if (this._state.initialized) return this;

        Object.assign(this._config, options);

        this._elements.container = document.querySelector(this._config.containerSelector);
        this._elements.content = document.querySelector(this._config.contentSelector);

        if (!this._elements.container || !this._elements.content) {
            console.warn('[VirtualScroll] 容器或内容元素未找到');
            return this;
        }

        // 保存原始内容（使用 DocumentFragment 保留原始 DOM 节点引用）
        this._originalFragment = document.createDocumentFragment();
        while (this._elements.content.firstChild) {
            this._originalFragment.appendChild(this._elements.content.firstChild);
        }
        this._originalContent = this._elements.content.innerHTML; // 保留文本快照用于 refresh
        
        // 分析内容结构
        this._analyzeContent();
        
        // 设置虚拟滚动容器
        this._setupContainer();
        
        // 绑定事件
        this._bindEvents();
        
        // 初始渲染
        this._render();

        this._state.initialized = true;
        console.log('[VirtualScroll] 虚拟滚动已启用');

        return this;
    },

    /**
     * 分析内容结构
     * @private
     */
    _analyzeContent() {
        // 从 _originalContent 重新解析内容（用于 refresh）
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this._originalContent;
        const content = tempDiv;
        const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        this._sections = [];
        let currentSection = null;

        // 遍历所有子元素，按标题分组
        Array.from(content.children).forEach((child, index) => {
            const isHeading = /^H[1-6]$/.test(child.tagName);
            
            if (isHeading || !currentSection) {
                currentSection = {
                    id: `section-${index}`,
                    heading: isHeading ? child.textContent : '',
                    level: isHeading ? parseInt(child.tagName[1]) : 0,
                    elements: [],
                    height: 0,
                    offset: 0
                };
                this._sections.push(currentSection);
            }
            
            currentSection.elements.push(child);
        });

        // 动态高度测量：为每个 section 创建临时隐藏元素测量实际高度
        const measureContainer = document.createElement('div');
        measureContainer.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:-9999px;width:auto;';
        const containerWidth = this._elements.container ? this._elements.container.clientWidth : document.documentElement.clientWidth;
        measureContainer.style.width = containerWidth + 'px';
        document.body.appendChild(measureContainer);

        let offsetAccum = 0;
        this._sections.forEach(section => {
            const sectionEl = document.createElement('div');
            section.elements.forEach(el => {
                sectionEl.appendChild(el.cloneNode(true));
            });
            measureContainer.appendChild(sectionEl);
            const measuredHeight = sectionEl.offsetHeight;
            section.height = measuredHeight > 0 ? measuredHeight : this._config.itemHeight;
            section.offset = offsetAccum;
            offsetAccum += section.height;
            measureContainer.removeChild(sectionEl);
        });

        document.body.removeChild(measureContainer);

        // 计算总高度
        this._state.totalHeight = offsetAccum;
    },

    /**
     * 设置虚拟滚动容器
     * @private
     */
    _setupContainer() {
        const { container, content } = this._elements;
        
        // 设置容器样式
        container.style.position = 'relative';
        container.style.overflow = 'auto';
        
        // 创建占位元素
        this._elements.spacer = document.createElement('div');
        this._elements.spacer.className = 'virtual-scroll-spacer';
        this._elements.spacer.style.height = `${this._state.totalHeight}px`;
        
        // 创建可视区域容器
        this._elements.viewport = document.createElement('div');
        this._elements.viewport.className = 'virtual-scroll-viewport';
        this._elements.viewport.style.position = 'absolute';
        this._elements.viewport.style.top = '0';
        this._elements.viewport.style.left = '0';
        this._elements.viewport.style.right = '0';
        
        // 清空原内容，添加虚拟滚动结构
        content.innerHTML = '';
        content.appendChild(this._elements.spacer);
        content.appendChild(this._elements.viewport);
        
        // 获取容器高度
        this._state.containerHeight = container.clientHeight;
    },

    /**
     * 绑定滚动事件
     * @private
     */
    _bindEvents() {
        const { container } = this._elements;

        let ticking = false;

        this._scrollHandler = () => {
            this._state.scrollTop = container.scrollTop;

            if (!ticking) {
                requestAnimationFrame(() => {
                    this._render();
                    ticking = false;
                });
                ticking = true;
            }
        };
        container.addEventListener('scroll', this._scrollHandler, { passive: true });

        // 窗口大小改变时重新计算（防抖）
        this._resizeDebounceTimer = null;
        this._resizeHandler = () => {
            if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
            this._resizeDebounceTimer = setTimeout(() => {
                this._state.containerHeight = container.clientHeight;
                this._render();
            }, 150);
        };
        window.addEventListener('resize', this._resizeHandler);
    },

    /**
     * 渲染可视区域
     * @private
     */
    _render() {
        const { scrollTop, containerHeight } = this._state;
        const { bufferSize } = this._config;
        
        // 使用动态 section 高度查找可视范围
        let startIndex = 0;
        let endIndex = 0;
        for (let i = 0; i < this._sections.length; i++) {
            const section = this._sections[i];
            if (section.offset + section.height <= scrollTop) {
                startIndex = i + 1;
            }
            if (section.offset < scrollTop + containerHeight) {
                endIndex = i;
            }
        }
        startIndex = Math.max(0, startIndex - bufferSize);
        endIndex = Math.min(this._sections.length - 1, endIndex + bufferSize);

        // 如果范围没有变化，跳过渲染
        if (this._state.visibleRange.start === startIndex && 
            this._state.visibleRange.end === endIndex) {
            return;
        }

        this._state.visibleRange = { start: startIndex, end: endIndex };

        // 渲染可视区域
        this._renderViewport(startIndex, endIndex);
    },

    /**
     * 渲染可视区域内容
     * @private
     */
    _renderViewport(startIndex, endIndex) {
        const { viewport } = this._elements;
        
        // 计算偏移量（使用动态 section offset）
        const offsetTop = this._sections[startIndex] ? this._sections[startIndex].offset : 0;
        viewport.style.transform = `translateY(${offsetTop}px)`;
        
        // 清空当前内容
        viewport.innerHTML = '';
        
        // 渲染可见章节
        for (let i = startIndex; i <= endIndex; i++) {
            const section = this._sections[i];
            if (!section) continue;
            
            const sectionEl = document.createElement('div');
            sectionEl.className = 'virtual-section';
            sectionEl.style.minHeight = `${section.height}px`;
            sectionEl.dataset.sectionId = section.id;
            
            // 添加章节内容（使用 importNode 保留事件监听器）
            section.elements.forEach(el => {
                sectionEl.appendChild(document.importNode(el, true));
            });
            
            viewport.appendChild(sectionEl);
        }
    },

    /**
     * 滚动到指定章节
     * @param {string} sectionId - 章节ID或标题
     */
    scrollToSection(sectionId) {
        const index = this._sections.findIndex(s => 
            s.id === sectionId || s.heading === sectionId
        );
        
        if (index !== -1) {
            const offset = this._sections[index].offset;
            this._elements.container.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
        }
    },

    /**
     * 获取当前可见章节
     * @returns {Object} 当前章节信息
     */
    getCurrentSection() {
        const { scrollTop } = this._state;
        // 使用动态 section offset 查找当前章节
        for (let i = this._sections.length - 1; i >= 0; i--) {
            if (this._sections[i].offset <= scrollTop) {
                return this._sections[i];
            }
        }
        return this._sections[0] || null;
    },

    /**
     * 刷新（内容变化后调用）
     */
    refresh() {
        if (!this._state.initialized) return this;
        
        this._analyzeContent();
        this._elements.spacer.style.height = `${this._state.totalHeight}px`;
        this._render();
        
        return this;
    },

    /**
     * 销毁虚拟滚动
     */
    destroy() {
        if (!this._state.initialized) return;

        // 移除事件监听器
        if (this._scrollHandler && this._elements.container) {
            this._elements.container.removeEventListener('scroll', this._scrollHandler);
            this._scrollHandler = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this._resizeDebounceTimer) {
            clearTimeout(this._resizeDebounceTimer);
            this._resizeDebounceTimer = null;
        }

        // 恢复原始内容（使用 DocumentFragment 保留原始 DOM 节点）
        if (this._elements.content) {
            this._elements.content.innerHTML = '';
            if (this._originalFragment) {
                this._elements.content.appendChild(this._originalFragment);
            } else if (this._originalContent) {
                this._elements.content.innerHTML = this._originalContent;
            }
        }

        this._state.initialized = false;
        console.log('[VirtualScroll] 虚拟滚动已销毁');
    },

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            totalSections: this._sections.length,
            totalHeight: this._state.totalHeight,
            visibleRange: this._state.visibleRange,
            renderedItems: this._state.visibleRange.end - this._state.visibleRange.start + 1
        };
    }
};

// 全局暴露
window.VirtualScroll = VirtualScroll;
