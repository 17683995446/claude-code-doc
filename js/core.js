/**
 * Claude Code Architecture Documentation - 核心模块系统
 * 统一模块管理、事件总线、日志工具、通用工具函数
 *
 * @version 5.0.0
 * @author Claude Code Architecture Team
 */

// ==================== EventBus 事件总线 ====================
/**
 * 轻量级事件总线，替代 State.notify 的 CustomEvent
 * 支持事件订阅、发布、取消订阅、一次性监听
 */
class EventBus {
    constructor() {
        // 事件监听器映射表：{ eventName: [handler, ...] }
        this._listeners = new Map();
        // 事件历史记录（用于调试）
        this._history = [];
        // 最大历史记录数
        this._maxHistory = 100;
        // [BUG-001修复] 递归emit保护：跟踪正在派发的事件
        this._emitting = new Set();
        // [BUG-005修复] 最大监听器数量限制
        this._maxListeners = 100;
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @param {Object} [options] - 选项
     * @param {boolean} [options.once=false] - 是否只触发一次
     * @returns {Function} 取消订阅函数
     */
    on(event, handler, options = {}) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('EventBus', 'on', { event, once: options.once });
        }

        // [BUG-005修复] 监听器数量超限警告
        const existingListeners = this._listeners.get(event);
        if (existingListeners && existingListeners.length >= this._maxListeners) {
            console.warn(`[EventBus] 事件 "${event}" 的监听器数量超过最大限制 (${this._maxListeners})，可能导致内存泄漏`);
        }

        if (typeof handler !== 'function') {
            console.error(`[EventBus] 订阅失败: handler 不是函数 (${event})`);
            if (window.DetailedLogger) {
                window.DetailedLogger.error('EventBus', 'on: handler不是函数', { event });
            }
            return () => {};
        }

        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }

        const listener = { handler, once: !!options.once };
        this._listeners.get(event).push(listener);

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('EventBus', `订阅事件: ${event}`, {
                listenerCount: this._listeners.get(event).length,
                once: options.once
            });
        }

        // 返回取消订阅函数
        return () => this.off(event, handler);
    }

    /**
     * 订阅事件（只触发一次）
     * @param {string} event - 事件名称
     * @param {Function} handler - 事件处理函数
     * @returns {Function} 取消订阅函数
     */
    once(event, handler) {
        return this.on(event, handler, { once: true });
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {Function} handler - 要移除的处理函数
     */
    off(event, handler) {
        const listeners = this._listeners.get(event);
        if (!listeners) return;

        this._listeners.set(event, listeners.filter(l => l.handler !== handler));
    }

    /**
     * 发布事件
     * @param {string} event - 事件名称
     * @param {*} [data] - 事件数据
     */
    emit(event, data) {
        // [BUG-ROUND9-017修复] 检查事件名有效性
        if (event == null || typeof event !== 'string') {
            console.warn('[EventBus] emit: 事件名无效 (null/非字符串)');
            return;
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.enter('EventBus', 'emit', { event });
        }

        // [BUG-001修复] 递归emit保护：阻止同一事件的递归派发
        if (this._emitting.has(event)) {
            console.warn(`[EventBus] 检测到递归 emit，已阻止: ${event}`);
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('EventBus', `递归emit已阻止: ${event}`);
            }
            return;
        }
        this._emitting.add(event);

        try {
        // 记录事件历史
        this._history.push({ event, data, time: Date.now() });
        if (this._history.length > this._maxHistory) {
            this._history.shift();
        }

        const listeners = this._listeners.get(event);
        if (!listeners || listeners.length === 0) {
            // 只对重要错误事件发出警告，忽略 state: 事件（这些事件可能没有监听器是正常的）
            const isStateEvent = event.startsWith('state:');
            const isImportantEvent = ['app:error', 'module:error', 'system:error'].includes(event);

            if (window.DetailedLogger) {
                if (isImportantEvent) {
                    window.DetailedLogger.warn('EventBus', `emit: 重要事件无监听器 (${event})`);
                } else if (!isStateEvent) {
                    // 非state事件的调试信息
                    window.DetailedLogger.debug('EventBus', `emit: 无监听器 (${event})`);
                }
                // state: 事件无监听器时不记录（减少噪音）
            }
            return;
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('EventBus', `发布事件: ${event}`, {
                listenerCount: listeners.length,
                data: typeof data === 'object' ? '[Object]' : data
            });
        }

        // 复制一份避免遍历时修改
        const snapshot = [...listeners];
        let successCount = 0;
        let errorCount = 0;

        for (const listener of snapshot) {
            try {
                listener.handler(data);
                successCount++;
            } catch (err) {
                errorCount++;
                console.error(`[EventBus] 事件处理错误 (${event}):`, err);
                if (window.DetailedLogger) {
                    window.DetailedLogger.error('EventBus', `事件处理错误: ${event}`, {
                        error: err.message,
                        stack: err.stack
                    });
                }
            }

            // 一次性监听器自动移除
            if (listener.once) {
                this.off(event, listener.handler);
            }
        }

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('EventBus', `事件处理完成: ${event}`, {
                success: successCount,
                errors: errorCount
            });
        }
        } finally {
            // [BUG-001修复] 递归emit保护：释放事件锁
            this._emitting.delete(event);
        }
    }

    /**
     * 清除指定事件的所有监听器
     * @param {string} [event] - 事件名称，不传则清除所有
     */
    clear(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
            // [BUG-ROUND9-007修复] clear时同步清理history和emitting
            this._history = [];
            this._emitting.clear();
        }
    }

    /**
     * 获取事件历史记录
     * @returns {Array} 事件历史
     */
    getHistory() {
        // [BUG-011修复] 返回深拷贝，防止外部修改影响内部历史
        return this._history.map(entry => ({ ...entry }));
    }

    /**
     * 销毁事件总线，清除所有监听器
     */
    destroy() {
        this._listeners.clear();
        this._history = [];
    }
}

