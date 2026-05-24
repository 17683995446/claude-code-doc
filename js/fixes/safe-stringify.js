
/**
 * 安全字符串转换模块
 * 修复Bug #1: 异常输入处理缺陷
 */

const SafeStringify = {
    /**
     * 安全地将任何值转换为字符串
     * @param {*} value - 要转换的值
     * @returns {string} - 转换后的字符串
     */
    stringify(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        
        try {
            // 首先尝试标准字符串转换
            return String(value);
        } catch (e) {
            try {
                // 如果失败，尝试 JSON 序列化
                return JSON.stringify(value);
            } catch (e2) {
                // 如果 JSON 序列化也失败（如循环引用），返回类型信息
                return '[object ' + Object.prototype.toString.call(value).slice(8, -1) + ']';
            }
        }
    },
    
    /**
     * 安全地序列化为JSON
     * @param {*} value - 要序列化的值
     * @param {number} maxDepth - 最大深度
     * @returns {string} - JSON字符串
     */
    toJSON(value, maxDepth = 10) {
        const seen = new WeakSet();
        
        return JSON.stringify(value, (key, val) => {
            if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) {
                    return '[Circular Reference]';
                }
                seen.add(val);
            }
            return val;
        });
    }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeStringify;
}
