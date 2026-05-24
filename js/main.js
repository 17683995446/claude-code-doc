/**
 * Claude Code Architecture Documentation - 主脚本文件
 * 模块化JS - 核心配置、状态管理、DOM工具、基础模块
 *
 * 依赖：
 * - js/core.js (AppCore 事件总线、模块注册、日志)
 * - Mermaid.js (图表渲染，可选)
 *
 * @version 3.0.0
 * @author Claude Code Architecture Team
 */

// ==================== Configuration ====================
const CONFIG = {
    mermaid: {
        startOnLoad: true,
        theme: 'dark',
        themeVariables: {
            primaryColor: '#1a1a2e',
            primaryTextColor: '#e8e8f0',
            primaryBorderColor: '#e87e2f',
            lineColor: '#6db3f2',
            secondaryColor: '#16213e',
            tertiaryColor: '#0d1117',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: '13px'
        },
        flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 12,
            nodeSpacing: 25,
            rankSpacing: 40
        },
        sequence: {
            mirrorActors: false,
            wrap: true,
            width: 160,
            height: 45,
            noteMargin: 10,
            boxMargin: 8
        },
        stateDiagram: {
            labelHeight: 30,
            labelWidth: 100
        }
    },
    sidebar: {
        width: 280,
        breakpoint: 900
    },
    scroll: {
        offset: 100,
        smooth: true
    }
};

// ==================== State Management ====================
/**
 * 状态管理器
 * 使用 AppCore.bus 发布状态变更事件（替代直接 CustomEvent）
 */
const State = {
    sidebarOpen: true,
    activeSection: '',
    scrollPosition: 0,

    /**
     * 设置状态值并通过事件总线通知
     * @param {string} key - 状态键名
     * @param {*} value - 状态值
     */
    set(key, value) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('State', 'set', { key, value });
        }

        // [BUG-ROUND9-005修复] 扩展危险key列表，防止方法覆盖
        const forbiddenKeys = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'set', 'get', 'init'];
        if (forbiddenKeys.includes(key)) {
            console.warn(`[State] 拒绝设置危险 key: "${key}"`);
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('State', `拒绝设置危险key: ${key}`);
            }
            return;
        }

        const oldValue = this[key];
        this[key] = value;

        if (window.DetailedLogger) {
            window.DetailedLogger.stateChange('State', key, oldValue, value);
        }

        // 通过 AppCore.bus 发布事件
        if (window.AppCore && window.AppCore.bus) {
            // [BUG-ROUND9-014修复] 添加DetailedLogger存在性检查
            if (window.DetailedLogger) {
                window.DetailedLogger.debug('State', `发布状态变更事件: state:${key}`);
            }
            window.AppCore.bus.emit(`state:${key}`, { value: this[key] });
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('State', 'set');
        }
    },

    /**
     * 获取状态值
     * @param {string} key - 状态键名
     * @returns {*} 状态值
     */
    get(key) {
        if (window.DetailedLogger) {
            window.DetailedLogger.debug('State', `get: ${key}`, { value: this[key] });
        }
        return this[key];
    },

    /**
     * 初始化状态管理器
     * 设置默认事件监听器
     */
    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('State', 'init');
        }

        // 设置默认监听器来处理状态变更事件
        if (window.AppCore && window.AppCore.bus) {
            // 订阅所有状态变更事件，防止"无监听器"警告
            const stateKeys = ['sidebarOpen', 'activeSection', 'scrollPosition', 'testKey', 'testCounter', 'testRandom', 'testObject', 'longTestCounter'];

            stateKeys.forEach(key => {
                window.AppCore.bus.on(`state:${key}`, (data) => {
                    if (window.DetailedLogger) {
                        window.DetailedLogger.debug('State', `监听到状态变更: ${key}`, data);
                    }
                });
            });

            if (window.DetailedLogger) {
                window.DetailedLogger.debug('State', `已注册${stateKeys.length}个状态变更监听器`);
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.info('State', '状态管理器初始化完成');
            window.DetailedLogger.exit('State', 'init');
        }

        return this;
    }
};