// ==================== ModuleRegistry 模块注册表 ====================
/**
 * 统一管理所有模块的生命周期
 * 支持 init / destroy / pause / resume
 */
class ModuleRegistry {
    constructor() {
        // 已注册模块：{ name: { instance, status, dependencies } }
        this._modules = new Map();
        // 模块状态常量
        this.STATUS = {
            REGISTERED: 'registered',
            INITIALIZING: 'initializing',
            INITIALIZED: 'initialized',
            DESTROYED: 'destroyed',
            // [BUG-004修复] 添加 PAUSED 状态
            PAUSED: 'paused',
            ERROR: 'error'
        };
    }

    /**
     * 注册模块
     * @param {string} name - 模块名称
     * @param {Object} instance - 模块实例（需有 init/destroy 方法）
     * @param {string[]} [dependencies=[]] - 依赖的模块名称列表
     */
    register(name, instance, dependencies = []) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ModuleRegistry', 'register', { name, dependencies });
        }

        if (this._modules.has(name)) {
            console.warn(`[ModuleRegistry] 模块 "${name}" 已注册，将被覆盖`);
            if (window.DetailedLogger) {
                window.DetailedLogger.warn('ModuleRegistry', `模块已注册将被覆盖: ${name}`);
            }
        }

        this._modules.set(name, {
            instance,
            status: this.STATUS.REGISTERED,
            dependencies,
            initializedAt: null,
            error: null
        });

        if (window.DetailedLogger) {
            window.DetailedLogger.info('ModuleRegistry', `模块注册成功: ${name}`, {
                dependencies,
                totalModules: this._modules.size
            });
        }

        return this;
    }

    /**
     * 初始化指定模块
     * @param {string} name - 模块名称
     * @returns {Promise<boolean>} 是否初始化成功
     */
    async init(name) {
        if (window.DetailedLogger) {
            window.DetailedLogger.enter('ModuleRegistry', 'init', { name });
        }

        const mod = this._modules.get(name);
        if (!mod) {
            console.error(`[ModuleRegistry] 模块 "${name}" 未注册`);
            if (window.DetailedLogger) {
                window.DetailedLogger.error('ModuleRegistry', `模块未注册: ${name}`);
            }
            return false;
        }

        // [BUG-003修复] 检查模块实例是否为 null/undefined
        if (!mod.instance || typeof mod.instance !== 'object') {
            console.error(`[ModuleRegistry] 模块 "${name}" 的实例无效 (null 或非对象)`);
            mod.status = this.STATUS.ERROR;
            mod.error = '模块实例无效';
            if (window.DetailedLogger) {
                window.DetailedLogger.error('ModuleRegistry', `模块实例无效: ${name}`);
            }
            return false;
        }

        if (mod.status === this.STATUS.INITIALIZED) {
            if (window.DetailedLogger) {
                window.DetailedLogger.debug('ModuleRegistry', `模块已初始化: ${name}`);
            }
            return true; // 已初始化
        }

        // 标记为初始化中（在依赖检查之前，用于检测循环依赖）
        mod.status = this.STATUS.INITIALIZING;

        if (window.DetailedLogger) {
            window.DetailedLogger.debug('ModuleRegistry', `开始初始化模块: ${name}`, {
                dependencies: mod.dependencies
            });
        }

        // 检查依赖
        for (const dep of mod.dependencies) {
            const depMod = this._modules.get(dep);
            if (!depMod) {
                console.error(`[ModuleRegistry] 模块 "${name}" 依赖 "${dep}" 未注册`);
                mod.status = this.STATUS.ERROR;
                mod.error = `依赖 "${dep}" 未注册`;
                if (window.DetailedLogger) {
                    window.DetailedLogger.error('ModuleRegistry', `依赖未注册: ${name} -> ${dep}`);
                }
                return false;
            }
            if (depMod.status !== this.STATUS.INITIALIZED) {
                // 检测循环依赖
                if (depMod.status === this.STATUS.INITIALIZING) {
                    const errMsg = `[ModuleRegistry] 检测到循环依赖: "${name}" -> "${dep}"`;
                    console.error(errMsg);
                    mod.status = this.STATUS.ERROR;
                    mod.error = errMsg;
                    if (window.DetailedLogger) {
                        window.DetailedLogger.error('ModuleRegistry', `循环依赖: ${name} -> ${dep}`);
                    }
                    return false;
                }
                if (window.DetailedLogger) {
                    window.DetailedLogger.debug('ModuleRegistry', `初始化依赖: ${name} -> ${dep}`);
                }
                // [BUG-ROUND9-001修复] 检查依赖初始化返回值
                const depResult = await this.init(dep);
                if (!depResult) {
                    mod.status = this.STATUS.ERROR;
                    mod.error = `依赖 "${dep}" 初始化失败`;
                    console.error(`[ModuleRegistry] 模块 "${name}" 的依赖 "${dep}" 初始化失败`);
                    if (window.DetailedLogger) {
                        window.DetailedLogger.error('ModuleRegistry', `依赖初始化失败: ${name} -> ${dep}`);
                    }
                    return false;
                }
            }
        }

        // 执行初始化
        try {
            if (window.DetailedLogger) {
                window.DetailedLogger.timeStart('ModuleRegistry', `init_${name}`);
            }

            if (typeof mod.instance.init === 'function') {
                await mod.instance.init();
            }
            mod.status = this.STATUS.INITIALIZED;
            mod.initializedAt = Date.now();

            if (window.DetailedLogger) {
                window.DetailedLogger.timeEnd('ModuleRegistry', `init_${name}`);
                window.DetailedLogger.info('ModuleRegistry', `模块初始化成功: ${name}`);
            }

            return true;
        } catch (err) {
            mod.status = this.STATUS.ERROR;
            mod.error = err.message;
            console.error(`[ModuleRegistry] 模块 "${name}" 初始化失败:`, err);
            if (window.DetailedLogger) {
                window.DetailedLogger.error('ModuleRegistry', `模块初始化失败: ${name}`, {
                    error: err.message,
                    stack: err.stack
                });
            }
            return false;
        }
    }

    /**
     * 初始化所有已注册模块（按依赖顺序）
     * @returns {Promise<Object>} 初始化结果 { success: string[], failed: string[] }
     */
    async initAll() {
        const success = [];
        const failed = [];

        for (const [name] of this._modules) {
            const result = await this.init(name);
            if (result) {
                success.push(name);
            } else {
                failed.push(name);
            }
        }

        return { success, failed };
    }

    /**
     * 销毁指定模块
     * @param {string} name - 模块名称
     */
    async destroy(name) {
        const mod = this._modules.get(name);
        if (!mod || mod.status === this.STATUS.DESTROYED) return;

        // [BUG-ROUND9-008修复] 检查instance是否为null
        if (!mod.instance || typeof mod.instance !== 'object') {
            mod.status = this.STATUS.DESTROYED;
            return;
        }

        try {
            if (typeof mod.instance.destroy === 'function') {
                await mod.instance.destroy();
            }
            mod.status = this.STATUS.DESTROYED;
        } catch (err) {
            console.error(`[ModuleRegistry] 模块 "${name}" 销毁失败:`, err);
            mod.status = this.STATUS.ERROR;
            mod.error = err.message;
        }
    }

    /**
     * [BUG-ROUND5-001修复] 注销模块：从注册表中完全移除模块
     * [BUG-ROUND9-002修复] 改为async，处理INITIALIZING状态，await destroy
     * @param {string} name - 模块名称
     * @returns {Promise<boolean>} 是否成功注销
     */
    async unregister(name) {
        const mod = this._modules.get(name);
        if (!mod) {
            console.warn(`[ModuleRegistry] 模块 "${name}" 不存在，无法注销`);
            return false;
        }

        // 检查是否有其他模块依赖此模块
        for (const [otherName, otherMod] of this._modules) {
            if (otherName !== name && otherMod.dependencies && otherMod.dependencies.includes(name)) {
                console.error(`[ModuleRegistry] 无法注销模块 "${name}"，因为模块 "${otherName}" 依赖它`);
                return false;
            }
        }

        // [BUG-ROUND9-002修复] 对所有非REGISTERED状态尝试销毁
        if (mod.status === this.STATUS.INITIALIZING) {
            console.warn(`[ModuleRegistry] 模块 "${name}" 正在初始化中，强制注销可能导致资源泄漏`);
        }
        if (mod.status !== this.STATUS.REGISTERED) {
            await this.destroy(name);
        }

        // 从注册表中移除
        this._modules.delete(name);

        if (window.DetailedLogger) {
            window.DetailedLogger.info('ModuleRegistry', `模块已注销: ${name}`);
        }

        return true;
    }

    /**
     * 销毁所有模块（按依赖拓扑排序逆序）
     */
    async destroyAll() {
        // [BUG-010修复] 使用拓扑排序确保依赖者先于被依赖者销毁
        const sorted = this._topologicalSort();
        const names = sorted.reverse();
        for (const name of names) {
            await this.destroy(name);
        }
    }

    /**
     * [BUG-010修复] 拓扑排序：确保依赖关系正确的销毁顺序
     */
    _topologicalSort() {
        const visited = new Set();
        const result = [];

        const visit = (name) => {
            if (visited.has(name)) return;
            visited.add(name);
            const mod = this._modules.get(name);
            if (mod && mod.dependencies) {
                for (const dep of mod.dependencies) {
                    visit(dep);
                }
            }
            result.push(name);
        };

        for (const name of this._modules.keys()) {
            visit(name);
        }

        return result;
    }

    /**
     * 获取模块实例
     * @param {string} name - 模块名称
     * @returns {Object|null} 模块实例
     */
    get(name) {
        const mod = this._modules.get(name);
        return mod ? mod.instance : null;
    }

    /**
     * 获取模块状态
     * @param {string} name - 模块名称
     * @returns {string} 模块状态
     */
    getStatus(name) {
        const mod = this._modules.get(name);
        return mod ? mod.status : 'unknown';
    }

    /**
     * 获取所有已注册模块名称
     * @returns {string[]} 模块名称列表
     */
    getRegistered() {
        return [...this._modules.keys()];
    }

    /**
     * 获取模块统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const stats = { total: 0, initialized: 0, error: 0, destroyed: 0 };
        for (const [, mod] of this._modules) {
            stats.total++;
            if (mod.status === this.STATUS.INITIALIZED) stats.initialized++;
            if (mod.status === this.STATUS.ERROR) stats.error++;
            if (mod.status === this.STATUS.DESTROYED) stats.destroyed++;
        }
        return stats;
    }

    /**
     * 模块健康检查
     * @returns {Array} 健康检查结果
     */
    healthCheck() {
        const results = [];
        for (const [name, mod] of this._modules) {
            try {
                const instance = mod.instance;
                // [BUG-ROUND9-009修复] 检查instance是否为null
                if (!instance || typeof instance !== 'object') {
                    results.push({ name, status: 'error', error: '模块实例为 null 或非对象' });
                    continue;
                }
                const health = {
                    name,
                    status: 'healthy',
                    hasInit: typeof instance.init === 'function',
                    hasDestroy: typeof instance.destroy === 'function',
                    isInitialized: !!instance._initialized
                };
                
                // 检查关键方法
                const requiredMethods = ['init', 'destroy'];
                const missingMethods = requiredMethods.filter(m => typeof instance[m] !== 'function');
                if (missingMethods.length > 0) {
                    health.status = 'degraded';
                    health.missingMethods = missingMethods;
                }
                
                results.push(health);
            } catch (e) {
                results.push({ name, status: 'error', error: e.message });
            }
        }
        return results;
    }
}

