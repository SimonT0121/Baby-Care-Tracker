/**
 * 里程碑服務 - 處理發展里程碑相關的數據操作
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
     * 根據孩子ID獲取所有里程碑
     * @param {string} childId 孩子ID
     * @returns {Promise<Array>} 里程碑數據數組
     */
    static async getAllMilestones(childId) {
        try {
            if (window.AppLog) window.AppLog.addLog(`開始獲取里程碑: childId=${childId}`);
            
            // 檢查參數
            if (!childId) {
                const error = new Error('孩子ID不能為空');
                if (window.AppLog) window.AppLog.addLog(`參數錯誤: ${error.message}`);
                throw error;
            }
            
            // 檢查孩子是否存在
            if (window.AppLog) window.AppLog.addLog(`檢查孩子是否存在: ${childId}`);
            const child = await ChildService.getChildById(childId);
            
            if (!child) {
                const error = new Error(`找不到ID為 ${childId} 的孩子`);
                if (window.AppLog) window.AppLog.addLog(`錯誤: ${error.message}`);
                throw error;
            }
            if (window.AppLog) window.AppLog.addLog(`孩子存在: ${child.name}`);
            
            // 獲取所有儲存的里程碑 - 注意這可能返回空數組
            if (window.AppLog) window.AppLog.addLog(`獲取已儲存里程碑`);
            
            let savedMilestones = [];
            try {
                savedMilestones = await Database.getByIndex(this.STORE_NAME, 'childId', childId);
                if (window.AppLog) window.AppLog.addLog(`獲取到 ${savedMilestones.length} 個已儲存里程碑`);
            } catch (dbError) {
                // 處理數據庫錯誤，但允許繼續執行
                if (window.AppLog) window.AppLog.addLog(`數據庫查詢錯誤: ${dbError.message}, 將使用空數組繼續`);
                console.error('數據庫查詢錯誤:', dbError);
                savedMilestones = []; // 確保使用空數組繼續
            }
            
            // 獲取標準里程碑列表
            if (window.AppLog) window.AppLog.addLog(`獲取標準里程碑列表`);
            const standardMilestones = this.getStandardMilestones();
            if (window.AppLog) window.AppLog.addLog(`獲取到 ${standardMilestones.length} 個標準里程碑`);
            
            // 合併已保存的里程碑和標準里程碑
            if (window.AppLog) window.AppLog.addLog(`合併里程碑數據`);
            const mergedMilestones = standardMilestones.map(stdMilestone => {
                // 檢查是否有對應的已保存里程碑
                const savedMilestone = savedMilestones.find(saved => saved && saved.name === stdMilestone.name);
                
                if (savedMilestone) {
                    // 返回保存的記錄，但包含標準里程碑的基本信息
                    return {
                        ...stdMilestone,
                        ...savedMilestone,
                        isStandard: true
                    };
                } else {
                    // 返回未達成的標準里程碑
                    return {
                        ...stdMilestone,
                        id: Database.generateId(),
                        childId: childId,
                        achievedDate: null,
                        isStandard: true,
                        note: ''
                    };
                }
            });
            
            // 添加自定義里程碑（不在標準列表中的）
            const customMilestones = savedMilestones.filter(saved => 
                saved && !standardMilestones.some(std => std.name === saved.name)
            ).map(custom => ({
                ...custom,
                isStandard: false
            }));
            
            const result = [...mergedMilestones, ...customMilestones];
            if (window.AppLog) window.AppLog.addLog(`里程碑數據獲取完成: 共 ${result.length} 個里程碑`);
            
            return result;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`里程碑載入失敗: ${error.message}`);
            console.error(`獲取孩子 ${childId} 的所有里程碑失敗:`, error);
            
            // 顯示錯誤到頁面
            const errorDiv = document.getElementById('errorMessages');
            if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.innerText = `載入里程碑資料失敗: ${error.message}`;
                // 30秒後自動隱藏錯誤
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 30000);
            }
            
            throw error;
        }
    }
    
    /**
     * 為孩子初始化標準里程碑
     * 這個方法可以在添加新孩子時調用，確保里程碑表不為空
     * @param {string} childId 孩子ID
     * @returns {Promise<boolean>} 操作是否成功
     */
    static async initializeStandardMilestones(childId) {
        try {
            if (window.AppLog) window.AppLog.addLog(`開始初始化標準里程碑: childId=${childId}`);
            
            // 檢查孩子是否存在
            const child = await ChildService.getChildById(childId);
            if (!child) {
                const error = new Error(`找不到ID為 ${childId} 的孩子`);
                if (window.AppLog) window.AppLog.addLog(`初始化里程碑錯誤: ${error.message}`);
                throw error;
            }
            
            // 檢查是否已有里程碑記錄
            const existingMilestones = await Database.getByIndex(this.STORE_NAME, 'childId', childId);
            if (existingMilestones.length > 0) {
                if (window.AppLog) window.AppLog.addLog(`孩子已有 ${existingMilestones.length} 個里程碑記錄，跳過初始化`);
                return true; // 已有記錄，不需要初始化
            }
            
            // 獲取標準里程碑列表
            const standardMilestones = this.getStandardMilestones();
            if (window.AppLog) window.AppLog.addLog(`準備初始化 ${standardMilestones.length} 個標準里程碑`);
            
            // 計算當前月齡
            const age = Utils.calculateAge(child.birthDate);
            const ageInMonths = age.years * 12 + age.months;
            if (window.AppLog) window.AppLog.addLog(`孩子當前月齡: ${ageInMonths}個月`);
            
            // 為已達到月齡的里程碑創建記錄 (可選，取決於應用需求)
            let createdCount = 0;
            for (const milestone of standardMilestones) {
                try {
                    // 選項1: 只創建未達成的空記錄 (推薦)
                    const milestoneData = {
                        childId: childId,
                        name: milestone.name,
                        category: milestone.category,
                        ageMonthRecommended: milestone.ageMonthRecommended,
                        achievedDate: null, // 未達成
                        note: '',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    
                    // 選項2: 為已過月齡的自動標記為已達成 (可選)
                    /*
                    if (milestone.ageMonthRecommended < ageInMonths - 1) {
                        // 如果里程碑月齡小於當前月齡，標記為已達成
                        milestoneData.achievedDate = new Date(); 
                    }
                    */
                    
                    await Database.add(this.STORE_NAME, milestoneData);
                    createdCount++;
                } catch (addError) {
                    console.error(`添加里程碑 ${milestone.name} 失敗:`, addError);
                    // 繼續處理其他里程碑
                }
            }
            
            if (window.AppLog) window.AppLog.addLog(`標準里程碑初始化完成: 創建了 ${createdCount} 個記錄`);
            return true;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`初始化標準里程碑失敗: ${error.message}`);
            console.error(`為孩子 ${childId} 初始化標準里程碑失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 根據類別獲取里程碑
     * @param {string} childId 孩子ID
     * @param {string} category 類別
     * @returns {Promise<Array>} 里程碑數據數組
     */
    static async getMilestonesByCategory(childId, category) {
        try {
            if (window.AppLog) window.AppLog.addLog(`獲取類別里程碑: childId=${childId}, category=${category}`);
            const allMilestones = await this.getAllMilestones(childId);
            const result = allMilestones.filter(milestone => milestone.category === category);
            if (window.AppLog) window.AppLog.addLog(`獲取類別里程碑完成: ${result.length} 個結果`);
            return result;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`獲取類別里程碑失敗: ${error.message}`);
            console.error(`獲取孩子 ${childId} 的 ${category} 類別里程碑失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取已達成的里程碑
     * @param {string} childId 孩子ID
     * @returns {Promise<Array>} 已達成的里程碑數據數組
     */
    static async getAchievedMilestones(childId) {
        try {
            if (window.AppLog) window.AppLog.addLog(`獲取已達成里程碑: childId=${childId}`);
            const allMilestones = await this.getAllMilestones(childId);
            const result = allMilestones.filter(milestone => milestone.achievedDate !== null);
            if (window.AppLog) window.AppLog.addLog(`獲取已達成里程碑完成: ${result.length} 個結果`);
            return result;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`獲取已達成里程碑失敗: ${error.message}`);
            console.error(`獲取孩子 ${childId} 的已達成里程碑失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取即將達成的里程碑
     * @param {string} childId 孩子ID
     * @param {number} [monthsRange=3] 月齡範圍
     * @returns {Promise<Array>} 即將達成的里程碑數據數組
     */
    static async getUpcomingMilestones(childId, monthsRange = 3) {
        try {
            if (window.AppLog) window.AppLog.addLog(`獲取即將達成里程碑: childId=${childId}, range=${monthsRange}`);
            
            // 獲取孩子信息
            const child = await ChildService.getChildById(childId);
            
            if (!child) {
                throw new Error(`找不到ID為 ${childId} 的孩子`);
            }
            
            // 計算當前月齡
            const age = Utils.calculateAge(child.birthDate);
            const ageInMonths = age.years * 12 + age.months;
            if (window.AppLog) window.AppLog.addLog(`孩子當前月齡: ${ageInMonths}個月`);
            
            // 獲取所有里程碑
            const allMilestones = await this.getAllMilestones(childId);
            
            // 過濾未達成且在範圍內的里程碑
            const result = allMilestones.filter(milestone => 
                milestone.achievedDate === null && 
                milestone.ageMonthRecommended > ageInMonths &&
                milestone.ageMonthRecommended <= (ageInMonths + monthsRange)
            );
            
            if (window.AppLog) window.AppLog.addLog(`獲取即將達成里程碑完成: ${result.length} 個結果`);
            return result;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`獲取即將達成里程碑失敗: ${error.message}`);
            console.error(`獲取孩子 ${childId} 的即將達成里程碑失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 檢查是否有延遲發展的里程碑
     * @param {string} childId 孩子ID
     * @param {number} [delayMonths=3] 延遲月數
     * @returns {Promise<Array>} 延遲發展的里程碑數據數組
     */
    static async getDelayedMilestones(childId, delayMonths = 3) {
        try {
            if (window.AppLog) window.AppLog.addLog(`獲取延遲發展里程碑: childId=${childId}, delay=${delayMonths}`);
            
            // 獲取孩子信息
            const child = await ChildService.getChildById(childId);
            
            if (!child) {
                throw new Error(`找不到ID為 ${childId} 的孩子`);
            }
            
            // 計算當前月齡
            const age = Utils.calculateAge(child.birthDate);
            const ageInMonths = age.years * 12 + age.months;
            
            // 獲取所有里程碑
            const allMilestones = await this.getAllMilestones(childId);
            
            // 過濾未達成且已延遲的里程碑
            const result = allMilestones.filter(milestone => 
                milestone.achievedDate === null && 
                milestone.ageMonthRecommended < (ageInMonths - delayMonths)
            );
            
            if (window.AppLog) window.AppLog.addLog(`獲取延遲發展里程碑完成: ${result.length} 個結果`);
            return result;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`獲取延遲發展里程碑失敗: ${error.message}`);
            console.error(`獲取孩子 ${childId} 的延遲發展里程碑失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 標記里程碑為已達成
     * @param {string} childId 孩子ID
     * @param {string} milestoneName 里程碑名稱
     * @param {Date|string} [achievedDate] 達成日期，默認為當前日期
     * @param {string} [note] 備註
     * @returns {Promise<string>} 更新或添加的里程碑ID
     */
    static async markMilestoneAchieved(childId, milestoneName, achievedDate = new Date(), note = '') {
        try {
            if (window.AppLog) window.AppLog.addLog(`標記里程碑為已達成: ${milestoneName}`);
            
            // 檢查孩子是否存在
            const child = await ChildService.getChildById(childId);
            
            if (!child) {
                throw new Error(`找不到ID為 ${childId} 的孩子`);
            }
            
            // 獲取所有已保存的里程碑
            const savedMilestones = await Database.getByIndex(this.STORE_NAME, 'childId', childId);
            
            // 檢查是否已有此里程碑記錄
            const existingMilestone = savedMilestones.find(m => m && m.name === milestoneName);
            
            if (existingMilestone) {
                // 更新已有記錄
                const updateData = {
                    achievedDate: achievedDate,
                    note: note || existingMilestone.note,
                    updatedAt: new Date()
                };
                
                await Database.update(this.STORE_NAME, { ...updateData, id: existingMilestone.id });
                if (window.AppLog) window.AppLog.addLog(`更新里程碑成功: ${milestoneName}`);
                return existingMilestone.id;
            } else {
                // 查找標準里程碑數據
                const standardMilestone = this.getStandardMilestones().find(m => m.name === milestoneName);
                
                if (!standardMilestone) {
                    throw new Error(`找不到名為 ${milestoneName} 的標準里程碑`);
                }
                
                // 創建新記錄
                const newMilestone = {
                    childId: childId,
                    name: milestoneName,
                    category: standardMilestone.category,
                    ageMonthRecommended: standardMilestone.ageMonthRecommended,
                    achievedDate: achievedDate,
                    note: note,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                const milestoneId = await Database.add(this.STORE_NAME, newMilestone);
                if (window.AppLog) window.AppLog.addLog(`添加里程碑成功: ${milestoneName}`);
                return milestoneId;
            }
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`標記里程碑為已達成失敗: ${error.message}`);
            console.error(`標記里程碑 ${milestoneName} 為已達成失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 標記里程碑為未達成
     * @param {string} childId 孩子ID
     * @param {string} milestoneName 里程碑名稱
     * @returns {Promise<boolean>} 操作是否成功
     */
    static async markMilestoneNotAchieved(childId, milestoneName) {
        try {
            if (window.AppLog) window.AppLog.addLog(`標記里程碑為未達成: ${milestoneName}`);
            
            // 獲取所有已保存的里程碑
            const savedMilestones = await Database.getByIndex(this.STORE_NAME, 'childId', childId);
            
            // 檢查是否已有此里程碑記錄
            const existingMilestone = savedMilestones.find(m => m && m.name === milestoneName);
            
            if (existingMilestone) {
                // 如果是自定義里程碑，則刪除記錄
                const standardMilestone = this.getStandardMilestones().find(m => m.name === milestoneName);
                
                if (!standardMilestone) {
                    await Database.delete(this.STORE_NAME, existingMilestone.id);
                    if (window.AppLog) window.AppLog.addLog(`刪除自定義里程碑: ${milestoneName}`);
                } else {
                    // 更新標準里程碑記錄為未達成
                    const updateData = {
                        achievedDate: null,
                        updatedAt: new Date()
                    };
                    
                    await Database.update(this.STORE_NAME, { ...updateData, id: existingMilestone.id });
                    if (window.AppLog) window.AppLog.addLog(`更新里程碑為未達成: ${milestoneName}`);
                }
                
                return true;
            }
            
            // 如果沒有記錄，則已經是未達成狀態
            if (window.AppLog) window.AppLog.addLog(`里程碑 ${milestoneName} 已經是未達成狀態`);
            return true;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`標記里程碑為未達成失敗: ${error.message}`);
            console.error(`標記里程碑 ${milestoneName} 為未達成失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 添加自定義里程碑
     * @param {Object} milestoneData 里程碑數據
     * @returns {Promise<string>} 新添加的里程碑ID
     */
    static async addCustomMilestone(milestoneData) {
        try {
            if (window.AppLog) window.AppLog.addLog(`添加自定義里程碑: ${milestoneData.name || '未命名'}`);
            
            // 確保數據完整性
            if (!milestoneData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            if (!milestoneData.name) {
                throw new Error('必須指定里程碑名稱');
            }
            
            if (!milestoneData.category || !Object.values(this.MILESTONE_CATEGORIES).includes(milestoneData.category)) {
                throw new Error('無效的里程碑類別');
            }
            
            if (milestoneData.ageMonthRecommended === undefined) {
                throw new Error('必須指定建議月齡');
            }
            
            // 檢查是否已存在同名里程碑
            const savedMilestones = await Database.getByIndex(this.STORE_NAME, 'childId', milestoneData.childId);
            
            if (savedMilestones.some(m => m && m.name === milestoneData.name)) {
                throw new Error(`已存在名為 ${milestoneData.name} 的里程碑`);
            }
            
            // 創建新里程碑
            const newMilestone = {
                ...milestoneData,
                achievedDate: milestoneData.achievedDate || null,
                note: milestoneData.note || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const milestoneId = await Database.add(this.STORE_NAME, newMilestone);
            if (window.AppLog) window.AppLog.addLog(`添加自定義里程碑成功: ${milestoneData.name}`);
            return milestoneId;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`添加自定義里程碑失敗: ${error.message}`);
            console.error('添加自定義里程碑失敗:', error);
            throw error;
        }
    }
    
    /**
     * 更新里程碑數據
     * @param {string} milestoneId 里程碑ID
     * @param {Object} milestoneData 更新的里程碑數據
     * @returns {Promise<string>} 更新的里程碑ID
     */
    static async updateMilestone(milestoneId, milestoneData) {
        try {
            if (window.AppLog) window.AppLog.addLog(`更新里程碑: ID=${milestoneId}`);
            
            // 檢查里程碑是否存在
            const existingMilestone = await Database.get(this.STORE_NAME, milestoneId);
            
            if (!existingMilestone) {
                throw new Error(`找不到ID為 ${milestoneId} 的里程碑`);
            }
            
            // 標準里程碑只能更新達成日期和備註
            const standardMilestone = this.getStandardMilestones().find(m => m.name === existingMilestone.name);
            
            if (standardMilestone) {
                // 只允許更新部分字段
                const updateData = {
                    id: milestoneId,
                    achievedDate: milestoneData.achievedDate,
                    note: milestoneData.note,
                    updatedAt: new Date()
                };
                
                await Database.update(this.STORE_NAME, updateData);
                if (window.AppLog) window.AppLog.addLog(`更新標準里程碑成功: ${existingMilestone.name}`);
            } else {
                // 自定義里程碑可以更新更多字段
                const updateData = {
                    ...milestoneData,
                    id: milestoneId,
                    updatedAt: new Date()
                };
                
                await Database.update(this.STORE_NAME, updateData);
                if (window.AppLog) window.AppLog.addLog(`更新自定義里程碑成功: ${existingMilestone.name}`);
            }
            
            return milestoneId;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`更新里程碑失敗: ${error.message}`);
            console.error(`更新里程碑 ${milestoneId} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 刪除自定義里程碑
     * @param {string} milestoneId 里程碑ID
     * @returns {Promise<boolean>} 是否成功刪除
     */
    static async deleteCustomMilestone(milestoneId) {
        try {
            if (window.AppLog) window.AppLog.addLog(`刪除自定義里程碑: ID=${milestoneId}`);
            
            // 檢查里程碑是否存在
            const existingMilestone = await Database.get(this.STORE_NAME, milestoneId);
            
            if (!existingMilestone) {
                throw new Error(`找不到ID為 ${milestoneId} 的里程碑`);
            }
            
            // 檢查是否為標準里程碑
            const standardMilestone = this.getStandardMilestones().find(m => m.name === existingMilestone.name);
            
            if (standardMilestone) {
                throw new Error('不能刪除標準里程碑');
            }
            
            // 刪除自定義里程碑
            await Database.delete(this.STORE_NAME, milestoneId);
            if (window.AppLog) window.AppLog.addLog(`刪除自定義里程碑成功: ${existingMilestone.name}`);
            return true;
        } catch (error) {
            if (window.AppLog) window.AppLog.addLog(`刪除自定義里程碑失敗: ${error.message}`);
            console.error(`刪除自定義里程碑 ${milestoneId} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取標準里程碑列表
     * @returns {Array} 標準里程碑列表
     */
    static getStandardMilestones() {
        if (window.AppLog) window.AppLog.addLog(`獲取標準里程碑列表定義`);
        // 標準里程碑列表（基於世界衛生組織和美國疾病控制與預防中心標準）
        // 實際應用需要更完整的數據
        return [
            // 動作技能 (MOTOR)
            {
                name: '抬頭',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 1,
                description: '趴著時能抬頭並保持短暫時間'
            },
            {
                name: '翻身',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 4,
                description: '能從仰臥翻到俯臥，或從俯臥翻到仰臥'
            },
            {
                name: '坐起',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 6,
                description: '可以在沒有支撐的情況下坐直'
            },
            {
                name: '爬行',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 9,
                description: '能用手和膝蓋爬行移動'
            },
            {
                name: '站立',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 10,
                description: '可以扶著物體站立'
            },
            {
                name: '獨立行走',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 12,
                description: '可以獨立行走幾步而不需要支撐'
            },
            {
                name: '跑步',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 18,
                description: '能夠穩定地跑步'
            },
            {
                name: '踢球',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 20,
                description: '能夠踢球前進'
            },
            {
                name: '跳躍',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 24,
                description: '能夠原地跳躍'
            },
            {
                name: '上下樓梯',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 30,
                description: '能夠扶著扶手上下樓梯，每階一腳'
            },
            {
                name: '騎三輪車',
                category: this.MILESTONE_CATEGORIES.MOTOR,
                ageMonthRecommended: 36,
                description: '能夠踩踏三輪車前進'
            },
            
            // 語言能力 (LANGUAGE)
            {
                name: '發出咕咕聲',
                category: this.MILESTONE_CATEGORIES.LANGUAGE,
                ageMonthRecommended: 2,
                description: '能發出簡單的咕咕聲或元音聲'
            },
            {
                name: '牙牙學語',
                category: this.MILESTONE_CATEGORIES.LANGUAGE,
                ageMonthRecommended: 6,
                description: '發出連續的聲音組合，如"ba-ba"或"ma-ma"'
            },
            {
                name: '理解簡單指令',
                category: this.MILESTONE_CATEGORIES.LANGUAGE,
                ageMonthRecommended: 9,
                description: '對自己的名字有反應，理解"不"的含義'
            },
            {
                name: '說第一個詞',
                category: this.MILESTONE_CATEGORIES.LANGUAGE,
                ageMonthRecommended: 12,
                description: '能說一兩個單詞，如"媽媽"、"爸爸"'
            },
            {
                name: '詞彙增加',
                category: this.MILESTONE_CATEGORIES.LANGUAGE,
                ageMonthRecommended: 18,
                description: '能說至少10個單詞'
            },
            {
                name: '兩詞組合',
                category: this.MILESTONE_CATEGORIES.LANGUAGE,
                ageMonthRecommended: 21,
                description: '能組合兩個詞，如"要喝"、"媽媽來"'
            },
            {
                name: '簡單句子',
                category: this.MILESTONE_CATEGORIES.LANGUAGE,
                ageMonthRecommended: 24,
                description: '能說簡單的短句，如"我要喝水"'
            },
            {
                name: '說出全名',
                category: this.MILESTONE_CATEGORIES.LANGUAGE,
                ageMonthRecommended: 30,
                description: '能說出自己的全名'
            },
            {
                name: '複雜句子',
                category: this.MILESTONE_CATEGORIES.LANGUAGE,
                ageMonthRecommended: 36,
                description: '使用複雜句子，包含"和"、"因為"等連接詞'
            },
            
            // 社交情感 (SOCIAL)
            {
                name: '社交性微笑',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 2,
                description: '對人微笑回應'
            },
            {
                name: '認識親人',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 4,
                description: '能分辨熟悉的人和陌生人'
            },
            {
                name: '陌生人焦慮',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 8,
                description: '對陌生人表現出不安或害怕'
            },
            {
                name: '模仿動作',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 10,
                description: '模仿簡單的動作或表情'
            },
            {
                name: '玩躲貓貓',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 9,
                description: '參與互動遊戲如躲貓貓'
            },
            {
                name: '表達情感',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 15,
                description: '能清楚表達喜怒哀樂等基本情感'
            },
            {
                name: '平行遊戲',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 18,
                description: '在其他孩子旁邊玩耍，但不一定互動'
            },
            {
                name: '表現同理心',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 24,
                description: '對他人情緒表現出關心'
            },
            {
                name: '輪流遊戲',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 30,
                description: '能在遊戲中輪流，展現基本合作能力'
            },
            {
                name: '想像性遊戲',
                category: this.MILESTONE_CATEGORIES.SOCIAL,
                ageMonthRecommended: 36,
                description: '參與角色扮演等想像性遊戲'
            },
            
            // 認知能力 (COGNITIVE)
            {
                name: '視覺追蹤',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 1,
                description: '能用眼睛追蹤移動的物體'
            },
            {
                name: '抓握玩具',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 3,
                description: '能伸手抓握感興趣的玩具'
            },
            {
                name: '物體永續性',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 8,
                description: '理解被遮蓋的物體仍然存在'
            },
            {
                name: '因果關係',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 10,
                description: '理解簡單的因果關係，如按鈕會發出聲音'
            },
            {
                name: '功能性使用',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 12,
                description: '按照物品的功能正確使用，如杯子用來喝水'
            },
            {
                name: '指認身體部位',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 15,
                description: '能指認至少三個身體部位'
            },
            {
                name: '完成簡單拼圖',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 18,
                description: '能完成2-3片的簡單拼圖'
            },
            {
                name: '分類物品',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 24,
                description: '能按照形狀或顏色分類物品'
            },
            {
                name: '計數到三',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 30,
                description: '能正確數到3，理解數量概念'
            },
            {
                name: '辨認顏色',
                category: this.MILESTONE_CATEGORIES.COGNITIVE,
                ageMonthRecommended: 36,
                description: '能辨認並命名至少四種基本顏色'
            }
        ];
    }
}

// 添加到ChildService的方法，讓新孩子自動初始化里程碑
// 建議在ChildService.js中添加以下代碼到addChild方法的最後
/*
static async addChild(childData) {
    try {
        // 現有代碼...
        
        const childId = await Database.add(this.STORE_NAME, newChild);
        
        // 為新孩子初始化標準里程碑
        try {
            await MilestoneService.initializeStandardMilestones(childId);
        } catch (milestoneError) {
            console.error('初始化標準里程碑失敗:', milestoneError);
            // 不影響孩子創建
        }
        
        return childId;
    } catch (error) {
        // 錯誤處理...
    }
}
*/

// 初始化應用時的代碼
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (window.AppLog) window.AppLog.addLog("應用初始化 - 開始");
        await Database.initDatabase();
        if (window.AppLog) window.AppLog.addLog("應用初始化 - 數據庫初始化成功");
        
        // 檢查當前孩子並初始化標準里程碑
        const currentChild = await ChildService.getCurrentChild();
        if (currentChild) {
            if (window.AppLog) window.AppLog.addLog(`檢查當前孩子的里程碑`);
            try {
                const milestoneCount = await Database.countByIndex('milestones', 'childId', currentChild.id);
                if (milestoneCount === 0) {
                    if (window.AppLog) window.AppLog.addLog(`當前孩子沒有里程碑記錄，開始初始化`);
                    await MilestoneService.initializeStandardMilestones(currentChild.id);
                    if (window.AppLog) window.AppLog.addLog(`標準里程碑初始化完成`);
                }
            } catch (error) {
                console.error('里程碑初始化檢查失敗:', error);
            }
        }
    } catch (error) {
        if (window.AppLog) window.AppLog.addLog(`應用初始化失敗: ${error.message}`);
        console.error('應用初始化失敗:', error);
        
        // 顯示錯誤到頁面
        const errorDiv = document.getElementById('errorMessages');
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.innerText = `應用初始化失敗: ${error.message}`;
        }
    }
});

// 導出服務
window.MilestoneService = MilestoneService;