// ==================== DOM Utilities ====================
const DOM = {
    $(selector) {
        // [BUG-ROUND9-001修复] 添加空值和无效selector检查
        if (selector == null || typeof selector !== 'string' || selector.trim() === '') {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('DOM', `$ query: 无效selector (${selector})`);
            }
            return null;
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.debug('DOM', `$ query: ${selector}`);
        }
        try {
            const el = document.querySelector(selector);
            if (window.DetailedLogger) {
                window.DetailedLogger.dom('DOM', 'querySelector', el, { selector });
            }
            return el;
        } catch (e) {
            if (window.DetailedLogger) {
                window.DetailedLogger.error('DOM', `querySelector失败: ${selector}`, { error: e.message });
            }
            return null;
        }
    },

    $$(selector) {
        // [BUG-ROUND9-002修复] 添加空值和无效selector检查
        if (selector == null || typeof selector !== 'string' || selector.trim() === '') {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('DOM', `$$ queryAll: 无效selector (${selector})`);
            }
            return [];
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.debug('DOM', `$$ queryAll: ${selector}`);
        }
        try {
            const els = document.querySelectorAll(selector);
            if (window.DetailedLogger) {
                window.DetailedLogger.debug('DOM', `queryAll结果: ${els.length}个元素`, { selector });
            }
            return els;
        } catch (e) {
            if (window.DetailedLogger) {
                window.DetailedLogger.error('DOM', `queryAll失败: ${selector}`, { error: e.message });
            }
            return [];
        }
    },

    on(element, event, handler, options = {}) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('DOM', 'on', { event, options });
        }

        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element) {
            element.addEventListener(event, handler, options);
            if (window.DetailedLogger) {
                window.DetailedLogger.dom('DOM', 'addEventListener', element, { event });
            }
        } else {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('DOM', `addEventListener失败: 元素不存在`);
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('DOM', 'on');
        }
        return this;
    },

    off(element, event, handler) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('DOM', 'off', { event });
        }

        if (typeof element === 'string') {
            element = this.$(element);
        }
        if (element && handler) {
            element.removeEventListener(event, handler);
            if (window.DetailedLogger) {
                window.DetailedLogger.dom('DOM', 'removeEventListener', element, { event });
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('DOM', 'off');
        }
        return this;
    },

    addClass(element, className) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('DOM', 'addClass', { className });
        }
        if (element) {
            element.classList.add(className);
            if (window.DetailedLogger) {
                window.DetailedLogger.dom('DOM', 'addClass', element, { className });
            }
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.exit('DOM', 'addClass');
        }
        return this;
    },

    removeClass(element, className) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('DOM', 'removeClass', { className });
        }
        if (element) {
            element.classList.remove(className);
            if (window.DetailedLogger) {
                window.DetailedLogger.dom('DOM', 'removeClass', element, { className });
            }
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.exit('DOM', 'removeClass');
        }
        return this;
    },

    toggleClass(element, className) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('DOM', 'toggleClass', { className });
        }
        // [BUG-ROUND9-003修复] 添加空值检查
        if (element && className) {
            const result = element.classList.toggle(className);
            if (window.DetailedLogger) {
                window.DetailedLogger.dom('DOM', 'toggleClass', element, { className, result });
            }
        } else if (window.DetailedLogger) {
            window.DetailedLogger.warn('DOM', 'toggleClass: 元素或类名为空');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.exit('DOM', 'toggleClass');
        }
        return this;
    },

    hasClass(element, className) {
        const result = element ? element.classList.contains(className) : false;
        if (window.DetailedLogger) {
            window.DetailedLogger.debug('DOM', `hasClass: ${className}`, { result });
        }
        return result;
    }
};

// ==================== Mermaid Module ====================
const MermaidModule = {
    initialized: false,
    _logger: 'Mermaid',

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('MermaidModule', 'init');
        }

        if (typeof mermaid === 'undefined') {
            if (window.AppCore) {
                window.AppCore.logger.warn(this._logger, 'Mermaid.js 未加载，图表将无法渲染');
            }
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('MermaidModule', 'Mermaid.js未加载');
            }
            return this;
        }

        mermaid.initialize(CONFIG.mermaid);
        this.initialized = true;

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, 'Mermaid 初始化完成');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('MermaidModule', '初始化完成');
            window.DetailedLogger.exit('MermaidModule', 'init');
        }
        return this;
    },

    render(element) {
        if (!this.initialized) {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('MermaidModule', 'render: 未初始化');
            }
            return;
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.enter('MermaidModule', 'render');
        }

        try {
            mermaid.run({ nodes: [element] });
            if (window.DetailedLogger) {
                window.DetailedLogger.debug('MermaidModule', '渲染成功');
            }
        } catch (e) {
            if (window.AppCore) {
                window.AppCore.logger.error(this._logger, '图表渲染失败', e);
            }
            if (window.DetailedLogger) {
                window.DetailedLogger.error('MermaidModule', '渲染失败', { error: e.message });
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('MermaidModule', 'render');
        }
    },

    renderAll() {
        if (!this.initialized) {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('MermaidModule', 'renderAll: 未初始化');
            }
            return;
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.enter('MermaidModule', 'renderAll');
        }

        const diagrams = DOM.$$('.mermaid');
        if (window.DetailedLogger) {
            window.DetailedLogger.debug('MermaidModule', `渲染${diagrams.length}个图表`);
        }

        diagrams.forEach((el, index) => {
            if (window.DetailedLogger) {
                window.DetailedLogger.debug('MermaidModule', `渲染图表 #${index}`);
            }
            this.render(el);
        });

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('MermaidModule', 'renderAll');
        }
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('MermaidModule', 'destroy');
        }

        this.initialized = false;

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, 'Mermaid 模块已销毁');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('MermaidModule', '已销毁');
            window.DetailedLogger.exit('MermaidModule', 'destroy');
        }
    }
};