// ==================== Logger 日志工具 ====================
/**
 * 带时间戳和模块名的日志工具
 * 支持 debug / info / warn / error 四个级别
 */
class Logger {
    constructor() {
        // 日志级别映射
        this._levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        // 当前日志级别（默认 info）
        this._currentLevel = 1;
        // 是否启用日志
        this._enabled = true;
    }

    /**
     * 设置日志级别
     * @param {string} level - 日志级别: debug / info / warn / error
     */
    setLevel(level) {
        if (level in this._levels) {
            this._currentLevel = this._levels[level];
        }
    }

    /**
     * 启用/禁用日志
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this._enabled = enabled;
    }

    /**
     * 格式化时间戳
     * @returns {string} 格式化的时间字符串
     */
    _timestamp() {
        const now = new Date();
        return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    }

    /**
     * 输出日志
     * @param {string} level - 日志级别
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {*} [data] - 附加数据
     */
    _log(level, module, message, data) {
        if (!this._enabled) return;

        // [BUG-006修复] 白名单校验，防止未知 level 导致 TypeError
        const validLevels = ['debug', 'info', 'warn', 'error'];
        if (!validLevels.includes(level)) {
            console.warn(`[Logger] 未知的日志级别: ${level}，降级为 info`);
            level = 'info';
        }

        if (this._levels[level] < this._currentLevel) return;

        const ts = this._timestamp();
        const prefix = `[${ts}] [${level.toUpperCase()}] [${module}]`;

        if (data !== undefined) {
            console[level === 'debug' ? 'log' : level](`${prefix} ${message}`, data);
        } else {
            console[level === 'debug' ? 'log' : level](`${prefix} ${message}`);
        }
    }

