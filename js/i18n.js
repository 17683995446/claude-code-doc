/**
 * Claude Code Architecture Documentation - 国际化 i18n 系统
 * 支持中英文切换，使用 data-i18n 属性标记翻译元素
 *
 * @version 1.0.0
 * @author Claude Code Architecture Team
 */

// ==================== 语言包 ====================
/**
 * 多语言翻译数据
 * key 格式: '分类.名称'
 */
const locales = {
    'zh-CN': {
        // 导航
        'nav.overview': '全局概览',
        'nav.loop': '核心循环',
        'nav.tools': '工具系统',
        'nav.context': '上下文管理',
        'nav.subagent': '子代理架构',
        'nav.permissions': '权限安全',
        'nav.plugins': '插件生态',
        'nav.dataflow': '数据流图',
        'nav.lifecycle': '会话生命周期',
        'nav.directory': '目录结构',
        'nav.techstack': '技术栈',
        'nav.hidden': '隐藏功能',
        'nav.comparison': '竞品对比',
        'nav.philosophy': '设计哲学',

        // 搜索
        'search.placeholder': '搜索文档...',
        'search.noResults': '没有找到结果',
        'search.history': '搜索历史',
        'search.resultCount': '找到 {count} 个结果',

        // 主题
        'theme.dark': '暗色',
        'theme.light': '亮色',
        'theme.auto': '跟随系统',

        // 分享
        'share.title': '分享',
        'share.copy': '复制链接',
        'share.twitter': '分享到 Twitter',
        'share.linkedin': '分享到 LinkedIn',

        // 语言切换
        'i18n.title': '语言',

        // 架构探索器
        'explorer.title': '交互式架构探索器',
        'explorer.open': '探索架构',
        'explorer.reset': '重置视图',
        'explorer.search': '搜索组件...',
        'explorer.close': '关闭',

        // 数据面板
        'nav.dashboard': '数据面板',
        'dashboard.title': '数据可视化仪表盘',
        'dashboard.overview': '概览',
        'dashboard.performance': '性能',
        'dashboard.modules': '模块',
        'dashboard.close': '关闭',

        // 版本日志
        'versionLog.title': '更新日志',

        // 目录
        'toc.title': '目录',

        // 通用
        'backToTop': '返回顶部',
        'print': '导出 PDF',
        'test.run': '运行测试',
        'welcome': '⌘K 搜索 | 🌙 主题 | 📑 目录 | F6 切换焦点',
        'offline': '当前处于离线模式',
        'online': '网络已恢复',

        // 笔记与书签
        'nav.notes': '笔记',
        'notes.title': '笔记与书签',
        'notes.tab.notes': '注释',
        'notes.tab.bookmarks': '书签',
        'notes.add': '添加注释',
        'notes.placeholder': '在此输入注释...',
        'notes.save': '保存',
        'notes.cancel': '取消',
        'notes.delete': '删除',
        'notes.edit': '编辑',
        'notes.empty': '暂无注释',
        'notes.bookmark.empty': '暂无书签',
        'notes.export': '导出',
        'notes.import': '导入',
        'notes.clear': '清空所有',
        'notes.clear.confirm': '确定清空所有注释和书签？',
        'notes.jump': '跳转',
        'notes.count': '{count} 条注释',
        'notes.bookmark.add': '添加书签',
        'notes.bookmark.remove': '移除书签'
    },
    'en': {
        // 导航
        'nav.overview': 'Overview',
        'nav.loop': 'Master Loop',
        'nav.tools': 'Tool System',
        'nav.context': 'Context Mgmt',
        'nav.subagent': 'Sub-Agents',
        'nav.permissions': 'Permissions',
        'nav.plugins': 'Plugins',
        'nav.dataflow': 'Data Flow',
        'nav.lifecycle': 'Lifecycle',
        'nav.directory': 'Directory',
        'nav.techstack': 'Tech Stack',
        'nav.hidden': 'Hidden Features',
        'nav.comparison': 'Comparison',
        'nav.philosophy': 'Philosophy',

        // 搜索
        'search.placeholder': 'Search docs...',
        'search.noResults': 'No results found',
        'search.history': 'Search History',
        'search.resultCount': '{count} results found',

        // 主题
        'theme.dark': 'Dark',
        'theme.light': 'Light',
        'theme.auto': 'System',

        // 分享
        'share.title': 'Share',
        'share.copy': 'Copy Link',
        'share.twitter': 'Share on Twitter',
        'share.linkedin': 'Share on LinkedIn',

        // 语言切换
        'i18n.title': 'Language',

        // 架构探索器
        'explorer.title': 'Architecture Explorer',
        'explorer.open': 'Explore',
        'explorer.reset': 'Reset View',
        'explorer.search': 'Search components...',
        'explorer.close': 'Close',

        // 数据面板
        'nav.dashboard': 'Dashboard',
        'dashboard.title': 'Data Visualization Dashboard',
        'dashboard.overview': 'Overview',
        'dashboard.performance': 'Performance',
        'dashboard.modules': 'Modules',
        'dashboard.close': 'Close',

        // 版本日志
        'versionLog.title': 'Changelog',

        // 目录
        'toc.title': 'TOC',

        // 通用
        'backToTop': 'Back to Top',
        'print': 'Export PDF',
        'test.run': 'Run Tests',
        'welcome': '⌘K Search | 🌙 Theme | 📑 TOC | F6 Focus',
        'offline': 'You are offline',
        'online': 'Connection restored',

        // Notes & Bookmarks
        'nav.notes': 'Notes',
        'notes.title': 'Notes & Bookmarks',
        'notes.tab.notes': 'Notes',
        'notes.tab.bookmarks': 'Bookmarks',
        'notes.add': 'Add Note',
        'notes.placeholder': 'Enter your note...',
        'notes.save': 'Save',
        'notes.cancel': 'Cancel',
        'notes.delete': 'Delete',
        'notes.edit': 'Edit',
        'notes.empty': 'No notes yet',
        'notes.bookmark.empty': 'No bookmarks yet',
        'notes.export': 'Export',
        'notes.import': 'Import',
        'notes.clear': 'Clear All',
        'notes.clear.confirm': 'Clear all notes and bookmarks?',
        'notes.jump': 'Jump',
        'notes.count': '{count} notes',
        'notes.bookmark.add': 'Add Bookmark',
        'notes.bookmark.remove': 'Remove Bookmark'
    }
};

