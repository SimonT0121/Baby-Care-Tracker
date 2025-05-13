/**
 * 里程碑視圖 - 處理發展里程碑相關的UI
 */
class MilestoneView {
    /**
     * 當前選中的分類
     */
    static currentCategory = 'all';
    
    /**
     * 初始化里程碑視圖
     */
    static init() {
        this.setupEventListeners();
    }
    
    /**
     * 設置事件監聽器
     */
    static setupEventListeners() {
        // 分類選擇
        document.querySelectorAll('.milestone-category').forEach(category => {
            category.addEventListener('click', (e) => {
                const categoryName = e.currentTarget.getAttribute('data-category');
                this.switchCategory(categoryName);
            });
        });
    }
    
    /**
     * 切換里程碑分類
     * @param {string} categoryName 分類名稱
     */
    static switchCategory(categoryName) {
        // 更新分類按鈕
        document.querySelectorAll('.milestone-category').forEach(category => {
            if (category.getAttribute('data-category') === categoryName) {
                category.classList.add('active');
            } else {
                category.classList.remove('active');
            }
        });
        
        // 更新當前分類
        this.currentCategory = categoryName;
        
        // 刷新里程碑列表
        this.refreshMilestoneView();
    }
    
    /**
     * 刷新里程碑視圖
     */
    static async refreshMilestoneView() {
        // 檢查是否有選擇孩子
        const currentChild = await ChildService.getCurrentChild();
        
        if (!currentChild) {
            this.showNoChildSelectedMessage();
            return;
        }
        
        // 刷新里程碑列表
        this.refreshMilestoneList(currentChild.id);
    }
    
