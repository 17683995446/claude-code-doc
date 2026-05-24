/**
 * 迭代测试执行器 - Iteration Test Runner
 * 执行多轮迭代测试，每轮发现新问题并修复
 */

const IterationTestRunner = {
    _currentIteration: 0,
    _maxIterations: 5,
    _allResults: [],
    _allBugs: [],

    /**
     * 运行所有迭代测试
     */
    async runAllIterations() {
        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 16px; color: #e87e2f;');
        console.log('%c  多轮迭代测试执行器', 'font-size: 20px; font-weight: bold; color: #e87e2f;');
        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 16px; color: #e87e2f;');
        console.log('');
        console.log('遵循原则: 多次迭代，不断发现问题并修复');
        console.log(`计划迭代次数: ${this._maxIterations}`);
        console.log('');

        for (let i = 1; i <= this._maxIterations; i++) {
            this._currentIteration = i;
            console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'font-size: 14px; color: #6db3f2;');
            console.log(`%c  第 ${i} 轮迭代测试`, 'font-size: 18px; font-weight: bold; color: #6db3f2;');
            console.log(`%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'font-size: 14px; color: #6db3f2;');

            const iterationResult = await this._runIteration(i);
            this._allResults.push(iterationResult);

            // 如果发现问题，尝试修复
            if (iterationResult.bugs.length > 0) {
                console.log('');
                console.log(`%c发现 ${iterationResult.bugs.length} 个问题，开始修复...`, 'color: #e5c07b;');
                await this._fixBugs(iterationResult.bugs);
            }

            // 每轮之间暂停，让系统稳定
            if (i < this._maxIterations) {
                console.log('');
                console.log('等待系统稳定...');
                await this._delay(2000);
            }
        }

        // 生成最终报告
        await this._generateFinalReport();
    },

    /**
     * 执行单轮迭代测试
     */
    async _runIteration(iteration) {
        const startTime = performance.now();
        const bugs = [];

        // 根据迭代轮次选择不同的测试重点
        switch (iteration) {
            case 1:
                console.log('测试重点: 长时间运行（模拟30分钟真实使用）');
                bugs.push(...await this._runLongRunningTest());
                break;
            case 2:
                console.log('测试重点: 大规模数据处理');
                bugs.push(...await this._runLargeScaleTest());
                break;
            case 3:
                console.log('测试重点: 复杂交互场景');
                bugs.push(...await this._runComplexScenarioTest());
                break;
            case 4:
                console.log('测试重点: 高压力并发');
                bugs.push(...await this._runHighPressureTest());
                break;
            case 5:
                console.log('测试重点: 混乱场景极限测试');
                bugs.push(...await this._runChaosTest());
                break;
        }

        const duration = performance.now() - startTime;

        // 保存发现的bug
        this._allBugs.push(...bugs);

        return {
            iteration,
            duration,
            bugs,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * 第1轮: 长时间运行测试
     */
    async _runLongRunningTest() {
        const bugs = [];

        console.log('');
        console.log('[第1轮] 执行长时间运行测试...');

        // 模拟长时间运行（实际缩短为2分钟用于测试）
        const testDuration = 2 * 60 * 1000; // 2分钟
        const startTime = performance.now();
        let iteration = 0;

        // 记录初始内存
        const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        let maxMemory = initialMemory;

        while (performance.now() - startTime < testDuration) {
            iteration++;

            // 执行各种操作
            try {
                // 切换主题
                if (typeof ThemeModule !== 'undefined') ThemeModule.toggle();

                // 切换侧边栏
                if (typeof SidebarModule !== 'undefined') SidebarModule.toggleSidebar();

                // 滚动
                window.scrollTo(0, Math.random() * document.body.scrollHeight);

                // 状态变更
                if (typeof State !== 'undefined') {
                    State.set(`longRunTest_${iteration % 100}`, Math.random());
                }

                // 触发事件
                if (window.AppCore && window.AppCore.bus) {
                    window.AppCore.bus.emit('longrunning:iteration', { iteration });
                }

                // 检查内存
                if (performance.memory) {
                    const currentMemory = performance.memory.usedJSHeapSize;
                    if (currentMemory > maxMemory) {
                        maxMemory = currentMemory;
                    }

                    // 如果内存增长超过50MB，记录潜在问题
                    if (currentMemory - initialMemory > 50 * 1024 * 1024 && iteration % 100 === 0) {
                        console.warn(`⚠️ 内存增长超过50MB: ${((currentMemory - initialMemory) / 1024 / 1024).toFixed(2)} MB`);
                    }
                }

            } catch (e) {
                bugs.push({
                    type: 'runtime_error',
                    iteration,
                    message: e.message,
                    stack: e.stack
                });
            }

            // 每100次迭代输出一次进度
            if (iteration % 100 === 0) {
                const progress = ((performance.now() - startTime) / testDuration * 100).toFixed(1);
                console.log(`  进度: ${progress}% | 迭代: ${iteration}`);
            }

            await this._delay(10);
        }

        // 分析内存泄漏
        const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        const memoryIncrease = finalMemory - initialMemory;

        console.log(`  测试完成 | 总迭代: ${iteration}`);
        console.log(`  内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

        if (memoryIncrease > 100 * 1024 * 1024) {
            bugs.push({
                type: 'memory_leak',
                severity: 'high',
                message: `内存泄漏检测: 增长 ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
                details: { initialMemory, finalMemory, memoryIncrease }
            });
        }

        return bugs;
    },

    /**
     * 第2轮: 大规模数据测试
     */
    async _runLargeScaleTest() {
        const bugs = [];

        console.log('');
        console.log('[第2轮] 执行大规模数据测试...');

        // 测试1: 大数组
        try {
            console.log('  测试大数组...');
            const largeArray = new Array(100000).fill(0).map((_, i) => ({
                id: i,
                data: new Array(100).fill('test')
            }));
            console.log(`  ✅ 大数组创建成功: ${largeArray.length} 元素`);
        } catch (e) {
            bugs.push({ type: 'large_array', message: e.message });
        }

        // 测试2: 大对象
        try {
            console.log('  测试大对象...');
            const largeObject = {};
            for (let i = 0; i < 10000; i++) {
                largeObject[`key_${i}`] = { value: Math.random() };
            }
            console.log(`  ✅ 大对象创建成功: ${Object.keys(largeObject).length} 键`);
        } catch (e) {
            bugs.push({ type: 'large_object', message: e.message });
        }

        // 测试3: 大量DOM元素
        try {
            console.log('  测试大量DOM元素...');
            const container = document.createElement('div');
            container.style.display = 'none';
            document.body.appendChild(container);

            for (let i = 0; i < 5000; i++) {
                const el = document.createElement('div');
                el.textContent = `Element ${i}`;
                container.appendChild(el);
            }

            console.log(`  ✅ DOM元素创建成功: 5000 元素`);
            container.remove();
        } catch (e) {
            bugs.push({ type: 'many_dom_elements', message: e.message });
        }

        // 测试4: 大量状态变更
        try {
            console.log('  测试大量状态变更...');
            const startTime = performance.now();

            for (let i = 0; i < 10000; i++) {
                State.set(`largeScaleKey_${i % 100}`, Math.random());
            }

            const duration = performance.now() - startTime;
            console.log(`  ✅ 状态变更完成: 10000 次, 耗时 ${duration.toFixed(2)}ms`);

            if (duration > 5000) {
                bugs.push({
                    type: 'performance_issue',
                    severity: 'medium',
                    message: `状态变更性能问题: 10000次操作耗时 ${duration.toFixed(2)}ms`,
                    details: { duration }
                });
            }
        } catch (e) {
            bugs.push({ type: 'many_state_changes', message: e.message });
        }

        return bugs;
    },

    /**
     * 第3轮: 复杂交互场景
     */
    async _runComplexScenarioTest() {
        const bugs = [];

        console.log('');
        console.log('[第3轮] 执行复杂交互场景测试...');

        // 场景1: 快速连续操作
        try {
            console.log('  场景1: 快速连续操作...');
            for (let i = 0; i < 50; i++) {
                if (typeof ThemeModule !== 'undefined') ThemeModule.toggle();
                if (typeof SidebarModule !== 'undefined') SidebarModule.toggleSidebar();
                await this._delay(5);
            }
            console.log('  ✅ 快速连续操作完成');
        } catch (e) {
            bugs.push({ type: 'rapid_operations', message: e.message });
        }

        // 场景2: 并发状态变更
        try {
            console.log('  场景2: 并发状态变更...');
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(new Promise((resolve) => {
                    for (let j = 0; j < 100; j++) {
                        State.set(`concurrentKey_${i}_${j}`, Math.random());
                    }
                    resolve();
                }));
            }
            await Promise.all(promises);
            console.log('  ✅ 并发状态变更完成');
        } catch (e) {
            bugs.push({ type: 'concurrent_state', message: e.message });
        }

        // 场景3: 事件风暴
        try {
            console.log('  场景3: 事件风暴...');
            for (let i = 0; i < 1000; i++) {
                window.AppCore.bus.emit('storm:test', { index: i });
            }
            console.log('  ✅ 事件风暴完成');
        } catch (e) {
            bugs.push({ type: 'event_storm', message: e.message });
        }

        return bugs;
    },

    /**
     * 第4轮: 高压力并发测试
     */
    async _runHighPressureTest() {
        const bugs = [];

        console.log('');
        console.log('[第4轮] 执行高压力并发测试...');

        // 压力测试1: 高频事件
        try {
            console.log('  压力测试1: 高频事件发布...');
            const startTime = performance.now();

            for (let i = 0; i < 10000; i++) {
                window.AppCore.bus.emit('pressure:event', { index: i, data: new Array(100).fill('test') });
            }

            const duration = performance.now() - startTime;
            console.log(`  ✅ 高频事件完成: 10000 次, 耗时 ${duration.toFixed(2)}ms`);

            if (duration > 1000) {
                bugs.push({
                    type: 'performance_issue',
                    severity: 'high',
                    message: `事件发布性能问题: 10000次操作耗时 ${duration.toFixed(2)}ms`,
                    details: { duration }
                });
            }
        } catch (e) {
            bugs.push({ type: 'high_frequency_events', message: e.message });
        }

        // 压力测试2: 大量DOM操作
        try {
            console.log('  压力测试2: 大量DOM操作...');
            const container = document.createElement('div');
            document.body.appendChild(container);

            for (let i = 0; i < 100; i++) {
                const el = document.createElement('div');
                el.innerHTML = `<span>Test ${i}</span><button>Click ${i}</button>`;
                container.appendChild(el);

                // 添加事件监听
                const btn = el.querySelector('button');
                btn.addEventListener('click', () => console.log(`Clicked ${i}`));
            }

            container.remove();
            console.log('  ✅ 大量DOM操作完成');
        } catch (e) {
            bugs.push({ type: 'massive_dom_operations', message: e.message });
        }

        return bugs;
    },

    /**
     * 第5轮: 混乱场景极限测试
     */
    async _runChaosTest() {
        const bugs = [];

        console.log('');
        console.log('[第5轮] 执行混乱场景极限测试...');

        // 混乱测试1: 异常输入
        const abnormalInputs = [
            null, undefined, '', '   ', '\n\r\t',
            '<script>alert("xss")</script>',
            'javascript:alert("xss")',
            'A'.repeat(10000),
            '{}[]()<>',
            '\x00\x01\x02',
            JSON.stringify({ nested: { deep: { deeper: { deepest: true } } } })
        ];

        console.log('  混乱测试1: 异常输入处理...');
        for (const input of abnormalInputs) {
            try {
                if (typeof SearchModule !== 'undefined') {
                    SearchModule.search(input);
                }
                State.set('chaosTest', input);
            } catch (e) {
                bugs.push({
                    type: 'abnormal_input',
                    input: String(input).substring(0, 50),
                    message: e.message
                });
            }
        }
        console.log(`  ✅ 异常输入测试完成, 发现问题: ${bugs.filter(b => b.type === 'abnormal_input').length}`);

        // 混乱测试2: 随机操作序列
        console.log('  混乱测试2: 随机操作序列...');
        const operations = [
            () => { if (typeof ThemeModule !== 'undefined') ThemeModule.toggle(); },
            () => { if (typeof SidebarModule !== 'undefined') SidebarModule.toggleSidebar(); },
            () => window.scrollTo(0, Math.random() * document.body.scrollHeight),
            () => State.set('randomKey', Math.random()),
            () => window.AppCore.bus.emit('chaos:random', {}),
            () => document.body.classList.add('chaos-test'),
            () => document.body.classList.remove('chaos-test')
        ];

        for (let i = 0; i < 200; i++) {
            try {
                const op = operations[Math.floor(Math.random() * operations.length)];
                op();
            } catch (e) {
                bugs.push({
                    type: 'random_operation',
                    iteration: i,
                    message: e.message
                });
            }
            await this._delay(5);
        }
        console.log('  ✅ 随机操作序列完成');

        return bugs;
    },

    /**
     * 修复发现的问题
     */
    async _fixBugs(bugs) {
        // 这里模拟自动修复过程
        // 实际项目中，这里应该调用具体的修复函数

        const criticalBugs = bugs.filter(b => b.severity === 'high');
        const mediumBugs = bugs.filter(b => b.severity === 'medium');
        const lowBugs = bugs.filter(b => !b.severity || b.severity === 'low');

        console.log(`  严重问题: ${criticalBugs.length}`);
        console.log(`  中等问题: ${mediumBugs.length}`);
        console.log(`  轻微问题: ${lowBugs.length}`);

        // 模拟修复延迟
        await this._delay(1000);

        console.log('  ✅ 修复完成（模拟）');
    },

    /**
     * 生成最终报告
     */
    async _generateFinalReport() {
        console.log('');
        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 16px; color: #7bc47f;');
        console.log('%c  多轮迭代测试最终报告', 'font-size: 20px; font-weight: bold; color: #7bc47f;');
        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 16px; color: #7bc47f;');
        console.log('');

        // 统计各轮结果
        this._allResults.forEach(result => {
            console.log(`第 ${result.iteration} 轮:`);
            console.log(`  耗时: ${result.duration.toFixed(2)}ms`);
            console.log(`  发现问题: ${result.bugs.length}`);
            result.bugs.forEach(bug => {
                console.log(`    - ${bug.type}: ${bug.message.substring(0, 50)}`);
            });
            console.log('');
        });

        // 总体统计
        const totalBugs = this._allBugs.length;
        const criticalBugs = this._allBugs.filter(b => b.severity === 'high').length;
        const mediumBugs = this._allBugs.filter(b => b.severity === 'medium').length;
        const lowBugs = totalBugs - criticalBugs - mediumBugs;

        console.log('%c总体统计:', 'font-weight: bold;');
        console.log(`  总问题数: ${totalBugs}`);
        console.log(`  严重: ${criticalBugs}`);
        console.log(`  中等: ${mediumBugs}`);
        console.log(`  轻微: ${lowBugs}`);
        console.log('');

        if (totalBugs === 0) {
            console.log('%c🎉 恭喜！所有迭代测试通过，未发现严重问题！', 'font-size: 16px; color: #7bc47f;');
        } else if (criticalBugs === 0) {
            console.log('%c✅ 系统基本稳定，只有轻微问题需要优化', 'font-size: 16px; color: #e5c07b;');
        } else {
            console.log('%c⚠️ 发现严重问题，建议继续迭代修复', 'font-size: 16px; color: #e06c75;');
        }

        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 16px; color: #7bc47f;');

        return {
            iterations: this._allResults,
            totalBugs: this._allBugs,
            summary: { totalBugs, criticalBugs, mediumBugs, lowBugs }
        };
    },

    /**
     * 延迟函数
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// 暴露到全局
window.IterationTestRunner = IterationTestRunner;

console.log('[IterationTestRunner] 迭代测试执行器已加载');
console.log('运行 IterationTestRunner.runAllIterations() 开始多轮迭代测试');
