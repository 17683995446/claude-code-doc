/**
 * 安全模块 - CSP、XSS防护、输入验证
 * @version 1.0.0
 */

const SecurityModule = {
    _config: {
        // CSP 策略配置
        csp: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "cdn.jsdelivr.net", "unpkg.com"],
            'style-src': ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            'img-src': ["'self'", "data:", "blob:", "https://*.githubusercontent.com", "https://*.github.com"],
            'font-src': ["'self'", "cdn.jsdelivr.net"],
            'connect-src': ["'self'"],
            'media-src': ["'self'"],
            'frame-src': ["'none'"],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'upgrade-insecure-requests': true
        },
        // 允许的 HTML 标签（用于富文本）
        allowedTags: ['b', 'i', 'em', 'strong', 'code', 'pre', 'br', 'p'],
        // 允许的属性
        allowedAttrs: []
    },

    /**
     * 初始化安全模块
     */
    init() {
        // CSP 必须在 HTML <head> 中静态声明，动态注入的 <meta> CSP 会被浏览器忽略
        // this._applyCSP(); // 已禁用：改用 index.html 中的静态 <meta> 标签
        this._setupXSSProtection();
        this._setupInputValidation();
        console.log('[Security] 安全模块已初始化');
    },

    /**
     * 应用 Content Security Policy
     * @private
     */
    _applyCSP() {
        const cspDirectives = Object.entries(this._config.csp)
            .map(([key, value]) => {
                if (value === true) return key;
                if (Array.isArray(value)) return `${key} ${value.join(' ')}`;
                return `${key} ${value}`;
            })
            .join('; ');

        // 创建 meta 标签添加 CSP
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = cspDirectives;
        document.head.appendChild(meta);

        console.log('[Security] CSP 已应用');
    },

    /**
     * 设置 XSS 防护
     * 注意：不再全局覆盖 Element.prototype.setAttribute 和 innerHTML，
     * 因为这会破坏所有第三方库（Fuse.js、Mermaid、Chart.js 等）的正常功能，
     * 并导致严重的性能下降。
     * 改为提供 sanitizeHTML / sanitizeText 工具方法供各模块主动调用。
     * @private
     */
    _setupXSSProtection() {
        // 不再修补 innerHTML / setAttribute 原型方法
        // this._patchInnerHTML(); // 已禁用：全局原型修补破坏性太大
        
        // 监控动态脚本注入
        this._monitorScriptInjection();
        
        // 添加 X-XSS-Protection 头（通过 meta 模拟）
        const meta = document.createElement('meta');
        meta.httpEquiv = 'X-XSS-Protection';
        meta.content = '1; mode=block';
        document.head.appendChild(meta);
    },

    /**
     * 修补 innerHTML 使用
     * @private
     */
    _patchInnerHTML() {
        // 保存原始方法
        const originalSetAttribute = Element.prototype.setAttribute;
        const dangerousAttrs = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'];

        Element.prototype.setAttribute = function(name, value) {
            // 阻止危险事件属性
            if (dangerousAttrs.includes(name.toLowerCase())) {
                console.warn(`[Security] 阻止危险属性: ${name}`);
                return;
            }
            return originalSetAttribute.call(this, name, value);
        };

        // 监控 innerHTML
        const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        Object.defineProperty(Element.prototype, 'innerHTML', {
            set: function(value) {
                const sanitized = SecurityModule.sanitizeHTML(value);
                return originalInnerHTML.set.call(this, sanitized);
            },
            get: function() {
                return originalInnerHTML.get.call(this);
            }
        });
    },

    /**
     * 监控脚本注入
     * @private
     */
    _monitorScriptInjection() {
        // 使用 MutationObserver 监控 DOM 变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查是否包含 script 标签
                        if (node.tagName === 'SCRIPT') {
                            const src = node.src || '';
                            const content = node.textContent || '';
                            
                            // 检查是否来自允许的来源
                            if (src && !this._isAllowedScriptSource(src)) {
                                console.warn('[Security] 阻止外部脚本:', src);
                                node.remove();
                            }
                            
                            // 检查内联脚本是否包含危险代码
                            if (content && this._containsDangerousCode(content)) {
                                console.warn('[Security] 阻止危险内联脚本');
                                node.remove();
                            }
                        }

                        // 检查危险属性
                        this._sanitizeElement(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    /**
     * 检查脚本来源是否允许
     * @private
     */
    _isAllowedScriptSource(src) {
        const allowedDomains = [
            'cdn.jsdelivr.net',
            'unpkg.com',
            'localhost',
            location.hostname
        ];
        
        try {
            const url = new URL(src);
            return allowedDomains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));
        } catch {
            return false;
        }
    },

    /**
     * 检查代码是否包含危险内容
     * @private
     */
    _containsDangerousCode(code) {
        const dangerousPatterns = [
            /eval\s*\(/i,
            /new\s+Function\s*\(/i,
            /document\.write/i,
            /innerHTML\s*=/i,
            /outerHTML\s*=/i
        ];
        
        return dangerousPatterns.some(pattern => pattern.test(code));
    },

    /**
     * 清理元素的危险属性
     * @private
     */
    _sanitizeElement(element) {
        // 仅检测事件处理器属性（以 on 开头）和 javascript: 协议
        const dangerousEventPrefix = /^on/i;
        
        Array.from(element.attributes || []).forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = (attr.value || '').toLowerCase();
            
            // 阻止事件处理器属性 (onclick, onerror, onload 等)
            if (dangerousEventPrefix.test(name)) {
                element.removeAttribute(attr.name);
                console.warn(`[Security] 移除危险事件属性: ${attr.name}`);
                return;
            }
            
            // 阻止 javascript: 协议
            if (value.trim().startsWith('javascript:')) {
                element.removeAttribute(attr.name);
                console.warn(`[Security] 移除 javascript: 协议属性: ${attr.name}`);
                return;
            }
        });

        // 递归处理子元素
        Array.from(element.children || []).forEach(child => {
            this._sanitizeElement(child);
        });
    },

    /**
     * 设置输入验证
     * @private
     */
    _setupInputValidation() {
        // 为所有输入元素添加验证
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea')) {
                this._validateInput(e.target);
            }
        }, true);

        // 表单提交验证
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (!this._validateForm(form)) {
                e.preventDefault();
                console.warn('[Security] 表单验证失败');
            }
        }, true);
    },

    /**
     * 验证输入
     * @param {HTMLInputElement} input - 输入元素
     */
    _validateInput(input) {
        const value = input.value;
        
        // 检查 XSS 尝试
        if (this._containsXSSAttempt(value)) {
            input.value = this.sanitizeText(value);
            console.warn('[Security] 检测到 XSS 尝试，已清理');
        }

        // 检查 SQL 注入尝试（简单检测）
        if (this._containsSQLInjection(value)) {
            input.value = this.sanitizeText(value);
            console.warn('[Security] 检测到 SQL 注入尝试，已清理');
        }
    },

    /**
     * 验证表单
     * @private
     */
    _validateForm(form) {
        const inputs = form.querySelectorAll('input, textarea');
        let isValid = true;

        inputs.forEach(input => {
            if (!this._validateInputElement(input)) {
                isValid = false;
            }
        });

        return isValid;
    },

    /**
     * 验证单个输入元素
     * @private
     */
    _validateInputElement(input) {
        const value = input.value;
        const maxLength = parseInt(input.getAttribute('maxlength')) || 1000;

        // 长度检查
        if (value.length > maxLength) {
            return false;
        }

        // 危险字符检查
        if (this._containsXSSAttempt(value) || this._containsSQLInjection(value)) {
            return false;
        }

        return true;
    },

    /**
     * 检查 XSS 尝试
     * @private
     */
    _containsXSSAttempt(value) {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi
        ];
        
        return xssPatterns.some(pattern => pattern.test(value));
    },

    /**
     * 检查 SQL 注入尝试
     * @private
     */
    _containsSQLInjection(value) {
        const sqlPatterns = [
            /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
            /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
            /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
            /((\%27)|(\'))union/i,
            /exec(\s|\+)+(s|x)p\w+/i,
            /UNION\s+SELECT/i,
            /INSERT\s+INTO/i,
            /DELETE\s+FROM/i,
            /DROP\s+TABLE/i
        ];
        
        return sqlPatterns.some(pattern => pattern.test(value));
    },

    // ==================== 公共 API ====================

    /**
     * 清理 HTML 内容
     * @param {string} html - 原始 HTML
     * @returns {string} 清理后的 HTML
     */
    sanitizeHTML(html) {
        if (!html || typeof html !== 'string') return '';

        const temp = document.createElement('div');
        temp.textContent = html; // 先转义
        
        let sanitized = temp.innerHTML;

        // 允许特定标签
        this._config.allowedTags.forEach(tag => {
            // 恢复允许的标签
            const escaped = sanitized
                .replace(new RegExp(`&lt;${tag}&gt;`, 'gi'), `<${tag}>`)
                .replace(new RegExp(`&lt;/${tag}&gt;`, 'gi'), `</${tag}>`);
            sanitized = escaped;
        });

        // 移除危险属性
        sanitized = sanitized.replace(/\s*on\w+\s*=\s*["']?[^"'>]*["']?/gi, '');
        sanitized = sanitized.replace(/javascript:/gi, '');

        return sanitized;
    },

    /**
     * 清理纯文本
     * @param {string} text - 原始文本
     * @returns {string} 清理后的文本
     */
    sanitizeText(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },

    /**
     * 验证并清理搜索输入
     * @param {string} query - 搜索查询
     * @returns {object} 验证结果
     */
    validateSearch(query) {
        if (!query || typeof query !== 'string') {
            return { valid: false, error: '无效输入', sanitized: '' };
        }

        const trimmed = query.trim();
        
        if (trimmed.length === 0) {
            return { valid: false, error: '不能为空', sanitized: '' };
        }

        if (trimmed.length > 100) {
            return { valid: false, error: '搜索内容过长', sanitized: '' };
        }

        if (this._containsXSSAttempt(trimmed)) {
            return { valid: false, error: '包含非法字符', sanitized: this.sanitizeText(trimmed) };
        }

        return { valid: true, sanitized: trimmed };
    },

    /**
     * 验证笔记内容
     * @param {string} content - 笔记内容
     * @returns {object} 验证结果
     */
    validateNote(content) {
        if (!content || typeof content !== 'string') {
            return { valid: false, error: '无效输入', sanitized: '' };
        }

        const trimmed = content.trim();
        
        if (trimmed.length === 0) {
            return { valid: false, error: '笔记不能为空', sanitized: '' };
        }

        if (trimmed.length > 5000) {
            return { valid: false, error: '笔记内容过长（最多5000字符）', sanitized: '' };
        }

        // 清理 HTML
        const sanitized = this.sanitizeHTML(trimmed);

        return { valid: true, sanitized };
    },

    /**
     * 生成安全随机数
     * @param {number} length - 长度
     * @returns {string} 随机字符串
     */
    generateToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },

    /**
     * 检查是否为安全 URL
     * @param {string} url - URL
     * @returns {boolean}
     */
    isSafeURL(url) {
        try {
            const parsed = new URL(url, window.location.origin);
            
            // 禁止 javascript: 协议
            if (parsed.protocol === 'javascript:') {
                return false;
            }

            // 禁止 data: 协议（除图片外）
            if (parsed.protocol === 'data:' && !url.startsWith('data:image/')) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }
};

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
    SecurityModule.init();
});

// 暴露到全局
window.SecurityModule = SecurityModule;
