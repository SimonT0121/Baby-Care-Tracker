/**
 * 健康記錄視圖 - 處理健康記錄相關的UI
 */
class HealthView {
    /**
     * 當前選中的健康標籤
     */
    static currentTab = 'growth';
    
    /**
     * 初始化健康視圖
     */
    static init() {
        this.setupEventListeners();
    }
    
    /**
     * 設置事件監聽器
     */
    static setupEventListeners() {
        // 健康標籤切換
        document.querySelectorAll('.tab-btn[data-tab]').forEach(tab => {
            if (tab.closest('#health-page')) {
                tab.addEventListener('click', (e) => {
                    const tabName = e.currentTarget.getAttribute('data-tab');
                    this.switchTab(tabName);
                });
            }
        });
        
        // 添加健康記錄按鈕
        const addGrowthBtn = document.getElementById('add-growth-btn');
        const addCheckupBtn = document.getElementById('add-checkup-btn');
        const addVaccineBtn = document.getElementById('add-vaccine-btn');
        const addMedicationBtn = document.getElementById('add-medication-btn');
        
        if (addGrowthBtn) {
            addGrowthBtn.addEventListener('click', () => this.showAddGrowthForm());
        }
        
        if (addCheckupBtn) {
            addCheckupBtn.addEventListener('click', () => this.showAddCheckupForm());
        }
        
        if (addVaccineBtn) {
            addVaccineBtn.addEventListener('click', () => this.showAddVaccineForm());
        }
        
        if (addMedicationBtn) {
            addMedicationBtn.addEventListener('click', () => this.showAddMedicationForm());
        }
    }
    
