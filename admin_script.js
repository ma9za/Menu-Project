class AdminApp {
    constructor() {
        this.isAuthenticated = false;
        this.currentSection = 'orders';
        this.categories = [];
        this.items = [];
        this.orders = [];
        this.users = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();
    }

    setupEventListeners() {
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.currentTarget.dataset.section);
            });
        });

        document.getElementById('refresh-orders').addEventListener('click', () => {
            this.loadOrders();
        });

        document.getElementById('order-filter-status').addEventListener('change', () => {
            this.loadOrders();
        });

        document.getElementById('export-orders').addEventListener('click', () => {
            this.exportOrders();
        });

        document.getElementById('add-item-btn').addEventListener('click', () => {
            this.showItemModal();
        });

        document.getElementById('add-category-btn').addEventListener('click', () => {
            this.showCategoryModal();
        });

        document.getElementById('add-user-btn').addEventListener('click', () => {
            this.showUserModal();
        });

        document.querySelectorAll('.btn-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    const bootstrapModal = bootstrap.Modal.getInstance(modal);
                    if (bootstrapModal) {
                        bootstrapModal.hide();
                    }
                }
            });
        });

        document.getElementById('item-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveItem();
        });

        document.getElementById('category-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategory();
        });

        document.getElementById('user-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        document.querySelectorAll('.message .close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.message').classList.remove('show');
            });
        });

        document.querySelectorAll('.dropdown-item[data-theme]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.setTheme(e.target.dataset.theme);
            });
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('admin_api.php?action=check_auth');
            const data = await response.json();
            
            if (data.success && data.authenticated) {
                this.isAuthenticated = true;
                document.getElementById('admin-username').textContent = data.username;
                this.showDashboard();
                await this.loadInitialData();
            } else {
                this.showLogin();
            }
        } catch (error) {
            this.showError('خطأ في التحقق من المصادقة');
            this.showLogin();
        }
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showError('يرجى إدخال اسم المستخدم وكلمة المرور');
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch('admin_api.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (data.success) {
                this.isAuthenticated = true;
                document.getElementById('admin-username').textContent = username;
                this.showSuccess('تم تسجيل الدخول بنجاح');
                this.showDashboard();
                await this.loadInitialData();
            } else {
                this.showError(data.error || 'خطأ في تسجيل الدخول');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        } finally {
            this.hideLoading();
        }
    }

    async logout() {
        try {
            await fetch('admin_api.php?action=logout');
            this.isAuthenticated = false;
            this.showSuccess('تم تسجيل الخروج بنجاح');
            this.showLogin();
        } catch (error) {
            this.showError('خطأ في تسجيل الخروج');
        }
    }

    showLogin() {
        document.getElementById('login-section').classList.remove('d-none');
        document.getElementById('dashboard-section').classList.add('d-none');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    showDashboard() {
        document.getElementById('login-section').classList.add('d-none');
        document.getElementById('dashboard-section').classList.remove('d-none');
    }

    async loadInitialData() {
        await Promise.all([
            this.loadCategories(),
            this.loadItems(),
            this.loadOrders(),
            this.loadUsers()
        ]);
    }

    switchSection(section) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.add('d-none');
        });
        document.getElementById(`${section}-section`).classList.remove('d-none');

        this.currentSection = section;

        switch (section) {
            case 'orders':
                this.loadOrders();
                break;
            case 'items':
                this.loadItems();
                break;
            case 'categories':
                this.loadCategories();
                break;
            case 'users':
                this.loadUsers();
                break;
        }
    }

    async loadOrders() {
        try {
            this.showLoading();
            const statusFilter = document.getElementById('order-filter-status').value;
            const response = await fetch(`admin_api.php?action=get_orders&status=${statusFilter}`);
            const data = await response.json();
            
            if (data.success) {
                this.orders = data.data;
                this.renderOrders();
            } else {
                this.showError('خطأ في تحميل الطلبات');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        } finally {
            this.hideLoading();
        }
    }

    renderOrders() {
        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = '';

        if (this.orders.length === 0) {
            ordersList.innerHTML = `
                <div class="col-12 empty-state text-center py-5">
                    <h3>لا توجد طلبات</h3>
                    <p>لم يتم تأكيد أي طلبات بعد</p>
                </div>
            `;
            return;
        }

        this.orders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'col-12 col-md-6 col-lg-4';
            
            const orderDate = new Date(order.order_date).toLocaleString('ar-SA');
            const status = order.status || 'pending';
            
            orderElement.innerHTML = `
                <div class="card order-card h-100 status-${status}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="card-title order-id">طلب رقم: ${order.id}</h5>
                            <span class="badge bg-info">${this.getOrderStatusText(status)}</span>
                        </div>
                        <h6 class="card-subtitle mb-2 text-muted order-customer">العميل: ${order.session_id}</h6>
                        <p class="card-text order-date">${orderDate}</p>
                        <div class="order-items mb-3">
                            <ul class="list-group list-group-flush">
                                ${order.items.map(item => `
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span>${item.item_name}</span>
                                        <span class="badge bg-primary rounded-pill">${item.quantity} × ${item.price} ريال</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <h5 class="order-total text-end">المجموع: ${order.total_amount} ريال</h5>
                        <div class="order-actions d-flex flex-wrap gap-2">
                            <select class="form-select flex-grow-1" onchange="adminApp.updateOrderStatus(${order.id}, this.value)">
                                <option value="pending" ${status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                                <option value="preparing" ${status === 'preparing' ? 'selected' : ''}>قيد التحضير</option>
                                <option value="ready" ${status === 'ready' ? 'selected' : ''}>جاهز</option>
                                <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>تم التسليم</option>
                                <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                            </select>
                            <button class="btn btn-danger" onclick="adminApp.deleteOrder(${order.id})"><i class="fas fa-trash"></i> حذف</button>
                        </div>
                    </div>
                </div>
            `;
            ordersList.appendChild(orderElement);
        });
    }

    getOrderStatusText(status) {
        switch (status) {
            case 'pending': return 'قيد الانتظار';
            case 'preparing': return 'قيد التحضير';
            case 'ready': return 'جاهز';
            case 'delivered': return 'تم التسليم';
            case 'cancelled': return 'ملغي';
            default: return 'غير معروف';
        }
    }

    async updateOrderStatus(orderId, status) {
        try {
            const response = await fetch('admin_api.php?action=update_order_status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order_id: orderId, status })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('تم تحديث حالة الطلب');
                this.loadOrders();
            } else {
                this.showError(data.error || 'خطأ في تحديث الحالة');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    async deleteOrder(orderId) {
        if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
            return;
        }

        try {
            const response = await fetch(`admin_api.php?action=delete_order&order_id=${orderId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('تم حذف الطلب');
                this.loadOrders();
            } else {
                this.showError(data.error || 'خطأ في حذف الطلب');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    async exportOrders() {
        const ordersToExport = this.orders.map(order => ({
            'رقم الطلب': order.id,
            'العميل': order.session_id,
            'التاريخ': new Date(order.order_date).toLocaleString('ar-SA'),
            'الحالة': this.getOrderStatusText(order.status),
            'المنتجات': order.items.map(item => `${item.item_name} (x${item.quantity})`).join(', '),
            'المجموع الكلي': order.total_amount
        }));

        const csvContent = this.convertToCSV(ordersToExport);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'orders.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showSuccess('تم تصدير الطلبات بنجاح إلى ملف CSV');
    }

    convertToCSV(objArray) {
        const array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        let str = '';
        let row = '';

        for (let index in objArray[0]) {
            row += index + ',';
        }
        row = row.slice(0, -1);
        str += row + '\r\n';

        for (let i = 0; i < array.length; i++) {
            let line = '';
            for (let index in array[i]) {
                if (line != '') line += ','

                line += JSON.stringify(array[i][index]);
            }
            str += line + '\r\n';
        }
        return str;
    }

    async loadCategories() {
        try {
            const response = await fetch('api.php?action=get_categories');
            const data = await response.json();
            
            if (data.success) {
                this.categories = data.data;
                this.renderCategories();
                this.updateCategorySelect();
            } else {
                this.showError('خطأ في تحميل الأصناف');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    renderCategories() {
        const categoriesList = document.getElementById('categories-list');
        categoriesList.innerHTML = '';

        this.categories.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'col-12 col-md-6';
            categoryElement.innerHTML = `
                <div class="card category-card h-100">
                    <div class="card-body d-flex justify-content-between align-items-center">
                        <h5 class="card-title category-name mb-0">${category.name}</h5>
                        <div class="card-actions">
                            <button class="btn btn-warning btn-sm" onclick="adminApp.editCategory(${category.id})"><i class="fas fa-edit"></i> تعديل</button>
                            <button class="btn btn-danger btn-sm" onclick="adminApp.deleteCategory(${category.id})"><i class="fas fa-trash"></i> حذف</button>
                        </div>
                    </div>
                </div>
            `;
            categoriesList.appendChild(categoryElement);
        });
    }

    updateCategorySelect() {
        const categorySelect = document.getElementById('item-category');
        categorySelect.innerHTML = '<option value="">اختر الصنف</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    async loadItems() {
        try {
            const response = await fetch('api.php?action=get_items');
            const data = await response.json();
            
            if (data.success) {
                this.items = data.data;
                this.renderItems();
            } else {
                this.showError('خطأ في تحميل المنتجات');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    renderItems() {
        const itemsList = document.getElementById('items-list');
        itemsList.innerHTML = '';

        this.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'col';
            itemElement.innerHTML = `
                <div class="card item-card h-100">
                    <img src="${item.image_path || 'placeholder.png'}" class="card-img-top item-image" alt="${item.name}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title item-name">${item.name}</h5>
                        <p class="card-text item-description">${item.description || ''}</p>
                        <p class="card-text item-price">${item.price} ريال</p>
                        <p class="card-text item-category">الصنف: ${this.categories.find(cat => cat.id == item.category_id)?.name || 'غير مصنف'}</p>
                        <div class="card-actions mt-auto d-flex gap-2">
                            <button class="btn btn-warning btn-sm flex-grow-1" onclick="adminApp.editItem(${item.id})"><i class="fas fa-edit"></i> تعديل</button>
                            <button class="btn btn-danger btn-sm flex-grow-1" onclick="adminApp.deleteItem(${item.id})"><i class="fas fa-trash"></i> حذف</button>
                        </div>
                    </div>
                </div>
            `;
            itemsList.appendChild(itemElement);
        });
    }

    showItemModal(itemId = null) {
        const modalElement = document.getElementById('item-modal');
        const modal = new bootstrap.Modal(modalElement);
        const title = document.getElementById('item-modal-title');
        const form = document.getElementById('item-form');
        
        form.reset();
        document.getElementById('item-id').value = '';
        document.getElementById('item-image-path').value = '';

        if (itemId) {
            title.textContent = 'تعديل المنتج';
            const item = this.items.find(i => i.id == itemId);
            if (item) {
                document.getElementById('item-id').value = item.id;
                document.getElementById('item-name').value = item.name;
                document.getElementById('item-description').value = item.description || '';
                document.getElementById('item-price').value = item.price;
                document.getElementById('item-category').value = item.category_id;
                document.getElementById('item-image-path').value = item.image_path || '';
            }
        } else {
            title.textContent = 'إضافة منتج جديد';
        }
        
        modal.show();
    }

    showCategoryModal(categoryId = null) {
        const modalElement = document.getElementById('category-modal');
        const modal = new bootstrap.Modal(modalElement);
        const title = document.getElementById('category-modal-title');
        const form = document.getElementById('category-form');
        
        form.reset();
        document.getElementById('category-id').value = '';

        if (categoryId) {
            title.textContent = 'تعديل الصنف';
            const category = this.categories.find(c => c.id == categoryId);
            if (category) {
                document.getElementById('category-id').value = category.id;
                document.getElementById('category-name').value = category.name;
            }
        } else {
            title.textContent = 'إضافة صنف جديد';
        }
        
        modal.show();
    }

    showUserModal(userId = null) {
        const modalElement = document.getElementById('user-modal');
        const modal = new bootstrap.Modal(modalElement);
        const title = document.getElementById('user-modal-title');
        const form = document.getElementById('user-form');
        
        form.reset();
        document.getElementById('user-id').value = '';
        document.getElementById('user-password').required = true;

        if (userId) {
            title.textContent = 'تعديل المستخدم';
            const user = this.users.find(u => u.id == userId);
            if (user) {
                document.getElementById('user-id').value = user.id;
                document.getElementById('user-username').value = user.username;
                document.getElementById('user-role').value = user.role;
                document.getElementById('user-password').required = false; 
            }
        } else {
            title.textContent = 'إضافة مستخدم جديد';
        }
        
        modal.show();
    }

    async saveItem() {
        const itemId = document.getElementById('item-id').value;
        const itemData = {
            id: itemId || undefined,
            name: document.getElementById('item-name').value,
            description: document.getElementById('item-description').value,
            price: parseFloat(document.getElementById('item-price').value),
            category_id: parseInt(document.getElementById('item-category').value),
            image_path: document.getElementById('item-image-path').value
        };

        if (!itemData.name || isNaN(itemData.price) || !itemData.category_id) {
            this.showError('يرجى ملء جميع الحقول المطلوبة بشكل صحيح');
            return;
        }

        try {
            this.showLoading();
            const action = itemId ? 'update_item' : 'add_item';
            const response = await fetch(`admin_api.php?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(itemData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message);
                const modalElement = document.getElementById('item-modal');
                const modal = bootstrap.Modal.getInstance(modalElement);
                modal.hide();
                this.loadItems();
            } else {
                this.showError(data.error || 'خطأ في حفظ المنتج');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        } finally {
            this.hideLoading();
        }
    }

    async saveCategory() {
        const categoryId = document.getElementById('category-id').value;
        const categoryData = {
            id: categoryId || undefined,
            name: document.getElementById('category-name').value
        };

        if (!categoryData.name) {
            this.showError('يرجى إدخال اسم الصنف');
            return;
        }

        try {
            this.showLoading();
            const action = categoryId ? 'update_category' : 'add_category';
            const response = await fetch(`admin_api.php?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(categoryData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message);
                const modalElement = document.getElementById('category-modal');
                const modal = bootstrap.Modal.getInstance(modalElement);
                modal.hide();
                this.loadCategories();
            } else {
                this.showError(data.error || 'خطأ في حفظ الصنف');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        } finally {
            this.hideLoading();
        }
    }

    async saveUser() {
        const userId = document.getElementById('user-id').value;
        const userData = {
            id: userId || undefined,
            username: document.getElementById('user-username').value,
            password: document.getElementById('user-password').value,
            role: document.getElementById('user-role').value
        };

        if (!userData.username || (!userId && !userData.password) || !userData.role) {
            this.showError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        try {
            this.showLoading();
            const action = userId ? 'update_user' : 'add_user';
            const response = await fetch(`admin_api.php?action=${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(data.message);
                const modalElement = document.getElementById('user-modal');
                const modal = bootstrap.Modal.getInstance(modalElement);
                modal.hide();
                this.loadUsers();
            } else {
                this.showError(data.error || 'خطأ في حفظ المستخدم');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        } finally {
            this.hideLoading();
        }
    }

    async deleteItem(itemId) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            return;
        }

        try {
            const response = await fetch(`admin_api.php?action=delete_item&item_id=${itemId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('تم حذف المنتج');
                this.loadItems();
            } else {
                this.showError(data.error || 'خطأ في حذف المنتج');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
            return;
        }

        try {
            const response = await fetch(`admin_api.php?action=delete_category&category_id=${categoryId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('تم حذف الصنف');
                this.loadCategories();
            } else {
                this.showError(data.error || 'خطأ في حذف الصنف');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    async deleteUser(userId) {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            return;
        }

        try {
            const response = await fetch(`admin_api.php?action=delete_user&user_id=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('تم حذف المستخدم');
                this.loadUsers();
            } else {
                this.showError(data.error || 'خطأ في حذف المستخدم');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    editItem(itemId) {
        const item = this.items.find(i => i.id == itemId);
        if (item) {
            this.showItemModal(item);
        }
    }

    editCategory(categoryId) {
        const category = this.categories.find(c => c.id == categoryId);
        if (category) {
            this.showCategoryModal(category);
        }
    }

    editUser(userId) {
        const user = this.users.find(u => u.id == userId);
        if (user) {
            this.showUserModal(user);
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('admin_api.php?action=get_users');
            const data = await response.json();
            
            if (data.success) {
                this.users = data.data;
                this.renderUsers();
            } else {
                this.showError('خطأ في تحميل المستخدمين');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        }
    }

    renderUsers() {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';

        if (this.users.length === 0) {
            usersList.innerHTML = `
                <div class="col-12 empty-state text-center py-5">
                    <h3>لا توجد مستخدمين</h3>
                    <p>أضف مستخدمين جدد لإدارة النظام</p>
                </div>
            `;
            return;
        }

        this.users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'col-12 col-md-6 col-lg-4';
            userElement.innerHTML = `
                <div class="card user-card h-100">
                    <div class="card-body d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="card-title mb-1">${user.username}</h5>
                            <span class="badge bg-secondary">${user.role}</span>
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-warning btn-sm" onclick="adminApp.editUser(${user.id})"><i class="fas fa-edit"></i> تعديل</button>
                            <button class="btn btn-danger btn-sm" onclick="adminApp.deleteUser(${user.id})"><i class="fas fa-trash"></i> حذف</button>
                        </div>
                    </div>
                </div>
            `;
            usersList.appendChild(userElement);
        });
    }

    setTheme(themeName) {
        document.body.className = ''; 
        document.body.classList.add(`${themeName}-theme`);
    }

    showLoading() {
        document.getElementById('loading').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loading').classList.remove('show');
    }

    showSuccess(message) {
        const successMsg = document.getElementById('success-message');
        document.getElementById('success-text').textContent = message;
        successMsg.classList.add('show');
        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 3000);
    }

    showError(message) {
        const errorMsg = document.getElementById('error-message');
        document.getElementById('error-text').textContent = message;
        errorMsg.classList.add('show');
        setTimeout(() => {
            errorMsg.classList.remove('show');
        }, 3000);
    }
}

let adminApp;
document.addEventListener('DOMContentLoaded', () => {
    adminApp = new AdminApp();
});


