/**
 * 設置視圖 - 處理應用程式設置相關的UI
 */
class SettingsView {
    /**
     * 初始化設置視圖
     */
    static init() {
        this.setupEventListeners();
    }
    
    /**
     * 設置事件監聽器
     */
    static setupEventListeners() {
        // 主題選擇
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                this.changeTheme(e.target.value);
            });
        }
        
        // 語言選擇
        const languageSelector = document.getElementById('language-selector');
        if (languageSelector) {
            languageSelector.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }
        
        // 數據保留期限
        const dataRetention = document.getElementById('data-retention');
        if (dataRetention) {
            dataRetention.addEventListener('change', (e) => {
                this.changeDataRetention(e.target.value);
            });
        }
        
        // 數據管理按鈕
        const backupDataBtn = document.getElementById('backup-data-btn');
        const restoreDataBtn = document.getElementById('restore-data-btn');
        const clearDataBtn = document.getElementById('clear-data-btn');
        
        if (backupDataBtn) {
            backupDataBtn.addEventListener('click', () => this.backupData());
        }
        
        if (restoreDataBtn) {
            restoreDataBtn.addEventListener('click', () => this.restoreData());
        }
        
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.clearData());
        }
    }
    
    /**
     * 刷新設置視圖
     */
    static async refreshSettingsView() {
        // 讀取並應用當前設置
        await this.loadSettings();
    }
    
    /**
     * 載入設置
     */
    static async loadSettings() {
        try {
            // 從localStorage讀取設置
            this.loadThemeSetting();
            this.loadLanguageSetting();
            this.loadDataRetentionSetting();
            
        } catch (error) {
            console.error('載入設置失敗:', error);
            Utils.showToast('載入設置失敗', 'error');
        }
    }
    
    /**
     * 載入主題設置
     */
    static loadThemeSetting() {
        const themeSelector = document.getElementById('theme-selector');
        if (!themeSelector) return;
        
        // 從localStorage讀取主題設置
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            themeSelector.value = savedTheme;
        } else {
            // 默認跟隨系統
            themeSelector.value = 'system';
        }
    }
    
    /**
     * 載入語言設置
     */
    static loadLanguageSetting() {
        const languageSelector = document.getElementById('language-selector');
        if (!languageSelector) return;
        
        // 從localStorage讀取語言設置
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage) {
            languageSelector.value = savedLanguage;
        } else {
            // 默認使用瀏覽器語言
            const browserLang = Utils.getBrowserLanguage();
            const supportedLanguages = ['zh-TW', 'en'];
            
            // 檢查瀏覽器語言是否支持
            if (supportedLanguages.includes(browserLang)) {
                languageSelector.value = browserLang;
            } else {
                // 默認使用繁體中文
                languageSelector.value = 'zh-TW';
            }
        }
    }
    
    /**
     * 載入數據保留設置
     */
    static loadDataRetentionSetting() {
        const dataRetention = document.getElementById('data-retention');
        if (!dataRetention) return;
        
        // 從localStorage讀取數據保留設置
        const savedRetention = localStorage.getItem('dataRetention');
        if (savedRetention) {
            dataRetention.value = savedRetention;
        } else {
            // 默認永久保留
            dataRetention.value = '0';
        }
    }
    
    /**
     * 變更主題
     * @param {string} theme 主題名稱
     */
    static changeTheme(theme) {
        // 保存到localStorage
        localStorage.setItem('theme', theme);
        
        // 應用主題
        Utils.setTheme(theme);
        
        // 提示用戶
        Utils.showToast('主題已變更', 'success');
    }
    
    /**
     * 變更語言
     * @param {string} language 語言代碼
     */
    static changeLanguage(language) {
        // 保存到localStorage
        localStorage.setItem('language', language);
        
        // 提示用戶
        Utils.showToast('語言設置已變更，重新加載頁面後生效', 'success');
        
        // 詢問是否重新加載
        setTimeout(() => {
            Utils.showConfirm(
                '重新加載應用',
                '變更語言需要重新加載應用。是否立即重新加載？',
                () => {
                    window.location.reload();
                }
            );
        }, 1000);
    }
    
    /**
     * 變更數據保留期限
     * @param {string} retention 保留期限（年）
     */
    static async changeDataRetention(retention) {
        try {
            // 保存到localStorage
            localStorage.setItem('dataRetention', retention);
            
            // 執行數據清理（如果不是永久保留）
            if (retention !== '0') {
                const retentionDays = parseInt(retention) * 365;
                const cleanCount = await Database.cleanupOldData(retentionDays);
                
                if (cleanCount > 0) {
                    Utils.showToast(`已清理 ${cleanCount} 條過期數據`, 'success');
                } else {
                    Utils.showToast('沒有需要清理的過期數據', 'success');
                }
            } else {
                Utils.showToast('數據將永久保留', 'success');
            }
        } catch (error) {
            console.error('變更數據保留設置失敗:', error);
            Utils.showToast('變更數據保留設置失敗', 'error');
        }
    }
    
    /**
     * 備份數據
     */
    static async backupData() {
        try {
            // 顯示加載中提示
            Utils.showToast('正在準備備份...', 'success');
            
            // 導出數據庫
            const exportData = await Database.exportDatabase();
            
            // 添加備份元數據
            const backupData = {
                appVersion: document.getElementById('version').textContent.split(' ')[1],
                timestamp: new Date().toISOString(),
                data: exportData
            };
            
            // 導出為JSON文件
            const filename = `baby-care-backup-${Utils.formatDate(new Date())}.json`;
            Utils.exportJSON(backupData, filename);
            
            // 提示用戶
            Utils.showToast('數據備份成功', 'success');
        } catch (error) {
            console.error('備份數據失敗:', error);
            Utils.showToast('備份數據失敗', 'error');
        }
    }
    
    /**
     * 還原數據
     */
    static async restoreData() {
        try {
            // 創建文件輸入元素
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            
            // 監聽文件選擇
            fileInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    try {
                        const file = e.target.files[0];
                        
                        // 顯示加載中提示
                        Utils.showToast('正在讀取備份文件...', 'success');
                        
                        // 讀取JSON文件
                        const backupData = await Utils.readJSONFile(file);
                        
                        // 驗證備份格式
                        if (!backupData.data || !backupData.timestamp) {
                            throw new Error('無效的備份文件格式');
                        }
                        
                        // 顯示確認對話框
                        Utils.showConfirm(
                            '還原數據',
                            `要使用 ${Utils.formatDateTime(backupData.timestamp)} 的備份還原數據嗎？現有數據將被替換。`,
                            async () => {
                                try {
                                    // 顯示加載中提示
                                    Utils.showToast('正在還原數據...', 'success');
                                    
                                    // 導入數據
                                    await Database.importDatabase(backupData.data, true);
                                    
                                    // 提示用戶
                                    Utils.showToast('數據還原成功，將重新加載頁面', 'success');
                                    
                                    // 重新加載頁面
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 2000);
                                } catch (error) {
                                    console.error('還原數據失敗:', error);
                                    Utils.showToast('還原數據失敗: ' + error.message, 'error');
                                }
                            }
                        );
                    } catch (error) {
                        console.error('讀取備份文件失敗:', error);
                        Utils.showToast('讀取備份文件失敗: ' + error.message, 'error');
                    }
                }
            });
            
            // 觸發文件選擇
            fileInput.click();
        } catch (error) {
            console.error('還原數據失敗:', error);
            Utils.showToast('還原數據失敗', 'error');
        }
    }
    
    /**
     * 清除所有數據
     */
    static async clearData() {
        try {
            // 顯示確認對話框
            Utils.showConfirm(
                '清除所有數據',
                '確定要清除所有數據嗎？此操作無法撤銷！建議先備份數據。',
                async () => {
                    try {
                        // 再次確認
                        Utils.showConfirm(
                            '最終確認',
                            '真的要刪除所有數據嗎？所有孩子記錄、活動和健康數據都將永久刪除！',
                            async () => {
                                try {
                                    // 顯示加載中提示
                                    Utils.showToast('正在清除數據...', 'success');
                                    
                                    // 清空所有表
                                    for (const storeName of Object.keys(Database.DB_SCHEMA)) {
                                        await Database.clear(storeName);
                                    }
                                    
                                    // 清除當前孩子選擇
                                    localStorage.removeItem('currentChildId');
                                    
                                    // 提示用戶
                                    Utils.showToast('所有數據已清除，將重新加載頁面', 'success');
                                    
                                    // 重新加載頁面
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 2000);
                                } catch (error) {
                                    console.error('清除數據失敗:', error);
                                    Utils.showToast('清除數據失敗: ' + error.message, 'error');
                                }
                            }
                        );
                    } catch (error) {
                        console.error('清除數據失敗:', error);
                        Utils.showToast('清除數據失敗', 'error');
                    }
                }
            );
        } catch (error) {
            console.error('清除數據失敗:', error);
            Utils.showToast('清除數據失敗', 'error');
        }
    }
}

// 導出視圖
window.SettingsView = SettingsView;