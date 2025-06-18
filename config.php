<?php
class Database {
    private $db_file = __DIR__ . 
'/database/menu.db';
    private $pdo;
    
    public function __construct() {
        try {
            $this->pdo = new PDO('sqlite:' . $this->db_file);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            die('خطأ في الاتصال بقاعدة البيانات: ' . $e->getMessage());
        }
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}
?>