// ==================== Sidebar Module ====================
const SidebarModule = {
    sidebar: null,
    main: null,
    toggle: null,
    _logger: 'Sidebar',
    _boundEvents: [],

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('SidebarModule', 'init');
        }

        this.sidebar = DOM.$('#sidebar');
        this.main = DOM.$('#main');
        this.toggle = DOM.$('#sidebarToggle');

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('SidebarModule', 'DOM元素查询结果', {
                sidebar: !!this.sidebar,
                main: !!this.main,
                toggle: !!this.toggle
            });
        }

        if (!this.sidebar || !this.main || !this.toggle) {
            if (window.AppCore) {
                window.AppCore.logger.warn(this._logger, '侧边栏元素未找到');
            }
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('SidebarModule', '侧边栏元素未找到');
                window.DetailedLogger.exit('SidebarModule', 'init');
            }
            return this;
        }

        this.bindEvents();
        this.checkResponsive();

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '侧边栏模块初始化完成');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('SidebarModule', '初始化完成');
            window.DetailedLogger.exit('SidebarModule', 'init');
        }
        return this;
    },

    bindEvents() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('SidebarModule', 'bindEvents');
        }

        // 侧边栏切换
        const toggleHandler = () => this.toggleSidebar();
        DOM.on(this.toggle, 'click', toggleHandler);
        this._boundEvents.push({ el: this.toggle, event: 'click', handler: toggleHandler });

        // 键盘快捷键 Ctrl+[
        const keyHandler = (e) => {
            if (e.key === '[' && e.ctrlKey) {
                if (window.DetailedLogger) {
                    window.DetailedLogger.debug('SidebarModule', '快捷键触发: Ctrl+[');
                }
                this.toggleSidebar();
            }
        };
        DOM.on(document, 'keydown', keyHandler);
        this._boundEvents.push({ el: document, event: 'keydown', handler: keyHandler });

        // 窗口大小变化
        const resizeHandler = window.AppCore?.utils?.debounce
            ? AppCore.utils.debounce(() => this.checkResponsive(), 200)
            : () => this.checkResponsive();
        DOM.on(window, 'resize', resizeHandler);
        this._boundEvents.push({ el: window, event: 'resize', handler: resizeHandler });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('SidebarModule', `绑定${this._boundEvents.length}个事件`);
            window.DetailedLogger.exit('SidebarModule', 'bindEvents');
        }

        return this;
    },

    toggleSidebar() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('SidebarModule', 'toggleSidebar');
        }

        DOM.toggleClass(this.sidebar, 'collapsed');
        DOM.toggleClass(this.main, 'expanded');
        DOM.toggleClass(this.toggle, 'collapsed');

        const isOpen = !DOM.hasClass(this.sidebar, 'collapsed');

        if (window.DetailedLogger) {
            window.DetailedLogger.stateChange('SidebarModule', 'sidebarOpen', !isOpen, isOpen);
        }

        State.set('sidebarOpen', isOpen);

        // 更新切换图标
        this.toggle.textContent = isOpen ? '◀' : '▶';

        if (window.DetailedLogger) {
            window.DetailedLogger.dom('SidebarModule', '更新图标', this.toggle, { text: this.toggle.textContent });
        }

        // 通过事件总线发布
        if (window.AppCore) {
            window.AppCore.bus.emit('sidebar:toggle', { open: isOpen });
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.info('SidebarModule', `侧边栏状态: ${isOpen ? '打开' : '关闭'}`);
            window.DetailedLogger.exit('SidebarModule', 'toggleSidebar');
        }

        return this;
    },

    open() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('SidebarModule', 'open');
        }

        DOM.removeClass(this.sidebar, 'collapsed');
        DOM.removeClass(this.main, 'expanded');
        DOM.removeClass(this.toggle, 'collapsed');
        this.toggle.textContent = '◀';
        State.set('sidebarOpen', true);

        if (window.DetailedLogger) {
            window.DetailedLogger.info('SidebarModule', '打开侧边栏');
            window.DetailedLogger.exit('SidebarModule', 'open');
        }
        return this;
    },

    close() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('SidebarModule', 'close');
        }

        DOM.addClass(this.sidebar, 'collapsed');
        DOM.addClass(this.main, 'expanded');
        DOM.addClass(this.toggle, 'collapsed');
        this.toggle.textContent = '▶';
        State.set('sidebarOpen', false);

        if (window.DetailedLogger) {
            window.DetailedLogger.info('SidebarModule', '关闭侧边栏');
            window.DetailedLogger.exit('SidebarModule', 'close');
        }
        return this;
    },

    checkResponsive() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('SidebarModule', 'checkResponsive');
        }

        const width = window.innerWidth;
        const shouldClose = width <= CONFIG.sidebar.breakpoint;

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('SidebarModule', '响应式检查', {
                windowWidth: width,
                breakpoint: CONFIG.sidebar.breakpoint,
                shouldClose
            });
        }

        // [BUG-ROUND9-015修复] 仅在状态变化时才调用close，避免冗余事件
        if (shouldClose && !DOM.hasClass(this.sidebar, 'collapsed')) {
            this.close();
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('SidebarModule', 'checkResponsive');
        }
        return this;
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('SidebarModule', 'destroy');
        }

        // 移除所有绑定的事件
        this._boundEvents.forEach(({ el, event, handler }) => {
            DOM.off(el, event, handler);
        });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('SidebarModule', `移除${this._boundEvents.length}个事件监听`);
        }

        this._boundEvents = [];

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '侧边栏模块已销毁');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('SidebarModule', '已销毁');
            window.DetailedLogger.exit('SidebarModule', 'destroy');
        }
    }
};