    /**
     * 刷新里程碑列表
     * @param {string} childId 孩子ID
     */
    static async refreshMilestoneList(childId) {
        try {
            const milestonesList = document.getElementById('milestones-list');
            
            if (!milestonesList) return;
            
            // 獲取里程碑數據
            let milestones = [];
            
            if (this.currentCategory === 'all') {
                milestones = await MilestoneService.getAllMilestones(childId);
            } else {
                milestones = await MilestoneService.getMilestonesByCategory(childId, this.currentCategory);
            }
            
            if (milestones.length === 0) {
                milestonesList.innerHTML = '<p class="empty-list">沒有相關里程碑</p>';
                return;
            }
            
            // 獲取孩子信息（用於計算月齡）
            const child = await ChildService.getChildById(childId);
            const currentAgeMonths = child ? Utils.calculateAge(child.birthDate).years * 12 + Utils.calculateAge(child.birthDate).months : 0;
            
            // 排序里程碑：已完成的在前，然後按月齡排序
            milestones.sort((a, b) => {
                // 優先按完成狀態排序
                if (a.achievedDate && !b.achievedDate) return -1;
                if (!a.achievedDate && b.achievedDate) return 1;
                
                // 然後按建議月齡排序
                return a.ageMonthRecommended - b.ageMonthRecommended;
            });
            
            // 構建里程碑HTML
            let listHTML = '';
            
            for (const milestone of milestones) {
                const isCompleted = !!milestone.achievedDate;
                const achievedDate = isCompleted ? Utils.formatDate(milestone.achievedDate) : '';
                const isDelayed = !isCompleted && currentAgeMonths > milestone.ageMonthRecommended + 3;
                
                // 獲取分類標籤和圖標
                const categoryLabels = {
                    [MilestoneService.MILESTONE_CATEGORIES.MOTOR]: '動作技能',
                    [MilestoneService.MILESTONE_CATEGORIES.LANGUAGE]: '語言能力',
                    [MilestoneService.MILESTONE_CATEGORIES.SOCIAL]: '社交情感',
                    [MilestoneService.MILESTONE_CATEGORIES.COGNITIVE]: '認知能力'
                };
                
                const categoryIcons = {
                    [MilestoneService.MILESTONE_CATEGORIES.MOTOR]: '🏃',
                    [MilestoneService.MILESTONE_CATEGORIES.LANGUAGE]: '🗣️',
                    [MilestoneService.MILESTONE_CATEGORIES.SOCIAL]: '👥',
                    [MilestoneService.MILESTONE_CATEGORIES.COGNITIVE]: '🧠'
                };
                
                const categoryLabel = categoryLabels[milestone.category] || milestone.category;
                const categoryIcon = categoryIcons[milestone.category] || '📝';
                
                // 構建卡片HTML
                listHTML += `
                    <div class="card milestone-card ${isCompleted ? 'completed' : ''} ${isDelayed ? 'delayed' : ''}" data-id="${milestone.id}">
                        <div class="milestone-category-badge">${categoryIcon} ${categoryLabel}</div>
                        <div class="milestone-age-badge">${milestone.ageMonthRecommended} 個月</div>
                        <h3 class="milestone-name">${milestone.name}</h3>
                        
                        ${milestone.description ? `<p class="milestone-description">${milestone.description}</p>` : ''}
                        
                        <div class="milestone-status">
                            ${isCompleted ? 
                                `<div class="status-badge achieved">已達成於 ${achievedDate}</div>` : 
                                `<div class="status-badge ${isDelayed ? 'delayed' : 'pending'}">
                                    ${isDelayed ? '延遲' : '尚未達成'}
                                </div>`
                            }
                        </div>
                        
                        ${milestone.note ? `<div class="milestone-note">${milestone.note}</div>` : ''}
                        
                        <div class="milestone-actions">
                            ${isCompleted ? 
                                `<button class="mark-not-achieved-btn secondary-btn" data-id="${milestone.id}">標記為未達成</button>` : 
                                `<button class="mark-achieved-btn primary-btn" data-id="${milestone.id}">標記為已達成</button>`
                            }
                            <button class="edit-milestone-btn secondary-btn" data-id="${milestone.id}">編輯</button>
                            ${!milestone.isStandard ? 
                                `<button class="delete-milestone-btn danger-btn" data-id="${milestone.id}">刪除</button>` : ''
                            }
                        </div>
                    </div>
                `;
            }
            
            // 添加自定義里程碑按鈕
            listHTML += `
                <div class="card add-milestone-card">
                    <div class="add-milestone-icon">+</div>
                    <h3>添加自定義里程碑</h3>
                    <p>記錄寶寶獨特的發展時刻</p>
                    <button id="add-custom-milestone-btn" class="primary-btn">添加里程碑</button>
                </div>
            `;
            
            milestonesList.innerHTML = listHTML;
            
            // 綁定按鈕事件
            this.bindMilestoneButtons(milestonesList);
            
            // 綁定添加自定義里程碑按鈕
            const addCustomBtn = document.getElementById('add-custom-milestone-btn');
            if (addCustomBtn) {
                addCustomBtn.addEventListener('click', () => this.showAddCustomMilestoneForm());
            }
        } catch (error) {
            console.error('刷新里程碑列表失敗:', error);
            Utils.showToast('載入里程碑失敗', 'error');
        }
    }
    
