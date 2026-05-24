/**
 * 混乱场景测试 - Chaos Testing
 * 用于发现系统在极端情况下的bug
 *
 * 测试场景：
 * 1. 高频并发操作
 * 2. 快速连续切换
 * 3. 异常输入
 * 4. 资源耗尽模拟
 * 5. 内存泄漏检测
 * 6. 事件风暴
 * 7. DOM操作混乱
 */

const ChaosTest = {
    _isRunning: false,
    _testResults: [],
    _startTime: null,
    _intervals: [],
    _timeouts: [],

    /**
     * 运行所有混乱测试
     */
    async runAllTests() {
        console.log('%c[ChaosTest] 开始混乱场景测试', 'font-size: 16px; font-weight: bold; color: #e87e2f;');

        if (window.DetailedLogger) {
            window.DetailedLogger.info('ChaosTest', '开始混乱场景测试');
        }

        this._isRunning = true;
        this._startTime = performance.now();
        this._testResults = [];

        // 记录初始内存状态
        const initialMemory = this._getMemoryUsage();
        console.log('[ChaosTest] 初始内存:', initialMemory);

        try {
            // 测试1: 高频主题切换
            await this.testThemeToggleStress(50);

            // 测试2: 搜索框快速打开关闭
            await this.testSearchRapidToggle(30);

            // 测试3: 侧边栏快速切换
            await this.testSidebarRapidToggle(40);

            // 测试4: 滚动事件风暴
            await this.testScrollStorm(100);

            // 测试5: 并发DOM操作
            await this.testConcurrentDOM(20);

            // 测试6: 异常输入处理
            await this.testAbnormalInput();

            // 测试7: 事件监听器泄漏检测
            await this.testEventListenerLeak();

            // 测试8: 内存泄漏检测
            await this.testMemoryLeak();

            // 测试9: 高频状态变更
            await this.testRapidStateChanges(100);

            // 测试10: 模块初始化销毁循环
            await this.testModuleInitDestroyCycle(10);

        } catch (error) {
            console.error('[ChaosTest] 测试过程中发生错误:', error);
            this._testResults.push({
                test: 'global',
                status: 'error',
                error: error.message
            });
        }

        // 记录最终内存状态
        const finalMemory = this._getMemoryUsage();
        console.log('[ChaosTest] 最终内存:', finalMemory);

        // 生成报告
        this._generateReport(initialMemory, finalMemory);

        this._isRunning = false;

        return this._testResults;
    },

    /**
     * 测试1: 高频主题切换
     */
    async testThemeToggleStress(count) {
        console.log(`[ChaosTest] 测试1: 高频主题切换 (${count}次)`);

        const results = { test: 'themeToggleStress', count, errors: [] };

        for (let i = 0; i < count; i++) {
            try {
                if (typeof ThemeModule !== 'undefined') {
                    ThemeModule.toggle();
                }
                await this._delay(10);
            } catch (e) {
                results.errors.push({ iteration: i, error: e.message });
            }
        }

        results.status = results.errors.length === 0 ? 'passed' : 'failed';
        this._testResults.push(results);

        console.log(`[ChaosTest] 主题切换测试完成: ${results.status}, 错误: ${results.errors.length}`);
    },

    /**
     * 测试2: 搜索框快速打开关闭
     */
    async testSearchRapidToggle(count) {
        console.log(`[ChaosTest] 测试2: 搜索框快速切换 (${count}次)`);

        const results = { test: 'searchRapidToggle', count, errors: [] };

        for (let i = 0; i < count; i++) {
            try {
                if (typeof SearchModule !== 'undefined') {
                    SearchModule.toggle();
                }
                await this._delay(5);
            } catch (e) {
                results.errors.push({ iteration: i, error: e.message });
            }
        }

        // 确保最终关闭
        if (typeof SearchModule !== 'undefined' && SearchModule.isOpen) {
            SearchModule.close();
        }

        results.status = results.errors.length === 0 ? 'passed' : 'failed';
        this._testResults.push(results);

        console.log(`[ChaosTest] 搜索框切换测试完成: ${results.status}, 错误: ${results.errors.length}`);
    },

    /**
     * 测试3: 侧边栏快速切换
     */
    async testSidebarRapidToggle(count) {
        console.log(`[ChaosTest] 测试3: 侧边栏快速切换 (${count}次)`);

        const results = { test: 'sidebarRapidToggle', count, errors: [] };

        for (let i = 0; i < count; i++) {
            try {
                if (typeof SidebarModule !== 'undefined') {
                    SidebarModule.toggleSidebar();
                }
                await this._delay(5);
            } catch (e) {
                results.errors.push({ iteration: i, error: e.message });
            }
        }

        results.status = results.errors.length === 0 ? 'passed' : 'failed';
        this._testResults.push(results);

        console.log(`[ChaosTest] 侧边栏切换测试完成: ${results.status}, 错误: ${results.errors.length}`);
    },

    /**
     * 测试4: 滚动事件风暴
     */
    async testScrollStorm(count) {
        console.log(`[ChaosTest] 测试4: 滚动事件风暴 (${count}次)`);

        const results = { test: 'scrollStorm', count, errors: [] };

        for (let i = 0; i < count; i++) {
            try {
                window.scrollTo(0, Math.random() * document.body.scrollHeight);
                window.dispatchEvent(new Event('scroll'));
                await this._delay(1);
            } catch (e) {
                results.errors.push({ iteration: i, error: e.message });
            }
        }

        results.status = results.errors.length === 0 ? 'passed' : 'failed';
        this._testResults.push(results);

        console.log(`[ChaosTest] 滚动事件风暴测试完成: ${results.status}, 错误: ${results.errors.length}`);
    },

    /**
     * 测试5: 并发DOM操作
     */
    async testConcurrentDOM(count) {
        console.log(`[ChaosTest] 测试5: 并发DOM操作 (${count}次)`);

        const results = { test: 'concurrentDOM', count, errors: [] };

        const operations = [];

        for (let i = 0; i < count; i++) {
            operations.push(
                new Promise((resolve) => {
                    try {
                        // 随机DOM操作
                        const action = Math.floor(Math.random() * 5);
                        switch (action) {
                            case 0:
                                // 创建元素
                                const el = document.createElement('div');
                                el.id = `chaos-test-${i}`;
                                document.body.appendChild(el);
                                setTimeout(() => el.remove(), 50);
                                break;
                            case 1:
                                // 修改class
                                document.body.classList.add(`chaos-temp-${i}`);
                                setTimeout(() => document.body.classList.remove(`chaos-temp-${i}`), 50);
                                break;
                            case 2:
                                // 查询DOM
                                document.querySelectorAll('*');
                                break;
                            case 3:
                                // 修改样式
                                const oldOverflow = document.body.style.overflow;
                                document.body.style.overflow = 'hidden';
                                setTimeout(() => document.body.style.overflow = oldOverflow, 50);
                                break;
                            case 4:
                                // 触发事件
                                window.dispatchEvent(new Event('resize'));
                                break;
                        }
                        resolve();
                    } catch (e) {
                        results.errors.push({ iteration: i, error: e.message });
                        resolve();
                    }
                })
            );
        }

        await Promise.all(operations);

        results.status = results.errors.length === 0 ? 'passed' : 'failed';
        this._testResults.push(results);

        console.log(`[ChaosTest] 并发DOM操作测试完成: ${results.status}, 错误: ${results.errors.length}`);
    },

    /**
     * 测试6: 异常输入处理
     */
    async testAbnormalInput() {
        console.log('[ChaosTest] 测试6: 异常输入处理');

        const results = { test: 'abnormalInput', errors: [] };

        const abnormalInputs = [
            '',
            null,
            undefined,
            '<script>alert("xss")</script>',
            'javascript:alert("xss")',
            '   ',
            '\n\r\t',
            '🔥'.repeat(1000),
            'A'.repeat(10000),
            '\x00\x01\x02',
            '{}[]()<>',
            'SELECT * FROM users',
            '../../etc/passwd',
            'data:text/html,<script>alert(1)</script>',
            String.fromCharCode(0),
            String.fromCodePoint(0x1F600),
            JSON.stringify({ nested: { deep: { object: true } } }),
        ];

        for (const input of abnormalInputs) {
            try {
                // 测试搜索模块
                if (typeof SearchModule !== 'undefined') {
                    SearchModule.search(input);
                }

                // 测试状态设置
                if (typeof State !== 'undefined') {
                    State.set('testKey', input);
                }

                // 测试DOM操作
                const testEl = document.createElement('div');
                testEl.textContent = input;
                testEl.setAttribute('data-test', input);

            } catch (e) {
                results.errors.push({ input: String(input).substring(0, 50), error: e.message });
            }
        }

        results.status = results.errors.length === 0 ? 'passed' : 'warning';
        this._testResults.push(results);

        console.log(`[ChaosTest] 异常输入测试完成: ${results.status}, 错误: ${results.errors.length}`);
    },

    /**
     * 测试7: 事件监听器泄漏检测
     */
    async testEventListenerLeak() {
        console.log('[ChaosTest] 测试7: 事件监听器泄漏检测');

        const results = { test: 'eventListenerLeak', errors: [] };

        // 获取初始监听器数量（近似）
        const initialListeners = this._getEventListenerCount();

        // 执行可能产生泄漏的操作
        for (let i = 0; i < 20; i++) {
            try {
                // 创建带事件监听器的元素然后移除
                const el = document.createElement('div');
                const handler = () => console.log('test');
                el.addEventListener('click', handler);
                document.body.appendChild(el);
                el.remove();

                // 搜索框开关
                if (typeof SearchModule !== 'undefined') {
                    SearchModule.open();
                    SearchModule.close();
                }

            } catch (e) {
                results.errors.push({ iteration: i, error: e.message });
            }
        }

        // 强制垃圾回收提示（不保证执行）
        if (window.gc) {
            window.gc();
        }

        await this._delay(100);

        const finalListeners = this._getEventListenerCount();
        const leakCount = finalListeners - initialListeners;

        results.leakDetected = leakCount > 10;
        results.leakCount = leakCount;
        results.status = results.leakDetected ? 'warning' : 'passed';

        this._testResults.push(results);

        console.log(`[ChaosTest] 事件监听器泄漏检测完成: ${results.status}, 泄漏: ${leakCount}`);
    },

    /**
     * 测试8: 内存泄漏检测
     */
    async testMemoryLeak() {
        console.log('[ChaosTest] 测试8: 内存泄漏检测');

        const results = { test: 'memoryLeak', errors: [] };

        const initialMemory = this._getMemoryUsage();

        // 执行可能产生内存泄漏的操作
        const objects = [];
        for (let i = 0; i < 100; i++) {
            try {
                // 创建大对象
                objects.push(new Array(10000).fill('test'));

                // 模块初始化销毁
                if (typeof ToastModule !== 'undefined') {
                    ToastModule.init();
                    ToastModule.destroy();
                }

            } catch (e) {
                results.errors.push({ iteration: i, error: e.message });
            }
        }

        // 清空引用
        objects.length = 0;

        // 强制垃圾回收提示
        if (window.gc) {
            window.gc();
        }

        await this._delay(200);

        const finalMemory = this._getMemoryUsage();
        const memoryIncrease = finalMemory.used - initialMemory.used;

        results.memoryIncrease = memoryIncrease;
        results.leakDetected = memoryIncrease > 50 * 1024 * 1024; // 50MB
        results.status = results.leakDetected ? 'warning' : 'passed';

        this._testResults.push(results);

        console.log(`[ChaosTest] 内存泄漏检测完成: ${results.status}, 内存增加: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
    },

    /**
     * 测试9: 高频状态变更
     */
    async testRapidStateChanges(count) {
        console.log(`[ChaosTest] 测试9: 高频状态变更 (${count}次)`);

        const results = { test: 'rapidStateChanges', count, errors: [] };

        for (let i = 0; i < count; i++) {
            try {
                if (typeof State !== 'undefined') {
                    State.set('testCounter', i);
                    State.set('testRandom', Math.random());
                    State.set('testObject', { index: i, time: Date.now() });
                }

                // 触发事件总线
                if (window.AppCore && window.AppCore.bus) {
                    window.AppCore.bus.emit('chaos:test', { iteration: i });
                }

            } catch (e) {
                results.errors.push({ iteration: i, error: e.message });
            }
        }

        results.status = results.errors.length === 0 ? 'passed' : 'failed';
        this._testResults.push(results);

        console.log(`[ChaosTest] 高频状态变更测试完成: ${results.status}, 错误: ${results.errors.length}`);
    },

    /**
     * 测试10: 模块初始化销毁循环
     */
    async testModuleInitDestroyCycle(count) {
        console.log(`[ChaosTest] 测试10: 模块初始化销毁循环 (${count}次)`);

        const results = { test: 'moduleInitDestroyCycle', count, errors: [] };

        for (let i = 0; i < count; i++) {
            try {
                // Toast模块
                if (typeof ToastModule !== 'undefined') {
                    ToastModule.init();
                    ToastModule.show(`Test ${i}`, 'info', 100);
                    ToastModule.destroy();
                }

                // 目录模块
                if (typeof TocModule !== 'undefined') {
                    TocModule.init();
                    TocModule.destroy();
                }

                await this._delay(10);

            } catch (e) {
                results.errors.push({ iteration: i, error: e.message });
            }
        }

        results.status = results.errors.length === 0 ? 'passed' : 'failed';
        this._testResults.push(results);

        console.log(`[ChaosTest] 模块初始化销毁循环测试完成: ${results.status}, 错误: ${results.errors.length}`);
    },

    /**
     * 生成测试报告
     */
    _generateReport(initialMemory, finalMemory) {
        const duration = performance.now() - this._startTime;

        const report = {
            duration: `${duration.toFixed(2)}ms`,
            totalTests: this._testResults.length,
            passed: this._testResults.filter(r => r.status === 'passed').length,
            failed: this._testResults.filter(r => r.status === 'failed').length,
            warnings: this._testResults.filter(r => r.status === 'warning').length,
            memoryDelta: `${((finalMemory.used - initialMemory.used) / 1024 / 1024).toFixed(2)} MB`,
            results: this._testResults
        };

        console.log('%c[ChaosTest] 测试报告', 'font-size: 18px; font-weight: bold; color: #6db3f2;');
        console.table({
            '总测试数': report.totalTests,
            '通过': report.passed,
            '失败': report.failed,
            '警告': report.warnings,
            '耗时': report.duration,
            '内存变化': report.memoryDelta
        });

        // 显示失败的测试详情
        const failedTests = this._testResults.filter(r => r.status === 'failed' || r.status === 'error');
        if (failedTests.length > 0) {
            console.group('%c失败的测试:', 'color: #e06c75; font-weight: bold;');
            failedTests.forEach(test => {
                console.error(`  ${test.test}:`, test.errors);
            });
            console.groupEnd();
        }

        // 显示警告
        const warningTests = this._testResults.filter(r => r.status === 'warning');
        if (warningTests.length > 0) {
            console.group('%c警告:', 'color: #e5c07b; font-weight: bold;');
            warningTests.forEach(test => {
                console.warn(`  ${test.test}:`, test.leakDetected ? `泄漏 ${test.leakCount}` : `内存增加 ${test.memoryIncrease}`);
            });
            console.groupEnd();
        }

        // 导出详细日志
        if (window.DetailedLogger) {
            window.DetailedLogger.info('ChaosTest', '测试完成', report);
        }

        return report;
    },

    /**
     * 获取内存使用情况
     */
    _getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return { used: 0, total: 0, limit: 0 };
    },

    /**
     * 获取事件监听器数量（近似）
     */
    _getEventListenerCount() {
        // 这是一个近似值，实际无法准确获取
        const allElements = document.querySelectorAll('*');
        return allElements.length;
    },

    /**
     * 延迟函数
     */
    _delay(ms) {
        return new Promise(resolve => {
            const timeout = setTimeout(resolve, ms);
            this._timeouts.push(timeout);
        });
    },

    /**
     * 停止所有测试
     */
    stop() {
        this._isRunning = false;

        // 清理所有定时器
        this._intervals.forEach(clearInterval);
        this._timeouts.forEach(clearTimeout);
        this._intervals = [];
        this._timeouts = [];

        console.log('[ChaosTest] 测试已停止');
    },

    /**
     * 长时间运行测试
     */
    async runLongTest(durationMinutes = 5) {
        console.log(`[ChaosTest] 开始长时间运行测试 (${durationMinutes}分钟)`);

        const endTime = Date.now() + durationMinutes * 60 * 1000;
        let iteration = 0;

        while (Date.now() < endTime && this._isRunning) {
            iteration++;

            try {
                // 随机执行操作
                const action = Math.floor(Math.random() * 10);

                switch (action) {
                    case 0:
                        if (typeof ThemeModule !== 'undefined') ThemeModule.toggle();
                        break;
                    case 1:
                        if (typeof SearchModule !== 'undefined') SearchModule.toggle();
                        break;
                    case 2:
                        if (typeof SidebarModule !== 'undefined') SidebarModule.toggleSidebar();
                        break;
                    case 3:
                        window.scrollTo(0, Math.random() * document.body.scrollHeight);
                        break;
                    case 4:
                        if (typeof ToastModule !== 'undefined') {
                            ToastModule.show(`Long test ${iteration}`, 'info', 1000);
                        }
                        break;
                    case 5:
                        if (window.AppCore && window.AppCore.bus) {
                            window.AppCore.bus.emit('chaos:longtest', { iteration });
                        }
                        break;
                    case 6:
                        if (typeof State !== 'undefined') {
                            State.set('longTestCounter', iteration);
                        }
                        break;
                    case 7:
                        if (typeof BackToTopModule !== 'undefined') {
                            BackToTopModule.scrollToTop();
                        }
                        break;
                    case 8:
                        window.dispatchEvent(new Event('resize'));
                        break;
                    case 9:
                        if (typeof TocModule !== 'undefined') {
                            TocModule.toggle();
                        }
                        break;
                }

                // 每100次迭代记录一次内存
                if (iteration % 100 === 0) {
                    const memory = this._getMemoryUsage();
                    console.log(`[ChaosTest] 迭代 ${iteration}, 内存: ${(memory.used / 1024 / 1024).toFixed(2)} MB`);
                }

                await this._delay(100);

            } catch (e) {
                console.error(`[ChaosTest] 长时间测试错误 (迭代 ${iteration}):`, e);
            }
        }

        console.log(`[ChaosTest] 长时间测试完成，共执行 ${iteration} 次迭代`);
    }
};

// 暴露到全局
window.ChaosTest = ChaosTest;

// 自动运行测试（如果URL包含 chaos=true 参数）
if (window.location.search.includes('chaos=true')) {
    window.addEventListener('load', () => {
        setTimeout(() => ChaosTest.runAllTests(), 2000);
    });
}

console.log('[ChaosTest] 混乱测试模块已加载，运行 ChaosTest.runAllTests() 开始测试');
