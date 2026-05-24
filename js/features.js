/**
 * Claude Code Architecture Documentation - 功能模块
 * 图表懒加载、打印优化、Toast 通知（增强版）
 *
 * @version 2.0.0
 * @author Claude Code Architecture Team
 */

// ==================== LazyLoadModule ====================
/**
 * 图表懒加载 + 滚动进度条 + 阅读增强 + 图表交互
 * 使用 IntersectionObserver 优化性能
 */
const LazyLoadModule = {
    observer: null,
    animatedElements: [],
    _logger: 'LazyLoad',
    _boundEvents: [],
    _diagramModal: null,

    init() {
        this.createProgressBar();
        this.createReadingTime();
        this.initDiagramLazyLoad();
        this.initScrollAnimations();
        this.initImageLazyLoad();
        this.initDiagramInteraction();
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '懒加载模块初始化完成');
        }
        return this;
    },

    // ==================== 滚动进度条 ====================
    createProgressBar() {
        const bar = document.createElement('div');
        bar.id = 'reading-progress';
        bar.className = 'reading-progress';
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-valuenow', '0');
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
        bar.setAttribute('aria-label', '阅读进度');
        document.body.appendChild(bar);

        const scrollHandler = window.AppCore?.utils?.throttle
            ? AppCore.utils.throttle(() => this.updateProgress(), 100)
            : () => this.updateProgress();
        window.addEventListener('scroll', scrollHandler, { passive: true });
        this._boundEvents.push({ el: window, event: 'scroll', handler: scrollHandler });
        return this;
    },

    updateProgress() {
        const bar = document.getElementById('reading-progress');
        if (!bar) return this;

        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;

        bar.style.width = progress + '%';
        bar.setAttribute('aria-valuenow', Math.round(progress));
        return this;
    },

    // ==================== 阅读时间 ====================
    createReadingTime() {
        const hero = document.querySelector('.hero .subtitle');
        if (!hero) return this;

        // 使用 textContent 代替 innerText 避免强制 reflow
        const text = document.body.textContent || '';
        const words = text.length;
        const minutes = Math.ceil(words / 500);

        const badge = document.createElement('div');
        badge.className = 'reading-time-badge';
        badge.innerHTML = `⏱️ 预计阅读 ${minutes} 分钟`;
        hero.parentNode.insertBefore(badge, hero.nextSibling);
        return this;
    },

    // ==================== Mermaid 图表懒加载 ====================
    initDiagramLazyLoad() {
        const diagrams = document.querySelectorAll('.mermaid');

        diagrams.forEach((el, index) => {
            const content = el.textContent.trim();
            if (!content) return;

            el.dataset.original = content;
            el.dataset.index = index;

            const placeholder = document.createElement('div');
            placeholder.className = 'diagram-placeholder';
            placeholder.innerHTML = `
                <div class="diagram-placeholder-content">
                    <div class="diagram-placeholder-spinner"></div>
                    <span>加载图表中...</span>
                </div>
            `;

            el.textContent = '';
            el.appendChild(placeholder);
        });

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    this.renderDiagram(el);
                    this.observer.unobserve(el);
                }
            });
        }, {
            rootMargin: '200px 0px',
            threshold: 0.1
        });

        diagrams.forEach(el => this.observer.observe(el));
        return this;
    },

    renderDiagram(el) {
        if (el._rendering) return;
        const content = el.dataset.original;
        if (!content) return;

        el._rendering = true;

        const placeholder = el.querySelector('.diagram-placeholder');
        if (placeholder) placeholder.remove();

        el.textContent = content;

        if (typeof mermaid !== 'undefined') {
            try {
                const id = 'mermaid-' + el.dataset.index + '-' + Date.now();
                mermaid.render(id, content).then(({ svg }) => {
                    el._rendering = false;
                    el.innerHTML = svg;
                    el.classList.add('rendered');

                    // 修复 SVG 内空链接的无障碍问题
                    el.querySelectorAll('svg a').forEach(a => {
                        if (!a.textContent.trim() && !a.getAttribute('aria-label')) {
                            const textEl = a.querySelector('text');
                            if (textEl && textEl.textContent.trim()) {
                                a.setAttribute('aria-label', textEl.textContent.trim());
                            } else {
                                a.setAttribute('aria-label', '图表交互区域');
                                a.setAttribute('role', 'presentation');
                            }
                        }
                    });

                    // 图表加载完成时添加淡入动画
                    el.style.opacity = '0';
                    el.style.transition = 'opacity 0.6s ease';
                    requestAnimationFrame(() => {
                        el.style.opacity = '1';
                    });
                }).catch(err => {
                    el._rendering = false;
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'diagram-error';
                    errorDiv.textContent = '图表渲染失败: ' + (err.message || '未知错误');
                    el.innerHTML = '';
                    el.appendChild(errorDiv);
                });
            } catch (e) {
                el._rendering = false;
                try {
                    mermaid.run({ nodes: [el] });
                    el.classList.add('rendered');
                } catch (e2) {
                    el.innerHTML = `<div class="diagram-error">图表渲染失败</div>`;
                }
            }
        }
        return this;
    },

    // ==================== 图表交互功能 ====================
    /**
     * 点击 Mermaid 图表节点时显示详细信息弹窗
     */
    initDiagramInteraction() {
        // 使用 MutationObserver 监听图表渲染完成
        this._diagramObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.target.classList && mutation.target.classList.contains('rendered')) {
                    this.attachDiagramClickHandlers(mutation.target);
                }
            });
        });

        // 监听所有 mermaid 容器
        document.querySelectorAll('.mermaid').forEach(el => {
            this._diagramObserver.observe(el, {
                attributes: true,
                attributeFilter: ['class']
            });

            // 如果已经渲染完成，直接绑定
            if (el.classList.contains('rendered')) {
                this.attachDiagramClickHandlers(el);
            }
        });

        // 创建弹窗容器
        this.createDiagramModal();

        return this;
    },

    /**
     * 为已渲染的图表绑定点击事件
     * @param {HTMLElement} diagramEl - 图表容器元素
     */
    attachDiagramClickHandlers(diagramEl) {
        const svgEl = diagramEl.querySelector('svg');
        if (!svgEl || svgEl._interactionAttached) return;

        svgEl._interactionAttached = true;

        svgEl.addEventListener('click', (e) => {
            const target = e.target;

            // 查找被点击的节点
            const node = target.closest('.node') || target.closest('[id^="flowchart-"]') || target.closest('rect, circle, polygon');
            if (node) {
                const nodeId = node.id || '';
                const nodeText = this.extractNodeText(node);

                if (nodeText) {
                    this.showDiagramNodeInfo(nodeText, nodeId);
                }
            }
        });

        // 鼠标悬停效果
        svgEl.addEventListener('mouseover', (e) => {
            const node = e.target.closest('.node') || e.target.closest('rect, circle, polygon');
            if (node) {
                node.style.cursor = 'pointer';
                node.style.filter = 'brightness(1.2)';
            }
        });

        svgEl.addEventListener('mouseout', (e) => {
            const node = e.target.closest('.node') || e.target.closest('rect, circle, polygon');
            if (node) {
                node.style.filter = '';
            }
        });
    },

    /**
     * 提取节点文本
     * @param {HTMLElement} node - SVG 节点
     * @returns {string} 节点文本
     */
    extractNodeText(node) {
        // 尝试从文本元素中提取
        const textEl = node.querySelector('text') || node.closest('.node')?.querySelector('text');
        if (textEl) {
            // Mermaid 的文本可能包含 foreignObject 或 tspan
            const spans = textEl.querySelectorAll('tspan');
            if (spans.length > 0) {
                return Array.from(spans).map(s => s.textContent.trim()).filter(Boolean).join(' ');
            }
            return textEl.textContent.trim();
        }
        return '';
    },

    /**
     * 创建图表节点信息弹窗
     */
    createDiagramModal() {
        this._diagramModal = document.createElement('div');
        this._diagramModal.id = 'diagram-node-modal';
        this._diagramModal.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.5);
        `;
        this._diagramModal.innerHTML = `
            <div style="
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: var(--shadow-lg);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h4 style="margin: 0; color: var(--accent-orange); font-size: 16px;">📊 节点信息</h4>
                    <button id="diagram-modal-close" style="
                        background: none; border: none; color: var(--text-secondary);
                        cursor: pointer; font-size: 18px; padding: 4px;
                    ">×</button>
                </div>
                <div id="diagram-node-content" style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;"></div>
            </div>
        `;

        document.body.appendChild(this._diagramModal);

        // 关闭弹窗
        this._diagramModal.addEventListener('click', (e) => {
            if (e.target === this._diagramModal || e.target.id === 'diagram-modal-close') {
                this._diagramModal.style.display = 'none';
            }
        });

        // ESC 关闭
        const escHandler = (e) => {
            if (e.key === 'Escape' && this._diagramModal.style.display === 'flex') {
                this._diagramModal.style.display = 'none';
            }
        };
        document.addEventListener('keydown', escHandler);
        this._boundEvents.push({ el: document, event: 'keydown', handler: escHandler });
    },

    /**
     * 显示节点信息弹窗
     * @param {string} text - 节点文本
     * @param {string} nodeId - 节点 ID
     */
    showDiagramNodeInfo(text, nodeId) {
        if (!this._diagramModal) return;

        const content = this._diagramModal.querySelector('#diagram-node-content');
        // 使用 textContent 防止 XSS
        const nameStrong = document.createElement('strong');
        nameStrong.style.color = 'var(--text-primary)';
        nameStrong.textContent = '节点名称：';
        const nameText = document.createTextNode(text);

        const idStrong = document.createElement('strong');
        idStrong.style.color = 'var(--text-primary)';
        idStrong.textContent = '节点 ID：';
        const idCode = document.createElement('code');
        idCode.style.cssText = 'background: var(--bg-code); padding: 2px 6px; border-radius: 4px; font-size: 12px;';
        idCode.textContent = nodeId || '未知';

        content.innerHTML = '';
        const row1 = document.createElement('div');
        row1.style.marginBottom = '8px';
        row1.appendChild(nameStrong);
        row1.appendChild(nameText);

        const row2 = document.createElement('div');
        row2.style.marginBottom = '8px';
        row2.appendChild(idStrong);
        row2.appendChild(idCode);

        const hint = document.createElement('div');
        hint.style.cssText = 'color: var(--text-muted); font-size: 12px; margin-top: 12px;';
        hint.textContent = '💡 提示：点击图表中的节点可以查看详细信息';

        content.appendChild(row1);
        content.appendChild(row2);
        content.appendChild(hint);

        this._diagramModal.style.display = 'flex';
    },

    // ==================== 滚动动画 ====================
    initScrollAnimations() {
        const animateTargets = document.querySelectorAll('.card, .section-header, .diagram-container, .info-box, .comparison');

        animateTargets.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            this.animatedElements.push(el);
        });

        const animObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                    animObserver.unobserve(el);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });

        animateTargets.forEach(el => animObserver.observe(el));
        return this;
    },

    // ==================== 图片懒加载 ====================
    initImageLazyLoad() {
        const images = document.querySelectorAll('img[data-src]');

        if (images.length === 0) return this;

        this._imgObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    this._imgObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => this._imgObserver.observe(img));
        return this;
    },

    destroy() {
        this._boundEvents.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });
        this._boundEvents = [];
        this.animatedElements = [];

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this._diagramObserver) {
            this._diagramObserver.disconnect();
            this._diagramObserver = null;
        }

        if (this._diagramModal) {
            this._diagramModal.remove();
            this._diagramModal = null;
        }

        if (this._imgObserver) {
            this._imgObserver.disconnect();
            this._imgObserver = null;
        }

        const bar = document.getElementById('reading-progress');
        if (bar) bar.remove();
    }
};

// ==================== PrintModule ====================
/**
 * 打印/PDF 导出优化
 */
const PrintModule = {
    _logger: 'Print',

    init() {
        this.createPrintButton();
        this.optimizeForPrint();
        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '打印模块初始化完成');
        }
        return this;
    },

    createPrintButton() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return this;

        const sections = sidebar.querySelectorAll('.sidebar-section');
        const lastSection = sections[sections.length - 1];
        if (!lastSection) return this;

        const nav = lastSection.querySelector('.sidebar-nav');
        if (!nav) return this;

        const li = document.createElement('li');
        li.innerHTML = `
            <a href="#" id="print-trigger" role="button" aria-label="导出 PDF">
                <span class="nav-icon">🖨️</span>
                <span>导出 PDF</span>
            </a>
        `;

        li.querySelector('#print-trigger').addEventListener('click', (e) => {
            e.preventDefault();
            window.print();
        });
        nav.appendChild(li);
        return this;
    },

    optimizeForPrint() {
        this._boundBeforePrintHandler = () => {
            const placeholders = document.querySelectorAll('.diagram-placeholder');
            placeholders.forEach(el => {
                const mermaidEl = el.closest('.mermaid');
                if (mermaidEl) {
                    LazyLoadModule.renderDiagram(mermaidEl);
                }
            });
        };
        window.addEventListener('beforeprint', this._boundBeforePrintHandler);
        return this;
    },

    destroy() {
        const trigger = document.getElementById('print-trigger');
        if (trigger) trigger.parentElement?.remove();

        if (this._boundBeforePrintHandler) {
            window.removeEventListener('beforeprint', this._boundBeforePrintHandler);
            this._boundBeforePrintHandler = null;
        }
    }
};

// ==================== ToastModule ====================
/**
 * 轻量通知模块（增强版）
 * 支持进度条 Toast、Toast 队列、Promise Toast
 */
const ToastModule = {
    container: null,
    _queue: [],          // Toast 队列
    _isShowing: false,   // 是否正在显示
    _maxVisible: 3,      // 最大同时显示数量
    _currentCount: 0,    // 当前显示数量
    _activeTimers: [],   // 活动定时器列表
    _logger: 'Toast',

    init() {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        this.container.setAttribute('role', 'status');
        this.container.setAttribute('aria-live', 'polite');
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, 'Toast 模块初始化完成');
        }
        return this;
    },

    /**
     * 显示 Toast 通知
     * @param {string} message - 消息文本
     * @param {string} [type='info'] - 类型: info / success / warning / error
     * @param {number} [duration=3000] - 持续时间（毫秒）
     * @returns {Object} Toast 控制对象
     */
    show(message, type = 'info', duration = 3000) {
        const toast = this._createToastElement(message, type, duration);
        this._addToQueue(toast);
        return toast.control;
    },

    /**
     * 显示进度条 Toast（用于长时间操作）
     * @param {string} message - 消息文本
     * @param {Object} [options] - 选项
     * @param {number} [options.duration=0] - 预估持续时间（0 表示不确定）
     * @returns {Object} 控制对象 { update(percent), complete(), fail(error) }
     */
    showProgress(message, options = {}) {
        // 确保容器已初始化
        if (!this.container) {
            this.init();
        }

        // 检查当前显示数量是否已达上限
        if (this._currentCount >= this._maxVisible) {
            return { update() {}, complete() {}, fail() {}, close() {} };
        }

        const { duration = 0 } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-info toast-progress`;
        toast.setAttribute('role', 'alert');
        toast.style.cssText = `
            pointer-events: auto;
            min-width: 280px;
            max-width: 400px;
            padding: 14px 18px;
            border-radius: 10px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow);
            color: var(--text-primary);
            font-size: 14px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            transform: translateX(120%);
            transition: transform 0.3s ease, opacity 0.3s ease;
        `;

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="toast-icon">⏳</span>
                <span class="toast-message"></span>
            </div>
            <div class="toast-progress-bar" style="
                width: 100%;
                height: 4px;
                background: var(--border-color);
                border-radius: 2px;
                overflow: hidden;
            ">
                <div class="toast-progress-fill" style="
                    width: 0%;
                    height: 100%;
                    background: var(--accent-blue);
                    border-radius: 2px;
                    transition: width 0.3s ease;
                "></div>
            </div>
        `;
        toast.querySelector('.toast-message').textContent = message;

        this.container.appendChild(toast);
        this._currentCount++;

        // 触发入场动画
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        const fill = toast.querySelector('.toast-progress-fill');
        const icon = toast.querySelector('.toast-icon');
        const msgEl = toast.querySelector('.toast-message');

        const control = {
            /**
             * 更新进度
             * @param {number} percent - 进度百分比 (0-100)
             */
            update(percent) {
                if (fill) fill.style.width = Math.min(100, Math.max(0, percent)) + '%';
            },

            /**
             * 标记完成
             * @param {string} [successMessage] - 成功消息
             */
            complete(successMessage) {
                if (fill) fill.style.width = '100%';
                if (icon) icon.textContent = '✅';
                if (successMessage && msgEl) msgEl.textContent = successMessage;
                toast.classList.remove('toast-info');
                toast.classList.add('toast-success');
                setTimeout(() => ToastModule._removeToast(toast), 2000);
            },

            /**
             * 标记失败
             * @param {string} [errorMessage] - 错误消息
             */
            fail(errorMessage) {
                if (icon) icon.textContent = '❌';
                if (errorMessage && msgEl) msgEl.textContent = errorMessage;
                toast.classList.remove('toast-info');
                toast.classList.add('toast-error');
                setTimeout(() => ToastModule._removeToast(toast), 3000);
            },

            /**
             * 关闭 Toast
             */
            close() {
                if (control._timer) {
                    clearInterval(control._timer);
                }
                ToastModule._removeToast(toast);
            }
        };

        // 如果有预估时间，自动模拟进度
        if (duration > 0) {
            let progress = 0;
            const interval = 100;
            const step = (interval / duration) * 90; // 最多到 90%，留给 complete()
            const timer = setInterval(() => {
                progress += step;
                if (progress >= 90) {
                    clearInterval(timer);
                    progress = 90;
                }
                control.update(progress);
            }, interval);
            control._timer = timer;
            this._activeTimers.push(timer);
        }

        return control;
    },

    /**
     * Promise Toast
     * 传入 Promise，自动显示 loading/success/error
     * @param {Promise} promise - 要等待的 Promise
     * @param {Object} [options] - 选项
     * @param {string} [options.loading='处理中...'] - 加载消息
     * @param {string} [options.success='操作成功'] - 成功消息
     * @param {string} [options.error='操作失败'] - 错误消息
     * @returns {Promise} 原始 Promise
     */
    promise(promise, options = {}) {
        const {
            loading = '处理中...',
            success = '操作成功',
            error = '操作失败'
        } = options;

        const progress = this.showProgress(loading);

        return promise
            .then(result => {
                progress.complete(success);
                return result;
            })
            .catch(err => {
                const errMsg = typeof error === 'function' ? error(err) : error;
                progress.fail(errMsg);
                throw err;
            });
    },

    /**
     * 创建 Toast DOM 元素
     * @private
     */
    _createToastElement(message, type, duration) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.style.cssText = `
            pointer-events: auto;
            min-width: 280px;
            max-width: 400px;
            padding: 14px 18px;
            border-radius: 10px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow);
            color: var(--text-primary);
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateX(120%);
            transition: transform 0.3s ease, opacity 0.3s ease;
        `;

        const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
        const msgSpan = document.createElement('span');
        msgSpan.className = 'toast-message';
        msgSpan.textContent = message; // 使用 textContent 防止 XSS
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
        `;
        toast.appendChild(msgSpan);

        const control = {
            _toast: toast,
            close: () => this._removeToast(toast)
        };

        return { element: toast, duration, control };
    },

    /**
     * 添加到队列
     * @private
     */
    _addToQueue(toastObj) {
        this._queue.push(toastObj);
        this._processQueue();
    },

    /**
     * 处理队列
     * @private
     */
    _processQueue() {
        // 如果当前显示数量已达上限，等待
        if (this._currentCount >= this._maxVisible || this._queue.length === 0) {
            return;
        }

        const toastObj = this._queue.shift();
        const { element, duration } = toastObj;

        this.container.appendChild(element);
        this._currentCount++;

        // 触发入场动画
        requestAnimationFrame(() => {
            element.style.transform = 'translateX(0)';
        });

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                this._removeToast(element);
            }, duration);
        }

        // 继续处理队列
        setTimeout(() => this._processQueue(), 0);
    },

    /**
     * 移除 Toast
     * @private
     */
    _removeToast(toast) {
        if (!toast || !toast.parentNode) return;

        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this._currentCount--;

            // 处理队列中等待的 Toast
            setTimeout(() => this._processQueue(), 0);
        }, 300);
    },

    destroy() {
        // 清除所有活动定时器
        this._activeTimers.forEach(timer => clearInterval(timer));
        this._activeTimers = [];

        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this._queue = [];
        this._currentCount = 0;
    }
};
