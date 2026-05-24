
/**
 * 对象池模块
 * 修复Bug #2: 内存管理问题
 */

class ObjectPool {
    constructor(factory, resetFn, size = 100) {
        this._factory = factory;
        this._resetFn = resetFn;
        this._pool = [];
        this._size = size;
        this._created = 0;
        this._acquired = 0;
        this._released = 0;
        
        // 预创建对象
        this._prewarm(size / 2);
    }
    
    _prewarm(count) {
        for (let i = 0; i < count; i++) {
            this._pool.push(this._factory());
            this._created++;
        }
    }
    
    acquire() {
        this._acquired++;
        if (this._pool.length > 0) {
            return this._pool.pop();
        }
        this._created++;
        return this._factory();
    }
    
    release(obj) {
        this._released++;
        if (this._pool.length < this._size && obj !== null) {
            this._resetFn(obj);
            this._pool.push(obj);
        }
    }
    
    getStats() {
        return {
            available: this._pool.length,
            created: this._created,
            acquired: this._acquired,
            released: this._released,
            utilization: this._created > 0 
                ? ((this._acquired - this._released) / this._created * 100).toFixed(1) + '%'
                : '0%'
        };
    }
    
    clear() {
        this._pool.length = 0;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ObjectPool;
}
