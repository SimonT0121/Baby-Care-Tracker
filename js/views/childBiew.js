/**
 * 孩子視圖 - 處理孩子管理相關的UI
 */
class ChildView {
    /**
     * 初始化孩子視圖
     */
    static init() {
        this.setupEventListeners();
    }
    
    /**
     * 設置事件監聽器
     */
    static setupEventListeners() {
        // 添加孩子按鈕
        const addChildBtn = document.getElementById('add-child-btn');
        if (addChildBtn) {
            addChildBtn.addEventListener('click', () => this.showAddChildForm());
        }
    }
    
    /**
     * 刷新孩子列表
     */
    static async refreshChildrenList() {
        try {
            const childrenList = document.getElementById('children-list');
            
            if (!childrenList) return;
            
            // 獲取所有孩子
            const children = await ChildService.getAllChildren();
            
            if (children.length === 0) {
                childrenList.innerHTML = `
                    <div class="empty-state">
                        <p>目前沒有孩子記錄</p>
                        <p>點擊"添加孩子"按鈕開始添加</p>
                    </div>
                `;
                return;
            }
            
            // 構建孩子卡片
            let childrenHTML = '';
            
            for (const child of children) {
                const age = Utils.formatAge(child.birthDate);
                const birthDate = Utils.formatDate(child.birthDate);
                
                childrenHTML += `
                    <div class="card child-card" data-id="${child.id}">
                        <div class="child-photo">
                            ${child.photo 
                                ? `<img src="${child.photo}" alt="${child.name}" />` 
                                : `<div class="default-avatar">${child.name.charAt(0)}</div>`
                            }
                        </div>
                        <div class="child-info">
                            <h3>${child.name}</h3>
                            <p>年齡: ${age}</p>
                            <p>出生日期: ${birthDate}</p>
                            <p>性別: ${child.gender === 'male' ? '男' : '女'}</p>
                        </div>
                        <div class="child-actions">
                            <button class="edit-child-btn secondary-btn" data-id="${child.id}">編輯</button>
                            <button class="delete-child-btn danger-btn" data-id="${child.id}">刪除</button>
                            <button class="select-child-btn primary-btn" data-id="${child.id}">選擇</button>
                        </div>
                    </div>
                `;
            }
            
            childrenList.innerHTML = childrenHTML;
            
            // 綁定卡片按鈕事件
            childrenList.querySelectorAll('.edit-child-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const childId = e.currentTarget.getAttribute('data-id');
                    this.showEditChildForm(childId);
                });
            });
            
            childrenList.querySelectorAll('.delete-child-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const childId = e.currentTarget.getAttribute('data-id');
                    this.showDeleteChildConfirm(childId);
                });
            });
            
            childrenList.querySelectorAll('.select-child-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const childId = e.currentTarget.getAttribute('data-id');
                    this.selectChild(childId);
                });
            });
        } catch (error) {
            console.error('刷新孩子列表失敗:', error);
            Utils.showToast('載入孩子列表失敗', 'error');
        }
    }
    
    /**
     * 顯示添加孩子表單
     */
    static showAddChildForm() {
        // 創建表單內容
        const formContent = this.createChildForm();
        
        // 顯示模態框
        const closeModal = Utils.showModal('添加孩子', formContent);
        
        // 處理表單提交
        const form = document.getElementById('child-form');
        
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
                    const childData = {
                        name: formData.get('name'),
                        birthDate: formData.get('birthDate'),
                        gender: formData.get('gender'),
                        photo: formData.get('photoData') || null,
                        note: formData.get('note') || ''
                    };
                    
                    // 驗證表單
                    if (!childData.name) {
                        throw new Error('請輸入孩子名稱');
                    }
                    
                    if (!childData.birthDate) {
                        throw new Error('請選擇出生日期');
                    }
                    
                    // 添加孩子
                    const childId = await ChildService.addChild(childData);
                    
                    // 關閉模態框
                    closeModal();
                    
                    // 刷新孩子列表
                    this.refreshChildrenList();
                    
                    // 自動選擇新添加的孩子
                    this.selectChild(childId);
                    
                    // 顯示成功提示
                    Utils.showToast(`已成功添加 ${childData.name}`, 'success');
                } catch (error) {
                    console.error('添加孩子失敗:', error);
                    Utils.showToast(error.message || '添加孩子失敗', 'error');
                    
                    // 恢復提交按鈕
                    const submitBtn = form.querySelector('button[type="submit"]');
                    submitBtn.disabled = false;
                    submitBtn.textContent = '保存';
                }
            });
        }
        
        // 處理照片上傳
        this.setupPhotoUpload();
    }
    
    /**
     * 顯示編輯孩子表單
     * @param {string} childId 孩子ID
     */
    static async showEditChildForm(childId) {
        try {
            // 獲取孩子數據
            const child = await ChildService.getChildById(childId);
            
            if (!child) {
                throw new Error('找不到孩子數據');
            }
            
            // 創建表單內容
            const formContent = this.createChildForm(child);
            
            // 顯示模態框
            const closeModal = Utils.showModal('編輯孩子', formContent);
            
            // 處理表單提交
            const form = document.getElementById('child-form');
            
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
                        const childData = {
                            name: formData.get('name'),
                            birthDate: formData.get('birthDate'),
                            gender: formData.get('gender'),
                            photo: formData.get('photoData') || child.photo,
                            note: formData.get('note') || ''
                        };
                        
                        // 驗證表單
                        if (!childData.name) {
                            throw new Error('請輸入孩子名稱');
                        }
                        
                        if (!childData.birthDate) {
                            throw new Error('請選擇出生日期');
                        }
                        
                        // 更新孩子
                        await ChildService.updateChild(childId, childData);
                        
                        // 關閉模態框
                        closeModal();
                        
                        // 刷新孩子列表
                        this.refreshChildrenList();
                        
                        // 刷新選擇器
                        await app.updateChildSelector();
                        
                        // 刷新當前頁面
                        app.refreshCurrentPage();
                        
                        // 顯示成功提示
                        Utils.showToast(`已成功更新 ${childData.name}`, 'success');
                    } catch (error) {
                        console.error('更新孩子失敗:', error);
                        Utils.showToast(error.message || '更新孩子失敗', 'error');
                        
                        // 恢復提交按鈕
                        const submitBtn = form.querySelector('button[type="submit"]');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '保存';
                    }
                });
            }
            
            // 處理照片上傳
            this.setupPhotoUpload();
        } catch (error) {
            console.error('顯示編輯孩子表單失敗:', error);
            Utils.showToast('載入孩子數據失敗', 'error');
        }
    }
    
    /**
     * 顯示刪除孩子確認對話框
     * @param {string} childId 孩子ID
     */
    static async showDeleteChildConfirm(childId) {
        try {
            // 獲取孩子數據
            const child = await ChildService.getChildById(childId);
            
            if (!child) {
                throw new Error('找不到孩子數據');
            }
            
            // 顯示確認對話框
            Utils.showConfirm(
                '刪除孩子',
                `您確定要刪除 ${child.name} 的所有數據嗎？此操作無法撤銷。`,
                async () => {
                    try {
                        // 刪除孩子
                        await ChildService.deleteChild(childId);
                        
                        // 刷新孩子列表
                        this.refreshChildrenList();
                        
                        // 刷新選擇器
                        await app.updateChildSelector();
                        
                        // 刷新當前頁面
                        app.refreshCurrentPage();
                        
                        // 顯示成功提示
                        Utils.showToast(`已成功刪除 ${child.name}`, 'success');
                    } catch (error) {
                        console.error('刪除孩子失敗:', error);
                        Utils.showToast(error.message || '刪除孩子失敗', 'error');
                    }
                }
            );
        } catch (error) {
            console.error('顯示刪除孩子確認失敗:', error);
            Utils.showToast('載入孩子數據失敗', 'error');
        }
    }
    
    /**
     * 選擇孩子
     * @param {string} childId 孩子ID
     */
    static async selectChild(childId) {
        try {
            // 設置當前孩子
            const child = await ChildService.setCurrentChild(childId);
            
            // 更新選擇器
            const selector = document.getElementById('current-child');
            if (selector) {
                selector.value = childId;
            }
            
            // 轉到儀表板
            app.navigateTo('dashboard');
            
            // 顯示成功提示
            Utils.showToast(`已選擇 ${child.name}`, 'success');
        } catch (error) {
            console.error('選擇孩子失敗:', error);
            Utils.showToast(error.message || '選擇孩子失敗', 'error');
        }
    }
    
    /**
     * 創建孩子表單
     * @param {Object} [child] 孩子數據（用於編輯）
     * @returns {HTMLElement} 表單元素
     */
    static createChildForm(child = null) {
        const isEdit = !!child;
        
        // 創建表單容器
        const formContainer = document.createElement('div');
        
        // 設置今天的日期作為最大值
        const today = Utils.formatDate(new Date());
        
        // 準備照片預覽
        const photoPreview = child && child.photo 
            ? `<img src="${child.photo}" alt="${child.name}" id="photo-preview" />` 
            : '<div id="photo-preview" class="empty-photo">無照片</div>';
        
        // 構建表單HTML
        formContainer.innerHTML = `
            <form id="child-form" class="form">
                <div class="form-group">
                    <label for="name">姓名 *</label>
                    <input type="text" id="name" name="name" value="${isEdit ? child.name : ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="birthDate">出生日期 *</label>
                    <input type="date" id="birthDate" name="birthDate" value="${isEdit ? Utils.formatDate(child.birthDate) : ''}" max="${today}" required>
                </div>
                
                <div class="form-group">
                    <label>性別 *</label>
                    <div class="radio-group">
                        <label>
                            <input type="radio" name="gender" value="male" ${isEdit && child.gender === 'male' ? 'checked' : ''} ${!isEdit ? 'checked' : ''}>
                            男
                        </label>
                        <label>
                            <input type="radio" name="gender" value="female" ${isEdit && child.gender === 'female' ? 'checked' : ''}>
                            女
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="photo">照片</label>
                    <div class="photo-upload">
                        <div class="photo-preview">
                            ${photoPreview}
                        </div>
                        <div class="photo-actions">
                            <input type="file" id="photo" name="photo" accept="image/*" class="hidden">
                            <input type="hidden" id="photoData" name="photoData">
                            <button type="button" id="upload-photo-btn" class="secondary-btn">上傳照片</button>
                            <button type="button" id="remove-photo-btn" class="danger-btn" ${!isEdit || !child.photo ? 'disabled' : ''}>移除照片</button>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="note">備註</label>
                    <textarea id="note" name="note" rows="3">${isEdit && child.note ? child.note : ''}</textarea>
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
     * 設置照片上傳
     */
    static setupPhotoUpload() {
        const photoInput = document.getElementById('photo');
        const uploadBtn = document.getElementById('upload-photo-btn');
        const removeBtn = document.getElementById('remove-photo-btn');
        const photoDataInput = document.getElementById('photoData');
        const photoPreview = document.getElementById('photo-preview');
        
        if (photoInput && uploadBtn && removeBtn && photoPreview) {
            // 上傳照片按鈕
            uploadBtn.addEventListener('click', () => {
                photoInput.click();
            });
            
            // 處理照片選擇
            photoInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files[0]) {
                    try {
                        // 轉換為Data URL
                        const file = e.target.files[0];
                        const dataUrl = await Utils.fileToDataURL(file, 300, 300);
                        
                        // 更新預覽和隱藏輸入
                        photoPreview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
                        photoDataInput.value = dataUrl;
                        
                        // 啟用移除按鈕
                        removeBtn.disabled = false;
                    } catch (error) {
                        console.error('照片處理失敗:', error);
                        Utils.showToast(error.message || '照片處理失敗', 'error');
                    }
                }
            });
            
            // 移除照片按鈕
            removeBtn.addEventListener('click', () => {
                photoPreview.innerHTML = '<div class="empty-photo">無照片</div>';
                photoInput.value = '';
                photoDataInput.value = '';
                removeBtn.disabled = true;
            });
        }
    }
}

// 導出視圖
window.ChildView = ChildView;