// ==================== Navigation Module ====================
const NavigationModule = {
    sections: [],
    navLinks: [],
    _logger: 'Navigation',
    _boundEvents: [],

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('NavigationModule', 'init');
        }

        this.sections = Array.from(DOM.$$('.section'));
        this.navLinks = Array.from(DOM.$$('.sidebar-nav a[href^="#"]'));

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('NavigationModule', '查询元素', {
                sections: this.sections.length,
                navLinks: this.navLinks.length
            });
        }

        if (!this.sections.length || !this.navLinks.length) {
            if (window.AppCore) {
                window.AppCore.logger.warn(this._logger, '导航元素未找到');
            }
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('NavigationModule', '导航元素未找到');
                window.DetailedLogger.exit('NavigationModule', 'init');
            }
            return this;
        }

        this.bindEvents();
        this.updateActive();

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '导航模块初始化完成');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('NavigationModule', '初始化完成');
            window.DetailedLogger.exit('NavigationModule', 'init');
        }
        return this;
    },

    bindEvents() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('NavigationModule', 'bindEvents');
        }

        // 平滑滚动导航链接
        this.navLinks.forEach((link, index) => {
            const clickHandler = (e) => {
                if (window.DetailedLogger) {
                    window.DetailedLogger.event('NavigationModule', 'click', link, { index });
                }
                e.preventDefault();
                const targetId = link.getAttribute('href').slice(1);
                this.scrollToSection(targetId);
            };
            DOM.on(link, 'click', clickHandler);
            this._boundEvents.push({ el: link, event: 'click', handler: clickHandler });
        });

        // 滚动监听
        const scrollHandler = window.AppCore?.utils?.throttle
            ? AppCore.utils.throttle(() => this.updateActive(), 100)
            : () => this.updateActive();
        DOM.on(window, 'scroll', scrollHandler, { passive: true });
        this._boundEvents.push({ el: window, event: 'scroll', handler: scrollHandler });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('NavigationModule', `绑定${this._boundEvents.length}个事件`);
            window.DetailedLogger.exit('NavigationModule', 'bindEvents');
        }

        return this;
    },

    scrollToSection(sectionId) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('NavigationModule', 'scrollToSection', { sectionId });
        }

        // [BUG-ROUND7-001修复] 添加空sectionId检查，防止querySelector报错
        if (!sectionId || sectionId.trim() === '') {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('NavigationModule', 'sectionId为空，跳过滚动');
                window.DetailedLogger.exit('NavigationModule', 'scrollToSection');
            }
            return this;
        }

        const section = DOM.$(`#${sectionId}`);
        if (section) {
            const offset = CONFIG.scroll.offset;
            const top = section.offsetTop - offset;

            if (window.DetailedLogger) {
                window.DetailedLogger.debug('NavigationModule', '滚动到位置', { top, offset });
            }

            window.scrollTo({
                top,
                behavior: CONFIG.scroll.smooth ? 'smooth' : 'auto'
            });

            // 更新 URL hash（不触发页面跳转）
            history.pushState(null, null, `#${sectionId}`);

            if (window.DetailedLogger) {
                window.DetailedLogger.debug('NavigationModule', 'URL hash更新', { hash: `#${sectionId}` });
            }

            // 通过事件总线发布导航事件
            if (window.AppCore) {
                window.AppCore.bus.emit('navigation:scroll', { sectionId });
            }
        } else {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('NavigationModule', `未找到章节: ${sectionId}`);
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('NavigationModule', 'scrollToSection');
        }
        return this;
    },

    updateActive() {
        const scrollY = window.scrollY;
        let current = '';

        this.sections.forEach(section => {
            const sectionTop = section.offsetTop - CONFIG.scroll.offset - 50;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        if (current !== State.activeSection) {
            if (window.DetailedLogger) {
                window.DetailedLogger.stateChange('NavigationModule', 'activeSection', State.activeSection, current);
            }

            State.set('activeSection', current);

            this.navLinks.forEach(link => {
                const href = link.getAttribute('href').slice(1);
                if (href === current) {
                    DOM.addClass(link, 'active');
                } else {
                    DOM.removeClass(link, 'active');
                }
            });
        }

        return this;
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('NavigationModule', 'destroy');
        }

        this._boundEvents.forEach(({ el, event, handler }) => {
            DOM.off(el, event, handler);
        });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('NavigationModule', `移除${this._boundEvents.length}个事件监听`);
        }

        this._boundEvents = [];
        this.sections = [];
        this.navLinks = [];

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '导航模块已销毁');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('NavigationModule', '已销毁');
            window.DetailedLogger.exit('NavigationModule', 'destroy');
        }
    }
};

