/**
 * 详细日志系统 - Detailed Logger System
 * 用于深度调试和测试，记录每个关键操作
 */
const DetailedLogger = {
    _enabled: true,
    _level: 'DEBUG', // DEBUG, INFO, WARN, ERROR
    _moduleFilter: null, // 设置为模块名可只显示该模块日志
    _startTime: performance.now(),
    _logHistory: [],
    _maxHistory: 10000,

    // 日志级别枚举
    LEVELS: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    },

    /**
     * 初始化日志系统
     */
    init() {
        // [BUG-ROUND9-010修复] 防止重复初始化导致定时器泄漏
        if (this._initialized) return this;
        this._initialized = true;

        console.log('[DetailedLogger] 日志系统初始化完成');
        console.log('[DetailedLogger] 当前级别:', this._level);
        console.log('[DetailedLogger] 开始时间:', new Date().toISOString());

        // [BUG-ROUND4-002修复] 启动内存监控定时器
        this._startMemoryMonitor();

        // 记录系统信息
        this.info('SYSTEM', '页面加载', {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        });

        return this;
    },

    /**
     * [BUG-ROUND4-002修复] 启动内存监控
     */
    _startMemoryMonitor() {
        // 每30秒检查一次内存使用情况
        this._memoryMonitorInterval = setInterval(() => {
            if (typeof performance !== 'undefined' && performance.memory) {
                const memory = performance.memory;
                const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);

                // 如果使用内存超过 500MB，自动清理历史日志
                if (usedMB > 500) {
                    console.warn(`[DetailedLogger] 内存使用过高 (${usedMB}MB)，自动清理历史日志`);
                    this.clearHistory();
                }
            }
        }, 30000);
    },

    /**
     * [BUG-ROUND4-002修复] 清理历史日志
     */
    clearHistory() {
        const beforeSize = this._logHistory.length;
        this._logHistory.length = 0;
        this.info('SYSTEM', '历史日志已清理', { beforeSize, afterSize: 0 });
    },

    /**
     * [BUG-ROUND4-002修复] 销毁日志系统
     */
    destroy() {
        if (this._memoryMonitorInterval) {
            clearInterval(this._memoryMonitorInterval);
            this._memoryMonitorInterval = null;
        }
        this._enabled = false;
        this.clearHistory();
        console.log('[DetailedLogger] 日志系统已销毁');
    },

    /**
     * 设置日志级别
     */
    setLevel(level) {
        this._level = level;
        console.log('[DetailedLogger] 日志级别设置为:', level);
    },

    /**
     * 设置模块过滤器
     */
    setModuleFilter(moduleName) {
        this._moduleFilter = moduleName;
        console.log('[DetailedLogger] 模块过滤器设置为:', moduleName);
    },

    /**
     * 清除过滤器
     */
    clearFilter() {
        this._moduleFilter = null;
    },

    /**
     * 核心日志方法
     */
    _log(level, module, action, data = null) {
        if (!this._enabled) return;
        if (this.LEVELS[level] < this.LEVELS[this._level]) return;
        if (this._moduleFilter && module !== this._moduleFilter) return;

        const timestamp = performance.now() - this._startTime;
        const timeStr = timestamp.toFixed(2).padStart(10, ' ');
        const levelStr = level.padStart(5);
        const moduleStr = module.padStart(15);

        // [BUG-ROUND4-001修复] 对大对象进行截断，防止内存泄漏
        // [BUG-ROUND8-001修复] 安全JSON序列化，处理循环引用
        let processedData = data;
        if (data !== null && typeof data === 'object') {
            let dataStr;
            try {
                dataStr = JSON.stringify(data);
            } catch (e) {
                // 循环引用或不可序列化对象，使用try-catch安全处理
                const seen = new WeakSet();
                const safeReplacer = (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) return '[Circular Reference]';
                        seen.add(value);
                    }
                    return value;
                };
                try {
                    dataStr = JSON.stringify(data, safeReplacer);
                } catch (e2) {
                    dataStr = '[Unserializable Object: ' + (data.constructor ? data.constructor.name : 'Object') + ']';
                }
            }
            if (dataStr && dataStr.length > 1000) {
                processedData = { _truncated: true, _originalSize: dataStr.length, _preview: dataStr.substring(0, 500) + '...' };
            } else if (dataStr) {
                // 即使不截断，也使用安全序列化后的字符串存储
                try {
                    processedData = JSON.parse(dataStr);
                } catch (e) {
                    processedData = { _raw: dataStr };
                }
            }
        } else if (typeof data === 'string' && data.length > 1000) {
            processedData = data.substring(0, 500) + '... [truncated, original length: ' + data.length + ']';
        }

        const logEntry = {
            time: timestamp,
            level,
            module,
            action,
            data: processedData,
            timestamp: Date.now()
        };

        // 保存到历史
        this._logHistory.push(logEntry);
        if (this._logHistory.length > this._maxHistory) {
            this._logHistory.shift();
        }

        // 控制台输出
        const prefix = `[${timeStr}ms] [${levelStr}] [${moduleStr}]`;

        if (data) {
            console.log(`${prefix} ${action}`, data);
        } else {
            console.log(`${prefix} ${action}`);
        }
    },

    /**
     * DEBUG级别日志 - 详细操作
     */
    debug(module, action, data) {
        this._log('DEBUG', module, action, data);
    },

    /**
     * INFO级别日志 - 重要操作
     */
    info(module, action, data) {
        this._log('INFO', module, action, data);
    },

    /**
     * WARN级别日志 - 警告
     */
    warn(module, action, data) {
        this._log('WARN', module, action, data);
    },

    /**
     * ERROR级别日志 - 错误
     */
    error(module, action, data) {
        this._log('ERROR', module, action, data);
    },

    /**
     * 函数进入日志
     */
    enter(module, functionName, args = null) {
        this.debug(module, `→ ENTER: ${functionName}`, args);
    },

    /**
     * 函数退出日志
     */
    exit(module, functionName, result = null) {
        this.debug(module, `← EXIT: ${functionName}`, result);
    },

    /**
     * 状态变化日志
     */
    stateChange(module, property, oldValue, newValue) {
        this.debug(module, `STATE CHANGE: ${property}`, {
            from: oldValue,
            to: newValue
        });
    },

    /**
     * 事件触发日志
     */
    event(module, eventName, target = null, data = null) {
        this.debug(module, `EVENT: ${eventName}`, {
            target: target?.tagName || target,
            data
        });
    },

    /**
     * 性能计时开始
     */
    timeStart(module, label) {
        const key = `${module}_${label}`;
        // [BUG-ROUND9-016修复] 检查performance.mark是否存在
        if (typeof performance.mark === 'function') {
            performance.mark(`${key}_start`);
        }
        this.debug(module, `⏱️ TIMER START: ${label}`);
    },

    /**
     * 性能计时结束
     */
    timeEnd(module, label) {
        const key = `${module}_${label}`;
        // [BUG-ROUND9-016修复] 检查performance API是否存在
        if (typeof performance.mark === 'function') {
            performance.mark(`${key}_end`);
            performance.measure(key, `${key}_start`, `${key}_end`);
        }

        const entries = typeof performance.getEntriesByName === 'function' ? performance.getEntriesByName(key) : [];
        const duration = entries[entries.length - 1]?.duration;

        this.debug(module, `⏱️ TIMER END: ${label}`, { duration: `${duration?.toFixed(2)}ms` });

        // 清理
        performance.clearMarks(`${key}_start`);
        performance.clearMarks(`${key}_end`);
    },

    /**
     * 内存使用日志
     */
    memory(module, context = '') {
        if (performance.memory) {
            const mem = performance.memory;
            this.debug(module, `💾 MEMORY ${context}`, {
                used: `${(mem.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                total: `${(mem.totalJSHeapSize / 1048576).toFixed(2)} MB`,
                limit: `${(mem.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
            });
        }
    },

    /**
     * DOM操作日志
     */
    dom(module, operation, element, details = null) {
        this.debug(module, `🌲 DOM ${operation}`, {
            element: element?.tagName || element,
            id: element?.id,
            class: element?.className,
            details
        });
    },

    /**
     * 网络请求日志
     */
    network(module, method, url, status = null, duration = null) {
        const data = { method, url };
        if (status !== null) data.status = status;
        if (duration !== null) data.duration = `${duration}ms`;

        const level = status && status >= 400 ? 'ERROR' : 'DEBUG';
        this._log(level, module, `🌐 NETWORK ${status ? 'RESPONSE' : 'REQUEST'}`, data);
    },

    /**
     * 获取日志历史
     */
    getHistory(filter = {}) {
        let logs = this._logHistory;

        if (filter.level) {
            logs = logs.filter(l => this.LEVELS[l.level] >= this.LEVELS[filter.level]);
        }
        if (filter.module) {
            logs = logs.filter(l => l.module === filter.module);
        }
        if (filter.startTime) {
            logs = logs.filter(l => l.time >= filter.startTime);
        }
        if (filter.endTime) {
            logs = logs.filter(l => l.time <= filter.endTime);
        }

        return logs;
    },

    /**
     * 导出日志为JSON
     */
    export() {
        const data = {
            exportTime: new Date().toISOString(),
            totalLogs: this._logHistory.length,
            logs: this._logHistory
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `detailed-logs-${Date.now()}.json`;
        a.click();
        // [BUG-ROUND9-004修复] 延迟撤销URL，避免某些浏览器下载失败
        setTimeout(() => URL.revokeObjectURL(url), 10000);

        console.log('[DetailedLogger] 日志已导出');
    },

    /**
     * 生成日志报告
     */
    generateReport() {
        const logs = this._logHistory;
        const errors = logs.filter(l => l.level === 'ERROR');
        const warns = logs.filter(l => l.level === 'WARN');

        const moduleStats = {};
        logs.forEach(l => {
            if (!moduleStats[l.module]) {
                moduleStats[l.module] = { count: 0, errors: 0, warns: 0 };
            }
            moduleStats[l.module].count++;
            if (l.level === 'ERROR') moduleStats[l.module].errors++;
            if (l.level === 'WARN') moduleStats[l.module].warns++;
        });

        const report = {
            totalLogs: logs.length,
            errors: errors.length,
            warns: warns.length,
            moduleStats,
            errorDetails: errors.map(e => ({
                time: e.time,
                module: e.module,
                action: e.action,
                data: e.data
            }))
        };

        console.log('%c[DetailedLogger] 日志报告', 'font-size: 16px; font-weight: bold;');
        // [BUG-ROUND9-011修复] console.table兼容性检查
        if (typeof console.table === 'function') {
            console.table(report.moduleStats);
        } else {
            console.log('[DetailedLogger] 模块统计:', JSON.stringify(report.moduleStats, null, 2));
        }

        if (errors.length > 0) {
            console.error('%c错误列表:', 'color: red; font-weight: bold;');
            errors.forEach(e => console.error(`[${e.module}] ${e.action}`, e.data));
        }

        return report;
    }
};

// 自动初始化
if (typeof window !== 'undefined') {
    window.DetailedLogger = DetailedLogger;
    DetailedLogger.init();
}
