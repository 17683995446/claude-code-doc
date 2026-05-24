/**
 * Service Worker v1.0.0
 * 功能：离线缓存、后台同步、推送通知支持
 * 策略：Cache First for静态资源，Network First for API请求
 */

const CACHE_NAME = 'claude-doc-v1';
const STATIC_CACHE = 'claude-doc-static-v1';
const DYNAMIC_CACHE = 'claude-doc-dynamic-v1';
const IMAGE_CACHE = 'claude-doc-images-v1';

// 预缓存的核心资源
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/i18n.js',
    '/js/features.js',
    '/js/enhancements.js',
    '/js/a11y.js',
    '/js/security.js',
    '/js/error-boundary.js',
    '/js/lazy-loader.js',
    '/js/module-system.js',
    '/js/performance-monitor.js',
    '/js/virtual-scroll.js',
    '/js/advanced-search.js',
    '/js/collaboration.js',
    '/js/mermaid-support.js',
    '/js/math-renderer.js'
];

// 离线页面
const OFFLINE_PAGE = '/offline.html';

// 安装事件：预缓存核心资源
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker 安装中...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] 预缓存核心资源...');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[SW] 预缓存完成');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('[SW] 预缓存失败:', err);
            })
    );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker 激活中...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name.startsWith('claude-doc-') &&
                                   name !== STATIC_CACHE &&
                                   name !== DYNAMIC_CACHE &&
                                   name !== IMAGE_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] 删除旧缓存:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] 激活完成');
                return self.clients.claim();
            })
    );
});

// 获取事件：缓存策略
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 跳过非GET请求
    if (request.method !== 'GET') {
        return;
    }

    // 跳过Chrome扩展请求
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // 根据不同资源类型采用不同策略
    if (isStaticResource(url)) {
        event.respondWith(cacheFirst(request));
    } else if (isImage(request)) {
        event.respondWith(cacheFirstWithLimit(request, IMAGE_CACHE, 50));
    } else if (isAPI(request)) {
        event.respondWith(networkFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

/**
 * 判断是否为静态资源
 */
function isStaticResource(url) {
    const staticExtensions = ['.js', '.css', '.html', '.json', '.woff', '.woff2'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

/**
 * 判断是否为图片
 */
function isImage(request) {
    return request.destination === 'image';
}

/**
 * 判断是否为API请求
 */
function isAPI(request) {
    return request.url.includes('/api/') || request.headers.get('Accept')?.includes('application/json');
}

/**
 * Cache First 策略
 * 适用于静态资源
 */
async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);

    if (cached) {
        // 后台更新缓存
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    cache.put(request, response.clone());
                }
            })
            .catch(() => {});

        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        console.error('[SW] 获取失败:', err);
        return new Response('离线中，无法获取资源', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Cache First with Limit 策略
 * 适用于图片，限制缓存数量
 */
async function cacheFirstWithLimit(request, cacheName, limit) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            // 检查缓存数量
            const keys = await cache.keys();
            if (keys.length >= limit) {
                // 删除最早的缓存
                await cache.delete(keys[0]);
            }
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // 返回占位图
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ddd" width="100" height="100"/><text fill="#999" x="50" y="50" text-anchor="middle">离线</text></svg>',
            {
                headers: { 'Content-Type': 'image/svg+xml' }
            }
        );
    }
}

/**
 * Network First 策略
 * 适用于API请求
 */
async function networkFirst(request) {
    const cache = await caches.open(DYNAMIC_CACHE);

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (err) {
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }

        return new Response(JSON.stringify({ error: '离线中，数据不可用' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stale While Revalidate 策略
 * 适用于页面内容
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch((err) => {
            console.error('[SW] 获取失败:', err);
            throw err;
        });

    // 如果有缓存，先返回缓存，同时更新
    if (cached) {
        fetchPromise.catch(() => {}); // 忽略更新错误
        return cached;
    }

    // 没有缓存，等待网络请求
    try {
        return await fetchPromise;
    } catch (err) {
        // 返回离线页面
        const offlineCache = await caches.open(STATIC_CACHE);
        const offlinePage = await offlineCache.match(OFFLINE_PAGE);
        if (offlinePage) {
            return offlinePage;
        }

        return new Response('离线中，请检查网络连接', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// 后台同步事件
self.addEventListener('sync', (event) => {
    console.log('[SW] 后台同步:', event.tag);

    if (event.tag === 'sync-comments') {
        event.waitUntil(syncComments());
    } else if (event.tag === 'sync-reading-progress') {
        event.waitUntil(syncReadingProgress());
    }
});

/**
 * 同步评论数据
 */
async function syncComments() {
    // 从IndexedDB获取待同步的评论
    const db = await openDB('claude-doc-db', 1);
    const comments = await db.getAll('pending-comments');

    for (const comment of comments) {
        try {
            // 模拟发送到服务器
            // await fetch('/api/comments', { method: 'POST', body: JSON.stringify(comment) });
            await db.delete('pending-comments', comment.id);
            console.log('[SW] 评论已同步:', comment.id);
        } catch (err) {
            console.error('[SW] 同步评论失败:', err);
        }
    }
}

/**
 * 同步阅读进度
 */
async function syncReadingProgress() {
    const db = await openDB('claude-doc-db', 1);
    const progress = await db.get('reading-progress', 'current');

    if (progress) {
        try {
            // await fetch('/api/progress', { method: 'POST', body: JSON.stringify(progress) });
            console.log('[SW] 阅读进度已同步');
        } catch (err) {
            console.error('[SW] 同步阅读进度失败:', err);
        }
    }
}

// 推送通知事件
self.addEventListener('push', (event) => {
    console.log('[SW] 收到推送:', event);

    const data = event.data?.json() || {};
    const title = data.title || 'Claude文档';
    const options = {
        body: data.body || '您有新的消息',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [
            { action: 'open', title: '查看' },
            { action: 'close', title: '关闭' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] 通知点击:', event);

    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// 消息事件（与页面通信）
self.addEventListener('message', (event) => {
    console.log('[SW] 收到消息:', event.data);

    const { type, payload } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;

        case 'CLEAR_CACHE':
            event.waitUntil(
                caches.keys().then((names) => {
                    return Promise.all(names.map((name) => caches.delete(name)));
                })
            );
            break;

        case 'PRECACHE':
            event.waitUntil(
                caches.open(STATIC_CACHE).then((cache) => {
                    return cache.addAll(payload.urls);
                })
            );
            break;
    }
});

/**
 * 简单的IndexedDB封装
 */
function openDB(name, version) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, version);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(new IDBWrapper(request.result));

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pending-comments')) {
                db.createObjectStore('pending-comments', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('reading-progress')) {
                db.createObjectStore('reading-progress');
            }
        };
    });
}

class IDBWrapper {
    constructor(db) {
        this.db = db;
    }

    getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

console.log('[SW] Service Worker 已加载');