// ==================== BackToTop Module ====================
const BackToTopModule = {
    button: null,
    visible: false,
    _logger: 'BackToTop',
    _boundEvents: [],

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('BackToTopModule', 'init');
        }

        this.button = DOM.$('#backToTop');

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('BackToTopModule', 'DOM查询结果', { button: !!this.button });
        }

        if (!this.button) {
            if (window.AppCore) {
                window.AppCore.logger.warn(this._logger, '返回顶部按钮未找到');
            }
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('BackToTopModule', '返回顶部按钮未找到');
                window.DetailedLogger.exit('BackToTopModule', 'init');
            }
            return this;
        }

        this.bindEvents();

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '返回顶部模块初始化完成');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('BackToTopModule', '初始化完成');
            window.DetailedLogger.exit('BackToTopModule', 'init');
        }
        return this;
    },

    bindEvents() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('BackToTopModule', 'bindEvents');
        }

        const clickHandler = () => this.scrollToTop();
        DOM.on(this.button, 'click', clickHandler);
        this._boundEvents.push({ el: this.button, event: 'click', handler: clickHandler });

        const scrollHandler = window.AppCore?.utils?.throttle
            ? AppCore.utils.throttle(() => this.checkVisibility(), 200)
            : () => this.checkVisibility();
        DOM.on(window, 'scroll', scrollHandler, { passive: true });
        this._boundEvents.push({ el: window, event: 'scroll', handler: scrollHandler });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('BackToTopModule', `绑定${this._boundEvents.length}个事件`);
            window.DetailedLogger.exit('BackToTopModule', 'bindEvents');
        }

        return this;
    },

    scrollToTop() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('BackToTopModule', 'scrollToTop');
        }

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        if (window.DetailedLogger) {
            window.DetailedLogger.info('BackToTopModule', '滚动到顶部');
            window.DetailedLogger.exit('BackToTopModule', 'scrollToTop');
        }
        return this;
    },

    checkVisibility() {
        const shouldShow = window.scrollY > 500;

        if (shouldShow !== this.visible) {
            this.visible = shouldShow;

            if (window.DetailedLogger) {
                window.DetailedLogger.stateChange('BackToTopModule', 'visible', !shouldShow, shouldShow);
            }

            if (shouldShow) {
                DOM.addClass(this.button, 'visible');
            } else {
                DOM.removeClass(this.button, 'visible');
            }
        }

        return this;
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('BackToTopModule', 'destroy');
        }

        this._boundEvents.forEach(({ el, event, handler }) => {
            DOM.off(el, event, handler);
        });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('BackToTopModule', `移除${this._boundEvents.length}个事件监听`);
        }

        this._boundEvents = [];
        this.visible = false;

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '返回顶部模块已销毁');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('BackToTopModule', '已销毁');
            window.DetailedLogger.exit('BackToTopModule', 'destroy');
        }
    }
};