    /**
     * 綁定里程碑按鈕
     * @param {HTMLElement} container 容器元素
     */
    static bindMilestoneButtons(container) {
        // 綁定標記為已達成按鈕
        container.querySelectorAll('.mark-achieved-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const milestoneId = e.currentTarget.getAttribute('data-id');
                this.showMarkAchievedForm(milestoneId);
            });
        });
        
        // 綁定標記為未達成按鈕
        container.querySelectorAll('.mark-not-achieved-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const milestoneId = e.currentTarget.getAttribute('data-id');
                this.showMarkNotAchievedConfirm(milestoneId);
            });
        });
        
        // 綁定編輯按鈕
        container.querySelectorAll('.edit-milestone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const milestoneId = e.currentTarget.getAttribute('data-id');
                this.showEditMilestoneForm(milestoneId);
            });
        });
        
        // 綁定刪除按鈕
        container.querySelectorAll('.delete-milestone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const milestoneId = e.currentTarget.getAttribute('data-id');
                this.showDeleteMilestoneConfirm(milestoneId);
            });
        });
    }
    
    /**
     * 顯示無孩子選擇訊息
     */
    static showNoChildSelectedMessage() {
        const container = document.getElementById('milestones-list');
        
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
    }
    
    /**
     * 顯示標記為已達成表單
     * @param {string} milestoneId 里程碑ID
     */
    static async showMarkAchievedForm(milestoneId) {
        try {
            // 獲取所有里程碑
            const currentChild = await ChildService.getCurrentChild();
            const milestones = await MilestoneService.getAllMilestones(currentChild.id);
            
            // 找到當前里程碑
            const milestone = milestones.find(m => m.id === milestoneId);
            
            if (!milestone) {
                throw new Error('找不到里程碑');
            }
            
            // 創建表單內容
            const formContent = document.createElement('div');
            
            // 預設達成日期為今天
            const today = Utils.formatDate(new Date());
            
            formContent.innerHTML = `
                <form id="mark-achieved-form" class="form">
                    <h4>${milestone.name}</h4>
                    <p>建議月齡: ${milestone.ageMonthRecommended} 個月</p>
                    
                    <div class="form-group">
                        <label for="achievedDate">達成日期</label>
                        <input type="date" id="achievedDate" name="achievedDate" value="${today}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="note">備註</label>
                        <textarea id="note" name="note" rows="3">${milestone.note || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" id="cancel-btn" class="secondary-btn">取消</button>
                        <button type="submit" class="primary-btn">保存</button>
                    </div>
                </form>
            `;
            
            // 顯示模態框
            const closeModal = Utils.showModal('標記里程碑為已達成', formContent);
            
            // 綁定取消按鈕
            const cancelBtn = formContent.querySelector('#cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    closeModal();
                });
            }
            
            // 處理表單提交
            const form = formContent.querySelector('#mark-achieved-form');
            
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
                        const achievedDate = new Date(formData.get('achievedDate'));
                        const note = formData.get('note');
                        
                        // 標記為已達成
                        await MilestoneService.markMilestoneAchieved(
                            currentChild.id,
                            milestone.name,
                            achievedDate,
                            note
                        );
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新里程碑列表
                        this.refreshMilestoneList(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功標記里程碑為已達成', 'success');
                    } catch (error) {
                        console.error('標記里程碑為已達成失敗:', error);
                        Utils.showToast(error.message || '標記里程碑為已達成失敗', 'error');
                        
                        // 恢復提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '保存';
                    }
                });
            }
        } catch (error) {
            console.error('顯示標記為已達成表單失敗:', error);
            Utils.showToast('載入里程碑資料失敗', 'error');
        }
    }
    
    /**
     * 顯示標記為未達成確認框
     * @param {string} milestoneId 里程碑ID
     */
    static async showMarkNotAchievedConfirm(milestoneId) {
        try {
            // 獲取所有里程碑
            const currentChild = await ChildService.getCurrentChild();
            const milestones = await MilestoneService.getAllMilestones(currentChild.id);
            
            // 找到當前里程碑
            const milestone = milestones.find(m => m.id === milestoneId);
            
            if (!milestone) {
                throw new Error('找不到里程碑');
            }
            
            // 顯示確認對話框
            Utils.showConfirm(
                '標記為未達成',
                `確定要將「${milestone.name}」標記為未達成？這將清除達成日期。`,
                async () => {
                    try {
                        // 標記為未達成
                        await MilestoneService.markMilestoneNotAchieved(
                            currentChild.id,
                            milestone.name
                        );
                        
                        // 刷新里程碑列表
                        this.refreshMilestoneList(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功標記里程碑為未達成', 'success');
                    } catch (error) {
                        console.error('標記里程碑為未達成失敗:', error);
                        Utils.showToast(error.message || '標記里程碑為未達成失敗', 'error');
                    }
                }
            );
        } catch (error) {
            console.error('顯示標記為未達成確認框失敗:', error);
            Utils.showToast('載入里程碑資料失敗', 'error');
        }
    }
    
    /**
     * 顯示編輯里程碑表單
     * @param {string} milestoneId 里程碑ID
     */
    static async showEditMilestoneForm(milestoneId) {
        try {
            // 獲取所有里程碑
            const currentChild = await ChildService.getCurrentChild();
            const milestones = await MilestoneService.getAllMilestones(currentChild.id);
            
            // 找到當前里程碑
            const milestone = milestones.find(m => m.id === milestoneId);
            
            if (!milestone) {
                throw new Error('找不到里程碑');
            }
            
            // 創建表單內容
            const formContent = this.createMilestoneForm(milestone);
            
            // 設置表單標題
            const title = milestone.isStandard ? '編輯里程碑備註' : '編輯自定義里程碑';
            
            // 顯示模態框
            const closeModal = Utils.showModal(title, formContent);
            
            // 處理表單提交
            const form = document.getElementById('milestone-form');
            
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
                        
                        let milestoneData = {
                            id: milestone.id,
                            note: formData.get('note') || ''
                        };
                        
                        // 如果是自定義里程碑，可以編輯更多字段
                        if (!milestone.isStandard) {
                            milestoneData = {
                                ...milestoneData,
                                name: formData.get('name'),
                                category: formData.get('category'),
                                ageMonthRecommended: parseInt(formData.get('ageMonthRecommended'), 10),
                                description: formData.get('description') || ''
                            };
                        }
                        
                        // 如果有達成日期
                        if (formData.get('hasAchieved') === 'yes') {
                            milestoneData.achievedDate = new Date(formData.get('achievedDate'));
                        } else {
                            milestoneData.achievedDate = null;
                        }
                        
                        // 更新里程碑
                        await MilestoneService.updateMilestone(milestoneId, milestoneData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新里程碑列表
                        this.refreshMilestoneList(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功更新里程碑', 'success');
                    } catch (error) {
                        console.error('更新里程碑失敗:', error);
                        Utils.showToast(error.message || '更新里程碑失敗', 'error');
                        
                        // 恢復提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '保存';
                    }
                });
                
                // 處理達成狀態變更
                const achievedRadios = form.querySelectorAll('[name="hasAchieved"]');
                if (achievedRadios.length) {
                    this.handleAchievementChange(form.querySelector('[name="hasAchieved"]:checked').value, form);
                    
                    achievedRadios.forEach(radio => {
                        radio.addEventListener('change', (e) => {
                            this.handleAchievementChange(e.target.value, form);
                        });
                    });
                }
            }
        } catch (error) {
            console.error('顯示編輯里程碑表單失敗:', error);
            Utils.showToast('載入里程碑資料失敗', 'error');
        }
    }
    
    /**
     * 顯示添加自定義里程碑表單
     */
    static async showAddCustomMilestoneForm() {
        try {
            // 檢查是否有選擇孩子
            const currentChild = await ChildService.getCurrentChild();
            
            if (!currentChild) {
                Utils.showToast('請先選擇一個孩子', 'warning');
                return;
            }
            
            // 創建表單內容
            const formContent = this.createMilestoneForm();
            
            // 顯示模態框
            const closeModal = Utils.showModal('添加自定義里程碑', formContent);
            
            // 處理表單提交
            const form = document.getElementById('milestone-form');
            
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
                        
                        // 創建里程碑數據
                        const milestoneData = {
                            childId: currentChild.id,
                            name: formData.get('name'),
                            category: formData.get('category'),
                            ageMonthRecommended: parseInt(formData.get('ageMonthRecommended'), 10),
                            description: formData.get('description') || '',
                            note: formData.get('note') || ''
                        };
                        
                        // 如果已達成，添加達成日期
                        if (formData.get('hasAchieved') === 'yes') {
                            milestoneData.achievedDate = new Date(formData.get('achievedDate'));
                        }
                        
                        // 添加自定義里程碑
                        await MilestoneService.addCustomMilestone(milestoneData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新里程碑列表
                        this.refreshMilestoneList(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功添加自定義里程碑', 'success');
                    } catch (error) {
                        console.error('添加自定義里程碑失敗:', error);
                        Utils.showToast(error.message || '添加自定義里程碑失敗', 'error');
                        
                        // 恢復提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '保存';
                    }
                });
                
                // 處理達成狀態變更
                const achievedRadios = form.querySelectorAll('[name="hasAchieved"]');
                if (achievedRadios.length) {
                    this.handleAchievementChange(form.querySelector('[name="hasAchieved"]:checked').value, form);
                    
                    achievedRadios.forEach(radio => {
                        radio.addEventListener('change', (e) => {
                            this.handleAchievementChange(e.target.value, form);
                        });
                    });
                }
            }
        } catch (error) {
            console.error('顯示添加自定義里程碑表單失敗:', error);
            Utils.showToast('載入表單失敗', 'error');
        }
    }
    
    /**
     * 顯示刪除里程碑確認框
     * @param {string} milestoneId 里程碑ID
     */
    static async showDeleteMilestoneConfirm(milestoneId) {
        try {
            // 獲取所有里程碑
            const currentChild = await ChildService.getCurrentChild();
            const milestones = await MilestoneService.getAllMilestones(currentChild.id);
            
            // 找到當前里程碑
            const milestone = milestones.find(m => m.id === milestoneId);
            
            if (!milestone) {
                throw new Error('找不到里程碑');
            }
            
            // 確認是否為自定義里程碑
            if (milestone.isStandard) {
                Utils.showToast('無法刪除標準里程碑', 'warning');
                return;
            }
            
            // 顯示確認對話框
            Utils.showConfirm(
                '刪除自定義里程碑',
                `確定要刪除自定義里程碑「${milestone.name}」？此操作無法撤銷。`,
                async () => {
                    try {
                        // 刪除自定義里程碑
                        await MilestoneService.deleteCustomMilestone(milestoneId);
                        
                        // 刷新里程碑列表
                        this.refreshMilestoneList(currentChild.id);
                        
                        // 顯示成功提示
                        Utils.showToast('成功刪除自定義里程碑', 'success');
                    } catch (error) {
                        console.error('刪除自定義里程碑失敗:', error);
                        Utils.showToast(error.message || '刪除自定義里程碑失敗', 'error');
                    }
                }
            );
        } catch (error) {
            console.error('顯示刪除里程碑確認框失敗:', error);
            Utils.showToast('載入里程碑資料失敗', 'error');
        }
    }
    
    /**
     * 創建里程碑表單
     * @param {Object} [milestone] 里程碑數據（用於編輯）
     * @returns {HTMLElement} 表單元素
     */
    static createMilestoneForm(milestone = null) {
        const isEdit = !!milestone;
        const isStandard = isEdit && milestone.isStandard;
        
        // 創建表單容器
        const formContainer = document.createElement('div');
        
        // 設置默認值
        const now = new Date();
        const today = Utils.formatDate(now);
        
        const name = isEdit ? milestone.name : '';
        const category = isEdit ? milestone.category : MilestoneService.MILESTONE_CATEGORIES.MOTOR;
        const ageMonthRecommended = isEdit ? milestone.ageMonthRecommended : 12;
        const description = isEdit ? (milestone.description || '') : '';
        const note = isEdit ? (milestone.note || '') : '';
        
        const hasAchieved = isEdit && milestone.achievedDate ? 'yes' : 'no';
        const achievedDate = isEdit && milestone.achievedDate ? Utils.formatDate(milestone.achievedDate) : today;
        
        // 構建表單HTML
        formContainer.innerHTML = `
            <form id="milestone-form" class="form">
                ${!isStandard ? `
                    <div class="form-group">
                        <label for="name">里程碑名稱</label>
                        <input type="text" id="name" name="name" value="${name}" required placeholder="例如: 第一次翻身">
                    </div>
                    
                    <div class="form-group">
                        <label for="category">分類</label>
                        <select id="category" name="category" required>
                            <option value="${MilestoneService.MILESTONE_CATEGORIES.MOTOR}" ${category === MilestoneService.MILESTONE_CATEGORIES.MOTOR ? 'selected' : ''}>動作技能</option>
                            <option value="${MilestoneService.MILESTONE_CATEGORIES.LANGUAGE}" ${category === MilestoneService.MILESTONE_CATEGORIES.LANGUAGE ? 'selected' : ''}>語言能力</option>
                            <option value="${MilestoneService.MILESTONE_CATEGORIES.SOCIAL}" ${category === MilestoneService.MILESTONE_CATEGORIES.SOCIAL ? 'selected' : ''}>社交情感</option>
                            <option value="${MilestoneService.MILESTONE_CATEGORIES.COGNITIVE}" ${category === MilestoneService.MILESTONE_CATEGORIES.COGNITIVE ? 'selected' : ''}>認知能力</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="ageMonthRecommended">建議月齡</label>
                        <input type="number" id="ageMonthRecommended" name="ageMonthRecommended" min="0" max="72" step="1" value="${ageMonthRecommended}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">描述</label>
                        <textarea id="description" name="description" rows="2">${description}</textarea>
                    </div>
                ` : `
                    <div class="milestone-info">
                        <h4>${name}</h4>
                        <p><strong>分類:</strong> ${this.getCategoryLabel(category)}</p>
                        <p><strong>建議月齡:</strong> ${ageMonthRecommended} 個月</p>
                        ${description ? `<p><strong>描述:</strong> ${description}</p>` : ''}
                    </div>
                `}
                
                <div class="form-group">
                    <label>達成狀態</label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="hasAchieved" value="yes" ${hasAchieved === 'yes' ? 'checked' : ''}>
                            已達成
                        </label>
                        <label>
                            <input type="radio" name="hasAchieved" value="no" ${hasAchieved === 'no' ? 'checked' : ''}>
                            未達成
                        </label>
                    </div>
                </div>
                
                <div id="achieved-date-group" class="form-group ${hasAchieved === 'no' ? 'hidden' : ''}">
                    <label for="achievedDate">達成日期</label>
                    <input type="date" id="achievedDate" name="achievedDate" value="${achievedDate}" ${hasAchieved === 'yes' ? 'required' : ''}>
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
     * 處理達成狀態變更
     * @param {string} hasAchieved 是否已達成
     * @param {HTMLElement} form 表單元素
     */
    static handleAchievementChange(hasAchieved, form) {
        const achievedDateGroup = form.querySelector('#achieved-date-group');
        const achievedDateInput = form.querySelector('#achievedDate');
        
        if (hasAchieved === 'yes') {
            achievedDateGroup.classList.remove('hidden');
            achievedDateInput.required = true;
        } else {
            achievedDateGroup.classList.add('hidden');
            achievedDateInput.required = false;
        }
    }
    
    /**
     * 獲取分類標籤
     * @param {string} category 分類名稱
     * @returns {string} 分類標籤
     */
    static getCategoryLabel(category) {
        const categoryLabels = {
            [MilestoneService.MILESTONE_CATEGORIES.MOTOR]: '動作技能',
            [MilestoneService.MILESTONE_CATEGORIES.LANGUAGE]: '語言能力',
            [MilestoneService.MILESTONE_CATEGORIES.SOCIAL]: '社交情感',
            [MilestoneService.MILESTONE_CATEGORIES.COGNITIVE]: '認知能力'
        };
        
        return categoryLabels[category] || category;
    }
}

// 導出視圖
window.MilestoneView = MilestoneView;