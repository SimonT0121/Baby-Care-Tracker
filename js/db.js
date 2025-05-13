/**
 * IndexedDB 數據庫操作封裝
 */
class Database {
    // 數據庫名稱和版本
    static DB_NAME = 'BabyCareTrackerDB';
    static DB_VERSION = 1;
    
    // 數據庫架構定義
    static DB_SCHEMA = {
        children: { keyPath: 'id', indexes: ['name'] },
        dailyActivities: { 
            keyPath: 'id',
            indexes: ['childId', 'timestamp', 'type']
        },
        healthRecords: { 
            keyPath: 'id',
            indexes: ['childId', 'timestamp', 'type']
        },
        milestones: { 
            keyPath: 'id',
            indexes: ['childId', 'achievedDate']
        },
        settings: { keyPath: 'id' }
    };
    
    // 數據類型定義，用於數據校驗
    static DATA_TYPES = {
        children: {
            id: 'string',
            name: 'string',
            gender: 'string',
            birthDate: 'date',
            photo: 'string',
            createdAt: 'date',
            updatedAt: 'date'
        },
        dailyActivities: {
            id: 'string',
            childId: 'string',
            type: 'string', // feed, sleep, diaper
            timestamp: 'date',
            endTime: 'date', // 用於睡眠時間段
            details: 'object',
            note: 'string',
            createdAt: 'date',
            updatedAt: 'date'
        },
        healthRecords: {
            id: 'string',
            childId: 'string',
            type: 'string', // growth, checkup, vaccine, medication
            timestamp: 'date',
            details: 'object',
            note: 'string',
            createdAt: 'date',
            updatedAt: 'date'
        },
        milestones: {
            id: 'string',
            childId: 'string',
            name: 'string',
            category: 'string', // motor, language, social, cognitive
            ageMonthRecommended: 'number',
            achievedDate: 'date',
            note: 'string',
            createdAt: 'date',
            updatedAt: 'date'
        },
        settings: {
            id: 'string',
            theme: 'string',
            language: 'string',
            dataRetention: 'number',
            backupFrequency: 'number',
            lastBackupDate: 'date',
            createdAt: 'date',
            updatedAt: 'date'
        }
    };
    
    // 數據庫連接
    static dbPromise = null;
    