// ==================== Accordion Module ====================
const AccordionModule = {
    items: [],
    _logger: 'Accordion',
    _boundEvents: [],

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AccordionModule', 'init');
        }

        this.items = Array.from(DOM.$$('.accordion-item'));

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('AccordionModule', `找到${this.items.length}个手风琴项`);
        }

        if (!this.items.length) {
            if (window.DetailedLogger) {
                window.DetailedLogger.exit('AccordionModule', 'init');
            }
            return this;
        }

        this.bindEvents();

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '手风琴模块初始化完成');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('AccordionModule', '初始化完成');
            window.DetailedLogger.exit('AccordionModule', 'init');
        }
        return this;
    },

    bindEvents() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AccordionModule', 'bindEvents');
        }

        this.items.forEach((item, index) => {
            const header = item.querySelector('.accordion-header');
            if (header) {
                const clickHandler = () => {
                    if (window.DetailedLogger) {
                        window.DetailedLogger.event('AccordionModule', 'click', header, { index });
                    }
                    this.toggle(item);
                };
                DOM.on(header, 'click', clickHandler);
                this._boundEvents.push({ el: header, event: 'click', handler: clickHandler });
            }
        });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('AccordionModule', `绑定${this._boundEvents.length}个事件`);
            window.DetailedLogger.exit('AccordionModule', 'bindEvents');
        }

        return this;
    },

    toggle(item) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AccordionModule', 'toggle');
        }

        const wasOpen = item.classList.contains('open');
        DOM.toggleClass(item, 'open');
        const isOpen = item.classList.contains('open');

        if (window.DetailedLogger) {
            window.DetailedLogger.stateChange('AccordionModule', 'open', wasOpen, isOpen);
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('AccordionModule', 'toggle');
        }
        return this;
    },

    open(item) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AccordionModule', 'open');
        }

        DOM.addClass(item, 'open');

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('AccordionModule', 'open');
        }
        return this;
    },

    close(item) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AccordionModule', 'close');
        }

        DOM.removeClass(item, 'open');

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('AccordionModule', 'close');
        }
        return this;
    },

    openAll() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AccordionModule', 'openAll');
        }

        this.items.forEach(item => this.open(item));

        if (window.DetailedLogger) {
            window.DetailedLogger.info('AccordionModule', `打开全部${this.items.length}个手风琴项`);
            window.DetailedLogger.exit('AccordionModule', 'openAll');
        }
        return this;
    },

    closeAll() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AccordionModule', 'closeAll');
        }

        this.items.forEach(item => this.close(item));

        if (window.DetailedLogger) {
            window.DetailedLogger.info('AccordionModule', `关闭全部${this.items.length}个手风琴项`);
            window.DetailedLogger.exit('AccordionModule', 'closeAll');
        }
        return this;
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AccordionModule', 'destroy');
        }

        this._boundEvents.forEach(({ el, event, handler }) => {
            DOM.off(el, event, handler);
        });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('AccordionModule', `移除${this._boundEvents.length}个事件监听`);
        }

        this._boundEvents = [];
        this.items = [];

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '手风琴模块已销毁');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('AccordionModule', '已销毁');
            window.DetailedLogger.exit('AccordionModule', 'destroy');
        }
    }
};

// ==================== Tooltip Module ====================
const TooltipModule = {
    _logger: 'Tooltip',

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('TooltipModule', 'init');
            window.DetailedLogger.info('TooltipModule', '提示模块就绪');
            window.DetailedLogger.exit('TooltipModule', 'init');
        }
        return this;
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('TooltipModule', 'destroy');
            window.DetailedLogger.info('TooltipModule', '提示模块已销毁');
            window.DetailedLogger.exit('TooltipModule', 'destroy');
        }
    }
};

// ==================== Analytics Module ====================
const AnalyticsModule = {
    enabled: false,
    _logger: 'Analytics',

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AnalyticsModule', 'init');
        }

        this.enabled = localStorage.getItem('analytics') === 'true';

        if (window.DetailedLogger) {
            window.DetailedLogger.stateChange('AnalyticsModule', 'enabled', !this.enabled, this.enabled);
        }

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '分析模块就绪');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('AnalyticsModule', '初始化完成');
            window.DetailedLogger.exit('AnalyticsModule', 'init');
        }
        return this;
    },

    track(event, data = {}) {
        if (!this.enabled) return this;

        if (window.AppCore) {
            window.AppCore.logger.debug(this._logger, `事件: ${event}`, data);
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.debug('AnalyticsModule', `track: ${event}`, data);
        }
        return this;
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('AnalyticsModule', 'destroy');
        }

        this.enabled = false;

        if (window.DetailedLogger) {
            window.DetailedLogger.info('AnalyticsModule', '已销毁');
            window.DetailedLogger.exit('AnalyticsModule', 'destroy');
        }
    }
};

