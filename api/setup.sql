-- ==============================================================================
-- US-LOOP - Estructura de Base de Datos MySQL (Hostinger)
-- Puedes importar este archivo directamente en phpMyAdmin de Hostinger
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `grade` VARCHAR(50) DEFAULT '10° Grado',
  `institution` VARCHAR(255) DEFAULT 'Institucion Educativa Fagua sede principal',
  `avatar` LONGTEXT,
  `completedDonations` INT DEFAULT 0,
  `completedTrades` INT DEFAULT 0,
  `loopPoints` INT DEFAULT 0,
  `ecoSaved` DECIMAL(8, 1) DEFAULT 0.0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Donaciones
CREATE TABLE IF NOT EXISTS `donations` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) DEFAULT 'Libros',
  `grade` VARCHAR(50) DEFAULT 'General',
  `school` VARCHAR(255) DEFAULT 'Campus',
  `donorName` VARCHAR(150) NOT NULL,
  `authorEmail` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) DEFAULT '',
  `condition_status` VARCHAR(50) DEFAULT 'Bueno',
  `description` TEXT,
  `icon` VARCHAR(50) DEFAULT '🎁',
  `photo` LONGTEXT,
  `status` VARCHAR(50) DEFAULT 'active',
  `date_text` VARCHAR(100) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Intercambios (Trueques)
CREATE TABLE IF NOT EXISTS `exchanges` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `offering` VARCHAR(255) NOT NULL,
  `seeking` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) DEFAULT 'Libros',
  `grade` VARCHAR(50) DEFAULT 'General',
  `school` VARCHAR(255) DEFAULT 'Campus',
  `ownerName` VARCHAR(150) NOT NULL,
  `authorEmail` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) DEFAULT '',
  `condition_status` VARCHAR(50) DEFAULT 'Bueno',
  `description` TEXT,
  `icon` VARCHAR(50) DEFAULT '⇄',
  `photo` LONGTEXT,
  `status` VARCHAR(50) DEFAULT 'active',
  `date_text` VARCHAR(100) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Solicitudes y Notificaciones de Trueques/Donaciones
CREATE TABLE IF NOT EXISTS `requests` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `item_id` VARCHAR(100) NOT NULL,
  `item_title` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) DEFAULT 'donation',
  `requester_name` VARCHAR(150) NOT NULL,
  `requester_email` VARCHAR(191) NOT NULL,
  `requester_phone` VARCHAR(50) DEFAULT '',
  `requester_grade` VARCHAR(50) DEFAULT '',
  `requester_school` VARCHAR(255) DEFAULT '',
  `target_author_name` VARCHAR(150) NOT NULL,
  `target_author_email` VARCHAR(191) NOT NULL,
  `offered_item` VARCHAR(255) DEFAULT '',
  `requester_avatar` LONGTEXT,
  `message` TEXT,
  `status` VARCHAR(50) DEFAULT 'pending',
  `date_text` VARCHAR(100) DEFAULT '',
  `scheduled_date` VARCHAR(50) DEFAULT '',
  `scheduled_time` VARCHAR(50) DEFAULT '',
  `scheduled_datetime` VARCHAR(100) DEFAULT '',
  `reminder_time` VARCHAR(50) DEFAULT '',
  `reminder_minutes` INT DEFAULT 15,
  `donor_confirmed` TINYINT(1) DEFAULT 0,
  `requester_confirmed` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
