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
$dataFile = __DIR__ . '/../data/requests.json';
$dataDir = dirname($dataFile);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

function getJsonRequests($file) {
    if (!file_exists($file)) return [];
    $c = file_get_contents($file);
    return json_decode($c, true) ?: [];
}

function saveJsonRequests($file, $requests) {
    file_put_contents($file, json_encode($requests, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function ensureRequestsTable($pdo) {
    if (!$pdo) return;
    try {
        $pdo->exec("
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
                scheduled_date VARCHAR(50) DEFAULT '',
                scheduled_time VARCHAR(50) DEFAULT '',
                scheduled_datetime VARCHAR(100) DEFAULT '',
                reminder_time VARCHAR(50) DEFAULT '',
                reminder_minutes INT DEFAULT 15,
                donor_confirmed TINYINT(1) DEFAULT 0,
                requester_confirmed TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        
        $colsStmt = $pdo->query("SHOW COLUMNS FROM requests");
        $existingCols = $colsStmt ? $colsStmt->fetchAll(PDO::FETCH_COLUMN) : [];
        $existingColsLower = array_map('strtolower', $existingCols);

        if (!in_array('donor_confirmed', $existingColsLower)) {
            try { $pdo->exec("ALTER TABLE requests ADD COLUMN donor_confirmed TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}
        }
        if (!in_array('requester_confirmed', $existingColsLower)) {
            try { $pdo->exec("ALTER TABLE requests ADD COLUMN requester_confirmed TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}
        }
        if (!in_array('offered_item', $existingColsLower)) {
            try { $pdo->exec("ALTER TABLE requests ADD COLUMN offered_item VARCHAR(255) DEFAULT ''"); } catch (Exception $e) {}
        }
        if (!in_array('requester_avatar', $existingColsLower)) {
            try { $pdo->exec("ALTER TABLE requests ADD COLUMN requester_avatar LONGTEXT"); } catch (Exception $e) {}
        }
        if (!in_array('scheduled_date', $existingColsLower)) {
            try { $pdo->exec("ALTER TABLE requests ADD COLUMN scheduled_date VARCHAR(50) DEFAULT ''"); } catch (Exception $e) {}
        }
        if (!in_array('scheduled_time', $existingColsLower)) {
            try { $pdo->exec("ALTER TABLE requests ADD COLUMN scheduled_time VARCHAR(50) DEFAULT ''"); } catch (Exception $e) {}
        }
        if (!in_array('reminder_time', $existingColsLower)) {
            try { $pdo->exec("ALTER TABLE requests ADD COLUMN reminder_time VARCHAR(50) DEFAULT ''"); } catch (Exception $e) {}
        }
    } catch (Exception $e) {
        error_log("Error asegurando tabla requests: " . $e->getMessage());
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($pdo) {
        try {
            ensureRequestsTable($pdo);
            $stmt = $pdo->query("SELECT * FROM requests ORDER BY created_at DESC");
            $rawRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $requests = array_map(function($r) {
                $status = $r['status'] ?? 'pending';
                $donorConf = ($status === 'accepted_donor_confirmed' || $status === 'completed' || (!empty($r['donor_confirmed']) && $r['donor_confirmed'] != '0') || !empty($r['donorConfirmed']));
                $reqConf = ($status === 'accepted_requester_confirmed' || $status === 'completed' || (!empty($r['requester_confirmed']) && $r['requester_confirmed'] != '0') || !empty($r['requesterConfirmed']));
                return [
                    'id' => $r['id'] ?? '',
                    'itemId' => $r['item_id'] ?? ($r['itemId'] ?? ($r['itemid'] ?? '')),
                    'itemTitle' => $r['item_title'] ?? ($r['itemTitle'] ?? ($r['itemtitle'] ?? 'Material escolar')),
                    'itemType' => $r['type'] ?? ($r['itemType'] ?? ($r['itemtype'] ?? 'donation')),
                    'type' => $r['type'] ?? ($r['itemType'] ?? ($r['itemtype'] ?? 'donation')),
                    'requesterName' => $r['requester_name'] ?? ($r['requesterName'] ?? ($r['requestername'] ?? 'Estudiante')),
                    'requesterEmail' => $r['requester_email'] ?? ($r['requesterEmail'] ?? ($r['requesteremail'] ?? '')),
                    'requesterContact' => $r['requester_phone'] ?? ($r['requesterContact'] ?? ($r['requestercontact'] ?? ($r['requesterPhone'] ?? ($r['requesterphone'] ?? '')))),
                    'requesterPhone' => $r['requester_phone'] ?? ($r['requesterPhone'] ?? ($r['requesterphone'] ?? '')),
                    'requesterGrade' => $r['requester_grade'] ?? ($r['requesterGrade'] ?? ($r['requestergrade'] ?? '')),
                    'requesterSchool' => $r['requester_school'] ?? ($r['requesterSchool'] ?? ($r['requesterschool'] ?? '')),
                    'targetAuthorName' => $r['target_author_name'] ?? ($r['targetAuthorName'] ?? ($r['targetauthorname'] ?? '')),
                    'targetAuthorEmail' => $r['target_author_email'] ?? ($r['targetAuthorEmail'] ?? ($r['targetauthoremail'] ?? '')),
                    'offeredItem' => $r['offered_item'] ?? ($r['offeredItem'] ?? ($r['offereditem'] ?? '')),
                    'requesterAvatar' => $r['requester_avatar'] ?? ($r['requesterAvatar'] ?? ($r['requesteravatar'] ?? '👨‍🎓')),
                    'message' => $r['message'] ?? '',
                    'status' => $status,
                    'date' => $r['date_text'] ?? ($r['date'] ?? date('d/m/Y')),
                    'scheduledDate' => $r['scheduled_date'] ?? ($r['scheduledDate'] ?? ''),
                    'scheduledTime' => $r['scheduled_time'] ?? ($r['scheduledTime'] ?? ''),
                    'scheduledDateTime' => $r['scheduled_datetime'] ?? ($r['scheduledDateTime'] ?? ''),
                    'reminderTime' => $r['reminder_time'] ?? ($r['reminderTime'] ?? ''),
                    'reminderMinutesBefore' => isset($r['reminder_minutes']) ? intval($r['reminder_minutes']) : (isset($r['reminderMinutesBefore']) ? intval($r['reminderMinutesBefore']) : 15),
                    'donorConfirmed' => $donorConf,
                    'donor_confirmed' => $donorConf ? 1 : 0,
                    'requesterConfirmed' => $reqConf,
                    'requester_confirmed' => $reqConf ? 1 : 0
                ];
            }, $rawRequests);
            echo json_encode($requests, JSON_UNESCAPED_UNICODE);
            exit;
        } catch (Exception $e) {
            error_log("Error al leer solicitudes de MySQL: " . $e->getMessage());
        }
    }

    $requests = getJsonRequests($dataFile);
    echo json_encode($requests, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $action = $input['action'] ?? 'save';

    if ($action === 'save') {
        $req = $input['request'] ?? $input;
        $id = $req['id'] ?? ('req_' . time());
        $item_id = $req['itemId'] ?? ($req['item_id'] ?? '');
        $item_title = $req['itemTitle'] ?? ($req['item_title'] ?? 'Material escolar');
        $type = $req['type'] ?? ($req['itemType'] ?? 'donation');
        $requester_name = $req['requesterName'] ?? ($req['requester_name'] ?? 'Estudiante');
        $requester_email = $req['requesterEmail'] ?? ($req['requester_email'] ?? '');
        $requester_phone = $req['requesterContact'] ?? ($req['requesterPhone'] ?? ($req['requester_phone'] ?? ''));
        $requester_grade = $req['requesterGrade'] ?? ($req['requester_grade'] ?? '');
        $requester_school = $req['requesterSchool'] ?? ($req['requester_school'] ?? '');
        $target_author_name = $req['targetAuthorName'] ?? ($req['target_author_name'] ?? '');
        $target_author_email = $req['targetAuthorEmail'] ?? ($req['target_author_email'] ?? '');
        $offered_item = $req['offeredItem'] ?? ($req['offered_item'] ?? '');
        $requester_avatar = $req['requesterAvatar'] ?? ($req['requester_avatar'] ?? '👨‍🎓');
        $message = $req['message'] ?? '';
        $status = $req['status'] ?? 'pending';
        $date_text = $req['date'] ?? date('d/m/Y');
        $scheduled_date = $req['scheduledDate'] ?? ($req['scheduled_date'] ?? '');
        $scheduled_time = $req['scheduledTime'] ?? ($req['scheduled_time'] ?? '');
        $scheduled_datetime = $req['scheduledDateTime'] ?? ($req['scheduled_datetime'] ?? '');
        $reminder_time = $req['reminderTime'] ?? ($req['reminder_time'] ?? '');
        $reminder_minutes = isset($req['reminderMinutesBefore']) ? intval($req['reminderMinutesBefore']) : (isset($req['reminder_minutes']) ? intval($req['reminder_minutes']) : 15);

        if ($pdo) {
            ensureRequestsTable($pdo);
            $savedInDb = false;

            // Intento 1: Con todas las columnas de programación
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO requests (id, item_id, item_title, type, requester_name, requester_email, requester_phone, requester_grade, requester_school, target_author_name, target_author_email, offered_item, requester_avatar, message, status, date_text, scheduled_date, scheduled_time, scheduled_datetime, reminder_time, reminder_minutes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE status = VALUES(status), message = VALUES(message), offered_item = VALUES(offered_item), scheduled_date = VALUES(scheduled_date), scheduled_time = VALUES(scheduled_time), scheduled_datetime = VALUES(scheduled_datetime), reminder_time = VALUES(reminder_time), reminder_minutes = VALUES(reminder_minutes)
                ");
                $stmt->execute([$id, $item_id, $item_title, $type, $requester_name, $requester_email, $requester_phone, $requester_grade, $requester_school, $target_author_name, $target_author_email, $offered_item, $requester_avatar, $message, $status, $date_text, $scheduled_date, $scheduled_time, $scheduled_datetime, $reminder_time, $reminder_minutes]);
                $savedInDb = true;
            } catch (Exception $e) {
                // Intento 2: Con columnas básicas
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO requests (id, item_id, item_title, type, requester_name, requester_email, requester_phone, requester_grade, requester_school, target_author_name, target_author_email, message, status, date_text)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE status = VALUES(status), message = VALUES(message)
                    ");
                    $stmt->execute([$id, $item_id, $item_title, $type, $requester_name, $requester_email, $requester_phone, $requester_grade, $requester_school, $target_author_name, $target_author_email, $message, $status, $date_text]);
                    $savedInDb = true;
                } catch (Exception $e2) {
                    error_log("Error final guardando solicitud en MySQL: " . $e2->getMessage());
                }
            }

            if ($savedInDb) {
                $requests = getJsonRequests($dataFile);
                $existingIdx = array_search($id, array_column($requests, 'id'));
                if ($existingIdx !== false) {
                    $requests[$existingIdx] = array_merge($requests[$existingIdx], $req);
                } else {
                    array_unshift($requests, $req);
                }
                saveJsonRequests($dataFile, $requests);

                echo json_encode(['success' => true, 'request' => $req], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        $requests = getJsonRequests($dataFile);
        array_unshift($requests, $req);
        saveJsonRequests($dataFile, $requests);
        echo json_encode(['success' => true, 'request' => $req], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'confirm_delivery') {
        $id = strval($input['id'] ?? '');
        $confirmedBy = strtolower(trim($input['confirmedBy'] ?? 'donor'));

        $donorConfirmed = false;
        $requesterConfirmed = false;
        $dbReq = null;

        if ($pdo) {
            try {
                ensureRequestsTable($pdo);
                $stmt = $pdo->prepare("SELECT * FROM requests WHERE id = ?");
                $stmt->execute([$id]);
                $dbReq = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($dbReq) {
                    $dbStatus = $dbReq['status'] ?? '';
                    $donorConfirmed = ($dbStatus === 'accepted_donor_confirmed' || $dbStatus === 'completed' || (!empty($dbReq['donor_confirmed']) && $dbReq['donor_confirmed'] != '0') || !empty($dbReq['donorConfirmed']));
                    $requesterConfirmed = ($dbStatus === 'accepted_requester_confirmed' || $dbStatus === 'completed' || (!empty($dbReq['requester_confirmed']) && $dbReq['requester_confirmed'] != '0') || !empty($dbReq['requesterConfirmed']));
                }
            } catch (Exception $e) {
                error_log("Error consultando solicitud en MySQL: " . $e->getMessage());
            }
        }

        $requests = getJsonRequests($dataFile);
        $idx = array_search($id, array_column($requests, 'id'));
        if ($idx !== false) {
            $jsonStatus = $requests[$idx]['status'] ?? '';
            if (!$donorConfirmed) {
                $donorConfirmed = ($jsonStatus === 'accepted_donor_confirmed' || $jsonStatus === 'completed' || !empty($requests[$idx]['donorConfirmed']) || !empty($requests[$idx]['donor_confirmed']));
            }
            if (!$requesterConfirmed) {
                $requesterConfirmed = ($jsonStatus === 'accepted_requester_confirmed' || $jsonStatus === 'completed' || !empty($requests[$idx]['requesterConfirmed']) || !empty($requests[$idx]['requester_confirmed']));
            }
        }

        if ($confirmedBy === 'donor') {
            $donorConfirmed = true;
        } else if ($confirmedBy === 'requester') {
            $requesterConfirmed = true;
        }

        $bothConfirmed = ($donorConfirmed && $requesterConfirmed);
        
        if ($bothConfirmed) {
            $newStatus = 'completed';
        } else if ($donorConfirmed) {
            $newStatus = 'accepted_donor_confirmed';
        } else if ($requesterConfirmed) {
            $newStatus = 'accepted_requester_confirmed';
        } else {
            $newStatus = 'accepted';
        }

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("UPDATE requests SET donor_confirmed = ?, requester_confirmed = ?, status = ? WHERE id = ?");
                $stmt->execute([$donorConfirmed ? 1 : 0, $requesterConfirmed ? 1 : 0, $newStatus, $id]);
            } catch (Exception $e) {
                try {
                    $stmt = $pdo->prepare("UPDATE requests SET status = ? WHERE id = ?");
                    $stmt->execute([$newStatus, $id]);
                } catch (Exception $e2) {
                    error_log("Error actualizando confirmación en MySQL: " . $e2->getMessage());
                }
            }
        }

        if ($idx !== false) {
            $requests[$idx]['donorConfirmed'] = $donorConfirmed;
            $requests[$idx]['donor_confirmed'] = $donorConfirmed ? 1 : 0;
            $requests[$idx]['requesterConfirmed'] = $requesterConfirmed;
            $requests[$idx]['requester_confirmed'] = $requesterConfirmed ? 1 : 0;
            $requests[$idx]['status'] = $newStatus;
            saveJsonRequests($dataFile, $requests);
        } else {
            $entry = $dbReq ? $dbReq : ['id' => $id];
            $entry['id'] = $id;
            $entry['donorConfirmed'] = $donorConfirmed;
            $entry['donor_confirmed'] = $donorConfirmed ? 1 : 0;
            $entry['requesterConfirmed'] = $requesterConfirmed;
            $entry['requester_confirmed'] = $requesterConfirmed ? 1 : 0;
            $entry['status'] = $newStatus;
            $requests[] = $entry;
            saveJsonRequests($dataFile, $requests);
        }

        echo json_encode([
            'success' => true,
            'bothConfirmed' => $bothConfirmed,
            'donorConfirmed' => $donorConfirmed,
            'requesterConfirmed' => $requesterConfirmed,
            'status' => $newStatus,
            'request' => [
                'id' => $id,
                'donorConfirmed' => $donorConfirmed,
                'donor_confirmed' => $donorConfirmed ? 1 : 0,
                'requesterConfirmed' => $requesterConfirmed,
                'requester_confirmed' => $requesterConfirmed ? 1 : 0,
                'status' => $newStatus
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'update_status') {
        $id = strval($input['id'] ?? '');
        $status = $input['status'] ?? 'accepted';

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("UPDATE requests SET status = ? WHERE id = ?");
                $stmt->execute([$status, $id]);
            } catch (Exception $e) {
                error_log("Error actualizando solicitud en MySQL: " . $e->getMessage());
            }
        }

        $requests = getJsonRequests($dataFile);
        $idx = array_search($id, array_column($requests, 'id'));
        if ($idx !== false) {
            $requests[$idx]['status'] = $status;
            saveJsonRequests($dataFile, $requests);
        }
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'delete') {
        $id = strval($input['id'] ?? '');

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("DELETE FROM requests WHERE id = ?");
                $stmt->execute([$id]);
            } catch (Exception $e) {
                error_log("Error borrando solicitud en MySQL: " . $e->getMessage());
            }
        }

        $requests = getJsonRequests($dataFile);
        $requests = array_values(array_filter($requests, function($r) use ($id) {
            return strval($r['id'] ?? '') !== $id;
        }));
        saveJsonRequests($dataFile, $requests);
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['error' => 'Acción no válida'], JSON_UNESCAPED_UNICODE);
}