// ==================== Performance Module ====================
const PerformanceModule = {
    metrics: {},
    _logger: 'Performance',

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('PerformanceModule', 'init');
        }

        this.measurePageLoad();

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '性能监控模块初始化完成');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('PerformanceModule', '初始化完成');
            window.DetailedLogger.exit('PerformanceModule', 'init');
        }
        return this;
    },

    measurePageLoad() {
        if (typeof performance === 'undefined') {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('PerformanceModule', 'performance API不可用');
            }
            return this;
        }

        // [BUG-ROUND9-013修复] 保存load handler引用以便destroy时清理
        this._loadHandler = () => {
            setTimeout(() => {
                // 优先使用 PerformanceNavigationTiming API
                const entries = performance.getEntriesByType('navigation');
                if (entries.length > 0) {
                    const timing = entries[0];
                    this.metrics = {
                        dns: timing.domainLookupEnd - timing.domainLookupStart,
                        tcp: timing.connectEnd - timing.connectStart,
                        request: timing.responseStart - timing.requestStart,
                        response: timing.responseEnd - timing.responseStart,
                        dom: timing.domComplete - timing.domInteractive,
                        total: timing.loadEventEnd - timing.startTime
                    };
                } else if (performance.timing) {
                    // 降级到 performance.timing
                    const timing = performance.timing;
                    this.metrics = {
                        dns: timing.domainLookupEnd - timing.domainLookupStart,
                        tcp: timing.connectEnd - timing.connectStart,
                        request: timing.responseStart - timing.requestStart,
                        response: timing.responseEnd - timing.responseStart,
                        dom: timing.domComplete - timing.domInteractive,
                        total: timing.loadEventEnd - timing.navigationStart
                    };
                }

                if (window.AppCore) {
                    window.AppCore.logger.info(this._logger, '性能指标已采集', this.metrics);
                }
                if (window.DetailedLogger) {
                    window.DetailedLogger.info('PerformanceModule', '性能指标已采集', this.metrics);
                }
            }, 0);
        };
        window.addEventListener('load', this._loadHandler);

        return this;
    },

    getMetrics() {
        return this.metrics;
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('PerformanceModule', 'destroy');
        }

        // [BUG-ROUND9-013修复] 清理load事件监听器
        if (this._loadHandler) {
            window.removeEventListener('load', this._loadHandler);
            this._loadHandler = null;
        }

        this.metrics = {};

        if (window.DetailedLogger) {
            window.DetailedLogger.info('PerformanceModule', '已销毁');
            window.DetailedLogger.exit('PerformanceModule', 'destroy');
        }
    }
};

// ==================== Keyboard Shortcuts ====================
const KeyboardModule = {
    shortcuts: new Map(),
    _logger: 'Keyboard',
    _boundHandler: null,

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('KeyboardModule', 'init');
        }

        this.register('t', () => BackToTopModule.scrollToTop());
        this.register('s', () => SidebarModule.toggleSidebar());
        this.register('/', () => this.focusSearch());

        this._boundHandler = (e) => this.handleKeydown(e);
        DOM.on(document, 'keydown', this._boundHandler);

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('KeyboardModule', `注册${this.shortcuts.size}个快捷键`);
        }

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '键盘快捷键模块初始化完成');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('KeyboardModule', '初始化完成');
            window.DetailedLogger.exit('KeyboardModule', 'init');
        }
        return this;
    },

    register(key, handler, modifiers = {}) {
        if (window.DetailedLogger) {
            window.DetailedLogger.debug('KeyboardModule', `注册快捷键: ${key}`, { modifiers });
        }
        this.shortcuts.set(key.toLowerCase(), { handler, modifiers });
        return this;
    },

    handleKeydown(e) {
        // 输入框中不触发快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        const key = e.key.toLowerCase();
        const shortcut = this.shortcuts.get(key);

        if (shortcut) {
            const { modifiers } = shortcut;

            if (modifiers.ctrl && !e.ctrlKey) return;
            if (modifiers.alt && !e.altKey) return;
            if (modifiers.shift && !e.shiftKey) return;

            if (window.DetailedLogger) {
                window.DetailedLogger.event('KeyboardModule', 'shortcut', null, { key, modifiers });
            }

            e.preventDefault();
            shortcut.handler();
        }
    },

    focusSearch() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('KeyboardModule', 'focusSearch');
        }

        const searchInput = DOM.$('#search-input');
        if (searchInput) {
            searchInput.focus();
            if (window.DetailedLogger) {
                window.DetailedLogger.debug('KeyboardModule', '搜索框已聚焦');
            }
        } else {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('KeyboardModule', '搜索框未找到');
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('KeyboardModule', 'focusSearch');
        }
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('KeyboardModule', 'destroy');
        }

        if (this._boundHandler) {
            DOM.off(document, 'keydown', this._boundHandler);
            this._boundHandler = null;
        }
        this.shortcuts.clear();

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '键盘快捷键模块已销毁');
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('KeyboardModule', '已销毁');
            window.DetailedLogger.exit('KeyboardModule', 'destroy');
        }
    }
};

