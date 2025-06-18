<?php
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit(0);
}

require_once "config.php";

$database = new Database();
$pdo = $database->getConnection();

$action = $_GET["action"] ?? "";

switch ($action) {
    case "get_categories":
        getCategories($pdo);
        break;
    case "get_items":
        getItems($pdo);
        break;
    case "add_order":
        addOrder($pdo);
        break;
    default:
        echo json_encode(["error" => "إجراء غير صحيح"]);
        break;
}

function getCategories($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM categories ORDER BY name");
        $categories = $stmt->fetchAll();
        echo json_encode(["success" => true, "data" => $categories]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function getItems($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT i.*, c.name as category_name 
            FROM items i 
            JOIN categories c ON i.category_id = c.id 
            ORDER BY c.name, i.name
        ");
        $items = $stmt->fetchAll();
        echo json_encode(["success" => true, "data" => $items]);
    } catch (PDOException $e) {
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

function addOrder($pdo) {
    try {
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input || !isset($input["session_id"]) || !isset($input["items"]) || empty($input["items"])) {
            echo json_encode(["success" => false, "error" => "بيانات غير صحيحة"]);
            return;
        }
        
        $pdo->beginTransaction();
        
        $total_amount = 0;
        foreach ($input["items"] as $item) {
            $total_amount += $item["price"] * 1; 
        }
        
        $stmt = $pdo->prepare("INSERT INTO orders (session_id, total_amount, status) VALUES (?, ?, ?)");
        $stmt->execute([$input["session_id"], $total_amount, "pending"]);
        $order_id = $pdo->lastInsertId();
        
        $stmt = $pdo->prepare("INSERT INTO order_items (order_id, item_id, quantity, price) VALUES (?, ?, ?, ?)");
        foreach ($input["items"] as $item) {
            $stmt->execute([$order_id, $item["id"], 1, $item["price"]]); 
        }
        
        $pdo->commit();
        echo json_encode(["success" => true, "order_id" => $order_id]);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}


