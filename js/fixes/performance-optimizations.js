
/**
 * 性能优化补丁 - Performance Patch
 * 解决事件风暴和内存管理问题
 */

// 1. 事件批处理优化
class OptimizedEventBus extends EventBus {
    constructor() {
        super();
        this._batchQueue = [];
        this._batchTimer = null;
        this._batchSize = 100;
        this._batchInterval = 16; // ~60fps
    }
    
    emit(event, data) {
        // 高频事件批处理
        if (this._shouldBatch(event)) {
            this._batchQueue.push({ event, data });
            this._scheduleBatch();
            return;
        }
        
        // 普通事件直接处理
        super.emit(event, data);
    }
    
    _shouldBatch(event) {
        // 对高频事件进行批处理
        const highFreqEvents = ['scroll', 'resize', 'mousemove', 'state:scrollPosition'];
        return highFreqEvents.includes(event);
    }
    
    _scheduleBatch() {
        if (this._batchTimer) return;
        
        this._batchTimer = setTimeout(() => {
            this._flushBatch();
        }, this._batchInterval);
    }
    
    _flushBatch() {
        if (this._batchQueue.length === 0) return;
        
        // 合并相同事件
        const batched = new Map();
        for (const item of this._batchQueue) {
            if (!batched.has(item.event)) {
                batched.set(item.event, []);
            }
            batched.get(item.event).push(item.data);
        }
        
        // 批量触发
        for (const [event, dataArray] of batched) {
            const listeners = this._listeners.get(event);
            if (listeners) {
                listeners.forEach(listener => {
                    try {
                        // 传递数组形式的批量数据
                        listener(dataArray);
                    } catch (e) {
                        console.error('[EventBus] 批处理事件错误:', e);
                    }
                });
            }
        }
        
        this._batchQueue = [];
        this._batchTimer = null;
    }
}

// 2. 对象池实现
class ObjectPool {
    constructor(factory, resetFn, size = 100) {
        this._factory = factory;
        this._resetFn = resetFn;
        this._pool = [];
        this._size = size;
        this._created = 0;
        
        // 预创建
        for (let i = 0; i < size / 2; i++) {
            this._pool.push(this._factory());
            this._created++;
        }
    }
    
    acquire() {
        if (this._pool.length > 0) {
            return this._pool.pop();
        }
        this._created++;
        return this._factory();
    }
    
    release(obj) {
        if (this._pool.length < this._size && obj !== null) {
            this._resetFn(obj);
            this._pool.push(obj);
        }
    }
    
    getStats() {
        return {
            available: this._pool.length,
            created: this._created,
            utilization: ((this._created - this._pool.length) / this._created * 100).toFixed(1) + '%'
        };
    }
}

// 3. 动态状态注册
class DynamicState {
    constructor() {
        this._state = {};
        this._registeredKeys = new Set();
        this._forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
    }
    
    registerKey(key, defaultValue) {
        if (this._forbiddenKeys.includes(key)) {
            throw new Error(`禁止注册危险键: ${key}`);
        }
        this._registeredKeys.add(key);
        this._state[key] = defaultValue;
    }
    
    set(key, value) {
        if (!this._registeredKeys.has(key)) {
            console.warn(`[State] 未注册的状态键: ${key}`);
        }
        if (this._forbiddenKeys.includes(key)) {
            console.warn(`[State] 拒绝设置危险键: ${key}`);
            return;
        }
        const oldValue = this._state[key];
        this._state[key] = value;
        this._notifyChange(key, oldValue, value);
    }
    
    _notifyChange(key, oldValue, newValue) {
        // 通知监听器
        if (window.AppCore && window.AppCore.bus) {
            window.AppCore.bus.emit(`state:${key}`, { oldValue, newValue });
        }
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OptimizedEventBus, ObjectPool, DynamicState };
}
