/**
 * 健康數據服務 - 處理健康記錄相關的數據操作
 */
class HealthService {
    /**
     * 存儲表名
     * @type {string}
     */
    static STORE_NAME = 'healthRecords';
    
    /**
     * 健康記錄類型列表
     * @type {Object}
     */
    static HEALTH_TYPES = {
        GROWTH: 'growth',        // 生長數據 (體重、身高、頭圍)
        CHECKUP: 'checkup',      // 健康訪視
        VACCINE: 'vaccine',      // 疫苗接種
        MEDICATION: 'medication' // 用藥記錄
    };
    
    /**
     * 添加健康記錄
     * @param {Object} healthData 健康記錄數據
     * @returns {Promise<string>} 新添加的記錄ID
     */
    static async addHealthRecord(healthData) {
        try {
            // 驗證必填字段
            if (!healthData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            if (!healthData.type || !Object.values(this.HEALTH_TYPES).includes(healthData.type)) {
                throw new Error('無效的健康記錄類型');
            }
            
            if (!healthData.timestamp) {
                healthData.timestamp = new Date();
            }
            
            // 特定記錄類型的驗證
            if (healthData.type === this.HEALTH_TYPES.GROWTH) {
                if (!healthData.details) {
                    throw new Error('生長記錄必須包含詳細數據');
                }
            }
            
            // 設置默認值
            const newRecord = {
                ...healthData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // 添加到數據庫
            const recordId = await Database.add(this.STORE_NAME, newRecord);
            return recordId;
        } catch (error) {
            console.error('添加健康記錄失敗:', error);
            throw error;
        }
    }
    
    /**
     * 更新健康記錄
     * @param {string} recordId 記錄ID
     * @param {Object} healthData 更新的健康記錄數據
     * @returns {Promise<string>} 更新的記錄ID
     */
    static async updateHealthRecord(recordId, healthData) {
        try {
            // 檢查記錄是否存在
            const existingRecord = await Database.get(this.STORE_NAME, recordId);
            
            if (!existingRecord) {
                throw new Error(`找不到ID為 ${recordId} 的健康記錄`);
            }
            
            // 更新數據
            const updatedData = {
                ...healthData,
                id: recordId,
                updatedAt: new Date()
            };
            
            await Database.update(this.STORE_NAME, updatedData);
            return recordId;
        } catch (error) {
            console.error(`更新健康記錄 ${recordId} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 刪除健康記錄
     * @param {string} recordId 記錄ID
     * @returns {Promise<boolean>} 是否成功刪除
     */
    static async deleteHealthRecord(recordId) {
        try {
            await Database.delete(this.STORE_NAME, recordId);
            return true;
        } catch (error) {
            console.error(`刪除健康記錄 ${recordId} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 根據記錄ID獲取健康記錄
     * @param {string} recordId 記錄ID
     * @returns {Promise<Object>} 健康記錄數據對象
     */
    static async getHealthRecordById(recordId) {
        try {
            return await Database.get(this.STORE_NAME, recordId);
        } catch (error) {
            console.error(`獲取健康記錄 ${recordId} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取孩子所有健康記錄
     * @param {string} childId 孩子ID
     * @returns {Promise<Array>} 健康記錄數組
     */
    static async getAllHealthRecords(childId) {
        try {
            return await Database.getByIndex(this.STORE_NAME, 'childId', childId);
        } catch (error) {
            console.error(`獲取孩子 ${childId} 的所有健康記錄失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取孩子特定類型的健康記錄
     * @param {string} childId 孩子ID
     * @param {string} recordType 記錄類型
     * @returns {Promise<Array>} 健康記錄數組
     */
    static async getHealthRecordsByType(childId, recordType) {
        try {
            const allRecords = await this.getAllHealthRecords(childId);
            return allRecords.filter(record => record.type === recordType);
        } catch (error) {
            console.error(`獲取孩子 ${childId} 的 ${recordType} 類型健康記錄失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取孩子最新的生長記錄
     * @param {string} childId 孩子ID
     * @returns {Promise<Object>} 最新的生長記錄
     */
    static async getLatestGrowthRecord(childId) {
        try {
            const growthRecords = await this.getHealthRecordsByType(childId, this.HEALTH_TYPES.GROWTH);
            
            if (growthRecords.length === 0) {
                return null;
            }
            
            // 按時間排序，獲取最新的記錄
            growthRecords.sort((a, b) => {
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
            
            return growthRecords[0];
        } catch (error) {
            console.error(`獲取孩子 ${childId} 的最新生長記錄失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 添加生長記錄
     * @param {Object} growthData 生長數據
     * @returns {Promise<string>} 新添加的記錄ID
     */
    static async addGrowthRecord(growthData) {
        try {
            // 確保數據完整性
            if (!growthData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            // 確保詳細信息存在
            if (!growthData.details) {
                growthData.details = {};
            }
            
            // 創建健康記錄數據
            const healthData = {
                childId: growthData.childId,
                type: this.HEALTH_TYPES.GROWTH,
                timestamp: growthData.timestamp || new Date(),
                details: growthData.details,
                note: growthData.note || ''
            };
            
            return await this.addHealthRecord(healthData);
        } catch (error) {
            console.error('添加生長記錄失敗:', error);
            throw error;
        }
    }
    
    /**
     * 添加健康訪視記錄
     * @param {Object} checkupData 健康訪視數據
     * @returns {Promise<string>} 新添加的記錄ID
     */
    static async addCheckupRecord(checkupData) {
        try {
            // 確保數據完整性
            if (!checkupData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            // 確保詳細信息存在
            if (!checkupData.details) {
                checkupData.details = {};
            }
            
            // 創建健康記錄數據
            const healthData = {
                childId: checkupData.childId,
                type: this.HEALTH_TYPES.CHECKUP,
                timestamp: checkupData.timestamp || new Date(),
                details: checkupData.details,
                note: checkupData.note || ''
            };
            
            return await this.addHealthRecord(healthData);
        } catch (error) {
            console.error('添加健康訪視記錄失敗:', error);
            throw error;
        }
    }
    
    /**
     * 添加疫苗接種記錄
     * @param {Object} vaccineData 疫苗接種數據
     * @returns {Promise<string>} 新添加的記錄ID
     */
    static async addVaccineRecord(vaccineData) {
        try {
            // 確保數據完整性
            if (!vaccineData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            // 確保詳細信息存在
            if (!vaccineData.details) {
                vaccineData.details = {};
            }
            
            // 創建健康記錄數據
            const healthData = {
                childId: vaccineData.childId,
                type: this.HEALTH_TYPES.VACCINE,
                timestamp: vaccineData.timestamp || new Date(),
                details: vaccineData.details,
                note: vaccineData.note || ''
            };
            
            return await this.addHealthRecord(healthData);
        } catch (error) {
            console.error('添加疫苗接種記錄失敗:', error);
            throw error;
        }
    }
    
    /**
     * 添加用藥記錄
     * @param {Object} medicationData 用藥數據
     * @returns {Promise<string>} 新添加的記錄ID
     */
    static async addMedicationRecord(medicationData) {
        try {
            // 確保數據完整性
            if (!medicationData.childId) {
                throw new Error('必須指定孩子ID');
            }
            
            // 確保詳細信息存在
            if (!medicationData.details) {
                medicationData.details = {};
            }
            
            // 創建健康記錄數據
            const healthData = {
                childId: medicationData.childId,
                type: this.HEALTH_TYPES.MEDICATION,
                timestamp: medicationData.timestamp || new Date(),
                details: medicationData.details,
                note: medicationData.note || ''
            };
            
            return await this.addHealthRecord(healthData);
        } catch (error) {
            console.error('添加用藥記錄失敗:', error);
            throw error;
        }
    }
    
    /**
     * 獲取生長記錄歷史
     * @param {string} childId 孩子ID
     * @returns {Promise<Object>} 格式化的生長歷史數據
     */
    static async getGrowthHistory(childId) {
        try {
            // 獲取所有生長記錄
            const growthRecords = await this.getHealthRecordsByType(childId, this.HEALTH_TYPES.GROWTH);
            
            if (growthRecords.length === 0) {
                return {
                    dates: [],
                    weights: [],
                    heights: [],
                    headCircumferences: []
                };
            }
            
            // 按時間排序
            growthRecords.sort((a, b) => {
                return new Date(a.timestamp) - new Date(b.timestamp);
            });
            
            // 格式化數據
            const dates = [];
            const weights = [];
            const heights = [];
            const headCircumferences = [];
            
            growthRecords.forEach(record => {
                const details = record.details || {};
                const date = Utils.formatDate(record.timestamp);
                
                dates.push(date);
                
                if (details.weight !== undefined) {
                    weights.push(parseFloat(details.weight));
                } else {
                    weights.push(null);
                }
                
                if (details.height !== undefined) {
                    heights.push(parseFloat(details.height));
                } else {
                    heights.push(null);
                }
                
                if (details.headCircumference !== undefined) {
                    headCircumferences.push(parseFloat(details.headCircumference));
                } else {
                    headCircumferences.push(null);
                }
            });
            
            return {
                dates,
                weights,
                heights,
                headCircumferences,
                records: growthRecords
            };
        } catch (error) {
            console.error(`獲取孩子 ${childId} 的生長記錄歷史失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 計算生長數據百分位
     * @param {string} childId 孩子ID
     * @param {Object} growthData 生長數據 {weight, height, headCircumference}
     * @returns {Promise<Object>} 百分位數據
     */
    static async calculateGrowthPercentiles(childId, growthData) {
        try {
            // 獲取孩子信息
            const child = await ChildService.getChildById(childId);
            
            if (!child) {
                throw new Error(`找不到ID為 ${childId} 的孩子`);
            }
            
            // 計算月齡
            const age = Utils.calculateAge(child.birthDate);
            const ageInMonths = age.years * 12 + age.months;
            
            // 計算各項指標的百分位
            const results = {
                weight: null,
                height: null,
                headCircumference: null
            };
            
            // 體重百分位
            if (growthData.weight !== undefined) {
                const weightStandard = Utils.getGrowthStandard(child.gender, ageInMonths, 'weight');
                if (weightStandard) {
                    results.weight = {
                        value: growthData.weight,
                        percentile: Utils.getGrowthPercentile(growthData.weight, weightStandard),
                        standard: weightStandard
                    };
                }
            }
            
            // 身高百分位
            if (growthData.height !== undefined) {
                const heightStandard = Utils.getGrowthStandard(child.gender, ageInMonths, 'height');
                if (heightStandard) {
                    results.height = {
                        value: growthData.height,
                        percentile: Utils.getGrowthPercentile(growthData.height, heightStandard),
                        standard: heightStandard
                    };
                }
            }
            
            // 頭圍百分位
            if (growthData.headCircumference !== undefined) {
                const headStandard = Utils.getGrowthStandard(child.gender, ageInMonths, 'headCircumference');
                if (headStandard) {
                    results.headCircumference = {
                        value: growthData.headCircumference,
                        percentile: Utils.getGrowthPercentile(growthData.headCircumference, headStandard),
                        standard: headStandard
                    };
                }
            }
            
            return results;
        } catch (error) {
            console.error(`計算生長數據百分位失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 獲取建議的疫苗接種計劃
     * @param {string} childId 孩子ID
     * @returns {Promise<Array>} 疫苗接種計劃
     */
    static async getRecommendedVaccines(childId) {
        try {
            // 獲取孩子信息
            const child = await ChildService.getChildById(childId);
            
            if (!child) {
                throw new Error(`找不到ID為 ${childId} 的孩子`);
            }
            
            // 計算月齡
            const age = Utils.calculateAge(child.birthDate);
            const ageInMonths = age.years * 12 + age.months;
            
            // 標準疫苗接種計劃 (基於臺灣衛生福利部建議)
            // 這裡使用簡化版，實際應用需要完整數據
            const standardVaccines = [
                { 
                    ageMonths: 0, 
                    name: 'B型肝炎疫苗第1劑', 
                    details: '出生24小時內' 
                },
                { 
                    ageMonths: 1, 
                    name: 'B型肝炎疫苗第2劑', 
                    details: '出生滿1個月' 
                },
                { 
                    ageMonths: 2, 
                    name: '13價結合型肺炎鏈球菌疫苗第1劑', 
                    details: '出生滿2個月' 
                },
                { 
                    ageMonths: 2, 
                    name: '六合一疫苗第1劑', 
                    details: '白喉、破傷風、非細胞性百日咳、b型嗜血桿菌、不活化小兒麻痺、B型肝炎' 
                },
                { 
                    ageMonths: 4, 
                    name: '13價結合型肺炎鏈球菌疫苗第2劑', 
                    details: '出生滿4個月' 
                },
                { 
                    ageMonths: 4, 
                    name: '六合一疫苗第2劑', 
                    details: '白喉、破傷風、非細胞性百日咳、b型嗜血桿菌、不活化小兒麻痺、B型肝炎' 
                },
                { 
                    ageMonths: 6, 
                    name: '六合一疫苗第3劑', 
                    details: '白喉、破傷風、非細胞性百日咳、b型嗜血桿菌、不活化小兒麻痺、B型肝炎' 
                },
                { 
                    ageMonths: 6, 
                    name: '流感疫苗', 
                    details: '每年接種' 
                },
                { 
                    ageMonths: 12, 
                    name: '水痘疫苗', 
                    details: '出生滿12個月' 
                },
                { 
                    ageMonths: 12, 
                    name: 'MMR疫苗第1劑', 
                    details: '麻疹、腮腺炎、德國麻疹混合疫苗' 
                },
                { 
                    ageMonths: 12, 
                    name: '13價結合型肺炎鏈球菌疫苗第3劑', 
                    details: '出生滿12-15個月' 
                },
                { 
                    ageMonths: 15, 
                    name: '日本腦炎疫苗第1劑', 
                    details: '出生滿15個月' 
                },
                { 
                    ageMonths: 18, 
                    name: '六合一疫苗第4劑', 
                    details: '白喉、破傷風、非細胞性百日咳、b型嗜血桿菌、不活化小兒麻痺、B型肝炎' 
                },
                { 
                    ageMonths: 24, 
                    name: 'A型肝炎疫苗', 
                    details: '出生滿12-24個月' 
                },
                { 
                    ageMonths: 27, 
                    name: '日本腦炎疫苗第2劑', 
                    details: '第1劑接種滿12個月' 
                },
                { 
                    ageMonths: 36, 
                    name: '日本腦炎疫苗第3劑', 
                    details: '第2劑接種滿12個月' 
                },
                { 
                    ageMonths: 60, 
                    name: 'MMR疫苗第2劑', 
                    details: '麻疹、腮腺炎、德國麻疹混合疫苗，國小入學前' 
                },
                { 
                    ageMonths: 60, 
                    name: 'DTaP-IPV疫苗', 
                    details: '白喉、破傷風、非細胞性百日咳、不活化小兒麻痺，國小入學前' 
                }
            ];
            
            // 獲取已接種疫苗
            const vaccineRecords = await this.getHealthRecordsByType(childId, this.HEALTH_TYPES.VACCINE);
            
            // 過濾和標記疫苗
            const recommended = standardVaccines.map(vaccine => {
                // 檢查是否已接種
                const vaccinated = vaccineRecords.some(record => {
                    const details = record.details || {};
                    return details.name === vaccine.name;
                });
                
                // 計算建議接種日期
                const birthDate = new Date(child.birthDate);
                const recommendedDate = new Date(birthDate);
                recommendedDate.setMonth(birthDate.getMonth() + vaccine.ageMonths);
                
                return {
                    ...vaccine,
                    vaccinated,
                    recommendedDate,
                    status: getVaccineStatus(vaccine, ageInMonths, vaccinated)
                };
            });
            
            // 按建議接種時間排序
            recommended.sort((a, b) => a.ageMonths - b.ageMonths);
            
            return recommended;
            
            // 輔助函數：獲取疫苗接種狀態
            function getVaccineStatus(vaccine, ageInMonths, vaccinated) {
                if (vaccinated) {
                    return 'completed';
                } else if (ageInMonths >= vaccine.ageMonths) {
                    return 'due';
                } else {
                    return 'upcoming';
                }
            }
        } catch (error) {
            console.error(`獲取建議疫苗接種計劃失敗:`, error);
            throw error;
        }
    }
}

// 導出服務
window.HealthService = HealthService;