    /**
     * 调试日志
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {*} [data] - 附加数据
     */
    debug(module, message, data) {
        this._log('debug', module, message, data);
    }

    /**
     * 信息日志
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {*} [data] - 附加数据
     */
    info(module, message, data) {
        this._log('info', module, message, data);
    }

    /**
     * 警告日志
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {*} [data] - 附加数据
     */
    warn(module, message, data) {
        this._log('warn', module, message, data);
    }

    /**
     * 错误日志
     * @param {string} module - 模块名称
     * @param {string} message - 日志消息
     * @param {*} [data] - 附加数据
     */
    error(module, message, data) {
        this._log('error', module, message, data);
    }
}

// ==================== Utils 工具函数 ====================

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟毫秒数
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay = 300) {
    let timer = null;
    // [BUG-ROUND9-003修复] 保存最后一次调用的this和args，供flush使用
    let lastThis = null;
    let lastArgs = null;
    const debounced = function (...args) {
        lastThis = this;
        lastArgs = args;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(lastThis, lastArgs);
            timer = null;
        }, delay);
    };
    // [BUG-008修复] 添加 cancel 和 flush 方法
    debounced.cancel = function () {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };
    // [BUG-ROUND9-003修复] flush使用保存的lastThis和lastArgs
    debounced.flush = function () {
        if (timer) {
            clearTimeout(timer);
            fn.apply(lastThis, lastArgs);
            timer = null;
        }
    };
    return debounced;
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} interval - 间隔毫秒数
 * @returns {Function} 节流后的函数
 */
