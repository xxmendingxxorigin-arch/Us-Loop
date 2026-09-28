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
$dataFile = __DIR__ . '/../data/users.json';

function getJsonUsers($file) {
    if (!file_exists($file)) return [];
    $c = file_get_contents($file);
    return json_decode($c, true) ?: [];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $email = strtolower(trim($input['email'] ?? ''));
    $password = $input['password'] ?? '';

    if (empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Correo y contraseña requeridos'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    function applyCreatorAttributes(&$user) {
        if (strtolower(trim($user['email'] ?? '')) === 'xxmendingxxorigin@gmail.com') {
            $user['isCreator'] = true;
            $user['specialRole'] = 'creator';
            $user['specialTitle'] = 'El Creador';
        }
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ?");
            $stmt->execute([$email]);
            $u = $stmt->fetch();
            if ($u) {
                if ($u['password'] === $password) {
                    $safeUser = $u;
                    unset($safeUser['password']);
                    $safeUser['isLoggedIn'] = true;
                    applyCreatorAttributes($safeUser);
                    echo json_encode(['success' => true, 'user' => $safeUser], JSON_UNESCAPED_UNICODE);
                    exit;
                } else {
                    http_response_code(401);
                    echo json_encode(['error' => 'Contraseña incorrecta'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
                exit;
            }
        } catch (Exception $e) {
            error_log("Error en autenticación MySQL: " . $e->getMessage());
        }
    }

    // Fallback JSON
    $users = getJsonUsers($dataFile);
    foreach ($users as $u) {
        if (strtolower(trim($u['email'] ?? '')) === $email) {
            if (($u['password'] ?? '') === $password) {
                $safeUser = $u;
                unset($safeUser['password']);
                $safeUser['isLoggedIn'] = true;
                applyCreatorAttributes($safeUser);
                echo json_encode(['success' => true, 'user' => $safeUser], JSON_UNESCAPED_UNICODE);
                exit;
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Contraseña incorrecta'], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
    }

    http_response_code(404);
    echo json_encode(['error' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['status' => 'auth_service_ready'], JSON_UNESCAPED_UNICODE);
