/**
 * 活動數據服務 - 處理日常活動記錄相關的數據操作
 */
class ActivityService {
    /**
     * 存儲表名
     * @type {string}
     */
    static STORE_NAME = 'dailyActivities';
    
    /**
     * 活動類型列表
     * @type {Object}
     */
    static ACTIVITY_TYPES = {
        FEED: 'feed',
        SLEEP: 'sleep',
        DIAPER: 'diaper'
    };
    
    /**
     * 餵食類型列表
     * @type {Object}
     */
    static FEED_TYPES = {
        BREAST_LEFT: 'breast_left',
        BREAST_RIGHT: 'breast_right',
        BREAST_BOTH: 'breast_both',
        FORMULA: 'formula',
        SOLID: 'solid',
        WATER: 'water',
        OTHER: 'other'
    };
    
    /**
     * 尿布類型列表
     * @type {Object}
     */
    static DIAPER_TYPES = {
        WET: 'wet',
        DIRTY: 'dirty',
        MIXED: 'mixed',
        DRY: 'dry'
    };
    
    /**
     * 添加活動記錄
     * @param {Object} activityData 活動數據
     * @returns {Promise<string>} 新添加的活動ID
     */
    static async addActivity(activityData) {
        try {
            // 驗證必填字段
            if (!activityData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            if (!activityData.type || !Object.values(this.ACTIVITY_TYPES).includes(activityData.type)) {
                throw new Error('無效的活動類型');
            }
            
            if (!activityData.timestamp) {
                activityData.timestamp = new Date();
            }
            
            // 活動特定驗證
            if (activityData.type === this.ACTIVITY_TYPES.FEED) {
                if (!activityData.details || !activityData.details.feedType) {
                    throw new Error('餵食記錄必須指定餵食類型');
                }
            }
            
            if (activityData.type === this.ACTIVITY_TYPES.SLEEP) {
                if (activityData.endTime && new Date(activityData.endTime) < new Date(activityData.timestamp)) {
                    throw new Error('睡眠結束時間必須晚於開始時間');
                }
            }
            
            // 設置默認值
            const newActivity = {
                ...activityData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // 添加到數據庫
            const activityId = await Database.add(this.STORE_NAME, newActivity);
            return activityId;
        } catch (error) {
            console.error('添加活動記錄失敗:', error);
            throw error;
        }
    }
    
    /**
     * 更新活動記錄
     * @param {string} activityId 活動ID
     * @param {Object} activityData 更新的活動數據
     * @returns {Promise<string>} 更新的活動ID
     */
    static async updateActivity(activityId, activityData) {
        try {
            // 檢查活動是否存在
            const existingActivity = await Database.get(this.STORE_NAME, activityId);
            
            if (!existingActivity) {
                throw new Error(`找不到ID為 ${activityId} 的活動記錄`);
            }
            
            // 驗證睡眠時間（如果有更新）
            if (existingActivity.type === this.ACTIVITY_TYPES.SLEEP) {
                const startTime = activityData.timestamp || existingActivity.timestamp;
                const endTime = activityData.endTime || existingActivity.endTime;
                
                if (endTime && new Date(endTime) < new Date(startTime)) {
                    throw new Error('睡眠結束時間必須晚於開始時間');
                }
            }
            
            // 更新數據
            const updatedData = {
                ...activityData,
                id: activityId,
                updatedAt: new Date()
            };
            
            await Database.update(this.STORE_NAME, updatedData);
            return activityId;
        } catch (error) {
            console.error(`更新活動記錄 ${activityId} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 刪除活動記錄
     * @param {string} activityId 活動ID
     * @returns {Promise<boolean>} 是否成功刪除
     */
    static async deleteActivity(activityId) {
        try {
            await Database.delete(this.STORE_NAME, activityId);
            return true;
        } catch (error) {
            console.error(`刪除活動記錄 ${activityId} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 根據活動ID獲取活動記錄
     * @param {string} activityId 活動ID
     * @returns {Promise<Object>} 活動數據對象
     */
    static async getActivityById(activityId) {
        try {
            return await Database.get(this.STORE_NAME, activityId);
        } catch (error) {
            console.error(`獲取活動記錄 ${activityId} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 按孩子ID和日期獲取活動記錄
     * @param {string} childId 孩子ID
     * @param {Date|string} date 日期
     * @returns {Promise<Array>} 活動記錄數組
     */
    static async getActivitiesByDate(childId, date) {
        try {
            // 計算日期範圍
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            
            // 查詢範圍內的記錄
            const range = IDBKeyRange.bound(startDate, endDate);
            
            // 先獲取所有符合孩子ID的記錄
            const allActivities = await Database.getByIndex(this.STORE_NAME, 'childId', childId);
            
            // 過濾日期範圍內的記錄
            return allActivities.filter(activity => {
                const activityTime = new Date(activity.timestamp);
                return activityTime >= startDate && activityTime <= endDate;
            });
        } catch (error) {
            console.error(`獲取孩子 ${childId} 在 ${date} 的活動記錄失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 按孩子ID和活動類型獲取活動記錄
     * @param {string} childId 孩子ID
     * @param {string} activityType 活動類型
     * @param {Date|string} date 日期
     * @returns {Promise<Array>} 活動記錄數組
     */
    static async getActivitiesByType(childId, activityType, date) {
        try {
            const activities = await this.getActivitiesByDate(childId, date);
            return activities.filter(activity => activity.type === activityType);
        } catch (error) {
            console.error(`獲取孩子 ${childId} 的 ${activityType} 類型活動記錄失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取孩子最近的活動記錄
     * @param {string} childId 孩子ID
     * @param {number} [limit=10] 限制數量
     * @returns {Promise<Array>} 活動記錄數組
     */
    static async getRecentActivities(childId, limit = 10) {
        try {
            // 獲取所有活動
            const allActivities = await Database.getByIndex(this.STORE_NAME, 'childId', childId);
            
            // 按時間戳排序（降序）
            allActivities.sort((a, b) => {
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
            
            // 返回前N條記錄
            return allActivities.slice(0, limit);
        } catch (error) {
            console.error(`獲取孩子 ${childId} 的最近活動記錄失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 添加餵食記錄
     * @param {Object} feedData 餵食數據
     * @returns {Promise<string>} 新添加的活動ID
     */
    static async addFeedActivity(feedData) {
        try {
            // 確保數據完整性
            if (!feedData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            if (!feedData.details || !feedData.details.feedType) {
                throw new Error('必須指定餵食類型');
            }
            
            // 創建活動數據
            const activityData = {
                childId: feedData.childId,
                type: this.ACTIVITY_TYPES.FEED,
                timestamp: feedData.timestamp || new Date(),
                details: feedData.details,
                note: feedData.note || ''
            };
            
            return await this.addActivity(activityData);
        } catch (error) {
            console.error('添加餵食記錄失敗:', error);
            throw error;
        }
    }
    
    /**
     * 添加睡眠記錄
     * @param {Object} sleepData 睡眠數據
     * @returns {Promise<string>} 新添加的活動ID
     */
    static async addSleepActivity(sleepData) {
        try {
            // 確保數據完整性
            if (!sleepData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            // 創建活動數據
            const activityData = {
                childId: sleepData.childId,
                type: this.ACTIVITY_TYPES.SLEEP,
                timestamp: sleepData.timestamp || new Date(),
                endTime: sleepData.endTime || null,
                details: sleepData.details || {},
                note: sleepData.note || ''
            };
            
            return await this.addActivity(activityData);
        } catch (error) {
            console.error('添加睡眠記錄失敗:', error);
            throw error;
        }
    }
    
    /**
     * 更新睡眠記錄結束時間
     * @param {string} activityId 活動ID
     * @param {Date|string} endTime 結束時間
     * @returns {Promise<string>} 更新的活動ID
     */
    static async updateSleepEndTime(activityId, endTime) {
        try {
            const sleepActivity = await this.getActivityById(activityId);
            
            if (!sleepActivity || sleepActivity.type !== this.ACTIVITY_TYPES.SLEEP) {
                throw new Error('無效的睡眠記錄ID');
            }
            
            const updateData = {
                endTime: endTime || new Date()
            };
            
            return await this.updateActivity(activityId, updateData);
        } catch (error) {
            console.error(`更新睡眠記錄 ${activityId} 結束時間失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 添加尿布更換記錄
     * @param {Object} diaperData 尿布數據
     * @returns {Promise<string>} 新添加的活動ID
     */
    static async addDiaperActivity(diaperData) {
        try {
            // 確保數據完整性
            if (!diaperData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            if (!diaperData.details || !diaperData.details.diaperType) {
                throw new Error('必須指定尿布類型');
            }
            
            // 創建活動數據
            const activityData = {
                childId: diaperData.childId,
                type: this.ACTIVITY_TYPES.DIAPER,
                timestamp: diaperData.timestamp || new Date(),
                details: diaperData.details,
                note: diaperData.note || ''
            };
            
            return await this.addActivity(activityData);
        } catch (error) {
            console.error('添加尿布更換記錄失敗:', error);
            throw error;
        }
    }
    
    /**
     * 根據日期範圍獲取活動統計數據
     * @param {string} childId 孩子ID
     * @param {Date|string} startDate 開始日期
     * @param {Date|string} endDate 結束日期
     * @returns {Promise<Object>} 統計數據
     */
    static async getActivityStats(childId, startDate, endDate) {
        try {
            // 計算日期範圍
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            // 獲取所有符合孩子ID的記錄
            const allActivities = await Database.getByIndex(this.STORE_NAME, 'childId', childId);
            
            // 過濾日期範圍內的記錄
            const filteredActivities = allActivities.filter(activity => {
                const activityTime = new Date(activity.timestamp);
                return activityTime >= start && activityTime <= end;
            });
            
            // 按類型分組
            const feedActivities = filteredActivities.filter(a => a.type === this.ACTIVITY_TYPES.FEED);
            const sleepActivities = filteredActivities.filter(a => a.type === this.ACTIVITY_TYPES.SLEEP);
            const diaperActivities = filteredActivities.filter(a => a.type === this.ACTIVITY_TYPES.DIAPER);
            
            // 計算餵食統計
            const feedStats = this._calculateFeedStats(feedActivities);
            
            // 計算睡眠統計
            const sleepStats = this._calculateSleepStats(sleepActivities);
            
            // 計算尿布統計
            const diaperStats = this._calculateDiaperStats(diaperActivities);
            
            // 按日期分組的數據（用於圖表）
            const dailyData = this._calculateDailyStats(filteredActivities, start, end);
            
            return {
                period: {
                    start: start,
                    end: end,
                    days: Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
                },
                feed: feedStats,
                sleep: sleepStats,
                diaper: diaperStats,
                daily: dailyData
            };
        } catch (error) {
            console.error(`獲取活動統計數據失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 計算餵食統計數據
     * @param {Array} feedActivities 餵食活動記錄
     * @returns {Object} 餵食統計數據
     * @private
     */
    static _calculateFeedStats(feedActivities) {
        // 初始化統計數據
        const stats = {
            total: feedActivities.length,
            byType: {
                breast_left: 0,
                breast_right: 0,
                breast_both: 0,
                formula: 0,
                solid: 0,
                water: 0,
                other: 0
            },
            amounts: {
                formula: 0, // 配方奶總量 (ml)
                water: 0    // 水總量 (ml)
            },
            avgPerDay: 0,
            distribution: {
                morning: 0,   // 6-12
                afternoon: 0, // 12-18
                evening: 0,   // 18-24
                night: 0      // 0-6
            }
        };
        
        // 如果沒有記錄，返回空統計
        if (feedActivities.length === 0) {
            return stats;
        }
        
        // 遍歷所有餵食活動
        for (const activity of feedActivities) {
            const details = activity.details || {};
            const feedType = details.feedType || 'other';
            
            // 增加類型計數
            stats.byType[feedType] = (stats.byType[feedType] || 0) + 1;
            
            // 累計喂養量
            if (feedType === 'formula' && details.amount) {
                stats.amounts.formula += parseFloat(details.amount) || 0;
            }
            
            if (feedType === 'water' && details.amount) {
                stats.amounts.water += parseFloat(details.amount) || 0;
            }
            
            // 計算時間分佈
            const hour = new Date(activity.timestamp).getHours();
            if (hour >= 6 && hour < 12) {
                stats.distribution.morning++;
            } else if (hour >= 12 && hour < 18) {
                stats.distribution.afternoon++;
            } else if (hour >= 18 && hour < 24) {
                stats.distribution.evening++;
            } else {
                stats.distribution.night++;
            }
        }
        
        // 計算日均次數（假設有完整日期範圍數據）
        const firstDate = new Date(feedActivities[0].timestamp);
        const lastDate = new Date(feedActivities[feedActivities.length - 1].timestamp);
        const daysDiff = Math.max(1, Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1);
        
        stats.avgPerDay = (stats.total / daysDiff).toFixed(1);
        
        return stats;
    }
    
    /**
     * 計算睡眠統計數據
     * @param {Array} sleepActivities 睡眠活動記錄
     * @returns {Object} 睡眠統計數據
     * @private
     */
    static _calculateSleepStats(sleepActivities) {
        // 初始化統計數據
        const stats = {
            total: sleepActivities.length,
            completed: 0,       // 已完成的睡眠記錄數
            totalDuration: 0,   // 總睡眠時長（分鐘）
            avgDuration: 0,     // 平均每次睡眠時長（分鐘）
            maxDuration: 0,     // 最長一次睡眠時長（分鐘）
            avgPerDay: 0,       // 日均睡眠次數
            avgDailyTotal: 0,   // 日均睡眠總時長（分鐘）
            distribution: {
                morning: 0,    // 6-12
                afternoon: 0,  // 12-18
                evening: 0,    // 18-24
                night: 0       // 0-6
            }
        };
        
        // 如果沒有記錄，返回空統計
        if (sleepActivities.length === 0) {
            return stats;
        }
        
        // 整理每天的睡眠時長，用於計算日均睡眠時長
        const dailySleep = {};
        
        // 遍歷所有睡眠活動
        for (const activity of sleepActivities) {
            // 計算睡眠時長
            let duration = 0;
            
            if (activity.endTime) {
                stats.completed++;
                
                duration = Utils.getMinutesBetween(
                    activity.timestamp,
                    activity.endTime
                );
                
                // 更新總睡眠時長
                stats.totalDuration += duration;
                
                // 更新最長睡眠時長
                stats.maxDuration = Math.max(stats.maxDuration, duration);
                
                // 按日期記錄睡眠時長
                const date = Utils.formatDate(activity.timestamp);
                dailySleep[date] = (dailySleep[date] || 0) + duration;
            }
            
            // 計算時間分佈（根據入睡時間）
            const hour = new Date(activity.timestamp).getHours();
            if (hour >= 6 && hour < 12) {
                stats.distribution.morning++;
            } else if (hour >= 12 && hour < 18) {
                stats.distribution.afternoon++;
            } else if (hour >= 18 && hour < 24) {
                stats.distribution.evening++;
            } else {
                stats.distribution.night++;
            }
        }
        
        // 計算平均睡眠時長
        if (stats.completed > 0) {
            stats.avgDuration = Math.round(stats.totalDuration / stats.completed);
        }
        
        // 計算日均睡眠次數和時長
        const daysWithSleep = Object.keys(dailySleep).length;
        if (daysWithSleep > 0) {
            stats.avgPerDay = (stats.total / daysWithSleep).toFixed(1);
            
            // 計算日均睡眠總時長
            let totalDailySleep = 0;
            for (const duration of Object.values(dailySleep)) {
                totalDailySleep += duration;
            }
            stats.avgDailyTotal = Math.round(totalDailySleep / daysWithSleep);
        }
        
        return stats;
    }
    
    /**
     * 計算尿布統計數據
     * @param {Array} diaperActivities 尿布活動記錄
     * @returns {Object} 尿布統計數據
     * @private
     */
    static _calculateDiaperStats(diaperActivities) {
        // 初始化統計數據
        const stats = {
            total: diaperActivities.length,
            byType: {
                wet: 0,
                dirty: 0,
                mixed: 0,
                dry: 0
            },
            avgPerDay: 0,
            distribution: {
                morning: 0,   // 6-12
                afternoon: 0, // 12-18
                evening: 0,   // 18-24
                night: 0      // 0-6
            }
        };
        
        // 如果沒有記錄，返回空統計
        if (diaperActivities.length === 0) {
            return stats;
        }
        
        // 整理每天的尿布更換次數，用於計算日均次數
        const dailyDiapers = {};
        
        // 遍歷所有尿布活動
        for (const activity of diaperActivities) {
            const details = activity.details || {};
            const diaperType = details.diaperType || 'dry';
            
            // 增加類型計數
            stats.byType[diaperType] = (stats.byType[diaperType] || 0) + 1;
            
            // 計算時間分佈
            const hour = new Date(activity.timestamp).getHours();
            if (hour >= 6 && hour < 12) {
                stats.distribution.morning++;
            } else if (hour >= 12 && hour < 18) {
                stats.distribution.afternoon++;
            } else if (hour >= 18 && hour < 24) {
                stats.distribution.evening++;
            } else {
                stats.distribution.night++;
            }
            
            // 按日期記錄尿布更換次數
            const date = Utils.formatDate(activity.timestamp);
            dailyDiapers[date] = (dailyDiapers[date] || 0) + 1;
        }
        
        // 計算日均尿布更換次數
        const daysWithDiapers = Object.keys(dailyDiapers).length;
        if (daysWithDiapers > 0) {
            let totalChanges = 0;
            for (const count of Object.values(dailyDiapers)) {
                totalChanges += count;
            }
            stats.avgPerDay = (totalChanges / daysWithDiapers).toFixed(1);
        }
        
        return stats;
    }
    
    /**
     * 計算每日活動統計數據（用於圖表）
     * @param {Array} activities 活動記錄
     * @param {Date} startDate 開始日期
     * @param {Date} endDate 結束日期
     * @returns {Array} 每日統計數據
     * @private
     */
    static _calculateDailyStats(activities, startDate, endDate) {
        // 初始化每日數據
        const dailyData = [];
        
        // 創建日期範圍內的每一天
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = Utils.formatDate(currentDate);
            
            dailyData.push({
                date: dateStr,
                feed: 0,
                sleep: 0,
                sleepDuration: 0,
                diaper: 0
            });
            
            // 前進一天
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // 填充活動數據
        for (const activity of activities) {
            const activityDate = Utils.formatDate(activity.timestamp);
            
            // 查找對應的日期數據
            const dayData = dailyData.find(d => d.date === activityDate);
            
            if (dayData) {
                switch (activity.type) {
                    case this.ACTIVITY_TYPES.FEED:
                        dayData.feed++;
                        break;
                    case this.ACTIVITY_TYPES.SLEEP:
                        dayData.sleep++;
                        if (activity.endTime) {
                            const duration = Utils.getMinutesBetween(
                                activity.timestamp,
                                activity.endTime
                            );
                            dayData.sleepDuration += duration;
                        }
                        break;
                    case this.ACTIVITY_TYPES.DIAPER:
                        dayData.diaper++;
                        break;
                }
            }
        }
        
        return dailyData;
    }
}

// 導出服務
window.ActivityService = ActivityService;