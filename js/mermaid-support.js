/**
 * Mermaid图表支持模块 v1.0.0
 * 功能：支持流程图、时序图、甘特图、类图、状态图、饼图等多种图表渲染
 * 特性：懒加载Mermaid库、实时预览、导出功能、主题适配
 */

(function() {
    'use strict';

    // 防止重复声明
    if (typeof window.MermaidSupport !== 'undefined') {
        console.warn('[MermaidSupport] 模块已存在，跳过重复声明');
        return;
    }

    const MermaidSupport = {
        _config: {
            mermaidUrl: 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js',
            theme: 'default',
            darkTheme: 'dark',
            lightTheme: 'default',
            autoRender: true,
            zoom: true,
            pan: true,
            exportFormats: ['svg', 'png', 'pdf'],
            maxDiagramSize: 50000, // 最大字符数
            lazyLoad: true,
            placeholder: '📊 图表加载中...',
            errorMessage: '❌ 图表渲染失败，请检查语法'
        },

        _state: {
            initialized: false,
            mermaidLoaded: false,
            diagrams: new Map(), // diagramId -> { element, code, type, rendered }
            currentTheme: 'default',
            renderQueue: [],
            isRendering: false,
            renderVersion: 0 // 渲染版本号，用于解决竞态条件
        },

        _themes: {
            default: {
                theme: 'default',
                themeVariables: {
                    primaryColor: '#e1f5fe',
                    primaryTextColor: '#01579b',
                    primaryBorderColor: '#0288d1',
                    lineColor: '#0288d1',
                    secondaryColor: '#fff3e0',
                    tertiaryColor: '#e8f5e9'
                }
            },
            dark: {
                theme: 'dark',
                themeVariables: {
                    primaryColor: '#1e3a5f',
                    primaryTextColor: '#e3f2fd',
                    primaryBorderColor: '#4fc3f7',
                    lineColor: '#4fc3f7',
                    secondaryColor: '#3e2723',
                    tertiaryColor: '#1b5e20'
                }
            },
            forest: {
                theme: 'forest',
                themeVariables: {
                    primaryColor: '#e8f5e9',
                    primaryTextColor: '#1b5e20',
                    primaryBorderColor: '#4caf50'
                }
            },
            neutral: {
                theme: 'neutral',
                themeVariables: {
                    primaryColor: '#f5f5f5',
                    primaryTextColor: '#212121',
                    primaryBorderColor: '#9e9e9e'
                }
            }
        },

        /**
         * 初始化模块
         */
        async init(options = {}) {
            if (this._state.initialized) {
                console.log('[MermaidSupport] 已经初始化');
                return this;
            }

            console.log('[MermaidSupport] 开始初始化...');

            // 合并配置
            Object.assign(this._config, options);

            // 检测当前主题
            this._detectTheme();

            // 扫描文档中的图表
            this._scanDiagrams();

            // 如果需要自动渲染，加载Mermaid
            if (this._config.autoRender && this._state.diagrams.size > 0) {
                await this._loadMermaid();
            }

            // 监听主题变化
            this._watchThemeChange();

            // 监听动态内容
            this._observeMutations();

            this._state.initialized = true;
            console.log(`[MermaidSupport] 初始化完成，发现 ${this._state.diagrams.size} 个图表`);

            // 发送初始化事件
            this._emit('mermaid:init', {
                diagramCount: this._state.diagrams.size
            });

            return this;
        },

        /**
         * 检测当前主题
         */
        _detectTheme() {
            const isDark = document.documentElement.classList.contains('dark-theme') ||
                          document.body.classList.contains('dark-theme') ||
                          window.matchMedia('(prefers-color-scheme: dark)').matches;

            this._state.currentTheme = isDark ? this._config.darkTheme : this._config.lightTheme;
            console.log(`[MermaidSupport] 检测到主题: ${this._state.currentTheme}`);
        },

        /**
         * 扫描文档中的Mermaid图表
         */
        _scanDiagrams() {
            // 查找所有mermaid代码块
            const selectors = [
                'pre code.language-mermaid',
                'pre code.lang-mermaid',
                '.mermaid',
                '[data-lang="mermaid"]'
            ];

            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach((el, index) => {
                    this._registerDiagram(el, index);
                });
            });
        },

        /**
         * 注册图表
         */
        _registerDiagram(element, index) {
            // 检查是否已注册
            if (element.dataset.mermaidId) {
                return;
            }

            const id = `mermaid-${Date.now()}-${index}`;
            element.dataset.mermaidId = id;

            // 获取图表代码
            let code = '';
            if (element.tagName === 'CODE') {
                code = element.textContent.trim();
            } else {
                code = element.textContent.trim();
            }

            // 检查大小限制
            if (code.length > this._config.maxDiagramSize) {
                console.warn(`[MermaidSupport] 图表 ${id} 超出大小限制`);
                this._showError(element, '图表过大，请简化内容');
                return;
            }

            // 检测图表类型
            const type = this._detectDiagramType(code);

            // 保存到状态
            this._state.diagrams.set(id, {
                id,
                element,
                code,
                type,
                rendered: false,
                container: null
            });

            // 创建容器
            this._createDiagramContainer(element, id);

            console.log(`[MermaidSupport] 注册图表: ${id} (类型: ${type})`);
        },

        /**
         * 检测图表类型
         */
        _detectDiagramType(code) {
            const firstLine = code.split('\n')[0].trim().toLowerCase();

            const typeMap = {
                'graph': 'flowchart',
                'flowchart': 'flowchart',
                'sequence': 'sequence',
                'sequencediagram': 'sequence',
                'class': 'class',
                'classdiagram': 'class',
                'state': 'state',
                'statediagram': 'state',
                'er': 'er',
                'journey': 'journey',
                'gantt': 'gantt',
                'pie': 'pie',
                'requirement': 'requirement',
                'gitgraph': 'gitgraph',
                'mindmap': 'mindmap',
                'timeline': 'timeline',
                'c4context': 'c4',
                'c4container': 'c4',
                'c4component': 'c4',
                'c4dynamic': 'c4',
                'c4deployment': 'c4'
            };

            for (const [prefix, type] of Object.entries(typeMap)) {
                if (firstLine.startsWith(prefix)) {
                    return type;
                }
            }

            return 'unknown';
        },

        /**
         * 创建图表容器
         */
        _createDiagramContainer(element, id) {
            const container = document.createElement('div');
            container.className = 'mermaid-diagram-container';
            container.dataset.diagramId = id;

            // 创建工具栏
            const toolbar = document.createElement('div');
            toolbar.className = 'mermaid-toolbar';
            toolbar.innerHTML = `
                <span class="diagram-type">${this._state.diagrams.get(id).type}</span>
                <div class="diagram-actions">
                    <button class="btn-icon" data-action="zoom-in" title="放大">🔍+</button>
                    <button class="btn-icon" data-action="zoom-out" title="缩小">🔍-</button>
                    <button class="btn-icon" data-action="reset" title="重置">⟲</button>
                    <button class="btn-icon" data-action="copy" title="复制代码">📋</button>
                    <button class="btn-icon" data-action="download" title="下载">💾</button>
                    <button class="btn-icon" data-action="fullscreen" title="全屏">⛶</button>
                </div>
            `;

            // 创建图表区域
            const diagramArea = document.createElement('div');
            diagramArea.className = 'mermaid-diagram-area';
            diagramArea.innerHTML = `<div class="mermaid-placeholder">${this._config.placeholder}</div>`;

            // 创建代码预览区（可折叠）
            const codeArea = document.createElement('div');
            codeArea.className = 'mermaid-code-area collapsed';
            codeArea.innerHTML = `
                <div class="code-header">
                    <span>源代码</span>
                    <button class="btn-toggle-code">显示</button>
                </div>
                <pre class="code-content"><code class="language-mermaid"></code></pre>
            `;

            container.appendChild(toolbar);
            container.appendChild(diagramArea);
            container.appendChild(codeArea);

            // 替换原元素
            const parent = element.parentElement;
            if (parent.tagName === 'PRE') {
                parent.parentNode.insertBefore(container, parent);
                parent.style.display = 'none';
            } else {
                element.parentNode.insertBefore(container, element);
                element.style.display = 'none';
            }

            // 绑定事件
            this._bindToolbarEvents(toolbar, id);
            this._bindCodeToggleEvents(codeArea, id);

            // 更新状态
            const diagram = this._state.diagrams.get(id);
            diagram.container = container;
            diagram.diagramArea = diagramArea;
            diagram.codeArea = codeArea;

            // 保存代码
            const codeContent = codeArea.querySelector('.code-content code');
            if (codeContent) {
                codeContent.textContent = diagram.code;
            }
        },

        /**
         * 绑定工具栏事件
         */
        _bindToolbarEvents(toolbar, id) {
            const buttons = toolbar.querySelectorAll('[data-action]');
            buttons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = btn.dataset.action;
                    this._handleToolbarAction(action, id);
                });
            });
        },

        /**
         * 绑定代码折叠事件
         */
        _bindCodeToggleEvents(codeArea, id) {
            const toggleBtn = codeArea.querySelector('.btn-toggle-code');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    codeArea.classList.toggle('collapsed');
                    toggleBtn.textContent = codeArea.classList.contains('collapsed') ? '显示' : '隐藏';
                });
            }
        },

        /**
         * 处理工具栏操作
         */
        _handleToolbarAction(action, id) {
            const diagram = this._state.diagrams.get(id);
            if (!diagram) return;

            switch (action) {
                case 'zoom-in':
                    this._zoomDiagram(id, 1.2);
                    break;
                case 'zoom-out':
                    this._zoomDiagram(id, 0.8);
                    break;
                case 'reset':
                    this._resetZoom(id);
                    break;
                case 'copy':
                    this._copyCode(id);
                    break;
                case 'download':
                    this._showDownloadOptions(id);
                    break;
                case 'fullscreen':
                    this._toggleFullscreen(id);
                    break;
            }
        },

        /**
         * 缩放图表
         */
        _zoomDiagram(id, factor) {
            const diagram = this._state.diagrams.get(id);
            if (!diagram || !diagram.svg) return;

            const currentScale = diagram.scale || 1;
            const newScale = Math.max(0.5, Math.min(3, currentScale * factor));
            diagram.scale = newScale;

            diagram.svg.style.transform = `scale(${newScale})`;
            diagram.svg.style.transformOrigin = 'center center';
        },

        /**
         * 重置缩放
         */
        _resetZoom(id) {
            const diagram = this._state.diagrams.get(id);
            if (!diagram || !diagram.svg) return;

            diagram.scale = 1;
            diagram.svg.style.transform = 'scale(1)';
        },

        /**
         * 复制代码
         */
        async _copyCode(id) {
            const diagram = this._state.diagrams.get(id);
            if (!diagram) return;

            try {
                await navigator.clipboard.writeText(diagram.code);
                this._showToast('代码已复制到剪贴板');
            } catch (err) {
                console.error('[MermaidSupport] 复制失败:', err);
                this._showToast('复制失败', 'error');
            }
        },

        /**
         * 显示下载选项
         */
        _showDownloadOptions(id) {
            const diagram = this._state.diagrams.get(id);
            if (!diagram) return;

            const formats = this._config.exportFormats;
            const options = formats.map(fmt =>
                `<button class="btn-download-option" data-format="${fmt}">${fmt.toUpperCase()}</button>`
            ).join('');

            const modal = document.createElement('div');
            modal.className = 'mermaid-download-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>下载图表</h3>
                    <div class="download-options">${options}</div>
                    <button class="btn-close">关闭</button>
                </div>
            `;

            document.body.appendChild(modal);

            // 绑定事件
            modal.querySelectorAll('.btn-download-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const format = btn.dataset.format;
                    this._downloadDiagram(id, format);
                    modal.remove();
                });
            });

            modal.querySelector('.btn-close').addEventListener('click', () => {
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        /**
         * 下载图表
         */
        async _downloadDiagram(id, format) {
            const diagram = this._state.diagrams.get(id);
            if (!diagram || !diagram.svg) {
                this._showToast('图表尚未渲染完成', 'error');
                return;
            }

            try {
                switch (format) {
                    case 'svg':
                        this._downloadSVG(diagram);
                        break;
                    case 'png':
                        await this._downloadPNG(diagram);
                        break;
                    case 'pdf':
                        await this._downloadPDF(diagram);
                        break;
                }
            } catch (err) {
                console.error('[MermaidSupport] 下载失败:', err);
                this._showToast('下载失败', 'error');
            }
        },

        /**
         * 下载SVG
         */
        _downloadSVG(diagram) {
            const svgData = new XMLSerializer().serializeToString(diagram.svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `diagram-${diagram.id}.svg`;
            link.setAttribute('aria-label', '下载 SVG 图表');
            link.click();

            URL.revokeObjectURL(url);
            this._showToast('SVG下载成功');
        },

        /**
         * 下载PNG
         */
        async _downloadPNG(diagram) {
            const svgData = new XMLSerializer().serializeToString(diagram.svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });

            canvas.width = img.width * 2; // 高清
            canvas.height = img.height * 2;
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);

            URL.revokeObjectURL(url);

            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `diagram-${diagram.id}.png`;
            link.setAttribute('aria-label', '下载 PNG 图表');
            link.click();

            this._showToast('PNG下载成功');
        },

        /**
         * 下载PDF
         */
        async _downloadPDF(diagram) {
            // 简化为在新窗口打印
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                this._showToast('无法打开新窗口，请允许弹出窗口', 'error');
                return;
            }

            const svgData = new XMLSerializer().serializeToString(diagram.svg);

            // 清理 SVG 数据，防止 XSS
            const sanitizedSvg = this._sanitizeSVG(svgData);

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>图表 - ${this._escapeHtml(diagram.id)}</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                        svg { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>${sanitizedSvg}</body>
                </html>
            `);

            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
            }, 500);

            this._showToast('请使用浏览器的"另存为PDF"功能');
        },

        /**
         * 全屏显示
         */
        _toggleFullscreen(id) {
            const diagram = this._state.diagrams.get(id);
            if (!diagram || !diagram.container) return;

            if (!document.fullscreenElement) {
                diagram.container.requestFullscreen().catch(err => {
                    console.error('[MermaidSupport] 全屏失败:', err);
                });
            } else {
                document.exitFullscreen();
            }
        },

        /**
         * 加载Mermaid库
         */
        async _loadMermaid() {
            if (this._state.mermaidLoaded) {
                return window.mermaid;
            }

            console.log('[MermaidSupport] 加载Mermaid库...');

            return new Promise((resolve, reject) => {
                // 检查是否已加载
                if (window.mermaid) {
                    this._state.mermaidLoaded = true;
                    this._initMermaid();
                    resolve(window.mermaid);
                    return;
                }

                // 创建script标签
                const script = document.createElement('script');
                script.src = this._config.mermaidUrl;
                script.async = true;

                script.onload = () => {
                    console.log('[MermaidSupport] Mermaid库加载成功');
                    this._state.mermaidLoaded = true;
                    this._initMermaid();
                    resolve(window.mermaid);
                };

                script.onerror = () => {
                    console.error('[MermaidSupport] Mermaid库加载失败');
                    reject(new Error('Failed to load Mermaid'));
                };

                document.head.appendChild(script);
            });
        },

        /**
         * 初始化Mermaid配置
         */
        _initMermaid() {
            if (!window.mermaid) return;

            const theme = this._themes[this._state.currentTheme] || this._themes.default;

            window.mermaid.initialize({
                startOnLoad: false,
                theme: theme.theme,
                themeVariables: theme.themeVariables,
                securityLevel: 'strict',
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis'
                },
                sequence: {
                    useMaxWidth: true,
                    wrap: true,
                    width: 150
                },
                gantt: {
                    useMaxWidth: true
                },
                fontFamily: 'system-ui, -apple-system, sans-serif'
            });

            // 异步分批渲染所有图表，避免阻塞主线程
            this._renderAllDiagrams();
        },

        /**
         * 渲染所有图表（异步分批，避免长任务阻塞）
         */
        async _renderAllDiagrams() {
            if (this._state.isRendering) {
                console.log('[MermaidSupport] 渲染队列正在处理中...');
                return;
            }

            this._state.isRendering = true;
            // 渲染版本号，用于废弃过期的渲染操作（解决竞态条件）
            const renderVersion = ++this._state.renderVersion;

            const diagrams = Array.from(this._state.diagrams.values())
                .filter(d => !d.rendered);

            console.log(`[MermaidSupport] 开始渲染 ${diagrams.length} 个图表...`);

            for (const diagram of diagrams) {
                // 检查渲染版本是否过期（主题切换等导致的新渲染请求）
                if (this._state.renderVersion !== renderVersion) {
                    console.log('[MermaidSupport] 渲染版本过期，中止当前渲染批次');
                    break;
                }
                try {
                    await this._renderDiagram(diagram);
                    // 每渲染一个图表后让出主线程，避免长任务阻塞
                    await new Promise(resolve => setTimeout(resolve, 0));
                } catch (err) {
                    console.error(`[MermaidSupport] 渲染图表 ${diagram.id} 失败:`, err);
                    this._showError(diagram.element, this._config.errorMessage);
                }
            }

            this._state.isRendering = false;

            // 处理队列中的渲染请求
            while (this._state.renderQueue.length > 0) {
                if (this._state.renderVersion !== renderVersion) break;
                const next = this._state.renderQueue.shift();
                await this._renderDiagram(next);
            }

            console.log('[MermaidSupport] 图表渲染完成');
        },

        /**
         * 渲染单个图表
         */
        async _renderDiagram(diagram) {
            if (!window.mermaid) {
                throw new Error('Mermaid not loaded');
            }

            const { id, code, diagramArea } = diagram;

            try {
                // 使用Mermaid API渲染
                const { svg } = await window.mermaid.render(id, code);

                // 显示渲染结果
                diagramArea.innerHTML = this._sanitizeSVG(svg);
                const svgElement = diagramArea.querySelector('svg');

                if (svgElement) {
                    diagram.svg = svgElement;
                    diagram.rendered = true;

                    // 添加交互功能
                    this._addInteractivity(svgElement, diagram);

                    // 发送渲染完成事件
                    this._emit('mermaid:render', {
                        id,
                        type: diagram.type
                    });
                }
            } catch (err) {
                console.error(`[MermaidSupport] 渲染失败:`, err);
                this._showError(diagramArea, `渲染失败: ${err.message}`);
                throw err;
            }
        },

        /**
         * 添加交互功能
         */
        _addInteractivity(svgElement, diagram) {
            // 添加点击事件
            svgElement.style.cursor = 'pointer';
            svgElement.addEventListener('click', (e) => {
                if (e.target.tagName === 'text' || e.target.tagName === 'rect') {
                    // 可以添加节点点击功能
                    this._emit('mermaid:nodeclick', {
                        diagramId: diagram.id,
                        target: e.target
                    });
                }
            });

            // 添加悬停效果
            const nodes = svgElement.querySelectorAll('.node');
            nodes.forEach(node => {
                node.style.transition = 'opacity 0.2s';
                node.addEventListener('mouseenter', () => {
                    nodes.forEach(n => {
                        if (n !== node) n.style.opacity = '0.5';
                    });
                });
                node.addEventListener('mouseleave', () => {
                    nodes.forEach(n => {
                        n.style.opacity = '1';
                    });
                });
            });
        },

        /**
         * 清理 SVG，移除危险元素和属性
         * @private
         */
        _sanitizeSVG(svgString) {
            return svgString
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<script[^>]*\/>/gi, '')
                .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
                .replace(/\son\w+\s*=\s*\S+/gi, '')
                .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href=""')
                .replace(/href\s*=\s*javascript:\S+/gi, 'href=""')
                .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
                .replace(/<(animate|set)[\s\S]*?\/>/gi, '');
        },

        /**
         * HTML转义
         */
        _escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            // textContent→innerHTML 不转义引号，需手动补充
            return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        /**
         * 显示错误信息
         */
        _showError(element, message) {
            if (!element) return;

            const errorDiv = document.createElement('div');
            errorDiv.className = 'mermaid-error';
            errorDiv.innerHTML = `
                <div class="error-icon">&#9888;&#65039;</div>
                <div class="error-message">${this._escapeHtml(message)}</div>
            `;

            if (element.classList.contains('mermaid-diagram-area')) {
                element.innerHTML = '';
                element.appendChild(errorDiv);
            } else {
                element.style.display = 'none';
                element.parentNode.insertBefore(errorDiv, element.nextSibling);
            }
        },

        /**
         * 监听主题变化
         */
        _watchThemeChange() {
            // 监听class变化
            this._state.themeObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' &&
                        (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
                        this._detectTheme();
                        this._updateTheme();
                    }
                });
            });

            this._state.themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class', 'data-theme']
            });

            // 监听系统主题变化
            this._state.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this._state.mediaQueryListener = (e) => {
                this._detectTheme();
                this._updateTheme();
            };
            this._state.mediaQuery.addEventListener('change', this._state.mediaQueryListener);
        },

        /**
         * 更新主题
         */
        _updateTheme() {
            if (!window.mermaid) return;

            const theme = this._themes[this._state.currentTheme];
            if (!theme) return;

            // 重新初始化Mermaid
            window.mermaid.initialize({
                theme: theme.theme,
                themeVariables: theme.themeVariables
            });

            // 重新渲染所有图表
            this._state.diagrams.forEach(diagram => {
                diagram.rendered = false;
            });

            // 递增渲染版本号，使正在进行的渲染批次失效
            this._state.renderVersion++;
            this._state.isRendering = false;
            this._renderAllDiagrams();
        },

        /**
         * 监听DOM变化
         */
        _observeMutations() {
            this._state.mutationObserver = new MutationObserver((mutations) => {
                let hasNewDiagrams = false;

                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 检查是否是mermaid代码块
                            if (node.matches && node.matches('pre code.language-mermaid, .mermaid')) {
                                this._registerDiagram(node, this._state.diagrams.size);
                                hasNewDiagrams = true;
                            }

                            // 检查子元素
                            if (node.querySelectorAll) {
                                const diagrams = node.querySelectorAll('pre code.language-mermaid, .mermaid');
                                diagrams.forEach((el, index) => {
                                    this._registerDiagram(el, this._state.diagrams.size + index);
                                    hasNewDiagrams = true;
                                });
                            }
                        }
                    });
                });

                if (hasNewDiagrams && this._state.mermaidLoaded) {
                    this._renderAllDiagrams();
                }
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
            // 优先使用全局 ToastModule
            if (typeof ToastModule !== 'undefined' && ToastModule.show) {
                ToastModule.show(message, type);
                return;
            }
            // 回退：使用简单的内联样式 toast
            const toast = document.createElement('div');
            toast.className = `mermaid-toast ${type}`;
            toast.textContent = message;
            toast.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:8px;color:#fff;font-size:14px;z-index:10000;opacity:0;transition:opacity 0.3s;pointer-events:none;';
            if (type === 'success') toast.style.background = 'rgba(34,197,94,0.9)';
            else if (type === 'error') toast.style.background = 'rgba(239,68,68,0.9)';
            else toast.style.background = 'rgba(59,130,246,0.9)';

            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.style.opacity = '1';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
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
         * 公共API：手动渲染指定图表
         */
        async render(id) {
            const diagram = this._state.diagrams.get(id);
            if (!diagram) {
                console.warn(`[MermaidSupport] 图表 ${id} 不存在`);
                return;
            }

            await this._loadMermaid();
            await this._renderDiagram(diagram);
        },

        /**
         * 公共API：重新渲染所有图表
         */
        async renderAll() {
            await this._loadMermaid();
            this._state.diagrams.forEach(d => d.rendered = false);
            await this._renderAllDiagrams();
        },

        /**
         * 公共API：设置主题
         */
        setTheme(themeName) {
            if (this._themes[themeName]) {
                this._state.currentTheme = themeName;
                this._updateTheme();
            }
        },

        /**
         * 公共API：获取图表列表
         */
        getDiagrams() {
            return Array.from(this._state.diagrams.values()).map(d => ({
                id: d.id,
                type: d.type,
                rendered: d.rendered
            }));
        },

        /**
         * 公共API：导出图表数据
         */
        exportData() {
            const data = {};
            this._state.diagrams.forEach((diagram, id) => {
                data[id] = {
                    type: diagram.type,
                    code: diagram.code,
                    rendered: diagram.rendered
                };
            });
            return data;
        },

        /**
         * 公共API：销毁模块
         */
        destroy() {
            // 断开主题观察器
            if (this._state.themeObserver) {
                this._state.themeObserver.disconnect();
                this._state.themeObserver = null;
            }

            // 断开DOM变化观察器
            if (this._state.mutationObserver) {
                this._state.mutationObserver.disconnect();
                this._state.mutationObserver = null;
            }

            // 移除matchMedia监听器
            if (this._state.mediaQuery && this._state.mediaQueryListener) {
                this._state.mediaQuery.removeEventListener('change', this._state.mediaQueryListener);
                this._state.mediaQuery = null;
                this._state.mediaQueryListener = null;
            }

            // 清理渲染队列
            this._state.renderQueue = [];

            this._state.diagrams.forEach(diagram => {
                if (diagram.container) {
                    diagram.container.remove();
                }
            });
            this._state.diagrams.clear();
            this._state.initialized = false;
            this._state.mermaidLoaded = false;
        }
    };

    // 暴露到全局
    window.MermaidSupport = MermaidSupport;

    // 自动初始化
    if (window.MermaidModule && window.MermaidModule._state && window.MermaidModule._state.initialized) {
        console.log('[MermaidSupport] MermaidModule 已存在且已初始化，跳过自动初始化');
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MermaidSupport.init());
    } else {
        MermaidSupport.init();
    }

    console.log('[MermaidSupport] 模块已加载');
})();
