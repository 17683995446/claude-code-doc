/**
 * Claude Code Architecture Documentation - 交互式架构探索器
 * 可缩放、可拖拽的架构图，支持组件点击查看详情
 *
 * @version 1.0.0
 * @author Claude Code Architecture Team
 */

// ==================== 架构数据 ====================
/**
 * Claude Code 架构图数据
 * 包含 8 个核心组件及其连接关系
 */
const architectureData = {
    nodes: [
        {
            id: 'presentation',
            name: '表示层',
            nameEn: 'Presentation',
            x: 400, y: 50, w: 180, h: 80,
            color: '#e87e2f',
            description: 'React + Ink 终端 UI，负责渲染 CLI 界面',
            details: ['React 组件树', 'Ink 渲染引擎', '终端适配', '主题系统'],
            connections: ['services']
        },
        {
            id: 'services',
            name: '业务层',
            nameEn: 'Services',
            x: 400, y: 200, w: 180, h: 80,
            color: '#6db3f2',
            description: '核心业务逻辑层，API 客户端、MCP 连接、插件加载器',
            details: ['API 客户端（流式+重试）', 'MCP 连接管理', '插件加载器', '上下文压缩', '权限引擎', '遥测分析'],
            connections: ['presentation', 'tools', 'master-loop', 'context', 'permissions', 'plugins']
        },
        {
            id: 'tools',
            name: '工具层',
            nameEn: 'Tools',
            x: 150, y: 350, w: 180, h: 80,
            color: '#7bc47f',
            description: '40+ 工具实现，文件读写、Bash 执行、代码搜索等',
            details: ['Bash 执行器', 'Read/Write/Edit', 'Grep/Glob 搜索', 'Task 子代理', 'TodoWrite 追踪', 'WebFetch/WebSearch'],
            connections: ['services', 'master-loop']
        },
        {
            id: 'master-loop',
            name: '核心循环',
            nameEn: 'Master Loop',
            x: 400, y: 350, w: 180, h: 80,
            color: '#e87e2f',
            description: 'Claude Code 的心脏，while(tool_call) 不断循环直到任务完成',
            details: ['消息构建', 'API 流式调用', '工具调用解析', '结果追加', '完成检测'],
            connections: ['services', 'tools', 'context', 'subagent']
        },
        {
            id: 'context',
            name: '上下文管理',
            nameEn: 'Context Mgmt',
            x: 650, y: 350, w: 180, h: 80,
            color: '#b48ead',
            description: '200K Token 预算的分配与压缩管理',
            details: ['Token 计数监控', '摘要压缩', '历史裁剪', '结果精简', '紧凑重写', 'CLAUDE.md 配置'],
            connections: ['services', 'master-loop']
        },
        {
            id: 'subagent',
            name: '子代理',
            nameEn: 'Sub-Agents',
            x: 150, y: 500, w: 180, h: 80,
            color: '#56b6c2',
            description: '通过 Task 工具实现并行、隔离的任务委派',
            details: ['独立上下文', '深度限制 depth=1', '并行执行', '摘要返回', '隔离不污染'],
            connections: ['master-loop', 'tools']
        },
        {
            id: 'permissions',
            name: '权限系统',
            nameEn: 'Permissions',
            x: 400, y: 500, w: 180, h: 80,
            color: '#e06c75',
            description: '7 种权限模式 + ML 分类器 + Hooks 三重防护',
            details: ['7 种权限模式', 'ML 分类器', 'Hooks 钩子', '自动/手动审批', '组织管理'],
            connections: ['services', 'tools']
        },
        {
            id: 'plugins',
            name: '插件系统',
            nameEn: 'Plugins',
            x: 650, y: 500, w: 180, h: 80,
            color: '#e5c07b',
            description: '5 种组件类型构建可扩展的能力体系',
            details: ['Commands 命令', 'Agents 代理', 'Skills 技能', 'Hooks 钩子', 'MCP 协议'],
            connections: ['services', 'tools']
        }
    ],
    connections: [
        { from: 'presentation', to: 'services', label: '调用' },
        { from: 'services', to: 'tools', label: '分发' },
        { from: 'services', to: 'master-loop', label: '驱动' },
        { from: 'services', to: 'context', label: '管理' },
        { from: 'services', to: 'permissions', label: '检查' },
        { from: 'services', to: 'plugins', label: '加载' },
        { from: 'master-loop', to: 'tools', label: '调用' },
        { from: 'master-loop', to: 'context', label: '更新' },
        { from: 'master-loop', to: 'subagent', label: '委派' },
        { from: 'tools', to: 'permissions', label: '鉴权' },
        { from: 'tools', to: 'plugins', label: '扩展' },
        { from: 'subagent', to: 'tools', label: '使用' },
        { from: 'context', to: 'master-loop', label: '供给' }
    ]
};

