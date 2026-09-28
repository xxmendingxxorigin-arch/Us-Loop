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
$dataFile = __DIR__ . '/../data/exchanges.json';
$dataDir = dirname($dataFile);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

function getJsonExchanges($file) {
    if (!file_exists($file)) return [];
    $c = file_get_contents($file);
    return json_decode($c, true) ?: [];
}

function saveJsonExchanges($file, $exchanges) {
    file_put_contents($file, json_encode($exchanges, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM exchanges WHERE status = 'active' ORDER BY created_at DESC");
            $raw = $stmt->fetchAll();
            $exchanges = array_map(function($e) {
                $ownerName = $e['ownerName'] ?? ($e['ownername'] ?? ($e['authorName'] ?? ($e['authorname'] ?? ($e['name'] ?? 'Estudiante'))));
                $authorEmail = $e['authorEmail'] ?? ($e['authoremail'] ?? ($e['ownerEmail'] ?? ($e['owneremail'] ?? ($e['email'] ?? ''))));
                $school = $e['school'] ?? ($e['institution'] ?? 'Campus');
                $condition = $e['condition_status'] ?? ($e['condition'] ?? ($e['conditionstatus'] ?? 'Bueno'));
                $dateText = $e['date_text'] ?? ($e['datetext'] ?? ($e['date'] ?? ''));

                return [
                    'id' => $e['id'] ?? '',
                    'offering' => $e['offering'] ?? '',
                    'seeking' => $e['seeking'] ?? '',
                    'lookingFor' => $e['seeking'] ?? '',
                    'category' => $e['category'] ?? 'Libros',
                    'grade' => $e['grade'] ?? 'General',
                    'school' => $school,
                    'institution' => $school,
                    'ownerName' => $ownerName,
                    'authorName' => $ownerName,
                    'name' => $ownerName,
                    'ownerEmail' => $authorEmail,
                    'authorEmail' => $authorEmail,
                    'phone' => $e['phone'] ?? '',
                    'condition' => $condition,
                    'condition_status' => $condition,
                    'description' => $e['description'] ?? '',
                    'icon' => $e['icon'] ?? '⇄',
                    'photo' => $e['photo'] ?? null,
                    'status' => $e['status'] ?? 'active',
                    'date' => $dateText
                ];
            }, $raw);
            echo json_encode($exchanges, JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $e) {
            error_log("Error al leer intercambios de MySQL: " . $e->getMessage());
        }
    }

    $exchanges = getJsonExchanges($dataFile);
    echo json_encode($exchanges, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $input['action'] ?? 'save';

    if ($action === 'save') {
        $exchange = $input['exchange'] ?? $input;
        $id = $exchange['id'] ?? ('exc_' . time());
        $offering = $exchange['offering'] ?? ($exchange['title'] ?? 'Intercambio');
        $seeking = $exchange['seeking'] ?? ($exchange['lookingFor'] ?? 'Útiles escolares');
        $category = $exchange['category'] ?? 'Libros';
        $grade = $exchange['grade'] ?? 'General';
        $school = $exchange['school'] ?? ($exchange['institution'] ?? 'Campus');
        $ownerName = $exchange['ownerName'] ?? ($exchange['name'] ?? 'Estudiante');
        $authorEmail = $exchange['authorEmail'] ?? ($exchange['ownerEmail'] ?? '');
        $phone = $exchange['phone'] ?? '';
        $condition_status = $exchange['condition'] ?? ($exchange['condition_status'] ?? 'Bueno');
        $description = $exchange['description'] ?? '';
        $icon = $exchange['icon'] ?? '⇄';
        $photo = $exchange['photo'] ?? '';
        $status = 'active';
        $date_text = $exchange['date'] ?? date('d/m/Y');

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO exchanges (id, offering, seeking, category, grade, school, ownerName, authorEmail, phone, condition_status, description, icon, photo, status, date_text)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE offering = VALUES(offering), seeking = VALUES(seeking), description = VALUES(description), photo = VALUES(photo)
                ");
                $stmt->execute([$id, $offering, $seeking, $category, $grade, $school, $ownerName, $authorEmail, $phone, $condition_status, $description, $icon, $photo, $status, $date_text]);
                echo json_encode(['success' => true, 'exchange' => $exchange], JSON_UNESCAPED_UNICODE);
                exit;
            } catch (Exception $e) {
                error_log("Error guardando intercambio en MySQL: " . $e->getMessage());
            }
        }

        $exchanges = getJsonExchanges($dataFile);
        array_unshift($exchanges, $exchange);
        saveJsonExchanges($dataFile, $exchanges);
        echo json_encode(['success' => true, 'exchange' => $exchange], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'complete') {
        $id = strval($input['id'] ?? '');

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("DELETE FROM exchanges WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true, 'message' => 'Intercambio completado'], JSON_UNESCAPED_UNICODE);
                exit;
            } catch (Exception $e) {
                error_log("Error completando intercambio en MySQL: " . $e->getMessage());
            }
        }

        $exchanges = getJsonExchanges($dataFile);
        $exchanges = array_values(array_filter($exchanges, function($e) use ($id) {
            return strval($e['id'] ?? '') !== $id;
        }));
        saveJsonExchanges($dataFile, $exchanges);
        echo json_encode(['success' => true, 'message' => 'Intercambio completado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['error' => 'Acción no válida'], JSON_UNESCAPED_UNICODE);
}
