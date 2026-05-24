/**
 * Claude Code Architecture Documentation - 插件系统
 * 支持动态加载、生命周期管理、依赖声明
 *
 * @version 1.0.0
 * @author Claude Code Architecture Team
 */

/**
 * 插件系统
 * 支持动态加载、生命周期管理、依赖声明
 */
const PluginSystem = {
    _plugins: new Map(),
    _hooks: new Map(),
    
    /**
     * 注册插件
     * @param {Object} plugin - { name, version, init, destroy, dependencies? }
     */
    async register(plugin) {
        if (this._plugins.has(plugin.name)) {
            console.warn(`[Plugins] 插件已存在: ${plugin.name}`);
            return false;
        }
        
        // 检查依赖
        if (plugin.dependencies) {
            for (const dep of plugin.dependencies) {
                if (!this._plugins.has(dep)) {
                    console.error(`[Plugins] 缺少依赖: ${dep}`);
                    return false;
                }
            }
        }
        
        this._plugins.set(plugin.name, plugin);
        
        // 调用初始化
        if (plugin.init) {
            await plugin.init();
        }
        
        AppCore.logger?.info('Plugins', `插件已注册: ${plugin.name} v${plugin.version}`);
        return true;
    },
    
    /**
     * 注销插件
     */
    async unregister(name) {
        const plugin = this._plugins.get(name);
        if (!plugin) return false;
        
        if (plugin.destroy) {
            await plugin.destroy();
        }
        
        this._plugins.delete(name);
        AppCore.logger?.info('Plugins', `插件已注销: ${name}`);
        return true;
    },
    
    /**
     * 注册钩子
     */
    on(hookName, callback, priority = 10) {
        if (!this._hooks.has(hookName)) {
            this._hooks.set(hookName, []);
        }
        this._hooks.get(hookName).push({ callback, priority });
        this._hooks.get(hookName).sort((a, b) => a.priority - b.priority);
    },
    
    /**
     * 触发钩子
     */
    async emit(hookName, ...args) {
        const hooks = this._hooks.get(hookName);
        if (!hooks) return args;
        
        for (const { callback } of hooks) {
            try {
                const result = await callback(...args);
                if (result !== undefined && result !== null) args = result;
            } catch (err) {
                console.error(`[Plugins] 钩子 "${hookName}" 的 callback 执行出错:`, err);
            }
        }
        return args;
    },
    
    /**
     * 获取所有插件
     */
    getAll() {
        return Array.from(this._plugins.entries()).map(([name, plugin]) => ({
            name,
            version: plugin.version,
            initialized: true
        }));
    },
    
    /**
     * 获取插件数量
     */
    count() {
        return this._plugins.size;
    },
    
    /**
     * 获取指定插件
     */
    get(name) {
        return this._plugins.get(name);
    },
    
    /**
     * 检查插件是否存在
     */
    has(name) {
        return this._plugins.has(name);
    },
    
    /**
     * 移除钩子
     */
    off(hookName, callback) {
        const hooks = this._hooks.get(hookName);
        if (!hooks) return;
        
        this._hooks.set(hookName, hooks.filter(h => h.callback !== callback));
    },
    
    /**
     * 清除所有钩子
     */
    clearHooks(hookName) {
        if (hookName) {
            this._hooks.delete(hookName);
        } else {
            this._hooks.clear();
        }
    }
};

// 冻结对象防止修改
Object.freeze(PluginSystem);

// 导出到全局
window.PluginSystem = PluginSystem;

// 导出（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PluginSystem };
}
