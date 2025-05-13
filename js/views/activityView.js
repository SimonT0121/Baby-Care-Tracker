/**
 * 活動視圖 - 處理日常活動記錄相關的UI
 */
class ActivityView {
    /**
     * 當前選中的活動類型標籤
     */
    static currentTab = 'feed';
    
    /**
     * 當前選中的日期
     */
    static currentDate = new Date();
    
    /**
     * 初始化活動視圖
     */
    static init() {
        this.setupEventListeners();
    }
    
    /**
     * 設置事件監聽器
     */
    static setupEventListeners() {
        // 活動標籤切換
        document.querySelectorAll('.tab-btn[data-tab]').forEach(tab => {
            if (tab.closest('#activities-page')) {
                tab.addEventListener('click', (e) => {
                    const tabName = e.currentTarget.getAttribute('data-tab');
                    this.switchTab(tabName);
                });
            }
        });
        
        // 活動日期選擇
        const dateInput = document.getElementById('activities-date');
        if (dateInput) {
            // 設置初始日期
            dateInput.value = Utils.formatDate(this.currentDate);
            
            dateInput.addEventListener('change', (e) => {
                this.currentDate = new Date(e.target.value);
                this.refreshActivityView();
            });
        }
        
        // 上一天/下一天按鈕
        const prevDateBtn = document.getElementById('prev-date');
        const nextDateBtn = document.getElementById('next-date');
        
        if (prevDateBtn) {
            prevDateBtn.addEventListener('click', () => {
                this.changeDate(-1);
            });
        }
        
        if (nextDateBtn) {
            nextDateBtn.addEventListener('click', () => {
                this.changeDate(1);
            });
        }
        
        // 添加活動按鈕
        const addFeedBtn = document.getElementById('add-feed-btn');
        const addSleepBtn = document.getElementById('add-sleep-btn');
        const addDiaperBtn = document.getElementById('add-diaper-btn');
        
        if (addFeedBtn) {
            addFeedBtn.addEventListener('click', () => this.showAddFeedForm());
        }
        
        if (addSleepBtn) {
            addSleepBtn.addEventListener('click', () => this.showAddSleepForm());
        }
        
        if (addDiaperBtn) {
            addDiaperBtn.addEventListener('click', () => this.showAddDiaperForm());
        }
    }
    
    /**
     * 切換活動標籤
     * @param {string} tabName 標籤名稱
     */
    static switchTab(tabName) {
        // 更新標籤按鈕
        document.querySelectorAll('.tab-btn[data-tab]').forEach(tab => {
            if (tab.closest('#activities-page')) {
                if (tab.getAttribute('data-tab') === tabName) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            }
        });
        
        // 更新標籤內容
        document.querySelectorAll('.tab-pane').forEach(pane => {
            if (pane.closest('#activities-page')) {
                if (pane.id === `${tabName}-tab`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            }
        });
        
        // 更新當前標籤
        this.currentTab = tabName;
        
        // 刷新當前標籤內容
        this.refreshTabContent(tabName);
    }
    
    /**
     * 更改日期
     * @param {number} days 天數變化
     */
    static changeDate(days) {
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + days);
        
        // 更新日期選擇器
        const dateInput = document.getElementById('activities-date');
        if (dateInput) {
            dateInput.value = Utils.formatDate(newDate);
        }
        
        // 更新當前日期
        this.currentDate = newDate;
        
        // 刷新視圖
        this.refreshActivityView();
    }
    
    /**
     * 刷新活動視圖
     */
    static async refreshActivityView() {
        // 檢查是否有選擇孩子
        const currentChild = await ChildService.getCurrentChild();
        
        if (!currentChild) {
            this.showNoChildSelectedMessage();
            return;
        }
        
        // 刷新當前標籤內容
        this.refreshTabContent(this.currentTab);
    }
    
    /**
     * 刷新特定標籤的內容
     * @param {string} tabName 標籤名稱
     */
    static async refreshTabContent(tabName) {
        // 檢查是否有選擇孩子
        const currentChild = await ChildService.getCurrentChild();
        
        if (!currentChild) {
            return;
        }
        
        try {
            switch (tabName) {
                case 'feed':
                    await this.refreshFeedTab(currentChild.id);
                    break;
                case 'sleep':
                    await this.refreshSleepTab(currentChild.id);
                    break;
                case 'diaper':
                    await this.refreshDiaperTab(currentChild.id);
                    break;
            }
        } catch (error) {
            console.error(`刷新${tabName}標籤失敗:`, error);
            Utils.showToast(`載入${tabName}記錄失敗`, 'error');
        }
    }
    
