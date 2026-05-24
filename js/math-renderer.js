/**
 * 数学公式渲染模块 v1.0.0
 * 功能：支持LaTeX数学公式渲染，行内公式和块级公式
 * 引擎：KaTeX（高性能、轻量级）
 * 特性：懒加载、错误处理、复制功能、主题适配
 */

(function() {
    'use strict';

    // 防止重复声明
    if (typeof window.MathRenderer !== 'undefined') {
        console.warn('[MathRenderer] 模块已存在，跳过重复声明');
        return;
    }

    const MathRenderer = {
        _config: {
            // KaTeX CDN配置
            katexCSS: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
            katexJS: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
            katexAutoRender: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js',

            // 渲染配置
            delimiters: [
                { left: '$$', right: '$$', display: true },   // 块级公式
                { left: '$', right: '$', display: false },   // 行内公式
                { left: '\\[', right: '\\]', display: true },  // LaTeX块级
                { left: '\\(', right: '\\)', display: false }  // LaTeX行内
            ],
            throwOnError: false,
            errorColor: '#cc0000',
            minRuleThickness: 0.05,
            maxSize: 10,
            maxExpand: 1000,

            // 功能开关
            autoRender: true,
            copyButton: true,
            editButton: true,
            zoomOnHover: true,

            // 性能配置
            lazyLoad: true,
            renderDelay: 100,
            batchSize: 10
        },

        _state: {
            initialized: false,
            katexLoaded: false,
            autoRenderLoaded: false,
            formulas: new Map(), // formulaId -> { element, code, display, rendered }
            renderQueue: [],
            isRendering: false,
            stats: {
                total: 0,
                rendered: 0,
                errors: 0
            }
        },

        _macros: {}, // 用户自定义宏

        /**
         * 初始化模块
         */
        async init(options = {}) {
            if (this._state.initialized) {
                console.log('[MathRenderer] 已经初始化');
                return this;
            }

            console.log('[MathRenderer] 开始初始化...');

            // 合并配置
            Object.assign(this._config, options);

            // 加载KaTeX CSS
            this._loadCSS();

            // 扫描公式
            this._scanFormulas();

            // 如果需要自动渲染
            if (this._config.autoRender && this._state.formulas.size > 0) {
                await this._loadKaTeX();
                await this._renderAllFormulas();
            }

            // 监听动态内容
            this._observeMutations();

            this._state.initialized = true;
            console.log(`[MathRenderer] 初始化完成，发现 ${this._state.formulas.size} 个公式`);

            // 发送初始化事件
            this._emit('math:init', {
                formulaCount: this._state.formulas.size
            });

            return this;
        },

        /**
         * 加载KaTeX CSS
         */
        _loadCSS() {
            if (document.querySelector(`link[href*="katex"]`)) {
                return; // 已加载
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = this._config.katexCSS;
            document.head.appendChild(link);

            console.log('[MathRenderer] KaTeX CSS已加载');
        },

        /**
         * 加载KaTeX JS
         */
        async _loadKaTeX() {
            if (this._state.katexLoaded && this._state.autoRenderLoaded) {
                return;
            }

            console.log('[MathRenderer] 加载KaTeX...');

            // 加载KaTeX核心
            if (!window.katex) {
                await this._loadScript(this._config.katexJS);
                this._state.katexLoaded = true;
                console.log('[MathRenderer] KaTeX核心加载成功');
            }

            // 加载auto-render扩展
            if (!window.renderMathInElement) {
                await this._loadScript(this._config.katexAutoRender);
                this._state.autoRenderLoaded = true;
                console.log('[MathRenderer] KaTeX Auto-render加载成功');
            }
        },

        /**
         * 加载脚本
         */
        _loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;

                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load ${src}`));

                document.head.appendChild(script);
            });
        },

        /**
         * 扫描文档中的数学公式
         */
        _scanFormulas() {
            // 扫描代码块中的公式
            this._scanCodeBlocks();

            // 扫描文本中的公式标记
            this._scanTextNodes();
        },

        /**
         * 扫描代码块
         */
        _scanCodeBlocks() {
            const selectors = [
                'pre code.language-math',
                'pre code.lang-math',
                'pre code.language-latex',
                'pre code.lang-latex',
                'pre code.language-tex',
                'pre code.lang-tex'
            ];

            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach((el, index) => {
                    this._registerFormula(el, index, true);
                });
            });
        },

        /**
         * 扫描文本节点中的公式
         */
        _scanTextNodes() {
            // 使用TreeWalker遍历文本节点
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const textNodes = [];
            let node;

            while (node = walker.nextNode()) {
                // 跳过代码块内的文本
                if (this._isInCodeBlock(node)) {
                    continue;
                }

                const text = node.textContent;
                if (this._containsFormula(text)) {
                    textNodes.push(node);
                }
            }

            // 处理包含公式的文本节点
            textNodes.forEach((node, index) => {
                this._processTextNode(node, index);
            });
        },

        /**
         * 检查是否在代码块内
         */
        _isInCodeBlock(node) {
            let parent = node.parentElement;
            while (parent) {
                if (parent.tagName === 'CODE' || parent.tagName === 'PRE') {
                    return true;
                }
                parent = parent.parentElement;
            }
            return false;
        },

        /**
         * 检查文本是否包含公式
         */
        _containsFormula(text) {
            // 检查各种公式分隔符
            const patterns = [
                /\$\$[\s\S]*?\$\$/,           // $$...$$
                /(?<!\$)\$(?!\$)[^\$]*\$/,   // $...$ (单行内)
                /\\\[[\s\S]*?\\\]/,          // \[...\]
                /\\\([^)]*\\\)/             // \(...\)
            ];

            return patterns.some(pattern => pattern.test(text));
        },

        /**
         * 处理文本节点，将公式提取出来
         */
        _processTextNode(textNode, index) {
            const text = textNode.textContent;
            const parent = textNode.parentElement;

            if (!parent) return;

            // 创建文档片段
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            // 匹配所有公式
            const formulaPattern = /(\$\$[\s\S]*?\$\$|(?<!\$)\$(?!\$)[^\$]*\$|\\\[[\s\S]*?\\\]|\\\([^)]*\\\))/g;
            let match;

            while ((match = formulaPattern.exec(text)) !== null) {
                // 添加公式前的文本
                if (match.index > lastIndex) {
                    fragment.appendChild(
                        document.createTextNode(text.slice(lastIndex, match.index))
                    );
                }

                // 创建公式元素
                const formulaText = match[1];
                const formulaSpan = document.createElement('span');
                formulaSpan.className = 'math-formula';
                formulaSpan.dataset.formulaId = `math-${Date.now()}-${index}-${match.index}`;
                formulaSpan.textContent = formulaText;

                fragment.appendChild(formulaSpan);

                // 注册公式
                this._registerFormula(formulaSpan, index, formulaText.includes('$$') || formulaText.includes('\\['));

                lastIndex = match.index + match[0].length;
            }

            // 添加剩余文本
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }

            // 替换原节点
            if (fragment.childNodes.length > 0) {
                parent.replaceChild(fragment, textNode);
            }
        },

        /**
         * 注册公式
         */
        _registerFormula(element, index, isDisplay) {
            // 检查是否已注册
            if (element.dataset.mathRegistered) {
                return;
            }

            const id = element.dataset.formulaId || `math-${Date.now()}-${index}`;
            element.dataset.formulaId = id;
            element.dataset.mathRegistered = 'true';

            // 提取公式代码
            let code = element.textContent.trim();

            // 移除分隔符
            if (code.startsWith('$$') && code.endsWith('$$')) {
                code = code.slice(2, -2).trim();
                isDisplay = true;
            } else if (code.startsWith('$') && code.endsWith('$')) {
                code = code.slice(1, -1).trim();
                isDisplay = false;
            } else if (code.startsWith('\\[') && code.endsWith('\\]')) {
                code = code.slice(2, -2).trim();
                isDisplay = true;
            } else if (code.startsWith('\\(') && code.endsWith('\\)')) {
                code = code.slice(2, -2).trim();
                isDisplay = false;
            }

            // 保存到状态
            this._state.formulas.set(id, {
                id,
                element,
                code,
                display: isDisplay,
                rendered: false,
                container: null
            });

            this._state.stats.total++;

            // 如果是代码块，创建容器
            if (element.tagName === 'CODE') {
                this._createFormulaContainer(element, id, isDisplay);
            }

            console.log(`[MathRenderer] 注册公式: ${id} (display: ${isDisplay})`);
        },

        /**
         * 创建公式容器
         */
        _createFormulaContainer(element, id, isDisplay) {
            const container = document.createElement('div');
            container.className = `math-formula-container ${isDisplay ? 'display' : 'inline'}`;
            container.dataset.formulaId = id;

            // 创建公式区域
            const formulaArea = document.createElement('div');
            formulaArea.className = 'math-formula-area';

            // 创建工具栏
            if (this._config.copyButton || this._config.editButton) {
                const toolbar = document.createElement('div');
                toolbar.className = 'math-formula-toolbar';

                if (this._config.copyButton) {
                    toolbar.innerHTML += `
                        <button class="btn-icon" data-action="copy" title="复制LaTeX代码">
                            📋 复制
                        </button>
                    `;
                }

                if (this._config.editButton) {
                    toolbar.innerHTML += `
                        <button class="btn-icon" data-action="edit" title="编辑公式">
                            ✏️ 编辑
                        </button>
                    `;
                }

                container.appendChild(toolbar);

                // 绑定事件
                toolbar.querySelectorAll('[data-action]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const action = btn.dataset.action;
                        this._handleToolbarAction(action, id);
                    });
                });
            }

            container.appendChild(formulaArea);

            // 创建原始代码区域（可折叠）
            const codeArea = document.createElement('div');
            codeArea.className = 'math-code-area collapsed';
            const formula = this._state.formulas.get(id);
            codeArea.innerHTML = `
                <div class="code-header">
                    <span>LaTeX源代码</span>
                    <button class="btn-toggle-code">显示</button>
                </div>
                <pre class="code-content"><code>${this._escapeHtml(formula.code)}</code></pre>
            `;

            // 绑定折叠事件
            const toggleBtn = codeArea.querySelector('.btn-toggle-code');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    codeArea.classList.toggle('collapsed');
                    toggleBtn.textContent = codeArea.classList.contains('collapsed') ? '显示' : '隐藏';
                });
            }

            container.appendChild(codeArea);

            // 替换原元素
            const parent = element.parentElement;
            if (parent && parent.tagName === 'PRE') {
                parent.parentNode.insertBefore(container, parent);
                parent.style.display = 'none';
            }

            // 更新状态（复用上面已声明的 formula 变量）
            formula.container = container;
            formula.formulaArea = formulaArea;
        },

        /**
         * HTML转义
         */
        _escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * 处理工具栏操作
         */
        async _handleToolbarAction(action, id) {
            const formula = this._state.formulas.get(id);
            if (!formula) return;

            switch (action) {
                case 'copy':
                    await this._copyLatex(id);
                    break;
                case 'edit':
                    this._editFormula(id);
                    break;
            }
        },

        /**
         * 复制LaTeX代码
         */
        async _copyLatex(id) {
            const formula = this._state.formulas.get(id);
            if (!formula) return;

            try {
                await navigator.clipboard.writeText(formula.code);
                this._showToast('LaTeX代码已复制到剪贴板');
            } catch (err) {
                console.error('[MathRenderer] 复制失败:', err);
                this._showToast('复制失败', 'error');
            }
        },

        /**
         * 编辑公式
         */
        _editFormula(id) {
            const formula = this._state.formulas.get(id);
            if (!formula) return;

            // 创建编辑模态框
            const modal = document.createElement('div');
            modal.className = 'math-edit-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>编辑公式</h3>
                    <textarea class="latex-editor" rows="5" placeholder="输入LaTeX代码..."></textarea>
                    <div class="preview-area">预览区域</div>
                    <div class="modal-actions">
                        <button class="btn-preview">预览</button>
                        <button class="btn-save">保存</button>
                        <button class="btn-cancel">取消</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const textarea = modal.querySelector('.latex-editor');
            textarea.value = formula.code;
            const previewArea = modal.querySelector('.preview-area');

            // 实时预览
            const updatePreview = () => {
                const code = textarea.value.trim();
                if (code && window.katex) {
                    try {
                        previewArea.innerHTML = window.katex.renderToString(code, {
                            throwOnError: false,
                            displayMode: formula.display
                        });
                    } catch (err) {
                        previewArea.innerHTML = `<span class="error">错误: ${this._escapeHtml(err.message)}</span>`;
                    }
                }
            };

            textarea.addEventListener('input', updatePreview);

            // 绑定按钮事件
            modal.querySelector('.btn-preview').addEventListener('click', updatePreview);

            modal.querySelector('.btn-save').addEventListener('click', () => {
                const newCode = textarea.value.trim();
                if (newCode) {
                    formula.code = newCode;
                    formula.rendered = false;
                    this._renderFormula(formula);
                }
                modal.remove();
            });

            modal.querySelector('.btn-cancel').addEventListener('click', () => {
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

            // 初始预览
            setTimeout(updatePreview, 100);
        },

        /**
         * 渲染所有公式
         */
        async _renderAllFormulas() {
            if (this._state.isRendering) {
                return;
            }

            this._state.isRendering = true;

            const formulas = Array.from(this._state.formulas.values())
                .filter(f => !f.rendered);

            console.log(`[MathRenderer] 开始渲染 ${formulas.length} 个公式...`);

            // 分批渲染，避免阻塞
            for (let i = 0; i < formulas.length; i += this._config.batchSize) {
                const batch = formulas.slice(i, i + this._config.batchSize);

                await Promise.all(batch.map(formula => this._renderFormula(formula)));

                // 延迟，让UI有机会更新
                if (i + this._config.batchSize < formulas.length) {
                    await new Promise(resolve => setTimeout(resolve, this._config.renderDelay));
                }
            }

            this._state.isRendering = false;

            console.log('[MathRenderer] 公式渲染完成');
            console.log(`[MathRenderer] 统计: 总计 ${this._state.stats.total}, 成功 ${this._state.stats.rendered}, 失败 ${this._state.stats.errors}`);

            // 发送渲染完成事件
            this._emit('math:renderComplete', {
                total: this._state.stats.total,
                rendered: this._state.stats.rendered,
                errors: this._state.stats.errors
            });
        },

        /**
         * 渲染单个公式
         */
        async _renderFormula(formula) {
            if (!window.katex) {
                console.warn('[MathRenderer] KaTeX未加载');
                return;
            }

            const { id, code, display, element, formulaArea } = formula;

            try {
                // 渲染公式
                const rendered = window.katex.renderToString(code, {
                    throwOnError: this._config.throwOnError,
                    errorColor: this._config.errorColor,
                    displayMode: display,
                    macros: this._macros,
                    trust: false,
                    strict: true
                });

                // 显示渲染结果
                const targetElement = formulaArea || element;
                targetElement.innerHTML = rendered;

                // 添加样式类
                const katexElement = targetElement.querySelector('.katex');
                if (katexElement) {
                    katexElement.classList.add(display ? 'katex-display' : 'katex-inline');

                    // 添加悬停效果
                    if (this._config.zoomOnHover && display) {
                        katexElement.style.transition = 'transform 0.2s';
                        katexElement.addEventListener('mouseenter', () => {
                            katexElement.style.transform = 'scale(1.05)';
                        });
                        katexElement.addEventListener('mouseleave', () => {
                            katexElement.style.transform = 'scale(1)';
                        });
                    }
                }

                formula.rendered = true;
                this._state.stats.rendered++;

                // 发送渲染事件
                this._emit('math:render', {
                    id,
                    display
                });

            } catch (err) {
                console.error(`[MathRenderer] 渲染公式 ${id} 失败:`, err);
                this._state.stats.errors++;

                // 显示错误
                const targetElement = formulaArea || element;
                targetElement.innerHTML = `
                    <span class="math-error" style="color: ${this._config.errorColor}">
                        ${this._escapeHtml(code)}
                    </span>
                `;

                // 添加错误提示
                const errorTooltip = document.createElement('span');
                errorTooltip.className = 'math-error-tooltip';
                errorTooltip.textContent = err.message;
                targetElement.appendChild(errorTooltip);
            }
        },

        /**
         * 监听DOM变化
         */
        _observeMutations() {
            this._state.mutationObserver = new MutationObserver((mutations) => {
                // 临时断开观察器，防止 DOM 修改触发递归处理
                this._state.mutationObserver.disconnect();

                let hasNewFormulas = false;

                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查是否是公式代码块
                            if (node.matches && node.matches('pre code.language-math, pre code.language-latex')) {
                                this._registerFormula(node, this._state.formulas.size, true);
                                hasNewFormulas = true;
                            }

                            // 检查子元素
                            if (node.querySelectorAll) {
                                const formulas = node.querySelectorAll('pre code.language-math, pre code.language-latex');
                                formulas.forEach((el, index) => {
                                    this._registerFormula(el, this._state.formulas.size + index, true);
                                    hasNewFormulas = true;
                                });
                            }

                            // 检查文本节点
                            if (node.textContent && this._containsFormula(node.textContent)) {
                                const walker = document.createTreeWalker(
                                    node,
                                    NodeFilter.SHOW_TEXT,
                                    null,
                                    false
                                );
                                const textNodes = [];
                                let textNode;
                                while (textNode = walker.nextNode()) {
                                    if (this._containsFormula(textNode.textContent)) {
                                        textNodes.push(textNode);
                                    }
                                }
                                textNodes.forEach((tn, index) => {
                                    this._processTextNode(tn, this._state.formulas.size + index);
                                });
                                hasNewFormulas = textNodes.length > 0;
                            }
                        }
                    });
                });

                if (hasNewFormulas && this._state.katexLoaded) {
                    this._renderAllFormulas().catch(err => console.error('[MathRenderer] MutationObserver渲染失败:', err));
                }

                // 重新连接观察器
                this._state.mutationObserver.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });

            this._state.mutationObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        },

        /**
         * 显示提示
         */
        _showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `math-toast ${type}`;
            toast.textContent = message;

            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.add('show');
            });

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        /**
         * 发送自定义事件
         */
        _emit(eventName, detail) {
            const event = new CustomEvent(eventName, {
                detail,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        },

        /**
         * 公共API：手动渲染指定公式
         */
        async render(id) {
            const formula = this._state.formulas.get(id);
            if (!formula) {
                console.warn(`[MathRenderer] 公式 ${id} 不存在`);
                return;
            }

            await this._loadKaTeX();
            await this._renderFormula(formula);
        },

        /**
         * 公共API：重新渲染所有公式
         */
        async renderAll() {
            this._state.formulas.forEach(f => f.rendered = false);
            await this._loadKaTeX();
            await this._renderAllFormulas();
        },

        /**
         * 公共API：渲染指定元素内的公式
         */
        async renderInElement(element) {
            if (!element) return;

            await this._loadKaTeX();

            if (window.renderMathInElement) {
                window.renderMathInElement(element, {
                    delimiters: this._config.delimiters,
                    throwOnError: this._config.throwOnError,
                    errorColor: this._config.errorColor
                });
            }
        },

        /**
         * 公共API：添加自定义宏
         */
        addMacro(name, expansion) {
            this._macros[name] = expansion;
        },

        /**
         * 公共API：获取公式列表
         */
        getFormulas() {
            return Array.from(this._state.formulas.values()).map(f => ({
                id: f.id,
                code: f.code,
                display: f.display,
                rendered: f.rendered
            }));
        },

        /**
         * 公共API：获取统计信息
         */
        getStats() {
            return { ...this._state.stats };
        },

        /**
         * 公共API：导出所有公式
         */
        exportFormulas() {
            const formulas = [];
            this._state.formulas.forEach((formula, id) => {
                formulas.push({
                    id,
                    code: formula.code,
                    display: formula.display
                });
            });
            return formulas;
        },

        /**
         * 公共API：销毁模块
         */
        destroy() {
            // 断开MutationObserver
            if (this._state.mutationObserver) {
                this._state.mutationObserver.disconnect();
                this._state.mutationObserver = null;
            }

            // 移除公式元素上的事件监听器并清理容器
            this._state.formulas.forEach(formula => {
                if (formula.container) {
                    formula.container.remove();
                }
                // 移除悬停事件监听器
                const targetElement = formula.formulaArea || formula.element;
                if (targetElement) {
                    const katexElement = targetElement.querySelector('.katex');
                    if (katexElement) {
                        katexElement.replaceWith(katexElement.cloneNode(true));
                    }
                }
            });
            this._state.formulas.clear();
            this._state.initialized = false;
            this._state.katexLoaded = false;
            this._state.autoRenderLoaded = false;
        }
    };

    // 暴露到全局
    window.MathRenderer = MathRenderer;

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MathRenderer.init());
    } else {
        MathRenderer.init();
    }

    console.log('[MathRenderer] 模块已加载');
})();
