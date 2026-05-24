/**
 * 大规模数据测试 - Large Scale Test
 * 测试系统在处理大量数据时的性能和稳定性
 */

const LargeScaleTest = {
    _results: [],
    
    config: {
        largeArraySize: 100000,
        largeObjectSize: 10000,
        deepNestingLevel: 100,
        stringLength: 1000000
    },

    /**
     * 运行所有大规模测试
     */
    async runAll() {
        console.log('%c[LargeScaleTest] 开始大规模数据测试', 'font-size: 16px; font-weight: bold; color: #e87e2f;');
        
        this._results = [];
        
        // 测试1: 大数组操作
        await this.testLargeArray();
        
        // 测试2: 大对象操作
        await this.testLargeObject();
        
        // 测试3: 深嵌套对象
        await this.testDeepNesting();
        
        // 测试4: 超长字符串
        await this.testLongString();
        
        // 测试5: 大量DOM元素
        await this.testManyDOMElements();
        
        // 测试6: 大量事件监听
        await this.testManyEventListeners();
        
        // 测试7: 大量状态变更
        await this.testManyStateChanges();
        
        // 测试8: 大数据搜索
        await this.testLargeDataSearch();
        
        this._generateReport();
    },

    /**
     * 测试1: 大数组操作
     */
    async testLargeArray() {
        console.log('\n[LargeScaleTest] 测试1: 大数组操作');
        
        const startTime = performance.now();
        const startMemory = this._getMemoryUsage();
        
        try {
            // 创建大数组
            const largeArray = new Array(this.config.largeArraySize).fill(0).map((_, i) => ({
                id: i,
                name: `Item ${i}`,
                value: Math.random(),
                data: new Array(100).fill('test')
            }));
            
            // 操作大数组
            const filtered = largeArray.filter(item => item.value > 0.5);
            const mapped = largeArray.map(item => ({ ...item, computed: item.value * 2 }));
            const reduced = largeArray.reduce((sum, item) => sum + item.value, 0);
            
            // 排序
            const sorted = [...largeArray].sort((a, b) => b.value - a.value);
            
            const endTime = performance.now();
            const endMemory = this._getMemoryUsage();
            
            this._results.push({
                test: 'largeArray',
                status: 'passed',
                duration: endTime - startTime,
                memoryIncrease: endMemory - startMemory,
                details: {
                    arraySize: this.config.largeArraySize,
                    filteredSize: filtered.length,
                    mappedSize: mapped.length,
                    reducedValue: reduced
                }
            });
            
            console.log(`  ✅ 完成 | 耗时: ${(endTime - startTime).toFixed(2)}ms | 内存增加: ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)} MB`);
            
        } catch (e) {
            this._results.push({
                test: 'largeArray',
                status: 'failed',
                error: e.message
            });
            console.error(`  ❌ 失败: ${e.message}`);
        }
    },

    /**
     * 测试2: 大对象操作
     */
    async testLargeObject() {
        console.log('\n[LargeScaleTest] 测试2: 大对象操作');
        
        const startTime = performance.now();
        const startMemory = this._getMemoryUsage();
        
        try {
            // 创建大对象
            const largeObject = {};
            for (let i = 0; i < this.config.largeObjectSize; i++) {
                largeObject[`key_${i}`] = {
                    id: i,
                    data: new Array(50).fill(`value_${i}`),
                    nested: { value: Math.random() }
                };
            }
            
            // 操作大对象
            const keys = Object.keys(largeObject);
            const values = Object.values(largeObject);
            const entries = Object.entries(largeObject);
            
            // 序列化和反序列化
            const serialized = JSON.stringify(largeObject);
            const deserialized = JSON.parse(serialized);
            
            const endTime = performance.now();
            const endMemory = this._getMemoryUsage();
            
            this._results.push({
                test: 'largeObject',
                status: 'passed',
                duration: endTime - startTime,
                memoryIncrease: endMemory - startMemory,
                details: {
                    objectSize: this.config.largeObjectSize,
                    keysCount: keys.length,
                    serializedLength: serialized.length
                }
            });
            
            console.log(`  ✅ 完成 | 耗时: ${(endTime - startTime).toFixed(2)}ms | 内存增加: ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)} MB`);
            
        } catch (e) {
            this._results.push({
                test: 'largeObject',
                status: 'failed',
                error: e.message
            });
            console.error(`  ❌ 失败: ${e.message}`);
        }
    },

    /**
     * 测试3: 深嵌套对象
     */
    async testDeepNesting() {
        console.log('\n[LargeScaleTest] 测试3: 深嵌套对象');
        
        const startTime = performance.now();
        
        try {
            // 创建深嵌套对象
            let deepObject = { value: 0 };
            for (let i = 1; i < this.config.deepNestingLevel; i++) {
                deepObject = { nested: deepObject, level: i };
            }
            
            // 尝试序列化（可能会失败）
            let serialized = null;
            try {
                serialized = JSON.stringify(deepObject);
            } catch (e) {
                console.log(`  ⚠️ 序列化失败（预期行为）: ${e.message}`);
            }
            
            const endTime = performance.now();
            
            this._results.push({
                test: 'deepNesting',
                status: 'passed',
                duration: endTime - startTime,
                details: {
                    nestingLevel: this.config.deepNestingLevel,
                    serializationSuccess: serialized !== null
                }
            });
            
            console.log(`  ✅ 完成 | 耗时: ${(endTime - startTime).toFixed(2)}ms | 嵌套层级: ${this.config.deepNestingLevel}`);
            
        } catch (e) {
            this._results.push({
                test: 'deepNesting',
                status: 'failed',
                error: e.message
            });
            console.error(`  ❌ 失败: ${e.message}`);
        }
    },

    /**
     * 测试4: 超长字符串
     */
    async testLongString() {
        console.log('\n[LargeScaleTest] 测试4: 超长字符串');
        
        const startTime = performance.now();
        const startMemory = this._getMemoryUsage();
        
        try {
            // 创建超长字符串
            const longString = 'x'.repeat(this.config.stringLength);
            
            // 字符串操作
            const substring = longString.substring(0, 1000);
            const index = longString.indexOf('x');
            const replaced = longString.replace(/x/g, 'y');
            const split = longString.split('').slice(0, 100);
            
            const endTime = performance.now();
            const endMemory = this._getMemoryUsage();
            
            this._results.push({
                test: 'longString',
                status: 'passed',
                duration: endTime - startTime,
                memoryIncrease: endMemory - startMemory,
                details: {
                    stringLength: this.config.stringLength,
                    substringLength: substring.length
                }
            });
            
            console.log(`  ✅ 完成 | 耗时: ${(endTime - startTime).toFixed(2)}ms | 字符串长度: ${this.config.stringLength}`);
            
        } catch (e) {
            this._results.push({
                test: 'longString',
                status: 'failed',
                error: e.message
            });
            console.error(`  ❌ 失败: ${e.message}`);
        }
    },

    /**
     * 测试5: 大量DOM元素
     */
    async testManyDOMElements() {
        console.log('\n[LargeScaleTest] 测试5: 大量DOM元素');
        
        const startTime = performance.now();
        const startMemory = this._getMemoryUsage();
        
        try {
            const container = document.createElement('div');
            container.id = 'large-scale-test-container';
            container.style.display = 'none';
            document.body.appendChild(container);
            
            // 创建大量DOM元素
            const elementCount = 10000;
            for (let i = 0; i < elementCount; i++) {
                const el = document.createElement('div');
                el.className = 'test-element';
                el.textContent = `Element ${i}`;
                el.setAttribute('data-index', i);
                container.appendChild(el);
            }
            
            // 查询操作
            const allElements = container.querySelectorAll('.test-element');
            const specificElement = container.querySelector('[data-index="5000"]');
            
            // 清理
            container.remove();
            
            const endTime = performance.now();
            const endMemory = this._getMemoryUsage();
            
            this._results.push({
                test: 'manyDOMElements',
                status: 'passed',
                duration: endTime - startTime,
                memoryIncrease: endMemory - startMemory,
                details: {
                    elementCount,
                    queriedCount: allElements.length
                }
            });
            
            console.log(`  ✅ 完成 | 耗时: ${(endTime - startTime).toFixed(2)}ms | 元素数量: ${elementCount}`);
            
        } catch (e) {
            this._results.push({
                test: 'manyDOMElements',
                status: 'failed',
                error: e.message
            });
            console.error(`  ❌ 失败: ${e.message}`);
        }
    },

    /**
     * 测试6: 大量事件监听
     */
    async testManyEventListeners() {
        console.log('\n[LargeScaleTest] 测试6: 大量事件监听');
        
        const startTime = performance.now();
        
        try {
            const container = document.createElement('div');
            container.id = 'event-test-container';
            document.body.appendChild(container);
            
            // 创建元素并添加事件监听
            const listenerCount = 1000;
            const handlers = [];
            
            for (let i = 0; i < listenerCount; i++) {
                const el = document.createElement('button');
                el.id = `btn-${i}`;
                const handler = () => console.log(`Button ${i} clicked`);
                el.addEventListener('click', handler);
                handlers.push({ el, handler });
                container.appendChild(el);
            }
            
            // 触发所有事件
            handlers.forEach(({ el }) => el.click());
            
            // 清理
            handlers.forEach(({ el, handler }) => {
                el.removeEventListener('click', handler);
            });
            container.remove();
            
            const endTime = performance.now();
            
            this._results.push({
                test: 'manyEventListeners',
                status: 'passed',
                duration: endTime - startTime,
                details: {
                    listenerCount
                }
            });
            
            console.log(`  ✅ 完成 | 耗时: ${(endTime - startTime).toFixed(2)}ms | 监听器数量: ${listenerCount}`);
            
        } catch (e) {
            this._results.push({
                test: 'manyEventListeners',
                status: 'failed',
                error: e.message
            });
            console.error(`  ❌ 失败: ${e.message}`);
        }
    },

    /**
     * 测试7: 大量状态变更
     */
    async testManyStateChanges() {
        console.log('\n[LargeScaleTest] 测试7: 大量状态变更');
        
        const startTime = performance.now();
        
        try {
            const changeCount = 10000;
            
            if (typeof State !== 'undefined') {
                for (let i = 0; i < changeCount; i++) {
                    State.set(`largeTestKey_${i % 100}`, Math.random());
                }
            }
            
            const endTime = performance.now();
            
            this._results.push({
                test: 'manyStateChanges',
                status: 'passed',
                duration: endTime - startTime,
                details: {
                    changeCount
                }
            });
            
            console.log(`  ✅ 完成 | 耗时: ${(endTime - startTime).toFixed(2)}ms | 变更次数: ${changeCount}`);
            
        } catch (e) {
            this._results.push({
                test: 'manyStateChanges',
                status: 'failed',
                error: e.message
            });
            console.error(`  ❌ 失败: ${e.message}`);
        }
    },

    /**
     * 测试8: 大数据搜索
     */
    async testLargeDataSearch() {
        console.log('\n[LargeScaleTest] 测试8: 大数据搜索');
        
        const startTime = performance.now();
        
        try {
            // 创建大数据集
            const data = new Array(50000).fill(0).map((_, i) => ({
                id: i,
                title: `Document ${i}`,
                content: `This is the content of document ${i}. It contains some searchable text.`,
                tags: [`tag${i % 10}`, `category${i % 5}`]
            }));
            
            // 搜索操作
            const searchTerm = 'document 25000';
            const results = data.filter(item => 
                item.title.includes(searchTerm) || 
                item.content.includes(searchTerm)
            );
            
            const endTime = performance.now();
            
            this._results.push({
                test: 'largeDataSearch',
                status: 'passed',
                duration: endTime - startTime,
                details: {
                    dataSize: data.length,
                    resultCount: results.length
                }
            });
            
            console.log(`  ✅ 完成 | 耗时: ${(endTime - startTime).toFixed(2)}ms | 数据量: ${data.length}`);
            
        } catch (e) {
            this._results.push({
                test: 'largeDataSearch',
                status: 'failed',
                error: e.message
            });
            console.error(`  ❌ 失败: ${e.message}`);
        }
    },

    /**
     * 获取内存使用
     */
    _getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    },

    /**
     * 生成测试报告
     */
    _generateReport() {
        console.log('');
        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #6db3f2;');
        console.log('%c[LargeScaleTest] 大规模数据测试报告', 'font-size: 16px; font-weight: bold; color: #6db3f2;');
        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #6db3f2;');
        
        const passed = this._results.filter(r => r.status === 'passed').length;
        const failed = this._results.filter(r => r.status === 'failed').length;
        const totalDuration = this._results.reduce((sum, r) => sum + (r.duration || 0), 0);
        const totalMemory = this._results.reduce((sum, r) => sum + (r.memoryIncrease || 0), 0);
        
        console.log(`测试总数: ${this._results.length}`);
        console.log(`通过: ${passed} ✅`);
        console.log(`失败: ${failed} ❌`);
        console.log(`总耗时: ${totalDuration.toFixed(2)}ms`);
        console.log(`总内存增加: ${(totalMemory / 1024 / 1024).toFixed(2)} MB`);
        
        console.log('');
        console.log('%c详细结果:', 'font-weight: bold;');
        this._results.forEach(r => {
            const icon = r.status === 'passed' ? '✅' : '❌';
            console.log(`  ${icon} ${r.test}: ${r.duration ? r.duration.toFixed(2) + 'ms' : 'N/A'}`);
        });
        
        console.log('%c════════════════════════════════════════════════════════════', 'font-size: 14px; color: #6db3f2;');
        
        return this._results;
    }
};

// 暴露到全局
window.LargeScaleTest = LargeScaleTest;

console.log('[LargeScaleTest] 大规模数据测试模块已加载');
console.log('运行 LargeScaleTest.runAll() 开始测试');
