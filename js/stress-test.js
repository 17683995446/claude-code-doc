/**
 * 压力测试套件 v1.0.0
 * 用于测试模块的稳定性、内存泄漏修复效果和边界条件
 */

(function() {
    'use strict';

    if (typeof window.StressTest !== 'undefined') {
        console.warn('[StressTest] 模块已存在，跳过重复声明');
        return;
    }

    const StressTest = {
        _config: {
            iterations: 100,      // 压力测试迭代次数
            memoryThreshold: 50, // 内存增长阈值 (MB)
            timeout: 30000       // 单个测试超时时间
        },

        _state: {
            running: false,
            results: []
        },

        /**
         * 运行所有压力测试
         */
        async runAll() {
            if (this._state.running) {
                console.warn('[StressTest] 测试正在运行中...');
                return;
            }

            this._state.running = true;
            this._state.results = [];

            console.log('\n╔══════════════════════════════════════════════════════════════╗');
            console.log('║          🔥 Stress Test Suite v1.0.0                          ║');
            console.log('╚══════════════════════════════════════════════════════════════╝\n');

            const tests = [
                { name: '模块初始化/销毁循环', fn: () => this.testModuleLifecycle() },
                { name: '内存泄漏检测', fn: () => this.testMemoryLeaks() },
                { name: '并发操作测试', fn: () => this.testConcurrentOperations() },
                { name: '边界条件测试', fn: () => this.testEdgeCases() },
                { name: '异常处理测试', fn: () => this.testErrorHandling() },
                { name: '大数据量测试', fn: () => this.testLargeData() }
            ];

            let passed = 0;
            let failed = 0;

            for (const test of tests) {
                try {
                    console.log(`\n🔍 测试: ${test.name}`);
                    const startTime = performance.now();
                    await test.fn();
                    const duration = (performance.now() - startTime).toFixed(2);
                    console.log(`  ✅ PASS: ${test.name} (${duration}ms)`);
                    passed++;
                    this._state.results.push({ name: test.name, status: 'passed', duration: parseFloat(duration) });
                } catch (error) {
                    console.error(`  ❌ FAIL: ${test.name}`);
                    console.error(`     错误: ${error.message}`);
                    failed++;
                    this._state.results.push({ name: test.name, status: 'failed', error: error.message });
                }
            }

            const total = tests.length;
            console.log('\n============================================================');
            console.log('\n📊 压力测试结果:\n');
            console.log(`  总计:   ${total}`);
            console.log(`  通过:  ${passed} ✅`);
            console.log(`  失败:  ${failed} ❌`);
            console.log(`  通过率: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);

            this._state.running = false;
            return { passed, failed, total };
        },

        /**
         * 测试模块生命周期（重复初始化/销毁）
         */
        async testModuleLifecycle() {
            const iterations = this._config.iterations;
            const modules = ['CollaborationModule', 'AdvancedSearch', 'MathRenderer', 'MermaidSupport'];
            
            for (let i = 0; i < iterations; i++) {
                for (const moduleName of modules) {
                    const module = window[moduleName];
                    if (!module) continue;

                    // 初始化
                    if (typeof module.init === 'function') {
                        try {
                            const result = module.init();
                            // 异步 init（如 MathRenderer, MermaidSupport）需要 await
                            if (result && typeof result.then === 'function') {
                                await result.catch(e => console.warn(`    ${moduleName} init failed:`, e.message));
                            }
                        } catch (e) {
                            // 忽略已初始化错误
                        }
                    }

                    // 销毁
                    if (typeof module.destroy === 'function') {
                        try {
                            module.destroy();
                        } catch (e) {
                            // 忽略销毁错误
                        }
                    }
                }

                // 每10次迭代输出进度
                if (i % 10 === 0) {
                    console.log(`    进度: ${i}/${iterations}`);
                }
            }

            // 最终重新初始化所有模块
            for (const moduleName of modules) {
                const module = window[moduleName];
                if (module && typeof module.init === 'function') {
                    try {
                        module.init();
                    } catch (e) {}
                }
            }
        },

        /**
         * 测试内存泄漏
         */
        async testMemoryLeaks() {
            if (!performance.memory) {
                console.log('    ⚠️ performance.memory 不可用，跳过内存测试');
                return;
            }

            const initialMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
            console.log(`    初始内存: ${initialMemory.toFixed(2)} MB`);

            // 用于追踪创建的DOM元素，确保异常时也能清理
            const createdElements = [];

            try {
                // 执行大量操作
                for (let i = 0; i < 50; i++) {
                    // 测试搜索
                    if (window.AdvancedSearch) {
                        try {
                            AdvancedSearch.search('test query ' + i);
                        } catch (e) {}
                    }

                    // 测试评论
                    if (window.CollaborationModule) {
                        try {
                            CollaborationModule.addComment('test-section', 'Test comment ' + i);
                        } catch (e) {}
                    }

                    // 创建和删除DOM元素
                    const testDiv = document.createElement('div');
                    testDiv.innerHTML = '<p>Test content</p>'.repeat(100);
                    document.body.appendChild(testDiv);
                    createdElements.push(testDiv);
                    testDiv.remove();
                }
            } finally {
                // 确保所有创建的DOM元素都被清理
                createdElements.forEach(el => {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                });
            }

            // 强制垃圾回收（如果可用）
            if (typeof gc === 'function') {
                gc();
            }

            const finalMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
            const memoryGrowth = finalMemory - initialMemory;

            console.log(`    最终内存: ${finalMemory.toFixed(2)} MB`);
            console.log(`    内存增长: ${memoryGrowth.toFixed(2)} MB`);

            if (memoryGrowth > this._config.memoryThreshold) {
                throw new Error(`内存增长超过阈值: ${memoryGrowth.toFixed(2)} MB > ${this._config.memoryThreshold} MB`);
            }
        },

        /**
         * 测试并发操作
         */
        async testConcurrentOperations() {
            const promises = [];
            // 用于追踪创建的DOM元素，确保异常时也能清理
            const createdElements = [];

            try {
                // 并发执行多个操作
                for (let i = 0; i < 20; i++) {
                    promises.push((async () => {
                        // 并发搜索
                        if (window.AdvancedSearch) {
                            try {
                                await AdvancedSearch.search('concurrent test ' + i);
                            } catch (e) {}
                        }

                        // 并发DOM操作
                        const div = document.createElement('div');
                        div.className = 'concurrent-test-' + i;
                        document.body.appendChild(div);
                        createdElements.push(div);
                        div.remove();
                    })());
                }

                await Promise.all(promises);
            } finally {
                // 确保所有创建的DOM元素都被清理
                createdElements.forEach(el => {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                });
            }

            console.log(`    完成了 ${promises.length} 个并发操作`);
        },

        /**
         * 测试边界条件
         */
        async testEdgeCases() {
            // 空字符串搜索 - 应返回空数组
            if (window.AdvancedSearch) {
                const emptyResult = AdvancedSearch.search('');
                if (!Array.isArray(emptyResult) || emptyResult.length !== 0) {
                    throw new Error('空字符串搜索应返回空数组');
                }

                // null/undefined 应抛出 TypeError
                let nullThrew = false;
                try { AdvancedSearch.search(null); } catch (e) { nullThrew = true; }
                if (!nullThrew) {
                    throw new Error('search(null) 应抛出 TypeError');
                }
            }

            // 超长字符串
            const longString = 'a'.repeat(100000);
            if (window.AdvancedSearch) {
                try {
                    AdvancedSearch.search(longString);
                } catch (e) {
                    console.log(`    超长字符串搜索: ${e.message}`);
                }
            }

            // 特殊字符
            const specialChars = '<script>alert("xss")</script>"><img src=x onerror=alert(1)>';
            if (window.AdvancedSearch) {
                try {
                    AdvancedSearch.search(specialChars);
                } catch (e) {
                    console.log(`    特殊字符搜索: ${e.message}`);
                }
            }

            // 空评论
            if (window.CollaborationModule) {
                try {
                    CollaborationModule.addComment('test-section', '');
                } catch (e) {
                    console.log(`    空评论: ${e.message}`);
                }
            }

            console.log('    边界条件测试完成');
        },

        /**
         * 测试异常处理
         */
        async testErrorHandling() {
            // 测试无效参数
            const modules = ['CollaborationModule', 'AdvancedSearch', 'MathRenderer'];
            
            for (const moduleName of modules) {
                const module = window[moduleName];
                if (!module) continue;

                // 测试调用不存在的方法 - 应抛出 TypeError
                try {
                    module['nonExistentMethod']();
                    throw new Error('调用不存在的方法应抛出 TypeError');
                } catch (e) {
                    if (!(e instanceof TypeError) && e.message !== '调用不存在的方法应抛出 TypeError') {
                        throw e; // 重新抛出非 TypeError
                    }
                }

                // 测试传入无效参数
                const methods = Object.getOwnPropertyNames(module).filter(
                    prop => typeof module[prop] === 'function' 
                        && !prop.startsWith('_') 
                        && prop !== 'init' 
                        && prop !== 'destroy'
                );

                for (const method of methods.slice(0, 3)) { // 只测试前3个方法
                    try {
                        module[method](null, undefined, -1, {});
                    } catch (e) {
                        // 预期会抛出错误
                    }
                }
            }

            console.log('    异常处理测试完成');
        },

        /**
         * 测试大数据量
         */
        async testLargeData() {
            // 创建大量搜索结果
            if (window.AdvancedSearch) {
                const largeQuery = 'architecture design pattern module system';
                const startTime = performance.now();
                
                for (let i = 0; i < 10; i++) {
                    try {
                        AdvancedSearch.search(largeQuery + ' ' + i);
                    } catch (e) {}
                }

                const duration = performance.now() - startTime;
                console.log(`    大数据量搜索耗时: ${duration.toFixed(2)}ms`);

                if (duration > 5000) {
                    throw new Error(`大数据量搜索耗时过长: ${duration.toFixed(2)}ms`);
                }
            }

            // 创建大量评论
            if (window.CollaborationModule) {
                const startTime = performance.now();
                
                try {
                    for (let i = 0; i < 100; i++) {
                        try {
                            // 使用不同 sectionId 避免触发 maxCommentsPerSection 上限
                            const result = CollaborationModule.addComment(`test-section-${i % 5}`, `Comment ${i}`);
                            if (result === null && i < 50) {
                                throw new Error(`评论创建失败于第 ${i} 条（前50条不应触发上限）`);
                            }
                        } catch (e) {
                            if (i < 50) throw e; // 前50条不应失败
                        }
                    }
                } finally {
                    // 清理测试创建的评论DOM元素，避免内存泄漏
                    for (let i = 0; i < 5; i++) {
                        const section = document.getElementById(`test-section-${i}`);
                        if (section) {
                            const comments = section.querySelectorAll('.comment, .test-comment');
                            comments.forEach(el => el.remove());
                        }
                    }
                }

                const duration = performance.now() - startTime;
                console.log(`    创建100条评论耗时: ${duration.toFixed(2)}ms`);
            }
        }
    };

    // 全局暴露
    window.StressTest = StressTest;
    console.log('[StressTest] 压力测试模块已加载');
})();
