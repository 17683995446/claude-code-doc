
/**
 * 错误处理模块
 * 修复Bug #3: 错误处理机制
 */

class ErrorHandler {
    constructor(options = {}) {
        this._errorCounts = {};
        this._errorLog = [];
        this._maxLogSize = options.maxLogSize || 1000;
        this._retryAttempts = options.retryAttempts || 3;
        this._retryDelay = options.retryDelay || 1000;
        this._onFatal = options.onFatal || (() => {});
    }
    
    handle(error, context = {}) {
        const category = this._categorize(error);
        this._errorCounts[category] = (this._errorCounts[category] || 0) + 1;
        
        const entry = {
            timestamp: new Date().toISOString(),
            category,
            message: error.message,
            stack: error.stack,
            context
        };
        
        this._errorLog.push(entry);
        if (this._errorLog.length > this._maxLogSize) {
            this._errorLog.shift();
        }
        
        // 根据错误类型采取不同策略
        switch (category) {
            case 'TRANSIENT':
                return this._retry(error, context);
            case 'FATAL':
                return this._gracefulDegradation(error, context);
            default:
                return this._logAndContinue(error, context);
        }
    }
    
    _categorize(error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnrefused')) {
            return 'TRANSIENT';
        }
        if (msg.includes('memory') || msg.includes('fatal') || msg.includes('crash')) {
            return 'FATAL';
        }
        return 'RECOVERABLE';
    }
    
    async _retry(error, context) {
        for (let i = 0; i < this._retryAttempts; i++) {
            try {
                await new Promise(r => setTimeout(r, this._retryDelay * (i + 1)));
                if (context.retryFn) {
                    return await context.retryFn();
                }
                return { recovered: true, attempt: i + 1 };
            } catch (e) {
                if (i === this._retryAttempts - 1) {
                    return { recovered: false, error: e };
                }
            }
        }
    }
    
    _gracefulDegradation(error, context) {
        this._onFatal(error, context);
        return { degraded: true, fallback: context.fallback };
    }
    
    _logAndContinue(error, context) {
        return { logged: true, continue: true };
    }
    
    getStats() {
        return {
            counts: this._errorCounts,
            total: Object.values(this._errorCounts).reduce((a, b) => a + b, 0),
            recent: this._errorLog.slice(-10)
        };
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