// ==================== I18nModule ====================
/**
 * 国际化模块
 * 管理语言切换、翻译文本替换、语言偏好持久化
 */
const I18nModule = {
    // 支持的语言列表
    _supportedLangs: ['zh-CN', 'en'],

    // 当前语言
    _currentLang: 'zh-CN',

    // 默认语言
    _defaultLang: 'zh-CN',

    // localStorage 存储键
    _storageKey: 'claude-code-doc-lang',

    // 暴露语言包供测试使用
    locales: locales,

    /**
     * 初始化国际化模块
     * 从 localStorage 读取用户语言偏好
     */
    init() {
        // 防止重复初始化
        if (this._initialized) return this;
        this._initialized = true;

        // 从 localStorage 恢复语言偏好
        const savedLang = localStorage.getItem(this._storageKey);
        if (savedLang && this._supportedLangs.includes(savedLang)) {
            this._currentLang = savedLang;
        } else {
            // 尝试检测浏览器语言
            const browserLang = navigator.language || navigator.userLanguage || '';
            if (browserLang.startsWith('zh')) {
                this._currentLang = 'zh-CN';
            } else {
                this._currentLang = 'en';
            }
        }

        // 更新 HTML lang 属性
        document.documentElement.lang = this._currentLang === 'zh-CN' ? 'zh-CN' : 'en';

        // 应用当前语言（在 DOM 准备好后）
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createLangSwitch();
                this.apply();
            });
        } else {
            // DOM 已准备好
            this.createLangSwitch();
            this.apply();
        }

        if (window.AppCore) {
            window.AppCore.logger.info('I18n', `国际化模块初始化完成，当前语言: ${this._currentLang}`);
        }

        return this;
    },

    // 初始化标志
    _initialized: false,
    // 事件监听器追踪
    _boundEvents: [],

    /**
     * 创建语言切换按钮（在侧边栏底部）
     */
    createLangSwitch() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return this;

        // 创建语言切换区域
        const langSection = document.createElement('div');
        langSection.className = 'sidebar-section';
        langSection.id = 'lang-switch-section';
        langSection.innerHTML = `
            <div class="sidebar-section-title" data-i18n="i18n.title">语言</div>
            <ul class="sidebar-nav">
                <li class="lang-switch-wrapper">
                    <button class="lang-switch" id="lang-switch-btn" title="Switch Language">
                        🌐 <span id="lang-switch-label">${this._getLangLabel(this._currentLang)}</span>
                    </button>
                    <div class="lang-menu" id="lang-menu">
                        <button class="lang-menu-item ${this._currentLang === 'zh-CN' ? 'active' : ''}" data-lang="zh-CN">
                            🇨🇳 中文
                        </button>
                        <button class="lang-menu-item ${this._currentLang === 'en' ? 'active' : ''}" data-lang="en">
                            🇺🇸 English
                        </button>
                    </div>
                </li>
            </ul>
        `;

        // 插入到侧边栏底部（在最后一个 sidebar-section 之后）
        const lastSection = sidebar.querySelector('.sidebar-section:last-of-type');
        if (lastSection) {
            lastSection.parentNode.insertBefore(langSection, lastSection.nextSibling);
        } else {
            sidebar.appendChild(langSection);
        }

        // 绑定事件
        const switchBtn = document.getElementById('lang-switch-btn');
        const langMenu = document.getElementById('lang-menu');

        if (!switchBtn || !langMenu) {
            console.warn('[I18n] 语言切换按钮未找到，跳过事件绑定');
            return this;
        }

        // 点击切换按钮显示/隐藏菜单
        const switchHandler = (e) => {
            e.stopPropagation();
            langMenu.classList.toggle('open');
        };
        switchBtn.addEventListener('click', switchHandler);
        this._boundEvents.push({ el: switchBtn, event: 'click', handler: switchHandler });

        // 点击菜单项切换语言
        langMenu.querySelectorAll('.lang-menu-item').forEach(item => {
            const itemHandler = (e) => {
                e.stopPropagation();
                const lang = item.dataset.lang;
                this.setLang(lang);
                langMenu.classList.remove('open');
            };
            item.addEventListener('click', itemHandler);
            this._boundEvents.push({ el: item, event: 'click', handler: itemHandler });
        });

        // 点击外部关闭菜单
        const closeMenuHandler = () => {
            langMenu.classList.remove('open');
        };
        document.addEventListener('click', closeMenuHandler);
        this._boundEvents.push({ el: document, event: 'click', handler: closeMenuHandler });

        return this;
    },

    /**
     * 获取语言显示标签
     * @param {string} lang - 语言代码
     * @returns {string} 显示标签
     */
    _getLangLabel(lang) {
        const labels = {
            'zh-CN': '中文',
            'en': 'EN'
        };
        return labels[lang] || lang;
    },

    /**
     * 获取当前语言
     * @returns {string} 当前语言代码
     */
    getCurrentLang() {
        return this._currentLang;
    },

    /**
     * 切换语言
     * @param {string} lang - 目标语言代码
     */
    setLang(lang) {
        if (!this._supportedLangs.includes(lang)) {
            console.warn(`[I18n] 不支持的语言: ${lang}`);
            return this;
        }

        const prevLang = this._currentLang;
        this._currentLang = lang;

        // 保存到 localStorage
        localStorage.setItem(this._storageKey, lang);

        // 更新 HTML lang 属性
        document.documentElement.lang = lang === 'zh-CN' ? 'zh-CN' : 'en';

        // 应用翻译
        this.apply();

        // 更新语言切换按钮标签
        const label = document.getElementById('lang-switch-label');
        if (label) {
            label.textContent = this._getLangLabel(lang);
        }

        // 更新菜单项激活状态
        document.querySelectorAll('.lang-menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.lang === lang);
        });

        // 发布语言切换事件
        if (window.AppCore) {
            window.AppCore.bus.emit('i18n:changed', { lang, prevLang });
        }

        // 添加翻译过渡动画
        document.body.classList.add('i18n-transitioning');
        setTimeout(() => {
            document.body.classList.remove('i18n-transitioning');
        }, 400);

        if (window.AppCore) {
            window.AppCore.logger.info('I18n', `语言已切换: ${prevLang} -> ${lang}`);
        }

        return this;
    },

    /**
     * 获取翻译文本
     * @param {string} key - 翻译键
     * @param {Object} [params] - 插值参数，如 { count: 5 }
     * @returns {string} 翻译后的文本
     */
    t(key, params = {}) {
        const lang = this._currentLang;
        const langPack = locales[lang] || locales[this._defaultLang];
        const defaultPack = locales[this._defaultLang];
        // 使用 !== undefined 而非 || 以支持空字符串作为合法翻译值
        let text = langPack[key] !== undefined
            ? langPack[key]
            : (defaultPack[key] !== undefined ? defaultPack[key] : key);

        // 参数插值
        Object.entries(params).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, v);
        });

        return text;
    },

    /**
     * 应用翻译到所有标记元素
     */
    apply() {
        // 更新 HTML lang 属性
        document.documentElement.lang = this._currentLang === 'zh-CN' ? 'zh-CN' : 'en';

        // 翻译 data-i18n 标记的元素
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translated = this.t(key);
            // 使用 !== key 判断是否有实际翻译（支持空字符串翻译）
            if (translated !== key) {
                el.textContent = translated;
            }
        });

        // 翻译 data-i18n-placeholder 标记的元素
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translated = this.t(key);
            if (translated !== key) {
                el.placeholder = translated;
            }
        });

        // 翻译 data-i18n-title 标记的元素
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translated = this.t(key);
            if (translated !== key) {
                el.title = translated;
            }
        });

        // 翻译 data-i18n-aria 标记的元素
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const translated = this.t(key);
            if (translated !== key) {
                el.setAttribute('aria-label', translated);
            }
        });

        return this;
    },

    /**
     * 获取支持的语言列表
     * @returns {string[]} 支持的语言代码列表
     */
    getSupportedLangs() {
        return [...this._supportedLangs];
    },

    /**
     * 销毁模块
     */
    destroy() {
        // 清理所有事件监听器
        if (this._boundEvents) {
            this._boundEvents.forEach(({ el, event, handler }) => {
                el.removeEventListener(event, handler);
            });
            this._boundEvents = [];
        }

        const langSection = document.getElementById('lang-switch-section');
        if (langSection) {
            langSection.remove();
        }

        // 重置初始化标志，允许重新初始化
        this._initialized = false;

        if (window.AppCore) {
            window.AppCore.logger.info('I18n', '国际化模块已销毁');
        }
    }
};

// ==================== 全局暴露 ====================
window.I18nModule = I18nModule;

// 导出（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18nModule, locales };
}
