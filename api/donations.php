<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$dataFile = __DIR__ . '/../data/donations.json';
$dataDir = dirname($dataFile);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

function getJsonDonations($file) {
    if (!file_exists($file)) return [];
    $c = file_get_contents($file);
    return json_decode($c, true) ?: [];
}

function saveJsonDonations($file, $donations) {
    file_put_contents($file, json_encode($donations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM donations WHERE status = 'active' ORDER BY created_at DESC");
            $raw = $stmt->fetchAll();
            $donations = array_map(function($d) {
                $donorName = $d['donorName'] ?? ($d['donorname'] ?? ($d['authorName'] ?? ($d['authorname'] ?? ($d['name'] ?? 'Estudiante'))));
                $authorEmail = $d['authorEmail'] ?? ($d['authoremail'] ?? ($d['donorEmail'] ?? ($d['donoremail'] ?? ($d['email'] ?? ''))));
                $school = $d['school'] ?? ($d['institution'] ?? 'Campus');
                $condition = $d['condition_status'] ?? ($d['condition'] ?? ($d['conditionstatus'] ?? 'Bueno'));
                $dateText = $d['date_text'] ?? ($d['datetext'] ?? ($d['date'] ?? ''));

                return [
                    'id' => $d['id'] ?? '',
                    'title' => $d['title'] ?? '',
                    'category' => $d['category'] ?? 'Libros',
                    'grade' => $d['grade'] ?? 'General',
                    'school' => $school,
                    'institution' => $school,
                    'donorName' => $donorName,
                    'authorName' => $donorName,
                    'name' => $donorName,
                    'donorEmail' => $authorEmail,
                    'authorEmail' => $authorEmail,
                    'phone' => $d['phone'] ?? '',
                    'condition' => $condition,
                    'condition_status' => $condition,
                    'description' => $d['description'] ?? '',
                    'icon' => $d['icon'] ?? '🎁',
                    'photo' => $d['photo'] ?? null,
                    'status' => $d['status'] ?? 'active',
                    'date' => $dateText
                ];
            }, $raw);
            echo json_encode($donations, JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $e) {
            error_log("Error al leer donaciones de MySQL: " . $e->getMessage());
        }
    }

    $donations = getJsonDonations($dataFile);
    echo json_encode($donations, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $input['action'] ?? 'save';

    if ($action === 'save') {
        $donation = $input['donation'] ?? $input;
        $id = $donation['id'] ?? ('don_' . time());
        $title = $donation['title'] ?? 'Donación';
        $category = $donation['category'] ?? 'Libros';
        $grade = $donation['grade'] ?? 'General';
        $school = $donation['school'] ?? ($donation['institution'] ?? 'Campus');
        $donorName = $donation['donorName'] ?? ($donation['name'] ?? 'Estudiante');
        $authorEmail = $donation['authorEmail'] ?? ($donation['donorEmail'] ?? '');
        $phone = $donation['phone'] ?? '';
        $condition_status = $donation['condition'] ?? ($donation['condition_status'] ?? 'Bueno');
        $description = $donation['description'] ?? '';
        $icon = $donation['icon'] ?? '🎁';
        $photo = $donation['photo'] ?? '';
        $status = 'active';
        $date_text = $donation['date'] ?? date('d/m/Y');

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO donations (id, title, category, grade, school, donorName, authorEmail, phone, condition_status, description, icon, photo, status, date_text)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), photo = VALUES(photo)
                ");
                $stmt->execute([$id, $title, $category, $grade, $school, $donorName, $authorEmail, $phone, $condition_status, $description, $icon, $photo, $status, $date_text]);
                echo json_encode(['success' => true, 'donation' => $donation], JSON_UNESCAPED_UNICODE);
                exit;
            } catch (Exception $e) {
                error_log("Error guardando donación en MySQL: " . $e->getMessage());
            }
        }

        $donations = getJsonDonations($dataFile);
        array_unshift($donations, $donation);
        saveJsonDonations($dataFile, $donations);
        echo json_encode(['success' => true, 'donation' => $donation], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'finish') {
        $id = strval($input['id'] ?? '');

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("DELETE FROM donations WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true, 'message' => 'Donación finalizada'], JSON_UNESCAPED_UNICODE);
                exit;
            } catch (Exception $e) {
                error_log("Error finalizando donación en MySQL: " . $e->getMessage());
            }
        }

        $donations = getJsonDonations($dataFile);
        $donations = array_values(array_filter($donations, function($d) use ($id) {
            return strval($d['id'] ?? '') !== $id;
        }));
        saveJsonDonations($dataFile, $donations);
        echo json_encode(['success' => true, 'message' => 'Donación finalizada'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['error' => 'Acción no válida'], JSON_UNESCAPED_UNICODE);
}
