/**
 * 性能监控模块 v1.0
 * 实时监控页面性能指标，提供优化建议
 * @version 1.0.0
 */

const PerformanceMonitor = {
    // 配置
    _config: {
        enabled: true,
        samplingRate: 1.0, // 采样率
        reportThreshold: 3000, // 慢交互阈值(ms)
        longTaskThreshold: 50, // 长任务阈值(ms)
        memoryCheckInterval: 30000, // 内存检查间隔
    },

    // 指标存储上限
    _metricsLimit: 1000,

    // 指标存储
    _metrics: {
        navigation: {},
        resources: [],
        interactions: [],
        longTasks: [],
        memory: [],
        paint: {},
        layout: []
    },

    // 观察器
    _observers: {},

    // 状态
    _initialized: false,

    // 定时器ID
    _memoryTimerId: null,

    // 事件处理器引用（用于销毁时移除）
    _boundHandlers: {},

    /**
     * 向指标数组添加条目，超出上限时移除旧条目
     * @private
     * @param {string} key - _metrics 中的数组键名
     * @param {*} entry - 要添加的条目
     */
    _pushMetric(key, entry) {
        if (!Array.isArray(this._metrics[key])) return;
        this._metrics[key].push(entry);
        if (this._metrics[key].length > this._metricsLimit) {
            this._metrics[key].shift();
        }
    },

    /**
     * 初始化性能监控
     */
    init() {
        if (this._initialized || !this._config.enabled) return this;

        // 检查浏览器支持
        if (!window.PerformanceObserver) {
            console.warn('[PerformanceMonitor] 浏览器不支持 Performance API');
            return this;
        }

        this._setupObservers();
        this._collectNavigationTiming();
        this._setupMemoryMonitoring();
        this._setupInteractionMonitoring();

        this._initialized = true;
        console.log('[PerformanceMonitor] 性能监控已启动');

        return this;
    },

    /**
     * 设置性能观察器
     * @private
     */
    _setupObservers() {
        // 长任务观察器
        if ('PerformanceLongTaskTiming' in window) {
            this._observers.longTask = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this._pushMetric('longTasks', {
                        duration: entry.duration,
                        startTime: entry.startTime,
                        name: entry.name
                    });

                    if (entry.duration > this._config.longTaskThreshold) {
                        this._warn('LongTask', `长任务阻塞主线程 ${entry.duration.toFixed(2)}ms`);
                    }
                }
            });
            this._observers.longTask.observe({ entryTypes: ['longtask'] });
        }

        // 资源加载观察器
        this._observers.resource = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                const resource = {
                    name: entry.name,
                    type: entry.initiatorType,
                    duration: entry.duration,
                    size: entry.transferSize,
                    startTime: entry.startTime
                };

                this._pushMetric('resources', resource);

                // 检测慢资源
                if (entry.duration > this._config.reportThreshold) {
                    this._warn('SlowResource', `慢资源加载: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
                }
            }
        });
        this._observers.resource.observe({ entryTypes: ['resource'] });

        // 绘制观察器
        this._observers.paint = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this._metrics.paint[entry.name] = entry.startTime;
            }
        });
        this._observers.paint.observe({ entryTypes: ['paint'] });

        // 布局偏移观察器 (CLS)
        if ('LayoutShift' in window) {
            this._observers.layoutShift = new PerformanceObserver((list) => {
                let clsValue = 0;
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                this._pushMetric('layout', {
                    time: performance.now(),
                    value: clsValue
                });

                if (clsValue > 0.1) {
                    this._warn('CLS', `累积布局偏移过高: ${clsValue.toFixed(3)}`);
                }
            });
            this._observers.layoutShift.observe({ entryTypes: ['layout-shift'] });
        }

        // 最大内容绘制观察器 (LCP)
        if ('LargestContentfulPaint' in window) {
            this._observers.lcp = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this._metrics.lcp = {
                    time: lastEntry.startTime,
                    element: lastEntry.element?.tagName || 'unknown'
                };
            });
            this._observers.lcp.observe({ entryTypes: ['largest-contentful-paint'] });
        }

        // 首次输入延迟观察器 (FID)
        if ('Event' in window) {
            this._observers.fid = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    const delay = entry.processingStart - entry.startTime;
                    this._metrics.fid = {
                        delay: delay,
                        type: entry.name
                    };

                    if (delay > 100) {
                        this._warn('FID', `首次输入延迟过高: ${delay.toFixed(2)}ms`);
                    }
                }
            });
            this._observers.fid.observe({ entryTypes: ['first-input'] });
        }
    },

    /**
     * 收集导航计时
     * @private
     */
    _collectNavigationTiming() {
        this._boundHandlers.load = () => {
            setTimeout(() => {
                const nav = performance.getEntriesByType('navigation')[0];
                if (nav) {
                    this._metrics.navigation = {
                        dns: nav.domainLookupEnd - nav.domainLookupStart,
                        tcp: nav.connectEnd - nav.connectStart,
                        ttfb: nav.responseStart - nav.requestStart,
                        download: nav.responseEnd - nav.responseStart,
                        domParse: nav.domInteractive - nav.responseEnd,
                        domReady: nav.domContentLoadedEventEnd - nav.startTime,
                        loadComplete: nav.loadEventEnd - nav.startTime
                    };

                    this._analyzeNavigation();
                }
            }, 0);
        };
        window.addEventListener('load', this._boundHandlers.load);
    },

    /**
     * 分析导航性能
     * @private
     */
    _analyzeNavigation() {
        const nav = this._metrics.navigation;

        // TTFB 检查
        if (nav.ttfb > 600) {
            this._warn('TTFB', `首字节时间过长: ${nav.ttfb.toFixed(2)}ms`);
        }

        // DOM 准备时间检查
        if (nav.domReady > 3000) {
            this._warn('DOMReady', `DOM准备时间过长: ${nav.domReady.toFixed(2)}ms`);
        }

        // 总加载时间检查
        if (nav.loadComplete > 5000) {
            this._warn('LoadTime', `页面加载时间过长: ${nav.loadComplete.toFixed(2)}ms`);
        }
    },

    /**
     * 设置内存监控
     * @private
     */
    _setupMemoryMonitoring() {
        if (!performance.memory) return;

        this._memoryTimerId = setInterval(() => {
            const memory = performance.memory;
            const snapshot = {
                time: Date.now(),
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit
            };

            this._metrics.memory.push(snapshot);

            // 只保留最近50条记录
            if (this._metrics.memory.length > 50) {
                this._metrics.memory.shift();
            }

            // 内存警告
            const usage = snapshot.used / snapshot.limit;
            if (usage > 0.8) {
                this._warn('Memory', `内存使用率过高: ${(usage * 100).toFixed(1)}%`);
            }
        }, this._config.memoryCheckInterval);
    },

    /**
     * 设置交互监控
     * @private
     */
    _setupInteractionMonitoring() {
        const interactionEvents = ['click', 'keydown', 'scroll', 'resize'];

        // 滚动节流：上次处理时间戳
        let lastScrollProcessTime = 0;
        const SCROLL_THROTTLE_MS = 100;

        interactionEvents.forEach(eventType => {
            const handler = (e) => {
                // 滚动事件节流处理
                if (eventType === 'scroll') {
                    const now = Date.now();
                    if (now - lastScrollProcessTime < SCROLL_THROTTLE_MS) {
                        return;
                    }
                    lastScrollProcessTime = now;
                }

                const startTime = performance.now();

                // 使用 requestIdleCallback 或 setTimeout 检测处理时间
                const checkDuration = () => {
                    const duration = performance.now() - startTime;

                    if (duration > this._config.reportThreshold) {
                        this._pushMetric('interactions', {
                            type: eventType,
                            duration: duration,
                            target: e.target?.tagName || 'unknown',
                            time: Date.now()
                        });

                        this._warn('SlowInteraction',
                            `慢交互检测: ${eventType} 处理时间 ${duration.toFixed(2)}ms`);
                    }
                };

                if (window.requestIdleCallback) {
                    requestIdleCallback(checkDuration);
                } else {
                    setTimeout(checkDuration, 0);
                }
            };

            this._boundHandlers[eventType] = handler;
            window.addEventListener(eventType, handler, true);
        });
    },

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getReport() {
        return {
            summary: {
                navigation: this._metrics.navigation,
                paint: this._metrics.paint,
                lcp: this._metrics.lcp,
                fid: this._metrics.fid,
                resourceCount: this._metrics.resources.length,
                longTaskCount: this._metrics.longTasks.length,
                interactionCount: this._metrics.interactions.length
            },
            details: this._metrics,
            recommendations: this._generateRecommendations()
        };
    },

    /**
     * 生成优化建议
     * @private
     */
    _generateRecommendations() {
        const recommendations = [];
        const nav = this._metrics.navigation;

        if (nav.ttfb > 600) {
            recommendations.push({
                priority: 'high',
                category: 'Network',
                issue: 'TTFB过高',
                suggestion: '优化服务器响应时间，启用CDN，使用缓存策略'
            });
        }

        if (nav.domReady > 3000) {
            recommendations.push({
                priority: 'high',
                category: 'Rendering',
                issue: 'DOM准备时间过长',
                suggestion: '减少阻塞渲染的CSS/JS，优化关键渲染路径'
            });
        }

        const largeResources = this._metrics.resources.filter(r => r.size > 500000);
        if (largeResources.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'Assets',
                issue: `发现 ${largeResources.length} 个大资源`,
                suggestion: '压缩图片，启用Gzip/Brotli，使用WebP格式'
            });
        }

        if (this._metrics.longTasks.length > 5) {
            recommendations.push({
                priority: 'high',
                category: 'JavaScript',
                issue: '主线程频繁被阻塞',
                suggestion: '使用Web Workers，优化长任务，减少JS执行时间'
            });
        }

        const slowResources = this._metrics.resources.filter(r => r.duration > 1000);
        if (slowResources.length > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'Network',
                issue: `发现 ${slowResources.length} 个慢资源`,
                suggestion: '启用资源预加载，优化资源加载顺序，使用HTTP/2'
            });
        }

        return recommendations;
    },

    /**
     * 获取Core Web Vitals
     * @returns {Object} CWV指标
     */
    getCoreWebVitals() {
        return {
            LCP: this._metrics.lcp?.time || null,
            FID: this._metrics.fid?.delay || null,
            CLS: this._metrics.layout.reduce((sum, entry) => sum + entry.value, 0),
            FCP: this._metrics.paint['first-contentful-paint'] || null,
            TTFB: this._metrics.navigation.ttfb || null
        };
    },

    /**
     * 警告日志
     * @private
     */
    _warn(category, message) {
        console.warn(`[PerformanceMonitor][${category}] ${message}`);
        
        // 触发事件
        if (window.AppCore?.bus) {
            AppCore.bus.emit('performance:warning', { category, message });
        }
    },

    /**
     * 销毁监控器
     */
    destroy() {
        // 断开所有观察器
        Object.values(this._observers).forEach(observer => {
            observer.disconnect();
        });
        this._observers = {};

        // 清除内存监控定时器
        if (this._memoryTimerId) {
            clearInterval(this._memoryTimerId);
            this._memoryTimerId = null;
        }

        // 移除window事件监听器
        const eventTypes = ['click', 'keydown', 'scroll', 'resize', 'load'];
        eventTypes.forEach(eventType => {
            if (this._boundHandlers[eventType]) {
                window.removeEventListener(eventType, this._boundHandlers[eventType], true);
                delete this._boundHandlers[eventType];
            }
        });

        this._initialized = false;
        console.log('[PerformanceMonitor] 性能监控已销毁');
    }
};

// 全局暴露
window.PerformanceMonitor = PerformanceMonitor;

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PerformanceMonitor.init());
} else {
    PerformanceMonitor.init();
}
