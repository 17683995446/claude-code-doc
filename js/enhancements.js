/**
 * Claude Code Architecture Documentation - 增强功能模块
 * WebVitals 性能监控、浮动目录、代码复制、键盘导航、分享功能、版本日志
 *
 * @version 2.0.0
 * @author Claude Code Architecture Team
 */

// ==================== WebVitalsModule ====================
/**
 * Web Vitals 性能监控
 * 监控 LCP、FID、CLS、TTFB、INP 等核心指标
 */
// 防止重复声明
if (typeof WebVitalsModule !== 'undefined') {
    // 模块已加载，跳过
} else {

const WebVitalsModule = window.WebVitalsModule = {
    metrics: {},
    reported: false,
    _logger: 'WebVitals',
    _observers: [],    // 存储 PerformanceObserver 引用，用于销毁

    init() {
        // 防止重复初始化
        if (document.getElementById('web-vitals-panel')) {
            return this;
        }
        this.measureLCP();
        this.measureFID();
        this.measureCLS();
        this.measureTTFB();
        this.measureINP();
        this.createMetricsUI();
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, 'WebVitals 模块初始化完成');
        }
        return this;
    },

    // Largest Contentful Paint (LCP)
    measureLCP() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const po = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.lcp = lastEntry.startTime;
                this.updateUI();
            });
            po.observe({ type: 'largest-contentful-paint', buffered: true });
            this._observers.push(po);
        } catch (e) { /* 不支持 */ }
    },

    // First Input Delay (FID)
    measureFID() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const po = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                entries.forEach(entry => {
                    this.metrics.fid = entry.processingStart - entry.startTime;
                    this.updateUI();
                });
            });
            po.observe({ type: 'first-input', buffered: true });
            this._observers.push(po);
        } catch (e) { /* 不支持 */ }
    },

    // Cumulative Layout Shift (CLS)
    measureCLS() {
        if (!('PerformanceObserver' in window)) return;

        let clsValue = 0;

        try {
            const po = new PerformanceObserver((entryList) => {
                entryList.getEntries().forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                this.metrics.cls = clsValue;
                this.updateUI();
            });
            po.observe({ type: 'layout-shift', buffered: true });
            this._observers.push(po);
        } catch (e) { /* 不支持 */ }
    },

    // Time to First Byte (TTFB)
    measureTTFB() {
        const navEntry = performance.getEntriesByType('navigation')[0];
        if (navEntry) {
            this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
            this.updateUI();
        }
    },

    // Interaction to Next Paint (INP)
    measureINP() {
        if (!('PerformanceObserver' in window)) return;

        try {
            let inpValue = 0;
            const po = new PerformanceObserver((entryList) => {
                entryList.getEntries().forEach(entry => {
                    if (entry.interactionId) {
                        inpValue = Math.max(inpValue, entry.duration);
                    }
                });
                this.metrics.inp = inpValue;
                this.updateUI();
            });
            po.observe({ type: 'event', durationThreshold: 16 });
            this._observers.push(po);
        } catch (e) { /* 不支持 */ }
    },

    createMetricsUI() {
        const panel = document.createElement('div');
        panel.id = 'web-vitals-panel';
        panel.className = 'web-vitals-panel no-print';
        panel.setAttribute('role', 'status');
        panel.setAttribute('aria-label', '性能指标');
        panel.innerHTML = `
            <div class="vitals-header">
                <span class="vitals-title">⚡ 性能</span>
                <button class="vitals-toggle" aria-label="展开性能指标">▼</button>
            </div>
            <div class="vitals-content" hidden>
                <div class="vital-item" id="vital-lcp">
                    <span class="vital-label">LCP</span>
                    <span class="vital-value">--</span>
                    <span class="vital-unit">ms</span>
                </div>
                <div class="vital-item" id="vital-fid">
                    <span class="vital-label">FID</span>
                    <span class="vital-value">--</span>
                    <span class="vital-unit">ms</span>
                </div>
                <div class="vital-item" id="vital-cls">
                    <span class="vital-label">CLS</span>
                    <span class="vital-value">--</span>
                    <span class="vital-unit"></span>
                </div>
                <div class="vital-item" id="vital-ttfb">
                    <span class="vital-label">TTFB</span>
                    <span class="vital-value">--</span>
                    <span class="vital-unit">ms</span>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // 绑定展开/收起
        const toggle = panel.querySelector('.vitals-toggle');
        const content = panel.querySelector('.vitals-content');
        if (toggle && content) {
            toggle.addEventListener('click', () => {
                const hidden = content.hidden;
                content.hidden = !hidden;
                toggle.textContent = hidden ? '▲' : '▼';
                toggle.setAttribute('aria-label', hidden ? '收起性能指标' : '展开性能指标');
            });
        }

        return this;
    },

    updateUI() {
        const updateItem = (id, value, thresholds) => {
            const item = document.getElementById(id);
            if (!item || value === undefined) return;

            const valueEl = item.querySelector('.vital-value');
            if (!valueEl) return;
            valueEl.textContent = value.toFixed(value < 10 ? 2 : 0);

            const [good, needsImprovement] = thresholds;
            item.classList.remove('vital-good', 'vital-warning', 'vital-poor');
            if (value <= good) {
                item.classList.add('vital-good');
            } else if (value <= needsImprovement) {
                item.classList.add('vital-warning');
            } else {
                item.classList.add('vital-poor');
            }
        };

        updateItem('vital-lcp', this.metrics.lcp, [2500, 4000]);
        updateItem('vital-fid', this.metrics.fid, [100, 300]);
        updateItem('vital-cls', this.metrics.cls, [0.1, 0.25]);
        updateItem('vital-ttfb', this.metrics.ttfb, [800, 1800]);

        return this;
    },

    getMetrics() {
        return { ...this.metrics };
    },

    destroy() {
        // 断开所有 PerformanceObserver
        this._observers.forEach(observer => observer.disconnect());
        this._observers = [];

        const panel = document.getElementById('web-vitals-panel');
        if (panel) panel.remove();
        this.metrics = {};
    }
};

// ==================== TocModule ====================
/**
 * 浮动目录大纲
 */
const TocModule = window.TocModule = {
    items: [],
    visible: false,
    _logger: 'Toc',
    _boundEvents: [],

    init() {
        // 防止重复初始化（LazyLoader idle preload 可能再次调用）
        if (document.getElementById('toc-panel')) {
            return this;
        }
        this.extractToc();
        this.createUI();
        this.bindEvents();
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '目录模块初始化完成');
        }
        return this;
    },

    extractToc() {
        const headings = document.querySelectorAll('.section h2, .section h3');
        this.items = Array.from(headings).map(h => {
            const section = h.closest('.section');
            return {
                id: section?.id || h.id,
                text: h.textContent.replace(/^[^\w]+\s*/, ''),
                level: parseInt(h.tagName[1]),
                element: h
            };
        }).filter(item => item.id);
        return this;
    },

    createUI() {
        const toc = document.createElement('div');
        toc.id = 'toc-panel';
        toc.className = 'toc-panel no-print';
        toc.setAttribute('role', 'navigation');
        toc.setAttribute('aria-label', '文档目录');
        toc.innerHTML = `
            <div class="toc-header">
                <span class="toc-title">📑 目录</span>
                <button class="toc-close" aria-label="关闭目录">×</button>
            </div>
            <nav class="toc-content">
                ${this.items.map(item => {
                    const escapedId = item.id.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    return `
                    <a href="#${escapedId}"
                       class="toc-item toc-level-${item.level}"
                       data-id="${escapedId}"
                       role="link">
                        ${item.text}
                    </a>
                `;}).join('')}
            </nav>
        `;
        document.body.appendChild(toc);

        // 创建触发按钮
        const trigger = document.createElement('button');
        trigger.id = 'toc-trigger';
        trigger.className = 'toc-trigger no-print';
        trigger.setAttribute('aria-label', '打开目录');
        trigger.innerHTML = '📑';
        document.body.appendChild(trigger);

        return this;
    },

    bindEvents() {
        const toc = document.getElementById('toc-panel');
        const trigger = document.getElementById('toc-trigger');
        const close = toc.querySelector('.toc-close');

        const triggerHandler = () => this.toggle();
        trigger.addEventListener('click', triggerHandler);
        this._boundEvents.push({ el: trigger, event: 'click', handler: triggerHandler });

        const closeHandler = () => this.hide();
        close.addEventListener('click', closeHandler);
        this._boundEvents.push({ el: close, event: 'click', handler: closeHandler });

        // 点击目录项
        toc.querySelectorAll('.toc-item').forEach(item => {
            const itemHandler = (e) => {
                e.preventDefault();
                const id = item.dataset.id;
                if (typeof NavigationModule !== 'undefined') {
                    NavigationModule.scrollToSection(id);
                }
                this.hide();
            };
            item.addEventListener('click', itemHandler);
            this._boundEvents.push({ el: item, event: 'click', handler: itemHandler });
        });

        // 滚动高亮
        const scrollHandler = window.AppCore?.utils?.throttle
            ? AppCore.utils.throttle(() => this.highlightCurrent(), 200)
            : () => this.highlightCurrent();
        window.addEventListener('scroll', scrollHandler, { passive: true });
        this._boundEvents.push({ el: window, event: 'scroll', handler: scrollHandler });

        // ESC 关闭
        const escHandler = (e) => {
            if (e.key === 'Escape' && this.visible) {
                this.hide();
            }
        };
        document.addEventListener('keydown', escHandler);
        this._boundEvents.push({ el: document, event: 'keydown', handler: escHandler });

        return this;
    },

    toggle() {
        this.visible ? this.hide() : this.show();
        return this;
    },

    show() {
        const toc = document.getElementById('toc-panel');
        toc.classList.add('visible');
        this.visible = true;
        return this;
    },

    hide() {
        const toc = document.getElementById('toc-panel');
        toc.classList.remove('visible');
        this.visible = false;
        return this;
    },

    highlightCurrent() {
        const scrollY = window.scrollY;
        let current = '';

        this.items.forEach(item => {
            const el = document.getElementById(item.id);
            if (el && scrollY >= el.offsetTop - 150) {
                current = item.id;
            }
        });

        document.querySelectorAll('.toc-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === current);
        });

        return this;
    },

    destroy() {
        this._boundEvents.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });
        this._boundEvents = [];
        const toc = document.getElementById('toc-panel');
        const trigger = document.getElementById('toc-trigger');
        if (toc) toc.remove();
        if (trigger) trigger.remove();
        this.items = [];
    }
};

// ==================== CodeCopyModule ====================
/**
 * 代码块复制
 */
const CodeCopyModule = window.CodeCopyModule = {
    _logger: 'CodeCopy',
    _buttons: [],

    init() {
        // 防止重复初始化
        if (document.querySelector('.code-copy-btn')) {
            return this;
        }
        this.addCopyButtons();
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '代码复制模块初始化完成');
        }
        return this;
    },

    addCopyButtons() {
        const codeBlocks = document.querySelectorAll('.code-block, pre');

        codeBlocks.forEach(block => {
            if (block.querySelector('.code-copy-btn')) return;

            const btn = document.createElement('button');
            btn.className = 'code-copy-btn no-print';
            btn.setAttribute('aria-label', '复制代码');
            btn.innerHTML = '📋';
            btn.title = '复制代码';

            const clickHandler = async () => {
                const code = block.querySelector('code')?.textContent?.trim() || block.textContent.replace('📋', '').trim();
                try {
                    await navigator.clipboard.writeText(code);
                    btn.innerHTML = '✅';
                    btn.title = '已复制';
                    if (typeof ToastModule !== 'undefined') {
                        ToastModule.show('代码已复制到剪贴板', 'success', 2000);
                    }
                    setTimeout(() => {
                        btn.innerHTML = '📋';
                        btn.title = '复制代码';
                    }, 2000);
                } catch (e) {
                    btn.innerHTML = '❌';
                    if (typeof ToastModule !== 'undefined') {
                        ToastModule.show('复制失败', 'error', 2000);
                    }
                }
            };
            btn.addEventListener('click', clickHandler);
            this._buttons.push({ el: btn, handler: clickHandler });

            block.style.position = 'relative';
            block.appendChild(btn);
        });

        return this;
    },

    destroy() {
        this._buttons.forEach(({ el, handler }) => {
            el.removeEventListener('click', handler);
        });
        this._buttons = [];
    }
};

// ==================== KeyboardNavModule ====================
/**
 * 增强键盘导航
 */
const KeyboardNavModule = window.KeyboardNavModule = {
    focusableElements: [],
    currentIndex: 0,
    _logger: 'KeyboardNav',
    _boundHandler: null,

    init() {
        this.collectFocusable();
        this.bindEvents();
        this.createSkipLink();
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '键盘导航模块初始化完成');
        }
        return this;
    },

    collectFocusable() {
        this.focusableElements = Array.from(
            document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ).filter(el => el.offsetParent !== null);
        return this;
    },

    createSkipLink() {
        const skip = document.createElement('a');
        skip.href = '#overview';
        skip.className = 'skip-link';
        skip.textContent = '跳转到主要内容';
        skip.addEventListener('click', (e) => {
            e.preventDefault();
            const main = document.querySelector('.container');
            if (main) {
                main.setAttribute('tabindex', '-1');
                main.focus();
            }
        });
        document.body.insertBefore(skip, document.body.firstChild);
        return this;
    },

    bindEvents() {
        this._boundHandler = (e) => {
            // F6 - 切换焦点区域
            if (e.key === 'F6') {
                e.preventDefault();
                this.cycleFocusArea();
            }

            // Alt + 数字 - 快速跳转章节
            if (e.altKey && /^[1-9]$/.test(e.key)) {
                e.preventDefault();
                const sections = ['overview', 'master-loop', 'tools', 'context', 'subagent', 'permission', 'plugin', 'dataflow', 'session'];
                const index = parseInt(e.key) - 1;
                if (sections[index]) {
                    if (typeof NavigationModule !== 'undefined') {
                        NavigationModule.scrollToSection(sections[index]);
                    }
                }
            }
        };

        document.addEventListener('keydown', this._boundHandler);
        return this;
    },

    cycleFocusArea() {
        const areas = ['.sidebar', '.container', '#search-input'];
        const currentFocus = document.activeElement;

        for (let i = 0; i < areas.length; i++) {
            const area = document.querySelector(areas[i]);
            if (area && area.contains(currentFocus)) {
                const nextIndex = (i + 1) % areas.length;
                const nextArea = document.querySelector(areas[nextIndex]);
                if (nextArea) {
                    const firstFocusable = nextArea.querySelector('a, button, input, [tabindex]:not([tabindex="-1"])');
                    if (firstFocusable) {
                        firstFocusable.focus();
                        if (typeof ToastModule !== 'undefined') {
                            ToastModule.show(`焦点切换到: ${areas[nextIndex]}`, 'info', 1500);
                        }
                    }
                }
                return;
            }
        }

        // 默认聚焦侧边栏
        const sidebar = document.querySelector('.sidebar');
        const firstLink = sidebar?.querySelector('a');
        if (firstLink) firstLink.focus();

        return this;
    },

    destroy() {
        if (this._boundHandler) {
            document.removeEventListener('keydown', this._boundHandler);
            this._boundHandler = null;
        }
        this.focusableElements = [];
    }
};

// ==================== ShareModule ====================
/**
 * 分享功能模块
 * 固定在右下角的分享按钮，支持复制链接、Twitter、LinkedIn 分享
 * 使用 Web Share API（如果支持），分享时自动带上当前章节标题
 */
const ShareModule = window.ShareModule = {
    _logger: 'Share',
    _button: null,
    _panel: null,
    _visible: false,
    _boundEvents: [],

    init() {
        // 防止重复初始化
        if (document.getElementById('share-button')) {
            return this;
        }
        this.createShareButton();
        this.bindEvents();
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '分享模块初始化完成');
        }
        return this;
    },

    /**
     * 获取当前章节标题
     * @returns {string} 当前可见章节的标题
     */
    getCurrentSectionTitle() {
        const activeSection = window.State?.activeSection;
        if (activeSection) {
            const section = document.getElementById(activeSection);
            if (section) {
                const h2 = section.querySelector('h2');
                if (h2) return h2.textContent.trim();
            }
        }
        return document.title;
    },

    /**
     * 获取分享 URL
     * @returns {string} 当前页面 URL
     */
    getShareUrl() {
        return window.location.href;
    },

    /**
     * 获取分享文本
     * @returns {string} 分享文本
     */
    getShareText() {
        const title = this.getCurrentSectionTitle();
        return `${title} - Claude Code 架构深度解析`;
    },

    /**
     * 创建分享按钮
     */
    createShareButton() {
        // 分享按钮
        this._button = document.createElement('button');
        this._button.className = 'share-button no-print';
        this._button.id = 'share-button';
        this._button.setAttribute('aria-label', '分享');
        this._button.innerHTML = '🔗';
        this._button.title = '分享当前页面';
        this._button.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 999;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 1px solid var(--border-color);
            background: var(--bg-card);
            color: var(--text-primary);
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--shadow);
            transition: transform 0.2s, box-shadow 0.2s;
        `;
        document.body.appendChild(this._button);

        // 分享面板
        this._panel = document.createElement('div');
        this._panel.className = 'share-panel no-print';
        this._panel.id = 'share-panel';
        this._panel.setAttribute('role', 'menu');
        this._panel.setAttribute('aria-label', '分享选项');
        this._panel.style.cssText = `
            position: fixed;
            bottom: 130px;
            right: 20px;
            z-index: 999;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 8px 0;
            box-shadow: var(--shadow-lg);
            display: none;
            flex-direction: column;
            min-width: 180px;
        `;
        this._panel.innerHTML = `
            <button class="share-option" data-action="native" role="menuitem" style="...">
                <span>📤</span><span>系统分享</span>
            </button>
            <button class="share-option" data-action="copy" role="menuitem" style="...">
                <span>📋</span><span>复制链接</span>
            </button>
            <button class="share-option" data-action="twitter" role="menuitem" style="...">
                <span>🐦</span><span>Twitter</span>
            </button>
            <button class="share-option" data-action="linkedin" role="menuitem" style="...">
                <span>💼</span><span>LinkedIn</span>
            </button>
        `;
        // 为分享选项添加内联样式
        this._panel.querySelectorAll('.share-option').forEach(opt => {
            opt.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                border: none;
                background: transparent;
                color: var(--text-primary);
                cursor: pointer;
                font-size: 14px;
                width: 100%;
                text-align: left;
                transition: background 0.15s;
            `;
        });
        document.body.appendChild(this._panel);

        return this;
    },

    /**
     * 绑定事件
     */
    bindEvents() {
        // 点击分享按钮切换面板
        this._onButtonClick = () => this.togglePanel();
        this._button.addEventListener('click', this._onButtonClick);
        this._boundEvents.push({ el: this._button, event: 'click', handler: this._onButtonClick });

        // 分享选项点击
        this._panel.querySelectorAll('.share-option').forEach(opt => {
            const handler = () => {
                const action = opt.dataset.action;
                this.executeShare(action);
                this.hidePanel();
            };
            opt.addEventListener('click', handler);
            this._boundEvents.push({ el: opt, event: 'click', handler });
        });

        // 点击外部关闭面板
        this._onDocumentClick = (e) => {
            if (!this._button.contains(e.target) && !this._panel.contains(e.target)) {
                this.hidePanel();
            }
        };
        document.addEventListener('click', this._onDocumentClick);
        this._boundEvents.push({ el: document, event: 'click', handler: this._onDocumentClick });

        // ESC 关闭
        this._onDocumentKeydown = (e) => {
            if (e.key === 'Escape' && this._visible) {
                this.hidePanel();
            }
        };
        document.addEventListener('keydown', this._onDocumentKeydown);
        this._boundEvents.push({ el: document, event: 'keydown', handler: this._onDocumentKeydown });

        return this;
    },

    /**
     * 切换分享面板
     */
    togglePanel() {
        this._visible ? this.hidePanel() : this.showPanel();
        return this;
    },

    /**
     * 显示分享面板
     */
    showPanel() {
        this._panel.style.display = 'flex';
        this._visible = true;
        return this;
    },

    /**
     * 隐藏分享面板
     */
    hidePanel() {
        this._panel.style.display = 'none';
        this._visible = false;
        return this;
    },

    /**
     * 执行分享操作
     * @param {string} action - 分享方式: native / copy / twitter / linkedin
     */
    async executeShare(action) {
        const url = this.getShareUrl();
        const text = this.getShareText();

        switch (action) {
            case 'native':
                // 使用 Web Share API
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: text,
                            text: text,
                            url: url
                        });
                        if (typeof ToastModule !== 'undefined') {
                            ToastModule.show('分享成功', 'success', 2000);
                        }
                    } catch (e) {
                        // 用户取消分享不提示错误
                        if (e.name !== 'AbortError') {
                            if (typeof ToastModule !== 'undefined') {
                                ToastModule.show('分享失败', 'error', 2000);
                            }
                        }
                    }
                } else {
                    // 不支持 Web Share API，回退到复制链接
                    this.executeShare('copy');
                }
                break;

            case 'copy':
                try {
                    await navigator.clipboard.writeText(url);
                    if (typeof ToastModule !== 'undefined') {
                        ToastModule.show('链接已复制到剪贴板', 'success', 2000);
                    }
                } catch (e) {
                    if (typeof ToastModule !== 'undefined') {
                        ToastModule.show('复制失败', 'error', 2000);
                    }
                }
                break;

            case 'twitter':
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                window.open(twitterUrl, '_blank', 'width=600,height=400');
                break;

            case 'linkedin':
                const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
                window.open(linkedinUrl, '_blank', 'width=600,height=400');
                break;
        }

        return this;
    },

    destroy() {
        // 移除所有绑定的事件监听
        this._boundEvents.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });
        this._boundEvents = [];

        if (this._button) this._button.remove();
        if (this._panel) this._panel.remove();
        this._button = null;
        this._panel = null;
        this._visible = false;
    }
};

// ==================== VersionLogModule ====================
/**
 * 版本更新日志模块
 * 在页面底部添加"更新日志"折叠区域，显示 v1.0 到 v5.0 的更新历史
 * 使用时间线样式
 */
const VersionLogModule = window.VersionLogModule = {
    _logger: 'VersionLog',
    _container: null,

    /**
     * 版本更新历史数据
     */
    versionHistory: [
        {
            version: '5.0.0',
            date: '2026-05-16',
            title: '统一模块系统重构',
            changes: [
                '新增 AppCore 核心架构（EventBus + ModuleRegistry + Logger + Utils）',
                'State 改为使用 AppCore.bus 发布事件',
                '所有模块增加 destroy() 方法',
                '新增 ShareModule 分享功能',
                '新增 VersionLogModule 版本日志',
                'ThemeModule 新增 auto 三态切换',
                'SearchModule 新增搜索历史记录',
                'ToastModule 支持队列和进度条',
                'LazyLoadModule 新增图表交互功能'
            ]
        },
        {
            version: '4.0.0',
            date: '2026-04-20',
            title: '架构文档全面升级',
            changes: [
                '新增竞品对比章节',
                '新增设计哲学章节',
                '新增隐藏功能章节',
                '优化 Mermaid 图表渲染',
                '新增 PWA 离线支持',
                '新增 Web Vitals 性能监控'
            ]
        },
        {
            version: '3.0.0',
            date: '2026-03-15',
            title: '交互体验增强',
            changes: [
                '新增全文搜索功能（Fuse.js）',
                '新增浮动目录大纲',
                '新增代码块复制功能',
                '新增键盘导航增强',
                '新增滚动进度条',
                '优化侧边栏响应式设计'
            ]
        },
        {
            version: '2.0.0',
            date: '2026-02-10',
            title: '主题与打印优化',
            changes: [
                '新增亮色/暗色主题切换',
                '新增 PDF 导出功能',
                '新增 Toast 通知系统',
                '优化移动端适配',
                '新增阅读时间估算'
            ]
        },
        {
            version: '1.0.0',
            date: '2026-01-05',
            title: '初始版本发布',
            changes: [
                '基础架构概览文档',
                '核心循环流程图',
                '工具系统详解',
                '上下文管理说明',
                '子代理架构介绍',
                '权限安全模型',
                '插件生态系统',
                '数据流图',
                '会话生命周期'
            ]
        }
    ],

    init() {
        // 防止重复初始化
        if (document.getElementById('version-log')) {
            return this;
        }
        this.createVersionLog();
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '版本日志模块初始化完成');
        }
        return this;
    },

    /**
     * 创建版本日志 UI
     */
    createVersionLog() {
        const footer = document.querySelector('.footer');
        if (!footer) return this;

        this._container = document.createElement('div');
        this._container.className = 'version-log-section';
        this._container.id = 'version-log';
        this._container.style.cssText = `
            max-width: 800px;
            margin: 40px auto 20px;
            padding: 0 20px;
        `;

        // 折叠头部
        const header = document.createElement('div');
        header.className = 'version-log-header';
        header.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            cursor: pointer;
            user-select: none;
            transition: border-color 0.2s;
        `;
        header.innerHTML = `
            <span style="font-size: 16px; font-weight: 600; color: var(--text-primary);">
                📋 更新日志
            </span>
            <span class="version-log-toggle" style="color: var(--text-secondary); font-size: 12px; transition: transform 0.3s;">
                ▼ 展开
            </span>
        `;

        // 时间线内容
        const content = document.createElement('div');
        content.className = 'version-log-content';
        content.style.cssText = `
            display: none;
            padding: 20px 0;
        `;

        content.innerHTML = this.versionHistory.map(v => `
            <div class="version-log-item" style="
                position: relative;
                padding-left: 30px;
                padding-bottom: 30px;
                border-left: 2px solid var(--border-color);
                margin-left: 8px;
            ">
                <div style="
                    position: absolute;
                    left: -7px;
                    top: 4px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: var(--accent-orange);
                    border: 2px solid var(--bg-primary);
                "></div>
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                ">
                    <span style="
                        background: rgba(232,126,47,0.15);
                        color: var(--accent-orange);
                        padding: 2px 10px;
                        border-radius: 20px;
                        font-size: 13px;
                        font-weight: 600;
                    ">v${v.version}</span>
                    <span style="color: var(--text-muted); font-size: 12px;">${v.date}</span>
                </div>
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">${v.title}</div>
                <ul style="
                    list-style: none;
                    padding: 0;
                    margin: 0;
                ">
                    ${v.changes.map(c => `
                        <li style="
                            padding: 3px 0;
                            color: var(--text-secondary);
                            font-size: 13px;
                            position: relative;
                            padding-left: 16px;
                        ">
                            <span style="
                                position: absolute;
                                left: 0;
                                color: var(--text-muted);
                            ">·</span>
                            ${c}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');

        // 绑定折叠事件
        header.addEventListener('click', () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            const toggleText = header.querySelector('.version-log-toggle');
            toggleText.textContent = isHidden ? '▲ 收起' : '▼ 展开';
            toggleText.style.transform = isHidden ? 'rotate(0deg)' : '';
        });

        this._container.appendChild(header);
        this._container.appendChild(content);

        // 插入到 footer 之前
        footer.parentNode.insertBefore(this._container, footer);

        return this;
    },

    destroy() {
        if (this._container) {
            this._container.remove();
            this._container = null;
        }
    }
};

} // end of duplicate-check guard
