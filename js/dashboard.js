/**
 * Claude Code Architecture Documentation - 数据可视化仪表盘模块
 * 基于 Chart.js 的交互式数据面板，展示项目统计、性能指标和模块信息
 *
 * @version 1.0.0
 * @author Claude Code Architecture Team
 */

// ==================== DashboardModule ====================
/**
 * 数据可视化仪表盘模块
 * 提供全屏模态框、三标签页（概览/性能/模块）、Chart.js 图表渲染
 */
const DashboardModule = {
    // 模块状态
    _isOpen: false,
    _overlay: null,
    _charts: {},       // 存储 Chart 实例引用，用于销毁
    _activeTab: 'overview',
    _boundEvents: [],
    _observers: [],    // 存储 PerformanceObserver 引用，用于销毁

    // 性能数据收集
    _perfData: {
        loadTimeline: [],
        moduleInitTimes: {},
        webVitals: { LCP: null, FID: null, CLS: null, TTFB: null, INP: null }
    },

    /**
     * 初始化仪表盘模块
     */
    init() {
        // 防止重复初始化
        if (document.getElementById('dashboard-overlay')) {
            return this;
        }
        this.createUI();
        this.bindEvents();
        this._collectPerformanceData();
        if (window.AppCore) {
            window.AppCore.logger.info('Dashboard', '数据可视化仪表盘模块初始化完成');
        }
        return this;
    },

    /**
     * 创建仪表盘 UI
     */
    createUI() {
        // 创建全屏遮罩层
        this._overlay = document.createElement('div');
        this._overlay.className = 'dashboard-overlay no-print';
        this._overlay.id = 'dashboard-overlay';
        this._overlay.innerHTML = `
            <div class="dashboard-modal" id="dashboard-modal">
                <!-- 工具栏 -->
                <div class="dashboard-toolbar">
                    <div class="dashboard-toolbar-left">
                        <span class="dashboard-toolbar-title" data-i18n="dashboard.title">数据可视化仪表盘</span>
                    </div>
                    <div class="dashboard-toolbar-center">
                        <div class="dashboard-tabs" id="dashboard-tabs">
                            <button class="dashboard-tab active" data-tab="overview" data-i18n="dashboard.overview">概览</button>
                            <button class="dashboard-tab" data-tab="performance" data-i18n="dashboard.performance">性能</button>
                            <button class="dashboard-tab" data-tab="modules" data-i18n="dashboard.modules">模块</button>
                        </div>
                    </div>
                    <div class="dashboard-toolbar-right">
                        <button class="dashboard-close-btn" id="dashboard-close" data-i18n="dashboard.close">关闭</button>
                    </div>
                </div>

                <!-- 标签页内容区 -->
                <div class="dashboard-content" id="dashboard-content">
                    <!-- 概览标签页 -->
                    <div class="dashboard-tab-content active" id="dashboard-tab-overview">
                        <div class="dashboard-stat-cards" id="dashboard-stat-cards"></div>
                        <div class="dashboard-charts-grid">
                            <div class="dashboard-chart-card">
                                <div class="dashboard-chart-title">代码行数统计（按模块）</div>
                                <div class="dashboard-chart-wrapper">
                                    <canvas id="dashboard-lines-chart"></canvas>
                                </div>
                            </div>
                            <div class="dashboard-chart-card">
                                <div class="dashboard-chart-title">技术栈占比</div>
                                <div class="dashboard-chart-wrapper">
                                    <canvas id="dashboard-tech-chart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 性能标签页 -->
                    <div class="dashboard-tab-content" id="dashboard-tab-performance">
                        <div class="dashboard-charts-grid">
                            <div class="dashboard-chart-card">
                                <div class="dashboard-chart-title">Web Vitals 实时监控</div>
                                <div class="dashboard-chart-wrapper">
                                    <canvas id="dashboard-vitals-chart"></canvas>
                                </div>
                            </div>
                            <div class="dashboard-chart-card">
                                <div class="dashboard-chart-title">页面加载时间线</div>
                                <div class="dashboard-chart-wrapper">
                                    <canvas id="dashboard-timeline-chart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="dashboard-chart-card" style="margin-top:16px;">
                            <div class="dashboard-chart-title">模块初始化耗时排行</div>
                            <div class="dashboard-chart-wrapper">
                                <canvas id="dashboard-init-chart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- 模块标签页 -->
                    <div class="dashboard-tab-content" id="dashboard-tab-modules">
                        <div class="dashboard-charts-grid">
                            <div class="dashboard-chart-card">
                                <div class="dashboard-chart-title">模块依赖关系</div>
                                <div class="dashboard-chart-wrapper dashboard-tree-wrapper" id="dashboard-dep-tree"></div>
                            </div>
                            <div class="dashboard-chart-card">
                                <div class="dashboard-chart-title">EventBus 事件通信图</div>
                                <div class="dashboard-chart-wrapper dashboard-tree-wrapper" id="dashboard-event-list"></div>
                            </div>
                        </div>
                        <div class="dashboard-chart-card" style="margin-top:16px;">
                            <div class="dashboard-chart-title">模块功能清单</div>
                            <div class="dashboard-chart-wrapper" id="dashboard-module-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this._overlay);
        return this;
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 关闭按钮
        const closeBtn = this._overlay.querySelector('#dashboard-close');
        const closeHandler = () => this.close();
        closeBtn.addEventListener('click', closeHandler);
        this._boundEvents.push({ el: closeBtn, event: 'click', handler: closeHandler });

        // 遮罩层点击关闭
        const overlayClickHandler = (e) => {
            if (e.target === this._overlay) {
                this.close();
            }
        };
        this._overlay.addEventListener('click', overlayClickHandler);
        this._boundEvents.push({ el: this._overlay, event: 'click', handler: overlayClickHandler });

        // 标签页切换
        const tabsContainer = this._overlay.querySelector('#dashboard-tabs');
        const tabClickHandler = (e) => {
            const tab = e.target.closest('.dashboard-tab');
            if (tab) {
                this.switchTab(tab.dataset.tab);
            }
        };
        tabsContainer.addEventListener('click', tabClickHandler);
        this._boundEvents.push({ el: tabsContainer, event: 'click', handler: tabClickHandler });

        // 键盘支持
        this._onKeydown = (e) => {
            if (!this._isOpen) return;
            if (e.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this._onKeydown);
        this._boundEvents.push({ el: document, event: 'keydown', handler: this._onKeydown });

        return this;
    },

    /**
     * 打开仪表盘
     */
    open() {
        // 检查 Chart.js 是否可用
        if (typeof Chart === 'undefined') {
            if (window.AppCore) {
                window.AppCore.logger.warn('Dashboard', 'Chart.js 未加载，无法打开仪表盘');
            }
            if (typeof ToastModule !== 'undefined') {
                ToastModule.show('Chart.js 未加载，请检查网络连接', 'warning');
            }
            return this;
        }

        this._isOpen = true;
        this._overlay.classList.add('visible', 'open');
        document.body.style.overflow = 'hidden';

        // 渲染当前标签页
        this._renderActiveTab();

        if (window.AppCore) {
            window.AppCore.bus.emit('dashboard:open', {});
            window.AppCore.logger.info('Dashboard', '仪表盘已打开');
        }
        return this;
    },

    /**
     * 关闭仪表盘
     */
    close() {
        this._isOpen = false;
        this._overlay.classList.remove('visible', 'open');
        document.body.style.overflow = '';

        // 销毁所有 Chart 实例防止内存泄漏
        this.destroyCharts();

        if (window.AppCore) {
            window.AppCore.bus.emit('dashboard:close', {});
            window.AppCore.logger.info('Dashboard', '仪表盘已关闭');
        }
        return this;
    },

    /**
     * 切换标签页
     * @param {string} tabName - 标签页名称: overview / performance / modules
     */
    switchTab(tabName) {
        const validTabs = ['overview', 'performance', 'modules'];
        if (!validTabs.includes(tabName)) return this;

        this._activeTab = tabName;

        // 更新标签页按钮状态
        this._overlay.querySelectorAll('.dashboard-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // 更新标签页内容显示
        this._overlay.querySelectorAll('.dashboard-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `dashboard-tab-${tabName}`);
        });

        // 销毁旧图表，渲染新标签页图表
        this.destroyCharts();
        this._renderActiveTab();

        if (window.AppCore) {
            window.AppCore.logger.info('Dashboard', `切换到标签页: ${tabName}`);
        }
        return this;
    },

    /**
     * 渲染当前活跃标签页的图表
     */
    _renderActiveTab() {
        switch (this._activeTab) {
            case 'overview':
                this.renderOverviewCharts();
                break;
            case 'performance':
                this.renderPerformanceCharts();
                break;
            case 'modules':
                this.renderModuleCharts();
                break;
        }
    },

    /**
     * 渲染概览标签页图表
     * 代码行数柱状图 + 技术栈饼图 + 统计卡片
     */
    renderOverviewCharts() {
        const stats = this._getModuleStats();

        // 渲染统计卡片
        this._renderStatCards(stats);

        // 代码行数柱状图
        const linesCtx = document.getElementById('dashboard-lines-chart');
        if (linesCtx) {
            this._charts.lines = new Chart(linesCtx, {
                type: 'bar',
                data: {
                    labels: stats.modules.map(m => m.name),
                    datasets: [{
                        label: '代码行数',
                        data: stats.modules.map(m => m.lines),
                        backgroundColor: [
                            'rgba(232,126,47,0.8)',
                            'rgba(109,179,242,0.8)',
                            'rgba(123,196,127,0.8)',
                            'rgba(180,142,173,0.8)',
                            'rgba(86,182,194,0.8)',
                            'rgba(229,192,123,0.8)',
                            'rgba(224,108,117,0.8)',
                            'rgba(152,195,121,0.8)',
                            'rgba(198,120,221,0.8)'
                        ],
                        borderColor: [
                            '#e87e2f',
                            '#6db3f2',
                            '#7bc47f',
                            '#b48ead',
                            '#56b6c2',
                            '#e5c07b',
                            '#e06c75',
                            '#98c379',
                            '#c678dd'
                        ],
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10,10,18,0.9)',
                            titleColor: '#e87e2f',
                            bodyColor: '#e8e8f0',
                            borderColor: 'rgba(232,126,47,0.3)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: 'rgba(232,232,240,0.6)' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: 'rgba(232,232,240,0.6)', maxRotation: 45 }
                        }
                    }
                }
            });
        }

        // 技术栈饼图
        const techCtx = document.getElementById('dashboard-tech-chart');
        if (techCtx) {
            this._charts.tech = new Chart(techCtx, {
                type: 'doughnut',
                data: {
                    labels: ['TypeScript', 'Bun', 'React+Ink', 'ripgrep', 'Mermaid.js', 'Fuse.js', 'Chart.js'],
                    datasets: [{
                        data: [35, 15, 20, 10, 8, 6, 6],
                        backgroundColor: [
                            'rgba(49,120,198,0.8)',
                            'rgba(240,168,48,0.8)',
                            'rgba(97,218,251,0.8)',
                            'rgba(232,126,47,0.8)',
                            'rgba(255,100,100,0.8)',
                            'rgba(123,196,127,0.8)',
                            'rgba(229,192,123,0.8)'
                        ],
                        borderColor: 'rgba(10,10,18,0.8)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: 'rgba(232,232,240,0.8)',
                                padding: 16,
                                usePointStyle: true,
                                pointStyleWidth: 10
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(10,10,18,0.9)',
                            titleColor: '#e87e2f',
                            bodyColor: '#e8e8f0',
                            borderColor: 'rgba(232,126,47,0.3)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.label}: ${context.parsed}%`;
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * 渲染统计数字卡片
     * @param {Object} stats - 模块统计数据
     */
    _renderStatCards(stats) {
        const container = document.getElementById('dashboard-stat-cards');
        if (!container) return;

        const totalLines = stats.modules.reduce((sum, m) => sum + m.lines, 0);
        const totalModules = stats.modules.length;

        container.innerHTML = `
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-value">${totalModules}</div>
                <div class="dashboard-stat-label">JS 模块</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-value">${totalLines.toLocaleString()}</div>
                <div class="dashboard-stat-label">总代码行数</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-value">${stats.coreComponents}</div>
                <div class="dashboard-stat-label">核心组件</div>
            </div>
            <div class="dashboard-stat-card">
                <div class="dashboard-stat-value">${stats.connections}</div>
                <div class="dashboard-stat-label">连接关系</div>
            </div>
        `;
    },

    /**
     * 渲染性能标签页图表
     * Web Vitals + 加载时间线 + 模块初始化排行
     */
    renderPerformanceCharts() {
        const perfData = this._getPerformanceData();

        // Web Vitals 柱状图
        const vitalsCtx = document.getElementById('dashboard-vitals-chart');
        if (vitalsCtx) {
            const vitalsLabels = ['LCP', 'FID', 'CLS', 'TTFB', 'INP'];
            const vitalsValues = vitalsLabels.map(k => perfData.webVitals[k] || 0);
            const vitalsColors = vitalsValues.map((v, i) => {
                // 根据指标类型设置不同阈值颜色
                const thresholds = [2500, 100, 0.1, 800, 200];
                const val = v;
                if (i === 2) { // CLS
                    return val <= 0.1 ? 'rgba(123,196,127,0.8)' : val <= 0.25 ? 'rgba(229,192,123,0.8)' : 'rgba(224,108,117,0.8)';
                }
                return val <= thresholds[i] ? 'rgba(123,196,127,0.8)' : val <= thresholds[i] * 1.5 ? 'rgba(229,192,123,0.8)' : 'rgba(224,108,117,0.8)';
            });

            this._charts.vitals = new Chart(vitalsCtx, {
                type: 'bar',
                data: {
                    labels: vitalsLabels,
                    datasets: [{
                        label: '当前值',
                        data: vitalsValues,
                        backgroundColor: vitalsColors,
                        borderRadius: 4,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10,10,18,0.9)',
                            titleColor: '#e87e2f',
                            bodyColor: '#e8e8f0',
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    const units = ['ms', 'ms', '', 'ms', 'ms'];
                                    return ` ${context.parsed.x}${units[context.dataIndex]}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: 'rgba(232,232,240,0.6)' }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: 'rgba(232,232,240,0.8)', font: { size: 13 } }
                        }
                    }
                }
            });
        }

        // 页面加载时间线
        const timelineCtx = document.getElementById('dashboard-timeline-chart');
        if (timelineCtx) {
            const timeline = perfData.loadTimeline;
            this._charts.timeline = new Chart(timelineCtx, {
                type: 'line',
                data: {
                    labels: timeline.map(t => t.name),
                    datasets: [{
                        label: '耗时 (ms)',
                        data: timeline.map(t => t.duration),
                        borderColor: '#e87e2f',
                        backgroundColor: 'rgba(232,126,47,0.1)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#e87e2f',
                        pointBorderColor: '#e87e2f',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10,10,18,0.9)',
                            titleColor: '#e87e2f',
                            bodyColor: '#e8e8f0',
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.parsed.y.toFixed(2)}ms`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: 'rgba(232,232,240,0.6)' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: 'rgba(232,232,240,0.6)', maxRotation: 45 }
                        }
                    }
                }
            });
        }

        // 模块初始化耗时排行
        const initCtx = document.getElementById('dashboard-init-chart');
        if (initCtx) {
            const initEntries = Object.entries(perfData.moduleInitTimes)
                .sort((a, b) => b[1] - a[1]);

            this._charts.init = new Chart(initCtx, {
                type: 'bar',
                data: {
                    labels: initEntries.map(e => e[0]),
                    datasets: [{
                        label: '初始化耗时 (ms)',
                        data: initEntries.map(e => e[1]),
                        backgroundColor: 'rgba(109,179,242,0.7)',
                        borderColor: '#6db3f2',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(10,10,18,0.9)',
                            titleColor: '#e87e2f',
                            bodyColor: '#e8e8f0',
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.parsed.x.toFixed(2)}ms`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: 'rgba(232,232,240,0.6)' }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: 'rgba(232,232,240,0.8)' }
                        }
                    }
                }
            });
        }
    },

    /**
     * 渲染模块标签页图表
     * 模块依赖关系 + 事件通信图 + 功能清单
     */
    renderModuleCharts() {
        // 模块依赖关系树
        this._renderDependencyTree();

        // EventBus 事件通信列表
        this._renderEventList();

        // 模块功能清单
        this._renderModuleList();
    },

    /**
     * 渲染模块依赖关系树
     */
    _renderDependencyTree() {
        const container = document.getElementById('dashboard-dep-tree');
        if (!container) return;

        const dependencyTree = {
            name: 'AppCore (core.js)',
            color: '#e87e2f',
            children: [
                {
                    name: 'main.js',
                    color: '#6db3f2',
                    children: [
                        { name: 'search.js', color: '#7bc47f' },
                        { name: 'theme.js', color: '#b48ead' },
                        { name: 'features.js', color: '#56b6c2' }
                    ]
                },
                {
                    name: 'enhancements.js',
                    color: '#e5c07b',
                    children: [
                        { name: 'a11y.js', color: '#e06c75' }
                    ]
                },
                {
                    name: 'explorer.js',
                    color: '#98c379'
                },
                {
                    name: 'i18n.js',
                    color: '#c678dd'
                },
                {
                    name: 'dashboard.js',
                    color: '#e87e2f'
                }
            ]
        };

        container.innerHTML = this._buildTreeHTML(dependencyTree, 0);
    },

    /**
     * 递归构建树形 HTML
     * @param {Object} node - 树节点
     * @param {number} depth - 深度
     * @returns {string} HTML 字符串
     */
    _buildTreeHTML(node, depth) {
        const indent = depth * 20;
        const hasChildren = node.children && node.children.length > 0;
        let html = `
            <div class="dashboard-tree-node" style="padding-left:${indent}px;">
                <span class="dashboard-tree-icon" style="color:${node.color};">
                    ${hasChildren ? '&#9660;' : '&#8226;'}
                </span>
                <span class="dashboard-tree-label" style="color:${node.color};">${node.name}</span>
            </div>
        `;
        if (hasChildren) {
            node.children.forEach(child => {
                html += this._buildTreeHTML(child, depth + 1);
            });
        }
        return html;
    },

    /**
     * 渲染 EventBus 事件通信列表
     */
    _renderEventList() {
        const container = document.getElementById('dashboard-event-list');
        if (!container) return;

        const events = [
            { event: 'app:ready', desc: '应用就绪', source: 'Init', color: '#7bc47f' },
            { event: 'explorer:open', desc: '打开架构探索器', source: 'ExplorerModule', color: '#6db3f2' },
            { event: 'explorer:close', desc: '关闭架构探索器', source: 'ExplorerModule', color: '#6db3f2' },
            { event: 'dashboard:open', desc: '打开数据面板', source: 'DashboardModule', color: '#e87e2f' },
            { event: 'dashboard:close', desc: '关闭数据面板', source: 'DashboardModule', color: '#e87e2f' },
            { event: 'i18n:changed', desc: '语言切换', source: 'I18nModule', color: '#c678dd' },
            { event: 'theme:changed', desc: '主题切换', source: 'ThemeModule', color: '#b48ead' },
            { event: 'search:open', desc: '打开搜索', source: 'SearchModule', color: '#56b6c2' },
            { event: 'search:close', desc: '关闭搜索', source: 'SearchModule', color: '#56b6c2' },
            { event: 'sidebar:toggle', desc: '侧边栏切换', source: 'SidebarModule', color: '#e5c07b' },
            { event: 'toc:update', desc: '目录更新', source: 'TocModule', color: '#98c379' }
        ];

        container.innerHTML = events.map(e => `
            <div class="dashboard-event-item">
                <span class="dashboard-event-name" style="color:${e.color};">${e.event}</span>
                <span class="dashboard-event-desc">${e.desc}</span>
                <span class="dashboard-event-source">${e.source}</span>
            </div>
        `).join('');
    },

    /**
     * 渲染模块功能清单
     */
    _renderModuleList() {
        const container = document.getElementById('dashboard-module-list');
        if (!container) return;

        const moduleList = [
            { name: 'core.js', desc: '核心模块系统：EventBus、ModuleRegistry、Logger、工具函数', lines: 531 },
            { name: 'main.js', desc: '主模块：DOM 工具、状态管理、配置、侧边栏、导航、滚动、手风琴', lines: 1015 },
            { name: 'search.js', desc: '搜索模块：Fuse.js 模糊搜索、搜索历史、键盘快捷键', lines: 507 },
            { name: 'theme.js', desc: '主题模块：暗色/亮色/跟随系统三态切换、持久化', lines: 291 },
            { name: 'features.js', desc: '功能模块：懒加载、打印、Toast 通知、分享、版本日志', lines: 774 },
            { name: 'enhancements.js', desc: '增强模块：Web Vitals、目录、代码复制、键盘导航', lines: 1015 },
            { name: 'explorer.js', desc: '架构探索器：可缩放拖拽画布、组件详情、小地图', lines: 829 },
            { name: 'i18n.js', desc: '国际化：中英文切换、data-i18n 属性翻译、语言持久化', lines: 411 },
            { name: 'a11y.js', desc: '无障碍：焦点管理、ARIA 标注、键盘导航增强', lines: 1115 },
            { name: 'dashboard.js', desc: '数据可视化仪表盘：Chart.js 图表、性能监控、模块分析', lines: 0 }
        ];

        container.innerHTML = `
            <div class="dashboard-module-table">
                <div class="dashboard-module-table-header">
                    <span class="dashboard-module-col-name">模块</span>
                    <span class="dashboard-module-col-desc">功能描述</span>
                    <span class="dashboard-module-col-lines">行数</span>
                </div>
                ${moduleList.map(m => `
                    <div class="dashboard-module-table-row">
                        <span class="dashboard-module-col-name" style="color:#e87e2f;">${m.name}</span>
                        <span class="dashboard-module-col-desc">${m.desc}</span>
                        <span class="dashboard-module-col-lines">${m.lines > 0 ? m.lines.toLocaleString() : '-'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * 销毁所有 Chart 实例防止内存泄漏
     */
    destroyCharts() {
        Object.keys(this._charts).forEach(key => {
            if (this._charts[key] && typeof this._charts[key].destroy === 'function') {
                this._charts[key].destroy();
            }
        });
        this._charts = {};
        if (window.AppCore) {
            window.AppCore.logger.info('Dashboard', '所有 Chart 实例已销毁');
        }
        return this;
    },

    /**
     * 返回模块统计数据
     * @returns {Object} 模块统计信息
     */
    _getModuleStats() {
        return {
            totalModules: 10,
            totalLines: 6488,
            coreComponents: 8,
            connections: 13,
            modules: [
                { name: 'core.js', lines: 531 },
                { name: 'main.js', lines: 1015 },
                { name: 'search.js', lines: 507 },
                { name: 'theme.js', lines: 291 },
                { name: 'features.js', lines: 774 },
                { name: 'enhancements.js', lines: 1015 },
                { name: 'explorer.js', lines: 829 },
                { name: 'i18n.js', lines: 411 },
                { name: 'a11y.js', lines: 1115 },
                { name: 'dashboard.js', lines: 0 }
            ]
        };
    },

    /**
     * 获取性能数据
     * 优先从 PerformanceMonitor 获取真实数据，回退到本地收集的数据
     * @returns {Object} 性能数据
     */
    _getPerformanceData() {
        // 尝试从 PerformanceMonitor 获取 Web Vitals
        if (window.PerformanceMonitor && typeof PerformanceMonitor.getCoreWebVitals === 'function') {
            try {
                const cwv = PerformanceMonitor.getCoreWebVitals();
                if (cwv.LCP !== null) this._perfData.webVitals.LCP = Math.round(cwv.LCP);
                if (cwv.FID !== null) this._perfData.webVitals.FID = Math.round(cwv.FID);
                if (cwv.CLS !== undefined && cwv.CLS !== null) this._perfData.webVitals.CLS = Math.round(cwv.CLS * 1000) / 1000;
                if (cwv.TTFB !== null) this._perfData.webVitals.TTFB = Math.round(cwv.TTFB);
            } catch (e) {
                // PerformanceMonitor 不可用，使用本地数据
            }
        }

        // 尝试从 PerformanceMonitor 获取导航时间线
        if (window.PerformanceMonitor && PerformanceMonitor._metrics && PerformanceMonitor._metrics.navigation) {
            try {
                const nav = PerformanceMonitor._metrics.navigation;
                if (nav && nav.dns !== undefined) {
                    this._perfData.loadTimeline = [
                        { name: 'DNS', duration: nav.dns },
                        { name: 'TCP', duration: nav.tcp },
                        { name: 'TTFB', duration: nav.ttfb },
                        { name: 'Download', duration: nav.download },
                        { name: 'DOM Parse', duration: nav.domParse },
                        { name: 'DOM Ready', duration: nav.domReady },
                        { name: 'Load', duration: nav.loadComplete }
                    ];
                }
            } catch (e) {
                // 使用本地收集的数据
            }
        }

        return this._perfData;
    },

    /**
     * 收集性能数据
     * 使用 PerformanceObserver 监听 Web Vitals
     */
    _collectPerformanceData() {
        // 收集页面加载时间线数据
        try {
            const perf = performance.getEntriesByType('navigation')[0];
            if (perf) {
                this._perfData.loadTimeline = [
                    { name: 'DNS', duration: perf.domainLookupEnd - perf.domainLookupStart },
                    { name: 'TCP', duration: perf.connectEnd - perf.connectStart },
                    { name: 'TTFB', duration: perf.responseStart - perf.requestStart },
                    { name: 'Download', duration: perf.responseEnd - perf.responseStart },
                    { name: 'DOM Parse', duration: perf.domInteractive - perf.responseEnd },
                    { name: 'DOM Ready', duration: perf.domComplete - perf.domLoading },
                    { name: 'Load', duration: perf.loadEventEnd - perf.loadEventStart }
                ];
                this._perfData.webVitals.TTFB = Math.round(perf.responseStart - perf.requestStart);
            }
        } catch (e) {
            console.warn('[Dashboard] Performance API 不可用:', e.message);
        }

        // 使用 PerformanceObserver 监听 LCP
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this._perfData.webVitals.LCP = Math.round(lastEntry.startTime);
                });
                lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
                this._observers.push(lcpObserver);
            }
        } catch (e) { /* LCP Observer 不可用 */ }

        // 使用 PerformanceObserver 监听 FID
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                const fidObserver = new PerformanceObserver((list) => {
                    const entry = list.getEntries()[0];
                    this._perfData.webVitals.FID = Math.round(entry.processingStart - entry.startTime);
                });
                fidObserver.observe({ type: 'first-input', buffered: true });
                this._observers.push(fidObserver);
            }
        } catch (e) { /* FID 不可用 */ }

        // 使用 PerformanceObserver 监听 CLS
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                let clsValue = 0;
                const clsObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                    this._perfData.webVitals.CLS = Math.round(clsValue * 1000) / 1000;
                });
                clsObserver.observe({ type: 'layout-shift', buffered: true });
                this._observers.push(clsObserver);
            }
        } catch (e) { /* CLS 不可用 */ }

        // 使用 PerformanceObserver 监听 INP
        try {
            if (typeof PerformanceObserver !== 'undefined') {
                let maxINP = 0;
                const inpObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        const duration = entry.duration;
                        if (duration > maxINP) {
                            maxINP = duration;
                        }
                    }
                    this._perfData.webVitals.INP = Math.round(maxINP);
                });
                inpObserver.observe({ type: 'event', buffered: true });
                this._observers.push(inpObserver);
            }
        } catch (e) { /* INP 不可用 */ }

        // 模拟模块初始化耗时数据（实际项目中可通过 bus 事件收集）
        this._perfData.moduleInitTimes = {
            'MermaidModule': 12.5,
            'SidebarModule': 2.1,
            'NavigationModule': 3.8,
            'BackToTopModule': 1.2,
            'AccordionModule': 4.5,
            'PerformanceModule': 1.8,
            'KeyboardModule': 2.3,
            'SearchModule': 8.7,
            'ThemeModule': 3.2,
            'LazyLoadModule': 1.5,
            'PrintModule': 0.8,
            'ToastModule': 1.1,
            'WebVitalsModule': 2.6,
            'TocModule': 5.4,
            'CodeCopyModule': 3.1,
            'KeyboardNavModule': 2.9,
            'ShareModule': 1.7,
            'VersionLogModule': 2.0,
            'A11yModule': 3.5,
            'ExplorerModule': 6.2,
            'I18nModule': 4.1,
            'DashboardModule': 1.0
        };

        if (window.AppCore) {
            window.AppCore.logger.info('Dashboard', '性能数据收集完成');
        }
    },

    /**
     * 销毁模块
     */
    destroy() {
        this.close();

        // 断开所有 PerformanceObserver
        this._observers.forEach(observer => observer.disconnect());
        this._observers = [];

        // 移除所有绑定的事件监听
        this._boundEvents.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });
        this._boundEvents = [];

        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
        if (window.AppCore) {
            window.AppCore.logger.info('Dashboard', '数据可视化仪表盘模块已销毁');
        }
    }
};

// ==================== 全局暴露 ====================
window.DashboardModule = DashboardModule;

// 导出（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardModule };
}
