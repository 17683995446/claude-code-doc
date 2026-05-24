/**
 * Claude Code Architecture Documentation - 无障碍增强模块
 * WCAG 2.1 AA 合规：焦点管理、ARIA 增强、键盘导航、对比度检查、
 * 屏幕阅读器优化、减少动画偏好、高对比度模式支持
 *
 * @version 1.0.0
 * @author Claude Code Architecture Team
 */

// ==================== A11yModule ====================
/**
 * 无障碍增强模块
 * 提供完整的 WCAG 2.1 AA 合规支持，包括焦点管理、ARIA 属性增强、
 * 键盘导航、颜色对比度检查、屏幕阅读器优化、减少动画偏好检测和高对比度模式支持
 */
// 防止重复声明
if (typeof window.A11yModule !== 'undefined') {
    // 模块已加载，跳过
} else {

const A11yModule = {
    _logger: 'A11y',
    _boundEvents: [],
    _observers: [],               // 存储 MutationObserver 引用，用于销毁
    _focusTrapStack: [],          // 焦点陷阱栈（支持嵌套模态框）
    _previousFocusStack: [],      // 上一个聚焦元素栈（用于嵌套模态框关闭时恢复）
    _reducedMotion: false,         // 是否启用减少动画偏好
    _highContrast: false,          // 是否启用高对比度模式
    _initialized: false,

    /**
     * 初始化无障碍模块
     * @returns {A11yModule} 当前实例
     */
    init() {
        if (this._initialized) return this;

        // 检测用户偏好
        this._detectReducedMotion();
        this._detectHighContrast();

        // 执行各项增强
        this.enhanceSkipLinks();
        this.enhanceARIA();
        this.enhanceKeyboard();
        this.enhanceScreenReader();
        this.enhanceFocusVisibility();
        this.checkContrast();

        // 绑定全局事件
        this._bindGlobalEvents();

        this._initialized = true;

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '无障碍增强模块初始化完成');
        }

        return this;
    },

    // ==================== 跳过导航增强 ====================

    /**
     * 增强跳过导航链接
     * 支持多个跳过目标：主内容、搜索、侧边栏
     */
    enhanceSkipLinks() {
        // 移除旧的 skip-link（如果存在）
        const oldSkipLink = document.querySelector('.skip-link');
        if (oldSkipLink) oldSkipLink.remove();

        // 创建跳过导航容器
        const skipNav = document.createElement('nav');
        skipNav.className = 'skip-nav';
        skipNav.setAttribute('aria-label', '跳过导航链接');

        // 定义跳过目标
        const skipTargets = [
            { href: '#main', text: '跳到主内容', id: 'skip-to-content' },
            { href: '#search-input', text: '跳到搜索', id: 'skip-to-search', action: () => {
                if (typeof SearchModule !== 'undefined') SearchModule.open();
            }},
            { href: '#sidebar', text: '跳到侧边栏', id: 'skip-to-sidebar' }
        ];

        skipTargets.forEach(target => {
            const link = document.createElement('a');
            link.href = target.href;
            link.className = 'skip-link';
            link.id = target.id;
            link.textContent = target.text;

            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (target.action) {
                    target.action();
                    return;
                }
                const el = document.querySelector(target.href);
                if (el) {
                    el.setAttribute('tabindex', '-1');
                    el.focus();
                    // 移除 tabindex 避免影响正常 Tab 顺序
                    el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true });
                }
            });

            skipNav.appendChild(link);
        });

        document.body.insertBefore(skipNav, document.body.firstChild);

        if (window.AppCore) {
            window.AppCore.logger.debug(this._logger, '跳过导航链接已增强');
        }

        return this;
    },

    // ==================== 焦点管理 ====================

    /**
     * 在模态框内捕获焦点（Tab 循环）
     * @param {HTMLElement} modalElement - 模态框容器元素
     */
    trapFocus(modalElement) {
        if (!modalElement) return this;

        // 保存当前聚焦元素
        this._previousFocusStack.push(document.activeElement);

        // 获取模态框内所有可聚焦元素
        const focusableSelectors = 'a[href], button:not([disabled]), textarea:not([disabled]), ' +
            'input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(modalElement.querySelectorAll(focusableSelectors))
            .filter(el => el.offsetParent !== null || getComputedStyle(el).position === 'fixed');

        if (focusableElements.length === 0) return this;

        // 聚焦第一个可聚焦元素
        const firstFocusable = focusableElements[0];
        firstFocusable.focus();

        // 创建焦点陷阱处理器
        const trapHandler = (e) => {
            if (e.key !== 'Tab') return;

            const lastFocusable = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                // Shift+Tab：如果焦点在第一个元素，跳到最后一个
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                // Tab：如果焦点在最后一个元素，跳到第一个
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        };

        // 将陷阱信息压栈（支持嵌套模态框）
        this._focusTrapStack.push({
            element: modalElement,
            handler: trapHandler,
            focusableElements
        });

        modalElement.addEventListener('keydown', trapHandler);

        if (window.AppCore) {
            window.AppCore.logger.debug(this._logger, '焦点陷阱已激活');
        }

        return this;
    },

    /**
     * 释放焦点陷阱
     * @param {HTMLElement} modalElement - 模态框容器元素
     */
    releaseFocus(modalElement) {
        if (!modalElement) return this;

        // 从栈中找到对应的陷阱
        const trapIndex = this._focusTrapStack.findIndex(t => t.element === modalElement);
        if (trapIndex === -1) return this;

        const trap = this._focusTrapStack[trapIndex];
        modalElement.removeEventListener('keydown', trap.handler);
        this._focusTrapStack.splice(trapIndex, 1);

        // 恢复之前的焦点
        const previousFocus = this._previousFocusStack.pop();
        if (previousFocus && previousFocus.focus) {
            previousFocus.focus();
        }

        if (window.AppCore) {
            window.AppCore.logger.debug(this._logger, '焦点陷阱已释放');
        }

        return this;
    },

    /**
     * 关闭所有打开的模态框并释放焦点
     */
    closeAllModals() {
        // 关闭搜索模态框
        if (typeof SearchModule !== 'undefined' && SearchModule.isOpen) {
            SearchModule.close();
        }

        // 关闭目录面板
        if (typeof TocModule !== 'undefined' && TocModule.visible) {
            TocModule.hide();
        }

        // 关闭分享面板
        if (typeof ShareModule !== 'undefined' && ShareModule._visible) {
            ShareModule.hidePanel();
        }

        // 释放所有焦点陷阱
        while (this._focusTrapStack.length > 0) {
            const trap = this._focusTrapStack.pop();
            trap.element.removeEventListener('keydown', trap.handler);
        }

        return this;
    },

    // ==================== 焦点可见性增强 ====================

    /**
     * 增强焦点可见性样式
     * 不依赖浏览器默认焦点样式，使用自定义高对比度轮廓
     */
    enhanceFocusVisibility() {
        // 为所有可聚焦元素添加 :focus-visible 样式支持
        // 通过 JS 检测键盘导航，添加 focus-visible 类
        let isUsingKeyboard = false;

        const keyboardDownHandler = (e) => {
            if (e.key === 'Tab') {
                isUsingKeyboard = true;
                document.body.classList.add('keyboard-navigation');
            }
        };

        const mouseDownHandler = () => {
            isUsingKeyboard = false;
            document.body.classList.remove('keyboard-navigation');
        };

        document.addEventListener('keydown', keyboardDownHandler);
        document.addEventListener('mousedown', mouseDownHandler);

        this._boundEvents.push({ el: document, event: 'keydown', handler: keyboardDownHandler });
        this._boundEvents.push({ el: document, event: 'mousedown', handler: mouseDownHandler });

        // 为所有可交互元素添加 focus-visible 类
        const focusHandler = (e) => {
            if (isUsingKeyboard) {
                e.target.classList.add('focus-visible');
            }
        };

        const blurHandler = (e) => {
            e.target.classList.remove('focus-visible');
        };

        document.addEventListener('focusin', focusHandler);
        document.addEventListener('focusout', blurHandler);

        this._boundEvents.push({ el: document, event: 'focusin', handler: focusHandler });
        this._boundEvents.push({ el: document, event: 'focusout', handler: blurHandler });

        return this;
    },

    // ==================== ARIA 增强 ====================

    /**
     * 为页面元素增强 ARIA 属性
     */
    enhanceARIA() {
        this._enhanceMermaidDiagrams();
        this._enhanceSidebar();
        this._enhanceSearchModal();
        this._enhanceCodeBlocks();
        this._enhanceTables();
        this._enhanceProgressBar();
        this._enhanceToasts();
        this._enhanceShareMenu();
        this._enhanceVersionLog();

        if (window.AppCore) {
            window.AppCore.logger.debug(this._logger, 'ARIA 属性增强完成');
        }

        return this;
    },

    /**
     * 为 Mermaid 图表添加无障碍标签
     * @private
     */
    _enhanceMermaidDiagrams() {
        const diagrams = document.querySelectorAll('.diagram-container');
        diagrams.forEach((container, index) => {
            const mermaidEl = container.querySelector('.mermaid');
            const titleEl = container.querySelector('.diagram-title');
            const labelEl = container.querySelector('.diagram-label');

            if (mermaidEl) {
                // 添加 role="img" 和 aria-label
                mermaidEl.setAttribute('role', 'img');

                // 构建描述文本
                let description = '';
                if (titleEl) {
                    description = titleEl.textContent.trim();
                }
                if (labelEl) {
                    description += (description ? ' - ' : '') + labelEl.textContent.trim();
                }
                if (!description) {
                    description = `架构图表 ${index + 1}`;
                }

                mermaidEl.setAttribute('aria-label', description);
            }
        });
    },

    /**
     * 为侧边栏添加导航角色
     * @private
     */
    _enhanceSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.setAttribute('role', 'navigation');
            sidebar.setAttribute('aria-label', '文档导航侧边栏');

            // 为侧边栏导航添加 aria-label
            const navLists = sidebar.querySelectorAll('.sidebar-nav');
            navLists.forEach((nav, index) => {
                if (!nav.getAttribute('aria-label')) {
                    const sectionTitle = nav.closest('.sidebar-section')?.querySelector('.sidebar-section-title');
                    nav.setAttribute('aria-label', sectionTitle ? sectionTitle.textContent.trim() : `导航列表 ${index + 1}`);
                }
            });
        }
    },

    /**
     * 为搜索模态框添加 aria-describedby
     * @private
     */
    _enhanceSearchModal() {
        const searchModal = document.getElementById('search-modal');
        if (searchModal) {
            // 创建描述元素
            const describedBy = document.createElement('span');
            describedBy.id = 'search-modal-description';
            describedBy.className = 'sr-only';
            describedBy.textContent = '使用上下箭头键导航搜索结果，按 Enter 跳转到对应章节，按 Esc 关闭搜索';
            searchModal.appendChild(describedBy);

            searchModal.setAttribute('aria-describedby', 'search-modal-description');
        }
    },

    /**
     * 为代码块添加 aria-label（语言类型）
     * @private
     */
    _enhanceCodeBlocks() {
        const codeBlocks = document.querySelectorAll('.code-block, pre');
        codeBlocks.forEach((block) => {
            if (!block.getAttribute('aria-label')) {
                // 尝试从类名或父元素推断语言
                let language = '代码';
                const langClass = Array.from(block.classList).find(c => c.startsWith('language-') || c.startsWith('lang-'));
                if (langClass) {
                    language = langClass.replace(/^(language-|lang-)/, '');
                } else {
                    // 尝试从内容推断
                    const firstLine = block.querySelector('.keyword');
                    if (firstLine && firstLine.textContent.includes('function')) {
                        language = 'JavaScript';
                    } else if (firstLine && firstLine.textContent.includes('async')) {
                        language = 'TypeScript';
                    }
                }

                block.setAttribute('aria-label', `${language} 代码块`);
                block.setAttribute('role', 'region');
            }
        });
    },

    /**
     * 为表格添加 caption（如果缺失）
     * @private
     */
    _enhanceTables() {
        const tables = document.querySelectorAll('table');
        tables.forEach((table) => {
            // 检查是否已有 caption
            if (table.querySelector('caption')) return;

            // 尝试从上下文获取表格标题
            const wrapper = table.closest('.card');
            let captionText = '';

            if (wrapper) {
                const h3 = wrapper.querySelector('h3');
                if (h3) {
                    captionText = h3.textContent.trim();
                }
            }

            if (!captionText) {
                captionText = '数据表格';
            }

            // 创建 caption 元素
            const caption = document.createElement('caption');
            caption.className = 'sr-only';
            caption.textContent = captionText;
            table.insertBefore(caption, table.firstChild);
        });
    },

    /**
     * 为进度条添加 aria-valuenow/valuemin/valuemax
     * @private
     */
    _enhanceProgressBar() {
        const progressBars = document.querySelectorAll('[role="progressbar"]');
        progressBars.forEach((bar) => {
            if (!bar.hasAttribute('aria-valuemin')) {
                bar.setAttribute('aria-valuemin', '0');
            }
            if (!bar.hasAttribute('aria-valuemax')) {
                bar.setAttribute('aria-valuemax', '100');
            }
            if (!bar.hasAttribute('aria-valuenow')) {
                bar.setAttribute('aria-valuenow', '0');
            }
        });
    },

    /**
     * 为 Toast 通知添加 role="alert" 和 aria-live="polite"
     * @private
     */
    _enhanceToasts() {
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            toastContainer.setAttribute('role', 'status');
            toastContainer.setAttribute('aria-live', 'polite');
            toastContainer.setAttribute('aria-atomic', 'true');
        }
    },

    /**
     * 为分享菜单添加 aria-haspopup 和 aria-expanded
     * @private
     */
    _enhanceShareMenu() {
        const shareButton = document.getElementById('share-button');
        if (shareButton) {
            shareButton.setAttribute('aria-haspopup', 'true');
            shareButton.setAttribute('aria-expanded', 'false');

            // 监听分享面板状态变化
            const observer = new MutationObserver(() => {
                const isVisible = typeof ShareModule !== 'undefined' && ShareModule._visible;
                shareButton.setAttribute('aria-expanded', String(isVisible));
            });
            this._observers.push(observer);

            // 监听 style 变化
            const panel = document.getElementById('share-panel');
            if (panel) {
                observer.observe(panel, {
                    attributes: true,
                    attributeFilter: ['style']
                });
            }
        }
    },

    /**
     * 为版本日志折叠区域添加 aria-expanded 和 aria-controls
     * @private
     */
    _enhanceVersionLog() {
        const versionHeaders = document.querySelectorAll('.version-log-header, .version-toggle');
        versionHeaders.forEach((header) => {
            // 查找对应的折叠内容
            const parent = header.closest('.version-log-section') || header.closest('.version-item');
            const content = parent?.querySelector('.version-log-content, .version-item-content');

            if (content) {
                // 生成唯一 ID
                const contentId = content.id || 'version-content-' + Math.random().toString(36).substr(2, 9);
                content.id = contentId;

                header.setAttribute('aria-expanded', 'false');
                header.setAttribute('aria-controls', contentId);
                header.setAttribute('role', 'button');
                header.setAttribute('tabindex', '0');

                // 监听折叠状态变化
                const observer = new MutationObserver(() => {
                    const isExpanded = content.style.display !== 'none' &&
                        !content.classList.contains('collapsed');
                    header.setAttribute('aria-expanded', String(isExpanded));
                });
                this._observers.push(observer);

                observer.observe(content, {
                    attributes: true,
                    attributeFilter: ['style', 'class']
                });
            }
        });
    },

    // ==================== 键盘增强 ====================

    /**
     * 增强键盘导航
     */
    enhanceKeyboard() {
        const keyHandler = (e) => {
            // Escape 关闭所有打开的模态框/菜单
            if (e.key === 'Escape') {
                this.closeAllModals();
            }

            // Home 跳到页面顶部
            if (e.key === 'Home' && !this._isInputFocused()) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }

            // End 跳到页面底部
            if (e.key === 'End' && !this._isInputFocused()) {
                e.preventDefault();
                window.scrollTo({
                    top: document.documentElement.scrollHeight,
                    behavior: 'smooth'
                });
            }

            // Enter/Space 激活所有可交互元素
            if ((e.key === 'Enter' || e.key === ' ') && this._isInteractiveElement(e.target)) {
                // 对于 role="button" 的非按钮元素
                if (e.target.getAttribute('role') === 'button' && e.target.tagName !== 'BUTTON') {
                    e.preventDefault();
                    e.target.click();
                }
            }
        };

        document.addEventListener('keydown', keyHandler);
        this._boundEvents.push({ el: document, event: 'keydown', handler: keyHandler });

        // Tab 在侧边栏导航项之间循环
        this._enhanceSidebarTabCycle();

        if (window.AppCore) {
            window.AppCore.logger.debug(this._logger, '键盘增强完成');
        }

        return this;
    },

    /**
     * 增强 Tab 在侧边栏导航项之间的循环
     * @private
     */
    _enhanceSidebarTabCycle() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const navLinks = sidebar.querySelectorAll('.sidebar-nav a');

        if (navLinks.length === 0) return;

        const firstLink = navLinks[0];
        const lastLink = navLinks[navLinks.length - 1];

        const tabHandler = (e) => {
            if (e.key !== 'Tab') return;
            if (!sidebar.contains(document.activeElement)) return;

            if (e.shiftKey && document.activeElement === firstLink) {
                // Shift+Tab 在第一个链接上：跳到最后一个链接
                e.preventDefault();
                lastLink.focus();
            } else if (!e.shiftKey && document.activeElement === lastLink) {
                // Tab 在最后一个链接上：跳到第一个链接
                e.preventDefault();
                firstLink.focus();
            }
        };

        sidebar.addEventListener('keydown', tabHandler);
        this._boundEvents.push({ el: sidebar, event: 'keydown', handler: tabHandler });
    },

    /**
     * 检查当前焦点是否在输入框中
     * @private
     * @returns {boolean}
     */
    _isInputFocused() {
        const tag = document.activeElement?.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
            document.activeElement?.isContentEditable;
    },

    /**
     * 检查元素是否是可交互元素
     * @private
     * @param {HTMLElement} el
     * @returns {boolean}
     */
    _isInteractiveElement(el) {
        if (!el) return false;
        const interactiveRoles = ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch'];
        const role = el.getAttribute('role');
        return interactiveRoles.includes(role);
    },

    // ==================== 颜色对比度检查 ====================

    /**
     * 检查页面文本与背景的对比度
     * WCAG AA 要求普通文本 4.5:1，大文本 3:1
     */
    checkContrast() {
        // 仅在开发模式下输出对比度检查结果
        const issues = [];
        const elements = document.querySelectorAll('p, span, a, li, td, th, h1, h2, h3, h4, h5, h6, label, .text-primary, .text-secondary, .text-muted');

        elements.forEach((el) => {
            // 跳过隐藏元素和装饰性元素
            if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;
            if (el.getAttribute('aria-hidden') === 'true') return;

            const style = window.getComputedStyle(el);
            const textColor = style.color;
            const bgColor = style.backgroundColor;

            // 跳过透明背景
            if (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') return;

            const ratio = this._calculateContrastRatio(textColor, bgColor);
            const isLargeText = this._isLargeText(el);
            const requiredRatio = isLargeText ? 3 : 4.5;

            if (ratio < requiredRatio) {
                issues.push({
                    element: el,
                    text: el.textContent.substring(0, 50),
                    ratio: ratio.toFixed(2),
                    required: requiredRatio,
                    textColor,
                    bgColor
                });
            }
        });

        if (issues.length > 0) {
            console.group('%c[A11y] 对比度检查 - 发现以下不合规项:', 'color: #e5c07b; font-weight: bold;');
            issues.forEach(issue => {
                console.warn(
                    `对比度 ${issue.ratio}:1 (需要 ${issue.required}:1) | 文本: "${issue.text}" | ` +
                    `文字颜色: ${issue.textColor} | 背景颜色: ${issue.bgColor}`,
                    issue.element
                );
            });
            console.groupEnd();
        } else {
            console.log('%c[A11y] 对比度检查通过 - 所有元素符合 WCAG AA 标准', 'color: #7bc47f; font-weight: bold;');
        }

        return issues;
    },

    /**
     * 计算两个颜色之间的对比度
     * @private
     * @param {string} color1 - CSS 颜色值
     * @param {string} color2 - CSS 颜色值
     * @returns {number} 对比度比值 (1:1 到 21:1)
     */
    _calculateContrastRatio(color1, color2) {
        const luminance1 = this._getRelativeLuminance(color1);
        const luminance2 = this._getRelativeLuminance(color2);

        const lighter = Math.max(luminance1, luminance2);
        const darker = Math.min(luminance1, luminance2);

        return (lighter + 0.05) / (darker + 0.05);
    },

    /**
     * 获取颜色的相对亮度
     * @private
     * @param {string} color - CSS 颜色值
     * @returns {number} 相对亮度 (0 到 1)
     */
    _getRelativeLuminance(color) {
        const rgb = this._parseColor(color);
        if (!rgb) return 0;

        const [r, g, b] = rgb.map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },

    /**
     * 解析 CSS 颜色值为 RGB 数组
     * @private
     * @param {string} color - CSS 颜色值
     * @returns {number[]|null} [r, g, b] 或 null
     */
    _parseColor(color) {
        // 处理 rgb/rgba 格式
        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbaMatch) {
            return [parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3])];
        }

        // 处理 hex 格式
        const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
        if (hexMatch) {
            let hex = hexMatch[1];
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            return [
                parseInt(hex.substr(0, 2), 16),
                parseInt(hex.substr(2, 2), 16),
                parseInt(hex.substr(4, 2), 16)
            ];
        }

        return null;
    },

    /**
     * 判断元素是否是大文本（>= 18pt 或 >= 14pt 粗体）
     * @private
     * @param {HTMLElement} el
     * @returns {boolean}
     */
    _isLargeText(el) {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize); // px
        const fontWeight = parseInt(style.fontWeight);

        // 18pt = 24px, 14pt bold = 18.67px bold
        return fontSize >= 24 || (fontSize >= 18.67 && fontWeight >= 700);
    },

    // ==================== 屏幕阅读器优化 ====================

    /**
     * 为屏幕阅读器优化页面元素
     */
    enhanceScreenReader() {
        this._addIconLabels();
        this._addAccordionAria();
        this._addLoadingStates();
        this._hideDecorativeElements();

        if (window.AppCore) {
            window.AppCore.logger.debug(this._logger, '屏幕阅读器优化完成');
        }

        return this;
    },

    /**
     * 为图标按钮添加 aria-label
     * @private
     */
    _addIconLabels() {
        // 侧边栏切换按钮
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle && !sidebarToggle.getAttribute('aria-label')) {
            sidebarToggle.setAttribute('aria-label', '切换侧边栏');
        }

        // 返回顶部按钮
        const backToTop = document.getElementById('backToTop');
        if (backToTop && !backToTop.getAttribute('aria-label')) {
            backToTop.setAttribute('aria-label', '返回页面顶部');
        }

        // 目录触发按钮
        const tocTrigger = document.getElementById('toc-trigger');
        if (tocTrigger && !tocTrigger.getAttribute('aria-label')) {
            tocTrigger.setAttribute('aria-label', '打开文档目录');
        }

        // 代码复制按钮
        document.querySelectorAll('.code-copy-btn').forEach(btn => {
            if (!btn.getAttribute('aria-label')) {
                btn.setAttribute('aria-label', '复制代码到剪贴板');
            }
        });

        // 分享按钮
        const shareButton = document.getElementById('share-button');
        if (shareButton && !shareButton.getAttribute('aria-label')) {
            shareButton.setAttribute('aria-label', '分享当前页面');
        }

        // Web Vitals 面板
        const vitalsPanel = document.getElementById('web-vitals-panel');
        if (vitalsPanel && !vitalsPanel.getAttribute('aria-label')) {
            vitalsPanel.setAttribute('aria-label', '页面性能指标');
        }
    },

    /**
     * 为折叠区域添加 aria-expanded
     * @private
     */
    _addAccordionAria() {
        const accordionItems = document.querySelectorAll('.accordion-item');
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion-header');
            const content = item.querySelector('.accordion-content');

            if (header && content) {
                // 生成唯一 ID
                const contentId = content.id || 'accordion-content-' + Math.random().toString(36).substr(2, 9);
                content.id = contentId;

                header.setAttribute('aria-expanded', String(item.classList.contains('open')));
                header.setAttribute('aria-controls', contentId);
                header.setAttribute('role', 'button');
                header.setAttribute('tabindex', '0');

                // Enter/Space 触发折叠
                const keydownHandler = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.click();
                    }
                };
                header.addEventListener('keydown', keydownHandler);
                this._boundEvents.push({ el: header, event: 'keydown', handler: keydownHandler });

                // 监听 class 变化更新 aria-expanded
                const observer = new MutationObserver(() => {
                    header.setAttribute('aria-expanded', String(item.classList.contains('open')));
                });
                observer.observe(item, { attributes: true, attributeFilter: ['class'] });
                this._observers.push(observer);
            }
        });
    },

    /**
     * 为加载状态添加 aria-busy
     * @private
     */
    _addLoadingStates() {
        // 为图表占位符添加 aria-busy
        const placeholders = document.querySelectorAll('.diagram-placeholder');
        placeholders.forEach(placeholder => {
            placeholder.setAttribute('aria-busy', 'true');
            placeholder.setAttribute('aria-label', '图表加载中');
        });

        // 监听图表渲染完成，移除 aria-busy
        const mermaidObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.target.classList.contains('rendered')) {
                    const placeholder = mutation.target.querySelector('.diagram-placeholder');
                    if (placeholder) {
                        placeholder.removeAttribute('aria-busy');
                        placeholder.setAttribute('aria-label', '图表已加载');
                    }
                }
            });
        });
        this._observers.push(mermaidObserver);

        document.querySelectorAll('.mermaid').forEach(el => {
            mermaidObserver.observe(el, { attributes: true, attributeFilter: ['class'] });
        });
    },

    /**
     * 隐藏装饰性元素
     * @private
     */
    _hideDecorativeElements() {
        // 装饰性图标（无文本内容的 emoji）
        document.querySelectorAll('.nav-icon, .section-icon, .step-num, .timeline-dot, .sidebar-logo').forEach(el => {
            el.setAttribute('aria-hidden', 'true');
        });
    },

    /**
     * 修复 Mermaid SVG 内的空链接
     * Mermaid 渲染的 SVG 可能包含 href="" 或 href="#" 的空链接，
     * 这些链接会导致无障碍扫描器报错，且对用户无实际用途。
     * @private
     */
    _fixSvgLinks() {
        const svgElements = document.querySelectorAll('.mermaid svg, .mermaid');
        svgElements.forEach(svg => {
            // 处理所有 SVG 内的链接，包括空链接和无文本链接
            const links = svg.querySelectorAll('a');
            links.forEach(link => {
                const href = link.getAttribute('href') || '';
                const textContent = (link.textContent || '').trim();
                // 移除空链接、仅#链接、或无文本内容的链接
                if (href === '' || href === '#' || textContent === '') {
                    link.removeAttribute('href');
                    link.setAttribute('role', 'presentation');
                    link.setAttribute('aria-hidden', 'true');
                    link.removeAttribute('tabindex');
                }
            });
        });

        return this;
    },

    // ==================== 减少动画偏好 ====================

    /**
     * 检测 prefers-reduced-motion 偏好
     * @private
     */
    _detectReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this._reducedMotion = mediaQuery.matches;

        if (this._reducedMotion) {
            document.documentElement.classList.add('reduced-motion');
            document.documentElement.setAttribute('data-reduced-motion', 'true');

            // 发布减少动画事件
            if (window.AppCore && window.AppCore.bus) {
                window.AppCore.bus.emit('a11y:reducedMotion', { enabled: true });
            }
        }

        // 监听偏好变化
        const changeHandler = (e) => {
            this._reducedMotion = e.matches;
            document.documentElement.classList.toggle('reduced-motion', this._reducedMotion);
            document.documentElement.setAttribute('data-reduced-motion', String(this._reducedMotion));

            if (window.AppCore && window.AppCore.bus) {
                window.AppCore.bus.emit('a11y:reducedMotion', { enabled: this._reducedMotion });
            }

            if (window.AppCore) {
                window.AppCore.logger.info(this._logger, `减少动画偏好: ${this._reducedMotion ? '启用' : '禁用'}`);
            }
        };

        mediaQuery.addEventListener('change', changeHandler);
        this._boundEvents.push({ el: mediaQuery, event: 'change', handler: changeHandler });
    },

    /**
     * 获取当前减少动画偏好状态
     * @returns {boolean} 是否启用减少动画
     */
    isReducedMotion() {
        return this._reducedMotion;
    },

    // ==================== 高对比度模式支持 ====================

    /**
     * 检测 prefers-contrast: high 偏好
     * @private
     */
    _detectHighContrast() {
        const mediaQuery = window.matchMedia('(prefers-contrast: high)');
        this._highContrast = mediaQuery.matches;

        if (this._highContrast) {
            document.documentElement.classList.add('high-contrast');
            document.documentElement.setAttribute('data-high-contrast', 'true');
        }

        // 监听偏好变化
        const changeHandler = (e) => {
            this._highContrast = e.matches;
            document.documentElement.classList.toggle('high-contrast', this._highContrast);
            document.documentElement.setAttribute('data-high-contrast', String(this._highContrast));

            if (window.AppCore) {
                window.AppCore.logger.info(this._logger, `高对比度模式: ${this._highContrast ? '启用' : '禁用'}`);
            }
        };

        mediaQuery.addEventListener('change', changeHandler);
        this._boundEvents.push({ el: mediaQuery, event: 'change', handler: changeHandler });
    },

    /**
     * 获取当前高对比度模式状态
     * @returns {boolean} 是否启用高对比度
     */
    isHighContrast() {
        return this._highContrast;
    },

    // ==================== 全局事件绑定 ====================

    /**
     * 绑定全局事件
     * @private
     */
    _bindGlobalEvents() {
        // 监听模态框打开/关闭事件，自动管理焦点陷阱
        if (window.AppCore && window.AppCore.bus) {
            window.AppCore.bus.on('modal:open', (data) => {
                if (data && data.element) {
                    this.trapFocus(data.element);
                }
            });

            window.AppCore.bus.on('modal:close', (data) => {
                if (data && data.element) {
                    this.releaseFocus(data.element);
                }
            });
        }

        // 监听 DOM 变化，为动态添加的元素增强无障碍属性
        const mutationObserver = new MutationObserver((mutations) => {
            let shouldEnhance = false;

            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        shouldEnhance = true;
                        break;
                    }
                }
                if (shouldEnhance) break;
            }

            if (shouldEnhance) {
                // 延迟执行，等待 DOM 完全更新
                requestAnimationFrame(() => {
                    this._addIconLabels();
                    this._addAccordionAria();
                    this._enhanceCodeBlocks();
                    this._enhanceTables();
                    this._fixSvgLinks();
                });
            }
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        this._observers.push(mutationObserver);

        if (window.AppCore) {
            window.AppCore.logger.debug(this._logger, '全局事件绑定完成');
        }
    },

    // ==================== 销毁 ====================

    /**
     * 销毁无障碍模块，清理所有事件监听和状态
     */
    destroy() {
        // 断开所有 MutationObserver
        this._observers.forEach(observer => observer.disconnect());
        this._observers = [];

        // 移除所有绑定的事件
        this._boundEvents.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });
        this._boundEvents = [];

        // 释放所有焦点陷阱
        while (this._focusTrapStack.length > 0) {
            const trap = this._focusTrapStack.pop();
            trap.element.removeEventListener('keydown', trap.handler);
        }

        // 移除添加的 DOM 元素
        const skipNav = document.querySelector('.skip-nav');
        if (skipNav) skipNav.remove();

        const searchDescription = document.getElementById('search-modal-description');
        if (searchDescription) searchDescription.remove();

        // 移除 CSS 类
        document.body.classList.remove('keyboard-navigation');
        document.documentElement.classList.remove('reduced-motion', 'high-contrast');

        this._initialized = false;

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, '无障碍增强模块已销毁');
        }
    }
};

} // end of duplicate-check guard

// 暴露到全局作用域
window.A11yModule = A11yModule;

// ==================== 导出 ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { A11yModule };
}