    /**
     * 刷新餵食標籤
     * @param {string} childId 孩子ID
     */
    static async refreshFeedTab(childId) {
        try {
            const feedList = document.getElementById('feed-list');
            
            if (!feedList) return;
            
            // 獲取當天的餵食記錄
            const feedActivities = await ActivityService.getActivitiesByType(
                childId, 
                ActivityService.ACTIVITY_TYPES.FEED, 
                this.currentDate
            );
            
            if (feedActivities.length === 0) {
                feedList.innerHTML = '<p class="empty-list">今天沒有餵食記錄</p>';
                return;
            }
            
            // 按時間排序（降序）
            feedActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // 構建列表HTML
            let listHTML = '';
            
            for (const activity of feedActivities) {
                const time = Utils.formatTime(activity.timestamp);
                const details = activity.details || {};
                const feedType = details.feedType || 'other';
                
                // 餵食類型標籤
                const feedTypeLabels = {
                    breast_left: '左側母乳',
                    breast_right: '右側母乳',
                    breast_both: '雙側母乳',
                    formula: '配方奶',
                    solid: '副食品',
                    water: '水',
                    other: '其他'
                };
                
                // 餵食類型圖標
                const feedTypeIcons = {
                    breast_left: '🤱',
                    breast_right: '🤱',
                    breast_both: '🤱',
                    formula: '🍼',
                    solid: '🥄',
                    water: '💧',
                    other: '📝'
                };
                
                const feedTypeLabel = feedTypeLabels[feedType] || feedType;
                const feedTypeIcon = feedTypeIcons[feedType] || '📝';
                
                // 構建項目HTML
                listHTML += `
                    <div class="list-item feed-item" data-id="${activity.id}">
                        <div class="list-item-icon">${feedTypeIcon}</div>
                        <div class="list-item-content">
                            <div class="list-item-time">${time}</div>
                            <div class="list-item-title">${feedTypeLabel}</div>
                            ${details.amount ? `<div class="list-item-subtitle">數量: ${details.amount} ml</div>` : ''}
                            ${details.duration ? `<div class="list-item-subtitle">時間: ${details.duration} 分鐘</div>` : ''}
                            ${activity.note ? `<div class="list-item-note">${activity.note}</div>` : ''}
                        </div>
                        <div class="list-item-actions">
                            <button class="edit-activity-btn secondary-btn" data-id="${activity.id}">編輯</button>
                            <button class="delete-activity-btn danger-btn" data-id="${activity.id}">刪除</button>
                        </div>
                    </div>
                `;
            }
            
            feedList.innerHTML = listHTML;
            
            // 綁定編輯和刪除按鈕
            this.bindActivityButtons(feedList);
        } catch (error) {
            console.error('刷新餵食標籤失敗:', error);
            throw error;
        }
    }
    
