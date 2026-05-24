/**
 * 长时间运行测试 - Long Running Test
 * 模拟真实使用场景，持续运行30分钟，发现内存泄漏、性能退化等问题
 */

const LongRunningTest = {
    _isRunning: false,
    _startTime: null,
    _iteration: 0,
    _metrics: {
        memorySnapshots: [],
        performanceSnapshots: [],
        errorCount: 0,
        warningCount: 0,
        eventCount: 0,
        domChanges: 0
    },
    _intervals: [],
    _observers: [],

    /**
     * 配置参数
     */
    config: {
        duration: 30 * 60 * 1000, // 30分钟
        snapshotInterval: 30 * 1000, // 每30秒记录一次
        actionInterval: 100, // 每100ms执行一次操作
        memoryThreshold: 100 * 1024 * 1024, // 100MB内存阈值
        errorThreshold: 10 // 错误阈值
    },

    /**
     * 开始长时间运行测试
     */
    async start() {
        console.log('%c[LongRunningTest] 开始长时间运行测试', 'font-size: 16px; font-weight: bold; color: #e87e2f;');
        console.log(`计划运行时间: ${this.config.duration / 60000} 分钟`);
        console.log(`开始时间: ${new Date().toISOString()}`);

        this._isRunning = true;
        this._startTime = performance.now();
        this._iteration = 0;
        this._metrics = {
            memorySnapshots: [],
            performanceSnapshots: [],
            errorCount: 0,
            warningCount: 0,
            eventCount: 0,
            domChanges: 0
        };

        // 设置监控
        this._setupMonitoring();

        // 开始执行操作循环
        await this._runOperationLoop();

        return this._metrics;
    },

    /**
     * 设置监控系统
     */
    _setupMonitoring() {
        // 内存监控
        const memoryInterval = setInterval(() => {
            this._recordMemorySnapshot();
        }, this.config.snapshotInterval);
        this._intervals.push(memoryInterval);

        // 性能监控
        const perfInterval = setInterval(() => {
            this._recordPerformanceSnapshot();
        }, this.config.snapshotInterval);
        this._intervals.push(perfInterval);

        // DOM变化监控
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                this._metrics.domChanges += mutations.length;
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true
            });
            this._observers.push(observer);
        }

        // 错误监控
        window.addEventListener('error', this._handleError.bind(this));
        window.addEventListener('unhandledrejection', this._handleRejection.bind(this));

        console.log('[LongRunningTest] 监控系统已启动');
    },

    /**
     * 记录内存快照
     */
    _recordMemorySnapshot() {
        if (!performance.memory) return;

        const snapshot = {
            timestamp: performance.now() - this._startTime,
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };

        this._metrics.memorySnapshots.push(snapshot);

        // 检查内存泄漏
        if (snapshot.usedJSHeapSize > this.config.memoryThreshold) {
            console.warn(`[LongRunningTest] ⚠️ 内存使用超过阈值: ${(snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
            this._metrics.warningCount++;
        }
    },

    /**
     * 记录性能快照
     */
    _recordPerformanceSnapshot() {
        const snapshot = {
            timestamp: performance.now() - this._startTime,
            iteration: this._iteration,
            eventCount: this._metrics.eventCount,
            domChanges: this._metrics.domChanges,
            errorCount: this._metrics.errorCount
        };

        this._metrics.performanceSnapshots.push(snapshot);

        // 输出进度
        const elapsed = performance.now() - this._startTime;
        const progress = (elapsed / this.config.duration * 100).toFixed(1);
        console.log(`[LongRunningTest] 进度: ${progress}% | 迭代: ${this._iteration} | 事件: ${this._metrics.eventCount} | 错误: ${this._metrics.errorCount}`);
    },

    /**
     * 处理错误
     */
    _handleError(event) {
        this._metrics.errorCount++;
        console.error('[LongRunningTest] 捕获到错误:', event.error);

        if (this._metrics.errorCount > this.config.errorThreshold) {
            console.error('[LongRunningTest] ❌ 错误数超过阈值，停止测试');
            this.stop();
        }
    },

    /**
     * 处理未处理的Promise拒绝
     */
    _handleRejection(event) {
        this._metrics.errorCount++;
        console.error('[LongRunningTest] 捕获到未处理的Promise拒绝:', event.reason);
    },

    /**
     * 操作循环 - 模拟真实用户操作
     */
    async _runOperationLoop() {
        const actions = [
            () => this._actionToggleTheme(),
            () => this._actionToggleSidebar(),
            () => this._actionScroll(),
            () => this._actionClickRandomElement(),
            () => this._actionToggleSearch(),
            () => this._actionChangeState(),
            () => this._actionEmitEvent(),
            () => this._actionDOMOperation()
        ];

        while (this._isRunning) {
            const elapsed = performance.now() - this._startTime;

            // 检查是否达到运行时间
            if (elapsed >= this.config.duration) {
                console.log('[LongRunningTest] 达到预定运行时间，准备停止');
                break;
            }

            // 随机执行一个操作
            const action = actions[Math.floor(Math.random() * actions.length)];
            try {
                await action();
            } catch (e) {
                console.warn('[LongRunningTest] 操作执行失败:', e.message);
                this._metrics.errorCount++;
            }

            this._iteration++;
            this._metrics.eventCount++;

            // 短暂延迟，避免阻塞
            await this._delay(this.config.actionInterval);
        }

        await this._generateReport();
    },

    /**
     * 操作1: 切换主题
     */
    async _actionToggleTheme() {
        if (typeof ThemeModule !== 'undefined' && ThemeModule.toggle) {
            ThemeModule.toggle();
        }
    },

    /**
     * 操作2: 切换侧边栏
     */
    async _actionToggleSidebar() {
        if (typeof SidebarModule !== 'undefined' && SidebarModule.toggleSidebar) {
            SidebarModule.toggleSidebar();
        }
    },

    /**
     * 操作3: 滚动页面
     */
    async _actionScroll() {
        const scrollPositions = [0, 500, 1000, 2000, document.body.scrollHeight];
        const target = scrollPositions[Math.floor(Math.random() * scrollPositions.length)];
        window.scrollTo({ top: target, behavior: 'smooth' });
    },

    /**
     * 操作4: 点击随机元素
     */
    async _actionClickRandomElement() {
        const clickableElements = document.querySelectorAll('button, a, [role="button"]');
        if (clickableElements.length > 0) {
            const element = clickableElements[Math.floor(Math.random() * clickableElements.length)];
            element.click();
        }
    },

    /**
     * 操作5: 切换搜索框
     */
    async _actionToggleSearch() {
        if (typeof SearchModule !== 'undefined') {
            if (SearchModule.isOpen) {
                SearchModule.close();
            } else {
                SearchModule.open();
            }
        }
    },

    /**
     * 操作6: 改变状态
     */
    async _actionChangeState() {
        if (typeof State !== 'undefined') {
            const keys = ['testKey1', 'testKey2', 'testKey3'];
            const key = keys[Math.floor(Math.random() * keys.length)];
            State.set(key, Math.random());
        }
    },

    /**
     * 操作7: 触发事件
     */
    async _actionEmitEvent() {
        if (window.AppCore && window.AppCore.bus) {
            window.AppCore.bus.emit('longrunning:test', { iteration: this._iteration });
        }
    },

    /**
     * 操作8: DOM操作
     */
    async _actionDOMOperation() {
        const operations = ['create', 'modify', 'remove'];
        const operation = operations[Math.floor(Math.random() * operations.length)];

        switch (operation) {
            case 'create':
                const el = document.createElement('div');
                el.id = `test-${this._iteration}`;
                el.style.display = 'none';
                document.body.appendChild(el);
                break;
            case 'modify':
                const existing = document.getElementById(`test-${this._iteration - 1}`);
                if (existing) {
                    existing.setAttribute('data-modified', 'true');
                }
                break;
            case 'remove':
                const old = document.getElementById(`test-${this._iteration - 10}`);
                if (old) {
                    old.remove();
                }
                break;
        }
    },

    /**
     * 延迟函数
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 生成测试报告
     */
    async _generateReport() {
        console.log('');
        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #6db3f2;');
        console.log('%c[LongRunningTest] 长时间运行测试报告', 'font-size: 16px; font-weight: bold; color: #6db3f2;');
        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #6db3f2;');

        const duration = performance.now() - this._startTime;
        const minutes = (duration / 60000).toFixed(2);

        console.log(`运行时间: ${minutes} 分钟`);
        console.log(`总迭代次数: ${this._iteration}`);
        console.log(`总事件数: ${this._metrics.eventCount}`);
        console.log(`DOM变化数: ${this._metrics.domChanges}`);
        console.log(`错误数: ${this._metrics.errorCount}`);
        console.log(`警告数: ${this._metrics.warningCount}`);

        // 内存分析
        if (this._metrics.memorySnapshots.length > 0) {
            const first = this._metrics.memorySnapshots[0];
            const last = this._metrics.memorySnapshots[this._metrics.memorySnapshots.length - 1];
            const memoryIncrease = last.usedJSHeapSize - first.usedJSHeapSize;

            console.log('');
            console.log('%c内存分析:', 'font-weight: bold;');
            console.log(`  初始内存: ${(first.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  最终内存: ${(last.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

            // 检测内存泄漏
            const leakDetected = memoryIncrease > 50 * 1024 * 1024; // 50MB阈值
            if (leakDetected) {
                console.log(`  ⚠️ 检测到可能的内存泄漏!`);
            } else {
                console.log(`  ✅ 内存使用正常`);
            }
        }

        // 性能趋势分析
        if (this._metrics.performanceSnapshots.length > 1) {
            console.log('');
            console.log('%c性能趋势:', 'font-weight: bold;');
            const first = this._metrics.performanceSnapshots[0];
            const last = this._metrics.performanceSnapshots[this._metrics.performanceSnapshots.length - 1];
            const eventRate = (last.eventCount - first.eventCount) / (last.timestamp - first.timestamp) * 1000;
            console.log(`  事件处理速率: ${eventRate.toFixed(2)} 事件/秒`);
        }

        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #6db3f2;');

        // 返回报告数据
        return {
            duration,
            iteration: this._iteration,
            errorCount: this._metrics.errorCount,
            warningCount: this._metrics.warningCount,
            memorySnapshots: this._metrics.memorySnapshots,
            performanceSnapshots: this._metrics.performanceSnapshots
        };
    },

    /**
     * 停止测试
     */
    stop() {
        console.log('[LongRunningTest] 正在停止测试...');
        this._isRunning = false;

        // 清理定时器
        this._intervals.forEach(clearInterval);
        this._intervals = [];

        // 清理观察者
        this._observers.forEach(observer => observer.disconnect());
        this._observers = [];

        console.log('[LongRunningTest] 测试已停止');
    }
};

// 暴露到全局
window.LongRunningTest = LongRunningTest;

console.log('[LongRunningTest] 长时间运行测试模块已加载');
console.log('运行 LongRunningTest.start() 开始30分钟测试');
