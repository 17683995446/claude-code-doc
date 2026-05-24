/**
 * PWA管理模块 v1.0.0
 * 功能：Service Worker注册、安装提示、离线检测、更新管理
 * 特性：智能更新提示、安装引导、网络状态监控
 */

(function() {
    'use strict';

    // 防止重复声明
    if (typeof window.PWAManager !== 'undefined') {
        console.warn('[PWAManager] 模块已存在，跳过重复声明');
        return;
    }

    const PWAManager = {
        _config: {
            swPath: '/sw.js',
            scope: '/',
            updateInterval: 60 * 60 * 1000, // 1小时检查一次更新
            promptOnUpdate: true,
            autoUpdate: false,
            showInstallPrompt: true,
            installPromptDelay: 3000 // 3秒后显示安装提示
        },

        _state: {
            initialized: false,
            swRegistration: null,
            isOnline: navigator.onLine,
            isInstalled: false,
            installPrompt: null,
            updateAvailable: false,
            checkingUpdate: false,
            updateCheckTimer: null,
            _boundOnlineHandler: null,
            _boundOfflineHandler: null,
            _boundBeforeInstallHandler: null,
            _boundAppInstalledHandler: null,
            _boundControllerChangeHandler: null,
            _boundMessageHandler: null
        },

        /**
         * 初始化PWA管理器
         */
        async init(options = {}) {
            if (this._state.initialized) {
                console.log('[PWAManager] 已经初始化');
                return this;
            }

            // 检查浏览器支持
            if (!('serviceWorker' in navigator)) {
                console.warn('[PWAManager] 浏览器不支持Service Worker');
                return this;
            }

            console.log('[PWAManager] 开始初始化...');

            // 合并配置
            Object.assign(this._config, options);

            // 检查是否已安装
            this._checkInstalled();

            // 注册Service Worker
            await this._registerServiceWorker();

            // 监听安装提示
            this._listenInstallPrompt();

            // 监听网络状态
            this._monitorNetworkStatus();

            // 监听消息
            this._listenMessages();

            // 定期检查更新
            this._scheduleUpdateChecks();

            this._state.initialized = true;
            console.log('[PWAManager] 初始化完成');

            // 发送初始化事件
            this._emit('pwa:init', {
                isInstalled: this._state.isInstalled,
                isOnline: this._state.isOnline
            });

            return this;
        },

        /**
         * 检查应用是否已安装
         */
        _checkInstalled() {
            // 检查是否以standalone模式运行
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                                window.navigator.standalone === true;

            // 检查是否从主屏幕启动
            const isFromHomescreen = document.referrer.includes('android-app://');

            this._state.isInstalled = isStandalone || isFromHomescreen;

            console.log('[PWAManager] 安装状态:', this._state.isInstalled);
        },

        /**
         * 注册Service Worker
         */
        async _registerServiceWorker() {
            try {
                const registration = await navigator.serviceWorker.register(
                    this._config.swPath,
                    { scope: this._config.scope }
                );

                this._state.swRegistration = registration;
                console.log('[PWAManager] Service Worker注册成功:', registration.scope);

                // 监听Service Worker状态变化
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[PWAManager] 发现新版本Service Worker');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // 有新版本可用
                            this._onUpdateAvailable(newWorker);
                        }
                    });
                });

                // 检查当前状态
                if (registration.installing) {
                    console.log('[PWAManager] Service Worker正在安装');
                } else if (registration.waiting) {
                    console.log('[PWAManager] Service Worker等待激活');
                    this._onUpdateAvailable(registration.waiting);
                } else if (registration.active) {
                    console.log('[PWAManager] Service Worker已激活');
                }

                // 发送注册成功事件
                this._emit('pwa:registered', { registration });

            } catch (err) {
                console.error('[PWAManager] Service Worker注册失败:', err);
                this._emit('pwa:error', { error: err });
            }
        },

        /**
         * 监听安装提示
         */
        _listenInstallPrompt() {
            // 保存beforeinstallprompt事件
            this._state._boundBeforeInstallHandler = (e) => {
                console.log('[PWAManager] 捕获到安装提示事件');

                // 阻止默认提示
                e.preventDefault();

                // 保存事件
                this._state.installPrompt = e;

                // 发送事件
                this._emit('pwa:installable', { prompt: e });

                // 显示安装提示
                if (this._config.showInstallPrompt && !this._state.isInstalled) {
                    setTimeout(() => {
                        this._showInstallBanner();
                    }, this._config.installPromptDelay);
                }
            };
            window.addEventListener('beforeinstallprompt', this._state._boundBeforeInstallHandler);

            // 监听应用已安装事件
            this._state._boundAppInstalledHandler = () => {
                console.log('[PWAManager] 应用已安装');
                this._state.isInstalled = true;
                this._state.installPrompt = null;
                this._hideInstallBanner();
                this._emit('pwa:installed', {});
            };
            window.addEventListener('appinstalled', this._state._boundAppInstalledHandler);
        },

        /**
         * 显示安装横幅
         */
        _showInstallBanner() {
            if (this._state.isInstalled || !this._state.installPrompt) {
                return;
            }

            // 检查是否已经拒绝过
            const dismissed = localStorage.getItem('pwa-install-dismissed');
            if (dismissed) {
                const dismissedTime = parseInt(dismissed);
                const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

                // 7天内不再显示
                if (daysSinceDismissed < 7) {
                    return;
                }
            }

            // 创建安装横幅
            const banner = document.createElement('div');
            banner.id = 'pwa-install-banner';
            banner.className = 'pwa-install-banner';
            banner.innerHTML = `
                <div class="pwa-install-content">
                    <div class="pwa-install-icon">📱</div>
                    <div class="pwa-install-text">
                        <strong>安装 Claude Code文档</strong>
                        <span>添加到主屏幕，离线也能访问</span>
                    </div>
                    <div class="pwa-install-actions">
                        <button class="btn-install" data-action="install">安装</button>
                        <button class="btn-dismiss" data-action="dismiss">稍后</button>
                    </div>
                </div>
            `;

            document.body.appendChild(banner);

            // 添加样式
            this._addInstallBannerStyles();

            // 绑定事件
            banner.querySelector('[data-action="install"]').addEventListener('click', () => {
                this._promptInstall();
            });

            banner.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
                this._dismissInstallBanner();
            });

            // 动画显示
            requestAnimationFrame(() => {
                banner.classList.add('show');
            });

            this._emit('pwa:bannerShown', {});
        },

        /**
         * 添加安装横幅样式
         */
        _addInstallBannerStyles() {
            if (document.getElementById('pwa-install-styles')) {
                return;
            }

            const style = document.createElement('style');
            style.id = 'pwa-install-styles';
            style.textContent = `
                .pwa-install-banner {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 1rem;
                    z-index: 10000;
                    transform: translateY(100%);
                    transition: transform 0.3s ease;
                    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
                }

                .pwa-install-banner.show {
                    transform: translateY(0);
                }

                .pwa-install-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    max-width: 800px;
                    margin: 0 auto;
                }

                .pwa-install-icon {
                    font-size: 2rem;
                    flex-shrink: 0;
                }

                .pwa-install-text {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .pwa-install-text strong {
                    font-size: 1rem;
                    margin-bottom: 0.25rem;
                }

                .pwa-install-text span {
                    font-size: 0.875rem;
                    opacity: 0.9;
                }

                .pwa-install-actions {
                    display: flex;
                    gap: 0.5rem;
                    flex-shrink: 0;
                }

                .pwa-install-actions button {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-install {
                    background: white;
                    color: #667eea;
                    font-weight: 600;
                }

                .btn-install:hover {
                    background: #f0f0f0;
                }

                .btn-dismiss {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }

                .btn-dismiss:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                @media (max-width: 480px) {
                    .pwa-install-content {
                        flex-wrap: wrap;
                    }

                    .pwa-install-text {
                        flex: 1 1 calc(100% - 3rem);
                    }

                    .pwa-install-actions {
                        width: 100%;
                        justify-content: flex-end;
                        margin-top: 0.5rem;
                    }
                }
            `;

            document.head.appendChild(style);
        },

        /**
         * 触发安装提示
         */
        async _promptInstall() {
            const prompt = this._state.installPrompt;
            if (!prompt) {
                console.warn('[PWAManager] 没有可用的安装提示');
                return;
            }

            // 显示安装提示
            prompt.prompt();

            // 等待用户响应
            const result = await prompt.userChoice;

            if (result.outcome === 'accepted') {
                console.log('[PWAManager] 用户接受安装');
                this._emit('pwa:installAccepted', {});
            } else {
                console.log('[PWAManager] 用户拒绝安装');
                this._dismissInstallBanner();
                this._emit('pwa:installDismissed', {});
            }

            // 清除保存的提示
            this._state.installPrompt = null;
        },

        /**
         * 关闭安装横幅
         */
        _dismissInstallBanner() {
            const banner = document.getElementById('pwa-install-banner');
            if (banner) {
                banner.classList.remove('show');
                setTimeout(() => banner.remove(), 300);
            }

            // 记录关闭时间
            localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        },

        /**
         * 隐藏安装横幅
         */
        _hideInstallBanner() {
            this._dismissInstallBanner();
        },

        /**
         * 监听网络状态
         */
        _monitorNetworkStatus() {
            const updateOnlineStatus = () => {
                const wasOnline = this._state.isOnline;
                this._state.isOnline = navigator.onLine;

                if (wasOnline !== this._state.isOnline) {
                    console.log('[PWAManager] 网络状态变化:', this._state.isOnline ? '在线' : '离线');

                    this._emit(this._state.isOnline ? 'pwa:online' : 'pwa:offline', {});

                    // 显示状态提示
                    this._showNetworkStatus(this._state.isOnline);
                }
            };

            this._state._boundOnlineHandler = updateOnlineStatus;
            this._state._boundOfflineHandler = updateOnlineStatus;
            window.addEventListener('online', this._state._boundOnlineHandler);
            window.addEventListener('offline', this._state._boundOfflineHandler);

            // 初始状态
            updateOnlineStatus();
        },

        /**
         * 显示网络状态提示
         */
        _showNetworkStatus(isOnline) {
            // 移除旧的状态提示
            const existingToast = document.getElementById('pwa-network-toast');
            if (existingToast) {
                existingToast.remove();
            }

            const toast = document.createElement('div');
            toast.id = 'pwa-network-toast';
            toast.className = `pwa-network-toast ${isOnline ? 'online' : 'offline'}`;
            toast.innerHTML = `
                <span class="icon">${isOnline ? '✅' : '⚠️'}</span>
                <span class="text">${isOnline ? '已连接到网络' : '您已离线'}</span>
            `;

            document.body.appendChild(toast);

            // 添加样式
            if (!document.getElementById('pwa-network-toast-styles')) {
                const style = document.createElement('style');
                style.id = 'pwa-network-toast-styles';
                style.textContent = `
                    .pwa-network-toast {
                        position: fixed;
                        top: 1rem;
                        left: 50%;
                        transform: translateX(-50%) translateY(-100px);
                        padding: 0.75rem 1.5rem;
                        border-radius: 50px;
                        font-size: 0.875rem;
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        z-index: 10001;
                        transition: transform 0.3s ease;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }

                    .pwa-network-toast.online {
                        background: #10b981;
                        color: white;
                    }

                    .pwa-network-toast.offline {
                        background: #f59e0b;
                        color: white;
                    }

                    .pwa-network-toast.show {
                        transform: translateX(-50%) translateY(0);
                    }
                `;
                document.head.appendChild(style);
            }

            // 动画显示
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });

            // 自动隐藏
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        /**
         * 监听Service Worker消息
         */
        _listenMessages() {
            if (!navigator.serviceWorker) return;

            this._state._boundMessageHandler = (event) => {
                // 验证消息数据格式
                if (!event.data || typeof event.data !== 'object') {
                    console.warn('[PWAManager] 收到无效的 Service Worker 消息:', event.data);
                    return;
                }

                const { type, payload } = event.data;

                if (!type || typeof type !== 'string') {
                    console.warn('[PWAManager] 消息缺少有效的 type 字段:', event.data);
                    return;
                }

                console.log('[PWAManager] 收到Service Worker消息:', event.data);

                switch (type) {
                    case 'SW_UPDATED':
                        this._onUpdateAvailable(event.source || null);
                        break;
                    case 'SW_ERROR':
                        console.error('[PWAManager] Service Worker错误:', payload);
                        break;
                }
            };
            navigator.serviceWorker.addEventListener('message', this._state._boundMessageHandler);
        },

        /**
         * 更新可用回调
         */
        _onUpdateAvailable(worker) {
            if (this._state.updateAvailable) return;

            this._state.updateAvailable = true;
            console.log('[PWAManager] 有新版本可用');

            if (this._config.promptOnUpdate) {
                this._showUpdatePrompt(worker);
            } else if (this._config.autoUpdate) {
                this._applyUpdate(worker);
            }

            this._emit('pwa:updateAvailable', {});
        },

        /**
         * 显示更新提示
         */
        _showUpdatePrompt(worker) {
            // 移除旧提示
            const existingPrompt = document.getElementById('pwa-update-prompt');
            if (existingPrompt) {
                existingPrompt.remove();
            }

            const prompt = document.createElement('div');
            prompt.id = 'pwa-update-prompt';
            prompt.className = 'pwa-update-prompt';
            prompt.innerHTML = `
                <div class="pwa-update-content">
                    <span class="icon">🔄</span>
                    <span class="text">有新版本可用</span>
                    <button class="btn-update" data-action="update">立即更新</button>
                    <button class="btn-later" data-action="later">稍后</button>
                </div>
            `;

            document.body.appendChild(prompt);

            // 添加样式
            if (!document.getElementById('pwa-update-prompt-styles')) {
                const style = document.createElement('style');
                style.id = 'pwa-update-prompt-styles';
                style.textContent = `
                    .pwa-update-prompt {
                        position: fixed;
                        top: 1rem;
                        right: 1rem;
                        background: white;
                        border-radius: 8px;
                        padding: 1rem;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                        z-index: 10002;
                        animation: slideIn 0.3s ease;
                    }

                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }

                    .pwa-update-content {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                    }

                    .pwa-update-content .icon {
                        font-size: 1.25rem;
                    }

                    .pwa-update-content .text {
                        font-weight: 500;
                    }

                    .pwa-update-content button {
                        padding: 0.375rem 0.75rem;
                        border: none;
                        border-radius: 4px;
                        font-size: 0.875rem;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .btn-update {
                        background: #667eea;
                        color: white;
                    }

                    .btn-update:hover {
                        background: #5a6fd6;
                    }

                    .btn-later {
                        background: #e5e7eb;
                        color: #374151;
                    }

                    .btn-later:hover {
                        background: #d1d5db;
                    }
                `;
                document.head.appendChild(style);
            }

            // 绑定事件
            prompt.querySelector('[data-action="update"]').addEventListener('click', () => {
                this._applyUpdate(worker);
                prompt.remove();
            });

            prompt.querySelector('[data-action="later"]').addEventListener('click', () => {
                prompt.remove();
            });
        },

        /**
         * 应用更新
         */
        _applyUpdate(worker) {
            if (!worker) {
                // 向Service Worker发送跳过等待消息
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'SKIP_WAITING'
                    });
                }
            } else {
                worker.postMessage({ type: 'SKIP_WAITING' });
            }

            // 监听controller变化，刷新页面
            // 每次都注册新的监听器，因为 once:true 会在触发后自动移除
            const controllerChangeHandler = () => {
                console.log('[PWAManager] Service Worker已更新，刷新页面');
                window.location.reload();
            };

            // 移除旧的监听器（如果存在）
            if (this._state._boundControllerChangeHandler && navigator.serviceWorker) {
                navigator.serviceWorker.removeEventListener('controllerchange', this._state._boundControllerChangeHandler);
            }

            this._state._boundControllerChangeHandler = controllerChangeHandler;
            navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler, { once: true });
        },

        /**
         * 定期检查更新
         */
        _scheduleUpdateChecks() {
            if (!this._state.swRegistration) return;

            this._state.updateCheckTimer = setInterval(async () => {
                if (this._state.checkingUpdate) return;

                this._state.checkingUpdate = true;

                try {
                    await this._state.swRegistration.update();
                    console.log('[PWAManager] 已检查更新');
                } catch (err) {
                    console.error('[PWAManager] 检查更新失败:', err);
                } finally {
                    this._state.checkingUpdate = false;
                }
            }, this._config.updateInterval);
        },

        /**
         * 发送自定义事件
         */
        _emit(eventName, detail) {
            const event = new CustomEvent(eventName, {
                detail,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        },

        /**
         * 公共API：检查更新
         */
        async checkUpdate() {
            if (!this._state.swRegistration) {
                console.warn('[PWAManager] Service Worker未注册');
                return false;
            }

            try {
                await this._state.swRegistration.update();
                return this._state.updateAvailable;
            } catch (err) {
                console.error('[PWAManager] 检查更新失败:', err);
                return false;
            }
        },

        /**
         * 公共API：触发安装提示
         */
        async promptInstall() {
            await this._promptInstall();
        },

        /**
         * 公共API：获取状态
         */
        getStatus() {
            return {
                isOnline: this._state.isOnline,
                isInstalled: this._state.isInstalled,
                updateAvailable: this._state.updateAvailable,
                swRegistered: !!this._state.swRegistration
            };
        },

        /**
         * 公共API：获取缓存信息
         */
        async getCacheInfo() {
            if (!('caches' in window)) {
                return null;
            }

            const cacheNames = await caches.keys();
            const info = {};

            for (const name of cacheNames) {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                info[name] = keys.length;
            }

            return info;
        },

        /**
         * 公共API：清除缓存
         */
        async clearCache() {
            if (!('caches' in window)) {
                return false;
            }

            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));

            console.log('[PWAManager] 缓存已清除');
            return true;
        },

        /**
         * 公共API：注销Service Worker
         */
        async unregister() {
            if (!this._state.swRegistration) {
                return false;
            }

            const result = await this._state.swRegistration.unregister();
            this._state.swRegistration = null;

            console.log('[PWAManager] Service Worker已注销:', result);
            return result;
        },

        /**
         * 公共API：销毁管理器，清理所有资源
         */
        destroy() {
            // 清除定时器
            if (this._state.updateCheckTimer) {
                clearInterval(this._state.updateCheckTimer);
                this._state.updateCheckTimer = null;
            }

            // 移除网络状态事件监听
            if (this._state._boundOnlineHandler) {
                window.removeEventListener('online', this._state._boundOnlineHandler);
                this._state._boundOnlineHandler = null;
            }
            if (this._state._boundOfflineHandler) {
                window.removeEventListener('offline', this._state._boundOfflineHandler);
                this._state._boundOfflineHandler = null;
            }

            // 移除安装提示事件监听
            if (this._state._boundBeforeInstallHandler) {
                window.removeEventListener('beforeinstallprompt', this._state._boundBeforeInstallHandler);
                this._state._boundBeforeInstallHandler = null;
            }
            if (this._state._boundAppInstalledHandler) {
                window.removeEventListener('appinstalled', this._state._boundAppInstalledHandler);
                this._state._boundAppInstalledHandler = null;
            }

            // 移除controllerchange事件监听
            if (this._state._boundControllerChangeHandler && navigator.serviceWorker) {
                navigator.serviceWorker.removeEventListener('controllerchange', this._state._boundControllerChangeHandler);
                this._state._boundControllerChangeHandler = null;
            }

            // 移除Service Worker消息监听
            if (this._state._boundMessageHandler && navigator.serviceWorker) {
                navigator.serviceWorker.removeEventListener('message', this._state._boundMessageHandler);
                this._state._boundMessageHandler = null;
            }

            // 移除DOM元素
            const banner = document.getElementById('pwa-install-banner');
            if (banner) banner.remove();

            const updatePrompt = document.getElementById('pwa-update-prompt');
            if (updatePrompt) updatePrompt.remove();

            const networkToast = document.getElementById('pwa-network-toast');
            if (networkToast) networkToast.remove();

            // 重置状态
            this._state.initialized = false;
            this._state.swRegistration = null;
            this._state.installPrompt = null;
            this._state.updateAvailable = false;
            this._state.checkingUpdate = false;

            console.log('[PWAManager] 管理器已销毁');
        }
    };

    // 暴露到全局
    window.PWAManager = PWAManager;

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PWAManager.init());
    } else {
        PWAManager.init();
    }

    console.log('[PWAManager] 模块已加载');
})();
