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
$dataDir = dirname($dataFile);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

function getJsonUsers($file) {
    if (!file_exists($file)) return [];
    $c = file_get_contents($file);
    return json_decode($c, true) ?: [];
}

function saveJsonUsers($file, $users) {
    file_put_contents($file, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$method = $_SERVER['REQUEST_METHOD'];

// GET: Obtener lista de usuarios seguros (sin contraseñas)
if ($method === 'GET') {
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT id, name, email, grade, institution, avatar, completedDonations, completedTrades, loopPoints, ecoSaved, created_at FROM users ORDER BY created_at DESC");
            $users = $stmt->fetchAll();
            
            // Sincronizar espejo JSON
            if (!empty($users)) {
                $existing = getJsonUsers($dataFile);
                $merged = [];
                $passMap = [];
                foreach ($existing as $ex) {
                    if (!empty($ex['email'])) $passMap[strtolower(trim($ex['email']))] = $ex['password'] ?? '';
                }
                foreach ($users as $u) {
                    $em = strtolower(trim($u['email'] ?? ''));
                    $u['password'] = $passMap[$em] ?? '';
                    $merged[] = $u;
                }
                saveJsonUsers($dataFile, $merged);
            }

            echo json_encode($users, JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $e) {
            error_log("Error al leer usuarios de MySQL: " . $e->getMessage());
        }
    }

    // Fallback JSON
    $users = getJsonUsers($dataFile);
    $safeUsers = array_map(function($u) {
        unset($u['password']);
        return $u;
    }, $users);
    echo json_encode($safeUsers, JSON_UNESCAPED_UNICODE);
    exit;
}

// POST: Registrar, actualizar estadísticas, actualizar perfil o eliminar cuenta
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $input['action'] ?? 'update';

    // 1. Registro de usuario
    if ($action === 'signup' || isset($input['password'])) {
        $userData = isset($input['user']) && is_array($input['user']) ? $input['user'] : $input;
        unset($userData['action']);

        $email = strtolower(trim($userData['email'] ?? ''));
        $isCreatorEmail = ($email === 'xxmendingxxorigin@gmail.com');
        $name = trim($userData['name'] ?? ($isCreatorEmail ? 'Juan David Raigoso Gómez' : 'Estudiante'));
        $password = $userData['password'] ?? '';
        $id = $userData['id'] ?? ('usr_' . time());
        $grade = $userData['grade'] ?? ($isCreatorEmail ? '11° Grado' : '10° Grado');
        $institution = $userData['institution'] ?? 'Institución Educativa Fagua sede principal';
        $avatar = $userData['avatar'] ?? ($isCreatorEmail ? '⚡🌌' : '👨‍🎓');
        $completedDonations = intval($userData['completedDonations'] ?? 0);
        $completedTrades = intval($userData['completedTrades'] ?? 0);
        $loopPoints = intval($userData['loopPoints'] ?? ($isCreatorEmail ? 3600 : 0));
        $ecoSaved = floatval($userData['ecoSaved'] ?? 0.0);
        $bio = $userData['bio'] ?? ($isCreatorEmail ? '¡Creador Principal y Desarrollador de US-Loop! 👑🛠️ Administrador del campus y guardián de la economía circular escolar.' : '');

        if ($isCreatorEmail) {
            $userData['isCreator'] = true;
            $userData['specialRole'] = 'creator';
            $userData['specialTitle'] = 'El Creador';
            $userData['bio'] = $bio;
            $userData['loopPoints'] = $loopPoints;
            $userData['completedDonations'] = 0;
            $userData['completedTrades'] = 0;
            $userData['ecoSaved'] = 0.0;
        }

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Correo y contraseña requeridos'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($pdo) {
            try {
                $check = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ?");
                $check->execute([$email]);
                if ($check->fetch()) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Ya existe una cuenta con este correo electrónico.'], JSON_UNESCAPED_UNICODE);
                    exit;
                }

                $stmt = $pdo->prepare("
                    INSERT INTO users (id, name, email, password, grade, institution, avatar, completedDonations, completedTrades, loopPoints, ecoSaved)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$id, $name, $email, $password, $grade, $institution, $avatar, $completedDonations, $completedTrades, $loopPoints, $ecoSaved]);

                // Sincronización automática de respaldo en users.json
                $users = getJsonUsers($dataFile);
                $users = array_values(array_filter($users, fn($u) => strtolower(trim($u['email'] ?? '')) !== $email));
                $users[] = array_merge($userData, ['password' => $password, 'id' => $id]);
                saveJsonUsers($dataFile, $users);

                $safeUser = $userData;
                unset($safeUser['password']);
                echo json_encode(['success' => true, 'user' => $safeUser], JSON_UNESCAPED_UNICODE);
                exit;
            } catch (Exception $e) {
                error_log("Error guardando en MySQL: " . $e->getMessage());
            }
        }

        // Fallback JSON
        $users = getJsonUsers($dataFile);
        foreach ($users as $u) {
            if (strtolower(trim($u['email'] ?? '')) === $email) {
                http_response_code(400);
                echo json_encode(['error' => 'Ya existe una cuenta con este correo electrónico.'], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
        $users[] = $userData;
        saveJsonUsers($dataFile, $users);
        $safeUser = $userData;
        unset($safeUser['password']);
        echo json_encode(['success' => true, 'user' => $safeUser], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 2. Actualizar estadísticas de donaciones/trueques
    if ($action === 'update_stats') {
        $email = strtolower(trim($input['email'] ?? ''));
        $type = $input['type'] ?? 'donation';

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ?");
                $stmt->execute([$email]);
                $user = $stmt->fetch();
                if ($user) {
                    $don = intval($user['completedDonations'] ?? 0);
                    $tra = intval($user['completedTrades'] ?? 0);
                    if ($type === 'donation') $don++;
                    else if ($type === 'trade') $tra++;

                    $pts = ($don * 25) + ($tra * 20);
                    $eco = round(($don * 3.2) + ($tra * 2.5), 1);

                    $upd = $pdo->prepare("UPDATE users SET completedDonations = ?, completedTrades = ?, loopPoints = ?, ecoSaved = ? WHERE LOWER(email) = ?");
                    $upd->execute([$don, $tra, $pts, $eco, $email]);

                    $user['completedDonations'] = $don;
                    $user['completedTrades'] = $tra;
                    $user['loopPoints'] = $pts;
                    $user['ecoSaved'] = $eco;

                    // Sincronizar espejo JSON
                    $users = getJsonUsers($dataFile);
                    foreach ($users as &$u) {
                        if (strtolower(trim($u['email'] ?? '')) === $email) {
                            $u['completedDonations'] = $don;
                            $u['completedTrades'] = $tra;
                            $u['loopPoints'] = $pts;
                            $u['ecoSaved'] = $eco;
                        }
                    }
                    saveJsonUsers($dataFile, $users);

                    unset($user['password']);
                    echo json_encode(['success' => true, 'user' => $user], JSON_UNESCAPED_UNICODE);
                    exit;
                }
            } catch (Exception $e) {
                error_log("Error actualizando stats en MySQL: " . $e->getMessage());
            }
        }

        // Fallback JSON
        $users = getJsonUsers($dataFile);
        foreach ($users as &$u) {
            if (strtolower(trim($u['email'] ?? '')) === $email) {
                if ($type === 'donation') $u['completedDonations'] = ($u['completedDonations'] ?? 0) + 1;
                else if ($type === 'trade') $u['completedTrades'] = ($u['completedTrades'] ?? 0) + 1;

                $don = $u['completedDonations'] ?? 0;
                $tra = $u['completedTrades'] ?? 0;
                $u['loopPoints'] = ($don * 25) + ($tra * 20);
                $u['ecoSaved'] = round(($don * 3.2) + ($tra * 2.5), 1);
                saveJsonUsers($dataFile, $users);
                $safeUser = $u;
                unset($safeUser['password']);
                echo json_encode(['success' => true, 'user' => $safeUser], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
        echo json_encode(['error' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 3. Actualizar perfil o avatar
    if ($action === 'update_profile') {
        $email = strtolower(trim($input['email'] ?? ''));
        $userData = isset($input['user']) && is_array($input['user']) ? $input['user'] : $input;

        if ($pdo) {
            try {
                $fields = [];
                $params = [];
                if (isset($userData['name'])) { $fields[] = "name = ?"; $params[] = $userData['name']; }
                if (isset($userData['grade'])) { $fields[] = "grade = ?"; $params[] = $userData['grade']; }
                if (isset($userData['institution'])) { $fields[] = "institution = ?"; $params[] = $userData['institution']; }
                if (isset($userData['avatar'])) { $fields[] = "avatar = ?"; $params[] = $userData['avatar']; }

                if (!empty($fields)) {
                    $params[] = $email;
                    $stmt = $pdo->prepare("UPDATE users SET " . implode(", ", $fields) . " WHERE LOWER(email) = ?");
                    $stmt->execute($params);
                }

                $getStmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = ?");
                $getStmt->execute([$email]);
                $u = $getStmt->fetch();
                if ($u) {
                    // Sincronizar espejo JSON
                    $users = getJsonUsers($dataFile);
                    foreach ($users as &$ju) {
                        if (strtolower(trim($ju['email'] ?? '')) === $email) {
                            $ju = array_merge($ju, $userData);
                        }
                    }
                    saveJsonUsers($dataFile, $users);

                    unset($u['password']);
                    echo json_encode(['success' => true, 'user' => $u], JSON_UNESCAPED_UNICODE);
                    exit;
                }
            } catch (Exception $e) {
                error_log("Error actualizando perfil en MySQL: " . $e->getMessage());
            }
        }

        // Fallback JSON
        $users = getJsonUsers($dataFile);
        foreach ($users as &$u) {
            if (strtolower(trim($u['email'] ?? '')) === $email) {
                $u = array_merge($u, $userData);
                saveJsonUsers($dataFile, $users);
                $safeUser = $u;
                unset($safeUser['password']);
                echo json_encode(['success' => true, 'user' => $safeUser], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
        echo json_encode(['error' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 4. Solicitar logro "El Verdadero Loop"
    if ($action === 'request_verdadero_loop') {
        $email = strtolower(trim($input['email'] ?? ''));
        $userId = $input['userId'] ?? '';

        $users = getJsonUsers($dataFile);
        foreach ($users as &$u) {
            if (($userId && ($u['id'] ?? '') === $userId) || (strtolower(trim($u['email'] ?? '')) === $email)) {
                $u['verdaderoLoopRequested'] = true;
                $u['verdaderoLoopRequestedAt'] = date('c');
                saveJsonUsers($dataFile, $users);
                $safe = $u;
                unset($safe['password']);
                echo json_encode(['success' => true, 'user' => $safe], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
        echo json_encode(['error' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 5. Conceder logro "El Verdadero Loop" (Exclusivo para El Creador)
    if ($action === 'approve_verdadero_loop') {
        $targetUserId = $input['targetUserId'] ?? '';
        $targetEmail = strtolower(trim($input['targetEmail'] ?? ''));

        $users = getJsonUsers($dataFile);
        foreach ($users as &$u) {
            if (($targetUserId && ($u['id'] ?? '') === $targetUserId) || (strtolower(trim($u['email'] ?? '')) === $targetEmail)) {
                $u['verdaderoLoopApproved'] = true;
                $u['verdaderoLoopApprovedAt'] = date('c');
                $u['verdaderoLoopApprovedBy'] = 'El Creador (Juan David Raigoso Gómez)';
                saveJsonUsers($dataFile, $users);
                $safe = $u;
                unset($safe['password']);
                echo json_encode(['success' => true, 'user' => $safe], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
        echo json_encode(['error' => 'Usuario no encontrado'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 6. Eliminar cuenta
    if ($action === 'delete_user') {
        $email = strtolower(trim($input['email'] ?? ''));

        if ($pdo) {
            try {
                $pdo->prepare("DELETE FROM users WHERE LOWER(email) = ?")->execute([$email]);
                $pdo->prepare("DELETE FROM donations WHERE LOWER(authorEmail) = ?")->execute([$email]);
                $pdo->prepare("DELETE FROM exchanges WHERE LOWER(authorEmail) = ?")->execute([$email]);
                $pdo->prepare("DELETE FROM requests WHERE LOWER(target_author_email) = ? OR LOWER(requester_email) = ?")->execute([$email, $email]);
            } catch (Exception $e) {
                error_log("Error borrando en MySQL: " . $e->getMessage());
            }
        }

        // Sincronizar espejo JSON en todos los archivos
        $users = getJsonUsers($dataFile);
        $users = array_values(array_filter($users, fn($u) => strtolower(trim($u['email'] ?? '')) !== $email));
        saveJsonUsers($dataFile, $users);

        $donationsFile = __DIR__ . '/../data/donations.json';
        if (file_exists($donationsFile)) {
            $donations = json_decode(file_get_contents($donationsFile), true) ?: [];
            $donations = array_values(array_filter($donations, fn($d) => strtolower(trim($d['authorEmail'] ?? ($d['donorEmail'] ?? ''))) !== $email));
            file_put_contents($donationsFile, json_encode($donations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        $exchangesFile = __DIR__ . '/../data/exchanges.json';
        if (file_exists($exchangesFile)) {
            $exchanges = json_decode(file_get_contents($exchangesFile), true) ?: [];
            $exchanges = array_values(array_filter($exchanges, fn($e) => strtolower(trim($e['authorEmail'] ?? ($e['ownerEmail'] ?? ''))) !== $email));
            file_put_contents($exchangesFile, json_encode($exchanges, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        $requestsFile = __DIR__ . '/../data/requests.json';
        if (file_exists($requestsFile)) {
            $requests = json_decode(file_get_contents($requestsFile), true) ?: [];
            $requests = array_values(array_filter($requests, fn($r) => strtolower(trim($r['targetAuthorEmail'] ?? '')) !== $email && strtolower(trim($r['requesterEmail'] ?? '')) !== $email));
            file_put_contents($requestsFile, json_encode($requests, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        echo json_encode(['success' => true, 'message' => 'Cuenta eliminada'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['error' => 'Acción no reconocida'], JSON_UNESCAPED_UNICODE);
}
