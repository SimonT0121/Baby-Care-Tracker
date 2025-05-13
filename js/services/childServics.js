/**
 * 孩子數據服務 - 處理與孩子相關的數據操作
 */
class ChildService {
    /**
     * 存儲表名
     * @type {string}
     */
    static STORE_NAME = 'children';
    
    /**
     * 檢索所有孩子數據
     * @returns {Promise<Array>} 孩子數據數組
     */
    static async getAllChildren() {
        try {
            return await Database.getAll(this.STORE_NAME);
        } catch (error) {
            console.error('獲取所有孩子數據失敗:', error);
            throw error;
        }
    }
    
    /**
     * 根據ID檢索孩子數據
     * @param {string} childId 孩子ID
     * @returns {Promise<Object>} 孩子數據對象
     */
    static async getChildById(childId) {
        try {
            return await Database.get(this.STORE_NAME, childId);
        } catch (error) {
            console.error(`獲取孩子 ${childId} 數據失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 根據名稱檢索孩子數據
     * @param {string} name 孩子名稱
     * @returns {Promise<Array>} 孩子數據數組
     */
    static async getChildrenByName(name) {
        try {
            const allChildren = await Database.getAll(this.STORE_NAME);
            // 使用模糊匹配
            return allChildren.filter(child => 
                child.name.toLowerCase().includes(name.toLowerCase())
            );
        } catch (error) {
            console.error(`根據名稱檢索孩子數據失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 添加新孩子
     * @param {Object} childData 孩子數據對象
     * @returns {Promise<string>} 新添加的孩子ID
     */
    static async addChild(childData) {
        try {
            // 驗證必填字段
            if (!childData.name) {
                throw new Error('孩子名稱是必填的');
            }
            
            if (!childData.birthDate) {
                throw new Error('出生日期是必填的');
            }
            
            // 設置默認值
            const newChild = {
                ...childData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // 添加到數據庫
            const childId = await Database.add(this.STORE_NAME, newChild);
            return childId;
        } catch (error) {
            console.error('添加孩子數據失敗:', error);
            throw error;
        }
    }
    
    /**
     * 更新孩子數據
     * @param {string} childId 孩子ID
     * @param {Object} childData 更新的孩子數據
     * @returns {Promise<string>} 更新的孩子ID
     */
    static async updateChild(childId, childData) {
        try {
            // 檢查孩子是否存在
            const existingChild = await Database.get(this.STORE_NAME, childId);
            
            if (!existingChild) {
                throw new Error(`找不到ID為 ${childId} 的孩子`);
            }
            
            // 更新數據
            const updatedData = {
                ...childData,
                id: childId,
                updatedAt: new Date()
            };
            
            await Database.update(this.STORE_NAME, updatedData);
            return childId;
        } catch (error) {
            console.error(`更新孩子 ${childId} 數據失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 刪除孩子及其相關數據
     * @param {string} childId 孩子ID
     * @returns {Promise<boolean>} 是否成功刪除
     */
    static async deleteChild(childId) {
        try {
            // 檢查孩子是否存在
            const existingChild = await Database.get(this.STORE_NAME, childId);
            
            if (!existingChild) {
                throw new Error(`找不到ID為 ${childId} 的孩子`);
            }
            
            // 開始刪除操作
            // 1. 刪除該孩子的所有相關數據（活動、健康記錄、里程碑）
            await Database.deleteByIndex('dailyActivities', 'childId', childId);
            await Database.deleteByIndex('healthRecords', 'childId', childId);
            await Database.deleteByIndex('milestones', 'childId', childId);
            
            // 2. 刪除孩子記錄
            await Database.delete(this.STORE_NAME, childId);
            
            return true;
        } catch (error) {
            console.error(`刪除孩子 ${childId} 數據失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 計算孩子當前年齡
     * @param {string} childId 孩子ID
     * @returns {Promise<Object>} 年齡對象 {years, months, days}
     */
    static async getChildAge(childId) {
        try {
            const child = await this.getChildById(childId);
            
            if (!child || !child.birthDate) {
                throw new Error('無效的孩子數據或出生日期');
            }
            
            return Utils.calculateAge(child.birthDate);
        } catch (error) {
            console.error(`計算孩子 ${childId} 年齡失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取孩子月齡
     * @param {string} childId 孩子ID
     * @returns {Promise<number>} 月齡
     */
    static async getChildAgeInMonths(childId) {
        try {
            const age = await this.getChildAge(childId);
            return age.years * 12 + age.months;
        } catch (error) {
            console.error(`獲取孩子 ${childId} 月齡失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 檢查是否有設置當前選中的孩子
     * @returns {Promise<boolean>} 是否有當前孩子
     */
    static async hasCurrentChild() {
        try {
            // 從本地存儲獲取當前選中的孩子ID
            const currentChildId = localStorage.getItem('currentChildId');
            
            if (!currentChildId) {
                return false;
            }
            
            // 檢查該孩子是否存在
            const child = await this.getChildById(currentChildId);
            return !!child;
        } catch (error) {
            console.error('檢查當前孩子失敗:', error);
            return false;
        }
    }
    
    /**
     * 獲取當前選中的孩子
     * @returns {Promise<Object>} 當前孩子數據對象
     */
    static async getCurrentChild() {
        try {
            // 從本地存儲獲取當前選中的孩子ID
            const currentChildId = localStorage.getItem('currentChildId');
            
            if (!currentChildId) {
                return null;
            }
            
            return await this.getChildById(currentChildId);
        } catch (error) {
            console.error('獲取當前孩子失敗:', error);
            return null;
        }
    }
    
    /**
     * 設置當前選中的孩子
     * @param {string} childId 孩子ID
     * @returns {Promise<Object>} 設置的當前孩子數據對象
     */
    static async setCurrentChild(childId) {
        try {
            // 檢查孩子是否存在
            const child = await this.getChildById(childId);
            
            if (!child) {
                throw new Error(`找不到ID為 ${childId} 的孩子`);
            }
            
            // 保存到本地存儲
            localStorage.setItem('currentChildId', childId);
            
            return child;
        } catch (error) {
            console.error(`設置當前孩子 ${childId} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取最近添加的孩子
     * @param {number} [limit=5] 限制數量
     * @returns {Promise<Array>} 孩子數據數組
     */
    static async getRecentChildren(limit = 5) {
        try {
            const allChildren = await this.getAllChildren();
            
            // 按創建時間排序
            allChildren.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB - dateA; // 降序
            });
            
            // 返回前N個
            return allChildren.slice(0, limit);
        } catch (error) {
            console.error('獲取最近添加孩子失敗:', error);
            throw error;
        }
    }
}

// 導出服務
window.ChildService = ChildService;
