/**
 * 工具函數庫
 */
const Utils = {
    /**
     * 創建唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    /**
     * 格式化日期
     * @param {Date|string} date 日期對象或日期字符串
     * @param {string} [format='YYYY-MM-DD'] 格式模式
     * @returns {string} 格式化後的日期字符串
     */
    formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        
        const d = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const hour = d.getHours().toString().padStart(2, '0');
        const minute = d.getMinutes().toString().padStart(2, '0');
        const second = d.getSeconds().toString().padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hour)
            .replace('mm', minute)
            .replace('ss', second);
    },
    
    /**
     * 格式化時間
     * @param {Date|string} date 日期對象或日期字符串
     * @returns {string} 格式化後的時間字符串 (HH:mm)
     */
    formatTime(date) {
        if (!date) return '';
        
        const d = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(d.getTime())) return '';
        
        const hour = d.getHours().toString().padStart(2, '0');
        const minute = d.getMinutes().toString().padStart(2, '0');
        
        return `${hour}:${minute}`;
    },
    
    /**
     * 格式化日期和時間
     * @param {Date|string} date 日期對象或日期字符串
     * @returns {string} 格式化後的日期和時間字符串
     */
    formatDateTime(date) {
        return this.formatDate(date, 'YYYY-MM-DD HH:mm');
    },
    
    /**
     * 計算兩個日期之間的時間差（以分鐘為單位）
     * @param {Date|string} startDate 開始日期
     * @param {Date|string} endDate 結束日期
     * @returns {number} 分鐘數
     */
    getMinutesBetween(startDate, endDate) {
        if (!startDate || !endDate) return 0;
        
        const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
        const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    },
    
    /**
     * 格式化時長（將分鐘轉換為小時和分鐘）
     * @param {number} minutes 分鐘數
     * @returns {string} 格式化後的時長字符串
     */
    formatDuration(minutes) {
        if (isNaN(minutes) || minutes < 0) return '0 分鐘';
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        
        if (hours === 0) {
            return `${remainingMinutes} 分鐘`;
        } else if (remainingMinutes === 0) {
            return `${hours} 小時`;
        } else {
            return `${hours} 小時 ${remainingMinutes} 分鐘`;
        }
    },
    
    /**
     * 計算年齡
     * @param {Date|string} birthDate 出生日期
     * @param {Date|string} [today] 計算日期，默認為當前日期
     * @returns {Object} 年齡對象 {years, months, days}
     */
    calculateAge(birthDate, today = new Date()) {
        if (!birthDate) return { years: 0, months: 0, days: 0 };
        
        const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
        const now = typeof today === 'string' ? new Date(today) : today;
        
        if (isNaN(birth.getTime()) || isNaN(now.getTime())) {
            return { years: 0, months: 0, days: 0 };
        }
        
        let years = now.getFullYear() - birth.getFullYear();
        let months = now.getMonth() - birth.getMonth();
        let days = now.getDate() - birth.getDate();
        
        // 調整月份和天數
        if (days < 0) {
            months--;
            // 獲取上個月的最後一天
            const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += lastMonth.getDate();
        }
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        return { years, months, days };
    },
    
    /**
     * 格式化年齡
     * @param {Date|string} birthDate 出生日期
     * @returns {string} 格式化後的年齡字符串
     */
    formatAge(birthDate) {
        const age = this.calculateAge(birthDate);
        
        if (age.years > 0) {
            return age.months > 0 
                ? `${age.years} 歲 ${age.months} 個月` 
                : `${age.years} 歲`;
        } else if (age.months > 0) {
            return age.days > 0 
                ? `${age.months} 個月 ${age.days} 天` 
                : `${age.months} 個月`;
        } else {
            return `${age.days} 天`;
        }
    },
    
    /**
     * 格式化數字，添加千位分隔符
     * @param {number} number 數字
     * @returns {string} 格式化後的數字字符串
     */
    formatNumber(number) {
        if (number === null || number === undefined || isNaN(number)) return '0';
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    /**
     * 格式化體重（公斤）
     * @param {number} weight 體重（公斤）
     * @returns {string} 格式化後的體重字符串
     */
    formatWeight(weight) {
        if (weight === null || weight === undefined || isNaN(weight)) return '0 kg';
        
        return `${weight.toFixed(1)} kg`;
    },
    
    /**
     * 格式化身高（厘米）
     * @param {number} height 身高（厘米）
     * @returns {string} 格式化後的身高字符串
     */
    formatHeight(height) {
        if (height === null || height === undefined || isNaN(height)) return '0 cm';
        
        return `${height.toFixed(1)} cm`;
    },
    
    /**
     * 格式化頭圍（厘米）
     * @param {number} headCircumference 頭圍（厘米）
     * @returns {string} 格式化後的頭圍字符串
     */
    formatHeadCircumference(headCircumference) {
        if (headCircumference === null || headCircumference === undefined || isNaN(headCircumference)) {
            return '0 cm';
        }
        
        return `${headCircumference.toFixed(1)} cm`;
    },
    
    /**
     * 深拷貝對象
     * @param {*} obj 要拷貝的對象
     * @returns {*} 拷貝的對象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        // 處理 Date 對象
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        // 處理 Array 對象
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        // 處理普通對象
        const copy = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                copy[key] = this.deepClone(obj[key]);
            }
        }
        
        return copy;
    },
    
    /**
     * 防抖函數
     * @param {Function} fn 要執行的函數
     * @param {number} delay 延遲時間（毫秒）
     * @returns {Function} 防抖處理後的函數
     */
    debounce(fn, delay = 300) {
        let timer = null;
        
        return function(...args) {
            const context = this;
            
            if (timer) {
                clearTimeout(timer);
            }
            
            timer = setTimeout(() => {
                fn.apply(context, args);
                timer = null;
            }, delay);
        };
    },
    
    /**
     * 節流函數
     * @param {Function} fn 要執行的函數
     * @param {number} limit 間隔時間（毫秒）
     * @returns {Function} 節流處理後的函數
     */
    throttle(fn, limit = 300) {
        let waiting = false;
        
        return function(...args) {
            const context = this;
            
            if (!waiting) {
                fn.apply(context, args);
                waiting = true;
                
                setTimeout(() => {
                    waiting = false;
                }, limit);
            }
        };
    },
    
    /**
     * 檢查是否為空值（null, undefined, '', []）
     * @param {*} value 要檢查的值
     * @returns {boolean} 是否為空
     */
    isEmpty(value) {
        if (value === null || value === undefined) {
            return true;
        }
        
        if (typeof value === 'string' && value.trim() === '') {
            return true;
        }
        
        if (Array.isArray(value) && value.length === 0) {
            return true;
        }
        
        if (typeof value === 'object' && Object.keys(value).length === 0) {
            return true;
        }
        
        return false;
    },
    
    /**
     * 顯示通知彈窗
     * @param {string} message 通知消息
     * @param {string} [type='success'] 通知類型：success, warning, error
     * @param {number} [duration=3000] 顯示時長（毫秒）
     */
    showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toast-container');
        
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // 自動關閉
        setTimeout(() => {
            toast.style.opacity = '0';
            
            // 移除元素
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, duration);
    },
    
    /**
     * 顯示模態對話框
     * @param {string} title 標題
     * @param {string|HTMLElement} content 內容
     * @param {Function} [onClose] 關閉回調
     */
    showModal(title, content, onClose) {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('modal-content');
        const closeModalBtn = document.getElementById('close-modal');
        
        if (!modalOverlay || !modalTitle || !modalContent) return;
        
        // 設置標題和內容
        modalTitle.textContent = title;
        
        if (typeof content === 'string') {
            modalContent.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            modalContent.innerHTML = '';
            modalContent.appendChild(content);
        }
        
        // 顯示模態框
        modalOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // 綁定關閉事件
        const closeModal = () => {
            modalOverlay.classList.add('hidden');
            document.body.style.overflow = '';
            
            if (typeof onClose === 'function') {
                onClose();
            }
            
            // 移除事件監聽
            closeModalBtn.removeEventListener('click', closeModal);
            modalOverlay.removeEventListener('click', handleOverlayClick);
        };
        
        const handleOverlayClick = (event) => {
            if (event.target === modalOverlay) {
                closeModal();
            }
        };
        
        closeModalBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', handleOverlayClick);
        
        // 返回關閉方法，方便程序控制關閉
        return closeModal;
    },
    
    /**
     * 顯示確認對話框
     * @param {string} title 標題
     * @param {string} message 消息內容
     * @param {Function} onConfirm 確認回調
     * @param {Function} [onCancel] 取消回調
     */
    showConfirm(title, message, onConfirm, onCancel) {
        // 創建確認對話框內容
        const content = document.createElement('div');
        
        content.innerHTML = `
            <p class="confirm-message">${message}</p>
            <div class="confirm-buttons">
                <button id="confirm-cancel-btn" class="secondary-btn">取消</button>
                <button id="confirm-ok-btn" class="primary-btn">確認</button>
            </div>
        `;
        
        // 顯示模態框
        const closeModal = this.showModal(title, content);
        
        // 綁定按鈕事件
        const confirmBtn = content.querySelector('#confirm-ok-btn');
        const cancelBtn = content.querySelector('#confirm-cancel-btn');
        
        confirmBtn.addEventListener('click', () => {
            closeModal();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            closeModal();
            if (typeof onCancel === 'function') {
                onCancel();
            }
        });
    },
    
    /**
     * 顯示輸入對話框
     * @param {string} title 標題
     * @param {string} message 提示消息
     * @param {string} [defaultValue=''] 默認值
     * @param {Function} onSubmit 提交回調
     * @param {Function} [onCancel] 取消回調
     */
    showPrompt(title, message, defaultValue = '', onSubmit, onCancel) {
        // 創建輸入對話框內容
        const content = document.createElement('div');
        
        content.innerHTML = `
            <p class="prompt-message">${message}</p>
            <input type="text" id="prompt-input" value="${defaultValue}" class="prompt-input">
            <div class="prompt-buttons">
                <button id="prompt-cancel-btn" class="secondary-btn">取消</button>
                <button id="prompt-ok-btn" class="primary-btn">確認</button>
            </div>
        `;
        
        // 顯示模態框
        const closeModal = this.showModal(title, content);
        
        // 綁定按鈕事件
        const promptInput = content.querySelector('#prompt-input');
        const okBtn = content.querySelector('#prompt-ok-btn');
        const cancelBtn = content.querySelector('#prompt-cancel-btn');
        
        // 自動聚焦輸入框
        setTimeout(() => {
            promptInput.focus();
        }, 100);
        
        // 提交處理
        const handleSubmit = () => {
            const value = promptInput.value;
            closeModal();
            if (typeof onSubmit === 'function') {
                onSubmit(value);
            }
        };
        
        // 回車鍵提交
        promptInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                handleSubmit();
            }
        });
        
        okBtn.addEventListener('click', handleSubmit);
        
        cancelBtn.addEventListener('click', () => {
            closeModal();
            if (typeof onCancel === 'function') {
                onCancel();
            }
        });
    },
    
    /**
     * 將文件轉換為 Data URL
     * @param {File} file 文件對象
     * @param {number} [maxWidth=800] 最大寬度
     * @param {number} [maxHeight=800] 最大高度
     * @returns {Promise<string>} Data URL
     */
    fileToDataURL(file, maxWidth = 800, maxHeight = 800) {
        return new Promise((resolve, reject) => {
            // 檢查文件類型
            if (!file.type.startsWith('image/')) {
                reject(new Error('只支持圖片文件'));
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const img = new Image();
                
                img.onload = () => {
                    // 計算調整後的尺寸
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxWidth || height > maxHeight) {
                        if (width / height > maxWidth / maxHeight) {
                            height = Math.round(height * (maxWidth / width));
                            width = maxWidth;
                        } else {
                            width = Math.round(width * (maxHeight / height));
                            height = maxHeight;
                        }
                    }
                    
                    // 創建 Canvas 進行縮放
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 輸出為 Data URL
                    const dataURL = canvas.toDataURL(file.type);
                    resolve(dataURL);
                };
                
                img.onerror = () => {
                    reject(new Error('圖片加載失敗'));
                };
                
                img.src = event.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('文件讀取失敗'));
            };
            
            reader.readAsDataURL(file);
        });
    },
    
    /**
     * 導出數據為 JSON 文件
     * @param {Object} data 數據對象
     * @param {string} [filename='export.json'] 文件名
     */
    exportJSON(data, filename = 'export.json') {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    },
    
    /**
     * 從文件讀取 JSON 數據
     * @param {File} file 文件對象
     * @returns {Promise<Object>} 解析後的 JSON 數據
     */
    readJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('無效的 JSON 文件'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('文件讀取失敗'));
            };
            
            reader.readAsText(file);
        });
    },
    
    /**
     * 檢測瀏覽器是否支持 IndexedDB
     * @returns {boolean} 是否支持
     */
    supportsIndexedDB() {
        return !!window.indexedDB;
    },
    
    /**
     * 檢測瀏覽器是否支持 Service Worker
     * @returns {boolean} 是否支持
     */
    supportsServiceWorker() {
        return 'serviceWorker' in navigator;
    },
    
    /**
     * 檢測瀏覽器是否支持 LocalStorage
     * @returns {boolean} 是否支持
     */
    supportsLocalStorage() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    /**
     * 檢測瀏覽器是否在線
     * @returns {boolean} 是否在線
     */
    isOnline() {
        return navigator.onLine;
    },
    
    /**
     * 獲取瀏覽器語言
     * @returns {string} 瀏覽器語言代碼
     */
    getBrowserLanguage() {
        return navigator.language || navigator.userLanguage || 'zh-TW';
    },
    
    /**
     * 獲取瀏覽器主題模式（深色/淺色）
     * @returns {string} 主題模式: 'dark' 或 'light'
     */
    getBrowserTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    
    /**
     * 設置網頁主題模式
     * @param {string} theme 主題模式: 'dark', 'light', 'system'
     */
    setTheme(theme) {
        const root = document.documentElement;
        
        // 移除所有主題相關類
        root.classList.remove('dark-theme', 'light-theme', 'system-theme');
        
        // 設置新主題
        if (theme === 'system') {
            root.classList.add('system-theme');
        } else if (theme === 'dark') {
            root.classList.add('dark-theme');
        } else {
            root.classList.add('light-theme');
        }
        
        // 保存設置到 LocalStorage
        if (this.supportsLocalStorage()) {
            localStorage.setItem('theme', theme);
        }
    },
    
    /**
     * 從 LocalStorage 加載主題設置
     */
    loadTheme() {
        if (this.supportsLocalStorage()) {
            const savedTheme = localStorage.getItem('theme');
            
            if (savedTheme) {
                this.setTheme(savedTheme);
            } else {
                // 默認使用系統主題
                this.setTheme('system');
            }
        }
    },
    
    /**
     * 根據條件獲取嬰幼兒標準生長數據
     * @param {string} gender 性別 ('male' 或 'female')
     * @param {number} ageMonths 月齡
     * @param {string} type 數據類型 ('weight', 'height', 'headCircumference')
     * @returns {Object} 生長數據 { min, median, max }
     */
    getGrowthStandard(gender, ageMonths, type) {
        // 生長標準數據（基於 WHO 標準）
        // 這裡僅提供簡化版示例數據，實際應用需使用完整數據
        const standards = {
            male: {
                weight: [
                    { month: 0, min: 2.5, median: 3.3, max: 4.3 },
                    { month: 1, min: 3.4, median: 4.5, max: 5.7 },
                    { month: 2, min: 4.3, median: 5.6, max: 7.0 },
                    { month: 3, min: 5.0, median: 6.4, max: 7.9 },
                    { month: 4, min: 5.6, median: 7.0, max: 8.6 },
                    { month: 6, min: 6.4, median: 7.9, max: 9.7 },
                    { month: 9, min: 7.1, median: 8.9, max: 10.9 },
                    { month: 12, min: 7.8, median: 9.6, max: 11.8 },
                    { month: 18, min: 8.6, median: 10.9, max: 13.3 },
                    { month: 24, min: 9.7, median: 12.2, max: 14.8 },
                    { month: 36, min: 11.0, median: 14.3, max: 18.3 }
                ],
                height: [
                    { month: 0, min: 46.1, median: 49.9, max: 53.7 },
                    { month: 1, min: 50.8, median: 54.7, max: 58.6 },
                    { month: 2, min: 54.4, median: 58.4, max: 62.4 },
                    { month: 3, min: 57.3, median: 61.4, max: 65.5 },
                    { month: 4, min: 59.7, median: 63.9, max: 68.0 },
                    { month: 6, min: 63.8, median: 67.6, max: 71.4 },
                    { month: 9, min: 68.0, median: 72.0, max: 76.0 },
                    { month: 12, min: 71.0, median: 75.7, max: 80.5 },
                    { month: 18, min: 76.0, median: 82.3, max: 88.7 },
                    { month: 24, min: 81.7, median: 87.8, max: 94.0 },
                    { month: 36, min: 89.4, median: 96.1, max: 102.7 }
                ],
                headCircumference: [
                    { month: 0, min: 32.4, median: 34.5, max: 36.6 },
                    { month: 1, min: 35.2, median: 37.3, max: 39.4 },
                    { month: 2, min: 36.8, median: 38.9, max: 41.0 },
                    { month: 3, min: 38.1, median: 40.2, max: 42.3 },
                    { month: 4, min: 39.2, median: 41.3, max: 43.4 },
                    { month: 6, min: 40.7, median: 42.8, max: 44.9 },
                    { month: 9, min: 42.1, median: 44.2, max: 46.3 },
                    { month: 12, min: 43.1, median: 45.2, max: 47.3 },
                    { month: 18, min: 44.2, median: 46.2, max: 48.2 },
                    { month: 24, min: 44.9, median: 47.0, max: 49.1 },
                    { month: 36, min: 46.1, median: 48.3, max: 50.5 }
                ]
            },
            female: {
                weight: [
                    { month: 0, min: 2.4, median: 3.2, max: 4.2 },
                    { month: 1, min: 3.2, median: 4.2, max: 5.4 },
                    { month: 2, min: 3.9, median: 5.1, max: 6.5 },
                    { month: 3, min: 4.5, median: 5.8, max: 7.2 },
                    { month: 4, min: 5.0, median: 6.4, max: 7.9 },
                    { month: 6, min: 5.8, median: 7.3, max: 9.0 },
                    { month: 9, min: 6.5, median: 8.2, max: 10.1 },
                    { month: 12, min: 7.1, median: 8.9, max: 11.0 },
                    { month: 18, min: 8.0, median: 10.2, max: 12.8 },
                    { month: 24, min: 9.2, median: 11.5, max: 14.1 },
                    { month: 36, min: 10.8, median: 13.9, max: 17.4 }
                ],
                height: [
                    { month: 0, min: 45.6, median: 49.1, max: 52.7 },
                    { month: 1, min: 49.9, median: 53.7, max: 57.4 },
                    { month: 2, min: 53.0, median: 57.1, max: 61.1 },
                    { month: 3, min: 55.7, median: 59.8, max: 63.9 },
                    { month: 4, min: 58.0, median: 62.1, max: 66.2 },
                    { month: 6, min: 61.7, median: 65.7, max: 69.7 },
                    { month: 9, min: 65.7, median: 69.7, max: 73.7 },
                    { month: 12, min: 68.9, median: 73.5, max: 78.1 },
                    { month: 18, min: 74.6, median: 80.7, max: 86.8 },
                    { month: 24, min: 80.0, median: 86.4, max: 92.9 },
                    { month: 36, min: 88.0, median: 95.1, max: 102.2 }
                ],
                headCircumference: [
                    { month: 0, min: 31.9, median: 33.9, max: 35.9 },
                    { month: 1, min: 34.4, median: 36.5, max: 38.6 },
                    { month: 2, min: 35.9, median: 38.0, max: 40.1 },
                    { month: 3, min: 37.2, median: 39.3, max: 41.4 },
                    { month: 4, min: 38.2, median: 40.3, max: 42.4 },
                    { month: 6, min: 39.6, median: 41.7, max: 43.8 },
                    { month: 9, min: 40.9, median: 43.0, max: 45.1 },
                    { month: 12, min: 41.8, median: 44.0, max: 46.2 },
                    { month: 18, min: 43.1, median: 45.3, max: 47.5 },
                    { month: 24, min: 44.0, median: 46.2, max: 48.4 },
                    { month: 36, min: 45.1, median: 47.4, max: 49.7 }
                ]
            }
        };
        
        // 獲取指定性別和類型的生長標準數據
        const genderData = standards[gender.toLowerCase()];
        if (!genderData) return null;
        
        const typeData = genderData[type];
        if (!typeData) return null;
        
        // 根據月齡查找最接近的數據點
        let closest = null;
        let minDiff = Infinity;
        
        for (const item of typeData) {
            const diff = Math.abs(item.month - ageMonths);
            if (diff < minDiff) {
                minDiff = diff;
                closest = item;
            }
        }
        
        return closest ? { min: closest.min, median: closest.median, max: closest.max } : null;
    },
    
    /**
     * 獲取生長數據百分位
     * @param {number} value 實際值
     * @param {Object} standard 標準數據 { min, median, max }
     * @returns {number} 百分位 (0-100)
     */
    getGrowthPercentile(value, standard) {
        if (!standard) return 50;
        
        const { min, median, max } = standard;
        
        if (value <= min) return 3;
        if (value >= max) return 97;
        
        // 簡化的百分位估算
        if (value < median) {
            // 3% 到 50% 的範圍
            return 3 + (value - min) / (median - min) * 47;
        } else {
            // 50% 到 97% 的範圍
            return 50 + (value - median) / (max - median) * 47;
        }
    },
    
    /**
     * 登記線上狀態監聽器
     */
    registerOnlineStatusListeners() {
        const updateOnlineStatus = () => {
            const offlineNotification = document.getElementById('offline-notification');
            
            if (offlineNotification) {
                if (navigator.onLine) {
                    offlineNotification.classList.add('hidden');
                } else {
                    offlineNotification.classList.remove('hidden');
                }
            }
        };
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // 初始檢查
        updateOnlineStatus();
    }
};

// 導出工具函數庫
window.Utils = Utils;