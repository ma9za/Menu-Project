# Menu Project

An interactive and lightweight food ordering web app built using **PHP** and **SQLite**, designed for small restaurants, cafes, or food trucks. It allows customers to browse the menu, place orders, and lets admins view/manage submitted orders — all without requiring user registration.

---

## 🌟 Key Features

### 🧾 Menu Display
- Clean interface showing food items categorized by:
  - Appetizers
  - Main Dishes
  - Desserts
  - Drinks
- Real-time filtering by category
- Keyword search by item name or description
- Price and description shown clearly

### 🛒 Cart System
- Add items to cart with adjustable quantity
- Update or remove items from cart
- Auto-calculate total price on the fly

### ✅ Order Confirmation
- Customers enter their name or session/table number
- Orders are saved to the local SQLite database
- Order confirmation screen with generated order ID

### 🔒 Admin Panel
- View all submitted orders
- Full order details: items, customer name, total price, timestamp
- Update order statuses (if extended)
- Basic session-based access control (needs improvement)

---

## 🧰 Technologies Used
- **PHP** — for handling backend logic and database operations
- **SQLite** — file-based database, no server setup needed
- **HTML + CSS + JavaScript** — responsive and clean frontend
- **AJAX (Fetch API)** — for dynamic interactions without reloading pages

---

## 🗂️ Project Structure
