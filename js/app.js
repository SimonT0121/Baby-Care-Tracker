/**
 * Baby Care Tracker 應用程序入口
 * 處理路由、全局事件和應用初始化
 */

// 應用程序類
class App {
    /**
     * 當前頁面
     */
    currentPage = 'dashboard';
    
    /**
     * 初始化應用程序
     */
    async init() {
        try {
            console.log('Baby Care Tracker 初始化中...');
            
            // 檢查瀏覽器相容性
            this.checkCompatibility();
            
            // 初始化數據庫
            await Database.initDatabase();
            console.log('數據庫初始化成功');
            
            // 載入主題設置
            Utils.loadTheme();
            
            // 初始化視圖
            this.initViews();
            
            // 設置事件監聽器
            this.setupEventListeners();
            
            // 載入首頁
            await this.loadInitialPage();
            
            // 設置在線/離線監聽器
            Utils.registerOnlineStatusListeners();
            
            console.log('應用程序初始化完成');
        } catch (error) {
            console.error('應用程序初始化失敗:', error);
            this.showErrorMessage('應用程序初始化失敗，請重新載入頁面。', error.message);
        }
    }
    
    /**
     * 檢查瀏覽器相容性
     */
    checkCompatibility() {
        const requirements = [
            { feature: 'IndexedDB', supported: Utils.supportsIndexedDB() },
            { feature: 'Service Worker', supported: Utils.supportsServiceWorker() },
            { feature: 'LocalStorage', supported: Utils.supportsLocalStorage() }
        ];
        
        const unsupported = requirements.filter(req => !req.supported);
        
        if (unsupported.length > 0) {
            const features = unsupported.map(req => req.feature).join(', ');
            this.showErrorMessage(
                '瀏覽器相容性問題',
                `您的瀏覽器不支持以下必要功能: ${features}。請使用現代瀏覽器如Chrome、Firefox、Safari或Edge的最新版本。`
            );
        }
    }
    
    /**
     * 初始化所有視圖
     */
    initViews() {
        // 初始化各個視圖
        ChildView.init();
        ActivityView.init();
        HealthView.init();
        MilestoneView.init();
        StatsView.init();
        SettingsView.init();
    }
    
