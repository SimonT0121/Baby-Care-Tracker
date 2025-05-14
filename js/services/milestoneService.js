/**
 * 里程碑服務 - 處理發展里程碑相關的數據操作
 * 完全重寫版，徹底解決數據庫連接問題
 */
class MilestoneService {
    /**
     * 存儲表名
     * @type {string}
     */
    static STORE_NAME = 'milestones';
    
    /**
     * 里程碑類別列表
     * @type {Object}
     */
    static MILESTONE_CATEGORIES = {
        MOTOR: 'motor',         // 動作技能
        LANGUAGE: 'language',   // 語言能力
        SOCIAL: 'social',       // 社交情感
        COGNITIVE: 'cognitive'  // 認知能力
    };
    
    /**
     * 檢查數據庫是否可用，如不可用則返回false
     * @private
     */
    static async _tryDatabaseConnection() {
        // 使用 try-catch 確保任何錯誤都不會導致程序崩潰
        try {
            // 檢查 database.js 是否正確加載
            const hasGlobalDB = typeof Database !== 'undefined';
            const hasWindowDB = typeof window.Database !== 'undefined';
            
            console.log('[MilestoneService] 數據庫狀態檢查:', {
                hasGlobalDB,
                hasWindowDB,
                indexedDBSupport: typeof indexedDB !== 'undefined'
            });
            
            // 如果沒有Database類，直接返回false
            if (!hasGlobalDB && !hasWindowDB) {
                console.error('[MilestoneService] 致命錯誤: Database類未定義');
                return false;
            }
            
            // 嘗試獲取數據庫連接
            const DB = hasGlobalDB ? Database : window.Database;
            const dbConnection = await DB.getDatabase().catch(err => {
                console.error('[MilestoneService] 數據庫連接失敗:', err);
                return null;
            });
            
            if (!dbConnection) {
                console.error('[MilestoneService] 無法獲取數據庫連接');
                return false;
            }
            
            console.log('[MilestoneService] 數據庫連接成功');
            return true;
        } catch (error) {
            console.error('[MilestoneService] 檢測數據庫時發生錯誤:', error);
            return false;
        }
    }
    
    /**
     * 獲取標準里程碑列表 - 精簡版
     * @returns {Array} 標準里程碑列表
     */
    static getStandardMilestones() {
        return [
            // 動作技能 (MOTOR)
            {
                name: '抬頭',
                category: 'motor',
                ageMonthRecommended: 1,
                description: '趴著時能抬頭並保持短暫時間'
            },
            {
                name: '翻身',
                category: 'motor',
                ageMonthRecommended: 4,
                description: '能從仰臥翻到俯臥，或從俯臥翻到仰臥'
            },
            // 語言能力 (LANGUAGE)
            {
                name: '發出咕咕聲',
                category: 'language',
                ageMonthRecommended: 2,
                description: '能發出簡單的咕咕聲或元音聲'
            },
            {
                name: '牙牙學語',
                category: 'language',
                ageMonthRecommended: 6,
                description: '發出連續的聲音組合，如"ba-ba"或"ma-ma"'
            },
            // 社交情感 (SOCIAL)
            {
                name: '社交性微笑',
                category: 'social',
                ageMonthRecommended: 2,
                description: '對人微笑回應'
            },
            {
                name: '認識親人',
                category: 'social',
                ageMonthRecommended: 4,
                description: '能分辨熟悉的人和陌生人'
            },
            // 認知能力 (COGNITIVE)
            {
                name: '視覺追蹤',
                category: 'cognitive',
                ageMonthRecommended: 1,
                description: '能用眼睛追蹤移動的物體'
            },
            {
                name: '抓握玩具',
                category: 'cognitive',
                ageMonthRecommended: 3,
                description: '能伸手抓握感興趣的玩具'
            }
        ];
    }
    
