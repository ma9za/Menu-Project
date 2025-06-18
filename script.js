class MenuApp {
    constructor() {
        this.cart = [];
        this.categories = [];
        this.items = [];
        this.currentTab = 'menu';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadCategories();
        await this.loadItems();
        this.updateCartDisplay();
    }

    setupEventListeners() {
        document.querySelectorAll('.bottom-navbar .nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filterItems(e.target.value);
        });

        document.getElementById('clear-cart').addEventListener('click', () => {
            this.clearCart();
        });

        document.getElementById('place-order').addEventListener('click', () => {
            this.placeOrder();
        });

        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.message').classList.remove('show');
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.bottom-navbar .nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.bottom-navbar .nav-item[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;
    }

    async loadCategories() {
        try {
            this.showLoading();
            const response = await fetch('api.php?action=get_categories');
            const data = await response.json();
            
            if (data.success) {
                this.categories = data.data;
                this.renderCategories();
            } else {
                this.showError('خطأ في تحميل الأصناف');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        } finally {
            this.hideLoading();
        }
    }

    async loadItems() {
        try {
            this.showLoading();
            const response = await fetch('api.php?action=get_items');
            const data = await response.json();
            
            if (data.success) {
                this.items = data.data;
                this.renderItems(this.items);
            } else {
                this.showError('خطأ في تحميل المنتجات');
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        } finally {
            this.hideLoading();
        }
    }

    renderCategories() {
        const categoriesList = document.getElementById('categories-list');
        categoriesList.innerHTML = '';

        this.categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn btn btn-outline-primary m-1';
            btn.dataset.category = category.id;
            btn.textContent = category.name;
            btn.addEventListener('click', () => {
                this.filterByCategory(category.id);
                this.updateActiveFilter(btn);
            });
            categoriesList.appendChild(btn);
        });

        document.querySelector('[data-category="all"]').addEventListener('click', () => {
            this.filterByCategory('all');
            this.updateActiveFilter(document.querySelector('[data-category="all"]'));
        });
    }

    renderItems(items) {
        const menuGrid = document.getElementById('menu-items');
        menuGrid.innerHTML = '';

        if (items.length === 0) {
            menuGrid.innerHTML = `
                <div class="col-12 empty-state">
                    <h3>لا توجد منتجات</h3>
                    <p>لم يتم العثور على منتجات تطابق البحث</p>
                </div>
            `;
            return;
        }

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'col';
            itemElement.innerHTML = `
                <div class="card menu-item">
                    <img src="${item.image_path || 'placeholder.png'}" class="card-img-top item-image" alt="${item.name}">
                    <div class="card-body d-flex flex-column">
                        <div class="item-header">
                            <h5 class="card-title item-name">${item.name}</h5>
                            <span class="item-price">${item.price} ريال</span>
                        </div>
                        <p class="card-text item-description">${item.description || ''}</p>
                        <span class="item-category">${this.categories.find(cat => cat.id == item.category_id)?.name || 'غير مصنف'}</span>
                        <div class="item-actions mt-auto">
                            <button class="add-to-cart btn btn-success w-100" onclick="app.addToCart(${item.id})">
                                إضافة للسلة
                            </button>
                        </div>
                    </div>
                </div>
            `;
            menuGrid.appendChild(itemElement);
        });
    }

    updateActiveFilter(activeBtn) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    filterByCategory(categoryId) {
        if (categoryId === 'all') {
            this.renderItems(this.items);
        } else {
            const filteredItems = this.items.filter(item => item.category_id == categoryId);
            this.renderItems(filteredItems);
        }
    }

    filterItems(searchTerm) {
        const filteredItems = this.items.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderItems(filteredItems);
    }

    addToCart(itemId) {
        const item = this.items.find(i => i.id == itemId);
        const existingCartItem = this.cart.find(i => i.id == itemId);

        if (existingCartItem) {
            existingCartItem.quantity += 1;
        } else {
            this.cart.push({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: 1
            });
        }
        
        this.updateCartDisplay();
        this.showSuccess(`تم إضافة ${item.name} إلى السلة`);
    }

    updateCartDisplay() {
        const cartCountElements = document.querySelectorAll('#cart-count, #cart-count-bottom');
        const cartItemsContainer = document.getElementById('cart-items');
        const totalAmountElement = document.getElementById('total-amount');

        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElements.forEach(el => el.textContent = totalItems);

        cartItemsContainer.innerHTML = '';
        
        if (this.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-state text-center py-5">
                    <h3>السلة فارغة</h3>
                    <p>أضف بعض المنتجات من القائمة</p>
                </div>
            `;
        } else {
            this.cart.forEach((item, index) => {
                const cartItem = document.createElement('div');
                cartItem.className = 'list-group-item d-flex justify-content-between align-items-center cart-item';
                cartItem.innerHTML = `
                    <div class="cart-item-info">
                        <h5 class="mb-1 cart-item-name">${item.name}</h5>
                        <small class="cart-item-price">${item.price} ريال × ${item.quantity}</small>
                    </div>
                    <div class="cart-item-controls d-flex align-items-center">
                        <button class="btn btn-sm btn-outline-secondary me-2" onclick="app.updateCartItemQuantity(${index}, -1)">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="btn btn-sm btn-outline-secondary ms-2" onclick="app.updateCartItemQuantity(${index}, 1)">+</button>
                        <button class="btn btn-sm btn-danger ms-3" onclick="app.removeFromCart(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItem);
            });
        }

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        totalAmountElement.textContent = total.toFixed(2);
    }

    updateCartItemQuantity(index, change) {
        this.cart[index].quantity += change;
        if (this.cart[index].quantity <= 0) {
            this.cart.splice(index, 1);
        }
        this.updateCartDisplay();
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCartDisplay();
        this.showSuccess('تم حذف المنتج من السلة');
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
        this.showSuccess('تم إفراغ السلة');
    }

    async placeOrder() {
        const customerName = document.getElementById('customer-name').value.trim();
        
        if (!customerName) {
            this.showError('يرجى إدخال اسم العميل أو رقم الجلسة');
            return;
        }

        if (this.cart.length === 0) {
            this.showError('السلة فارغة');
            return;
        }

        try {
            this.showLoading();
            
            const orderData = {
                session_id: customerName,
                items: this.cart
            };

            const response = await fetch('api.php?action=add_order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(`تم تأكيد الطلب رقم ${data.order_id} بنجاح`);
                this.clearCart();
                document.getElementById('customer-name').value = '';
                this.switchTab('menu');
            } else {
                this.showError('خطأ في تأكيد الطلب: ' + data.error);
            }
        } catch (error) {
            this.showError('خطأ في الاتصال بالخادم');
        } finally {
            this.hideLoading();
        }
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

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MenuApp();
});