    /**
     * 設置全局事件監聽器
     */
    setupEventListeners() {
        // 監聽導航點擊
        document.querySelectorAll('#main-nav a').forEach(link => {
            link.addEventListener('click', this.handleNavigation.bind(this));
        });
        
        // 監聽漢堡選單點擊（移動端）
        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                const navMenu = document.querySelector('.nav-menu');
                navMenu.classList.toggle('active');
            });
        }
        
        // 監聽孩子選擇器變更
        const childSelector = document.getElementById('current-child');
        if (childSelector) {
            childSelector.addEventListener('change', this.handleChildChange.bind(this));
        }
        
        // 監聽主頁快速動作按鈕
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', this.handleQuickAction.bind(this));
        });
        
        // 監聽後退按鈕
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.navigateTo(event.state.page, false);
            }
        });
    }
    
    /**
     * 處理導航點擊
     * @param {Event} event 點擊事件
     */
    handleNavigation(event) {
        event.preventDefault();
        
        const target = event.currentTarget;
        const page = target.getAttribute('data-page');
        
        this.navigateTo(page);
        
        // 在移動設備上關閉選單
        const navMenu = document.querySelector('.nav-menu');
        navMenu.classList.remove('active');
    }
    
    /**
     * 處理孩子選擇變更
     * @param {Event} event 變更事件
     */
    async handleChildChange(event) {
        const childId = event.target.value;
        
        if (!childId) {
            // 未選擇孩子
            localStorage.removeItem('currentChildId');
            this.refreshCurrentPage();
            return;
        }
        
        try {
            await ChildService.setCurrentChild(childId);
            this.refreshCurrentPage();
        } catch (error) {
            console.error('設置當前孩子失敗:', error);
            Utils.showToast('設置當前孩子失敗', 'error');
        }
    }
    
    /**
     * 處理快速動作按鈕點擊
     * @param {Event} event 點擊事件
     */
    async handleQuickAction(event) {
        const action = event.currentTarget.getAttribute('data-action');
        
        // 檢查是否有選擇孩子
        const hasChild = await ChildService.hasCurrentChild();
        
        if (!hasChild) {
            Utils.showToast('請先選擇一個孩子', 'warning');
            return;
        }
        
        // 根據動作類型處理
        switch (action) {
            case 'feed':
                this.navigateTo('activities');
                ActivityView.showAddFeedForm();
                break;
            case 'sleep':
                this.navigateTo('activities');
                ActivityView.showAddSleepForm();
                break;
            case 'diaper':
                this.navigateTo('activities');
                ActivityView.showAddDiaperForm();
                break;
            case 'health':
                this.navigateTo('health');
                HealthView.showAddGrowthForm();
                break;
            default:
                console.warn('未知的快速動作:', action);
        }
    }
    
    /**
     * 導航到指定頁面
     * @param {string} page 頁面名稱
     * @param {boolean} [pushState=true] 是否推送瀏覽歷史
     */
    navigateTo(page, pushState = true) {
        if (!page || page === this.currentPage) {
            return;
        }
        
        // 更新導航項
        document.querySelectorAll('#main-nav a').forEach(link => {
            if (link.getAttribute('data-page') === page) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // 隱藏所有頁面
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.classList.remove('active');
        });
        
        // 顯示目標頁面
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // 處理孩子選擇器顯示
        const childSelector = document.getElementById('child-selector');
        if (childSelector) {
            if (page === 'children') {
                childSelector.classList.add('hidden');
            } else {
                childSelector.classList.remove('hidden');
            }
        }
        
        // 更新當前頁面
        this.currentPage = page;
        
        // 更新頁面標題
        document.title = `${this.getPageTitle(page)} - Baby Care Tracker`;
        
        // 更新URL
        if (pushState) {
            history.pushState({ page }, document.title, `#${page}`);
        }
        
        // 頁面切換時觸發對應視圖的刷新
        this.refreshPage(page);
    }
    
    /**
     * 獲取頁面標題
     * @param {string} page 頁面名稱
     * @returns {string} 頁面標題
     */
    getPageTitle(page) {
        const titles = {
            dashboard: '主頁',
            children: '孩子管理',
            activities: '日常活動',
            health: '健康記錄',
            milestones: '發展里程碑',
            stats: '統計分析',
            settings: '設置'
        };
        
        return titles[page] || 'Baby Care Tracker';
    }
    
    /**
     * 刷新特定頁面
     * @param {string} page 頁面名稱
     */
    async refreshPage(page) {
        try {
            switch (page) {
                case 'dashboard':
                    await this.refreshDashboard();
                    break;
                case 'children':
                    await ChildView.refreshChildrenList();
                    break;
                case 'activities':
                    await ActivityView.refreshActivityView();
                    break;
                case 'health':
                    await HealthView.refreshHealthView();
                    break;
                case 'milestones':
                    await MilestoneView.refreshMilestoneView();
                    break;
                case 'stats':
                    await StatsView.refreshStatsView();
                    break;
                case 'settings':
                    await SettingsView.refreshSettingsView();
                    break;
            }
        } catch (error) {
            console.error(`刷新頁面 ${page} 失敗:`, error);
        }
    }
    
    /**
     * 刷新當前頁面
     */
    refreshCurrentPage() {
        this.refreshPage(this.currentPage);
    }
    
    /**
     * 刷新儀表板
     */
    async refreshDashboard() {
        // 更新當前孩子選擇器
        await this.updateChildSelector();
        
        // 檢查是否有選擇孩子
        const currentChild = await ChildService.getCurrentChild();
        
        if (!currentChild) {
            document.getElementById('today-summary-content').innerHTML = `
                <p>請先選擇一個孩子或添加新孩子</p>
                <button id="dashboard-add-child" class="primary-btn">添加孩子</button>
            `;
            
            document.getElementById('recent-activities-list').innerHTML = '';
            
            // 綁定添加孩子按鈕
            const addChildBtn = document.getElementById('dashboard-add-child');
            if (addChildBtn) {
                addChildBtn.addEventListener('click', () => {
                    this.navigateTo('children');
                    ChildView.showAddChildForm();
                });
            }
            
            return;
        }
        
        // 更新今日摘要
        this.updateTodaySummary(currentChild);
        
        // 更新最近活動
        this.updateRecentActivities(currentChild);
    }
    
    /**
     * 更新孩子選擇器
     */
    async updateChildSelector() {
        try {
            const selector = document.getElementById('current-child');
            
            if (!selector) {
                return;
            }
            
            // 儲存當前選擇
            const currentSelection = selector.value;
            
            // 獲取所有孩子
            const children = await ChildService.getAllChildren();
            
            // 清空選擇器
            selector.innerHTML = '<option value="">請選擇孩子</option>';
            
            // 填充選項
            for (const child of children) {
                const option = document.createElement('option');
                option.value = child.id;
                option.textContent = child.name;
                
                // 設置年齡標籤
                const age = Utils.formatAge(child.birthDate);
                if (age) {
                    option.textContent += ` (${age})`;
                }
                
                selector.appendChild(option);
            }
            
            // 恢復選擇
            if (currentSelection) {
                selector.value = currentSelection;
            } else {
                // 從本地存儲獲取當前孩子
                const currentChildId = localStorage.getItem('currentChildId');
                if (currentChildId) {
                    selector.value = currentChildId;
                }
            }
        } catch (error) {
            console.error('更新孩子選擇器失敗:', error);
        }
    }
    
    /**
     * 更新今日摘要
     * @param {Object} child 當前孩子
     */
    async updateTodaySummary(child) {
        try {
            const summaryContainer = document.getElementById('today-summary-content');
            
            if (!summaryContainer) {
                return;
            }
            
            // 獲取今日活動
            const today = Utils.formatDate(new Date());
            const activities = await ActivityService.getActivitiesByDate(child.id, new Date());
            
            // 統計活動
            const feedCount = activities.filter(a => a.type === ActivityService.ACTIVITY_TYPES.FEED).length;
            const diaperCount = activities.filter(a => a.type === ActivityService.ACTIVITY_TYPES.DIAPER).length;
            
            // 計算睡眠時間
            const sleepActivities = activities.filter(a => a.type === ActivityService.ACTIVITY_TYPES.SLEEP);
            let totalSleepMinutes = 0;
            
            for (const sleep of sleepActivities) {
                if (sleep.endTime) {
                    totalSleepMinutes += Utils.getMinutesBetween(sleep.timestamp, sleep.endTime);
                }
            }
            
            // 獲取最新生長記錄
            const latestGrowth = await HealthService.getLatestGrowthRecord(child.id);
            
            // 構建今日摘要
            let summaryHTML = `
                <h4>${child.name} 的今日摘要 (${today})</h4>
                <div class="summary-stats">
                    <div class="summary-item">
                        <div class="summary-value">${feedCount}</div>
                        <div class="summary-label">餵食次數</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${Utils.formatDuration(totalSleepMinutes)}</div>
                        <div class="summary-label">睡眠時間</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${diaperCount}</div>
                        <div class="summary-label">尿布更換</div>
                    </div>
                </div>
            `;
            
            // 添加生長數據（如果有）
            if (latestGrowth && latestGrowth.details) {
                const growthDate = Utils.formatDate(latestGrowth.timestamp);
                summaryHTML += `
                    <h4>最新生長記錄 (${growthDate})</h4>
                    <div class="summary-stats">
                `;
                
                if (latestGrowth.details.weight) {
                    summaryHTML += `
                        <div class="summary-item">
                            <div class="summary-value">${Utils.formatWeight(latestGrowth.details.weight)}</div>
                            <div class="summary-label">體重</div>
                        </div>
                    `;
                }
                
                if (latestGrowth.details.height) {
                    summaryHTML += `
                        <div class="summary-item">
                            <div class="summary-value">${Utils.formatHeight(latestGrowth.details.height)}</div>
                            <div class="summary-label">身高</div>
                        </div>
                    `;
                }
                
                if (latestGrowth.details.headCircumference) {
                    summaryHTML += `
                        <div class="summary-item">
                            <div class="summary-value">${Utils.formatHeadCircumference(latestGrowth.details.headCircumference)}</div>
                            <div class="summary-label">頭圍</div>
                        </div>
                    `;
                }
                
                summaryHTML += `</div>`;
            }
            
            summaryContainer.innerHTML = summaryHTML;
        } catch (error) {
            console.error('更新今日摘要失敗:', error);
        }
    }
    
    /**
     * 更新最近活動
     * @param {Object} child 當前孩子
     */
    async updateRecentActivities(child) {
        try {
            const activitiesContainer = document.getElementById('recent-activities-list');
            
            if (!activitiesContainer) {
                return;
            }
            
            // 獲取最近活動
            const recentActivities = await ActivityService.getRecentActivities(child.id, 5);
            
            if (recentActivities.length === 0) {
                activitiesContainer.innerHTML = '<p>沒有最近活動記錄</p>';
                return;
            }
            
            // 構建活動列表
            let activitiesHTML = '<ul class="activity-list">';
            
            for (const activity of recentActivities) {
                const time = Utils.formatDateTime(activity.timestamp);
                let activityInfo = '';
                
                switch (activity.type) {
                    case ActivityService.ACTIVITY_TYPES.FEED:
                        const feedType = activity.details?.feedType || 'other';
                        const feedTypeLabels = {
                            breast_left: '左側母乳',
                            breast_right: '右側母乳',
                            breast_both: '雙側母乳',
                            formula: '配方奶',
                            solid: '副食品',
                            water: '水',
                            other: '其他'
                        };
                        
                        activityInfo = `餵食 - ${feedTypeLabels[feedType] || feedType}`;
                        if (activity.details?.amount) {
                            activityInfo += ` (${activity.details.amount} ml)`;
                        }
                        break;
                        
                    case ActivityService.ACTIVITY_TYPES.SLEEP:
                        if (activity.endTime) {
                            const duration = Utils.getMinutesBetween(activity.timestamp, activity.endTime);
                            activityInfo = `睡眠 - ${Utils.formatDuration(duration)}`;
                        } else {
                            activityInfo = '睡眠 - 進行中';
                        }
                        break;
                        
                    case ActivityService.ACTIVITY_TYPES.DIAPER:
                        const diaperType = activity.details?.diaperType || 'other';
                        const diaperTypeLabels = {
                            wet: '尿溼',
                            dirty: '大便',
                            mixed: '混合',
                            dry: '乾淨'
                        };
                        
                        activityInfo = `尿布 - ${diaperTypeLabels[diaperType] || diaperType}`;
                        break;
                }
                
                activitiesHTML += `
                    <li class="activity-item">
                        <div class="activity-time">${time}</div>
                        <div class="activity-info">${activityInfo}</div>
                    </li>
                `;
            }
            
            activitiesHTML += '</ul>';
            activitiesContainer.innerHTML = activitiesHTML;
        } catch (error) {
            console.error('更新最近活動失敗:', error);
        }
    }
    
    /**
     * 載入初始頁面
     */
    async loadInitialPage() {
        // 更新孩子選擇器
        await this.updateChildSelector();
        
        // 檢查是否有URL hash
        let pageFromHash = window.location.hash.substring(1);
        
        if (pageFromHash && document.getElementById(`${pageFromHash}-page`)) {
            this.navigateTo(pageFromHash, false);
        } else {
            // 如果沒有hash或無效，顯示儀表板
            this.navigateTo('dashboard', false);
        }
    }
    
    /**
     * 顯示錯誤消息
     * @param {string} title 錯誤標題
     * @param {string} message 錯誤消息
     */
    showErrorMessage(title, message) {
        // 創建錯誤元素
        const errorElement = document.createElement('div');
        errorElement.className = 'error-container';
        
        errorElement.innerHTML = `
            <div class="error-box">
                <h2>${title}</h2>
                <p>${message}</p>
                <button id="reload-btn">重新載入</button>
            </div>
        `;
        
        // 添加到頁面
        document.body.appendChild(errorElement);
        
        // 綁定重新載入按鈕
        document.getElementById('reload-btn').addEventListener('click', () => {
            window.location.reload();
        });
    }
}

// 在DOM載入完成後初始化應用
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    
    // 暴露給全局
    window.app = app;
});