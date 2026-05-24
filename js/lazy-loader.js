/**
 * 懒加载模块系统 - 动态导入和代码分割
 * 解决首屏加载性能问题
 * @version 1.0.0
 */

const LazyLoader = {
    _cache: new Map(),
    _loading: new Map(),
    _config: {
        // 模块配置：路径、依赖、预加载时机
        modules: {
            // 核心模块 - 立即加载
            core: { eager: true, path: 'js/core.js' },
            plugins: { eager: true, path: 'js/plugins.js' },
            main: { eager: true, path: 'js/main.js' },
            
            // 基础功能 - 立即加载
            theme: { eager: true, path: 'js/theme.js' },
            search: { eager: true, path: 'js/search.js' },
            features: { eager: true, path: 'js/features.js' },
            
            // 延迟加载模块 - 按需加载
            dashboard: { 
                eager: false, 
                path: 'js/dashboard.js',
                size: '40KB',
                preload: 'interaction' // 用户交互后预加载
            },
            bookmark: { 
                eager: false, 
                path: 'js/bookmark.js',
                size: '40KB',
                preload: 'interaction'
            },
            explorer: { 
                eager: false, 
                path: 'js/explorer.js',
                size: '32KB',
                preload: 'visible' // 元素可见时加载
            },
            enhancements: { 
                eager: false, 
                path: 'js/enhancements.js',
                size: '36KB',
                preload: 'idle' // 浏览器空闲时加载
            },
            a11y: { 
                eager: false, 
                path: 'js/a11y.js',
                size: '40KB',
                preload: 'idle'
            },
            i18n: { 
                eager: true, // i18n 已在 HTML 中静态加载
                path: 'js/i18n.js',
                size: '16KB',
                preload: null // 不通过 LazyLoader 加载
            }
        }
    },

    /**
     * 初始化懒加载系统
     */
    init() {
        this._setupPreloadListeners();
        this._preloadIdleModules();
        console.log('[LazyLoader] 懒加载系统已初始化');
    },

    /**
     * 加载指定模块
     * @param {string} name - 模块名称
     * @returns {Promise} 加载完成的 Promise
     */
    async load(name) {
        // 已缓存，直接返回
        if (this._cache.has(name)) {
            return this._cache.get(name);
        }

        // 正在加载中，返回现有 Promise
        if (this._loading.has(name)) {
            return this._loading.get(name);
        }

        const config = this._config.modules[name];
        if (!config) {
            throw new Error(`[LazyLoader] 未知模块: ${name}`);
        }

        // 检查是否已通过静态脚本加载
        if (config.eager && this._isStaticallyLoaded(name)) {
            this._cache.set(name, true);
            console.log(`[LazyLoader] ✓ 模块已通过静态脚本加载: ${name}`);
            return true;
        }

        // 创建加载 Promise
        const loadPromise = this._loadScript(config.path, name)
            .then(() => {
                this._cache.set(name, true);
                this._loading.delete(name);
                console.log(`[LazyLoader] ✓ 模块加载完成: ${name}`);
                return true;
            })
            .catch(err => {
                this._loading.delete(name);
                console.error(`[LazyLoader] ✗ 模块加载失败: ${name}`, err);
                throw err;
            });

        this._loading.set(name, loadPromise);
        return loadPromise;
    },

    /**
     * 批量加载多个模块
     * @param {string[]} names - 模块名称数组
     * @returns {Promise}
     */
    async loadAll(names) {
        return Promise.all(names.map(name => this.load(name)));
    },

    /**
     * 动态加载脚本
     * @private
     */
    _loadScript(path, name) {
        return new Promise((resolve, reject) => {
            // 检查是否已存在（按 data-module 属性）
            const existing = document.querySelector(`script[data-module="${name}"]`);
            if (existing) {
                resolve();
                return;
            }

            // 检查是否已存在（按 src 属性，防止路径重复加载）
            const existingBySrc = document.querySelector(`script[src="${path}"]`);
            if (existingBySrc) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = path;
            script.async = true;
            script.dataset.module = name;
            
            script.onload = () => {
                // 触发模块初始化
                this._initModule(name);
                resolve();
            };
            script.onerror = () => reject(new Error(`加载失败: ${path}`));
            
            document.head.appendChild(script);
        });
    },

    /**
     * 初始化加载的模块
     * @private
     */
    _initModule(name) {
        const moduleMap = {
            'dashboard': () => window.DashboardModule?.init(),
            'bookmark': () => window.BookmarkModule?.init(),
            'explorer': () => window.ExplorerModule?.init(),
            'enhancements': () => {
                window.WebVitalsModule?.init();
                window.TocModule?.init();
                window.CodeCopyModule?.init();
            },
            'a11y': () => window.A11yModule?.init(),
            'i18n': () => window.I18nModule?.init()
        };

        const initFn = moduleMap[name];
        if (initFn) {
            try {
                initFn();
            } catch (e) {
                console.warn(`[LazyLoader] 模块 ${name} 初始化警告:`, e);
            }
        }
    },

    /**
     * 设置预加载监听器
     * @private
     */
    _setupPreloadListeners() {
        // 交互预加载：用户点击/悬停时预加载
        const interactionModules = this._getModulesByPreload('interaction');
        
        // 保存 click handler 引用，以便 destroy 时移除
        this._documentClickHandler = (e) => {
            // 点击数据面板按钮时加载 dashboard
            if (e.target.closest('[data-load="dashboard"]') || e.target.closest('#dashboardBtn')) {
                this.load('dashboard');
            }
            // 点击笔记按钮时加载 bookmark
            if (e.target.closest('[data-load="bookmark"]') || e.target.closest('#bookmarkBtn')) {
                this.load('bookmark');
            }
            // 点击探索架构时加载 explorer
            if (e.target.closest('[data-load="explorer"]') || e.target.closest('#explorerBtn')) {
                this.load('explorer');
            }
        };
        document.addEventListener('click', this._documentClickHandler, { passive: true });

        // 可见性预加载：使用 IntersectionObserver
        const visibleModules = this._getModulesByPreload('visible');
        if (visibleModules.length > 0 && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const moduleName = entry.target.dataset.lazyLoad;
                        if (moduleName) {
                            this.load(moduleName);
                            observer.unobserve(entry.target);
                        }
                    }
                });
            }, { rootMargin: '100px' });
            this._observer = observer; // 保存引用以便 destroy 时清理

            // 观察带有 data-lazy-load 属性的元素
            document.querySelectorAll('[data-lazy-load]').forEach(el => observer.observe(el));
        }
    },

    /**
     * 预加载空闲模块
     * @private
     */
    _preloadIdleModules() {
        const idleModules = this._getModulesByPreload('idle');
        
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                idleModules.forEach(name => {
                    this.load(name).catch(() => {});
                });
            }, { timeout: 5000 });
        } else {
            // 降级：setTimeout
            setTimeout(() => {
                idleModules.forEach(name => {
                    this.load(name).catch(() => {});
                });
            }, 2000);
        }

        // immediate 模块尽快加载
        const immediateModules = this._getModulesByPreload('immediate');
        immediateModules.forEach(name => {
            setTimeout(() => this.load(name).catch(() => {}), 0);
        });
    },

    /**
     * 根据预加载策略获取模块列表
     * @private
     */
    _getModulesByPreload(strategy) {
        return Object.entries(this._config.modules)
            .filter(([_, config]) => config.preload === strategy)
            .map(([name, _]) => name);
    },

    /**
     * 检查模块是否已通过静态脚本加载
     * @private
     */
    _isStaticallyLoaded(name) {
        const config = this._config.modules[name];
        if (config && config.eager) {
            // 检查全局对象是否存在
            const moduleMap = {
                'core': () => typeof AppCore !== 'undefined',
                'plugins': () => typeof PluginSystem !== 'undefined',
                'main': () => typeof SidebarModule !== 'undefined',
                'theme': () => typeof ThemeModule !== 'undefined',
                'search': () => typeof SearchModule !== 'undefined',
                'features': () => typeof ToastModule !== 'undefined',
                'i18n': () => typeof I18nModule !== 'undefined'
            };
            const check = moduleMap[name];
            return check ? check() : false;
        }
        return false;
    },

    /**
     * 获取加载统计
     */
    getStats() {
        return {
            cached: this._cache.size,
            loading: this._loading.size,
            total: Object.keys(this._config.modules).length,
            modules: Array.from(this._cache.keys())
        };
    },

    /**
     * 预加载指定模块（手动触发）
     * @param {string} name - 模块名称
     */
    preload(name) {
        if (!this._cache.has(name) && !this._loading.has(name)) {
            this.load(name).catch(() => {});
        }
    },

    /**
     * 销毁懒加载模块，清理所有资源
     */
    destroy() {
        // 清理缓存和加载状态
        this._cache.clear();
        this._loading.clear();

        // 移除 document click 监听器
        if (this._documentClickHandler) {
            document.removeEventListener('click', this._documentClickHandler);
            this._documentClickHandler = null;
        }

        // 移除动态加载的脚本标签
        document.querySelectorAll('script[data-module]').forEach(script => {
            script.remove();
        });

        // 清理 IntersectionObserver
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        console.log('[LazyLoader] 懒加载模块已销毁');
    }
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    LazyLoader.init();
});

// 暴露到全局
window.LazyLoader = LazyLoader;
