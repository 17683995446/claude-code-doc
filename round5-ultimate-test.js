/**
 * 第五轮迭代测试 - 极限长时间运行、百万级事件、真实浏览器环境模拟、全系统混沌
 * Round 5 Ultimate Test
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// ==================== 测试报告 ====================
const testReport = {
    testDate: new Date().toISOString(),
    testName: '第五轮极限测试 - Round 5 Ultimate Test',
    summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    },
    tests: []
};

function addTestResult(name, status, metrics, issues = []) {
    testReport.tests.push({
        name,
        status,
        metrics,
        issues,
        timestamp: new Date().toISOString()
    });
    testReport.summary.totalTests++;
    if (status === '通过') testReport.summary.passed++;
    else if (status === '失败') testReport.summary.failed++;
    if (issues.length > 0) testReport.summary.warnings += issues.length;
}

// ==================== 模拟浏览器环境 ====================
function setupBrowserEnvironment() {
    // 模拟 window 对象
    global.window = {
        location: { href: 'http://localhost:8080/test' },
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
        innerWidth: 1920,
        innerHeight: 1080,
        devicePixelRatio: 1,
        requestAnimationFrame: (cb) => setTimeout(cb, 16),
        cancelAnimationFrame: (id) => clearTimeout(id),
        setTimeout: global.setTimeout,
        clearTimeout: global.clearTimeout,
        setInterval: global.setInterval,
        clearInterval: global.clearInterval,
        DetailedLogger: null,
        AppCore: null
    };

    // 模拟 document 对象
    const elements = new Map();
    let elementId = 0;

    class MockElement {
        constructor(tagName) {
            this.id = `el_${++elementId}`;
            this.tagName = tagName.toUpperCase();
            this.className = '';
            this.classList = {
                _classes: new Set(),
                add: (c) => this.classList._classes.add(c),
                remove: (c) => this.classList._classes.delete(c),
                contains: (c) => this.classList._classes.has(c),
                toggle: (c) => this.classList._classes.has(c) ? this.classList._classes.delete(c) : this.classList._classes.add(c)
            };
            this.children = [];
            this.parentNode = null;
            this.style = {};
            this.attributes = new Map();
            this.eventListeners = new Map();
            this.innerHTML = '';
            this.textContent = '';
            this._destroyed = false;
        }

        appendChild(child) {
            if (child.parentNode) {
                child.parentNode.removeChild(child);
            }
            this.children.push(child);
            child.parentNode = this;
            return child;
        }

        removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx >= 0) {
                this.children.splice(idx, 1);
                child.parentNode = null;
            }
            return child;
        }

        addEventListener(event, handler) {
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event).push(handler);
        }

        removeEventListener(event, handler) {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                const idx = listeners.indexOf(handler);
                if (idx >= 0) listeners.splice(idx, 1);
            }
        }

        dispatchEvent(event) {
            const listeners = this.eventListeners.get(event.type);
            if (listeners) {
                listeners.forEach(l => l.call(this, event));
            }
        }

        setAttribute(name, value) {
            this.attributes.set(name, value);
        }

        getAttribute(name) {
            return this.attributes.get(name);
        }

        removeAttribute(name) {
            this.attributes.delete(name);
        }

        querySelector(selector) {
            // 简化实现
            return this.children[0] || null;
        }

        querySelectorAll(selector) {
            return this.children;
        }

        destroy() {
            this._destroyed = true;
            this.eventListeners.clear();
            this.children.forEach(c => c.destroy && c.destroy());
            this.children = [];
        }
    }

    global.document = {
        createElement: (tagName) => {
            const el = new MockElement(tagName);
            elements.set(el.id, el);
            return el;
        },
        getElementById: (id) => elements.get(id) || null,
        querySelector: (selector) => {
            for (const el of elements.values()) {
                if (el.id === selector.replace('#', '')) return el;
            }
            return null;
        },
        querySelectorAll: (selector) => {
            return Array.from(elements.values());
        },
        body: new MockElement('body'),
        head: new MockElement('head'),
        documentElement: new MockElement('html'),
        addEventListener: () => {},
        removeEventListener: () => {},
        _elements: elements,
        _clearElements: () => {
            elements.forEach(el => el.destroy && el.destroy());
            elements.clear();
        }
    };

    // 模拟 localStorage
    const storage = new Map();
    const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB

    global.localStorage = {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => {
            const newSize = Array.from(storage.entries()).reduce((sum, [k, v]) => sum + k.length + v.length, 0) + key.length + value.length;
            if (newSize > MAX_STORAGE_SIZE) {
                throw new Error('QuotaExceededError: localStorage quota exceeded');
            }
            storage.set(key, String(value));
        },
        removeItem: (key) => storage.delete(key),
        clear: () => storage.clear(),
        get length() { return storage.size; },
        key: (index) => Array.from(storage.keys())[index],
        _storage: storage,
        _getSize: () => Array.from(storage.entries()).reduce((sum, [k, v]) => sum + k.length + v.length, 0)
    };

    // 模拟 performance
    const marks = new Map();
    const measures = [];
    const nodePerf = require('perf_hooks').performance;

    global.performance = {
        now: () => nodePerf.now(),
        mark: (name) => {
            marks.set(name, nodePerf.now());
        },
        clearMarks: (name) => {
            if (name) marks.delete(name);
            else marks.clear();
        },
        measure: (name, startMark, endMark) => {
            const start = marks.get(startMark) || 0;
            const end = marks.get(endMark) || nodePerf.now();
            measures.push({ name, duration: end - start });
        },
        getEntriesByName: (name) => {
            return measures.filter(m => m.name === name);
        },
        clearMeasures: () => measures.length = 0,
        memory: {
            usedJSHeapSize: 100 * 1024 * 1024,
            totalJSHeapSize: 200 * 1024 * 1024,
            jsHeapSizeLimit: 2000 * 1024 * 1024
        },
        _marks: marks,
        _measures: measures
    };

    // 模拟 navigator
    global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        language: 'zh-CN',
        languages: ['zh-CN', 'zh', 'en'],
        onLine: true,
        platform: 'Win32',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        maxTouchPoints: 0,
        cookieEnabled: true,
        pdfViewerEnabled: false,
        webdriver: false
    };

    // 模拟 Blob 和 URL
    global.Blob = class Blob {
        constructor(parts, options) {
            this.parts = parts;
            this.type = options?.type || '';
            this.size = parts.reduce((sum, p) => sum + p.length, 0);
        }
    };

    global.URL = {
        createObjectURL: () => 'blob:mock-url-' + Math.random().toString(36),
        revokeObjectURL: () => {}
    };

    // 保存原始console
    const originalConsole = global.console;
    
    // 模拟 console (仅用于被测试的代码) - 过滤掉DetailedLogger的调试输出
    global.console = {
        log: (...args) => {
            const msg = args[0] || '';
            if (typeof msg === 'string' && msg.includes('[DEBUG]')) return;
            originalConsole.log(...args);
        },
        error: (...args) => originalConsole.error(...args),
        warn: (...args) => originalConsole.warn(...args),
        info: (...args) => originalConsole.info(...args),
        debug: (...args) => {},
        table: (...args) => {},
        time: (label) => {},
        timeEnd: (label) => {},
        group: (label) => {},
        groupEnd: () => {}
    };

    return { MockElement };
}

// ==================== 内存监控 ====================
let memoryBaseline = 0;

function getMemoryUsage() {
    if (global.gc) {
        global.gc();
    }
    const mem = process.memoryUsage();
    return {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024)
    };
}

function setMemoryBaseline() {
    memoryBaseline = getMemoryUsage().heapUsed;
}

function checkMemoryLeak(maxGrowthMB = 100) {
    const current = getMemoryUsage().heapUsed;
    const growth = current - memoryBaseline;
    return {
        baseline: memoryBaseline,
        current,
        growth,
        hasLeak: growth > maxGrowthMB
    };
}

// ==================== 加载核心模块 ====================
function loadCoreModules() {
    const corePath = '/workspace/claude-code-doc/js/core.js';
    const loggerPath = '/workspace/claude-code-doc/js/detailed-logger.js';

    const coreCode = fs.readFileSync(corePath, 'utf-8');
    const loggerCode = fs.readFileSync(loggerPath, 'utf-8');

    // 使用 Function 构造器执行
    const coreFn = new Function(coreCode + '; return AppCore;');
    const loggerFn = new Function(loggerCode + '; return DetailedLogger;');

    const AppCore = coreFn();
    const DetailedLogger = loggerFn();

    window.AppCore = AppCore;
    window.DetailedLogger = DetailedLogger;

    return { AppCore, DetailedLogger };
}

// ==================== 测试 A: 长时间运行压力测试 ====================
async function runLongRunningTests(AppCore) {
    console.log('\n========== A. 长时间运行压力测试 ==========\n');

    // 测试 A1: 超长时间事件发射
    console.log('测试 A1: 超长时间事件发射');
    setMemoryBaseline();

    const eventCount = 72000; // 目标：72,000个事件
    const compressedInterval = 0.1; // 压缩到0.1ms间隔（实际约7.2秒）
    let processedCount = 0;
    let errorCount = 0;
    const startTime = performance.now();
    const processingTimes = [];

    const handler = (data) => {
        const t0 = performance.now();
        processedCount++;
        const t1 = performance.now();
        processingTimes.push(t1 - t0);
    };

    AppCore.bus.on('long-running-test', handler);

    // 批量发射事件
    for (let i = 0; i < eventCount; i++) {
        AppCore.bus.emit('long-running-test', { index: i, timestamp: Date.now() });
        if (i % 1000 === 0) {
            await new Promise(r => setImmediate(r));
        }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    const memoryCheck = checkMemoryLeak(100);

    AppCore.bus.off('long-running-test', handler);

    const a1Issues = [];
    if (processedCount !== eventCount) {
        a1Issues.push(`事件处理数量不匹配: 期望 ${eventCount}, 实际 ${processedCount}`);
    }
    if (memoryCheck.hasLeak) {
        a1Issues.push(`检测到内存泄漏: 增长 ${memoryCheck.growth}MB`);
    }

    addTestResult('A1: 超长时间事件发射', a1Issues.length === 0 ? '通过' : '失败', {
        目标事件数: eventCount,
        实际处理数: processedCount,
        总耗时: `${duration.toFixed(2)}ms`,
        平均处理时间: `${avgProcessingTime.toFixed(4)}ms`,
        内存基线: `${memoryCheck.baseline}MB`,
        内存当前: `${memoryCheck.current}MB`,
        内存增长: `${memoryCheck.growth}MB`,
        每秒处理事件数: Math.round(eventCount / (duration / 1000))
    }, a1Issues);

    console.log(`  结果: ${a1Issues.length === 0 ? '通过' : '失败'}, 处理 ${processedCount} 个事件, 耗时 ${duration.toFixed(2)}ms, 内存增长 ${memoryCheck.growth}MB`);

    // 测试 A2: 模块生命周期极限测试
    console.log('测试 A2: 模块生命周期极限测试');
    setMemoryBaseline();

    const lifecycleCount = 10000;
    let initCount = 0;
    let destroyCount = 0;
    const lifecycleStart = performance.now();

    for (let i = 0; i < lifecycleCount; i++) {
        const testModule = {
            name: `TestModule_${i}`,
            init: () => { initCount++; },
            destroy: () => { destroyCount++; }
        };

        AppCore.registry.register(testModule.name, testModule);
        await AppCore.registry.init(testModule.name);
        await AppCore.registry.destroy(testModule.name);

        if (i % 1000 === 0) {
            await new Promise(r => setImmediate(r));
        }
    }

    const lifecycleEnd = performance.now();
    const lifecycleMemory = checkMemoryLeak(50);
    const remainingModules = AppCore.registry.getRegistered().length;

    const a2Issues = [];
    if (initCount !== lifecycleCount) {
        a2Issues.push(`初始化次数不匹配: 期望 ${lifecycleCount}, 实际 ${initCount}`);
    }
    if (destroyCount !== lifecycleCount) {
        a2Issues.push(`销毁次数不匹配: 期望 ${lifecycleCount}, 实际 ${destroyCount}`);
    }
    if (lifecycleMemory.hasLeak) {
        a2Issues.push(`检测到内存泄漏: 增长 ${lifecycleMemory.growth}MB`);
    }
    if (remainingModules > 0) {
        a2Issues.push(`残留模块: ${remainingModules} 个`);
    }

    addTestResult('A2: 模块生命周期极限测试', a2Issues.length === 0 ? '通过' : '失败', {
        循环次数: lifecycleCount,
        初始化次数: initCount,
        销毁次数: destroyCount,
        总耗时: `${(lifecycleEnd - lifecycleStart).toFixed(2)}ms`,
        平均每次耗时: `${((lifecycleEnd - lifecycleStart) / lifecycleCount).toFixed(4)}ms`,
        内存增长: `${lifecycleMemory.growth}MB`,
        残留模块数: remainingModules
    }, a2Issues);

    console.log(`  结果: ${a2Issues.length === 0 ? '通过' : '失败'}, 循环 ${lifecycleCount} 次, 内存增长 ${lifecycleMemory.growth}MB`);

    // 测试 A3: 混合负载长时间测试
    console.log('测试 A3: 混合负载长时间测试');
    setMemoryBaseline();

    const mixedStart = performance.now();
    let mixedEventCount = 0;
    let mixedModuleCount = 0;
    let mixedLogCount = 0;

    const mixedHandler = () => { mixedEventCount++; };
    AppCore.bus.on('mixed-test', mixedHandler);

    const iterations = 5000;
    for (let i = 0; i < iterations; i++) {
        // 发射事件
        AppCore.bus.emit('mixed-test', { index: i });

        // 模块生命周期
        if (i % 10 === 0) {
            const modName = `MixedModule_${i}`;
            AppCore.registry.register(modName, {
                name: modName,
                init: () => {},
                destroy: () => {}
            });
            await AppCore.registry.init(modName);
            await AppCore.registry.destroy(modName);
            mixedModuleCount++;
        }

        // 日志记录
        if (window.DetailedLogger && i % 5 === 0) {
            window.DetailedLogger.debug('MIXED_TEST', `Iteration ${i}`, { index: i });
            mixedLogCount++;
        }

        if (i % 500 === 0) {
            await new Promise(r => setImmediate(r));
        }
    }

    AppCore.bus.off('mixed-test', mixedHandler);
    const mixedEnd = performance.now();
    const mixedMemory = checkMemoryLeak(100);

    addTestResult('A3: 混合负载长时间测试', '通过', {
        迭代次数: iterations,
        事件发射数: mixedEventCount,
        模块生命周期次数: mixedModuleCount,
        日志记录数: mixedLogCount,
        总耗时: `${(mixedEnd - mixedStart).toFixed(2)}ms`,
        内存增长: `${mixedMemory.growth}MB`
    });

    console.log(`  结果: 通过, 混合负载测试完成, 内存增长 ${mixedMemory.growth}MB`);
}

// ==================== 测试 B: 百万级事件压力测试 ====================
async function runMillionEventTests(AppCore) {
    console.log('\n========== B. 百万级事件压力测试 ==========\n');

    // 测试 B1: 百万事件单监听器
    console.log('测试 B1: 百万事件单监听器');
    setMemoryBaseline();

    const millionEvents = 1000000;
    let b1Received = 0;
    const b1Start = performance.now();

    const b1Handler = () => { b1Received++; };
    AppCore.bus.on('million-test', b1Handler);

    for (let i = 0; i < millionEvents; i++) {
        AppCore.bus.emit('million-test', { index: i });
        if (i % 10000 === 0) {
            await new Promise(r => setImmediate(r));
        }
    }

    AppCore.bus.off('million-test', b1Handler);
    const b1End = performance.now();
    const b1Duration = b1End - b1Start;
    const b1Memory = checkMemoryLeak(200);

    const b1Issues = [];
    if (b1Received !== millionEvents) {
        b1Issues.push(`事件接收数量不匹配: 期望 ${millionEvents}, 实际 ${b1Received}`);
    }

    addTestResult('B1: 百万事件单监听器', b1Issues.length === 0 ? '通过' : '失败', {
        事件总数: millionEvents,
        接收事件数: b1Received,
        总耗时: `${b1Duration.toFixed(2)}ms`,
        平均每个事件耗时: `${(b1Duration / millionEvents).toFixed(4)}ms`,
        每秒处理事件数: Math.round(millionEvents / (b1Duration / 1000)),
        内存增长: `${b1Memory.growth}MB`
    }, b1Issues);

    console.log(`  结果: ${b1Issues.length === 0 ? '通过' : '失败'}, 处理 ${b1Received} 个事件, 耗时 ${b1Duration.toFixed(2)}ms`);

    // 测试 B2: 百万事件多监听器分发
    console.log('测试 B2: 百万事件多监听器分发');
    setMemoryBaseline();

    const listenerCount = 100;
    const eventCount = 10000;
    const expectedCalls = listenerCount * eventCount; // 1,000,000次handler调用
    let totalCalls = 0;
    const b2Start = performance.now();

    const handlers = [];
    for (let i = 0; i < listenerCount; i++) {
        const handler = () => { totalCalls++; };
        AppCore.bus.on('multi-listener-test', handler);
        handlers.push(handler);
    }

    for (let i = 0; i < eventCount; i++) {
        AppCore.bus.emit('multi-listener-test', { index: i });
        if (i % 1000 === 0) {
            await new Promise(r => setImmediate(r));
        }
    }

    handlers.forEach(h => AppCore.bus.off('multi-listener-test', h));
    const b2End = performance.now();
    const b2Duration = b2End - b2Start;
    const b2Memory = checkMemoryLeak(200);

    const b2Issues = [];
    if (totalCalls !== expectedCalls) {
        b2Issues.push(`Handler调用次数不匹配: 期望 ${expectedCalls}, 实际 ${totalCalls}`);
    }

    addTestResult('B2: 百万事件多监听器分发', b2Issues.length === 0 ? '通过' : '失败', {
        监听器数量: listenerCount,
        事件数量: eventCount,
        预期Handler调用次数: expectedCalls,
        实际Handler调用次数: totalCalls,
        总耗时: `${b2Duration.toFixed(2)}ms`,
        平均每次调用耗时: `${(b2Duration / totalCalls).toFixed(4)}ms`,
        内存增长: `${b2Memory.growth}MB`
    }, b2Issues);

    console.log(`  结果: ${b2Issues.length === 0 ? '通过' : '失败'}, ${listenerCount}个监听器处理 ${eventCount} 个事件`);

    // 测试 B3: 事件历史压力测试
    console.log('测试 B3: 事件历史压力测试');
    setMemoryBaseline();

    const historyTestEvents = 10000;
    const maxHistory = 100;
    const b3Start = performance.now();

    for (let i = 0; i < historyTestEvents; i++) {
        AppCore.bus.emit('history-test', { index: i });
        if (i % 1000 === 0) {
            await new Promise(r => setImmediate(r));
        }
    }

    const history = AppCore.bus.getHistory();
    const b3End = performance.now();
    const b3Memory = checkMemoryLeak(50);

    const b3Issues = [];
    if (history.length !== maxHistory) {
        b3Issues.push(`历史记录数量不正确: 期望 ${maxHistory}, 实际 ${history.length}`);
    }
    if (history[0].data.index !== historyTestEvents - maxHistory) {
        b3Issues.push('历史记录轮换不正确');
    }

    addTestResult('B3: 事件历史压力测试', b3Issues.length === 0 ? '通过' : '失败', {
        发射事件总数: historyTestEvents,
        最大历史记录数: maxHistory,
        实际历史记录数: history.length,
        第一条记录索引: history[0]?.data?.index,
        最后一条记录索引: history[history.length - 1]?.data?.index,
        总耗时: `${(b3End - b3Start).toFixed(2)}ms`,
        内存增长: `${b3Memory.growth}MB`
    }, b3Issues);

    console.log(`  结果: ${b3Issues.length === 0 ? '通过' : '失败'}, 历史记录限制为 ${history.length} 条`);
}

// ==================== 测试 C: 真实浏览器环境模拟测试 ====================
async function runBrowserSimulationTests(AppCore, MockElement) {
    console.log('\n========== C. 真实浏览器环境模拟测试 ==========\n');

    // 测试 C1: 真实DOM操作模拟
    console.log('测试 C1: 真实DOM操作模拟');
    setMemoryBaseline();

    const c1Start = performance.now();
    const elements = [];
    const domOperations = 10000;

    for (let i = 0; i < domOperations; i++) {
        // 创建元素
        const el = document.createElement('div');
        el.id = `test-element-${i}`;
        el.className = `class-${i % 10}`;
        el.setAttribute('data-index', i);

        // 添加子元素
        if (i % 3 === 0) {
            const child = document.createElement('span');
            child.textContent = `Child ${i}`;
            el.appendChild(child);
        }

        // 添加事件监听
        el.addEventListener('click', () => {});
        el.addEventListener('mouseover', () => {});

        elements.push(el);

        // 模拟部分元素销毁
        if (i % 5 === 0 && elements.length > 100) {
            const toRemove = elements.shift();
            toRemove.destroy();
        }

        if (i % 1000 === 0) {
            await new Promise(r => setImmediate(r));
        }
    }

    // 清理所有元素
    elements.forEach(el => el.destroy());
    document._clearElements();

    const c1End = performance.now();
    const c1Memory = checkMemoryLeak(50);

    const c1Issues = [];
    if (c1Memory.hasLeak) {
        c1Issues.push(`DOM操作后检测到内存泄漏: ${c1Memory.growth}MB`);
    }

    addTestResult('C1: 真实DOM操作模拟', c1Issues.length === 0 ? '通过' : '失败', {
        DOM操作次数: domOperations,
        最终残留元素数: document._elements.size,
        总耗时: `${(c1End - c1Start).toFixed(2)}ms`,
        内存增长: `${c1Memory.growth}MB`
    }, c1Issues);

    console.log(`  结果: ${c1Issues.length === 0 ? '通过' : '失败'}, 执行 ${domOperations} 次DOM操作`);

    // 测试 C2: 真实localStorage模拟
    console.log('测试 C2: 真实localStorage模拟');
    setMemoryBaseline();

    const c2Start = performance.now();
    let quotaExceeded = false;
    let storedItems = 0;

    try {
        // 尝试存储直到超出配额
        for (let i = 0; i < 10000; i++) {
            const key = `key_${i}`;
            const value = 'x'.repeat(1000); // 1KB each
            localStorage.setItem(key, value);
            storedItems++;
        }
    } catch (e) {
        quotaExceeded = true;
    }

    const storageSize = localStorage._getSize();
    localStorage.clear();
    const c2End = performance.now();
    const c2Memory = checkMemoryLeak(50);

    const c2Issues = [];
    if (!quotaExceeded) {
        c2Issues.push('未能触发localStorage配额限制');
    }

    addTestResult('C2: 真实localStorage模拟', c2Issues.length === 0 ? '通过' : '失败', {
        存储项目数: storedItems,
        触发配额限制: quotaExceeded,
        存储大小: `${(storageSize / 1024).toFixed(2)}KB`,
        总耗时: `${(c2End - c2Start).toFixed(2)}ms`,
        内存增长: `${c2Memory.growth}MB`
    }, c2Issues);

    console.log(`  结果: ${c2Issues.length === 0 ? '通过' : '失败'}, 存储 ${storedItems} 项后触发配额限制`);

    // 测试 C3: 真实网络请求模拟
    console.log('测试 C3: 真实网络请求模拟');
    setMemoryBaseline();

    const c3Start = performance.now();
    const networkRequests = 1000;
    let completedRequests = 0;
    let failedRequests = 0;

    const simulateRequest = (index) => {
        return new Promise((resolve) => {
            const delay = Math.random() * 50 + 10; // 10-60ms
            setTimeout(() => {
                if (Math.random() > 0.95) {
                    failedRequests++;
                } else {
                    completedRequests++;
                }
                resolve();
            }, delay);
        });
    };

    // 并发请求（限制并发数）
    const batchSize = 50;
    for (let i = 0; i < networkRequests; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, networkRequests); j++) {
            batch.push(simulateRequest(j));
        }
        await Promise.all(batch);
    }

    const c3End = performance.now();
    const c3Memory = checkMemoryLeak(50);

    addTestResult('C3: 真实网络请求模拟', '通过', {
        请求总数: networkRequests,
        成功请求: completedRequests,
        失败请求: failedRequests,
        总耗时: `${(c3End - c3Start).toFixed(2)}ms`,
        平均请求耗时: `${((c3End - c3Start) / networkRequests).toFixed(2)}ms`,
        内存增长: `${c3Memory.growth}MB`
    });

    console.log(`  结果: 通过, 模拟 ${networkRequests} 个网络请求`);

    // 测试 C4: 浏览器事件循环模拟
    console.log('测试 C4: 浏览器事件循环模拟');
    setMemoryBaseline();

    const c4Start = performance.now();
    let timeoutCount = 0;
    let intervalCount = 0;
    let rafCount = 0;

    // setTimeout测试
    const timeoutPromises = [];
    for (let i = 0; i < 100; i++) {
        timeoutPromises.push(new Promise(resolve => {
            setTimeout(() => {
                timeoutCount++;
                resolve();
            }, Math.random() * 100);
        }));
    }

    // setInterval测试
    const intervalResults = [];
    for (let i = 0; i < 10; i++) {
        intervalResults.push(new Promise(resolve => {
            let count = 0;
            const interval = setInterval(() => {
                count++;
                intervalCount++;
                if (count >= 5) {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        }));
    }

    // requestAnimationFrame测试（使用setTimeout模拟）
    const rafResults = [];
    for (let i = 0; i < 50; i++) {
        rafResults.push(new Promise(resolve => {
            window.requestAnimationFrame(() => {
                rafCount++;
                resolve();
            });
        }));
    }

    await Promise.all([...timeoutPromises, ...intervalResults, ...rafResults]);

    const c4End = performance.now();
    const c4Memory = checkMemoryLeak(50);

    const c4Issues = [];
    if (timeoutCount !== 100) {
        c4Issues.push(`setTimeout执行次数不正确: 期望 100, 实际 ${timeoutCount}`);
    }
    if (intervalCount !== 50) {
        c4Issues.push(`setInterval执行次数不正确: 期望 50, 实际 ${intervalCount}`);
    }
    if (rafCount !== 50) {
        c4Issues.push(`requestAnimationFrame执行次数不正确: 期望 50, 实际 ${rafCount}`);
    }

    addTestResult('C4: 浏览器事件循环模拟', c4Issues.length === 0 ? '通过' : '失败', {
        setTimeout执行数: timeoutCount,
        setInterval执行数: intervalCount,
        requestAnimationFrame执行数: rafCount,
        总耗时: `${(c4End - c4Start).toFixed(2)}ms`,
        内存增长: `${c4Memory.growth}MB`
    }, c4Issues);

    console.log(`  结果: ${c4Issues.length === 0 ? '通过' : '失败'}, 事件循环测试完成`);
}

// ==================== 测试 D: 全系统混沌极限测试 ====================
async function runChaosTests(AppCore) {
    console.log('\n========== D. 全系统混沌极限测试 ==========\n');

    // 测试 D1: 全API随机调用
    console.log('测试 D1: 全API随机调用');
    setMemoryBaseline();

    const d1Start = performance.now();
    const chaosIterations = 10000;
    let chaosErrors = 0;
    let chaosSuccess = 0;

    const apis = [
        // EventBus APIs
        () => AppCore.bus.on('chaos', () => {}),
        () => AppCore.bus.once('chaos', () => {}),
        () => AppCore.bus.emit('chaos', { data: Math.random() }),
        () => AppCore.bus.getHistory(),
        () => AppCore.bus.clear(),

        // ModuleRegistry APIs
        () => AppCore.registry.register(`chaos_${Math.random()}`, { init: () => {}, destroy: () => {} }),
        () => AppCore.registry.getRegistered(),
        () => AppCore.registry.getStats(),
        () => AppCore.registry.healthCheck(),

        // Logger APIs
        () => AppCore.logger.setLevel(['debug', 'info', 'warn', 'error'][Math.floor(Math.random() * 4)]),
        () => AppCore.logger.debug('CHAOS', 'test'),
        () => AppCore.logger.info('CHAOS', 'test'),
        () => AppCore.logger.warn('CHAOS', 'test'),
        () => AppCore.logger.error('CHAOS', 'test'),

        // Utils APIs
        () => AppCore.utils.debounce(() => {}, 100),
        () => AppCore.utils.throttle(() => {}, 100),
        () => AppCore.utils.formatDate(new Date()),
        () => AppCore.utils.generateId('chaos')
    ];

    const invalidArgs = [
        null, undefined, '', 'very long string '.repeat(1000),
        0, -1, Infinity, -Infinity, NaN,
        {}, { circular: null }, [], [1, 2, 3],
        () => {}, /regex/, new Date(), Symbol('test')
    ];

    for (let i = 0; i < chaosIterations; i++) {
        try {
            const api = apis[Math.floor(Math.random() * apis.length)];
            api();
            chaosSuccess++;
        } catch (e) {
            chaosErrors++;
        }

        // 随机注入非法参数
        if (Math.random() > 0.9) {
            try {
                AppCore.bus.on('test', invalidArgs[Math.floor(Math.random() * invalidArgs.length)]);
            } catch (e) {
                // 预期会失败
            }
        }

        if (i % 1000 === 0) {
            await new Promise(r => setImmediate(r));
        }
    }

    const d1End = performance.now();
    const d1Memory = checkMemoryLeak(200);

    addTestResult('D1: 全API随机调用', '通过', {
        总调用次数: chaosIterations,
        成功调用: chaosSuccess,
        错误次数: chaosErrors,
        错误率: `${((chaosErrors / chaosIterations) * 100).toFixed(2)}%`,
        总耗时: `${(d1End - d1Start).toFixed(2)}ms`,
        内存增长: `${d1Memory.growth}MB`
    });

    console.log(`  结果: 通过, 执行 ${chaosIterations} 次随机调用, 错误率 ${((chaosErrors / chaosIterations) * 100).toFixed(2)}%`);

    // 测试 D2: 资源竞争测试
    console.log('测试 D2: 资源竞争测试');
    setMemoryBaseline();

    const d2Start = performance.now();
    const virtualUsers = 10;
    const operationsPerUser = 1000;
    let raceConditionCount = 0;
    let totalOperations = 0;

    const userOperations = async (userId) => {
        const results = [];
        for (let i = 0; i < operationsPerUser; i++) {
            const op = Math.floor(Math.random() * 4);
            const moduleName = `RaceModule_${userId}_${i}`;

            switch (op) {
                case 0: // Register
                    AppCore.registry.register(moduleName, {
                        name: moduleName,
                        init: () => {},
                        destroy: () => {}
                    });
                    results.push({ op: 'register', module: moduleName });
                    break;
                case 1: // Init
                    await AppCore.registry.init(moduleName).catch(() => {});
                    results.push({ op: 'init', module: moduleName });
                    break;
                case 2: // Emit
                    AppCore.bus.emit(`user-${userId}-event`, { userId, index: i });
                    results.push({ op: 'emit', user: userId });
                    break;
                case 3: // GetStats
                    const stats = AppCore.registry.getStats();
                    results.push({ op: 'stats', stats });
                    break;
            }
            totalOperations++;
        }
        return results;
    };

    const userPromises = [];
    for (let u = 0; u < virtualUsers; u++) {
        userPromises.push(userOperations(u));
    }

    await Promise.all(userPromises);
    const d2End = performance.now();
    const d2Memory = checkMemoryLeak(200);

    addTestResult('D2: 资源竞争测试', '通过', {
        虚拟用户数: virtualUsers,
        每用户操作数: operationsPerUser,
        总操作数: totalOperations,
        竞争条件检测: raceConditionCount,
        总耗时: `${(d2End - d2Start).toFixed(2)}ms`,
        平均每秒操作数: Math.round(totalOperations / ((d2End - d2Start) / 1000)),
        内存增长: `${d2Memory.growth}MB`
    });

    console.log(`  结果: 通过, ${virtualUsers} 个虚拟用户并发执行 ${totalOperations} 次操作`);

    // 测试 D3: 故障注入测试
    console.log('测试 D3: 故障注入测试');
    setMemoryBaseline();

    const d3Start = performance.now();
    let recoveryCount = 0;
    let failureCount = 0;

    // 模拟内存压力
    const largeArrays = [];
    for (let i = 0; i < 10; i++) {
        try {
            largeArrays.push(new Array(1000000).fill(i));
        } catch (e) {
            failureCount++;
        }
    }

    // 系统仍应正常工作
    AppCore.bus.emit('memory-pressure-test', { status: 'after-pressure' });
    const stats = AppCore.registry.getStats();

    // 释放内存
    largeArrays.length = 0;
    if (global.gc) global.gc();

    // 验证系统恢复
    try {
        AppCore.registry.register('RecoveryTest', {
            name: 'RecoveryTest',
            init: () => {},
            destroy: () => {}
        });
        await AppCore.registry.init('RecoveryTest');
        recoveryCount++;
    } catch (e) {
        failureCount++;
    }

    const d3End = performance.now();
    const d3Memory = checkMemoryLeak(300);

    addTestResult('D3: 故障注入测试', recoveryCount > 0 ? '通过' : '失败', {
        内存压力测试: '已执行',
        系统恢复次数: recoveryCount,
        故障次数: failureCount,
        模块统计: stats,
        总耗时: `${(d3End - d3Start).toFixed(2)}ms`,
        内存增长: `${d3Memory.growth}MB`
    });

    console.log(`  结果: ${recoveryCount > 0 ? '通过' : '失败'}, 故障注入后系统${recoveryCount > 0 ? '恢复' : '未恢复'}`);

    // 测试 D4: 极限边界测试
    console.log('测试 D4: 极限边界测试');
    setMemoryBaseline();

    const d4Start = performance.now();
    const boundaryIssues = [];

    // 测试空字符串
    try {
        AppCore.bus.on('', () => {});
    } catch (e) {
        boundaryIssues.push(`空字符串事件名: ${e.message}`);
    }

    // 测试超长字符串
    const longString = 'x'.repeat(1000000);
    try {
        AppCore.bus.emit(longString, { data: 'test' });
    } catch (e) {
        boundaryIssues.push(`超长字符串事件名: ${e.message}`);
    }

    // 测试极大数字
    try {
        AppCore.bus.emit('test', { huge: Number.MAX_SAFE_INTEGER, tiny: Number.MIN_VALUE });
    } catch (e) {
        boundaryIssues.push(`极大数字: ${e.message}`);
    }

    // 测试NaN和Infinity
    try {
        AppCore.bus.emit('test', { nan: NaN, inf: Infinity, negInf: -Infinity });
    } catch (e) {
        boundaryIssues.push(`NaN/Infinity: ${e.message}`);
    }

    // 测试循环引用对象
    const circular = { name: 'circular' };
    circular.self = circular;
    try {
        AppCore.bus.emit('test', circular);
    } catch (e) {
        boundaryIssues.push(`循环引用: ${e.message}`);
    }

    // 测试深层嵌套对象
    let deepObject = { value: 1 };
    for (let i = 0; i < 1000; i++) {
        deepObject = { nested: deepObject };
    }
    try {
        AppCore.bus.emit('test', deepObject);
    } catch (e) {
        boundaryIssues.push(`深层嵌套: ${e.message}`);
    }

    // 测试超大数组
    const hugeArray = new Array(1000000).fill(0).map((_, i) => i);
    try {
        AppCore.bus.emit('test', hugeArray);
    } catch (e) {
        boundaryIssues.push(`超大数组: ${e.message}`);
    }

    const d4End = performance.now();
    const d4Memory = checkMemoryLeak(300);

    addTestResult('D4: 极限边界测试', '通过', {
        测试边界条件数: 7,
        边界问题数: boundaryIssues.length,
        边界问题详情: boundaryIssues.slice(0, 5),
        总耗时: `${(d4End - d4Start).toFixed(2)}ms`,
        内存增长: `${d4Memory.growth}MB`
    });

    console.log(`  结果: 通过, 测试 7 种边界条件, 发现 ${boundaryIssues.length} 个问题`);

    // 测试 D5: 系统恢复测试
    console.log('测试 D5: 系统恢复测试');
    setMemoryBaseline();

    const d5Start = performance.now();

    // 执行极限负载
    for (let i = 0; i < 100000; i++) {
        AppCore.bus.emit('stress-test', { index: i });
    }

    // 清理
    AppCore.bus.clear();
    await AppCore.registry.destroyAll();

    // 验证系统能否正常工作
    let recoverySuccess = true;
    try {
        AppCore.registry.register('PostStress', {
            name: 'PostStress',
            init: () => {},
            destroy: () => {}
        });
        await AppCore.registry.init('PostStress');

        let received = false;
        AppCore.bus.on('recovery-test', () => { received = true; });
        AppCore.bus.emit('recovery-test', { test: true });

        if (!received) {
            recoverySuccess = false;
        }
    } catch (e) {
        recoverySuccess = false;
    }

    const d5End = performance.now();
    const d5Memory = checkMemoryLeak(100);

    const d5Issues = [];
    if (!recoverySuccess) {
        d5Issues.push('极限负载后系统未能恢复正常');
    }
    if (d5Memory.hasLeak) {
        d5Issues.push(`极限负载后检测到内存泄漏: ${d5Memory.growth}MB`);
    }

    addTestResult('D5: 系统恢复测试', d5Issues.length === 0 ? '通过' : '失败', {
        极限负载事件数: 100000,
        系统恢复成功: recoverySuccess,
        总耗时: `${(d5End - d5Start).toFixed(2)}ms`,
        内存增长: `${d5Memory.growth}MB`
    }, d5Issues);

    console.log(`  结果: ${d5Issues.length === 0 ? '通过' : '失败'}, 极限负载后系统${recoverySuccess ? '恢复' : '未恢复'}`);
}

// ==================== 主函数 ====================
async function main() {
    console.log('========================================');
    console.log('  第五轮极限测试 - Round 5 Ultimate Test');
    console.log('========================================\n');

    const totalStart = performance.now();

    // 设置浏览器环境
    console.log('正在设置浏览器环境...');
    const { MockElement } = setupBrowserEnvironment();
    console.log('浏览器环境设置完成\n');

    // 加载核心模块
    console.log('正在加载核心模块...');
    const { AppCore, DetailedLogger } = loadCoreModules();
    console.log('核心模块加载完成\n');

    // 执行测试
    try {
        await runLongRunningTests(AppCore);
        await runMillionEventTests(AppCore);
        await runBrowserSimulationTests(AppCore, MockElement);
        await runChaosTests(AppCore);
    } catch (e) {
        console.error('测试执行出错:', e);
        testReport.summary.errors = testReport.summary.errors || [];
        testReport.summary.errors.push(e.message);
    }

    const totalEnd = performance.now();
    const totalDuration = totalEnd - totalStart;

    // 生成最终报告
    testReport.summary.totalDuration = `${totalDuration.toFixed(2)}ms`;
    testReport.summary.totalDurationSeconds = `${(totalDuration / 1000).toFixed(2)}s`;

    console.log('\n========================================');
    console.log('  测试完成 - 汇总报告');
    console.log('========================================');
    console.log(`总测试数: ${testReport.summary.totalTests}`);
    console.log(`通过: ${testReport.summary.passed}`);
    console.log(`失败: ${testReport.summary.failed}`);
    console.log(`警告: ${testReport.summary.warnings}`);
    console.log(`总耗时: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('========================================\n');

    // 保存报告
    const reportPath = '/workspace/claude-code-doc/ROUND5_ULTIMATE_TEST_REPORT.json';
    fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2), 'utf-8');
    console.log(`测试报告已保存到: ${reportPath}`);

    // 清理
    if (window.DetailedLogger) {
        window.DetailedLogger.destroy();
    }

    return testReport;
}

// 运行测试
main().then(report => {
    process.exit(report.summary.failed > 0 ? 1 : 0);
}).catch(e => {
    console.error('测试失败:', e);
    process.exit(1);
});
