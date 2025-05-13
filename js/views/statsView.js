/**
 * 統計視圖 - 處理數據統計與圖表相關的UI
 */
class StatsView {
    /**
     * 當前選中的統計頁籤
     */
    static currentTab = 'feeding-stats';
    
    /**
     * 當前選中的時間週期
     */
    static currentPeriod = 'week';
    
    /**
     * 自定義時間範圍
     */
    static customRange = {
        startDate: null,
        endDate: null
    };
    
    /**
     * 圖表實例缓存
     */
    static charts = {
        feeding: null,
        sleep: null,
        diaper: null,
        growth: null
    };
    
    /**
     * 初始化統計視圖
     */
    static init() {
        this.setupEventListeners();
    }
    
    /**
     * 設置事件監聽器
     */
    static setupEventListeners() {
        // 統計標籤切換
        document.querySelectorAll('.tab-btn[data-tab]').forEach(tab => {
            if (tab.closest('#stats-page')) {
                tab.addEventListener('click', (e) => {
                    const tabName = e.currentTarget.getAttribute('data-tab');
                    this.switchTab(tabName);
                });
            }
        });
        
        // 統計週期切換
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const period = e.currentTarget.getAttribute('data-period');
                this.switchPeriod(period);
            });
        });
        
        // 自定義時間範圍控制
        const applyCustomBtn = document.getElementById('apply-custom-period');
        if (applyCustomBtn) {
            applyCustomBtn.addEventListener('click', () => {
                this.applyCustomPeriod();
            });
        }
    }
    
    /**
     * 切換統計標籤
     * @param {string} tabName 標籤名稱
     */
    static switchTab(tabName) {
        // 更新標籤按鈕
        document.querySelectorAll('.tab-btn[data-tab]').forEach(tab => {
            if (tab.closest('#stats-page')) {
                if (tab.getAttribute('data-tab') === tabName) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            }
        });
        
        // 更新標籤內容
        document.querySelectorAll('.tab-pane').forEach(pane => {
            if (pane.closest('#stats-page')) {
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
        this.refreshStatsView();
    }
    
    /**
     * 切換統計週期
     * @param {string} period 週期名稱
     */
    static switchPeriod(period) {
        // 更新週期按鈕
        document.querySelectorAll('.period-btn').forEach(btn => {
            if (btn.getAttribute('data-period') === period) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // 更新當前週期
        this.currentPeriod = period;
        
        // 處理自定義週期控制
        const customPeriodDiv = document.getElementById('custom-period');
        if (customPeriodDiv) {
            if (period === 'custom') {
                customPeriodDiv.classList.remove('hidden');
                
                // 設置默認日期範圍（如果未設置）
                const startDateInput = document.getElementById('stats-start-date');
                const endDateInput = document.getElementById('stats-end-date');
                
                if (startDateInput && !startDateInput.value) {
                    const defaultStart = new Date();
                    defaultStart.setDate(defaultStart.getDate() - 30); // 默認過去30天
                    startDateInput.value = Utils.formatDate(defaultStart);
                    this.customRange.startDate = defaultStart;
                }
                
                if (endDateInput && !endDateInput.value) {
                    endDateInput.value = Utils.formatDate(new Date());
                    this.customRange.endDate = new Date();
                }
            } else {
                customPeriodDiv.classList.add('hidden');
                
                // 刷新統計視圖
                this.refreshStatsView();
            }
        }
    }
    
    /**
     * 應用自定義時間範圍
     */
    static applyCustomPeriod() {
        const startDateInput = document.getElementById('stats-start-date');
        const endDateInput = document.getElementById('stats-end-date');
        
        if (!startDateInput || !endDateInput) return;
        
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        
        // 驗證日期範圍
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            Utils.showToast('請輸入有效的日期範圍', 'warning');
            return;
        }
        
        if (startDate > endDate) {
            Utils.showToast('開始日期不能晚於結束日期', 'warning');
            return;
        }
        
        // 設置自定義範圍
        this.customRange.startDate = startDate;
        this.customRange.endDate = endDate;
        
        // 刷新統計視圖
        this.refreshStatsView();
    }
    
    /**
     * 刷新統計視圖
     */
    static async refreshStatsView() {
        // 檢查是否有選擇孩子
        const currentChild = await ChildService.getCurrentChild();
        
        if (!currentChild) {
            this.showNoChildSelectedMessage();
            return;
        }
        
        // 計算日期範圍
        const { startDate, endDate } = this.calculateDateRange();
        
        // 獲取活動統計數據
        try {
            const stats = await ActivityService.getActivityStats(currentChild.id, startDate, endDate);
            
            // 更新當前標籤內容
            switch (this.currentTab) {
                case 'feeding-stats':
                    this.updateFeedingStats(stats);
                    break;
                case 'sleep-stats':
                    this.updateSleepStats(stats);
                    break;
                case 'diaper-stats':
                    this.updateDiaperStats(stats);
                    break;
                case 'growth-stats':
                    this.updateGrowthStats(currentChild.id, startDate, endDate);
                    break;
            }
        } catch (error) {
            console.error('獲取統計數據失敗:', error);
            Utils.showToast('載入統計數據失敗', 'error');
        }
    }
    
    /**
     * 計算當前週期的日期範圍
     * @returns {Object} 日期範圍 {startDate, endDate}
     */
    static calculateDateRange() {
        const now = new Date();
        let startDate, endDate;
        
        switch (this.currentPeriod) {
            case 'week':
                // 過去7天
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
                
            case 'month':
                // 過去30天
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 29);
                startDate.setHours(0, 0, 0, 0);
                
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
                
            case 'custom':
                // 使用自定義範圍
                if (this.customRange.startDate && this.customRange.endDate) {
                    startDate = new Date(this.customRange.startDate);
                    startDate.setHours(0, 0, 0, 0);
                    
                    endDate = new Date(this.customRange.endDate);
                    endDate.setHours(23, 59, 59, 999);
                } else {
                    // 默認過去30天
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 29);
                    startDate.setHours(0, 0, 0, 0);
                    
                    endDate = new Date(now);
                    endDate.setHours(23, 59, 59, 999);
                }
                break;
        }
        
        return { startDate, endDate };
    }
    
    /**
     * 顯示無孩子選擇訊息
     */
    static showNoChildSelectedMessage() {
        const containers = [
            document.getElementById('feeding-chart'),
            document.getElementById('sleep-chart'),
            document.getElementById('diaper-chart'),
            document.getElementById('growth-chart')
        ];
        
        containers.forEach(container => {
            if (container) {
                container.innerHTML = '';
            }
        });
        
        const summaries = [
            document.getElementById('feeding-summary'),
            document.getElementById('sleep-summary'),
            document.getElementById('diaper-summary'),
            document.getElementById('growth-summary')
        ];
        
        summaries.forEach(summary => {
            if (summary) {
                summary.innerHTML = `
                    <div class="no-child-selected">
                        <p>請先選擇一個孩子</p>
                        <button id="select-child-btn" class="primary-btn">選擇孩子</button>
                    </div>
                `;
                
                const selectBtn = summary.querySelector('#select-child-btn');
                if (selectBtn) {
                    selectBtn.addEventListener('click', () => {
                        app.navigateTo('children');
                    });
                }
            }
        });
    }
    
    /**
     * 更新餵食統計
     * @param {Object} stats 統計數據
     */
    static updateFeedingStats(stats) {
        // 更新摘要信息
        this.updateFeedingSummary(stats);
        
        // 更新圖表
        this.updateFeedingChart(stats);
    }
    
    /**
     * 更新餵食摘要
     * @param {Object} stats 統計數據
     */
    static updateFeedingSummary(stats) {
        const summaryContainer = document.getElementById('feeding-summary');
        
        if (!summaryContainer) return;
        
        const feedStats = stats.feed;
        
        // 日均餵食次數和統計週期
        const periodLabel = this.getPeriodLabel();
        
        // 構建摘要HTML
        let summaryHTML = `
            <div class="stats-summary-section">
                <h4>${periodLabel}餵食摘要</h4>
                <div class="stats-grid">
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.total}</div>
                        <div class="stats-label">總餵食次數</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.avgPerDay}</div>
                        <div class="stats-label">日均次數</div>
                    </div>
                </div>
            </div>
        `;
        
        // 餵食類型分佈
        summaryHTML += `
            <div class="stats-summary-section">
                <h4>餵食類型分佈</h4>
                <div class="stats-grid">
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.byType.breast_left + feedStats.byType.breast_right + feedStats.byType.breast_both}</div>
                        <div class="stats-label">母乳餵食</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.byType.formula}</div>
                        <div class="stats-label">配方奶</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.byType.solid}</div>
                        <div class="stats-label">副食品</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.byType.water + feedStats.byType.other}</div>
                        <div class="stats-label">水/其他</div>
                    </div>
                </div>
            </div>
        `;
        
        // 餵食量統計（如果有）
        if (feedStats.amounts.formula > 0 || feedStats.amounts.water > 0) {
            summaryHTML += `
                <div class="stats-summary-section">
                    <h4>餵食量統計</h4>
                    <div class="stats-grid">
                        ${feedStats.amounts.formula > 0 ? `
                            <div class="stats-item">
                                <div class="stats-value">${feedStats.amounts.formula} ml</div>
                                <div class="stats-label">配方奶總量</div>
                            </div>
                        ` : ''}
                        ${feedStats.amounts.water > 0 ? `
                            <div class="stats-item">
                                <div class="stats-value">${feedStats.amounts.water} ml</div>
                                <div class="stats-label">水總量</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // 餵食時間分佈
        summaryHTML += `
            <div class="stats-summary-section">
                <h4>餵食時間分佈</h4>
                <div class="stats-grid">
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.distribution.morning}</div>
                        <div class="stats-label">早上 (6-12點)</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.distribution.afternoon}</div>
                        <div class="stats-label">下午 (12-18點)</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.distribution.evening}</div>
                        <div class="stats-label">晚上 (18-24點)</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${feedStats.distribution.night}</div>
                        <div class="stats-label">凌晨 (0-6點)</div>
                    </div>
                </div>
            </div>
        `;
        
        summaryContainer.innerHTML = summaryHTML;
    }
    
    /**
     * 更新餵食圖表
     * @param {Object} stats 統計數據
     */
    static updateFeedingChart(stats) {
        const chartContainer = document.getElementById('feeding-chart');
        
        if (!chartContainer) return;
        
        // 準備圖表數據
        const dailyData = stats.daily;
        const labels = dailyData.map(d => d.date);
        const feedingData = dailyData.map(d => d.feed);
        
        // 銷毀舊圖表（如果有）
        if (this.charts.feeding) {
            this.charts.feeding.destroy();
        }
        
        // 創建圖表上下文
        const ctx = chartContainer.getContext('2d');
        
        // 創建新圖表
        this.charts.feeding = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '餵食次數',
                    data: feedingData,
                    backgroundColor: 'rgba(66, 133, 244, 0.6)',
                    borderColor: 'rgba(66, 133, 244, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '每日餵食次數'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return `日期: ${tooltipItems[0].label}`;
                            },
                            label: function(context) {
                                return `餵食次數: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * 更新睡眠統計
     * @param {Object} stats 統計數據
     */
    static updateSleepStats(stats) {
        // 更新摘要信息
        this.updateSleepSummary(stats);
        
        // 更新圖表
        this.updateSleepChart(stats);
    }
    
    /**
     * 更新睡眠摘要
     * @param {Object} stats 統計數據
     */
    static updateSleepSummary(stats) {
        const summaryContainer = document.getElementById('sleep-summary');
        
        if (!summaryContainer) return;
        
        const sleepStats = stats.sleep;
        
        // 日均睡眠次數和時長
        const periodLabel = this.getPeriodLabel();
        
        // 構建摘要HTML
        let summaryHTML = `
            <div class="stats-summary-section">
                <h4>${periodLabel}睡眠摘要</h4>
                <div class="stats-grid">
                    <div class="stats-item">
                        <div class="stats-value">${sleepStats.total}</div>
                        <div class="stats-label">總睡眠次數</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${sleepStats.completed}</div>
                        <div class="stats-label">已完成次數</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${Utils.formatDuration(sleepStats.avgDailyTotal)}</div>
                        <div class="stats-label">日均睡眠時長</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${Utils.formatDuration(sleepStats.avgDuration)}</div>
                        <div class="stats-label">平均每次時長</div>
                    </div>
                </div>
            </div>
        `;
        
        // 最長睡眠時長
        if (sleepStats.maxDuration > 0) {
            summaryHTML += `
                <div class="stats-summary-section">
                    <h4>最長睡眠時長</h4>
                    <div class="stats-grid">
                        <div class="stats-item">
                            <div class="stats-value">${Utils.formatDuration(sleepStats.maxDuration)}</div>
                            <div class="stats-label">最長一次睡眠</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // 入睡時間分佈
        summaryHTML += `
            <div class="stats-summary-section">
                <h4>入睡時間分佈</h4>
                <div class="stats-grid">
                    <div class="stats-item">
                        <div class="stats-value">${sleepStats.distribution.morning}</div>
                        <div class="stats-label">早上 (6-12點)</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${sleepStats.distribution.afternoon}</div>
                        <div class="stats-label">下午 (12-18點)</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${sleepStats.distribution.evening}</div>
                        <div class="stats-label">晚上 (18-24點)</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${sleepStats.distribution.night}</div>
                        <div class="stats-label">凌晨 (0-6點)</div>
                    </div>
                </div>
            </div>
        `;
        
        summaryContainer.innerHTML = summaryHTML;
    }
    
    /**
     * 更新睡眠圖表
     * @param {Object} stats 統計數據
     */
    static updateSleepChart(stats) {
        const chartContainer = document.getElementById('sleep-chart');
        
        if (!chartContainer) return;
        
        // 準備圖表數據
        const dailyData = stats.daily;
        const labels = dailyData.map(d => d.date);
        const sleepData = dailyData.map(d => d.sleepDuration);
        
        // 銷毀舊圖表（如果有）
        if (this.charts.sleep) {
            this.charts.sleep.destroy();
        }
        
        // 創建圖表上下文
        const ctx = chartContainer.getContext('2d');
        
        // 創建新圖表
        this.charts.sleep = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '睡眠時長 (分鐘)',
                    data: sleepData,
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    borderColor: 'rgba(255, 152, 0, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return Utils.formatDuration(value);
                            }
                        },
                        title: {
                            display: true,
                            text: '睡眠時長'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '每日睡眠時長'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return `日期: ${tooltipItems[0].label}`;
                            },
                            label: function(context) {
                                return `睡眠時長: ${Utils.formatDuration(context.raw)}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * 更新尿布統計
     * @param {Object} stats 統計數據
     */
    static updateDiaperStats(stats) {
        // 更新摘要信息
        this.updateDiaperSummary(stats);
        
        // 更新圖表
        this.updateDiaperChart(stats);
    }
    
    /**
     * 更新尿布摘要
     * @param {Object} stats 統計數據
     */
    static updateDiaperSummary(stats) {
        const summaryContainer = document.getElementById('diaper-summary');
        
        if (!summaryContainer) return;
        
        const diaperStats = stats.diaper;
        
        // 日均尿布次數
        const periodLabel = this.getPeriodLabel();
        
        // 構建摘要HTML
        let summaryHTML = `
            <div class="stats-summary-section">
                <h4>${periodLabel}尿布摘要</h4>
                <div class="stats-grid">
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.total}</div>
                        <div class="stats-label">總更換次數</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.avgPerDay}</div>
                        <div class="stats-label">日均次數</div>
                    </div>
                </div>
            </div>
        `;
        
        // 尿布類型分佈
        summaryHTML += `
            <div class="stats-summary-section">
                <h4>尿布類型分佈</h4>
                <div class="stats-grid">
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.byType.wet}</div>
                        <div class="stats-label">尿溼</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.byType.dirty}</div>
                        <div class="stats-label">大便</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.byType.mixed}</div>
                        <div class="stats-label">混合</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.byType.dry}</div>
                        <div class="stats-label">乾淨</div>
                    </div>
                </div>
            </div>
        `;
        
        // 更換時間分佈
        summaryHTML += `
            <div class="stats-summary-section">
                <h4>更換時間分佈</h4>
                <div class="stats-grid">
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.distribution.morning}</div>
                        <div class="stats-label">早上 (6-12點)</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.distribution.afternoon}</div>
                        <div class="stats-label">下午 (12-18點)</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.distribution.evening}</div>
                        <div class="stats-label">晚上 (18-24點)</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${diaperStats.distribution.night}</div>
                        <div class="stats-label">凌晨 (0-6點)</div>
                    </div>
                </div>
            </div>
        `;
        
        summaryContainer.innerHTML = summaryHTML;
    }
    
    /**
     * 更新尿布圖表
     * @param {Object} stats 統計數據
     */
    static updateDiaperChart(stats) {
        const chartContainer = document.getElementById('diaper-chart');
        
        if (!chartContainer) return;
        
        // 準備圖表數據
        const dailyData = stats.daily;
        const labels = dailyData.map(d => d.date);
        const diaperData = dailyData.map(d => d.diaper);
        
        // 銷毀舊圖表（如果有）
        if (this.charts.diaper) {
            this.charts.diaper.destroy();
        }
        
        // 創建圖表上下文
        const ctx = chartContainer.getContext('2d');
        
        // 創建新圖表
        this.charts.diaper = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '尿布更換次數',
                    data: diaperData,
                    backgroundColor: 'rgba(76, 175, 80, 0.6)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '每日尿布更換次數'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                return `日期: ${tooltipItems[0].label}`;
                            },
                            label: function(context) {
                                return `尿布更換: ${context.raw} 次`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * 更新生長統計
     * @param {string} childId 孩子ID
     * @param {Date} startDate 開始日期
     * @param {Date} endDate 結束日期
     */
    static async updateGrowthStats(childId, startDate, endDate) {
        try {
            // 獲取生長記錄歷史
            const growthHistory = await HealthService.getGrowthHistory(childId);
            
            // 過濾日期範圍內的記錄
            const filteredGrowth = this.filterGrowthByDateRange(growthHistory, startDate, endDate);
            
            // 更新摘要信息
            this.updateGrowthSummary(childId, filteredGrowth);
            
            // 更新圖表
            this.updateGrowthChart(filteredGrowth);
        } catch (error) {
            console.error('獲取生長統計數據失敗:', error);
            Utils.showToast('載入生長統計失敗', 'error');
        }
    }
    
    /**
     * 過濾日期範圍內的生長記錄
     * @param {Object} growthHistory 生長記錄歷史
     * @param {Date} startDate 開始日期
     * @param {Date} endDate 結束日期
     * @returns {Object} 過濾後的生長記錄
     */
    static filterGrowthByDateRange(growthHistory, startDate, endDate) {
        // 如果沒有記錄，返回空數據
        if (!growthHistory.records || growthHistory.records.length === 0) {
            return {
                dates: [],
                weights: [],
                heights: [],
                headCircumferences: [],
                records: []
            };
        }
        
        // 過濾日期範圍內的記錄
        const filteredRecords = growthHistory.records.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= startDate && recordDate <= endDate;
        });
        
        // 排序記錄（按日期）
        filteredRecords.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // 準備數據
        const dates = filteredRecords.map(record => Utils.formatDate(record.timestamp));
        const weights = [];
        const heights = [];
        const headCircumferences = [];
        
        filteredRecords.forEach(record => {
            const details = record.details || {};
            
            weights.push(details.weight !== undefined ? parseFloat(details.weight) : null);
            heights.push(details.height !== undefined ? parseFloat(details.height) : null);
            headCircumferences.push(details.headCircumference !== undefined ? parseFloat(details.headCircumference) : null);
        });
        
        return {
            dates,
            weights,
            heights,
            headCircumferences,
            records: filteredRecords
        };
    }
    
    /**
     * 更新生長摘要
     * @param {string} childId 孩子ID
     * @param {Object} growthData 生長數據
     */
    static async updateGrowthSummary(childId, growthData) {
        const summaryContainer = document.getElementById('growth-summary');
        
        if (!summaryContainer) return;
        
        // 獲取孩子信息
        const child = await ChildService.getChildById(childId);
        if (!child) return;
        
        // 計算當前月齡
        const age = Utils.calculateAge(child.birthDate);
        const ageInMonths = age.years * 12 + age.months;
        
        // 獲取最新生長記錄
        const latestGrowthRecord = await HealthService.getLatestGrowthRecord(childId);
        
        // 構建摘要HTML
        let summaryHTML = `
            <div class="stats-summary-section">
                <h4>生長記錄摘要</h4>
                <div class="stats-grid">
                    <div class="stats-item">
                        <div class="stats-value">${growthData.records.length}</div>
                        <div class="stats-label">記錄次數</div>
                    </div>
                    <div class="stats-item">
                        <div class="stats-value">${age.years} 歲 ${age.months} 個月</div>
                        <div class="stats-label">當前年齡</div>
                    </div>
                </div>
            </div>
        `;
        
        // 最新測量數據（如果有）
        if (latestGrowthRecord && latestGrowthRecord.details) {
            const details = latestGrowthRecord.details;
            const measureDate = Utils.formatDate(latestGrowthRecord.timestamp);
            
            // 獲取百分位
            let percentiles = {};
            
            try {
                if (details.weight || details.height || details.headCircumference) {
                    const data = {
                        weight: details.weight,
                        height: details.height,
                        headCircumference: details.headCircumference
                    };
                    
                    percentiles = await HealthService.calculateGrowthPercentiles(childId, data);
                }
            } catch (error) {
                console.warn('計算百分位失敗:', error);
            }
            
            summaryHTML += `
                <div class="stats-summary-section">
                    <h4>最新測量 (${measureDate})</h4>
                    <div class="stats-grid">
                        ${details.weight ? `
                            <div class="stats-item">
                                <div class="stats-value">${Utils.formatWeight(details.weight)}</div>
                                <div class="stats-label">體重</div>
                                ${percentiles.weight ? `
                                    <div class="stats-percentile">${percentiles.weight.percentile.toFixed(0)}%</div>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        ${details.height ? `
                            <div class="stats-item">
                                <div class="stats-value">${Utils.formatHeight(details.height)}</div>
                                <div class="stats-label">身高</div>
                                ${percentiles.height ? `
                                    <div class="stats-percentile">${percentiles.height.percentile.toFixed(0)}%</div>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        ${details.headCircumference ? `
                            <div class="stats-item">
                                <div class="stats-value">${Utils.formatHeadCircumference(details.headCircumference)}</div>
                                <div class="stats-label">頭圍</div>
                                ${percentiles.headCircumference ? `
                                    <div class="stats-percentile">${percentiles.headCircumference.percentile.toFixed(0)}%</div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // 生長變化（如果有足夠數據）
        if (growthData.records.length >= 2) {
            // 計算變化率
            const firstRecord = growthData.records[0];
            const lastRecord = growthData.records[growthData.records.length - 1];
            
            const firstDetails = firstRecord.details || {};
            const lastDetails = lastRecord.details || {};
            
            // 計算時間差（天數）
            const firstDate = new Date(firstRecord.timestamp);
            const lastDate = new Date(lastRecord.timestamp);
            const daysDiff = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 0) {
                summaryHTML += `
                    <div class="stats-summary-section">
                        <h4>生長變化 (${daysDiff} 天)</h4>
                        <div class="stats-grid">
                `;
                
                // 體重變化
                if (firstDetails.weight !== undefined && lastDetails.weight !== undefined) {
                    const weightDiff = lastDetails.weight - firstDetails.weight;
                    const weightDiffLabel = weightDiff >= 0 ? `+${weightDiff.toFixed(2)}` : weightDiff.toFixed(2);
                    
                    summaryHTML += `
                        <div class="stats-item">
                            <div class="stats-value">${weightDiffLabel} kg</div>
                            <div class="stats-label">體重變化</div>
                        </div>
                    `;
                }
                
                // 身高變化
                if (firstDetails.height !== undefined && lastDetails.height !== undefined) {
                    const heightDiff = lastDetails.height - firstDetails.height;
                    const heightDiffLabel = heightDiff >= 0 ? `+${heightDiff.toFixed(1)}` : heightDiff.toFixed(1);
                    
                    summaryHTML += `
                        <div class="stats-item">
                            <div class="stats-value">${heightDiffLabel} cm</div>
                            <div class="stats-label">身高變化</div>
                        </div>
                    `;
                }
                
                // 頭圍變化
                if (firstDetails.headCircumference !== undefined && lastDetails.headCircumference !== undefined) {
                    const headDiff = lastDetails.headCircumference - firstDetails.headCircumference;
                    const headDiffLabel = headDiff >= 0 ? `+${headDiff.toFixed(1)}` : headDiff.toFixed(1);
                    
                    summaryHTML += `
                        <div class="stats-item">
                            <div class="stats-value">${headDiffLabel} cm</div>
                            <div class="stats-label">頭圍變化</div>
                        </div>
                    `;
                }
                
                summaryHTML += `
                        </div>
                    </div>
                `;
            }
        }
        
        summaryContainer.innerHTML = summaryHTML;
    }
    
    /**
     * 更新生長圖表
     * @param {Object} growthData 生長數據
     */
    static updateGrowthChart(growthData) {
        const chartContainer = document.getElementById('growth-chart');
        
        if (!chartContainer) return;
        
        // 如果沒有數據
        if (growthData.dates.length === 0) {
            chartContainer.innerHTML = '<div class="empty-chart">沒有生長記錄數據</div>';
            return;
        }
        
        // 銷毀舊圖表（如果有）
        if (this.charts.growth) {
            this.charts.growth.destroy();
        }
        
        // 創建圖表上下文
        const ctx = chartContainer.getContext('2d');
        
        // 準備數據集
        const datasets = [];
        
        // 體重數據（如果有）
        if (growthData.weights.some(w => w !== null)) {
            datasets.push({
                label: '體重 (kg)',
                data: growthData.weights,
                borderColor: 'rgba(66, 133, 244, 1)',
                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y-weight'
            });
        }
        
        // 身高數據（如果有）
        if (growthData.heights.some(h => h !== null)) {
            datasets.push({
                label: '身高 (cm)',
                data: growthData.heights,
                borderColor: 'rgba(76, 175, 80, 1)',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y-height'
            });
        }
        
        // 頭圍數據（如果有）
        if (growthData.headCircumferences.some(h => h !== null)) {
            datasets.push({
                label: '頭圍 (cm)',
                data: growthData.headCircumferences,
                borderColor: 'rgba(255, 152, 0, 1)',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                borderWidth: 2,
                fill: false,
                yAxisID: 'y-head'
            });
        }
        
        // 如果沒有有效數據
        if (datasets.length === 0) {
            chartContainer.innerHTML = '<div class="empty-chart">沒有有效的生長數據</div>';
            return;
        }
        
        // 計算Y軸範圍
        const yAxes = {};
        
        // 體重軸
        if (growthData.weights.some(w => w !== null)) {
            const weights = growthData.weights.filter(w => w !== null);
            const minWeight = Math.floor(Math.min(...weights) * 0.9);
            const maxWeight = Math.ceil(Math.max(...weights) * 1.1);
            
            yAxes['y-weight'] = {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: '體重 (kg)'
                },
                min: minWeight,
                max: maxWeight
            };
        }
        
        // 身高軸
        if (growthData.heights.some(h => h !== null)) {
            const heights = growthData.heights.filter(h => h !== null);
            const minHeight = Math.floor(Math.min(...heights) * 0.95);
            const maxHeight = Math.ceil(Math.max(...heights) * 1.05);
            
            yAxes['y-height'] = {
                type: 'linear',
                position: datasets.length > 1 ? 'right' : 'left',
                title: {
                    display: true,
                    text: '身高 (cm)'
                },
                min: minHeight,
                max: maxHeight,
                grid: {
                    drawOnChartArea: datasets.length === 1
                }
            };
        }
        
        // 頭圍軸（如果只有頭圍或是第三個數據集）
        if (growthData.headCircumferences.some(h => h !== null)) {
            const heads = growthData.headCircumferences.filter(h => h !== null);
            const minHead = Math.floor(Math.min(...heads) * 0.95);
            const maxHead = Math.ceil(Math.max(...heads) * 1.05);
            
            yAxes['y-head'] = {
                type: 'linear',
                position: datasets.length <= 1 ? 'left' : 'right',
                title: {
                    display: true,
                    text: '頭圍 (cm)'
                },
                min: minHead,
                max: maxHead,
                grid: {
                    drawOnChartArea: datasets.length <= 1
                }
            };
        }
        
        // 創建新圖表
        this.charts.growth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: growthData.dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: yAxes,
                plugins: {
                    title: {
                        display: true,
                        text: '生長記錄趨勢'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    }
    
    /**
     * 獲取週期標籤
     * @returns {string} 週期標籤
     */
    static getPeriodLabel() {
        switch (this.currentPeriod) {
            case 'week':
                return '過去 7 天';
            case 'month':
                return '過去 30 天';
            case 'custom':
                if (this.customRange.startDate && this.customRange.endDate) {
                    const start = Utils.formatDate(this.customRange.startDate);
                    const end = Utils.formatDate(this.customRange.endDate);
                    return `${start} 至 ${end}`;
                }
                return '自定義期間';
            default:
                return '';
        }
    }
}

// 導出視圖
window.StatsView = StatsView;