    /**
     * 切換健康標籤
     * @param {string} tabName 標籤名稱
     */
    static switchTab(tabName) {
        // 更新標籤按鈕
        document.querySelectorAll('.tab-btn[data-tab]').forEach(tab => {
            if (tab.closest('#health-page')) {
                if (tab.getAttribute('data-tab') === tabName) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            }
        });
        
        // 更新標籤內容
        document.querySelectorAll('.tab-pane').forEach(pane => {
            if (pane.closest('#health-page')) {
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
     * 刷新健康視圖
     */
    static async refreshHealthView() {
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
                case 'growth':
                    await this.refreshGrowthTab(currentChild.id);
                    break;
                case 'checkups':
                    await this.refreshCheckupsTab(currentChild.id);
                    break;
                case 'vaccines':
                    await this.refreshVaccinesTab(currentChild.id);
                    break;
                case 'medication':
                    await this.refreshMedicationTab(currentChild.id);
                    break;
            }
        } catch (error) {
            console.error(`刷新${tabName}標籤失敗:`, error);
            Utils.showToast(`載入${tabName}記錄失敗`, 'error');
        }
    }
    
    /**
     * 刷新生長記錄標籤
     * @param {string} childId 孩子ID
     */
    static async refreshGrowthTab(childId) {
        try {
            const growthList = document.getElementById('growth-list');
            
            if (!growthList) return;
            
            // 獲取生長記錄
            const growthRecords = await HealthService.getHealthRecordsByType(
                childId, 
                HealthService.HEALTH_TYPES.GROWTH
            );
            
            if (growthRecords.length === 0) {
                growthList.innerHTML = '<p class="empty-list">沒有生長記錄</p>';
                return;
            }
            
            // 按時間排序（降序）
            growthRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // 獲取孩子信息（用於計算百分位）
            const child = await ChildService.getChildById(childId);
            
            // 構建列表HTML
            let listHTML = '';
            
            for (const record of growthRecords) {
                const date = Utils.formatDate(record.timestamp);
                const details = record.details || {};
                
                // 計算記錄時的月齡
                const recordDate = new Date(record.timestamp);
                const birthDate = new Date(child.birthDate);
                const ageAtRecord = Utils.calculateAge(birthDate, recordDate);
                const ageMonths = ageAtRecord.years * 12 + ageAtRecord.months;
                const ageLabel = `${ageMonths} 個月`;
                
                // 計算百分位（如果有數據）
                let percentiles = {};
                
                if (details.weight || details.height || details.headCircumference) {
                    const data = {
                        weight: details.weight,
                        height: details.height,
                        headCircumference: details.headCircumference
                    };
                    
                    try {
                        percentiles = await HealthService.calculateGrowthPercentiles(childId, data);
                    } catch (error) {
                        console.warn('計算百分位失敗:', error);
                    }
                }
                
                // 構建項目HTML
                listHTML += `
                    <div class="list-item growth-item" data-id="${record.id}">
                        <div class="list-item-content">
                            <div class="list-item-header">
                                <div class="list-item-date">${date}</div>
                                <div class="list-item-age">${ageLabel}</div>
                            </div>
                            
                            <div class="growth-data">
                                ${details.weight ? `
                                    <div class="growth-item">
                                        <div class="growth-label">體重</div>
                                        <div class="growth-value">${Utils.formatWeight(details.weight)}</div>
                                        ${percentiles.weight ? `
                                            <div class="growth-percentile">${percentiles.weight.percentile.toFixed(0)}%</div>
                                        ` : ''}
                                    </div>
                                ` : ''}
                                
                                ${details.height ? `
                                    <div class="growth-item">
                                        <div class="growth-label">身高</div>
                                        <div class="growth-value">${Utils.formatHeight(details.height)}</div>
                                        ${percentiles.height ? `
                                            <div class="growth-percentile">${percentiles.height.percentile.toFixed(0)}%</div>
                                        ` : ''}
                                    </div>
                                ` : ''}
                                
                                ${details.headCircumference ? `
                                    <div class="growth-item">
                                        <div class="growth-label">頭圍</div>
                                        <div class="growth-value">${Utils.formatHeadCircumference(details.headCircumference)}</div>
                                        ${percentiles.headCircumference ? `
                                            <div class="growth-percentile">${percentiles.headCircumference.percentile.toFixed(0)}%</div>
                                        ` : ''}
                                    </div>
                                ` : ''}
                            </div>
                            
                            ${record.note ? `<div class="list-item-note">${record.note}</div>` : ''}
                        </div>
                        <div class="list-item-actions">
                            <button class="edit-health-btn secondary-btn" data-id="${record.id}">編輯</button>
                            <button class="delete-health-btn danger-btn" data-id="${record.id}">刪除</button>
                        </div>
                    </div>
                `;
            }
            
            growthList.innerHTML = listHTML;
            
            // 綁定編輯和刪除按鈕
            this.bindHealthRecordButtons(growthList);
        } catch (error) {
            console.error('刷新生長記錄標籤失敗:', error);
            throw error;
        }
    }
    
    /**
     * 刷新健康訪視標籤
     * @param {string} childId 孩子ID
     */
    static async refreshCheckupsTab(childId) {
        try {
            const checkupsList = document.getElementById('checkups-list');
            
            if (!checkupsList) return;
            
            // 獲取健康訪視記錄
            const checkupRecords = await HealthService.getHealthRecordsByType(
                childId, 
                HealthService.HEALTH_TYPES.CHECKUP
            );
            
            if (checkupRecords.length === 0) {
                checkupsList.innerHTML = '<p class="empty-list">沒有健康訪視記錄</p>';
                return;
            }
            
            // 按時間排序（降序）
            checkupRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // 構建列表HTML
            let listHTML = '';
            
            for (const record of checkupRecords) {
                const date = Utils.formatDate(record.timestamp);
                const details = record.details || {};
                
                // 構建項目HTML
                listHTML += `
                    <div class="list-item checkup-item" data-id="${record.id}">
                        <div class="list-item-icon">🩺</div>
                        <div class="list-item-content">
                            <div class="list-item-date">${date}</div>
                            ${details.provider ? `<div class="list-item-title">醫療提供者: ${details.provider}</div>` : ''}
                            ${details.location ? `<div class="list-item-subtitle">地點: ${details.location}</div>` : ''}
                            ${details.reason ? `<div class="list-item-subtitle">原因: ${details.reason}</div>` : ''}
                            ${record.note ? `<div class="list-item-note">${record.note}</div>` : ''}
                        </div>
                        <div class="list-item-actions">
                            <button class="edit-health-btn secondary-btn" data-id="${record.id}">編輯</button>
                            <button class="delete-health-btn danger-btn" data-id="${record.id}">刪除</button>
                        </div>
                    </div>
                `;
            }
            
            checkupsList.innerHTML = listHTML;
            
            // 綁定編輯和刪除按鈕
            this.bindHealthRecordButtons(checkupsList);
        } catch (error) {
            console.error('刷新健康訪視標籤失敗:', error);
            throw error;
        }
    }
    
    /**
     * 刷新疫苗記錄標籤
     * @param {string} childId 孩子ID
     */
    static async refreshVaccinesTab(childId) {
        try {
            const vaccinesList = document.getElementById('vaccines-list');
            
            if (!vaccinesList) return;
            
            // 獲取疫苗記錄
            const vaccineRecords = await HealthService.getHealthRecordsByType(
                childId, 
                HealthService.HEALTH_TYPES.VACCINE
            );
            
            // 獲取建議疫苗接種計劃
            const recommendedVaccines = await HealthService.getRecommendedVaccines(childId);
            
            // 整合實際接種記錄和建議計劃
            const vaccineData = this.mergeVaccineData(vaccineRecords, recommendedVaccines);
            
            if (vaccineData.length === 0) {
                vaccinesList.innerHTML = '<p class="empty-list">沒有疫苗記錄</p>';
                return;
            }
            
            // 構建列表HTML
            let listHTML = '<div class="vaccine-schedule">';
            
            // 添加完成的疫苗
            if (vaccineData.completed.length > 0) {
                listHTML += `
                    <div class="vaccine-section">
                        <h4>已完成的疫苗</h4>
                        <div class="vaccine-list">
                `;
                
                for (const vaccine of vaccineData.completed) {
                    const date = Utils.formatDate(vaccine.timestamp);
                    const details = vaccine.details || {};
                    
                    listHTML += `
                        <div class="list-item vaccine-item completed" data-id="${vaccine.id}">
                            <div class="list-item-icon">💉</div>
                            <div class="list-item-content">
                                <div class="list-item-date">${date}</div>
                                <div class="list-item-title">${details.name}</div>
                                ${details.brand ? `<div class="list-item-subtitle">品牌: ${details.brand}</div>` : ''}
                                ${details.location ? `<div class="list-item-subtitle">接種位置: ${details.location}</div>` : ''}
                                ${vaccine.note ? `<div class="list-item-note">${vaccine.note}</div>` : ''}
                            </div>
                            <div class="list-item-actions">
                                <button class="edit-health-btn secondary-btn" data-id="${vaccine.id}">編輯</button>
                                <button class="delete-health-btn danger-btn" data-id="${vaccine.id}">刪除</button>
                            </div>
                        </div>
                    `;
                }
                
                listHTML += `
                        </div>
                    </div>
                `;
            }
            
            // 添加應該接種的疫苗
            if (vaccineData.due.length > 0) {
                listHTML += `
                    <div class="vaccine-section">
                        <h4>待接種的疫苗</h4>
                        <div class="vaccine-list">
                `;
                
                for (const vaccine of vaccineData.due) {
                    const recommendedDate = Utils.formatDate(vaccine.recommendedDate);
                    
                    listHTML += `
                        <div class="list-item vaccine-item due">
                            <div class="list-item-icon">⏰</div>
                            <div class="list-item-content">
                                <div class="list-item-date">建議: ${recommendedDate}</div>
                                <div class="list-item-title">${vaccine.name}</div>
                                <div class="list-item-subtitle">${vaccine.details}</div>
                            </div>
                            <div class="list-item-actions">
                                <button class="add-vaccine-record-btn primary-btn" data-vaccine="${encodeURIComponent(JSON.stringify(vaccine))}">
                                    記錄接種
                                </button>
                            </div>
                        </div>
                    `;
                }
                
                listHTML += `
                        </div>
                    </div>
                `;
            }
            
            // 添加即將到來的疫苗
            if (vaccineData.upcoming.length > 0) {
                listHTML += `
                    <div class="vaccine-section">
                        <h4>即將接種的疫苗</h4>
                        <div class="vaccine-list">
                `;
                
                for (const vaccine of vaccineData.upcoming) {
                    const recommendedDate = Utils.formatDate(vaccine.recommendedDate);
                    
                    listHTML += `
                        <div class="list-item vaccine-item upcoming">
                            <div class="list-item-icon">📅</div>
                            <div class="list-item-content">
                                <div class="list-item-date">建議: ${recommendedDate}</div>
                                <div class="list-item-title">${vaccine.name}</div>
                                <div class="list-item-subtitle">${vaccine.details}</div>
                            </div>
                        </div>
                    `;
                }
                
                listHTML += `
                        </div>
                    </div>
                `;
            }
            
            listHTML += '</div>';
            vaccinesList.innerHTML = listHTML;
            
            // 綁定編輯和刪除按鈕
            this.bindHealthRecordButtons(vaccinesList);
            
            // 綁定記錄接種按鈕
            vaccinesList.querySelectorAll('.add-vaccine-record-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    try {
                        const vaccineData = JSON.parse(decodeURIComponent(e.currentTarget.getAttribute('data-vaccine')));
                        this.showAddVaccineForm(vaccineData);
                    } catch (error) {
                        console.error('解析疫苗數據失敗:', error);
                    }
                });
            });
        } catch (error) {
            console.error('刷新疫苗記錄標籤失敗:', error);
            throw error;
        }
    }
    
    /**
     * 刷新用藥記錄標籤
     * @param {string} childId 孩子ID
     */
    static async refreshMedicationTab(childId) {
        try {
            const medicationList = document.getElementById('medication-list');
            
            if (!medicationList) return;
            
            // 獲取用藥記錄
            const medicationRecords = await HealthService.getHealthRecordsByType(
                childId, 
                HealthService.HEALTH_TYPES.MEDICATION
            );
            
            if (medicationRecords.length === 0) {
                medicationList.innerHTML = '<p class="empty-list">沒有用藥記錄</p>';
                return;
            }
            
            // 按時間排序（降序）
            medicationRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // 構建列表HTML
            let listHTML = '';
            
            for (const record of medicationRecords) {
                const date = Utils.formatDate(record.timestamp);
                const details = record.details || {};
                
                // 構建項目HTML
                listHTML += `
                    <div class="list-item medication-item" data-id="${record.id}">
                        <div class="list-item-icon">💊</div>
                        <div class="list-item-content">
                            <div class="list-item-date">${date}</div>
                            ${details.name ? `<div class="list-item-title">${details.name}</div>` : ''}
                            ${details.dosage ? `<div class="list-item-subtitle">劑量: ${details.dosage}</div>` : ''}
                            ${details.reason ? `<div class="list-item-subtitle">原因: ${details.reason}</div>` : ''}
                            ${record.note ? `<div class="list-item-note">${record.note}</div>` : ''}
                        </div>
                        <div class="list-item-actions">
                            <button class="edit-health-btn secondary-btn" data-id="${record.id}">編輯</button>
                            <button class="delete-health-btn danger-btn" data-id="${record.id}">刪除</button>
                        </div>
                    </div>
                `;
            }
            
            medicationList.innerHTML = listHTML;
            
            // 綁定編輯和刪除按鈕
            this.bindHealthRecordButtons(medicationList);
        } catch (error) {
            console.error('刷新用藥記錄標籤失敗:', error);
            throw error;
        }
    }
    
    /**
     * 綁定健康記錄按鈕
     * @param {HTMLElement} container 容器元素
     */
    static bindHealthRecordButtons(container) {
        // 綁定編輯按鈕
        container.querySelectorAll('.edit-health-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.getAttribute('data-id');
                this.showEditHealthRecordForm(recordId);
            });
        });
        
        // 綁定刪除按鈕
        container.querySelectorAll('.delete-health-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.getAttribute('data-id');
                this.showDeleteHealthRecordConfirm(recordId);
            });
        });
    }
    
    /**
     * 顯示無孩子選擇訊息
     */
    static showNoChildSelectedMessage() {
        const containers = [
            document.getElementById('growth-list'),
            document.getElementById('checkups-list'),
            document.getElementById('vaccines-list'),
            document.getElementById('medication-list')
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
     * 顯示添加生長記錄表單
     */
    static async showAddGrowthForm() {
        try {
            // 檢查是否有選擇孩子
            const currentChild = await ChildService.getCurrentChild();
            
            if (!currentChild) {
                Utils.showToast('請先選擇一個孩子', 'warning');
                return;
            }
            
            // 創建表單內容
            const formContent = this.createGrowthForm();
            
            // 顯示模態框
            const closeModal = Utils.showModal('添加生長記錄', formContent);
            
            // 處理表單提交
            const form = document.getElementById('growth-form');
            
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
                        const timeStr = formData.get('time') || '12:00';
                        const timestamp = new Date(`${dateStr}T${timeStr}`);
                        
                        // 生長數據
                        const growthData = {
                            childId: currentChild.id,
                            timestamp: timestamp,
                            details: {},
                            note: formData.get('note') || ''
                        };
                        
                        // 添加測量值（如果有）
                        const weight = formData.get('weight');
                        const height = formData.get('height');
                        const headCircumference = formData.get('headCircumference');
                        
                        if (weight) growthData.details.weight = parseFloat(weight);
                        if (height) growthData.details.height = parseFloat(height);
                        if (headCircumference) growthData.details.headCircumference = parseFloat(headCircumference);
                        
                        // 檢查至少有一個測量值
                        if (!weight && !height && !headCircumference) {
                            throw new Error('請至少填寫一項測量值');
                        }
                        
                        // 添加生長記錄
                        await HealthService.addGrowthRecord(growthData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新生長記錄標籤
                        await this.refreshGrowthTab(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功添加生長記錄', 'success');
                    } catch (error) {
                        console.error('添加生長記錄失敗:', error);
                        Utils.showToast(error.message || '添加生長記錄失敗', 'error');
                        
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
                
                // 顯示預估百分位
                this.setupPercentilePreview(form, currentChild);
            }
        } catch (error) {
            console.error('顯示添加生長記錄表單失敗:', error);
            Utils.showToast('載入表單失敗', 'error');
        }
    }
    
    /**
     * 顯示添加健康訪視表單
     */
    static async showAddCheckupForm() {
        try {
            // 檢查是否有選擇孩子
            const currentChild = await ChildService.getCurrentChild();
            
            if (!currentChild) {
                Utils.showToast('請先選擇一個孩子', 'warning');
                return;
            }
            
            // 創建表單內容
            const formContent = this.createCheckupForm();
            
            // 顯示模態框
            const closeModal = Utils.showModal('添加健康訪視記錄', formContent);
            
            // 處理表單提交
            const form = document.getElementById('checkup-form');
            
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
                        const timeStr = formData.get('time') || '12:00';
                        const timestamp = new Date(`${dateStr}T${timeStr}`);
                        
                        // 健康訪視數據
                        const checkupData = {
                            childId: currentChild.id,
                            timestamp: timestamp,
                            details: {
                                provider: formData.get('provider') || '',
                                location: formData.get('location') || '',
                                reason: formData.get('reason') || ''
                            },
                            note: formData.get('note') || ''
                        };
                        
                        // 添加健康訪視記錄
                        await HealthService.addCheckupRecord(checkupData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新健康訪視標籤
                        await this.refreshCheckupsTab(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功添加健康訪視記錄', 'success');
                    } catch (error) {
                        console.error('添加健康訪視記錄失敗:', error);
                        Utils.showToast(error.message || '添加健康訪視記錄失敗', 'error');
                        
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
            console.error('顯示添加健康訪視表單失敗:', error);
            Utils.showToast('載入表單失敗', 'error');
        }
    }
    
    /**
     * 顯示添加疫苗記錄表單
     * @param {Object} [vaccineData] 疫苗數據（從建議列表來）
     */
    static async showAddVaccineForm(vaccineData = null) {
        try {
            // 檢查是否有選擇孩子
            const currentChild = await ChildService.getCurrentChild();
            
            if (!currentChild) {
                Utils.showToast('請先選擇一個孩子', 'warning');
                return;
            }
            
            // 創建表單內容
            const formContent = this.createVaccineForm(vaccineData);
            
            // 顯示模態框
            const closeModal = Utils.showModal('添加疫苗記錄', formContent);
            
            // 處理表單提交
            const form = document.getElementById('vaccine-form');
            
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
                        const timeStr = formData.get('time') || '12:00';
                        const timestamp = new Date(`${dateStr}T${timeStr}`);
                        
                        // 疫苗數據
                        const vaccineData = {
                            childId: currentChild.id,
                            timestamp: timestamp,
                            details: {
                                name: formData.get('name'),
                                brand: formData.get('brand') || '',
                                location: formData.get('location') || ''
                            },
                            note: formData.get('note') || ''
                        };
                        
                        // 驗證疫苗名稱
                        if (!vaccineData.details.name) {
                            throw new Error('請輸入疫苗名稱');
                        }
                        
                        // 添加疫苗記錄
                        await HealthService.addVaccineRecord(vaccineData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新疫苗標籤
                        await this.refreshVaccinesTab(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功添加疫苗記錄', 'success');
                    } catch (error) {
                        console.error('添加疫苗記錄失敗:', error);
                        Utils.showToast(error.message || '添加疫苗記錄失敗', 'error');
                        
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
            console.error('顯示添加疫苗記錄表單失敗:', error);
            Utils.showToast('載入表單失敗', 'error');
        }
    }
    
    /**
     * 顯示添加用藥記錄表單
     */
    static async showAddMedicationForm() {
        try {
            // 檢查是否有選擇孩子
            const currentChild = await ChildService.getCurrentChild();
            
            if (!currentChild) {
                Utils.showToast('請先選擇一個孩子', 'warning');
                return;
            }
            
            // 創建表單內容
            const formContent = this.createMedicationForm();
            
            // 顯示模態框
            const closeModal = Utils.showModal('添加用藥記錄', formContent);
            
            // 處理表單提交
            const form = document.getElementById('medication-form');
            
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
                        const timeStr = formData.get('time') || '12:00';
                        const timestamp = new Date(`${dateStr}T${timeStr}`);
                        
                        // 用藥數據
                        const medicationData = {
                            childId: currentChild.id,
                            timestamp: timestamp,
                            details: {
                                name: formData.get('name'),
                                dosage: formData.get('dosage') || '',
                                reason: formData.get('reason') || ''
                            },
                            note: formData.get('note') || ''
                        };
                        
                        // 驗證藥物名稱
                        if (!medicationData.details.name) {
                            throw new Error('請輸入藥物名稱');
                        }
                        
                        // 添加用藥記錄
                        await HealthService.addMedicationRecord(medicationData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新用藥標籤
                        await this.refreshMedicationTab(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功添加用藥記錄', 'success');
                    } catch (error) {
                        console.error('添加用藥記錄失敗:', error);
                        Utils.showToast(error.message || '添加用藥記錄失敗', 'error');
                        
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
            console.error('顯示添加用藥記錄表單失敗:', error);
            Utils.showToast('載入表單失敗', 'error');
        }
    }
    
    /**
     * 顯示編輯健康記錄表單
     * @param {string} recordId 記錄ID
     */
    static async showEditHealthRecordForm(recordId) {
        try {
            // 獲取記錄數據
            const record = await HealthService.getHealthRecordById(recordId);
            
            if (!record) {
                throw new Error('找不到健康記錄');
            }
            
            let formContent;
            let modalTitle;
            
            // 根據記錄類型創建表單
            switch (record.type) {
                case HealthService.HEALTH_TYPES.GROWTH:
                    formContent = this.createGrowthForm(record);
                    modalTitle = '編輯生長記錄';
                    break;
                case HealthService.HEALTH_TYPES.CHECKUP:
                    formContent = this.createCheckupForm(record);
                    modalTitle = '編輯健康訪視記錄';
                    break;
                case HealthService.HEALTH_TYPES.VACCINE:
                    formContent = this.createVaccineForm(null, record);
                    modalTitle = '編輯疫苗記錄';
                    break;
                case HealthService.HEALTH_TYPES.MEDICATION:
                    formContent = this.createMedicationForm(record);
                    modalTitle = '編輯用藥記錄';
                    break;
                default:
                    throw new Error('不支持的健康記錄類型');
            }
            
            // 顯示模態框
            const closeModal = Utils.showModal(modalTitle, formContent);
            
            // 根據記錄類型處理表單
            switch (record.type) {
                case HealthService.HEALTH_TYPES.GROWTH:
                    this.handleGrowthForm(record, closeModal);
                    break;
                case HealthService.HEALTH_TYPES.CHECKUP:
                    this.handleCheckupForm(record, closeModal);
                    break;
                case HealthService.HEALTH_TYPES.VACCINE:
                    this.handleVaccineForm(record, closeModal);
                    break;
                case HealthService.HEALTH_TYPES.MEDICATION:
                    this.handleMedicationForm(record, closeModal);
                    break;
            }
        } catch (error) {
            console.error('顯示編輯健康記錄表單失敗:', error);
            Utils.showToast('載入健康記錄失敗', 'error');
        }
    }
    
    /**
     * 處理生長記錄表單
     * @param {Object} record 記錄數據
     * @param {Function} closeModal 關閉模態框函數
     */
    static async handleGrowthForm(record, closeModal) {
        const form = document.getElementById('growth-form');
        
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
                const timeStr = formData.get('time') || '12:00';
                const timestamp = new Date(`${dateStr}T${timeStr}`);
                
                // 生長數據
                const growthData = {
                    id: record.id,
                    timestamp: timestamp,
                    details: {},
                    note: formData.get('note') || ''
                };
                
                // 添加測量值（如果有）
                const weight = formData.get('weight');
                const height = formData.get('height');
                const headCircumference = formData.get('headCircumference');
                
                if (weight) growthData.details.weight = parseFloat(weight);
                if (height) growthData.details.height = parseFloat(height);
                if (headCircumference) growthData.details.headCircumference = parseFloat(headCircumference);
                
                // 檢查至少有一個測量值
                if (!weight && !height && !headCircumference) {
                    throw new Error('請至少填寫一項測量值');
                }
                
                // 更新生長記錄
                await HealthService.updateHealthRecord(record.id, growthData);
                
                // 關閉模態框
                closeModal();
                
                // 刷新生長記錄標籤
                await this.refreshGrowthTab(record.childId);
                
                // 顯示成功提示
                Utils.showToast('成功更新生長記錄', 'success');
            } catch (error) {
                console.error('更新生長記錄失敗:', error);
                Utils.showToast(error.message || '更新生長記錄失敗', 'error');
                
                // 恢復提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = '保存';
            }
        });
        
        // 顯示預估百分位
        const child = await ChildService.getChildById(record.childId);
        if (child) {
            this.setupPercentilePreview(form, child);
        }
    }
    
    /**
     * 處理健康訪視表單
     * @param {Object} record 記錄數據
     * @param {Function} closeModal 關閉模態框函數
     */
    static handleCheckupForm(record, closeModal) {
        const form = document.getElementById('checkup-form');
        
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
                const timeStr = formData.get('time') || '12:00';
                const timestamp = new Date(`${dateStr}T${timeStr}`);
                
                // 健康訪視數據
                const checkupData = {
                    id: record.id,
                    timestamp: timestamp,
                    details: {
                        provider: formData.get('provider') || '',
                        location: formData.get('location') || '',
                        reason: formData.get('reason') || ''
                    },
                    note: formData.get('note') || ''
                };
                
                // 更新健康訪視記錄
                await HealthService.updateHealthRecord(record.id, checkupData);
                
                // 關閉模態框
                closeModal();
                
                // 刷新健康訪視標籤
                await this.refreshCheckupsTab(record.childId);
                
                // 顯示成功提示
                Utils.showToast('成功更新健康訪視記錄', 'success');
            } catch (error) {
                console.error('更新健康訪視記錄失敗:', error);
                Utils.showToast(error.message || '更新健康訪視記錄失敗', 'error');
                
                // 恢復提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = '保存';
            }
        });
    }
    
    /**
     * 處理疫苗表單
     * @param {Object} record 記錄數據
     * @param {Function} closeModal 關閉模態框函數
     */
    static handleVaccineForm(record, closeModal) {
        const form = document.getElementById('vaccine-form');
        
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
                const timeStr = formData.get('time') || '12:00';
                const timestamp = new Date(`${dateStr}T${timeStr}`);
                
                // 疫苗數據
                const vaccineData = {
                    id: record.id,
                    timestamp: timestamp,
                    details: {
                        name: formData.get('name'),
                        brand: formData.get('brand') || '',
                        location: formData.get('location') || ''
                    },
                    note: formData.get('note') || ''
                };
                
                // 驗證疫苗名稱
                if (!vaccineData.details.name) {
                    throw new Error('請輸入疫苗名稱');
                }
                
                // 更新疫苗記錄
                await HealthService.updateHealthRecord(record.id, vaccineData);
                
                // 關閉模態框
                closeModal();
                
                // 刷新疫苗標籤
                await this.refreshVaccinesTab(record.childId);
                
                // 顯示成功提示
                Utils.showToast('成功更新疫苗記錄', 'success');
            } catch (error) {
                console.error('更新疫苗記錄失敗:', error);
                Utils.showToast(error.message || '更新疫苗記錄失敗', 'error');
                
                // 恢復提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = '保存';
            }
        });
    }
    
    /**
     * 處理用藥表單
     * @param {Object} record 記錄數據
     * @param {Function} closeModal 關閉模態框函數
     */
    static handleMedicationForm(record, closeModal) {
        const form = document.getElementById('medication-form');
        
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
                const timeStr = formData.get('time') || '12:00';
                const timestamp = new Date(`${dateStr}T${timeStr}`);
                
                // 用藥數據
                const medicationData = {
                    id: record.id,
                    timestamp: timestamp,
                    details: {
                        name: formData.get('name'),
                        dosage: formData.get('dosage') || '',
                        reason: formData.get('reason') || ''
                    },
                    note: formData.get('note') || ''
                };
                
                // 驗證藥物名稱
                if (!medicationData.details.name) {
                    throw new Error('請輸入藥物名稱');
                }
                
                // 更新用藥記錄
                await HealthService.updateHealthRecord(record.id, medicationData);
                
                // 關閉模態框
                closeModal();
                
                // 刷新用藥標籤
                await this.refreshMedicationTab(record.childId);
                
                // 顯示成功提示
                Utils.showToast('成功更新用藥記錄', 'success');
            } catch (error) {
                console.error('更新用藥記錄失敗:', error);
                Utils.showToast(error.message || '更新用藥記錄失敗', 'error');
                
                // 恢復提交按鈕
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = '保存';
            }
        });
    }
    
    /**
     * 顯示刪除健康記錄確認對話框
     * @param {string} recordId 記錄ID
     */
    static async showDeleteHealthRecordConfirm(recordId) {
        try {
            // 獲取記錄數據
            const record = await HealthService.getHealthRecordById(recordId);
            
            if (!record) {
                throw new Error('找不到健康記錄');
            }
            
            // 獲取記錄類型標籤
            const recordTypeLabels = {
                [HealthService.HEALTH_TYPES.GROWTH]: '生長記錄',
                [HealthService.HEALTH_TYPES.CHECKUP]: '健康訪視記錄',
                [HealthService.HEALTH_TYPES.VACCINE]: '疫苗記錄',
                [HealthService.HEALTH_TYPES.MEDICATION]: '用藥記錄'
            };
            
            // 顯示確認對話框
            Utils.showConfirm(
                `刪除${recordTypeLabels[record.type]}`,
                `您確定要刪除這條${recordTypeLabels[record.type]}嗎？此操作無法撤銷。`,
                async () => {
                    try {
                        // 刪除記錄
                        await HealthService.deleteHealthRecord(recordId);
                        
                        // 刷新當前標籤
                        this.refreshTabContent(this.currentTab);
                        
                        // 顯示成功提示
                        Utils.showToast(`已刪除${recordTypeLabels[record.type]}`, 'success');
                    } catch (error) {
                        console.error('刪除健康記錄失敗:', error);
                        Utils.showToast(error.message || '刪除健康記錄失敗', 'error');
                    }
                }
            );
        } catch (error) {
            console.error('顯示刪除健康記錄確認失敗:', error);
            Utils.showToast('載入健康記錄失敗', 'error');
        }
    }
    
    /**
     * 創建生長記錄表單
     * @param {Object} [record] 記錄數據（用於編輯）
     * @returns {HTMLElement} 表單元素
     */
    static createGrowthForm(record = null) {
        const isEdit = !!record;
        const details = isEdit ? (record.details || {}) : {};
        
        // 創建表單容器
        const formContainer = document.createElement('div');
        
        // 設置默認值
        const now = new Date();
        const date = isEdit ? Utils.formatDate(record.timestamp) : Utils.formatDate(now);
        const time = isEdit ? Utils.formatTime(record.timestamp) : '';
        const weight = isEdit && details.weight ? details.weight : '';
        const height = isEdit && details.height ? details.height : '';
        const headCircumference = isEdit && details.headCircumference ? details.headCircumference : '';
        const note = isEdit ? (record.note || '') : '';
        
        // 構建表單HTML
        formContainer.innerHTML = `
            <form id="growth-form" class="form">
                <div class="form-group">
                    <label for="date">日期</label>
                    <input type="date" id="date" name="date" value="${date}" required>
                </div>
                
                <div class="form-group">
                    <label for="time">時間</label>
                    <input type="time" id="time" name="time" value="${time}">
                </div>
                
                <div class="form-group">
                    <label for="weight">體重 (kg)</label>
                    <input type="number" id="weight" name="weight" min="0" step="0.01" value="${weight}" placeholder="例如: 3.5">
                    <div id="weight-percentile" class="percentile-preview"></div>
                </div>
                
                <div class="form-group">
                    <label for="height">身高 (cm)</label>
                    <input type="number" id="height" name="height" min="0" step="0.1" value="${height}" placeholder="例如: 50.5">
                    <div id="height-percentile" class="percentile-preview"></div>
                </div>
                
                <div class="form-group">
                    <label for="headCircumference">頭圍 (cm)</label>
                    <input type="number" id="headCircumference" name="headCircumference" min="0" step="0.1" value="${headCircumference}" placeholder="例如: 34.5">
                    <div id="head-percentile" class="percentile-preview"></div>
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
     * 創建健康訪視表單
     * @param {Object} [record] 記錄數據（用於編輯）
     * @returns {HTMLElement} 表單元素
     */
    static createCheckupForm(record = null) {
        const isEdit = !!record;
        const details = isEdit ? (record.details || {}) : {};
        
        // 創建表單容器
        const formContainer = document.createElement('div');
        
        // 設置默認值
        const now = new Date();
        const date = isEdit ? Utils.formatDate(record.timestamp) : Utils.formatDate(now);
        const time = isEdit ? Utils.formatTime(record.timestamp) : '';
        const provider = isEdit && details.provider ? details.provider : '';
        const location = isEdit && details.location ? details.location : '';
        const reason = isEdit && details.reason ? details.reason : '';
        const note = isEdit ? (record.note || '') : '';
        
        // 構建表單HTML
        formContainer.innerHTML = `
            <form id="checkup-form" class="form">
                <div class="form-group">
                    <label for="date">日期</label>
                    <input type="date" id="date" name="date" value="${date}" required>
                </div>
                
                <div class="form-group">
                    <label for="time">時間</label>
                    <input type="time" id="time" name="time" value="${time}">
                </div>
                
                <div class="form-group">
                    <label for="provider">醫療提供者</label>
                    <input type="text" id="provider" name="provider" value="${provider}" placeholder="例如: 小兒科醫師">
                </div>
                
                <div class="form-group">
                    <label for="location">地點</label>
                    <input type="text" id="location" name="location" value="${location}" placeholder="例如: 兒童醫院">
                </div>
                
                <div class="form-group">
                    <label for="reason">原因</label>
                    <input type="text" id="reason" name="reason" value="${reason}" placeholder="例如: 定期檢查">
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
     * 創建疫苗表單
     * @param {Object} [vaccineData] 疫苗數據（從建議列表來）
     * @param {Object} [record] 記錄數據（用於編輯）
     * @returns {HTMLElement} 表單元素
     */
    static createVaccineForm(vaccineData = null, record = null) {
        const isEdit = !!record;
        const isFromRecommended = !!vaccineData;
        const details = isEdit ? (record.details || {}) : {};
        
        // 創建表單容器
        const formContainer = document.createElement('div');
        
        // 設置默認值
        const now = new Date();
        const date = isEdit ? Utils.formatDate(record.timestamp) : Utils.formatDate(now);
        const time = isEdit ? Utils.formatTime(record.timestamp) : '';
        
        // 疫苗名稱：優先使用記錄數據，其次是建議列表，最後為空
        const name = isEdit && details.name ? details.name :
                   isFromRecommended ? vaccineData.name : '';
        
        const brand = isEdit && details.brand ? details.brand : '';
        const location = isEdit && details.location ? details.location : '';
        const note = isEdit ? (record.note || '') : '';
        
        // 構建表單HTML
        formContainer.innerHTML = `
            <form id="vaccine-form" class="form">
                <div class="form-group">
                    <label for="date">接種日期</label>
                    <input type="date" id="date" name="date" value="${date}" required>
                </div>
                
                <div class="form-group">
                    <label for="time">接種時間</label>
                    <input type="time" id="time" name="time" value="${time}">
                </div>
                
                <div class="form-group">
                    <label for="name">疫苗名稱</label>
                    <input type="text" id="name" name="name" value="${name}" required placeholder="例如: B型肝炎疫苗第1劑">
                </div>
                
                <div class="form-group">
                    <label for="brand">品牌</label>
                    <input type="text" id="brand" name="brand" value="${brand}" placeholder="例如: 默沙東">
                </div>
                
                <div class="form-group">
                    <label for="location">接種位置</label>
                    <select id="location" name="location">
                        <option value="" ${location === '' ? 'selected' : ''}>未指定</option>
                        <option value="left_arm" ${location === 'left_arm' ? 'selected' : ''}>左手臂</option>
                        <option value="right_arm" ${location === 'right_arm' ? 'selected' : ''}>右手臂</option>
                        <option value="left_leg" ${location === 'left_leg' ? 'selected' : ''}>左大腿</option>
                        <option value="right_leg" ${location === 'right_leg' ? 'selected' : ''}>右大腿</option>
                        <option value="buttock" ${location === 'buttock' ? 'selected' : ''}>臀部</option>
                        <option value="oral" ${location === 'oral' ? 'selected' : ''}>口服</option>
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
     * 創建用藥表單
     * @param {Object} [record] 記錄數據（用於編輯）
     * @returns {HTMLElement} 表單元素
     */
    static createMedicationForm(record = null) {
        const isEdit = !!record;
        const details = isEdit ? (record.details || {}) : {};
        
        // 創建表單容器
        const formContainer = document.createElement('div');
        
        // 設置默認值
        const now = new Date();
        const date = isEdit ? Utils.formatDate(record.timestamp) : Utils.formatDate(now);
        const time = isEdit ? Utils.formatTime(record.timestamp) : '';
        const name = isEdit && details.name ? details.name : '';
        const dosage = isEdit && details.dosage ? details.dosage : '';
        const reason = isEdit && details.reason ? details.reason : '';
        const note = isEdit ? (record.note || '') : '';
        
        // 構建表單HTML
        formContainer.innerHTML = `
            <form id="medication-form" class="form">
                <div class="form-group">
                    <label for="date">用藥日期</label>
                    <input type="date" id="date" name="date" value="${date}" required>
                </div>
                
                <div class="form-group">
                    <label for="time">用藥時間</label>
                    <input type="time" id="time" name="time" value="${time}">
                </div>
                
                <div class="form-group">
                    <label for="name">藥物名稱</label>
                    <input type="text" id="name" name="name" value="${name}" required placeholder="例如: 退燒藥">
                </div>
                
                <div class="form-group">
                    <label for="dosage">劑量</label>
                    <input type="text" id="dosage" name="dosage" value="${dosage}" placeholder="例如: 5ml">
                </div>
                
                <div class="form-group">
                    <label for="reason">原因</label>
                    <input type="text" id="reason" name="reason" value="${reason}" placeholder="例如: 發燒">
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
     * 設置百分位預覽
     * @param {HTMLElement} form 表單元素
     * @param {Object} child 孩子數據
     */
    static setupPercentilePreview(form, child) {
        // 獲取輸入元素和預覽容器
        const weightInput = form.querySelector('#weight');
        const heightInput = form.querySelector('#height');
        const headCircumferenceInput = form.querySelector('#headCircumference');
        
        const weightPercentile = form.querySelector('#weight-percentile');
        const heightPercentile = form.querySelector('#height-percentile');
        const headPercentile = form.querySelector('#head-percentile');
        
        // 計算記錄日期的月齡
        const dateInput = form.querySelector('#date');
        
        // 更新預覽函數
        const updatePreviews = async () => {
            try {
                const recordDate = new Date(dateInput.value);
                const birthDate = new Date(child.birthDate);
                
                // 如果日期無效，則不計算
                if (isNaN(recordDate.getTime())) {
                    return;
                }
                
                // 計算記錄時的月齡
                const ageAtRecord = Utils.calculateAge(birthDate, recordDate);
                const ageMonths = ageAtRecord.years * 12 + ageAtRecord.months;
                
                // 獲取生長標準數據
                const data = {
                    weight: weightInput.value ? parseFloat(weightInput.value) : null,
                    height: heightInput.value ? parseFloat(heightInput.value) : null,
                    headCircumference: headCircumferenceInput.value ? parseFloat(headCircumferenceInput.value) : null
                };
                
                // 獲取百分位數據
                if (data.weight || data.height || data.headCircumference) {
                    const percentiles = await HealthService.calculateGrowthPercentiles(child.id, data);
                    
                    // 更新預覽
                    if (percentiles.weight && weightPercentile) {
                        const percentile = percentiles.weight.percentile.toFixed(0);
                        weightPercentile.textContent = `${percentile}% 百分位`;
                        // 添加顏色樣式
                        if (percentile < 5) {
                            weightPercentile.className = 'percentile-preview low';
                        } else if (percentile > 95) {
                            weightPercentile.className = 'percentile-preview high';
                        } else {
                            weightPercentile.className = 'percentile-preview normal';
                        }
                    } else if (weightPercentile) {
                        weightPercentile.textContent = '';
                    }
                    
                    if (percentiles.height && heightPercentile) {
                        const percentile = percentiles.height.percentile.toFixed(0);
                        heightPercentile.textContent = `${percentile}% 百分位`;
                        // 添加顏色樣式
                        if (percentile < 5) {
                            heightPercentile.className = 'percentile-preview low';
                        } else if (percentile > 95) {
                            heightPercentile.className = 'percentile-preview high';
                        } else {
                            heightPercentile.className = 'percentile-preview normal';
                        }
                    } else if (heightPercentile) {
                        heightPercentile.textContent = '';
                    }
                    
                    if (percentiles.headCircumference && headPercentile) {
                        const percentile = percentiles.headCircumference.percentile.toFixed(0);
                        headPercentile.textContent = `${percentile}% 百分位`;
                        // 添加顏色樣式
                        if (percentile < 5) {
                            headPercentile.className = 'percentile-preview low';
                        } else if (percentile > 95) {
                            headPercentile.className = 'percentile-preview high';
                        } else {
                            headPercentile.className = 'percentile-preview normal';
                        }
                    } else if (headPercentile) {
                        headPercentile.textContent = '';
                    }
                }
            } catch (error) {
                console.warn('計算百分位預覽失敗:', error);
            }
        };
        
        // 使用防抖函數避免頻繁計算
        const debouncedUpdate = Utils.debounce(updatePreviews, 500);
        
        // 綁定變更事件
        if (weightInput) weightInput.addEventListener('input', debouncedUpdate);
        if (heightInput) heightInput.addEventListener('input', debouncedUpdate);
        if (headCircumferenceInput) headCircumferenceInput.addEventListener('input', debouncedUpdate);
        if (dateInput) dateInput.addEventListener('change', debouncedUpdate);
        
        // 初始計算
        updatePreviews();
    }
    
    /**
     * 合併疫苗數據（實際記錄和建議計劃）
     * @param {Array} vaccineRecords 實際疫苗記錄
     * @param {Array} recommendedVaccines 建議疫苗接種計劃
     * @returns {Object} 合併後的數據 {completed, due, upcoming}
     */
    static mergeVaccineData(vaccineRecords, recommendedVaccines) {
        // 已完成的疫苗（實際接種記錄）
        const completed = [...vaccineRecords];
        
        // 應該接種的疫苗（狀態為 'due' 且未接種）
        const due = recommendedVaccines
            .filter(vaccine => vaccine.status === 'due' && !vaccine.vaccinated)
            .sort((a, b) => a.ageMonths - b.ageMonths);
        
        // 即將到來的疫苗（狀態為 'upcoming' 且未接種）
        const upcoming = recommendedVaccines
            .filter(vaccine => vaccine.status === 'upcoming' && !vaccine.vaccinated)
            .sort((a, b) => a.ageMonths - b.ageMonths);
        
        return {
            completed,
            due,
            upcoming
        };
    }
}

// 導出視圖
window.HealthView = HealthView;