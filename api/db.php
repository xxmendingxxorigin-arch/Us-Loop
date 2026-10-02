<?php
/**
 * US-LOOP - Conexión y Controlador de Base de Datos MySQL (Hostinger)
 * Soporta conexión automática a MySQL/MariaDB con PDO y fallback inteligente.
 */

// ==============================================================================
// CONFIGURACIÓN DE BASE DE DATOS HOSTINGER
// ==============================================================================
define('DB_HOST', 'localhost');
define('DB_NAME', 'u538642724_usloop');       
define('DB_USER', 'u538642724_usloop2026');   
define('DB_PASS', 'Usloop11');               
define('DB_PORT', '3306');

// Opciones de PDO
$pdoInstance = null;
$useMysql = null;

function getDbConnection() {
    global $pdoInstance, $useMysql;

    if ($pdoInstance !== null) {
        return $pdoInstance;
    }

    if ($useMysql === false) {
        return null;
    }

    // Intentar conectar a MySQL con las credenciales configuradas
    if (!empty(DB_NAME) && !empty(DB_USER)) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);

            // Inicializar tablas automáticamente si no existen
            initDatabaseTables($pdo);

            $pdoInstance = $pdo;
            $useMysql = true;
            return $pdoInstance;
        } catch (Exception $e) {
            error_log("Error de conexión MySQL en Hostinger: " . $e->getMessage());
            $useMysql = false;
        }
    } else {
        $useMysql = false;
    }

    return null;
}

/**
 * Crea automáticamente las tablas necesarias en MySQL de Hostinger
 */
function initDatabaseTables($pdo) {
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(191) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                grade VARCHAR(50) DEFAULT '10° Grado',
                institution VARCHAR(255) DEFAULT 'Institución Educativa Fagua sede principal',
                avatar LONGTEXT,
                completedDonations INT DEFAULT 0,
                completedTrades INT DEFAULT 0,
                loopPoints INT DEFAULT 0,
                ecoSaved DECIMAL(8, 1) DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS donations (
                id VARCHAR(100) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) DEFAULT 'Libros',
                grade VARCHAR(50) DEFAULT 'General',
                school VARCHAR(255) DEFAULT 'Campus',
                donorName VARCHAR(150) NOT NULL,
                authorEmail VARCHAR(191) NOT NULL,
                phone VARCHAR(50) DEFAULT '',
                condition_status VARCHAR(50) DEFAULT 'Bueno',
                description TEXT,
                icon VARCHAR(50) DEFAULT '🎁',
                photo LONGTEXT,
                status VARCHAR(50) DEFAULT 'active',
                date_text VARCHAR(100) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS exchanges (
                id VARCHAR(100) PRIMARY KEY,
                offering VARCHAR(255) NOT NULL,
                seeking VARCHAR(255) NOT NULL,
                category VARCHAR(100) DEFAULT 'Libros',
                grade VARCHAR(50) DEFAULT 'General',
                school VARCHAR(255) DEFAULT 'Campus',
                ownerName VARCHAR(150) NOT NULL,
                authorEmail VARCHAR(191) NOT NULL,
                phone VARCHAR(50) DEFAULT '',
                condition_status VARCHAR(50) DEFAULT 'Bueno',
                description TEXT,
                icon VARCHAR(50) DEFAULT '⇄',
                photo LONGTEXT,
                status VARCHAR(50) DEFAULT 'active',
                date_text VARCHAR(100) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS requests (
                id VARCHAR(100) PRIMARY KEY,
                item_id VARCHAR(100) NOT NULL,
                item_title VARCHAR(255) NOT NULL,
                type VARCHAR(50) DEFAULT 'donation',
                requester_name VARCHAR(150) NOT NULL,
                requester_email VARCHAR(191) NOT NULL,
                requester_phone VARCHAR(50) DEFAULT '',
                requester_grade VARCHAR(50) DEFAULT '',
                requester_school VARCHAR(255) DEFAULT '',
                target_author_name VARCHAR(150) NOT NULL,
                target_author_email VARCHAR(191) NOT NULL,
                offered_item VARCHAR(255) DEFAULT '',
                requester_avatar LONGTEXT,
                message TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                date_text VARCHAR(100) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // Auto-migración si las tablas ya existen
        try { $pdo->exec("ALTER TABLE requests ADD COLUMN IF NOT EXISTS offered_item VARCHAR(255) DEFAULT ''"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_avatar LONGTEXT"); } catch (Exception $e) {}
    } catch (Exception $e) {
        error_log("Error inicializando tablas MySQL: " . $e->getMessage());
    }
}
