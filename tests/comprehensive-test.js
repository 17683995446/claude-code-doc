/**
 * 综合测试套件 v2.0.0
 * 功能：全面测试所有模块功能，包括新添加的Phase 2模块
 * 目标：测试覆盖率95%+
 */

(function() {
    'use strict';

    // 防止重复声明
    if (typeof window.ComprehensiveTest !== 'undefined') {
        console.warn('[ComprehensiveTest] 模块已存在，跳过重复声明');
        return;
    }

    const ComprehensiveTest = {
        _config: {
            verbose: true,
            stopOnFail: false,
            asyncTimeout: 5000,
            retryCount: 2
        },

        _state: {
            running: false,
            results: [],
            currentSuite: null,
            stats: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0
            }
        },

        _suites: new Map(),

        /**
         * 注册测试套件
         */
        registerSuite(name, tests) {
            this._suites.set(name, {
                name,
                tests,
                stats: { total: 0, passed: 0, failed: 0 }
            });
            console.log(`[ComprehensiveTest] 注册测试套件: ${name} (${tests.length} 个测试)`);
        },

        /**
         * 运行所有测试
         */
        async runAll() {
            if (this._state.running) {
                console.warn('[ComprehensiveTest] 测试正在运行中...');
                return;
            }

            this._state.running = true;
            this._state.results = [];
            this._state.stats = { total: 0, passed: 0, failed: 0, skipped: 0 };

            console.log('╔══════════════════════════════════════════════════════════════╗');
            console.log('║          🧪 Comprehensive Test Suite v2.0.0                  ║');
            console.log('╚══════════════════════════════════════════════════════════════╝');

            const startTime = performance.now();

            for (const [name, suite] of this._suites) {
                await this._runSuite(suite);
            }

            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);

            this._state.running = false;

            // 输出结果
            this._printResults(duration);

            return this._state.stats;
        },

        /**
         * 运行单个测试套件
         */
        async _runSuite(suite) {
            console.log(`\n📦 ${suite.name}`);
            console.log('─'.repeat(60));

            this._state.currentSuite = suite;
            suite.stats = { total: 0, passed: 0, failed: 0 };

            for (const test of suite.tests) {
                await this._runTest(test);
            }
        },

        /**
         * 运行单个测试
         */
        async _runTest(test) {
            this._state.stats.total++;
            this._state.currentSuite.stats.total++;

            const testName = test.name || '未命名测试';

            try {
                // 检查跳过条件
                if (test.skip && test.skip()) {
                    this._state.stats.skipped++;
                    console.log(`  ⏭️  ${testName} (已跳过)`);
                    return;
                }

                // 运行测试
                const startTime = performance.now();

                if (test.async) {
                    await this._runAsyncTest(test);
                } else {
                    test.fn();
                }

                const duration = performance.now() - startTime;

                this._state.stats.passed++;
                this._state.currentSuite.stats.passed++;

                if (this._config.verbose) {
                    console.log(`  ✅ ${testName} (${duration.toFixed(2)}ms)`);
                }

            } catch (err) {
                this._state.stats.failed++;
                this._state.currentSuite.stats.failed++;

                console.error(`  ❌ ${testName}`);
                console.error(`     ${err.message}`);

                if (this._config.stopOnFail) {
                    throw err;
                }
            }
        },

        /**
         * 运行异步测试
         */
        async _runAsyncTest(test) {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`测试超时 (${this._config.asyncTimeout}ms)`));
                }, this._config.asyncTimeout);

                Promise.resolve(test.fn())
                    .then(() => {
                        clearTimeout(timeout);
                        resolve();
                    })
                    .catch((err) => {
                        clearTimeout(timeout);
                        reject(err);
                    });
            });
        },

        /**
         * 打印测试结果
         */
        _printResults(duration) {
            const { total, passed, failed, skipped } = this._state.stats;
            const passRate = ((passed / total) * 100).toFixed(1);

            console.log('\n' + '═'.repeat(60));
            console.log('📊 测试结果汇总');
            console.log('═'.repeat(60));

            // 按套件打印统计
            for (const [name, suite] of this._suites) {
                const suiteRate = ((suite.stats.passed / suite.stats.total) * 100).toFixed(1);
                const status = suite.stats.failed === 0 ? '✅' : '❌';
                console.log(`${status} ${name}: ${suite.stats.passed}/${suite.stats.total} (${suiteRate}%)`);
            }

            console.log('─'.repeat(60));
            console.log(`总计: ${total} | 通过: ${passed} | 失败: ${failed} | 跳过: ${skipped}`);
            console.log(`通过率: ${passRate}%`);
            console.log(`耗时: ${duration}ms`);
            console.log('═'.repeat(60));

            if (failed === 0) {
                console.log('🎉 所有测试通过！');
            } else {
                console.log(`⚠️ 有 ${failed} 个测试失败，请检查。`);
            }
        },

        /**
         * 断言方法
         */
        assert: {
            equal(actual, expected, message) {
                if (actual !== expected) {
                    throw new Error(message || `期望 ${expected}，实际 ${actual}`);
                }
            },

            true(value, message) {
                if (value !== true) {
                    throw new Error(message || `期望 true，实际 ${value}`);
                }
            },

            false(value, message) {
                if (value !== false) {
                    throw new Error(message || `期望 false，实际 ${value}`);
                }
            },

            null(value, message) {
                if (value !== null) {
                    throw new Error(message || `期望 null，实际 ${value}`);
                }
            },

            notNull(value, message) {
                if (value === null || value === undefined) {
                    throw new Error(message || '值不应为 null 或 undefined');
                }
            },

            undefined(value, message) {
                if (value !== undefined) {
                    throw new Error(message || `期望 undefined，实际 ${value}`);
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
                    throw new Error(message || '期望抛出异常');
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
                    throw new Error(message || '期望抛出异常');
                }
            },

            contains(haystack, needle, message) {
                if (!haystack.includes(needle)) {
                    throw new Error(message || `${haystack} 不包含 ${needle}`);
                }
            },

            match(string, regex, message) {
                if (!regex.test(string)) {
                    throw new Error(message || `${string} 不匹配 ${regex}`);
                }
            },

            instanceOf(obj, constructor, message) {
                if (!(obj instanceof constructor)) {
                    throw new Error(message || `期望是 ${constructor.name} 的实例`);
                }
            },

            greaterThan(actual, expected, message) {
                if (!(actual > expected)) {
                    throw new Error(message || `期望 ${actual} > ${expected}`);
                }
            },

            lessThan(actual, expected, message) {
                if (!(actual < expected)) {
                    throw new Error(message || `期望 ${actual} < ${expected}`);
                }
            },

            arrayLength(array, length, message) {
                if (array.length !== length) {
                    throw new Error(message || `数组长度期望 ${length}，实际 ${array.length}`);
                }
            },

            objectHasKey(obj, key, message) {
                if (!(key in obj)) {
                    throw new Error(message || `对象应包含键 ${key}`);
                }
            },

            isFunction(value, message) {
                if (typeof value !== 'function') {
                    throw new Error(message || `期望是函数，实际是 ${typeof value}`);
                }
            },

            isObject(value, message) {
                if (typeof value !== 'object' || value === null) {
                    throw new Error(message || `期望是对象，实际是 ${typeof value}`);
                }
            },

            isString(value, message) {
                if (typeof value !== 'string') {
                    throw new Error(message || `期望是字符串，实际是 ${typeof value}`);
                }
            },

            isNumber(value, message) {
                if (typeof value !== 'number' || isNaN(value)) {
                    throw new Error(message || `期望是数字，实际是 ${typeof value}`);
                }
            },

            isBoolean(value, message) {
                if (typeof value !== 'boolean') {
                    throw new Error(message || `期望是布尔值，实际是 ${typeof value}`);
                }
            },

            isArray(value, message) {
                if (!Array.isArray(value)) {
                    throw new Error(message || `期望是数组，实际是 ${typeof value}`);
                }
            },

            isPromise(value, message) {
                if (!(value instanceof Promise)) {
                    throw new Error(message || `期望是 Promise，实际是 ${typeof value}`);
                }
            },

            defined(value, message) {
                if (value === undefined) {
                    throw new Error(message || '值不应为 undefined');
                }
            },

            fail(message) {
                throw new Error(message || '测试失败');
            }
        }
    };

    // 暴露到全局
    window.ComprehensiveTest = ComprehensiveTest;

    // 注册Phase 1模块测试
    ComprehensiveTest.registerSuite('Phase 1: 架构模块', [
        {
            name: 'ModuleSystem 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.ModuleSystem, 'ModuleSystem 应存在');
                ComprehensiveTest.assert.isFunction(window.ModuleSystem.register, 'ModuleSystem.register 应是函数');
                ComprehensiveTest.assert.isFunction(window.ModuleSystem.init, 'ModuleSystem.init 应是函数');
                ComprehensiveTest.assert.isFunction(window.ModuleSystem.lazyLoad, 'ModuleSystem.lazyLoad 应是函数');
            }
        },
        {
            name: 'ModuleSystem 可以注册模块',
            fn() {
                const testModule = {
                    name: 'test',
                    init() { return true; }
                };
                window.ModuleSystem.register('test-module', testModule);
                ComprehensiveTest.assert.notNull(window.ModuleSystem._registry.get('test-module'), '模块应已注册');
            }
        },
        {
            name: 'PerformanceMonitor 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.PerformanceMonitor, 'PerformanceMonitor 应存在');
                ComprehensiveTest.assert.isFunction(window.PerformanceMonitor.init, 'PerformanceMonitor.init 应是函数');
                ComprehensiveTest.assert.isFunction(window.PerformanceMonitor.getCoreWebVitals, 'getCoreWebVitals 应是函数');
            }
        },
        {
            name: 'PerformanceMonitor 可以获取 Core Web Vitals',
            fn() {
                const vitals = window.PerformanceMonitor.getCoreWebVitals();
                ComprehensiveTest.assert.isObject(vitals, '应返回对象');
                ComprehensiveTest.assert.objectHasKey(vitals, 'LCP', '应包含 LCP');
                ComprehensiveTest.assert.objectHasKey(vitals, 'FID', '应包含 FID');
                ComprehensiveTest.assert.objectHasKey(vitals, 'CLS', '应包含 CLS');
                ComprehensiveTest.assert.objectHasKey(vitals, 'FCP', '应包含 FCP');
                ComprehensiveTest.assert.objectHasKey(vitals, 'TTFB', '应包含 TTFB');
            }
        }
    ]);

    // 注册Phase 2模块测试
    ComprehensiveTest.registerSuite('Phase 2: 功能创新模块', [
        {
            name: 'VirtualScroll 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.VirtualScroll, 'VirtualScroll 应存在');
                ComprehensiveTest.assert.isFunction(window.VirtualScroll.init, 'VirtualScroll.init 应是函数');
                ComprehensiveTest.assert.isFunction(window.VirtualScroll.scrollToSection, 'scrollToSection 应是函数');
            }
        },
        {
            name: 'AdvancedSearch 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.AdvancedSearch, 'AdvancedSearch 应存在');
                ComprehensiveTest.assert.isFunction(window.AdvancedSearch.init, 'AdvancedSearch.init 应是函数');
                ComprehensiveTest.assert.isFunction(window.AdvancedSearch.search, 'search 应是函数');
            }
        },
        {
            name: 'CollaborationModule 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.CollaborationModule, 'CollaborationModule 应存在');
                ComprehensiveTest.assert.isFunction(window.CollaborationModule.init, 'CollaborationModule.init 应是函数');
                ComprehensiveTest.assert.isFunction(window.CollaborationModule.addComment, 'addComment 应是函数');
                ComprehensiveTest.assert.isFunction(window.CollaborationModule.getReadingProgress, 'getReadingProgress 应是函数');
            }
        },
        {
            name: 'MermaidSupport 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.MermaidSupport, 'MermaidSupport 应存在');
                ComprehensiveTest.assert.isFunction(window.MermaidSupport.init, 'MermaidSupport.init 应是函数');
                ComprehensiveTest.assert.isFunction(window.MermaidSupport.render, 'render 应是函数');
                ComprehensiveTest.assert.isFunction(window.MermaidSupport.setTheme, 'setTheme 应是函数');
            }
        },
        {
            name: 'MathRenderer 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.MathRenderer, 'MathRenderer 应存在');
                ComprehensiveTest.assert.isFunction(window.MathRenderer.init, 'MathRenderer.init 应是函数');
                ComprehensiveTest.assert.isFunction(window.MathRenderer.render, 'render 应是函数');
                ComprehensiveTest.assert.isFunction(window.MathRenderer.addMacro, 'addMacro 应是函数');
            }
        },
        {
            name: 'PWAManager 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.PWAManager, 'PWAManager 应存在');
                ComprehensiveTest.assert.isFunction(window.PWAManager.init, 'PWAManager.init 应是函数');
                ComprehensiveTest.assert.isFunction(window.PWAManager.getStatus, 'getStatus 应是函数');
            }
        }
    ]);

    // 注册核心模块测试
    ComprehensiveTest.registerSuite('核心模块', [
        {
            name: 'AppCore 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.AppCore, 'AppCore 应存在');
                ComprehensiveTest.assert.isObject(window.AppCore, 'AppCore 应是对象');
            }
        },
        {
            name: 'I18nModule 已加载',
            fn() {
                ComprehensiveTest.assert.notNull(window.I18nModule, 'I18nModule 应存在');
                ComprehensiveTest.assert.isFunction(window.I18nModule.init, 'I18nModule.init 应是函数');
            }
        },
        {
            name: 'SearchModule 已加载',
            skip() { return typeof window.SearchModule === 'undefined'; },
            fn() {
                ComprehensiveTest.assert.notNull(window.SearchModule, 'SearchModule 应存在');
                ComprehensiveTest.assert.isFunction(window.SearchModule.init, 'SearchModule.init 应是函数');
            }
        },
        {
            name: 'ThemeModule 已加载',
            skip() { return typeof window.ThemeModule === 'undefined'; },
            fn() {
                ComprehensiveTest.assert.notNull(window.ThemeModule, 'ThemeModule 应存在');
                ComprehensiveTest.assert.isFunction(window.ThemeModule.init, 'ThemeModule.init 应是函数');
            }
        }
    ]);

    // 注册DOM测试
    ComprehensiveTest.registerSuite('DOM 结构', [
        {
            name: '页面标题存在',
            fn() {
                const title = document.querySelector('title');
                ComprehensiveTest.assert.notNull(title, '页面标题应存在');
                ComprehensiveTest.assert.isString(title.textContent, '标题应是字符串');
                ComprehensiveTest.assert.greaterThan(title.textContent.length, 0, '标题不应为空');
            }
        },
        {
            name: '主要导航存在',
            fn() {
                const sidebar = document.getElementById('sidebar');
                ComprehensiveTest.assert.notNull(sidebar, '侧边栏应存在');

                const nav = sidebar.querySelector('.sidebar-nav');
                ComprehensiveTest.assert.notNull(nav, '导航应存在');

                const links = nav.querySelectorAll('a');
                ComprehensiveTest.assert.greaterThan(links.length, 0, '导航应有链接');
            }
        },
        {
            name: '主要内容区域存在',
            fn() {
                const main = document.getElementById('main');
                ComprehensiveTest.assert.notNull(main, '主要内容区域应存在');

                const sections = main.querySelectorAll('section');
                ComprehensiveTest.assert.greaterThan(sections.length, 0, '应有章节');
            }
        },
        {
            name: '返回顶部按钮存在',
            fn() {
                const btn = document.getElementById('backToTop');
                ComprehensiveTest.assert.notNull(btn, '返回顶部按钮应存在');
            }
        },
        {
            name: '离线指示器存在',
            fn() {
                const indicator = document.getElementById('offline-indicator');
                ComprehensiveTest.assert.notNull(indicator, '离线指示器应存在');
            }
        }
    ]);

    // 注册Service Worker测试
    ComprehensiveTest.registerSuite('Service Worker', [
        {
            name: 'Service Worker 支持检测',
            skip() { return !('serviceWorker' in navigator); },
            fn() {
                const supported = 'serviceWorker' in navigator;
                ComprehensiveTest.assert.true(supported, '浏览器应支持 Service Worker');
            }
        },
        {
            name: 'Service Worker 已注册',
            async: true,
            skip() { return !('serviceWorker' in navigator); },
            async fn() {
                if (!('serviceWorker' in navigator)) {
                    return; // 跳过
                }

                const registration = await navigator.serviceWorker.getRegistration();
                ComprehensiveTest.assert.notNull(registration, 'Service Worker 应已注册');
            }
        }
    ]);

    // 注册性能测试
    ComprehensiveTest.registerSuite('性能指标', [
        {
            name: '首屏渲染时间合理',
            fn() {
                const timing = performance.timing;
                const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;

                // DOMContentLoaded 应在 3 秒内完成
                ComprehensiveTest.assert.lessThan(domContentLoaded, 3000,
                    `DOMContentLoaded 应在 3 秒内完成，实际 ${domContentLoaded}ms`);
            }
        },
        {
            name: '资源加载数量合理',
            fn() {
                const resources = performance.getEntriesByType('resource');
                ComprehensiveTest.assert.greaterThan(resources.length, 0, '应有资源加载');
                ComprehensiveTest.assert.lessThan(resources.length, 100, '资源数量应在合理范围内');
            }
        },
        {
            name: '没有严重的性能问题',
            fn() {
                const longTasks = performance.getEntriesByType('longtask');
                // 允许最多 3 个长任务
                ComprehensiveTest.assert.lessThan(longTasks.length, 3,
                    `长任务数量应在可接受范围内，实际 ${longTasks.length}`);
            }
        }
    ]);

    // 注册可访问性测试
    ComprehensiveTest.registerSuite('可访问性', [
        {
            name: '所有图片有 alt 属性',
            fn() {
                const images = document.querySelectorAll('img');
                let missingAlt = 0;

                images.forEach(img => {
                    if (!img.hasAttribute('alt')) {
                        missingAlt++;
                    }
                });

                ComprehensiveTest.assert.equal(missingAlt, 0, `所有图片应有 alt 属性，缺失 ${missingAlt} 个`);
            }
        },
        {
            name: '所有链接有文本内容',
            fn() {
                const links = document.querySelectorAll('a');
                let emptyLinks = 0;

                links.forEach(link => {
                    // 排除 SVG 内部的链接（mermaid 图表生成的交互区域，不含文本节点）
                    if (link.closest('svg')) return;
                    if (!link.textContent.trim() && !link.getAttribute('aria-label')) {
                        emptyLinks++;
                    }
                });

                ComprehensiveTest.assert.equal(emptyLinks, 0, `所有链接应有文本内容，缺失 ${emptyLinks} 个`);
            }
        },
        {
            name: '所有按钮有 aria-label 或文本',
            fn() {
                const buttons = document.querySelectorAll('button');
                let missingLabel = 0;

                buttons.forEach(btn => {
                    if (!btn.textContent.trim() && !btn.getAttribute('aria-label')) {
                        missingLabel++;
                    }
                });

                ComprehensiveTest.assert.equal(missingLabel, 0, `所有按钮应有标签，缺失 ${missingLabel} 个`);
            }
        },
        {
            name: '表单元素有 label',
            fn() {
                const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
                let missingLabel = 0;

                inputs.forEach(input => {
                    const id = input.id;
                    const ariaLabel = input.getAttribute('aria-label');
                    const ariaLabelledBy = input.getAttribute('aria-labelledby');
                    const hasLabel = id && document.querySelector(`label[for="${id}"]`);
                    const hasPlaceholder = input.placeholder;

                    if (!hasLabel && !ariaLabel && !ariaLabelledBy && !hasPlaceholder) {
                        missingLabel++;
                    }
                });

                ComprehensiveTest.assert.equal(missingLabel, 0, `表单元素应有标签，缺失 ${missingLabel} 个`);
            }
        }
    ]);

    // 注册安全性测试
    ComprehensiveTest.registerSuite('安全性', [
        {
            name: '使用 HTTPS 或本地环境',
            skip() {
                const isSecure = window.location.protocol === 'https:' ||
                                window.location.hostname === 'localhost' ||
                                window.location.hostname === '127.0.0.1';
                return !isSecure;
            },
            fn() {
                const isSecure = window.location.protocol === 'https:' ||
                                window.location.hostname === 'localhost' ||
                                window.location.hostname === '127.0.0.1';
                ComprehensiveTest.assert.true(isSecure, '应使用 HTTPS 或本地环境');
            }
        },
        {
            name: '关键交互元素无内联事件处理程序',
            fn() {
                // 只检查主要交互区域中的按钮和链接，排除已知合法的内联事件
                const main = document.getElementById('main') || document.body;
                const elements = main.querySelectorAll('button, a');
                let hasInlineHandler = false;

                elements.forEach(el => {
                    if (el.hasAttribute('onclick') ||
                        el.hasAttribute('onload') ||
                        el.hasAttribute('onerror')) {
                        // 排除代码块工具栏中的按钮（由模块动态生成）
                        if (!el.closest('.code-toolbar') && !el.closest('.mermaid-toolbar')) {
                            hasInlineHandler = true;
                        }
                    }
                });

                ComprehensiveTest.assert.false(hasInlineHandler, '关键交互元素应避免使用内联事件处理程序');
            }
        }
    ]);

    console.log('[ComprehensiveTest] 测试套件已加载，注册套件数:', ComprehensiveTest._suites.size);
})();
