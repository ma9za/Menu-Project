<?php
session_start();

header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit(0);
}

require_once "config.php";

$database = new Database();
$pdo = $database->getConnection();

$action = $_GET["action"] ?? "";

switch ($action) {
    case "login":
        adminLogin($pdo);
        break;
    case "logout":
        adminLogout();
        break;
    case "check_auth":
        checkAuth();
        break;
    case "get_orders":
        if (isAdmin()) {
            getOrdersForAdmin($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "update_order_status":
        if (isAdmin()) {
            updateOrderStatus($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "delete_order":
        if (isAdmin()) {
            deleteOrder($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "add_item":
        if (isAdmin()) {
            addItem($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "update_item":
        if (isAdmin()) {
            updateItem($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "delete_item":
        if (isAdmin()) {
            deleteItem($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "add_category":
        if (isAdmin()) {
            addCategory($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "update_category":
        if (isAdmin()) {
            updateCategory($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "delete_category":
        if (isAdmin()) {
            deleteCategory($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "get_users":
        if (isAdmin()) {
            getUsers($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "add_user":
        if (isAdmin()) {
            addUser($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "update_user":
        if (isAdmin()) {
            updateUser($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    case "delete_user":
        if (isAdmin()) {
            deleteUser($pdo);
        } else {
            echo json_encode(["success" => false, "error" => "غير مصرح"]);
        }
        break;
    default:
        echo json_encode(["error" => "إجراء غير صحيح"]);
        break;
}

function adminLogin($pdo) {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["username"]) || !isset($input["password"])) {
            echo json_encode(["success" => false, "error" => "بيانات غير صحيحة"]);
            return;
        }
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$input["username"]]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($input["password"], $user["password"])) {
            $_SESSION["admin_id"] = $user["id"];
            $_SESSION["admin_username"] = $user["username"];
            $_SESSION["admin_role"] = $user["role"];
            echo json_encode(["success" => true, "message" => "تم تسجيل الدخول بنجاح", "role" => $user["role"]]);
        } else {
            echo json_encode(["success" => false, "error" => "اسم المستخدم أو كلمة المرور غير صحيحة"]);
        }
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function adminLogout() {
    session_destroy();
    echo json_encode(["success" => true, "message" => "تم تسجيل الخروج بنجاح"]);
}

function checkAuth() {
    if (isset($_SESSION["admin_id"]) && isset($_SESSION["admin_username"])) {
        echo json_encode(["success" => true, "authenticated" => true, "username" => $_SESSION["admin_username"], "role" => $_SESSION["admin_role"]]);
    } else {
        echo json_encode(["success" => true, "authenticated" => false]);
    }
}

function isAdmin() {
    return isset($_SESSION["admin_id"]) && isset($_SESSION["admin_username"]) && $_SESSION["admin_role"] === "admin";
}

function getOrdersForAdmin($pdo) {
    try {
        $status_filter = $_GET["status"] ?? "all";
        $sql = "SELECT o.*, GROUP_CONCAT(i.name || ' (x' || oi.quantity || ')') as items_summary FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN items i ON oi.item_id = i.id ";
        $params = [];

        if ($status_filter !== "all") {
            $sql .= " WHERE o.status = ?";
            $params[] = $status_filter;
        }
        $sql .= " GROUP BY o.id ORDER BY o.order_date DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $orders = $stmt->fetchAll();
        
        foreach ($orders as &$order) {
            $stmt = $pdo->prepare("SELECT oi.*, i.name as item_name FROM order_items oi JOIN items i ON oi.item_id = i.id WHERE oi.order_id = ?");
            $stmt->execute([$order["id"]]);
            $order["items"] = $stmt->fetchAll();
        }
        
        echo json_encode(["success" => true, "data" => $orders]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function updateOrderStatus($pdo) {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["order_id"]) || !isset($input["status"])) {
            echo json_encode(["success" => false, "error" => "بيانات غير صحيحة"]);
            return;
        }
        
        $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
        $stmt->execute([$input["status"], $input["order_id"]]);
        
        echo json_encode(["success" => true, "message" => "تم تحديث حالة الطلب"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function deleteOrder($pdo) {
    try {
        $order_id = $_GET["order_id"] ?? 0;
        
        if (!$order_id) {
            echo json_encode(["success" => false, "error" => "معرف الطلب مطلوب"]);
            return;
        }
        
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("DELETE FROM order_items WHERE order_id = ?");
        $stmt->execute([$order_id]);
        
        $stmt = $pdo->prepare("DELETE FROM orders WHERE id = ?");
        $stmt->execute([$order_id]);
        
        $pdo->commit();
        echo json_encode(["success" => true, "message" => "تم حذف الطلب"]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function addItem($pdo) {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["name"]) || !isset($input["price"]) || !isset($input["category_id"])) {
            echo json_encode(["success" => false, "error" => "بيانات غير صحيحة"]);
            return;
        }
        
        $stmt = $pdo->prepare("INSERT INTO items (name, description, price, category_id, image_path) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $input["name"],
            $input["description"] ?? "",
            $input["price"],
            $input["category_id"],
            $input["image_path"] ?? ""
        ]);
        
        echo json_encode(["success" => true, "message" => "تم إضافة المنتج", "item_id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function updateItem($pdo) {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["id"]) || !isset($input["name"]) || !isset($input["price"]) || !isset($input["category_id"])) {
            echo json_encode(["success" => false, "error" => "بيانات غير صحيحة"]);
            return;
        }
        
        $stmt = $pdo->prepare("UPDATE items SET name = ?, description = ?, price = ?, category_id = ?, image_path = ? WHERE id = ?");
        $stmt->execute([
            $input["name"],
            $input["description"] ?? "",
            $input["price"],
            $input["category_id"],
            $input["image_path"] ?? "",
            $input["id"]
        ]);
        
        echo json_encode(["success" => true, "message" => "تم تحديث المنتج"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function deleteItem($pdo) {
    try {
        $item_id = $_GET["item_id"] ?? 0;
        
        if (!$item_id) {
            echo json_encode(["success" => false, "error" => "معرف المنتج مطلوب"]);
            return;
        }
        
        $stmt = $pdo->prepare("DELETE FROM items WHERE id = ?");
        $stmt->execute([$item_id]);
        
        echo json_encode(["success" => true, "message" => "تم حذف المنتج"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function addCategory($pdo) {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["name"])) {
            echo json_encode(["success" => false, "error" => "بيانات غير صحيحة"]);
            return;
        }
        
        $stmt = $pdo->prepare("INSERT INTO categories (name) VALUES (?)");
        $stmt->execute([$input["name"]]);
        
        echo json_encode(["success" => true, "message" => "تم إضافة الصنف", "category_id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function updateCategory($pdo) {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["id"]) || !isset($input["name"])) {
            echo json_encode(["success" => false, "error" => "بيانات غير صحيحة"]);
            return;
        }
        
        $stmt = $pdo->prepare("UPDATE categories SET name = ? WHERE id = ?");
        $stmt->execute([$input["name"], $input["id"]]);
        
        echo json_encode(["success" => true, "message" => "تم تحديث الصنف"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function deleteCategory($pdo) {
    try {
        $category_id = $_GET["category_id"] ?? 0;
        
        if (!$category_id) {
            echo json_encode(["success" => false, "error" => "معرف الصنف مطلوب"]);
            return;
        }
        
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM items WHERE category_id = ?");
        $stmt->execute([$category_id]);
        $count = $stmt->fetchColumn();
        
        if ($count > 0) {
            echo json_encode(["success" => false, "error" => "لا يمكن حذف الصنف لوجود منتجات مرتبطة به"]);
            return;
        }
        
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        $stmt->execute([$category_id]);
        
        echo json_encode(["success" => true, "message" => "تم حذف الصنف"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function getUsers($pdo) {
    try {
        $stmt = $pdo->query("SELECT id, username, role FROM users ORDER BY username");
        $users = $stmt->fetchAll();
        echo json_encode(["success" => true, "data" => $users]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function addUser($pdo) {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["username"]) || !isset($input["password"]) || !isset($input["role"])) {
            echo json_encode(["success" => false, "error" => "بيانات غير صحيحة"]);
            return;
        }
        
        $hashed_password = password_hash($input["password"], PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
        $stmt->execute([$input["username"], $hashed_password, $input["role"]]);
        
        echo json_encode(["success" => true, "message" => "تم إضافة المستخدم", "user_id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function updateUser($pdo) {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["id"]) || !isset($input["username"]) || !isset($input["role"])) {
            echo json_encode(["success" => false, "error" => "بيانات غير صحيحة"]);
            return;
        }
        
        $sql = "UPDATE users SET username = ?, role = ? ";
        $params = [$input["username"], $input["role"]];

        if (isset($input["password"]) && !empty($input["password"])) {
            $hashed_password = password_hash($input["password"], PASSWORD_DEFAULT);
            $sql .= ", password = ? ";
            $params[] = $hashed_password;
        }
        
        $sql .= " WHERE id = ?";
        $params[] = $input["id"];

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(["success" => true, "message" => "تم تحديث المستخدم"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function deleteUser($pdo) {
    try {
        $user_id = $_GET["user_id"] ?? 0;
        
        if (!$user_id) {
            echo json_encode(["success" => false, "error" => "معرف المستخدم مطلوب"]);
            return;
        }
        
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        
        echo json_encode(["success" => true, "message" => "تم حذف المستخدم"]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}