function throttle(fn, interval = 200) {
    let lastTime = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastTime >= interval) {
            lastTime = now;
            fn.apply(this, args);
        }
    };
}

/**
 * 格式化日期
 * @param {Date|string|number} [date] - 日期对象/时间戳/日期字符串
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - 格式模板
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const pad = (n) => String(n).padStart(2, '0');

    const replacements = {
        'YYYY': d.getFullYear(),
        'MM': pad(d.getMonth() + 1),
        'DD': pad(d.getDate()),
        'HH': pad(d.getHours()),
        'mm': pad(d.getMinutes()),
        'ss': pad(d.getSeconds())
    };

    let result = format;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(key, value);
    }
    return result;
}

/**
 * 生成唯一 ID
 * @param {string} [prefix=''] - ID 前缀
 * @returns {string} 唯一标识符
 */
function generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

// ==================== ModuleInterface 模块接口基类 ====================
/**
 * 模块接口基类
 * 所有模块应实现：init(), destroy(), getName(), getVersion()
 */
class ModuleInterface {
    constructor() {
        if (this.constructor === ModuleInterface) {
            throw new Error('ModuleInterface 是抽象类，不能直接实例化');
        }
        this._initialized = false;
        this._name = 'unknown';
        this._version = '0.0.0';
    }
    
    async init() { throw new Error('init() 必须由子类实现'); }
    async destroy() { throw new Error('destroy() 必须由子类实现'); }
    getName() { return this._name; }
    getVersion() { return this._version; }
    isInitialized() { return this._initialized; }
    
    // 生命周期钩子
    onInit() {}   // 初始化后回调
    onDestroy() {} // 销毁前回调
}

// ==================== AppCore 核心架构 ====================
/**
 * 应用核心对象，全局单例
 * 提供事件总线、模块注册、日志、工具函数
 */
const AppCore = {
    version: '5.0.0',
    bus: new EventBus(),
    registry: new ModuleRegistry(),
    logger: new Logger(),
    utils: {
        debounce,
        throttle,
        formatDate,
        generateId
    }
};

// ==================== 全局暴露 ====================
// 将 AppCore 挂载到 window，供其他模块使用
window.AppCore = AppCore;

// 导出（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AppCore,
        EventBus,
        ModuleRegistry,
        ModuleInterface,
        Logger,
        debounce,
        throttle,
        formatDate,
        generateId
    };
}
