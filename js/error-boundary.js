/**
 * 错误边界模块 - 全局错误处理和恢复机制
 * @version 1.0.0
 */

const ErrorBoundary = {
    _config: {
        maxRetries: 3,
        retryDelay: 1000,
        reportURL: null, // 错误上报地址
        silent: false // 是否静默处理
    },
    _errorLog: [],
    _recoveryStrategies: new Map(),

    /**
     * 初始化错误边界
     */
    init() {
        this._setupGlobalHandlers();
        this._setupPromiseRejectionHandler();
        this._setupResourceErrorHandler();
        console.log('[ErrorBoundary] 错误边界已初始化');
    },

    /**
     * 设置全局错误处理器
     * @private
     */
    _setupGlobalHandlers() {
        window.onerror = (message, source, lineno, colno, error) => {
            this._handleError({
                type: 'javascript',
                message,
                source,
                lineno,
                colno,
                error,
                timestamp: Date.now()
            });
            return true; // 阻止默认错误显示
        };
    },

    /**
     * 设置 Promise 拒绝处理器
     * @private
     */
    _setupPromiseRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this._handleError({
                type: 'promise',
                message: event.reason?.message || 'Unhandled Promise Rejection',
                error: event.reason,
                stack: event.reason?.stack,
                timestamp: Date.now()
            });
            event.preventDefault();
        });

        window.addEventListener('rejectionhandled', (event) => {
            console.log('[ErrorBoundary] Promise rejection handled:', event.reason);
        });
    },

    /**
     * 设置资源错误处理器
     * @private
     */
    _setupResourceErrorHandler() {
        window.addEventListener('error', (event) => {
            if (event.target && (event.target.tagName === 'IMG' || 
                event.target.tagName === 'SCRIPT' || 
                event.target.tagName === 'LINK')) {
                this._handleError({
                    type: 'resource',
                    message: `Failed to load ${event.target.tagName}`,
                    source: event.target.src || event.target.href,
                    timestamp: Date.now()
                });
            }
        }, true);
    },

    /**
     * 处理错误
     * @private
     */
    _handleError(errorInfo) {
        // 记录错误
        this._errorLog.push(errorInfo);
        
        // 限制日志大小
        if (this._errorLog.length > 100) {
            this._errorLog.shift();
        }

        // 控制台输出
        if (!this._config.silent) {
            console.error('[ErrorBoundary]', errorInfo);
        }

        // 尝试恢复
        this._attemptRecovery(errorInfo);

        // 显示用户友好的错误提示
        this._showErrorUI(errorInfo);

        // 上报错误
        this._reportError(errorInfo);
    },

    /**
     * 尝试恢复
     * @private
     */
    _attemptRecovery(errorInfo) {
        const strategy = this._recoveryStrategies.get(errorInfo.type);
        if (strategy) {
            try {
                strategy(errorInfo);
            } catch (e) {
                console.error('[ErrorBoundary] 恢复策略失败:', e);
            }
        }
    },

    /**
     * 显示错误 UI
     * @private
     */
    _showErrorUI(errorInfo) {
        // 避免重复显示
        if (document.getElementById('error-boundary-toast')) {
            return;
        }

        const toast = document.createElement('div');
        toast.id = 'error-boundary-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 99999;
            max-width: 400px;
            font-family: system-ui, sans-serif;
            animation: slideIn 0.3s ease;
        `;

        const userMessage = this._getUserFriendlyMessage(errorInfo);

        // 使用 DOM API 创建元素，避免 innerHTML 注入
        const container = document.createElement('div');
        container.style.cssText = 'display: flex; align-items: center; gap: 12px;';

        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '24px';
        iconSpan.textContent = '\u26A0\uFE0F';

        const textDiv = document.createElement('div');

        const titleDiv = document.createElement('div');
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.marginBottom = '4px';
        titleDiv.textContent = '出错了';

        const messageDiv = document.createElement('div');
        messageDiv.style.fontSize = '14px';
        messageDiv.style.opacity = '0.9';
        messageDiv.textContent = userMessage;

        textDiv.appendChild(titleDiv);
        textDiv.appendChild(messageDiv);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; margin-left: 8px;';
        closeBtn.addEventListener('click', () => toast.remove());

        container.appendChild(iconSpan);
        container.appendChild(textDiv);
        container.appendChild(closeBtn);
        toast.appendChild(container);

        document.body.appendChild(toast);

        // 自动隐藏
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    /**
     * 获取用户友好的错误消息
     * @private
     */
    _getUserFriendlyMessage(errorInfo) {
        const messages = {
            javascript: '页面脚本执行出错，请刷新重试',
            promise: '异步操作失败，部分功能可能不可用',
            resource: '资源加载失败，请检查网络连接',
            network: '网络请求失败，请检查网络状态',
            default: '发生未知错误，请刷新页面重试'
        };
        return messages[errorInfo.type] || messages.default;
    },

    /**
     * 上报错误
     * @private
     */
    _reportError(errorInfo) {
        if (this._config.reportURL) {
            fetch(this._config.reportURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorInfo),
                keepalive: true
            }).catch(() => {});
        }
    },

    // ==================== 公共 API ====================

    /**
     * 包装函数，添加错误捕获
     * @param {Function} fn - 要包装的函数
     * @param {object} options - 选项
     */
    wrap(fn, options = {}) {
        return (...args) => {
            try {
                const result = fn.apply(this, args);
                
                // 处理 Promise
                if (result && typeof result.then === 'function') {
                    return result.catch(error => {
                        this._handleError({
                            type: 'promise',
                            message: error.message,
                            error,
                            stack: error.stack,
                            timestamp: Date.now()
                        });
                        
                        if (options.fallback) {
                            return options.fallback(error);
                        }
                        throw error;
                    });
                }
                
                return result;
            } catch (error) {
                this._handleError({
                    type: 'javascript',
                    message: error.message,
                    error,
                    stack: error.stack,
                    timestamp: Date.now()
                });
                
                if (options.fallback) {
                    return options.fallback(error);
                }
                throw error;
            }
        };
    },

    /**
     * 注册恢复策略
     * @param {string} errorType - 错误类型
     * @param {Function} strategy - 恢复策略函数
     */
    registerRecovery(errorType, strategy) {
        this._recoveryStrategies.set(errorType, strategy);
    },

    /**
     * 获取错误日志
     * @returns {Array} 错误日志
     */
    getErrorLog() {
        return [...this._errorLog];
    },

    /**
     * 清空错误日志
     */
    clearErrorLog() {
        this._errorLog = [];
    },

    /**
     * 创建组件错误边界
     * @param {object} component - 组件配置
     */
    createComponentBoundary(component) {
        return {
            render: this.wrap(component.render.bind(component), {
                fallback: () => component.fallbackRender?.() || null
            }),
            init: this.wrap(component.init.bind(component), {
                fallback: () => {
                    console.warn(`[ErrorBoundary] 组件 ${component.name} 初始化失败`);
                    return false;
                }
            })
        };
    }
};

// 添加 CSS 动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    ErrorBoundary.init();
});

// 暴露到全局
window.ErrorBoundary = ErrorBoundary;