// ==================== App 对象（保留引用，但不自动初始化） ====================
const App = {
    modules: [],

    /**
     * 初始化所有核心模块
     * 注意：不再自动调用，由 HTML 中的统一初始化器调用
     */
    async init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('App', 'init');
            window.DetailedLogger.memory('App', '初始化前');
        }

        if (window.AppCore) {
            window.AppCore.logger.info('App', '开始初始化 Claude Code 架构文档...');
        }

        const startTime = performance.now();

        // 首先初始化 State 管理器（必须在其他模块之前）
        State.init();

        this.modules = [
            MermaidModule,
            SidebarModule,
            // [BUG-ROUND9-006修复] 将ThemeModule加入App.modules，确保init/destroy覆盖
            ...(typeof ThemeModule !== 'undefined' ? [ThemeModule] : []),
            NavigationModule,
            BackToTopModule,
            AccordionModule,
            TooltipModule,
            AnalyticsModule,
            PerformanceModule,
            KeyboardModule
        ];

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('App', `准备初始化${this.modules.length}个模块`);
        }

        let successCount = 0;
        let errorCount = 0;

        // [BUG-ROUND7-002修复] 正向初始化模块，确保依赖顺序正确
        for (let i = 0; i < this.modules.length; i++) {
            const module = this.modules[i];
            try {
                if (window.DetailedLogger) {
                    window.DetailedLogger.debug('App', `初始化模块: ${module._logger || 'Unknown'}`);
                }
                module.init();
                successCount++;
            } catch (e) {
                errorCount++;
                if (window.AppCore) {
                    window.AppCore.logger.error('App', `模块初始化失败`, e);
                }
                if (window.DetailedLogger) {
                    window.DetailedLogger.error('App', `模块初始化失败`, { error: e.message, stack: e.stack });
                }
            }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        if (window.AppCore) {
            window.AppCore.logger.info('App', `初始化完成，耗时 ${duration.toFixed(2)}ms`);
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('App', '初始化完成', {
                duration: `${duration.toFixed(2)}ms`,
                success: successCount,
                errors: errorCount
            });
            window.DetailedLogger.memory('App', '初始化后');
        }

        // 通过事件总线发布就绪事件
        if (window.AppCore && window.AppCore.bus) {
            window.AppCore.bus.emit('app:ready', { duration });
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('App', 'init');
        }

        return this;
    },

    /**
     * 销毁所有核心模块
     */
    async destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('App', 'destroy');
        }

        let successCount = 0;
        let errorCount = 0;

        // [BUG-ROUND7-003修复] 反向销毁模块，确保依赖者先于被依赖者销毁
        for (let i = this.modules.length - 1; i >= 0; i--) {
            const module = this.modules[i];
            try {
                if (typeof module.destroy === 'function') {
                    if (window.DetailedLogger) {
                        window.DetailedLogger.debug('App', `销毁模块: ${module._logger || 'Unknown'}`);
                    }
                    module.destroy();
                    successCount++;
                }
            } catch (e) {
                errorCount++;
                if (window.AppCore) {
                    window.AppCore.logger.error('App', `模块销毁失败`, e);
                }
                if (window.DetailedLogger) {
                    window.DetailedLogger.error('App', `模块销毁失败`, { error: e.message });
                }
            }
        }

        if (window.AppCore && window.AppCore.bus) {
            window.AppCore.bus.emit('app:destroyed', {});
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.info('App', '销毁完成', { success: successCount, errors: errorCount });
            window.DetailedLogger.exit('App', 'destroy');
        }

        return this;
    }
};

// ==================== 导出 ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        App,
        CONFIG,
        State,
        DOM,
        MermaidModule,
        SidebarModule,
        NavigationModule,
        BackToTopModule,
        AccordionModule
    };
}

// 全局访问（调试用）
window.ClaudeCodeDoc = {
    App,
    CONFIG,
    State,
    modules: {
        MermaidModule,
        SidebarModule,
        NavigationModule,
        BackToTopModule,
        AccordionModule
    }
};
