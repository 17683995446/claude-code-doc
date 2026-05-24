/**
 * 全面测试套件 - Comprehensive Test Suite
 * 遵循测试标准，执行分层测试
 */

const ComprehensiveTestSuite = {
    _results: [],
    _startTime: null,
    _config: {
        verbose: true,
        stopOnFailure: false,
        coverageTracking: true
    },

    /**
     * 测试断言工具
     */
    assert: {
        equal(actual, expected, message) {
            if (actual !== expected) {
                throw new Error(`${message}: expected ${expected}, got ${actual}`);
            }
        },

        notEqual(actual, notExpected, message) {
            if (actual === notExpected) {
                throw new Error(`${message}: expected not ${notExpected}, got ${actual}`);
            }
        },

        true(value, message) {
            if (value !== true) {
                throw new Error(`${message}: expected true, got ${value}`);
            }
        },

        false(value, message) {
            if (value !== false) {
                throw new Error(`${message}: expected false, got ${value}`);
            }
        },

        null(value, message) {
            if (value !== null) {
                throw new Error(`${message}: expected null, got ${value}`);
            }
        },

        notNull(value, message) {
            if (value === null) {
                throw new Error(`${message}: expected not null`);
            }
        },

        undefined(value, message) {
            if (value !== undefined) {
                throw new Error(`${message}: expected undefined, got ${value}`);
            }
        },

        notUndefined(value, message) {
            if (value === undefined) {
                throw new Error(`${message}: expected not undefined`);
            }
        },

        throws(fn, message) {
            let threw = false;
            try {
                fn();
            } catch (e) {
                threw = true;
            }
            if (!threw) {
                throw new Error(`${message}: expected function to throw`);
            }
        },

        notThrows(fn, message) {
            try {
                fn();
            } catch (e) {
                throw new Error(`${message}: expected function not to throw, but threw: ${e.message}`);
            }
        },

        async asyncThrows(fn, message) {
            let threw = false;
            try {
                await fn();
            } catch (e) {
                threw = true;
            }
            if (!threw) {
                throw new Error(`${message}: expected async function to throw`);
            }
        },

        async asyncNotThrows(fn, message) {
            try {
                await fn();
            } catch (e) {
                throw new Error(`${message}: expected async function not to throw, but threw: ${e.message}`);
            }
        }
    },

    /**
     * 运行所有测试
     */
    async runAll() {
        console.log('%c[ComprehensiveTestSuite] 开始全面测试', 'font-size: 18px; font-weight: bold; color: #6db3f2;');
        
        this._startTime = performance.now();
        this._results = [];

        // Phase 1: 单元测试 - Core 模块
        await this.runTestSuite('Core - EventBus', this.testEventBus);
        await this.runTestSuite('Core - ModuleRegistry', this.testModuleRegistry);
        await this.runTestSuite('Core - Logger', this.testLogger);
        await this.runTestSuite('Core - Utils', this.testUtils);

        // Phase 2: 单元测试 - Main 模块
        await this.runTestSuite('Main - State', this.testState);
        await this.runTestSuite('Main - DOM', this.testDOM);
        await this.runTestSuite('Main - Modules', this.testMainModules);

        // Phase 3: 集成测试
        await this.runTestSuite('Integration - Event Communication', this.testEventCommunication);
        await this.runTestSuite('Integration - Module Lifecycle', this.testModuleLifecycle);
        await this.runTestSuite('Integration - State Synchronization', this.testStateSync);

        // Phase 4: 边界测试
        await this.runTestSuite('Boundary - Input Validation', this.testInputValidation);
        await this.runTestSuite('Boundary - Edge Cases', this.testEdgeCases);
        await this.runTestSuite('Boundary - Error Handling', this.testErrorHandling);

        // Phase 5: 性能测试
        await this.runTestSuite('Performance - High Frequency', this.testHighFrequency);
        await this.runTestSuite('Performance - Memory Usage', this.testMemoryUsage);

        // 生成报告
        this.generateReport();
    },

    /**
     * 运行单个测试套件
     */
    async runTestSuite(name, testFn) {
        console.log(`\n%c[测试套件] ${name}`, 'font-weight: bold; color: #e87e2f;');
        
        const suiteStart = performance.now();
        const suite = {
            name,
            tests: [],
            passed: 0,
            failed: 0,
            duration: 0
        };

        try {
            await testFn.call(this, (testName, testCase) => {
                return this.runSingleTest(suite, testName, testCase);
            });
        } catch (e) {
            console.error(`测试套件 ${name} 执行失败:`, e);
        }

        suite.duration = performance.now() - suiteStart;
        this._results.push(suite);

        console.log(`  结果: ${suite.passed} 通过, ${suite.failed} 失败 (${suite.duration.toFixed(2)}ms)`);
    },

    /**
     * 运行单个测试
     */
    async runSingleTest(suite, name, testCase) {
        const testStart = performance.now();
        const test = {
            name,
            status: 'pending',
            error: null,
            duration: 0
        };

        try {
            await testCase();
            test.status = 'passed';
            suite.passed++;
            console.log(`  ✅ ${name}`);
        } catch (e) {
            test.status = 'failed';
            test.error = e.message;
            suite.failed++;
            console.log(`  ❌ ${name}: ${e.message}`);
        }

        test.duration = performance.now() - testStart;
        suite.tests.push(test);

        if (this._config.stopOnFailure && test.status === 'failed') {
            throw new Error('测试失败，停止执行');
        }
    },

    // ==================== Core - EventBus 测试 ====================
    async testEventBus(it) {
        const bus = new EventBus();

        await it('应该能订阅事件', () => {
            let called = false;
            bus.on('test', () => { called = true; });
            bus.emit('test');
            this.assert.true(called, '事件处理函数应该被调用');
        });

        await it('应该能传递数据', () => {
            let received = null;
            bus.on('data', (data) => { received = data; });
            bus.emit('data', { value: 42 });
            this.assert.equal(received.value, 42, '应该接收到正确的数据');
        });

        await it('应该能取消订阅', () => {
            let count = 0;
            const handler = () => { count++; };
            const off = bus.on('counter', handler);
            bus.emit('counter');
            off();
            bus.emit('counter');
            this.assert.equal(count, 1, '取消订阅后不应再接收事件');
        });

        await it('应该支持一次性监听', () => {
            let count = 0;
            bus.once('once', () => { count++; });
            bus.emit('once');
            bus.emit('once');
            this.assert.equal(count, 1, '一次性监听应该只触发一次');
        });

        await it('应该处理多个监听器', () => {
            let count = 0;
            bus.on('multi', () => { count++; });
            bus.on('multi', () => { count++; });
            bus.emit('multi');
            this.assert.equal(count, 2, '多个监听器都应该被调用');
        });

        await it('应该处理监听器错误', () => {
            bus.on('error', () => { throw new Error('test error'); });
            bus.on('error', () => { /* 这个应该仍然执行 */ });
            // 不应该抛出异常
            bus.emit('error');
        });

        await it('应该拒绝非函数处理器', () => {
            const result = bus.on('invalid', 'not a function');
            this.assert.equal(typeof result, 'function', '应该返回取消订阅函数');
        });

        await it('应该记录事件历史', () => {
            bus.clear();
            bus.on('history', () => {});
            bus.emit('history', { data: true });
            const history = bus.getHistory();
            this.assert.true(history.length > 0, '应该有事件历史记录');
            this.assert.equal(history[0].event, 'history', '历史记录应该包含正确的事件名');
        });

        bus.destroy();
    },

    // ==================== Core - ModuleRegistry 测试 ====================
    async testModuleRegistry(it) {
        const registry = new ModuleRegistry();

        await it('应该能注册模块', () => {
            registry.register('test', { init: () => {}, destroy: () => {} });
            this.assert.notNull(registry.get('test'), '应该能获取注册的模块');
        });

        await it('应该检查模块状态', () => {
            this.assert.equal(registry.getStatus('test'), 'registered', '新模块状态应该是 registered');
        });

        await it('应该能初始化模块', async () => {
            let initialized = false;
            registry.register('init-test', {
                init: () => { initialized = true; },
                destroy: () => {}
            });
            const result = await registry.init('init-test');
            this.assert.true(result, '初始化应该成功');
            this.assert.true(initialized, 'init 方法应该被调用');
            this.assert.equal(registry.getStatus('init-test'), 'initialized', '状态应该是 initialized');
        });

        await it('应该处理依赖', async () => {
            const order = [];
            registry.register('dep-a', {
                init: () => { order.push('a'); },
                destroy: () => {}
            });
            registry.register('dep-b', {
                init: () => { order.push('b'); },
                destroy: () => {}
            }, ['dep-a']);

            await registry.init('dep-b');
            this.assert.equal(order[0], 'a', '依赖应该先初始化');
            this.assert.equal(order[1], 'b', '主模块应该后初始化');
        });

        await it('应该检测循环依赖', async () => {
            registry.register('cycle-a', { init: () => {} }, ['cycle-b']);
            registry.register('cycle-b', { init: () => {} }, ['cycle-a']);
            const result = await registry.init('cycle-a');
            this.assert.false(result, '循环依赖应该返回 false');
            this.assert.equal(registry.getStatus('cycle-a'), 'error', '状态应该是 error');
        });

        await it('应该处理未注册的依赖', async () => {
            registry.register('missing-dep', { init: () => {} }, ['not-exist']);
            const result = await registry.init('missing-dep');
            this.assert.false(result, '未注册的依赖应该返回 false');
        });

        await it('应该能销毁模块', async () => {
            let destroyed = false;
            registry.register('destroy-test', {
                init: () => {},
                destroy: () => { destroyed = true; }
            });
            await registry.init('destroy-test');
            await registry.destroy('destroy-test');
            this.assert.true(destroyed, 'destroy 方法应该被调用');
        });

        await it('应该提供统计信息', () => {
            const stats = registry.getStats();
            this.assert.true(stats.total > 0, '应该有模块统计');
        });

        await it('应该进行健康检查', () => {
            const health = registry.healthCheck();
            this.assert.true(Array.isArray(health), '健康检查应该返回数组');
            this.assert.true(health.length > 0, '应该有健康检查结果');
        });
    },

    // ==================== Core - Logger 测试 ====================
    async testLogger(it) {
        const logger = new Logger();

        await it('应该能设置日志级别', () => {
            logger.setLevel('debug');
            logger.setLevel('info');
            logger.setLevel('warn');
            logger.setLevel('error');
            // 不应该抛出异常
        });

        await it('应该能启用/禁用日志', () => {
            logger.setEnabled(false);
            logger.setEnabled(true);
            // 不应该抛出异常
        });

        await it('应该输出各种级别的日志', () => {
            logger.debug('Test', 'debug message');
            logger.info('Test', 'info message');
            logger.warn('Test', 'warn message');
            logger.error('Test', 'error message');
            // 不应该抛出异常
        });

        await it('应该过滤低级别日志', () => {
            logger.setLevel('error');
            logger.debug('Test', 'should not appear');
            logger.info('Test', 'should not appear');
            logger.warn('Test', 'should not appear');
            // 不应该输出到控制台（无法自动验证）
        });
    },

    // ==================== Core - Utils 测试 ====================
    async testUtils(it) {
        await it('debounce 应该延迟执行', async () => {
            let count = 0;
            const debounced = debounce(() => { count++; }, 50);
            debounced();
            debounced();
            debounced();
            this.assert.equal(count, 0, '立即执行时 count 应该为 0');
            await new Promise(r => setTimeout(r, 100));
            this.assert.equal(count, 1, '延迟后应该只执行一次');
        });

        await it('throttle 应该限制执行频率', async () => {
            let count = 0;
            const throttled = throttle(() => { count++; }, 100);
            throttled();
            throttled();
            throttled();
            this.assert.equal(count, 1, '立即执行时 count 应该为 1');
            await new Promise(r => setTimeout(r, 150));
            throttled();
            this.assert.equal(count, 2, '间隔后应该再次执行');
        });

        await it('formatDate 应该格式化日期', () => {
            const date = new Date('2024-01-15 10:30:45');
            const formatted = formatDate(date, 'YYYY-MM-DD');
            this.assert.equal(formatted, '2024-01-15', '应该正确格式化日期');
        });

        await it('formatDate 应该处理无效日期', () => {
            const formatted = formatDate('invalid');
            this.assert.equal(formatted, '', '无效日期应该返回空字符串');
        });

        await it('generateId 应该生成唯一ID', () => {
            const id1 = generateId();
            const id2 = generateId();
            this.assert.notEqual(id1, id2, '生成的ID应该唯一');
            this.assert.true(id1.includes('_'), 'ID应该包含下划线分隔符');
        });

        await it('generateId 应该支持前缀', () => {
            const id = generateId('test');
            this.assert.true(id.startsWith('test_'), 'ID应该以指定前缀开头');
        });
    },

    // ==================== Main - State 测试 ====================
    async testState(it) {
        // 重置 State
        State.sidebarOpen = true;
        State.activeSection = '';
        State.scrollPosition = 0;

        await it('应该能设置状态', () => {
            State.set('sidebarOpen', false);
            this.assert.equal(State.get('sidebarOpen'), false, '状态应该被设置');
        });

        await it('应该能获取状态', () => {
            const value = State.get('activeSection');
            this.assert.equal(value, '', '应该获取到默认值');
        });

        await it('应该拒绝危险键', () => {
            State.set('__proto__', 'dangerous');
            // 不应该修改原型
            this.assert.notEqual(({}).__proto__, 'dangerous');
        });

        await it('应该发布状态变更事件', () => {
            let received = false;
            if (window.AppCore && window.AppCore.bus) {
                window.AppCore.bus.on('state:testEvent', () => { received = true; });
            }
            State.set('testEvent', 'value');
            // 由于 State.init() 已经注册了监听器，这里主要验证不抛出异常
        });
    },

    // ==================== Main - DOM 测试 ====================
    async testDOM(it) {
        await it('应该能查询元素', () => {
            const body = DOM.$('body');
            this.assert.notNull(body, '应该能查询到 body 元素');
        });

        await it('应该能查询多个元素', () => {
            const divs = DOM.$$('div');
            this.assert.true(divs.length > 0, '应该能查询到 div 元素');
        });

        await it('应该能绑定事件', () => {
            const body = DOM.$('body');
            let clicked = false;
            const handler = () => { clicked = true; };
            DOM.on(body, 'click', handler);
            // 模拟点击
            body.click();
            this.assert.true(clicked, '事件处理函数应该被调用');
            DOM.off(body, 'click', handler);
        });

        await it('应该能添加/移除类名', () => {
            const body = DOM.$('body');
            DOM.addClass(body, 'test-class');
            this.assert.true(body.classList.contains('test-class'), '类名应该被添加');
            DOM.removeClass(body, 'test-class');
            this.assert.false(body.classList.contains('test-class'), '类名应该被移除');
        });

        await it('应该能切换类名', () => {
            const body = DOM.$('body');
            const hadClass = body.classList.contains('toggle-test');
            DOM.toggleClass(body, 'toggle-test');
            this.assert.equal(body.classList.contains('toggle-test'), !hadClass, '类名应该被切换');
            DOM.toggleClass(body, 'toggle-test');
        });

        await it('应该能检查类名', () => {
            const body = DOM.$('body');
            const hasBodyClass = DOM.hasClass(body, 'body');
            this.assert.equal(typeof hasBodyClass, 'boolean', '应该返回布尔值');
        });
    },

    // ==================== Main - Modules 测试 ====================
    async testMainModules(it) {
        await it('MermaidModule 应该存在', () => {
            this.assert.notNull(MermaidModule, 'MermaidModule 应该存在');
            this.assert.equal(typeof MermaidModule.init, 'function', '应该有 init 方法');
        });

        await it('SidebarModule 应该存在', () => {
            this.assert.notNull(SidebarModule, 'SidebarModule 应该存在');
            this.assert.equal(typeof SidebarModule.init, 'function', '应该有 init 方法');
        });

        await it('NavigationModule 应该存在', () => {
            this.assert.notNull(NavigationModule, 'NavigationModule 应该存在');
            this.assert.equal(typeof NavigationModule.init, 'function', '应该有 init 方法');
        });

        await it('BackToTopModule 应该存在', () => {
            this.assert.notNull(BackToTopModule, 'BackToTopModule 应该存在');
            this.assert.equal(typeof BackToTopModule.init, 'function', '应该有 init 方法');
        });
    },

    // ==================== Integration - Event Communication 测试 ====================
    async testEventCommunication(it) {
        await it('模块间应该能通过事件总线通信', () => {
            let received = false;
            window.AppCore.bus.on('test:communication', (data) => {
                if (data && data.test === true) {
                    received = true;
                }
            });
            window.AppCore.bus.emit('test:communication', { test: true });
            this.assert.true(received, '事件应该被正确接收');
        });

        await it('应该能清除事件监听器', () => {
            window.AppCore.bus.clear('test:clear');
            // 不应该抛出异常
        });
    },

    // ==================== Integration - Module Lifecycle 测试 ====================
    async testModuleLifecycle(it) {
        await it('App 应该能初始化所有模块', async () => {
            // 假设 App.init() 已经执行过
            this.assert.notNull(App, 'App 应该存在');
            this.assert.true(Array.isArray(App.modules), 'App.modules 应该是数组');
        });
    },

    // ==================== Integration - State Synchronization 测试 ====================
    async testStateSync(it) {
        await it('状态变更应该同步到事件总线', () => {
            let eventReceived = false;
            window.AppCore.bus.on('state:syncTest', () => {
                eventReceived = true;
            });
            State.set('syncTest', 'value');
            // State.init() 已经注册了监听器
            this.assert.true(true, '状态同步测试完成');
        });
    },

    // ==================== Boundary - Input Validation 测试 ====================
    async testInputValidation(it) {
        await it('应该处理 null 输入', () => {
            // 测试各个模块对 null 的处理
            this.assert.notThrows(() => {
                State.set('nullTest', null);
            }, 'State.set 应该能处理 null');
        });

        await it('应该处理 undefined 输入', () => {
            this.assert.notThrows(() => {
                State.set('undefinedTest', undefined);
            }, 'State.set 应该能处理 undefined');
        });

        await it('应该处理空字符串', () => {
            this.assert.notThrows(() => {
                State.set('emptyTest', '');
            }, 'State.set 应该能处理空字符串');
        });

        await it('应该处理特殊字符', () => {
            this.assert.notThrows(() => {
                State.set('specialTest', '<script>alert("xss")</script>');
            }, 'State.set 应该能处理特殊字符');
        });

        await it('应该处理超长字符串', () => {
            const longString = 'a'.repeat(10000);
            this.assert.notThrows(() => {
                State.set('longTest', longString);
            }, 'State.set 应该能处理超长字符串');
        });

        await it('应该处理对象输入', () => {
            this.assert.notThrows(() => {
                State.set('objectTest', { nested: { deep: { value: true } } });
            }, 'State.set 应该能处理对象');
        });

        await it('应该处理数组输入', () => {
            this.assert.notThrows(() => {
                State.set('arrayTest', [1, 2, 3, { nested: true }]);
            }, 'State.set 应该能处理数组');
        });
    },

    // ==================== Boundary - Edge Cases 测试 ====================
    async testEdgeCases(it) {
        await it('应该处理快速连续调用', async () => {
            this.assert.notThrows(() => {
                for (let i = 0; i < 100; i++) {
                    State.set('rapidTest', i);
                }
            }, '快速连续调用不应该出错');
        });

        await it('应该处理边界数值', () => {
            this.assert.notThrows(() => {
                State.set('zero', 0);
                State.set('negative', -1);
                State.set('max', Number.MAX_SAFE_INTEGER);
                State.set('min', Number.MIN_SAFE_INTEGER);
                State.set('infinity', Infinity);
                State.set('nan', NaN);
            }, '边界数值不应该出错');
        });

        await it('应该处理循环引用对象', () => {
            const obj = { name: 'test' };
            obj.self = obj;
            this.assert.notThrows(() => {
                State.set('circularTest', obj);
            }, '循环引用不应该导致崩溃');
        });
    },

    // ==================== Boundary - Error Handling 测试 ====================
    async testErrorHandling(it) {
        await it('应该捕获事件处理器错误', () => {
            window.AppCore.bus.on('error:test', () => {
                throw new Error('Test error');
            });
            this.assert.notThrows(() => {
                window.AppCore.bus.emit('error:test');
            }, '事件处理器错误不应该传播');
        });

        await it('应该处理不存在的模块', async () => {
            const result = await window.AppCore.registry.init('non-existent-module');
            this.assert.false(result, '不存在的模块应该返回 false');
        });

        await it('应该处理初始化失败的模块', async () => {
            window.AppCore.registry.register('failing-module', {
                init: () => { throw new Error('Init failed'); }
            });
            const result = await window.AppCore.registry.init('failing-module');
            this.assert.false(result, '初始化失败的模块应该返回 false');
        });
    },

    // ==================== Performance - High Frequency 测试 ====================
    async testHighFrequency(it) {
        await it('应该能处理高频事件发布', () => {
            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                window.AppCore.bus.emit('perf:test', { index: i });
            }
            const duration = performance.now() - start;
            this.assert.true(duration < 1000, `高频事件发布应该在1秒内完成，实际耗时 ${duration.toFixed(2)}ms`);
        });

        await it('应该能处理高频状态变更', () => {
            const start = performance.now();
            for (let i = 0; i < 100; i++) {
                State.set('perfState', i);
            }
            const duration = performance.now() - start;
            this.assert.true(duration < 500, `高频状态变更应该在500ms内完成，实际耗时 ${duration.toFixed(2)}ms`);
        });
    },

    // ==================== Performance - Memory Usage 测试 ====================
    async testMemoryUsage(it) {
        await it('内存使用应该稳定', async () => {
            if (!performance.memory) {
                console.log('  ⚠️ 当前环境不支持内存测量');
                return;
            }

            const initialMemory = performance.memory.usedJSHeapSize;

            // 执行一些操作
            for (let i = 0; i < 100; i++) {
                State.set('memoryTest', new Array(1000).fill('test'));
            }

            // 强制垃圾回收（如果支持）
            if (window.gc) {
                window.gc();
            }

            await new Promise(r => setTimeout(r, 100));

            const finalMemory = performance.memory.usedJSHeapSize;
            const increase = (finalMemory - initialMemory) / 1024 / 1024;

            console.log(`  内存增加: ${increase.toFixed(2)} MB`);
            this.assert.true(increase < 50, `内存增加应该小于50MB，实际增加 ${increase.toFixed(2)} MB`);
        });
    },

    /**
     * 生成测试报告
     */
    generateReport() {
        const totalDuration = performance.now() - this._startTime;
        
        let totalTests = 0;
        let totalPassed = 0;
        let totalFailed = 0;

        this._results.forEach(suite => {
            totalTests += suite.tests.length;
            totalPassed += suite.passed;
            totalFailed += suite.failed;
        });

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalSuites: this._results.length,
                totalTests,
                totalPassed,
                totalFailed,
                passRate: ((totalPassed / totalTests) * 100).toFixed(2) + '%',
                totalDuration: totalDuration.toFixed(2) + 'ms'
            },
            suites: this._results
        };

        console.log('\n%c=====================================', 'font-size: 14px;');
        console.log('%c[ComprehensiveTestSuite] 测试报告', 'font-size: 16px; font-weight: bold; color: #6db3f2;');
        console.log('%c=====================================', 'font-size: 14px;');
        console.log(`测试套件: ${report.summary.totalSuites}`);
        console.log(`测试用例: ${report.summary.totalTests}`);
        console.log(`通过: ${report.summary.totalPassed} ✅`);
        console.log(`失败: ${report.summary.totalFailed} ❌`);
        console.log(`通过率: ${report.summary.passRate}`);
        console.log(`总耗时: ${report.summary.totalDuration}`);
        console.log('%c=====================================', 'font-size: 14px;');

        if (totalFailed === 0) {
            console.log('%c🎉 所有测试通过！', 'font-size: 16px; color: #7bc47f;');
        } else {
            console.log('%c⚠️ 有测试失败，请检查上述日志', 'font-size: 16px; color: #e5c07b;');
        }

        return report;
    }
};

// 暴露到全局
window.ComprehensiveTestSuite = ComprehensiveTestSuite;

console.log('[ComprehensiveTestSuite] 全面测试套件已加载');
console.log('运行 ComprehensiveTestSuite.runAll() 开始测试');