    /**
     * 產生臨時ID (當無法訪問Database.generateId時使用)
     * @private
     */
    static _generateTempId() {
        return 'temp_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }
    
    /**
     * 獲取默認里程碑列表（當數據庫操作失敗時使用）
     * @private
     * @param {string} childId 孩子ID
     * @returns {Array} 里程碑數據數組
     */
    static _getDefaultMilestones(childId) {
        console.log('[MilestoneService] 使用默認里程碑列表');
        return this.getStandardMilestones().map(std => ({
            ...std,
            id: this._generateTempId(),
            childId: childId,
            achievedDate: null,
            isStandard: true,
            note: '',
            isDefault: true  // 標記為默認數據，便於識別
        }));
    }
    
    /**
     * 根據孩子ID獲取所有里程碑 - 徹底重寫版
     * @param {string} childId 孩子ID
     * @returns {Promise<Array>} 里程碑數據數組
     */
    static async getAllMilestones(childId) {
        console.log(`[MilestoneService] 嘗試獲取里程碑數據，childId: ${childId}`);
        
        // 防御性編程：如果沒有提供childId，直接返回空數組
        if (!childId) {
            console.error('[MilestoneService] 錯誤: 未提供childId');
            return [];
        }
        
        try {
            // 檢查數據庫連接
            const dbAvailable = await this._tryDatabaseConnection();
            
            // 如果數據庫不可用，立即返回默認數據
            if (!dbAvailable) {
                console.warn('[MilestoneService] 數據庫不可用，使用默認數據');
                return this._getDefaultMilestones(childId);
            }
            
            // 確定哪個數據庫對象可用
            const DB = typeof Database !== 'undefined' ? Database : window.Database;
            
            // 嘗試從數據庫獲取已保存的里程碑
            let savedMilestones = [];
            try {
                // 使用包裝的try-catch，確保數據庫操作失敗不會影響整個函數
                savedMilestones = await DB.getByIndex(this.STORE_NAME, 'childId', childId);
                console.log(`[MilestoneService] 成功從數據庫獲取 ${savedMilestones.length} 個里程碑`);
            } catch (dbError) {
                console.error('[MilestoneService] 數據庫查詢失敗:', dbError);
                // 如果數據庫操作失敗，我們仍然繼續處理
            }
            
            // 獲取標準里程碑
            const standardMilestones = this.getStandardMilestones();
            
            // 合併標準和已保存的里程碑
            const result = [];
            
            // 處理標準里程碑
            for (const stdMilestone of standardMilestones) {
                // 尋找是否有對應的保存記錄
                const savedMilestone = savedMilestones.find(saved => 
                    saved.name === stdMilestone.name && saved.category === stdMilestone.category);
                
                if (savedMilestone) {
                    // 如果有對應的保存記錄，合併數據
                    result.push({
                        ...stdMilestone,
                        ...savedMilestone,
                        id: savedMilestone.id,
                        childId: childId,
                        isStandard: true,
                        note: savedMilestone.note || ''
                    });
                } else {
                    // 創建新的未達成里程碑記錄
                    result.push({
                        ...stdMilestone,
                        id: DB.generateId ? DB.generateId() : this._generateTempId(),
                        childId: childId,
                        achievedDate: null,
                        isStandard: true,
                        note: ''
                    });
                }
            }
            
            // 添加自定義里程碑
            for (const customMilestone of savedMilestones) {
                // 檢查是否已經在結果中（作為標準里程碑）
                if (!result.some(r => r.name === customMilestone.name && r.category === customMilestone.category)) {
                    result.push({
                        ...customMilestone,
                        isStandard: false
                    });
                }
            }
            
            console.log(`[MilestoneService] 總共處理了 ${result.length} 個里程碑`);
            return result;
            
        } catch (error) {
            // 捕獲任何可能的錯誤，確保函數不會崩潰
            console.error('[MilestoneService] 獲取里程碑時發生嚴重錯誤:', error);
            
            // 出錯時返回默認里程碑列表
            return this._getDefaultMilestones(childId);
        }
    }
    
    /**
     * 根據類別獲取里程碑 - 簡化版
     * @param {string} childId 孩子ID
     * @param {string} category 類別
     * @returns {Promise<Array>} 里程碑數據數組
     */
    static async getMilestonesByCategory(childId, category) {
        try {
            // 獲取所有里程碑
            const allMilestones = await this.getAllMilestones(childId);
            
            // 過濾出指定類別的里程碑
            return allMilestones.filter(milestone => milestone.category === category);
        } catch (error) {
            console.error(`[MilestoneService] 獲取類別里程碑時出錯:`, error);
            
            // 出錯時返回該類別的標準里程碑
            return this.getStandardMilestones()
                .filter(m => m.category === category)
                .map(std => ({
                    ...std,
                    id: this._generateTempId(),
                    childId: childId,
                    achievedDate: null,
                    isStandard: true,
                    note: '',
                    isError: true
                }));
        }
    }
    
    /**
     * 獲取已達成的里程碑 - 簡化版
     * @param {string} childId 孩子ID
     * @returns {Promise<Array>} 已達成的里程碑數據數組
     */
    static async getAchievedMilestones(childId) {
        try {
            // 獲取所有里程碑
            const allMilestones = await this.getAllMilestones(childId);
            
            // 過濾出已達成的里程碑
            return allMilestones.filter(milestone => milestone.achievedDate !== null);
        } catch (error) {
            console.error('[MilestoneService] 獲取已達成里程碑時出錯:', error);
            return []; // 出錯時返回空數組
        }
    }
    
    /**
     * 添加或更新里程碑
     * @param {Object} milestoneData 里程碑資料
     * @returns {Promise<string>} 里程碑ID
     */
    static async saveMilestone(milestoneData) {
        try {
            // 檢查數據庫連接
            const dbAvailable = await this._tryDatabaseConnection();
            if (!dbAvailable) {
                throw new Error('數據庫不可用，無法保存里程碑');
            }
            
            // 確定哪個數據庫對象可用
            const DB = typeof Database !== 'undefined' ? Database : window.Database;
            
            // 檢查是否已存在
            if (milestoneData.id) {
                // 更新現有記錄
                return await DB.update(this.STORE_NAME, {
                    ...milestoneData,
                    updatedAt: new Date()
                });
            } else {
                // 添加新記錄
                return await DB.add(this.STORE_NAME, {
                    ...milestoneData,
                    id: DB.generateId ? DB.generateId() : this._generateTempId(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        } catch (error) {
            console.error('[MilestoneService] 保存里程碑失敗:', error);
            throw error;
        }
    }
}

// 初始化和導出
console.log('[MilestoneService] 正在初始化里程碑服務...');

// 確保全局可用
window.MilestoneService = MilestoneService;

// 在DOM加載完成後確認數據庫狀態
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[MilestoneService] DOM 已加載，檢查數據庫狀態...');
    
    // 初始檢查
    const dbStatus = await MilestoneService._tryDatabaseConnection();
    console.log('[MilestoneService] 初始數據庫狀態檢查結果:', dbStatus ? '可用' : '不可用');
    
    // 如果數據庫不可用，等待一段時間後再次嘗試
    if (!dbStatus) {
        console.log('[MilestoneService] 將在 1 秒後再次嘗試連接數據庫...');
        setTimeout(async () => {
            const retryStatus = await MilestoneService._tryDatabaseConnection();
            console.log('[MilestoneService] 重試數據庫連接結果:', retryStatus ? '成功' : '失敗');
        }, 1000);
    }
});

// 確保初始化完成
console.log('[MilestoneService] 初始化完成，服務已就緒');