// ==================== ExplorerModule ====================
/**
 * 交互式架构探索器模块
 * 提供全屏模态框、可缩放拖拽画布、组件详情面板
 */
const ExplorerModule = {
    // 模块状态
    _isOpen: false,
    _scale: 1,
    _minScale: 0.3,
    _maxScale: 3,
    _translateX: 0,
    _translateY: 0,
    _isDragging: false,
    _dragStartX: 0,
    _dragStartY: 0,
    _selectedNode: null,
    _searchQuery: '',

    // DOM 引用
    _overlay: null,
    _modal: null,
    _canvas: null,
    _svgLayer: null,
    _detailPanel: null,
    _zoomIndicator: null,
    _searchInput: null,

    // 触摸状态
    _touchStartDist: 0,
    _touchStartScale: 1,

    // 事件追踪（用于销毁时清理）
    _boundEvents: [],

    // 暴露架构数据供测试使用
    architectureData: architectureData,

    /**
     * 初始化架构探索器
     */
    init() {
        // 防止重复初始化
        if (this._overlay || document.getElementById('explorer-overlay')) {
            return this;
        }
        this.createUI();
        if (!this._overlay) {
            console.error('[Explorer] createUI后_overlay仍为null，初始化失败');
            return this;
        }
        this.bindEvents();
        if (window.AppCore) {
            window.AppCore.logger.info('Explorer', '架构探索器模块初始化完成');
        }
        return this;
    },

    /**
     * 创建探索器 UI
     */
    createUI() {
        // 创建全屏遮罩层
        this._overlay = document.createElement('div');
        this._overlay.className = 'explorer-overlay no-print';
        this._overlay.id = 'explorer-overlay';
        this._overlay.innerHTML = `
            <div class="explorer-modal" id="explorer-modal">
                <!-- 工具栏 -->
                <div class="explorer-toolbar">
                    <div class="explorer-toolbar-left">
                        <span class="explorer-toolbar-title" data-i18n="explorer.title">交互式架构探索器</span>
                    </div>
                    <div class="explorer-toolbar-center">
                        <div class="explorer-search-wrapper">
                            <span class="explorer-search-icon">🔍</span>
                            <input type="text"
                                   class="explorer-search-input"
                                   id="explorer-search"
                                   data-i18n-placeholder="explorer.search"
                                   placeholder="搜索组件..."
                                   autocomplete="off" />
                        </div>
                    </div>
                    <div class="explorer-toolbar-right">
                        <button class="explorer-toolbar-btn" id="explorer-zoom-out" title="缩小">−</button>
                        <span class="explorer-zoom-indicator" id="explorer-zoom-indicator">100%</span>
                        <button class="explorer-toolbar-btn" id="explorer-zoom-in" title="放大">+</button>
                        <button class="explorer-toolbar-btn" id="explorer-reset" data-i18n="explorer.reset">重置视图</button>
                        <button class="explorer-toolbar-btn explorer-close-btn" id="explorer-close" data-i18n="explorer.close">关闭</button>
                    </div>
                </div>

                <!-- 画布区域 -->
                <div class="explorer-canvas-wrapper">
                    <div class="explorer-canvas" id="explorer-canvas">
                        <svg class="explorer-connections-svg" id="explorer-svg"></svg>
                        <div class="explorer-nodes-layer" id="explorer-nodes"></div>
                    </div>
                </div>

                <!-- 小地图 -->
                <div class="explorer-minimap" id="explorer-minimap">
                    <svg class="explorer-minimap-svg" id="explorer-minimap-svg"></svg>
                    <div class="explorer-minimap-viewport" id="explorer-minimap-viewport"></div>
                </div>

                <!-- 详情面板 -->
                <div class="explorer-detail-panel" id="explorer-detail-panel">
                    <div class="explorer-detail-header">
                        <span class="explorer-detail-title" id="explorer-detail-title"></span>
                        <button class="explorer-detail-close" id="explorer-detail-close">×</button>
                    </div>
                    <div class="explorer-detail-body" id="explorer-detail-body"></div>
                </div>
            </div>
        `;
        document.body.appendChild(this._overlay);

        // 缓存 DOM 引用
        this._modal = this._overlay.querySelector('#explorer-modal');
        this._canvas = this._overlay.querySelector('#explorer-canvas');
        this._svgLayer = this._overlay.querySelector('#explorer-svg');
        this._detailPanel = this._overlay.querySelector('#explorer-detail-panel');
        this._zoomIndicator = this._overlay.querySelector('#explorer-zoom-indicator');
        this._searchInput = this._overlay.querySelector('#explorer-search');

        return this;
    },

    /**
     * 渲染架构图节点和连接线
     */
    renderGraph() {
        const nodesContainer = this._overlay.querySelector('#explorer-nodes');
        const svgEl = this._svgLayer;

        // 清空已有内容
        nodesContainer.innerHTML = '';
        svgEl.innerHTML = '';

        // 渲染节点
        architectureData.nodes.forEach(node => {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'explorer-node';
            nodeEl.id = `explorer-node-${node.id}`;
            nodeEl.dataset.nodeId = node.id;
            nodeEl.style.left = `${node.x}px`;
            nodeEl.style.top = `${node.y}px`;
            nodeEl.style.width = `${node.w}px`;
            nodeEl.style.height = `${node.h}px`;
            nodeEl.style.borderColor = node.color;
            nodeEl.innerHTML = `
                <div class="explorer-node-icon" style="background:${node.color}20;color:${node.color};">
                    ${this._getNodeIcon(node.id)}
                </div>
                <div class="explorer-node-info">
                    <div class="explorer-node-name">${this._escapeHtml(node.name)}</div>
                    <div class="explorer-node-name-en">${this._escapeHtml(node.nameEn)}</div>
                </div>
            `;
            nodesContainer.appendChild(nodeEl);
        });

        // 渲染 SVG 连接线
        architectureData.connections.forEach(conn => {
            const fromNode = architectureData.nodes.find(n => n.id === conn.from);
            const toNode = architectureData.nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return;

            const x1 = fromNode.x + fromNode.w / 2;
            const y1 = fromNode.y + fromNode.h;
            const x2 = toNode.x + toNode.w / 2;
            const y2 = toNode.y;

            // 使用贝塞尔曲线
            const midY = (y1 + y2) / 2;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`);
            path.setAttribute('class', 'explorer-connection');
            path.setAttribute('data-from', conn.from);
            path.setAttribute('data-to', conn.to);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', 'rgba(232,126,47,0.3)');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('stroke-dasharray', '6,4');

            // 连接线标签
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', (x1 + x2) / 2);
            text.setAttribute('y', midY - 4);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', 'explorer-connection-label');
            text.setAttribute('fill', 'rgba(232,126,47,0.6)');
            text.setAttribute('font-size', '11');
            text.textContent = conn.label || '';

            svgEl.appendChild(path);
            svgEl.appendChild(text);
        });

        // 渲染小地图
        this.renderMinimap();

        return this;
    },

    /**
     * 渲染小地图
     */
    renderMinimap() {
        const minimapSvg = this._overlay.querySelector('#explorer-minimap-svg');
        if (!minimapSvg) return;

        minimapSvg.innerHTML = '';

        // 计算边界
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        architectureData.nodes.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.w);
            maxY = Math.max(maxY, n.y + n.h);
        });

        const padding = 20;
        const graphW = maxX - minX + padding * 2;
        const graphH = maxY - minY + padding * 2;
        const minimapW = 160;
        const minimapH = 120;
        const scale = Math.min(minimapW / graphW, minimapH / graphH);

        minimapSvg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${graphW} ${graphH}`);

        // 渲染小地图节点
        architectureData.nodes.forEach(n => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', n.x);
            rect.setAttribute('y', n.y);
            rect.setAttribute('width', n.w);
            rect.setAttribute('height', n.h);
            rect.setAttribute('rx', '4');
            rect.setAttribute('fill', n.color);
            rect.setAttribute('opacity', '0.6');
            minimapSvg.appendChild(rect);
        });

        // 渲染小地图连接线
        architectureData.connections.forEach(conn => {
            const fromNode = architectureData.nodes.find(n => n.id === conn.from);
            const toNode = architectureData.nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', fromNode.x + fromNode.w / 2);
            line.setAttribute('y1', fromNode.y + fromNode.h / 2);
            line.setAttribute('x2', toNode.x + toNode.w / 2);
            line.setAttribute('y2', toNode.y + toNode.h / 2);
            line.setAttribute('stroke', 'rgba(232,126,47,0.3)');
            line.setAttribute('stroke-width', '1');
            minimapSvg.appendChild(line);
        });

        return this;
    },

    /**
     * HTML 转义
     * @param {string} str
     * @returns {string}
     */
    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    /**
     * 获取节点图标
     * @param {string} nodeId - 节点 ID
     * @returns {string} 图标字符
     */
    _getNodeIcon(nodeId) {
        const icons = {
            'presentation': '🖥️',
            'services': '⚙️',
            'tools': '🔧',
            'master-loop': '🔄',
            'context': '📦',
            'subagent': '🤖',
            'permissions': '🔒',
            'plugins': '🧩'
        };
        return icons[nodeId] || '📦';
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 打开按钮（由 index.html 中的按钮触发）
        // 关闭按钮
        const closeBtn = this._overlay.querySelector('#explorer-close');
        const closeBtnHandler = () => this.close();
        closeBtn.addEventListener('click', closeBtnHandler);
        this._boundEvents.push({ el: closeBtn, event: 'click', handler: closeBtnHandler });

        // 遮罩层点击关闭
        const overlayClickHandler = (e) => {
            if (e.target === this._overlay) {
                this.close();
            }
        };
        this._overlay.addEventListener('click', overlayClickHandler);
        this._boundEvents.push({ el: this._overlay, event: 'click', handler: overlayClickHandler });

        // 缩放按钮
        const zoomInBtn = this._overlay.querySelector('#explorer-zoom-in');
        const zoomInHandler = () => { this.zoomIn(); };
        zoomInBtn.addEventListener('click', zoomInHandler);
        this._boundEvents.push({ el: zoomInBtn, event: 'click', handler: zoomInHandler });

        const zoomOutBtn = this._overlay.querySelector('#explorer-zoom-out');
        const zoomOutHandler = () => { this.zoomOut(); };
        zoomOutBtn.addEventListener('click', zoomOutHandler);
        this._boundEvents.push({ el: zoomOutBtn, event: 'click', handler: zoomOutHandler });

        // 重置视图
        const resetBtn = this._overlay.querySelector('#explorer-reset');
        const resetHandler = () => { this.resetView(); };
        resetBtn.addEventListener('click', resetHandler);
        this._boundEvents.push({ el: resetBtn, event: 'click', handler: resetHandler });

        // 搜索过滤
        const searchHandler = (e) => { this.filterNodes(e.target.value); };
        this._searchInput.addEventListener('input', searchHandler);
        this._boundEvents.push({ el: this._searchInput, event: 'input', handler: searchHandler });

        // 鼠标滚轮缩放
        const canvasWrapper = this._overlay.querySelector('.explorer-canvas-wrapper');
        const wheelHandler = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.setScale(this._scale + delta);
        };
        canvasWrapper.addEventListener('wheel', wheelHandler, { passive: false });
        this._boundEvents.push({ el: canvasWrapper, event: 'wheel', handler: wheelHandler });

        // 鼠标拖拽平移
        const mousedownHandler = (e) => {
            if (e.target.closest('.explorer-node')) return;
            this._isDragging = true;
            this._dragStartX = e.clientX - this._translateX;
            this._dragStartY = e.clientY - this._translateY;
            canvasWrapper.style.cursor = 'grabbing';
        };
        canvasWrapper.addEventListener('mousedown', mousedownHandler);
        this._boundEvents.push({ el: canvasWrapper, event: 'mousedown', handler: mousedownHandler });

        // 鼠标移动拖拽
        this._onDocumentMousemove = (e) => {
            if (!this._isDragging) return;
            this._translateX = e.clientX - this._dragStartX;
            this._translateY = e.clientY - this._dragStartY;
            this.updateTransform();
        };
        document.addEventListener('mousemove', this._onDocumentMousemove);
        this._boundEvents.push({ el: document, event: 'mousemove', handler: this._onDocumentMousemove });

        // 鼠标释放
        this._onDocumentMouseup = () => {
            if (this._isDragging) {
                this._isDragging = false;
                const canvasWrapper = this._overlay.querySelector('.explorer-canvas-wrapper');
                if (canvasWrapper) canvasWrapper.style.cursor = 'grab';
            }
        };
        document.addEventListener('mouseup', this._onDocumentMouseup);
        this._boundEvents.push({ el: document, event: 'mouseup', handler: this._onDocumentMouseup });

        // 节点点击
        const nodesContainer = this._overlay.querySelector('#explorer-nodes');
        const nodeClickHandler = (e) => {
            const nodeEl = e.target.closest('.explorer-node');
            if (nodeEl) {
                const nodeId = nodeEl.dataset.nodeId;
                this.selectNode(nodeId);
            }
        };
        nodesContainer.addEventListener('click', nodeClickHandler);
        this._boundEvents.push({ el: nodesContainer, event: 'click', handler: nodeClickHandler });

        // 节点双击放大
        const nodeDblClickHandler = (e) => {
            const nodeEl = e.target.closest('.explorer-node');
            if (nodeEl) {
                const nodeId = nodeEl.dataset.nodeId;
                this.zoomToNode(nodeId);
            }
        };
        nodesContainer.addEventListener('dblclick', nodeDblClickHandler);
        this._boundEvents.push({ el: nodesContainer, event: 'dblclick', handler: nodeDblClickHandler });

        // 详情面板关闭
        const detailCloseBtn = this._overlay.querySelector('#explorer-detail-close');
        const detailCloseHandler = () => { this.closeDetailPanel(); };
        detailCloseBtn.addEventListener('click', detailCloseHandler);
        this._boundEvents.push({ el: detailCloseBtn, event: 'click', handler: detailCloseHandler });

        // 键盘支持
        this._onDocumentKeydown = (e) => {
            if (!this._isOpen) return;

            switch (e.key) {
                case 'Escape':
                    if (this._selectedNode) {
                        this.closeDetailPanel();
                    } else {
                        this.close();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this._translateY += 30;
                    this.updateTransform();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this._translateY -= 30;
                    this.updateTransform();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this._translateX += 30;
                    this.updateTransform();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this._translateX -= 30;
                    this.updateTransform();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    this.zoomOut();
                    break;
            }
        };
        document.addEventListener('keydown', this._onDocumentKeydown);
        this._boundEvents.push({ el: document, event: 'keydown', handler: this._onDocumentKeydown });

        // 触摸手势支持
        const touchstartHandler = (e) => {
            if (e.touches.length === 2) {
                // 双指缩放
                this._touchStartDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                this._touchStartScale = this._scale;
            } else if (e.touches.length === 1 && !e.target.closest('.explorer-node')) {
                // 单指拖拽
                this._isDragging = true;
                this._dragStartX = e.touches[0].clientX - this._translateX;
                this._dragStartY = e.touches[0].clientY - this._translateY;
            }
        };
        canvasWrapper.addEventListener('touchstart', touchstartHandler, { passive: true });
        this._boundEvents.push({ el: canvasWrapper, event: 'touchstart', handler: touchstartHandler });

        const touchmoveHandler = (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const newScale = this._touchStartScale * (dist / this._touchStartDist);
                this.setScale(newScale);
            } else if (e.touches.length === 1 && this._isDragging) {
                this._translateX = e.touches[0].clientX - this._dragStartX;
                this._translateY = e.touches[0].clientY - this._dragStartY;
                this.updateTransform();
            }
        };
        canvasWrapper.addEventListener('touchmove', touchmoveHandler, { passive: false });
        this._boundEvents.push({ el: canvasWrapper, event: 'touchmove', handler: touchmoveHandler });

        const touchendHandler = () => {
            this._isDragging = false;
        };
        canvasWrapper.addEventListener('touchend', touchendHandler);
        this._boundEvents.push({ el: canvasWrapper, event: 'touchend', handler: touchendHandler });

        return this;
    },

    /**
     * 打开探索器
     */
    open() {
        if (!this._overlay) {
            console.warn('[Explorer] 模块未初始化，尝试重新初始化');
            this.init();
            if (!this._overlay) {
                console.error('[Explorer] 初始化失败，无法打开');
                return this;
            }
        }
        this._isOpen = true;
        this._overlay.classList.add('visible', 'open');
        if (this._modal) this._modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        this.renderGraph();
        this.resetView();

        // 聚焦搜索框
        setTimeout(() => {
            if (this._searchInput) this._searchInput.focus();
        }, 300);

        if (window.AppCore) {
            window.AppCore.bus.emit('explorer:open', {});
        }
        return this;
    },

    /**
     * 关闭探索器
     */
    close() {
        if (!this._overlay) return this;
        this._isOpen = false;
        this._overlay.classList.remove('visible', 'open');
        if (this._modal) this._modal.classList.remove('open');
        document.body.style.overflow = '';
        this.closeDetailPanel();

        if (window.AppCore) {
            window.AppCore.bus.emit('explorer:close', {});
        }
        return this;
    },

    /**
     * 重置视图
     */
    resetView() {
        this._scale = 1;
        this._translateX = 0;
        this._translateY = 0;
        this.updateTransform();
        this.updateZoomIndicator();
        this.closeDetailPanel();

        // 清空搜索
        if (this._searchInput) {
            this._searchInput.value = '';
        }
        this.filterNodes('');

        return this;
    },

    /**
     * 设置缩放比例
     * @param {number} scale - 目标缩放比例
     */
    setScale(scale) {
        this._scale = Math.max(this._minScale, Math.min(this._maxScale, scale));
        this.updateTransform();
        this.updateZoomIndicator();
        return this;
    },

    /**
     * 放大
     */
    zoomIn() {
        this.setScale(this._scale + 0.15);
        return this;
    },

    /**
     * 缩小
     */
    zoomOut() {
        this.setScale(this._scale - 0.15);
        return this;
    },

    /**
     * 缩放到指定节点
     * @param {string} nodeId - 节点 ID
     */
    zoomToNode(nodeId) {
        const node = architectureData.nodes.find(n => n.id === nodeId);
        if (!node) return this;

        // 计算画布容器尺寸
        const wrapper = this._overlay.querySelector('.explorer-canvas-wrapper');
        const wrapperW = wrapper.clientWidth;
        const wrapperH = wrapper.clientHeight;

        // 目标：将节点居中并放大
        this._scale = 1.5;
        this._translateX = (wrapperW / 2) - (node.x + node.w / 2) * this._scale;
        this._translateY = (wrapperH / 2) - (node.y + node.h / 2) * this._scale;

        this.updateTransform();
        this.updateZoomIndicator();
        this.selectNode(nodeId);

        return this;
    },

    /**
     * 更新画布变换
     */
    updateTransform() {
        if (!this._canvas) return;
        this._canvas.style.transform = `translate(${this._translateX}px, ${this._translateY}px) scale(${this._scale})`;
        return this;
    },

    /**
     * 更新缩放指示器
     */
    updateZoomIndicator() {
        if (!this._zoomIndicator) return;
        this._zoomIndicator.textContent = `${Math.round(this._scale * 100)}%`;
        return this;
    },

    /**
     * 选中节点并显示详情
     * @param {string} nodeId - 节点 ID
     */
    selectNode(nodeId) {
        const node = architectureData.nodes.find(n => n.id === nodeId);
        if (!node) return this;

        this._selectedNode = nodeId;

        // 更新节点选中状态
        this._overlay.querySelectorAll('.explorer-node').forEach(el => {
            el.classList.toggle('selected', el.dataset.nodeId === nodeId);
        });

        // 高亮相关连接线
        this._svgLayer.querySelectorAll('.explorer-connection').forEach(path => {
            const from = path.getAttribute('data-from');
            const to = path.getAttribute('data-to');
            if (from === nodeId || to === nodeId) {
                path.setAttribute('stroke', 'rgba(232,126,47,0.8)');
                path.setAttribute('stroke-width', '3');
                path.removeAttribute('stroke-dasharray');
            } else {
                path.setAttribute('stroke', 'rgba(232,126,47,0.1)');
                path.setAttribute('stroke-width', '1');
                path.setAttribute('stroke-dasharray', '4,4');
            }
        });

        // 更新详情面板
        const titleEl = this._overlay.querySelector('#explorer-detail-title');
        const bodyEl = this._overlay.querySelector('#explorer-detail-body');

        titleEl.textContent = `${node.name} (${node.nameEn})`;
        titleEl.style.color = node.color;

        // 查找相关连接
        const relatedConnections = architectureData.connections.filter(
            c => c.from === nodeId || c.to === nodeId
        );

        bodyEl.innerHTML = `
            <div class="explorer-detail-desc">${this._escapeHtml(node.description)}</div>
            <div class="explorer-detail-section">
                <div class="explorer-detail-section-title">关键属性</div>
                <ul class="explorer-detail-list">
                    ${node.details.map(d => `<li>${this._escapeHtml(d)}</li>`).join('')}
                </ul>
            </div>
            <div class="explorer-detail-section">
                <div class="explorer-detail-section-title">连接关系 (${relatedConnections.length})</div>
                <ul class="explorer-detail-list">
                    ${relatedConnections.map(c => {
                        const otherId = c.from === nodeId ? c.to : c.from;
                        const otherNode = architectureData.nodes.find(n => n.id === otherId);
                        const direction = c.from === nodeId ? '→' : '←';
                        return `<li>${direction} ${otherNode ? this._escapeHtml(otherNode.name) : this._escapeHtml(otherId)} <span class="explorer-conn-label">${this._escapeHtml(c.label)}</span></li>`;
                    }).join('')}
                </ul>
            </div>
        `;

        // 显示详情面板
        this._detailPanel.classList.add('visible');

        return this;
    },

    /**
     * 关闭详情面板
     */
    closeDetailPanel() {
        this._selectedNode = null;
        if (this._detailPanel) {
            this._detailPanel.classList.remove('visible');
        }

        // 恢复所有节点和连接线状态
        if (this._overlay) {
            this._overlay.querySelectorAll('.explorer-node').forEach(el => {
                el.classList.remove('selected');
            });
        }
        if (this._svgLayer) {
            this._svgLayer.querySelectorAll('.explorer-connection').forEach(path => {
                path.setAttribute('stroke', 'rgba(232,126,47,0.3)');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('stroke-dasharray', '6,4');
            });
        }

        return this;
    },

    /**
     * 搜索过滤节点
     * @param {string} query - 搜索关键词
     */
    filterNodes(query) {
        this._searchQuery = query.toLowerCase().trim();

        this._overlay.querySelectorAll('.explorer-node').forEach(el => {
            const nodeId = el.dataset.nodeId;
            const node = architectureData.nodes.find(n => n.id === nodeId);
            if (!node) return;

            const matchName = node.name.toLowerCase().includes(this._searchQuery);
            const matchNameEn = node.nameEn.toLowerCase().includes(this._searchQuery);
            const matchDesc = node.description.toLowerCase().includes(this._searchQuery);
            const matchDetails = node.details.some(d => d.toLowerCase().includes(this._searchQuery));

            const isMatch = !this._searchQuery || matchName || matchNameEn || matchDesc || matchDetails;
            el.classList.toggle('dimmed', !isMatch);
            el.classList.toggle('highlighted', isMatch && this._searchQuery.length > 0);
        });

        return this;
    },

    /**
     * 销毁模块
     */
    destroy() {
        // 移除所有绑定的事件监听
        this._boundEvents.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });
        this._boundEvents = [];

        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
        this._isOpen = false;
        this._selectedNode = null;
        if (window.AppCore) {
            window.AppCore.logger.info('Explorer', '架构探索器模块已销毁');
        }
    }
};

// ==================== 全局暴露 ====================
window.ExplorerModule = ExplorerModule;

// 导出（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExplorerModule, architectureData };
}