    /**
     * 刷新睡眠標籤
     * @param {string} childId 孩子ID
     */
    static async refreshSleepTab(childId) {
        try {
            const sleepList = document.getElementById('sleep-list');
            
            if (!sleepList) return;
            
            // 獲取當天的睡眠記錄
            const sleepActivities = await ActivityService.getActivitiesByType(
                childId, 
                ActivityService.ACTIVITY_TYPES.SLEEP, 
                this.currentDate
            );
            
            if (sleepActivities.length === 0) {
                sleepList.innerHTML = '<p class="empty-list">今天沒有睡眠記錄</p>';
                return;
            }
            
            // 按時間排序（降序）
            sleepActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // 構建列表HTML
            let listHTML = '';
            
            for (const activity of sleepActivities) {
                const startTime = Utils.formatTime(activity.timestamp);
                const details = activity.details || {};
                
                // 睡眠狀態和時長
                let statusLabel = '';
                let durationLabel = '';
                
                if (activity.endTime) {
                    const endTime = Utils.formatTime(activity.endTime);
                    const duration = Utils.getMinutesBetween(activity.timestamp, activity.endTime);
                    
                    statusLabel = `<span class="status-badge completed">已完成</span>`;
                    durationLabel = `${startTime} - ${endTime} (${Utils.formatDuration(duration)})`;
                } else {
                    statusLabel = `<span class="status-badge ongoing">進行中</span>`;
                    durationLabel = `${startTime} - 進行中`;
                }
                
                // 構建項目HTML
                listHTML += `
                    <div class="list-item sleep-item" data-id="${activity.id}">
                        <div class="list-item-icon">😴</div>
                        <div class="list-item-content">
                            <div class="list-item-status">${statusLabel}</div>
                            <div class="list-item-title">睡眠時間</div>
                            <div class="list-item-subtitle">${durationLabel}</div>
                            ${details.location ? `<div class="list-item-subtitle">位置: ${details.location}</div>` : ''}
                            ${activity.note ? `<div class="list-item-note">${activity.note}</div>` : ''}
                        </div>
                        <div class="list-item-actions">
                            ${!activity.endTime ? 
                                `<button class="end-sleep-btn primary-btn" data-id="${activity.id}">結束</button>` : 
                                `<button class="edit-activity-btn secondary-btn" data-id="${activity.id}">編輯</button>`
                            }
                            <button class="delete-activity-btn danger-btn" data-id="${activity.id}">刪除</button>
                        </div>
                    </div>
                `;
            }
            
            sleepList.innerHTML = listHTML;
            
            // 綁定按鈕
            this.bindActivityButtons(sleepList);
            
            // 綁定結束睡眠按鈕
            sleepList.querySelectorAll('.end-sleep-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const activityId = e.currentTarget.getAttribute('data-id');
                    this.endSleepActivity(activityId);
                });
            });
        } catch (error) {
            console.error('刷新睡眠標籤失敗:', error);
            throw error;
        }
    }
    
    /**
     * 刷新尿布標籤
     * @param {string} childId 孩子ID
     */
    static async refreshDiaperTab(childId) {
        try {
            const diaperList = document.getElementById('diaper-list');
            
            if (!diaperList) return;
            
            // 獲取當天的尿布記錄
            const diaperActivities = await ActivityService.getActivitiesByType(
                childId, 
                ActivityService.ACTIVITY_TYPES.DIAPER, 
                this.currentDate
            );
            
            if (diaperActivities.length === 0) {
                diaperList.innerHTML = '<p class="empty-list">今天沒有尿布記錄</p>';
                return;
            }
            
            // 按時間排序（降序）
            diaperActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // 構建列表HTML
            let listHTML = '';
            
            for (const activity of diaperActivities) {
                const time = Utils.formatTime(activity.timestamp);
                const details = activity.details || {};
                const diaperType = details.diaperType || 'other';
                
                // 尿布類型標籤
                const diaperTypeLabels = {
                    wet: '尿溼',
                    dirty: '大便',
                    mixed: '混合',
                    dry: '乾淨'
                };
                
                // 尿布類型圖標
                const diaperTypeIcons = {
                    wet: '💧',
                    dirty: '💩',
                    mixed: '🔄',
                    dry: '✨'
                };
                
                const diaperTypeLabel = diaperTypeLabels[diaperType] || diaperType;
                const diaperTypeIcon = diaperTypeIcons[diaperType] || '📝';
                
                // 構建項目HTML
                listHTML += `
                    <div class="list-item diaper-item" data-id="${activity.id}">
                        <div class="list-item-icon">${diaperTypeIcon}</div>
                        <div class="list-item-content">
                            <div class="list-item-time">${time}</div>
                            <div class="list-item-title">尿布更換: ${diaperTypeLabel}</div>
                            ${activity.note ? `<div class="list-item-note">${activity.note}</div>` : ''}
                        </div>
                        <div class="list-item-actions">
                            <button class="edit-activity-btn secondary-btn" data-id="${activity.id}">編輯</button>
                            <button class="delete-activity-btn danger-btn" data-id="${activity.id}">刪除</button>
                        </div>
                    </div>
                `;
            }
            
            diaperList.innerHTML = listHTML;
            
            // 綁定編輯和刪除按鈕
            this.bindActivityButtons(diaperList);
        } catch (error) {
            console.error('刷新尿布標籤失敗:', error);
            throw error;
        }
    }
    
    /**
     * 綁定活動項目按鈕
     * @param {HTMLElement} container 容器元素
     */
    static bindActivityButtons(container) {
        // 綁定編輯按鈕
        container.querySelectorAll('.edit-activity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activityId = e.currentTarget.getAttribute('data-id');
                this.showEditActivityForm(activityId);
            });
        });
        
        // 綁定刪除按鈕
        container.querySelectorAll('.delete-activity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const activityId = e.currentTarget.getAttribute('data-id');
                this.showDeleteActivityConfirm(activityId);
            });
        });
    }
    
    /**
     * 顯示無孩子選擇訊息
     */
    static showNoChildSelectedMessage() {
        const containers = [
            document.getElementById('feed-list'),
            document.getElementById('sleep-list'),
            document.getElementById('diaper-list')
        ];
        
        containers.forEach(container => {
            if (container) {
                container.innerHTML = `
                    <div class="no-child-selected">
                        <p>請先選擇一個孩子</p>
                        <button id="select-child-btn" class="primary-btn">選擇孩子</button>
                    </div>
                `;
                
                const selectBtn = container.querySelector('#select-child-btn');
                if (selectBtn) {
                    selectBtn.addEventListener('click', () => {
                        app.navigateTo('children');
                    });
                }
            }
        });
    }
    
    /**
     * 顯示添加餵食表單
     */
    static async showAddFeedForm() {
        try {
            // 檢查是否有選擇孩子
            const currentChild = await ChildService.getCurrentChild();
            
            if (!currentChild) {
                Utils.showToast('請先選擇一個孩子', 'warning');
                return;
            }
            
            // 創建表單內容
            const formContent = this.createFeedForm();
            
            // 顯示模態框
            const closeModal = Utils.showModal('添加餵食記錄', formContent);
            
            // 處理表單提交
            const form = document.getElementById('feed-form');
            
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    try {
                        // 禁用提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = true;
                        submitBtn.textContent = '處理中...';
                        
                        // 獲取表單數據
                        const formData = new FormData(form);
                        
                        // 構造日期時間字符串
                        const dateStr = formData.get('date');
                        const timeStr = formData.get('time');
                        const timestamp = new Date(`${dateStr}T${timeStr}`);
                        
                        // 餵食數據
                        const feedData = {
                            childId: currentChild.id,
                            timestamp: timestamp,
                            details: {
                                feedType: formData.get('feedType'),
                            },
                            note: formData.get('note') || ''
                        };
                        
                        // 添加特定類型的額外字段
                        switch (feedData.details.feedType) {
                            case 'formula':
                            case 'water':
                                feedData.details.amount = formData.get('amount') || 0;
                                break;
                            case 'breast_left':
                            case 'breast_right':
                            case 'breast_both':
                                feedData.details.duration = formData.get('duration') || 0;
                                break;
                        }
                        
                        // 添加餵食記錄
                        await ActivityService.addFeedActivity(feedData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新餵食標籤
                        await this.refreshFeedTab(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功添加餵食記錄', 'success');
                        
                        // 如果不是當前顯示的日期，切換到記錄日期
                        if (Utils.formatDate(this.currentDate) !== dateStr) {
                            this.currentDate = new Date(dateStr);
                            document.getElementById('activities-date').value = dateStr;
                        }
                    } catch (error) {
                        console.error('添加餵食記錄失敗:', error);
                        Utils.showToast(error.message || '添加餵食記錄失敗', 'error');
                        
                        // 恢復提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '保存';
                    }
                });
                
                // 處理餵食類型變更
                const feedTypeSelect = form.querySelector('[name="feedType"]');
                if (feedTypeSelect) {
                    this.handleFeedTypeChange(feedTypeSelect.value, form);
                    
                    feedTypeSelect.addEventListener('change', (e) => {
                        this.handleFeedTypeChange(e.target.value, form);
                    });
                }
                
                // 設置默認時間
                const timeInput = form.querySelector('[name="time"]');
                if (timeInput) {
                    const now = new Date();
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    timeInput.value = `${hours}:${minutes}`;
                }
            }
        } catch (error) {
            console.error('顯示添加餵食表單失敗:', error);
            Utils.showToast('載入表單失敗', 'error');
        }
    }
    
    /**
     * 顯示添加睡眠表單
     */
    static async showAddSleepForm() {
        try {
            // 檢查是否有選擇孩子
            const currentChild = await ChildService.getCurrentChild();
            
            if (!currentChild) {
                Utils.showToast('請先選擇一個孩子', 'warning');
                return;
            }
            
            // 創建表單內容
            const formContent = this.createSleepForm();
            
            // 顯示模態框
            const closeModal = Utils.showModal('添加睡眠記錄', formContent);
            
            // 處理表單提交
            const form = document.getElementById('sleep-form');
            
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    try {
                        // 禁用提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = true;
                        submitBtn.textContent = '處理中...';
                        
                        // 獲取表單數據
                        const formData = new FormData(form);
                        
                        // 構造開始日期時間
                        const startDateStr = formData.get('startDate');
                        const startTimeStr = formData.get('startTime');
                        const startTimestamp = new Date(`${startDateStr}T${startTimeStr}`);
                        
                        // 構造結束日期時間（如果有）
                        let endTimestamp = null;
                        
                        if (formData.get('isComplete') === 'yes') {
                            const endDateStr = formData.get('endDate');
                            const endTimeStr = formData.get('endTime');
                            endTimestamp = new Date(`${endDateStr}T${endTimeStr}`);
                            
                            // 驗證結束時間是否晚於開始時間
                            if (endTimestamp <= startTimestamp) {
                                throw new Error('睡眠結束時間必須晚於開始時間');
                            }
                        }
                        
                        // 睡眠數據
                        const sleepData = {
                            childId: currentChild.id,
                            timestamp: startTimestamp,
                            endTime: endTimestamp,
                            details: {
                                location: formData.get('location') || ''
                            },
                            note: formData.get('note') || ''
                        };
                        
                        // 添加睡眠記錄
                        await ActivityService.addSleepActivity(sleepData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新睡眠標籤
                        await this.refreshSleepTab(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功添加睡眠記錄', 'success');
                        
                        // 如果不是當前顯示的日期，切換到記錄日期
                        if (Utils.formatDate(this.currentDate) !== startDateStr) {
                            this.currentDate = new Date(startDateStr);
                            document.getElementById('activities-date').value = startDateStr;
                        }
                    } catch (error) {
                        console.error('添加睡眠記錄失敗:', error);
                        Utils.showToast(error.message || '添加睡眠記錄失敗', 'error');
                        
                        // 恢復提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '保存';
                    }
                });
                
                // 處理是否完成
                const completeRadio = form.querySelectorAll('[name="isComplete"]');
                if (completeRadio.length) {
                    this.handleCompletionChange(form.querySelector('[name="isComplete"]:checked').value, form);
                    
                    completeRadio.forEach(radio => {
                        radio.addEventListener('change', (e) => {
                            this.handleCompletionChange(e.target.value, form);
                        });
                    });
                }
                
                // 設置默認時間
                const timeInput = form.querySelector('[name="startTime"]');
                if (timeInput) {
                    const now = new Date();
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    timeInput.value = `${hours}:${minutes}`;
                }
            }
        } catch (error) {
            console.error('顯示添加睡眠表單失敗:', error);
            Utils.showToast('載入表單失敗', 'error');
        }
    }
    
    /**
     * 顯示添加尿布表單
     */
    static async showAddDiaperForm() {
        try {
            // 檢查是否有選擇孩子
            const currentChild = await ChildService.getCurrentChild();
            
            if (!currentChild) {
                Utils.showToast('請先選擇一個孩子', 'warning');
                return;
            }
            
            // 創建表單內容
            const formContent = this.createDiaperForm();
            
            // 顯示模態框
            const closeModal = Utils.showModal('添加尿布記錄', formContent);
            
            // 處理表單提交
            const form = document.getElementById('diaper-form');
            
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    try {
                        // 禁用提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = true;
                        submitBtn.textContent = '處理中...';
                        
                        // 獲取表單數據
                        const formData = new FormData(form);
                        
                        // 構造日期時間字符串
                        const dateStr = formData.get('date');
                        const timeStr = formData.get('time');
                        const timestamp = new Date(`${dateStr}T${timeStr}`);
                        
                        // 尿布數據
                        const diaperData = {
                            childId: currentChild.id,
                            timestamp: timestamp,
                            details: {
                                diaperType: formData.get('diaperType')
                            },
                            note: formData.get('note') || ''
                        };
                        
                        // 添加尿布記錄
                        await ActivityService.addDiaperActivity(diaperData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新尿布標籤
                        await this.refreshDiaperTab(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功添加尿布記錄', 'success');
                        
                        // 如果不是當前顯示的日期，切換到記錄日期
                        if (Utils.formatDate(this.currentDate) !== dateStr) {
                            this.currentDate = new Date(dateStr);
                            document.getElementById('activities-date').value = dateStr;
                        }
                    } catch (error) {
                        console.error('添加尿布記錄失敗:', error);
                        Utils.showToast(error.message || '添加尿布記錄失敗', 'error');
                        
                        // 恢復提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '保存';
                    }
                });
                
                // 設置默認時間
                const timeInput = form.querySelector('[name="time"]');
                if (timeInput) {
                    const now = new Date();
                    const hours = now.getHours().toString().padStart(2, '0');
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    timeInput.value = `${hours}:${minutes}`;
                }
            }
        } catch (error) {
            console.error('顯示添加尿布表單失敗:', error);
            Utils.showToast('載入表單失敗', 'error');
        }
    }
    
    /**
     * 顯示編輯活動表單
     * @param {string} activityId 活動ID
     */
    static async showEditActivityForm(activityId) {
        try {
            // 獲取活動數據
            const activity = await ActivityService.getActivityById(activityId);
            
            if (!activity) {
                throw new Error('找不到活動記錄');
            }
            
            let formContent;
            
            // 根據活動類型創建表單
            switch (activity.type) {
                case ActivityService.ACTIVITY_TYPES.FEED:
                    formContent = this.createFeedForm(activity);
                    break;
                case ActivityService.ACTIVITY_TYPES.SLEEP:
                    formContent = this.createSleepForm(activity);
                    break;
                case ActivityService.ACTIVITY_TYPES.DIAPER:
                    formContent = this.createDiaperForm(activity);
                    break;
                default:
                    throw new Error('不支持的活動類型');
            }
            
            // 獲取活動類型標籤
            const activityTypeLabels = {
                [ActivityService.ACTIVITY_TYPES.FEED]: '餵食',
                [ActivityService.ACTIVITY_TYPES.SLEEP]: '睡眠',
                [ActivityService.ACTIVITY_TYPES.DIAPER]: '尿布'
            };
            
            // 顯示模態框
            const closeModal = Utils.showModal(`編輯${activityTypeLabels[activity.type]}記錄`, formContent);
            
            // 根據活動類型處理表單
            switch (activity.type) {
                case ActivityService.ACTIVITY_TYPES.FEED:
                    this.handleFeedForm(activity, closeModal);
                    break;
                case ActivityService.ACTIVITY_TYPES.SLEEP:
                    this.handleSleepForm(activity, closeModal);
                    break;
                case ActivityService.ACTIVITY_TYPES.DIAPER:
                    this.handleDiaperForm(activity, closeModal);
                    break;
            }
        } catch (error) {
            console.error('顯示編輯活動表單失敗:', error);
            Utils.showToast('載入活動數據失敗', 'error');
        }
    }
    
    /**
     * 處理餵食表單
     * @param {Object} activity 活動數據
     * @param {Function} closeModal 關閉模態框函數
     */
    static handleFeedForm(activity, closeModal) {
        const form = document.getElementById('feed-form');
        
        if (!form) return;
        
        // 處理表單提交
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // 禁用提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.textContent = '處理中...';
                
                // 獲取表單數據
                const formData = new FormData(form);
                
                // 構造日期時間字符串
                const dateStr = formData.get('date');
                const timeStr = formData.get('time');
                const timestamp = new Date(`${dateStr}T${timeStr}`);
                
                // 餵食數據
                const feedData = {
                    id: activity.id,
                    timestamp: timestamp,
                    details: {
                        feedType: formData.get('feedType'),
                    },
                    note: formData.get('note') || ''
                };
                
                // 添加特定類型的額外字段
                switch (feedData.details.feedType) {
                    case 'formula':
                    case 'water':
                        feedData.details.amount = formData.get('amount') || 0;
                        break;
                    case 'breast_left':
                    case 'breast_right':
                    case 'breast_both':
                        feedData.details.duration = formData.get('duration') || 0;
                        break;
                }
                
                // 更新活動
                await ActivityService.updateActivity(activity.id, feedData);
                
                // 關閉模態框
                closeModal();
                
                // 刷新餵食標籤
                await this.refreshFeedTab(activity.childId);
                
                // 顯示成功提示
                Utils.showToast('成功更新餵食記錄', 'success');
            } catch (error) {
                console.error('更新餵食記錄失敗:', error);
                Utils.showToast(error.message || '更新餵食記錄失敗', 'error');
                
                // 恢復提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = '保存';
            }
        });
        
        // 處理餵食類型變更
        const feedTypeSelect = form.querySelector('[name="feedType"]');
        if (feedTypeSelect) {
            this.handleFeedTypeChange(feedTypeSelect.value, form);
            
            feedTypeSelect.addEventListener('change', (e) => {
                this.handleFeedTypeChange(e.target.value, form);
            });
        }
    }
    
    /**
     * 處理睡眠表單
     * @param {Object} activity 活動數據
     * @param {Function} closeModal 關閉模態框函數
     */
    static handleSleepForm(activity, closeModal) {
        const form = document.getElementById('sleep-form');
        
        if (!form) return;
        
        // 處理表單提交
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // 禁用提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.textContent = '處理中...';
                
                // 獲取表單數據
                const formData = new FormData(form);
                
                // 構造開始日期時間
                const startDateStr = formData.get('startDate');
                const startTimeStr = formData.get('startTime');
                const startTimestamp = new Date(`${startDateStr}T${startTimeStr}`);
                
                // 構造結束日期時間（如果有）
                let endTimestamp = null;
                
                if (formData.get('isComplete') === 'yes') {
                    const endDateStr = formData.get('endDate');
                    const endTimeStr = formData.get('endTime');
                    endTimestamp = new Date(`${endDateStr}T${endTimeStr}`);
                    
                    // 驗證結束時間是否晚於開始時間
                    if (endTimestamp <= startTimestamp) {
                        throw new Error('睡眠結束時間必須晚於開始時間');
                    }
                }
                
                // 睡眠數據
                const sleepData = {
                    id: activity.id,
                    timestamp: startTimestamp,
                    endTime: endTimestamp,
                    details: {
                        location: formData.get('location') || ''
                    },
                    note: formData.get('note') || ''
                };
                
                // 更新活動
                await ActivityService.updateActivity(activity.id, sleepData);
                
                // 關閉模態框
                closeModal();
                
                // 刷新睡眠標籤
                await this.refreshSleepTab(activity.childId);
                
                // 顯示成功提示
                Utils.showToast('成功更新睡眠記錄', 'success');
            } catch (error) {
                console.error('更新睡眠記錄失敗:', error);
                Utils.showToast(error.message || '更新睡眠記錄失敗', 'error');
                
                // 恢復提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = '保存';
            }
        });
        
        // 處理是否完成
        const completeRadio = form.querySelectorAll('[name="isComplete"]');
        if (completeRadio.length) {
            this.handleCompletionChange(form.querySelector('[name="isComplete"]:checked').value, form);
            
            completeRadio.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.handleCompletionChange(e.target.value, form);
                });
            });
        }
    }
    
    /**
     * 處理尿布表單
     * @param {Object} activity 活動數據
     * @param {Function} closeModal 關閉模態框函數
     */
    static handleDiaperForm(activity, closeModal) {
        const form = document.getElementById('diaper-form');
        
        if (!form) return;
        
        // 處理表單提交
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // 禁用提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.textContent = '處理中...';
                
                // 獲取表單數據
                const formData = new FormData(form);
                
                // 構造日期時間字符串
                const dateStr = formData.get('date');
                const timeStr = formData.get('time');
                const timestamp = new Date(`${dateStr}T${timeStr}`);
                
                // 尿布數據
                const diaperData = {
                    id: activity.id,
                    timestamp: timestamp,
                    details: {
                        diaperType: formData.get('diaperType')
                    },
                    note: formData.get('note') || ''
                };
                
                // 更新活動
                await ActivityService.updateActivity(activity.id, diaperData);
                
                // 關閉模態框
                closeModal();
                
                // 刷新尿布標籤
                await this.refreshDiaperTab(activity.childId);
                
                // 顯示成功提示
                Utils.showToast('成功更新尿布記錄', 'success');
            } catch (error) {
                console.error('更新尿布記錄失敗:', error);
                Utils.showToast(error.message || '更新尿布記錄失敗', 'error');
                
                // 恢復提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = '保存';
            }
        });
    }
    
    /**
     * 顯示刪除活動確認對話框
     * @param {string} activityId 活動ID
     */
    static async showDeleteActivityConfirm(activityId) {
        try {
            // 獲取活動數據
            const activity = await ActivityService.getActivityById(activityId);
            
            if (!activity) {
                throw new Error('找不到活動記錄');
            }
            
            // 獲取活動類型標籤
            const activityTypeLabels = {
                [ActivityService.ACTIVITY_TYPES.FEED]: '餵食',
                [ActivityService.ACTIVITY_TYPES.SLEEP]: '睡眠',
                [ActivityService.ACTIVITY_TYPES.DIAPER]: '尿布'
            };
            
            // 顯示確認對話框
            Utils.showConfirm(
                `刪除${activityTypeLabels[activity.type]}記錄`,
                `您確定要刪除這條${activityTypeLabels[activity.type]}記錄嗎？此操作無法撤銷。`,
                async () => {
                    try {
                        // 刪除活動
                        await ActivityService.deleteActivity(activityId);
                        
                        // 刷新當前標籤
                        this.refreshTabContent(this.currentTab);
                        
                        // 顯示成功提示
                        Utils.showToast(`已刪除${activityTypeLabels[activity.type]}記錄`, 'success');
                    } catch (error) {
                        console.error('刪除活動記錄失敗:', error);
                        Utils.showToast(error.message || '刪除活動記錄失敗', 'error');
                    }
                }
            );
        } catch (error) {
            console.error('顯示刪除活動確認失敗:', error);
            Utils.showToast('載入活動數據失敗', 'error');
        }
    }
    
    /**
     * 結束睡眠活動
     * @param {string} activityId 活動ID
     */
    static async endSleepActivity(activityId) {
        try {
            // 獲取活動數據
            const activity = await ActivityService.getActivityById(activityId);
            
            if (!activity) {
                throw new Error('找不到睡眠記錄');
            }
            
            if (activity.type !== ActivityService.ACTIVITY_TYPES.SLEEP) {
                throw new Error('不是睡眠記錄');
            }
            
            if (activity.endTime) {
                throw new Error('此睡眠記錄已結束');
            }
            
            // 創建表單內容
            const formContent = document.createElement('div');
            
            // 計算睡眠開始時間
            const startTime = Utils.formatDateTime(activity.timestamp);
            
            // 預設結束時間為當前時間
            const now = new Date();
            const endDate = Utils.formatDate(now);
            const endTime = Utils.formatTime(now);
            
            // 計算預計時長
            const durationMinutes = Utils.getMinutesBetween(activity.timestamp, now);
            const durationText = Utils.formatDuration(durationMinutes);
            
            formContent.innerHTML = `
                <div>
                    <p><strong>開始時間:</strong> ${startTime}</p>
                    <p><strong>預計時長:</strong> ${durationText}</p>
                </div>
                
                <form id="end-sleep-form" class="form">
                    <div class="form-group">
                        <label for="endDate">結束日期</label>
                        <input type="date" id="endDate" name="endDate" value="${endDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="endTime">結束時間</label>
                        <input type="time" id="endTime" name="endTime" value="${endTime}" required>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" id="cancel-btn" class="secondary-btn">取消</button>
                        <button type="submit" class="primary-btn">保存</button>
                    </div>
                </form>
            `;
            
            // 顯示模態框
            const closeModal = Utils.showModal('結束睡眠', formContent);
            
            // 綁定取消按鈕
            const cancelBtn = formContent.querySelector('#cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    closeModal();
                });
            }
            
            // 處理表單提交
            const form = formContent.querySelector('#end-sleep-form');
            
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    try {
                        // 禁用提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = true;
                        submitBtn.textContent = '處理中...';
                        
                        // 獲取表單數據
                        const formData = new FormData(form);
                        
                        // 構造結束日期時間
                        const endDateStr = formData.get('endDate');
                        const endTimeStr = formData.get('endTime');
                        const endTimestamp = new Date(`${endDateStr}T${endTimeStr}`);
                        
                        // 驗證結束時間是否晚於開始時間
                        if (endTimestamp <= new Date(activity.timestamp)) {
                            throw new Error('睡眠結束時間必須晚於開始時間');
                        }
                        
                        // 更新睡眠結束時間
                        await ActivityService.updateSleepEndTime(activityId, endTimestamp);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新睡眠標籤
                        await this.refreshSleepTab(activity.childId);
                        
                        // 顯示成功提示
                        Utils.showToast('成功結束睡眠記錄', 'success');
                    } catch (error) {
                        console.error('結束睡眠記錄失敗:', error);
                        Utils.showToast(error.message || '結束睡眠記錄失敗', 'error');
                        
                        // 恢復提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '保存';
                    }
                });
            }
        } catch (error) {
            console.error('顯示結束睡眠表單失敗:', error);
            Utils.showToast(error.message || '載入睡眠數據失敗', 'error');
        }
    }
    
    /**
     * 創建餵食表單
     * @param {Object} [activity] 活動數據（用於編輯）
     * @returns {HTMLElement} 表單元素
     */
    static createFeedForm(activity = null) {
        const isEdit = !!activity;
        const details = isEdit ? (activity.details || {}) : {};
        
        // 創建表單容器
        const formContainer = document.createElement('div');
        
        // 設置默認值
        const now = new Date();
        const date = isEdit ? Utils.formatDate(activity.timestamp) : Utils.formatDate(now);
        const time = isEdit ? Utils.formatTime(activity.timestamp) : '';
        const feedType = isEdit ? (details.feedType || 'formula') : 'formula';
        const amount = isEdit && details.amount ? details.amount : '';
        const duration = isEdit && details.duration ? details.duration : '';
        const note = isEdit ? (activity.note || '') : '';
        
        // 構建表單HTML
        formContainer.innerHTML = `
            <form id="feed-form" class="form">
                <div class="form-group">
                    <label for="date">日期</label>
                    <input type="date" id="date" name="date" value="${date}" required>
                </div>
                
                <div class="form-group">
                    <label for="time">時間</label>
                    <input type="time" id="time" name="time" value="${time}" required>
                </div>
                
                <div class="form-group">
                    <label for="feedType">餵食類型</label>
                    <select id="feedType" name="feedType" required>
                        <option value="formula" ${feedType === 'formula' ? 'selected' : ''}>配方奶</option>
                        <option value="breast_left" ${feedType === 'breast_left' ? 'selected' : ''}>左側母乳</option>
                        <option value="breast_right" ${feedType === 'breast_right' ? 'selected' : ''}>右側母乳</option>
                        <option value="breast_both" ${feedType === 'breast_both' ? 'selected' : ''}>雙側母乳</option>
                        <option value="solid" ${feedType === 'solid' ? 'selected' : ''}>副食品</option>
                        <option value="water" ${feedType === 'water' ? 'selected' : ''}>水</option>
                        <option value="other" ${feedType === 'other' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
                
                <div id="amount-group" class="form-group hidden">
                    <label for="amount">數量 (ml)</label>
                    <input type="number" id="amount" name="amount" min="0" step="5" value="${amount}">
                </div>
                
                <div id="duration-group" class="form-group hidden">
                    <label for="duration">時間 (分鐘)</label>
                    <input type="number" id="duration" name="duration" min="0" step="1" value="${duration}">
                </div>
                
                <div class="form-group">
                    <label for="note">備註</label>
                    <textarea id="note" name="note" rows="3">${note}</textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="cancel-btn" class="secondary-btn">取消</button>
                    <button type="submit" class="primary-btn">保存</button>
                </div>
            </form>
        `;
        
        // 綁定取消按鈕
        const cancelBtn = formContainer.querySelector('#cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.getElementById('close-modal').click();
            });
        }
        
        return formContainer;
    }
    
    /**
     * 創建睡眠表單
     * @param {Object} [activity] 活動數據（用於編輯）
     * @returns {HTMLElement} 表單元素
     */
    static createSleepForm(activity = null) {
        const isEdit = !!activity;
        const details = isEdit ? (activity.details || {}) : {};
        
        // 創建表單容器
        const formContainer = document.createElement('div');
        
        // 設置默認值
        const now = new Date();
        const startDate = isEdit ? Utils.formatDate(activity.timestamp) : Utils.formatDate(now);
        const startTime = isEdit ? Utils.formatTime(activity.timestamp) : '';
        
        const isComplete = isEdit && activity.endTime;
        const endDate = isComplete ? Utils.formatDate(activity.endTime) : Utils.formatDate(now);
        const endTime = isComplete ? Utils.formatTime(activity.endTime) : Utils.formatTime(now);
        
        const location = isEdit && details.location ? details.location : '';
        const note = isEdit ? (activity.note || '') : '';
        
        // 構建表單HTML
        formContainer.innerHTML = `
            <form id="sleep-form" class="form">
                <div class="form-group">
                    <label for="startDate">開始日期</label>
                    <input type="date" id="startDate" name="startDate" value="${startDate}" required>
                </div>
                
                <div class="form-group">
                    <label for="startTime">開始時間</label>
                    <input type="time" id="startTime" name="startTime" value="${startTime}" required>
                </div>
                
                <div class="form-group">
                    <label>是否已結束</label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="isComplete" value="yes" ${isComplete ? 'checked' : ''}>
                            已結束
                        </label>
                        <label>
                            <input type="radio" name="isComplete" value="no" ${!isComplete ? 'checked' : ''}>
                            進行中
                        </label>
                    </div>
                </div>
                
                <div id="end-time-group" class="hidden">
                    <div class="form-group">
                        <label for="endDate">結束日期</label>
                        <input type="date" id="endDate" name="endDate" value="${endDate}">
                    </div>
                    
                    <div class="form-group">
                        <label for="endTime">結束時間</label>
                        <input type="time" id="endTime" name="endTime" value="${endTime}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="location">位置</label>
                    <select id="location" name="location">
                        <option value="" ${location === '' ? 'selected' : ''}>未指定</option>
                        <option value="crib" ${location === 'crib' ? 'selected' : ''}>嬰兒床</option>
                        <option value="bed" ${location === 'bed' ? 'selected' : ''}>大床</option>
                        <option value="stroller" ${location === 'stroller' ? 'selected' : ''}>推車</option>
                        <option value="car" ${location === 'car' ? 'selected' : ''}>汽車</option>
                        <option value="carrier" ${location === 'carrier' ? 'selected' : ''}>背巾/揹帶</option>
                        <option value="other" ${location === 'other' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="note">備註</label>
                    <textarea id="note" name="note" rows="3">${note}</textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="cancel-btn" class="secondary-btn">取消</button>
                    <button type="submit" class="primary-btn">保存</button>
                </div>
            </form>
        `;
        
        // 綁定取消按鈕
        const cancelBtn = formContainer.querySelector('#cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.getElementById('close-modal').click();
            });
        }
        
        return formContainer;
    }
    
    /**
     * 創建尿布表單
     * @param {Object} [activity] 活動數據（用於編輯）
     * @returns {HTMLElement} 表單元素
     */
    static createDiaperForm(activity = null) {
        const isEdit = !!activity;
        const details = isEdit ? (activity.details || {}) : {};
        
        // 創建表單容器
        const formContainer = document.createElement('div');
        
        // 設置默認值
        const now = new Date();
        const date = isEdit ? Utils.formatDate(activity.timestamp) : Utils.formatDate(now);
        const time = isEdit ? Utils.formatTime(activity.timestamp) : '';
        const diaperType = isEdit ? (details.diaperType || 'wet') : 'wet';
        const note = isEdit ? (activity.note || '') : '';
        
        // 構建表單HTML
        formContainer.innerHTML = `
            <form id="diaper-form" class="form">
                <div class="form-group">
                    <label for="date">日期</label>
                    <input type="date" id="date" name="date" value="${date}" required>
                </div>
                
                <div class="form-group">
                    <label for="time">時間</label>
                    <input type="time" id="time" name="time" value="${time}" required>
                </div>
                
                <div class="form-group">
                    <label for="diaperType">尿布類型</label>
                    <select id="diaperType" name="diaperType" required>
                        <option value="wet" ${diaperType === 'wet' ? 'selected' : ''}>尿溼</option>
                        <option value="dirty" ${diaperType === 'dirty' ? 'selected' : ''}>大便</option>
                        <option value="mixed" ${diaperType === 'mixed' ? 'selected' : ''}>混合</option>
                        <option value="dry" ${diaperType === 'dry' ? 'selected' : ''}>乾淨</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="note">備註</label>
                    <textarea id="note" name="note" rows="3">${note}</textarea>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="cancel-btn" class="secondary-btn">取消</button>
                    <button type="submit" class="primary-btn">保存</button>
                </div>
            </form>
        `;
        
        // 綁定取消按鈕
        const cancelBtn = formContainer.querySelector('#cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.getElementById('close-modal').click();
            });
        }
        
        return formContainer;
    }
    
    /**
     * 處理餵食類型變更
     * @param {string} feedType 餵食類型
     * @param {HTMLElement} form 表單元素
     */
    static handleFeedTypeChange(feedType, form) {
        const amountGroup = form.querySelector('#amount-group');
        const durationGroup = form.querySelector('#duration-group');
        
        // 隱藏所有可選字段
        amountGroup.classList.add('hidden');
        durationGroup.classList.add('hidden');
        
        // 顯示特定字段
        switch (feedType) {
            case 'formula':
            case 'water':
                amountGroup.classList.remove('hidden');
                break;
            case 'breast_left':
            case 'breast_right':
            case 'breast_both':
                durationGroup.classList.remove('hidden');
                break;
        }
    }
    
    /**
     * 處理完成狀態變更
     * @param {string} isComplete 是否完成
     * @param {HTMLElement} form 表單元素
     */
    static handleCompletionChange(isComplete, form) {
        const endTimeGroup = form.querySelector('#end-time-group');
        
        if (isComplete === 'yes') {
            endTimeGroup.classList.remove('hidden');
            
            // 設置結束時間輸入為必填
            const endDateInput = form.querySelector('#endDate');
            const endTimeInput = form.querySelector('#endTime');
            
            if (endDateInput) endDateInput.required = true;
            if (endTimeInput) endTimeInput.required = true;
        } else {
            endTimeGroup.classList.add('hidden');
            
            // 取消結束時間輸入必填
            const endDateInput = form.querySelector('#endDate');
            const endTimeInput = form.querySelector('#endTime');
            
            if (endDateInput) endDateInput.required = false;
            if (endTimeInput) endTimeInput.required = false;
        }
    }
}

// 導出視圖
window.ActivityView = ActivityView;