    /**
     * 初始化數據庫連接
     * @returns {Promise} 數據庫連接Promise
     */
    static async initDatabase() {
        if (this.dbPromise) {
            return this.dbPromise;
        }
        
        this.dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('瀏覽器不支持 IndexedDB'));
                return;
            }
            
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = (event) => {
                console.error('數據庫打開失敗:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                console.log('數據庫連接成功');
                
                // 數據庫連接丟失時的處理
                db.onversionchange = () => {
                    db.close();
                    window.location.reload();
                };
                
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('正在創建/升級數據庫...');
                
                // 創建表和索引
                for (const [storeName, storeConfig] of Object.entries(this.DB_SCHEMA)) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const objectStore = db.createObjectStore(storeName, { keyPath: storeConfig.keyPath });
                        console.log(`創建數據表: ${storeName}`);
                        
                        // 創建索引
                        if (storeConfig.indexes) {
                            storeConfig.indexes.forEach(indexName => {
                                objectStore.createIndex(indexName, indexName, { unique: false });
                                console.log(`創建索引: ${storeName}.${indexName}`);
                            });
                        }
                    }
                }
            };
        });
        
        return this.dbPromise;
    }
    
    /**
     * 獲取數據庫連接
     * @returns {Promise} 數據庫連接
     */
    static async getDatabase() {
        if (!this.dbPromise) {
            await this.initDatabase();
        }
        return this.dbPromise;
    }
    
    /**
     * 生成唯一ID
     * @returns {string} UUID字符串
     */
    static generateId() {
        // 簡單實現UUID v4
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * 驗證數據字段類型
     * @param {string} storeName 表名
     * @param {Object} data 數據對象
     * @returns {Object} 處理後的數據
     */
    static validateData(storeName, data) {
        if (!this.DATA_TYPES[storeName]) {
            throw new Error(`未知的數據表: ${storeName}`);
        }
        
        const dataTypes = this.DATA_TYPES[storeName];
        const result = { ...data };
        
        // 設置默認值和類型轉換
        for (const [field, type] of Object.entries(dataTypes)) {
            // 自動填充ID字段
            if (field === 'id' && !result.id) {
                result.id = this.generateId();
                continue;
            }
            
            // 自動填充時間戳
            if ((field === 'createdAt' || field === 'updatedAt') && !result[field]) {
                result[field] = new Date();
                continue;
            }
            
            // 跳過未設置的可選字段
            if (result[field] === undefined) {
                continue;
            }
            
            // 類型轉換
            if (type === 'date' && typeof result[field] === 'string') {
                result[field] = new Date(result[field]);
            } else if (type === 'number' && typeof result[field] === 'string') {
                result[field] = parseFloat(result[field]);
            }
        }
        
        return result;
    }
    
    /**
     * 添加數據
     * @param {string} storeName 表名
     * @param {Object} data 數據對象
     * @returns {Promise<string>} 成功添加的數據ID
     */
    static async add(storeName, data) {
        const db = await this.getDatabase();
        const validatedData = this.validateData(storeName, data);
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // 設置時間戳
            if (!validatedData.createdAt) {
                validatedData.createdAt = new Date();
            }
            if (!validatedData.updatedAt) {
                validatedData.updatedAt = new Date();
            }
            
            const request = store.add(validatedData);
            
            request.onsuccess = () => {
                resolve(validatedData.id);
            };
            
            request.onerror = (event) => {
                console.error(`添加數據失敗 (${storeName}):`, event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                console.log(`數據添加成功 (${storeName})`, validatedData.id);
            };
        });
    }
    
    /**
     * 更新數據
     * @param {string} storeName 表名
     * @param {Object} data 數據對象（必須包含ID）
     * @returns {Promise<string>} 成功更新的數據ID
     */
    static async update(storeName, data) {
        if (!data.id) {
            throw new Error('更新數據必須提供ID');
        }
        
        const db = await this.getDatabase();
        const validatedData = this.validateData(storeName, data);
        
        // 始終更新更新時間
        validatedData.updatedAt = new Date();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // 先檢查是否存在
            const getRequest = store.get(data.id);
            
            getRequest.onsuccess = (event) => {
                if (!event.target.result) {
                    reject(new Error(`更新的記錄不存在: ${data.id}`));
                    return;
                }
                
                // 合併現有數據和新數據
                const existingData = event.target.result;
                const mergedData = { ...existingData, ...validatedData };
                
                const updateRequest = store.put(mergedData);
                
                updateRequest.onsuccess = () => {
                    resolve(data.id);
                };
                
                updateRequest.onerror = (event) => {
                    console.error(`更新數據失敗 (${storeName}):`, event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error(`獲取數據失敗 (${storeName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 獲取單條數據
     * @param {string} storeName 表名
     * @param {string} id 數據ID
     * @returns {Promise<Object>} 數據對象
     */
    static async get(storeName, id) {
        const db = await this.getDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = (event) => {
                resolve(event.target.result || null);
            };
            
            request.onerror = (event) => {
                console.error(`獲取數據失敗 (${storeName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 通過索引獲取數據
     * @param {string} storeName 表名
     * @param {string} indexName 索引名
     * @param {*} indexValue 索引值
     * @returns {Promise<Array>} 數據對象數組
     */
    static async getByIndex(storeName, indexName, indexValue) {
        const db = await this.getDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(indexValue);
            
            request.onsuccess = (event) => {
                resolve(event.target.result || []);
            };
            
            request.onerror = (event) => {
                console.error(`通過索引獲取數據失敗 (${storeName}.${indexName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 通過索引範圍獲取數據
     * @param {string} storeName 表名
     * @param {string} indexName 索引名
     * @param {IDBKeyRange} range 索引範圍
     * @returns {Promise<Array>} 數據對象數組
     */
    static async getByRange(storeName, indexName, range) {
        const db = await this.getDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(range);
            
            request.onsuccess = (event) => {
                resolve(event.target.result || []);
            };
            
            request.onerror = (event) => {
                console.error(`通過索引範圍獲取數據失敗 (${storeName}.${indexName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 獲取所有數據
     * @param {string} storeName 表名
     * @returns {Promise<Array>} 數據對象數組
     */
    static async getAll(storeName) {
        const db = await this.getDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                resolve(event.target.result || []);
            };
            
            request.onerror = (event) => {
                console.error(`獲取所有數據失敗 (${storeName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 獲取分頁數據
     * @param {string} storeName 表名
     * @param {string} indexName 索引名
     * @param {number} page 頁碼（從1開始）
     * @param {number} pageSize 每頁數量
     * @param {boolean} [descending=false] 是否降序排序
     * @returns {Promise<Object>} 帶分頁信息的數據對象
     */
    static async getPaginated(storeName, indexName, page = 1, pageSize = 10, descending = false) {
        const db = await this.getDatabase();
        
        return new Promise((resolve, reject) => {
            // 計算總數據量
            const countTransaction = db.transaction(storeName, 'readonly');
            const countStore = countTransaction.objectStore(storeName);
            const countRequest = countStore.count();
            
            countRequest.onsuccess = async (event) => {
                const totalCount = event.target.result;
                const totalPages = Math.ceil(totalCount / pageSize);
                
                // 計算偏移量，page 從 1 開始
                const offset = (page - 1) * pageSize;
                
                try {
                    // 獲取數據
                    const transaction = db.transaction(storeName, 'readonly');
                    const store = transaction.objectStore(storeName);
                    const index = indexName ? store.index(indexName) : store;
                    
                    let data = [];
                    let skipped = 0;
                    
                    // 使用游標遍歷
                    const cursorRequest = indexName
                        ? index.openCursor(null, descending ? 'prev' : 'next')
                        : store.openCursor(null, descending ? 'prev' : 'next');
                    
                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        
                        if (!cursor) {
                            // 沒有更多數據
                            resolve({
                                data,
                                pagination: {
                                    page,
                                    pageSize,
                                    totalPages,
                                    totalCount,
                                    hasNext: page < totalPages,
                                    hasPrev: page > 1
                                }
                            });
                            return;
                        }
                        
                        if (skipped < offset) {
                            // 跳過前面的數據
                            skipped++;
                            cursor.continue();
                        } else if (data.length < pageSize) {
                            // 添加數據
                            data.push(cursor.value);
                            cursor.continue();
                        }
                        // 達到數量後不再繼續
                    };
                    
                    cursorRequest.onerror = (event) => {
                        console.error(`獲取分頁數據失敗 (${storeName}):`, event.target.error);
                        reject(event.target.error);
                    };
                } catch (error) {
                    console.error(`獲取分頁數據出錯:`, error);
                    reject(error);
                }
            };
            
            countRequest.onerror = (event) => {
                console.error(`計算數據總量失敗 (${storeName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 刪除數據
     * @param {string} storeName 表名
     * @param {string} id 數據ID
     * @returns {Promise<boolean>} 是否成功刪除
     */
    static async delete(storeName, id) {
        const db = await this.getDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error(`刪除數據失敗 (${storeName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 按條件刪除數據
     * @param {string} storeName 表名
     * @param {string} indexName 索引名
     * @param {*} indexValue 索引值
     * @returns {Promise<number>} 成功刪除的數據數量
     */
    static async deleteByIndex(storeName, indexName, indexValue) {
        const db = await this.getDatabase();
        let deleteCount = 0;
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            
            // 先獲取所有符合條件的記錄
            const getRequest = index.getAll(indexValue);
            
            getRequest.onsuccess = (event) => {
                const records = event.target.result || [];
                
                if (records.length === 0) {
                    resolve(0);
                    return;
                }
                
                // 刪除每一條記錄
                records.forEach(record => {
                    const deleteRequest = store.delete(record.id);
                    
                    deleteRequest.onsuccess = () => {
                        deleteCount++;
                        
                        if (deleteCount === records.length) {
                            resolve(deleteCount);
                        }
                    };
                    
                    deleteRequest.onerror = (event) => {
                        console.error(`刪除數據失敗 (${storeName}, ID: ${record.id}):`, event.target.error);
                    };
                });
            };
            
            getRequest.onerror = (event) => {
                console.error(`獲取要刪除的數據失敗 (${storeName}.${indexName}):`, event.target.error);
                reject(event.target.error);
            };
            
            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 清空數據表
     * @param {string} storeName 表名
     * @returns {Promise<boolean>} 是否成功清空
     */
    static async clear(storeName) {
        const db = await this.getDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => {
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error(`清空數據表失敗 (${storeName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 計算數據數量
     * @param {string} storeName 表名
     * @returns {Promise<number>} 數據數量
     */
    static async count(storeName) {
        const db = await this.getDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error(`計算數據數量失敗 (${storeName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 計算符合條件的數據數量
     * @param {string} storeName 表名
     * @param {string} indexName 索引名
     * @param {*} indexValue 索引值
     * @returns {Promise<number>} 數據數量
     */
    static async countByIndex(storeName, indexName, indexValue) {
        const db = await this.getDatabase();
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.count(indexValue);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error(`計算符合條件的數據數量失敗 (${storeName}.${indexName}):`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 導出數據庫
     * @returns {Promise<Object>} 導出的數據
     */
    static async exportDatabase() {
        const db = await this.getDatabase();
        const exportData = {};
        
        // 獲取所有表的數據
        for (const storeName of Object.keys(this.DB_SCHEMA)) {
            exportData[storeName] = await this.getAll(storeName);
        }
        
        return exportData;
    }
    
    /**
     * 導入數據庫
     * @param {Object} importData 要導入的數據
     * @param {boolean} [clear=false] 是否先清空現有數據
     * @returns {Promise<boolean>} 是否成功導入
     */
    static async importDatabase(importData, clear = false) {
        const db = await this.getDatabase();
        
        // 檢查導入數據格式
        for (const storeName of Object.keys(this.DB_SCHEMA)) {
            if (!importData[storeName] || !Array.isArray(importData[storeName])) {
                throw new Error(`導入數據缺少必要的表: ${storeName}`);
            }
        }
        
        // 先備份當前數據
        const currentData = await this.exportDatabase();
        
        try {
            // 清空現有數據（如果需要）
            if (clear) {
                for (const storeName of Object.keys(this.DB_SCHEMA)) {
                    await this.clear(storeName);
                }
            }
            
            // 導入數據到每個表
            for (const [storeName, data] of Object.entries(importData)) {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // 添加每一條記錄
                for (const record of data) {
                    // 驗證數據
                    const validatedRecord = this.validateData(storeName, record);
                    
                    // 如果不是清空導入，需要檢查記錄是否已存在
                    if (!clear) {
                        const existingRecord = await this.get(storeName, record.id);
                        
                        if (existingRecord) {
                            // 更新已存在的記錄
                            await this.update(storeName, validatedRecord);
                            continue;
                        }
                    }
                    
                    // 添加新記錄
                    await new Promise((resolve, reject) => {
                        const request = store.add(validatedRecord);
                        
                        request.onsuccess = () => {
                            resolve();
                        };
                        
                        request.onerror = (event) => {
                            console.error(`導入數據失敗 (${storeName}):`, event.target.error);
                            reject(event.target.error);
                        };
                    });
                }
            }
            
            return true;
        } catch (error) {
            console.error('導入數據失敗，正在還原:', error);
            
            // 嘗試還原數據
            try {
                for (const storeName of Object.keys(this.DB_SCHEMA)) {
                    await this.clear(storeName);
                }
                
                await this.importDatabase(currentData, true);
                console.log('數據還原成功');
            } catch (restoreError) {
                console.error('數據還原失敗:', restoreError);
            }
            
            throw error;
        }
    }
    
    /**
     * 清理過期數據
     * @param {number} retentionPeriod 保留期限（天數）
     * @returns {Promise<number>} 清理的數據總數
     */
    static async cleanupOldData(retentionPeriod) {
        if (!retentionPeriod || retentionPeriod <= 0) {
            return 0; // 不清理
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionPeriod);
        
        let totalCleanedCount = 0;
        
        // 需要清理的表及其時間欄位
        const cleanupTables = {
            dailyActivities: 'timestamp',
            healthRecords: 'timestamp'
        };
        
        for (const [storeName, timeField] of Object.entries(cleanupTables)) {
            try {
                const db = await this.getDatabase();
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                const index = store.index(timeField);
                const range = IDBKeyRange.upperBound(cutoffDate);
                
                // 獲取所有過期記錄
                const request = index.getAll(range);
                
                const records = await new Promise((resolve, reject) => {
                    request.onsuccess = (event) => {
                        resolve(event.target.result || []);
                    };
                    
                    request.onerror = (event) => {
                        reject(event.target.error);
                    };
                });
                
                // 刪除每條過期記錄
                for (const record of records) {
                    await this.delete(storeName, record.id);
                    totalCleanedCount++;
                }
                
                console.log(`清理過期數據: ${storeName} 清理了 ${records.length} 條記錄`);
            } catch (error) {
                console.error(`清理過期數據失敗 (${storeName}):`, error);
            }
        }
        
        return totalCleanedCount;
    }
}

// 導出數據庫類
window.Database = Database;
