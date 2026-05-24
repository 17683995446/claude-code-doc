# Claude Code 文档系统 API 文档

## 版本信息
- **版本**: v9.0
- **更新日期**: 2026-05-17
- **文档状态**: Phase 1 & 2 已完成

---

## 目录
1. [Phase 1: 架构模块](#phase-1-架构模块)
2. [Phase 2: 功能创新模块](#phase-2-功能创新模块)
3. [核心模块](#核心模块)
4. [事件系统](#事件系统)
5. [最佳实践](#最佳实践)

---

## Phase 1: 架构模块

### ModuleSystem v2.0

统一模块管理系统，提供依赖注入、生命周期管理和懒加载功能。

#### 初始化
```javascript
// 自动初始化
// 或手动初始化
ModuleSystem.init();
```

#### API 方法

##### `register(name, definition, options)`
注册一个新模块。

**参数:**
- `name` (string): 模块唯一标识符
- `definition` (Object|Function): 模块定义（对象或类构造函数）
- `options` (Object): 可选配置
  - `dependencies` (string[]): 依赖模块列表
  - `lazy` (boolean): 是否懒加载
  - `singleton` (boolean): 是否单例

**示例:**
```javascript
// 注册对象模块
ModuleSystem.register('myModule', {
    init() {
        console.log('模块初始化');
        return this;
    },
    doSomething() {
        return 'done';
    }
});

// 注册类模块
class MyModule {
    constructor(config) {
        this.config = config;
    }
    init() {
        return this;
    }
}
ModuleSystem.register('myClassModule', MyModule, {
    dependencies: ['configModule'],
    singleton: true
});
```

##### `init(name)`
初始化指定模块及其依赖。

**参数:**
- `name` (string): 模块名称

**返回:** Promise<模块实例>

**示例:**
```javascript
const myModule = await ModuleSystem.init('myModule');
myModule.doSomething();
```

##### `lazyLoad(name, path)`
懒加载远程模块。

**参数:**
- `name` (string): 模块名称
- `path` (string): 脚本路径

**返回:** Promise<模块实例>

**示例:**
```javascript
const heavyModule = await ModuleSystem.lazyLoad('heavyModule', '/js/heavy-module.js');
```

##### `get(name)`
获取已初始化的模块实例。

**参数:**
- `name` (string): 模块名称

**返回:** 模块实例或 undefined

##### `has(name)`
检查模块是否已注册。

**参数:**
- `name` (string): 模块名称

**返回:** boolean

##### `destroy(name)`
销毁模块实例。

**参数:**
- `name` (string): 模块名称

---

### PerformanceMonitor

Core Web Vitals 性能监控模块。

#### 初始化
```javascript
PerformanceMonitor.init({
    samplingRate: 1.0,
    reportThreshold: 3000,
    longTaskThreshold: 50
});
```

#### API 方法

##### `getCoreWebVitals()`
获取当前 Core Web Vitals 指标。

**返回:**
```javascript
{
    LCP: number | null,  // Largest Contentful Paint
    FID: number | null,  // First Input Delay
    CLS: number,         // Cumulative Layout Shift
    FCP: number | null,  // First Contentful Paint
    TTFB: number | null  // Time to First Byte
}
```

##### `getMetrics()`
获取所有性能指标。

**返回:**
```javascript
{
    navigation: Object,
    resources: Array,
    interactions: Array,
    longTasks: Array,
    memory: Array,
    paint: Object,
    layout: Array
}
```

##### `getRecommendations()`
获取性能优化建议。

**返回:** Array<string>

##### `exportReport()`
导出性能报告。

**返回:** Object

---

### VirtualScroll

虚拟滚动模块，优化长文档渲染性能。

#### 初始化
```javascript
VirtualScroll.init({
    itemHeight: 50,
    bufferSize: 5,
    containerSelector: '.main-content',
    contentSelector: '.content'
});
```

#### API 方法

##### `scrollToSection(sectionId)`
滚动到指定章节。

**参数:**
- `sectionId` (string): 章节 ID

##### `getVisibleSections()`
获取当前可见章节。

**返回:** Array<string>

##### `refresh()`
刷新虚拟滚动计算。

##### `destroy()`
销毁虚拟滚动实例。

---

## Phase 2: 功能创新模块

### AdvancedSearch

全文搜索模块，基于 Fuse.js 实现模糊搜索。

#### 初始化
```javascript
AdvancedSearch.init({
    searchDelay: 150,
    minQueryLength: 2,
    maxResults: 50,
    highlightMatches: true
});
```

#### API 方法

##### `search(query)`
执行搜索。

**参数:**
- `query` (string): 搜索关键词

**返回:** Array<搜索结果>

```javascript
[
    {
        item: { title, content, anchor },
        score: number,
        matches: Array
    }
]
```

##### `open()`
打开搜索面板。

##### `close()`
关闭搜索面板。

##### `toggle()`
切换搜索面板状态。

##### `addToIndex(document)`
添加文档到索引。

**参数:**
- `document` (Object): 文档对象

##### `rebuildIndex()`
重建搜索索引。

---

### CollaborationModule

协作功能模块，支持评论和阅读进度。

#### 初始化
```javascript
CollaborationModule.init({
    storageKey: 'claude_doc_collab',
    maxCommentsPerSection: 50,
    syncInterval: 30000
});
```

#### API 方法

##### `setUser(userId, userName)`
设置当前用户。

**参数:**
- `userId` (string): 用户 ID
- `userName` (string): 用户名称

##### `addComment(sectionId, content)`
添加评论。

**参数:**
- `sectionId` (string): 章节 ID
- `content` (string): 评论内容

**返回:** Object (评论对象)

##### `deleteComment(commentId)`
删除评论。

**参数:**
- `commentId` (string): 评论 ID

##### `getComments(sectionId)`
获取章节评论。

**参数:**
- `sectionId` (string): 章节 ID

**返回:** Array<评论对象>

##### `getReadingProgress()`
获取阅读进度。

**返回:**
```javascript
{
    sectionId: {
        timestamp: number,
        percent: number
    }
}
```

##### `exportData()`
导出协作数据。

**返回:** Object

##### `importData(data)`
导入协作数据。

**参数:**
- `data` (Object): 导出的数据

---

### MermaidSupport

Mermaid 图表渲染模块。

#### 初始化
```javascript
MermaidSupport.init({
    theme: 'default',
    autoRender: true,
    zoom: true,
    exportFormats: ['svg', 'png', 'pdf']
});
```

#### API 方法

##### `render(id)`
渲染指定图表。

**参数:**
- `id` (string): 图表 ID

##### `renderAll()`
重新渲染所有图表。

##### `setTheme(themeName)`
设置图表主题。

**参数:**
- `themeName` (string): 主题名称 ('default' | 'dark' | 'forest' | 'neutral')

##### `getDiagrams()`
获取所有图表列表。

**返回:** Array<{id, type, rendered}>

##### `exportData()`
导出图表数据。

**返回:** Object

---

### MathRenderer

数学公式渲染模块，基于 KaTeX。

#### 初始化
```javascript
MathRenderer.init({
    delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
    ],
    throwOnError: false,
    copyButton: true,
    editButton: true
});
```

#### API 方法

##### `render(id)`
渲染指定公式。

**参数:**
- `id` (string): 公式 ID

##### `renderAll()`
重新渲染所有公式。

##### `renderInElement(element)`
渲染指定元素内的公式。

**参数:**
- `element` (HTMLElement): DOM 元素

##### `addMacro(name, expansion)`
添加自定义宏。

**参数:**
- `name` (string): 宏名称
- `expansion` (string): 展开内容

##### `getFormulas()`
获取所有公式列表。

**返回:** Array<{id, code, display, rendered}>

##### `getStats()`
获取渲染统计。

**返回:**
```javascript
{
    total: number,
    rendered: number,
    errors: number
}
```

##### `exportFormulas()`
导出所有公式。

**返回:** Array<Object>

---

### PWAManager

PWA 管理模块，处理 Service Worker 和安装提示。

#### 初始化
```javascript
PWAManager.init({
    swPath: '/sw.js',
    updateInterval: 60 * 60 * 1000, // 1小时
    promptOnUpdate: true,
    showInstallPrompt: true
});
```

#### API 方法

##### `checkUpdate()`
检查 Service Worker 更新。

**返回:** Promise<boolean> (是否有更新)

##### `promptInstall()`
触发 PWA 安装提示。

**返回:** Promise<void>

##### `getStatus()`
获取 PWA 状态。

**返回:**
```javascript
{
    isOnline: boolean,
    isInstalled: boolean,
    updateAvailable: boolean,
    swRegistered: boolean
}
```

##### `getCacheInfo()`
获取缓存信息。

**返回:** Promise<Object>

##### `clearCache()`
清除所有缓存。

**返回:** Promise<boolean>

##### `unregister()`
注销 Service Worker。

**返回:** Promise<boolean>

---

## 核心模块

### AppCore

应用核心模块，提供事件总线和日志功能。

#### 属性

##### `bus`
事件总线。

**方法:**
- `on(event, callback)` - 监听事件
- `off(event, callback)` - 取消监听
- `emit(event, data)` - 触发事件
- `once(event, callback)` - 一次性监听

##### `logger`
日志记录器。

**方法:**
- `debug(module, message)`
- `info(module, message)`
- `warn(module, message)`
- `error(module, message)`

**示例:**
```javascript
// 事件监听
AppCore.bus.on('app:ready', (data) => {
    console.log('应用就绪，耗时:', data.duration);
});

// 触发事件
AppCore.bus.emit('custom:event', { foo: 'bar' });

// 日志记录
AppCore.logger.info('MyModule', '初始化完成');
```

---

## 事件系统

### 全局事件

#### `app:ready`
应用初始化完成时触发。

**数据:**
```javascript
{
    duration: number // 初始化耗时(ms)
}
```

#### `pwa:init`
PWA 管理器初始化完成。

**数据:**
```javascript
{
    isInstalled: boolean,
    isOnline: boolean
}
```

#### `pwa:updateAvailable`
有新版本可用时触发。

#### `pwa:installed`
应用已安装时触发。

#### `pwa:online` / `pwa:offline`
网络状态变化时触发。

#### `math:render`
公式渲染完成时触发。

**数据:**
```javascript
{
    id: string,
    display: boolean
}
```

#### `mermaid:render`
图表渲染完成时触发。

**数据:**
```javascript
{
    id: string,
    type: string
}
```

---

## 最佳实践

### 模块开发规范

1. **使用 ModuleSystem 注册模块**
```javascript
ModuleSystem.register('myModule', {
    init() {
        // 初始化逻辑
        return this;
    },
    // 其他方法
});
```

2. **处理依赖关系**
```javascript
ModuleSystem.register('dependentModule', MyModule, {
    dependencies: ['configModule', 'utilsModule']
});
```

3. **错误处理**
```javascript
try {
    await ModuleSystem.init('myModule');
} catch (err) {
    AppCore.logger.error('MyModule', '初始化失败:', err);
}
```

### 性能优化建议

1. **懒加载非关键模块**
```javascript
// 在需要时加载
button.addEventListener('click', async () => {
    const module = await ModuleSystem.lazyLoad('heavyModule', '/js/heavy.js');
    module.run();
});
```

2. **监控性能指标**
```javascript
const vitals = PerformanceMonitor.getCoreWebVitals();
if (vitals.LCP > 2500) {
    console.warn('LCP 超过阈值，需要优化');
}
```

3. **使用虚拟滚动处理长列表**
```javascript
VirtualScroll.init({
    itemHeight: 50,
    bufferSize: 5
});
```

### 可访问性要求

1. **所有交互元素必须有标签**
```html
<!-- 好的示例 -->
<button aria-label="关闭">×</button>

<!-- 不好的示例 -->
<button>×</button>
```

2. **支持键盘导航**
```javascript
element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        // 处理激活
    }
});
```

---

## 更新日志

### v9.0 (2026-05-17)
- ✅ Phase 1: 架构重构完成
- ✅ Phase 2: 功能创新完成
- ✅ 新增 ModuleSystem v2.0
- ✅ 新增 PerformanceMonitor
- ✅ 新增 VirtualScroll
- ✅ 新增 AdvancedSearch
- ✅ 新增 CollaborationModule
- ✅ 新增 MermaidSupport
- ✅ 新增 MathRenderer
- ✅ 新增 PWAManager
- ✅ 新增 ComprehensiveTest 测试套件

### v8.0 (2025-01-15)
- 基础架构搭建
- 国际化支持
- 主题系统
- 基础测试覆盖

---

## 支持与反馈

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件
- 参与社区讨论
