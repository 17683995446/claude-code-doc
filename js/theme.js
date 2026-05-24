/**
 * Claude Code Architecture Documentation - 主题切换模块
 * 支持暗色 / 亮色 / 自动（跟随系统）三态切换
 *
 * @version 2.0.0
 * @author Claude Code Architecture Team
 */

const ThemeModule = {
    current: 'dark',
    storageKey: 'claude-code-doc-theme',
    _logger: 'Theme',
    _systemMediaQuery: null,
    _boundEvents: [],

    themes: {
        dark: {
            '--bg-primary': '#0a0a12',
            '--bg-secondary': '#12121f',
            '--bg-card': '#1a1a2e',
            '--bg-code': '#0d1117',
            '--bg-hover': 'rgba(255,255,255,0.03)',
            '--text-primary': '#e8e8f0',
            '--text-secondary': '#9898b0',
            '--text-muted': '#6868a0',
            '--border-color': '#252545',
            '--border-light': '#353565',
            '--shadow': '0 8px 32px rgba(0,0,0,0.4)',
            '--shadow-lg': '0 16px 64px rgba(0,0,0,0.5)',
            '--accent-orange': '#e87e2f',
            '--accent-blue': '#6db3f2',
            '--accent-green': '#7bc47f',
            '--accent-purple': '#b48ead',
            '--accent-red': '#e06c75',
            '--accent-yellow': '#e5c07b',
            '--accent-cyan': '#56b6c2',
            '--hero-gradient': 'linear-gradient(135deg, #12121f 0%, #1a1a2e 40%, #16213e 100%)',
            '--card-hover-border': '#353565',
            '--scrollbar-track': '#12121f',
            '--scrollbar-thumb': '#353565',
            '--scrollbar-thumb-hover': '#e87e2f',
            '--info-bg': 'rgba(109,179,242,0.06)',
            '--code-bg': 'rgba(109,179,242,0.12)',
            '--tag-bg-opacity': '0.15',
            '--mermaid-bg': '#0d1117'
        },
        light: {
            '--bg-primary': '#f8f9fc',
            '--bg-secondary': '#ffffff',
            '--bg-card': '#ffffff',
            '--bg-code': '#f4f5f7',
            '--bg-hover': 'rgba(0,0,0,0.03)',
            '--text-primary': '#1a1a2e',
            '--text-secondary': '#5a5a7a',
            '--text-muted': '#8a8aaa',
            '--border-color': '#e2e4ea',
            '--border-light': '#d0d2d8',
            '--shadow': '0 4px 16px rgba(0,0,0,0.08)',
            '--shadow-lg': '0 8px 32px rgba(0,0,0,0.12)',
            '--accent-orange': '#d4691f',
            '--accent-blue': '#4a8fd4',
            '--accent-green': '#4a9a4e',
            '--accent-purple': '#8a6a9a',
            '--accent-red': '#c45050',
            '--accent-yellow': '#b89030',
            '--accent-cyan': '#3a8a96',
            '--hero-gradient': 'linear-gradient(135deg, #ffffff 0%, #f0f2f8 40%, #e8ecf4 100%)',
            '--card-hover-border': '#d0d2d8',
            '--scrollbar-track': '#f4f5f7',
            '--scrollbar-thumb': '#d0d2d8',
            '--scrollbar-thumb-hover': '#d4691f',
            '--info-bg': 'rgba(74,143,212,0.08)',
            '--code-bg': 'rgba(74,143,212,0.1)',
            '--tag-bg-opacity': '0.12',
            '--mermaid-bg': '#f4f5f7'
        }
    },

    /**
     * 三态切换顺序：dark → light → auto → dark
     */
    _themeOrder: ['dark', 'light', 'auto'],

    init() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ThemeModule', 'init');
        }

        this.createToggleButton();
        this.loadSaved();
        this.apply(this.current);
        this.bindEvents();
        this.initSystemThemeListener();

        if (window.AppCore) {
            window.AppCore.logger.info(this._logger, `主题模块初始化完成 (${this.current})`);
        }
        if (window.DetailedLogger) {
            window.DetailedLogger.info('ThemeModule', `初始化完成，当前主题: ${this.current}`);
            window.DetailedLogger.exit('ThemeModule', 'init');
        }
        return this;
    },

    /**
     * 创建主题切换按钮（支持三种状态图标）
     */
    createToggleButton() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ThemeModule', 'createToggleButton');
        }

        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('ThemeModule', '侧边栏未找到，无法创建主题切换按钮');
                window.DetailedLogger.exit('ThemeModule', 'createToggleButton');
            }
            return this;
        }

        const section = document.createElement('div');
        section.className = 'sidebar-section';
        section.innerHTML = `
            <div class="sidebar-section-title">外观</div>
            <ul class="sidebar-nav">
                <li>
                    <a href="#" id="theme-toggle" role="button" aria-label="切换主题">
                        <span class="nav-icon" id="theme-icon">🌙</span>
                        <span id="theme-label">切换亮色</span>
                    </a>
                </li>
                <li>
                    <a href="#" id="search-trigger" role="button" aria-label="搜索文档">
                        <span class="nav-icon">🔍</span>
                        <span>搜索文档</span>
                        <span class="nav-badge" style="font-size:0.65em;">⌘K</span>
                    </a>
                </li>
            </ul>
        `;
        sidebar.appendChild(section);

        if (window.DetailedLogger) {
            window.DetailedLogger.dom('ThemeModule', 'createElement', section, { type: 'theme-toggle-section' });
            window.DetailedLogger.exit('ThemeModule', 'createToggleButton');
        }

        return this;
    },

    /**
     * 加载保存的主题偏好
     */
    loadSaved() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ThemeModule', 'loadSaved');
        }

        const saved = localStorage.getItem(this.storageKey);
        if (window.DetailedLogger) {
            window.DetailedLogger.debug('ThemeModule', '读取localStorage', { key: this.storageKey, value: saved });
        }

        if (saved && (saved === 'dark' || saved === 'light' || saved === 'auto')) {
            this.current = saved;
            if (window.DetailedLogger) {
                window.DetailedLogger.info('ThemeModule', `加载保存的主题: ${saved}`);
            }
        } else {
            // 默认暗色
            this.current = 'dark';
            if (window.DetailedLogger) {
                window.DetailedLogger.info('ThemeModule', '使用默认主题: dark');
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('ThemeModule', 'loadSaved');
        }
        return this;
    },

    /**
     * 应用主题
     * @param {string} theme - 主题名称: dark / light / auto
     */
    apply(theme) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ThemeModule', 'apply', { theme });
        }

        // 如果是 auto 模式，根据系统偏好选择实际主题
        let actualTheme = theme;
        if (theme === 'auto') {
            actualTheme = this.getSystemTheme();
            if (window.DetailedLogger) {
                window.DetailedLogger.debug('ThemeModule', `auto模式，实际主题: ${actualTheme}`);
            }
        }

        const vars = this.themes[actualTheme];
        if (!vars) {
            if (window.DetailedLogger) {
                window.DetailedLogger.error('ThemeModule', `未知主题: ${actualTheme}`);
                window.DetailedLogger.exit('ThemeModule', 'apply');
            }
            return this;
        }

        const root = document.documentElement;
        const varCount = Object.entries(vars).length;

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('ThemeModule', `应用${varCount}个CSS变量`);
        }

        Object.entries(vars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        root.setAttribute('data-theme', actualTheme);
        root.setAttribute('data-theme-mode', theme); // 保存模式（dark/light/auto）

        const oldTheme = this.current;
        this.current = theme;

        if (window.DetailedLogger) {
            window.DetailedLogger.stateChange('ThemeModule', 'current', oldTheme, theme);
        }

        this.updateUI();

        // 通知 Mermaid 重新渲染
        if (typeof mermaid !== 'undefined' && typeof CONFIG !== 'undefined') {
            try {
                const mermaidConfig = (CONFIG.mermaid && typeof CONFIG.mermaid === 'object')
                    ? CONFIG.mermaid
                    : {};
                mermaid.initialize({
                    ...mermaidConfig,
                    theme: actualTheme === 'dark' ? 'dark' : 'default'
                });
                if (window.DetailedLogger) {
                    window.DetailedLogger.debug('ThemeModule', 'Mermaid主题已更新');
                }
            } catch (e) {
                console.warn('[Theme] Mermaid 初始化失败:', e.message);
                if (window.DetailedLogger) {
                    window.DetailedLogger.warn('ThemeModule', `Mermaid初始化失败: ${e.message}`);
                }
            }
        }

        // 通过事件总线发布主题变更
        if (window.AppCore && window.AppCore.bus) {
            window.AppCore.bus.emit('theme:change', { theme, actualTheme });
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.info('ThemeModule', `主题应用完成: ${theme} -> ${actualTheme}`);
            window.DetailedLogger.exit('ThemeModule', 'apply');
        }

        return this;
    },

    /**
     * 获取系统主题偏好
     * @returns {string} 'dark' 或 'light'
     */
    getSystemTheme() {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = isDark ? 'dark' : 'light';

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('ThemeModule', `系统主题: ${theme}`);
        }

        return theme;
    },

    /**
     * 三态切换：dark → light → auto → dark
     */
    toggle() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ThemeModule', 'toggle');
        }

        const currentIndex = this._themeOrder.indexOf(this.current);
        const nextIndex = (currentIndex + 1) % this._themeOrder.length;
        const next = this._themeOrder[nextIndex];

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('ThemeModule', `切换主题: ${this.current} -> ${next}`);
        }

        this.apply(next);

        try {
            localStorage.setItem(this.storageKey, next);
            if (window.DetailedLogger) {
                window.DetailedLogger.debug('ThemeModule', '主题偏好已保存到localStorage');
            }
        } catch (e) {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('ThemeModule', 'localStorage保存失败', { error: e.message });
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('ThemeModule', 'toggle');
        }

        return this;
    },

    /**
     * 更新 UI 显示（三种状态图标和标签）
     */
    updateUI() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ThemeModule', 'updateUI');
        }

        const icon = document.getElementById('theme-icon');
        const label = document.getElementById('theme-label');

        // 图标和标签映射
        const uiMap = {
            dark: { icon: '🌙', label: '切换亮色' },
            light: { icon: '☀️', label: '跟随系统' },
            auto: { icon: '💻', label: '切换暗色' }
        };

        const ui = uiMap[this.current];

        if (icon) {
            icon.textContent = ui.icon;
            if (window.DetailedLogger) {
                window.DetailedLogger.dom('ThemeModule', 'updateIcon', icon, { icon: ui.icon });
            }
        }

        if (label) {
            label.textContent = ui.label;
            if (window.DetailedLogger) {
                window.DetailedLogger.dom('ThemeModule', 'updateLabel', label, { label: ui.label });
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.exit('ThemeModule', 'updateUI');
        }

        return this;
    },

    /**
     * 初始化系统主题变化监听
     * auto 模式下自动跟随系统主题变化
     */
    initSystemThemeListener() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ThemeModule', 'initSystemThemeListener');
        }

        this._systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const systemChangeHandler = (e) => {
            // 仅在 auto 模式下响应系统主题变化
            if (this.current === 'auto') {
                const newTheme = e.matches ? 'dark' : 'light';
                if (window.DetailedLogger) {
                    window.DetailedLogger.info('ThemeModule', `系统主题变化，自动切换到 ${newTheme}`);
                }
                this.apply('auto');
            } else {
                if (window.DetailedLogger) {
                    window.DetailedLogger.debug('ThemeModule', '系统主题变化，但当前非auto模式，忽略');
                }
            }
        };

        this._systemMediaQuery.addEventListener('change', systemChangeHandler);
        this._boundEvents.push({ el: this._systemMediaQuery, event: 'change', handler: systemChangeHandler });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('ThemeModule', '系统主题监听器已注册');
            window.DetailedLogger.exit('ThemeModule', 'initSystemThemeListener');
        }

        return this;
    },

    bindEvents() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ThemeModule', 'bindEvents');
        }

        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            const clickHandler = (e) => {
                if (window.DetailedLogger) {
                    window.DetailedLogger.event('ThemeModule', 'click', toggle);
                }
                e.preventDefault();
                this.toggle();
            };
            toggle.addEventListener('click', clickHandler);
            this._boundEvents.push({ el: toggle, event: 'click', handler: clickHandler });
        } else {
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('ThemeModule', '主题切换按钮未找到');
            }
        }

        const searchTrigger = document.getElementById('search-trigger');
        if (searchTrigger && typeof SearchModule !== 'undefined') {
            const searchHandler = (e) => {
                if (window.DetailedLogger) {
                    window.DetailedLogger.event('ThemeModule', 'click', searchTrigger, { action: 'openSearch' });
                }
                e.preventDefault();
                SearchModule.toggle();
            };
            searchTrigger.addEventListener('click', searchHandler);
            this._boundEvents.push({ el: searchTrigger, event: 'click', handler: searchHandler });
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('ThemeModule', `绑定${this._boundEvents.length}个事件`);
            window.DetailedLogger.exit('ThemeModule', 'bindEvents');
        }

        return this;
    },

    /**
     * 获取当前实际应用的主题（auto 模式下返回系统主题）
     * @returns {string} 'dark' 或 'light'
     */
    getActualTheme() {
        if (this.current === 'auto') {
            return this.getSystemTheme();
        }
        return this.current;
    },

    destroy() {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ThemeModule', 'destroy');
        }

        this._boundEvents.forEach(({ el, event, handler }) => {
            el.removeEventListener(event, handler);
        });

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('ThemeModule', `移除${this._boundEvents.length}个事件监听`);
        }

        this._boundEvents = [];
        this._systemMediaQuery = null;

        if (window.DetailedLogger) {
            window.DetailedLogger.info('ThemeModule', '已销毁');
            window.DetailedLogger.exit('ThemeModule', 'destroy');
        }
    }
};
