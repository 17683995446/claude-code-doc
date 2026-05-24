/**
 * 统一模块管理系统 v2.0
 * 解决重复加载、依赖管理、生命周期问题
 * @version 2.0.0
 */

const ModuleSystem = {
    // 模块注册表
    _registry: new Map(),
    
    // 模块状态
    _states: new Map(),
    
    // 依赖图
    _dependencies: new Map(),
    
    // 配置
    _config: {
        debug: false,
        strictMode: true,
        autoInit: true
    },

    /**
     * 注册模块
     * @param {string} name - 模块名称
     * @param {Object} definition - 模块定义
     * @param {Object} options - 配置选项
     */
    register(name, definition, options = {}) {
        if (this._registry.has(name)) {
            if (this._config.strictMode) {
                console.warn(`[ModuleSystem] 模块 "${name}" 已注册，跳过重复注册`);
            }
            return this;
        }

        const moduleDef = {
            name,
            definition,
            options: {
                dependencies: [],
                lazy: false,
                autoInit: true,
                ...options
            },
            state: 'registered',
            instance: null,
            exports: null
        };

        this._registry.set(name, moduleDef);
        this._states.set(name, 'registered');
        
        // 记录依赖
        if (moduleDef.options.dependencies.length > 0) {
            this._dependencies.set(name, moduleDef.options.dependencies);
        }

        if (this._config.debug) {
            console.log(`[ModuleSystem] 模块 "${name}" 已注册`);
        }

        // 自动初始化非懒加载模块
        if (moduleDef.options.autoInit && !moduleDef.options.lazy) {
            this.init(name).catch(err => console.error(`[ModuleSystem] 模块 "${name}" 自动初始化失败:`, err));
        }

        return this;
    },

    /**
     * 初始化模块
     * @param {string} name - 模块名称
     * @returns {Promise<any>} 模块实例
     */
    async init(name) {
        const moduleDef = this._registry.get(name);
        
        if (!moduleDef) {
            throw new Error(`[ModuleSystem] 模块 "${name}" 未注册`);
        }

        // 已初始化，直接返回
        if (moduleDef.state === 'initialized') {
            return moduleDef.exports;
        }

        // 正在初始化，说明存在循环依赖
        if (moduleDef.state === 'initializing') {
            throw new Error(`[ModuleSystem] 检测到循环依赖: ${name}`);
        }

        // 标记为初始化中
        moduleDef.state = 'initializing';
        this._states.set(name, 'initializing');

        try {
            // 先初始化依赖
            if (this._dependencies.has(name)) {
                const deps = this._dependencies.get(name);
                for (const dep of deps) {
                    await this.init(dep);
                }
            }

            // 初始化模块
            const { definition, options } = moduleDef;
            
            let instance;
            if (typeof definition === 'function') {
                // 类/构造函数
                const deps = this._resolveDependencies(options.dependencies);
                instance = new definition(...deps);
            } else if (typeof definition.init === 'function') {
                // 对象模块，调用 init 方法
                instance = definition;
                const result = await definition.init();
                if (result !== undefined) {
                    instance = result;
                }
            } else {
                // 纯对象
                instance = definition;
            }

            moduleDef.instance = instance;
            moduleDef.exports = instance;
            moduleDef.state = 'initialized';
            this._states.set(name, 'initialized');

            if (this._config.debug) {
                console.log(`[ModuleSystem] 模块 "${name}" 初始化完成`);
            }

            // 触发模块就绪事件
            this.emit('module:ready', { name, instance });

            return instance;

        } catch (error) {
            moduleDef.state = 'error';
            this._states.set(name, 'error');
            console.error(`[ModuleSystem] 模块 "${name}" 初始化失败:`, error);
            throw error;
        }
    },

    /**
     * 懒加载模块
     * @param {string} name - 模块名称
     * @param {string} path - 脚本路径
     * @returns {Promise<any>} 模块实例
     */
    async lazyLoad(name, path) {
        // 已加载，直接返回
        if (this._registry.has(name) && this._states.get(name) === 'initialized') {
            return this._registry.get(name).exports;
        }

        // 正在加载，等待完成
        if (this._loading && this._loading.has(name)) {
            return this._loading.get(name);
        }

        if (!this._loading) {
            this._loading = new Map();
        }

        const loadPromise = this._loadScript(path).then(() => {
            // 脚本加载后，模块应该已自动注册
            if (this._registry.has(name)) {
                return this.init(name);
            }
            throw new Error(`[ModuleSystem] 脚本加载后模块 "${name}" 未注册`);
        }).finally(() => {
            this._loading.delete(name);
        });

        this._loading.set(name, loadPromise);
        return loadPromise;
    },

    /**
     * 加载脚本
     * @private
     */
    _loadScript(path) {
        return new Promise((resolve, reject) => {
            // 检查是否已加载（使用 CSS.escape 防止选择器注入）
            const escapedPath = CSS.escape(path);
            const existing = document.querySelector(`script[src*="${escapedPath}"]`);
            if (existing) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = path;
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`[ModuleSystem] 加载失败: ${path}`));
            
            document.head.appendChild(script);
        });
    },

    /**
     * 解析依赖
     * @private
     */
    _resolveDependencies(deps) {
        return deps.map(dep => {
            const moduleDef = this._registry.get(dep);
            if (!moduleDef || moduleDef.state !== 'initialized') {
                throw new Error(`[ModuleSystem] 依赖 "${dep}" 未初始化`);
            }
            return moduleDef.exports;
        });
    },

    /**
     * 等待模块初始化完成
     * @private
     */
    _waitForInit(name, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const check = () => {
                const moduleDef = this._registry.get(name);

                if (!moduleDef) {
                    reject(new Error(`[ModuleSystem] 模块 "${name}" 未注册`));
                    return;
                }

                if (moduleDef.state === 'initialized') {
                    resolve(moduleDef.exports);
                    return;
                }
                
                if (moduleDef.state === 'error') {
                    reject(new Error(`[ModuleSystem] 模块 "${name}" 初始化失败`));
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`[ModuleSystem] 等待模块 "${name}" 初始化超时`));
                    return;
                }
                
                setTimeout(check, 50);
            };
            
            check();
        });
    },

    /**
     * 获取模块
     * @param {string} name - 模块名称
     */
    get(name) {
        const moduleDef = this._registry.get(name);
        return moduleDef ? moduleDef.exports : undefined;
    },

    /**
     * 检查模块状态
     * @param {string} name - 模块名称
     */
    status(name) {
        return this._states.get(name) || 'unknown';
    },

    /**
     * 获取所有模块状态
     */
    healthCheck() {
        const report = {
            total: this._registry.size,
            initialized: 0,
            failed: 0,
            pending: 0,
            modules: {}
        };

        for (const [name, state] of this._states) {
            report.modules[name] = state;
            if (state === 'initialized') report.initialized++;
            else if (state === 'error') report.failed++;
            else report.pending++;
        }

        return report;
    },

    /**
     * 配置
     * @param {Object} config - 配置对象
     */
    configure(config) {
        Object.assign(this._config, config);
        return this;
    },

    /**
     * 事件发射器（简化版）
     */
    _events: new Map(),
    
    on(event, handler) {
        if (!this._events.has(event)) {
            this._events.set(event, new Set());
        }
        this._events.get(event).add(handler);
        return this;
    },
    
    off(event, handler) {
        if (this._events.has(event)) {
            this._events.get(event).delete(handler);
        }
        return this;
    },
    
    emit(event, data) {
        if (this._events.has(event)) {
            this._events.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (e) {
                    console.error('[ModuleSystem] 事件处理错误:', e);
                }
            });
        }
        return this;
    }
};

// 全局暴露
window.ModuleSystem = ModuleSystem;

// 兼容性：如果 AppCore 存在，集成到 AppCore
if (window.AppCore) {
    AppCore.module = ModuleSystem;
}
