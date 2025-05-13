// 版本號 (更新應用時需要更新此版本號)
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `baby-care-tracker-cache-${CACHE_VERSION}`;

// 需要緩存的靜態資源列表
const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './css/styles.css',
  './js/utils.js',
  './js/db.js',
  './js/app.js',
  './js/services/childService.js',
  './js/services/activityService.js',
  './js/services/healthService.js',
  './js/services/milestoneService.js',
  './js/views/childView.js',
  './js/views/activityView.js',
  './js/views/healthView.js',
  './js/views/milestoneView.js',
  './js/views/statsView.js',
  './js/views/settingsView.js',
  './images/icon-192x192.png',
  './images/icon-512x512.png',
  './manifest.json'
];

// Service Worker 安裝
self.addEventListener('install', event => {
  // 跳過等待，直接激活
  self.skipWaiting();
  
  // 緩存靜態資源
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('緩存靜態資源');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch(error => {
        console.error('緩存靜態資源失敗:', error);
      })
  );
});

// Service Worker 激活
self.addEventListener('activate', event => {
  // 清理舊版本緩存
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName.startsWith('baby-care-tracker-cache-') && 
                   cacheName !== CACHE_NAME;
          }).map(cacheName => {
            console.log('清理舊版本緩存:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        // 聲明控制權
        return self.clients.claim();
      })
  );
});

// 網絡請求攔截 - 使用 Network First 策略處理動態內容，使用 Cache First 策略處理靜態資源
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // 忽略 Chrome 擴展和開發相關的請求
  if (!(requestUrl.origin === location.origin || requestUrl.origin === 'https://fonts.googleapis.com' || requestUrl.origin === 'https://fonts.gstatic.com')) {
    return;
  }
  
  // 忽略 POST 請求和帶查詢參數的請求
  if (event.request.method !== 'GET' || requestUrl.search) {
    return;
  }
  
  // 判斷是靜態資源還是動態內容
  const isStaticAsset = STATIC_CACHE_URLS.some(url => {
    return requestUrl.pathname === url || 
           requestUrl.pathname.endsWith('.css') || 
           requestUrl.pathname.endsWith('.js') || 
           requestUrl.pathname.endsWith('.png') || 
           requestUrl.pathname.endsWith('.jpg') || 
           requestUrl.pathname.endsWith('.ico');
  });
  
  if (isStaticAsset) {
    // 處理靜態資源 - Cache First 策略
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // 從緩存返回資源
            return cachedResponse;
          }
          
          // 從網絡獲取並緩存資源
          return fetch(event.request)
            .then(response => {
              // 確認是有效的響應
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // 緩存資源（需要克隆響應，因為響應流只能被讀取一次）
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(() => {
              // 網絡請求失敗時，嘗試返回通用錯誤頁面
              if (requestUrl.pathname.endsWith('.html')) {
                return caches.match('/offline.html');
              }
              return null;
            });
        })
    );
  } else {
    // 處理動態內容 - Network First 策略
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return response;
        })
        .catch(() => {
          // 網絡請求失敗時，從緩存中嘗試獲取資源
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // 如果請求的是HTML頁面，返回離線頁面
              if (requestUrl.pathname.endsWith('.html')) {
                return caches.match('/offline.html');
              }
              return null;
            });
        })
    );
  }
});

// 監聽來自客戶端的消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 監聽推送通知
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/images/icon-192x192.png',
    badge: '/images/badge.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 點擊通知時打開指定頁面
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.matchAll({type: 'window'})
        .then(windowClients => {
          // 檢查是否已有打開的窗口
          for (let client of windowClients) {
            if (client.url === event.notification.data.url && 'focus' in client) {
              return client.focus();
            }
          }
          // 如果沒有打開的窗口，則打開新窗口
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data.url);
          }
        })
    );
  }
});

// 監聽同步事件（用於後台同步數據等功能）
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // 執行數據同步操作
      syncData()
    );
  }
});

// 數據同步功能（示例）
function syncData() {
  return new Promise((resolve, reject) => {
    // 在這裡實現數據同步邏輯
    // 例如將 IndexedDB 中的數據同步到服務器
    
    // 模擬同步成功
    setTimeout(() => {
      console.log('數據同步完成');
      resolve();
    }, 2000);
  });
}