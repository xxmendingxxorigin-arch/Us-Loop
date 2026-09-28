/**
 * US-LOOP - Servidor de Desarrollo Local y Sincronización
 * Proporciona servidor web y API REST local en tiempo real con persistencia
 * en los archivos JSON de /data/ para sincronización entre diferentes navegadores.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers de lectura y escritura de JSON
function readJsonFile(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || '[]') || defaultValue;
  } catch (err) {
    console.error(`Error leyendo ${filename}:`, err.message);
    return defaultValue;
  }
}

function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error guardando ${filename}:`, err.message);
    return false;
  }
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Helper para parsear body JSON de peticiones POST
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Soporte CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // ==========================================
  // RUTAS DE LA API (Compatibilidad con PHP)
  // ==========================================

  // 1. PING API
  if (pathname === '/api/ping.php' || pathname === '/api/ping') {
    return sendJson(res, 200, {
      server: true,
      database: 'json_node_local',
      time: new Date().toISOString(),
      status: 'ok'
    });
  }

  // 2. AUTH API (Login)
  if (pathname === '/api/auth.php' || pathname === '/api/auth') {
    if (method === 'POST') {
      const input = await parseBody(req);
      const email = (input.email || '').trim().toLowerCase();
      const password = input.password || '';

      if (!email || !password) {
        return sendJson(res, 400, { error: 'Correo y contraseña requeridos' });
      }

      const users = readJsonFile('users.json', []);
      const user = users.find((u) => (u.email || '').trim().toLowerCase() === email);

      if (!user) {
        return sendJson(res, 404, { error: 'Usuario no encontrado' });
      }

      if ((user.password || '') !== password) {
        return sendJson(res, 401, { error: 'Contraseña incorrecta' });
      }

      const isCreatorEmail = email === 'xxmendingxxorigin@gmail.com';
      if (isCreatorEmail) {
        user.isCreator = true;
        user.specialRole = 'creator';
        user.specialTitle = 'El Creador';
      }

      const safeUser = { ...user, isLoggedIn: true };
      delete safeUser.password;
      return sendJson(res, 200, { success: true, user: safeUser });
    }
    return sendJson(res, 200, { status: 'auth_service_ready' });
  }

  // 3. USERS API (Signup, Update stats, Update profile, Delete)
  if (pathname === '/api/users.php' || pathname === '/api/users') {
    if (method === 'GET') {
      const users = readJsonFile('users.json', []);
      const safeUsers = users.map((u) => {
        const safe = { ...u };
        if ((safe.email || '').trim().toLowerCase() === 'xxmendingxxorigin@gmail.com') {
          safe.isCreator = true;
          safe.specialRole = 'creator';
          safe.specialTitle = 'El Creador';
        }
        delete safe.password;
        return safe;
      });
      return sendJson(res, 200, safeUsers);
    }

    if (method === 'POST') {
      const input = await parseBody(req);
      const action = input.action || (input.password ? 'signup' : 'update');

      // Registro
      if (action === 'signup' || input.password) {
        const userData = input.user && typeof input.user === 'object' ? input.user : input;
        const email = (userData.email || '').trim().toLowerCase();
        const password = userData.password || '';

        if (!email || !password) {
          return sendJson(res, 400, { error: 'Correo y contraseña requeridos' });
        }

        const users = readJsonFile('users.json', []);
        if (users.some((u) => (u.email || '').trim().toLowerCase() === email)) {
          return sendJson(res, 400, { error: 'Ya existe una cuenta con este correo electrónico.' });
        }

        const isCreatorEmail = email === 'xxmendingxxorigin@gmail.com';

        const newUser = {
          id: userData.id || ('usr_' + Date.now()),
          name: (userData.name || (isCreatorEmail ? 'Juan David Raigoso Gomez' : 'Estudiante')).trim(),
          email: email,
          password: password,
          grade: userData.grade || '11° Grado',
          institution: userData.institution || 'Institucion Educativa Fagua sede principal',
          avatar: userData.avatar || (isCreatorEmail ? '⚡🌌' : '👨‍🎓'),
          bio: userData.bio || (isCreatorEmail ? '¡Creador Principal y Desarrollador de US-Loop! 👑🛠️ Administrador del campus y guardián de la economía circular escolar.' : ''),
          completedDonations: Number(userData.completedDonations !== undefined ? userData.completedDonations : 0),
          completedTrades: Number(userData.completedTrades !== undefined ? userData.completedTrades : 0),
          loopPoints: Number(userData.loopPoints !== undefined ? userData.loopPoints : (isCreatorEmail ? 3600 : 0)),
          ecoSaved: Number(userData.ecoSaved !== undefined ? userData.ecoSaved : 0),
          specialRole: isCreatorEmail ? 'creator' : (userData.specialRole || 'student'),
          isCreator: isCreatorEmail ? true : (userData.isCreator || false),
          specialTitle: isCreatorEmail ? 'El Creador' : (userData.specialTitle || ''),
          created_at: new Date().toISOString()
        };

        users.push(newUser);
        writeJsonFile('users.json', users);

        const safeUser = { ...newUser };
        delete safeUser.password;
        return sendJson(res, 200, { success: true, user: safeUser });
      }

      // Actualizar estadísticas
      if (action === 'update_stats') {
        const email = (input.email || '').trim().toLowerCase();
        const type = input.type || 'donation';
        const users = readJsonFile('users.json', []);
        const idx = users.findIndex((u) => (u.email || '').trim().toLowerCase() === email);

        if (idx === -1) {
          return sendJson(res, 404, { error: 'Usuario no encontrado' });
        }

        let don = Number(users[idx].completedDonations || 0);
        let tra = Number(users[idx].completedTrades || 0);

        if (type === 'donation') don++;
        else if (type === 'trade') tra++;

        users[idx].completedDonations = don;
        users[idx].completedTrades = tra;
        users[idx].loopPoints = (don * 25) + (tra * 20);
        users[idx].ecoSaved = parseFloat(((don * 3.2) + (tra * 2.5)).toFixed(1));

        writeJsonFile('users.json', users);

        const safeUser = { ...users[idx] };
        delete safeUser.password;
        return sendJson(res, 200, { success: true, user: safeUser });
      }

      // Actualizar perfil
      if (action === 'update_profile') {
        const email = (input.email || '').trim().toLowerCase();
        const userData = input.user && typeof input.user === 'object' ? input.user : input;
        const users = readJsonFile('users.json', []);
        const idx = users.findIndex((u) => (u.email || '').trim().toLowerCase() === email);

        if (idx === -1) {
          return sendJson(res, 404, { error: 'Usuario no encontrado' });
        }

        if (userData.name) users[idx].name = userData.name.trim();
        if (userData.grade) users[idx].grade = userData.grade;
        if (userData.institution) users[idx].institution = userData.institution;
        if (userData.avatar) users[idx].avatar = userData.avatar;
        if (userData.bio !== undefined) users[idx].bio = userData.bio;
        if (userData.isCreator !== undefined) users[idx].isCreator = userData.isCreator;
        if (userData.specialRole !== undefined) users[idx].specialRole = userData.specialRole;
        if (userData.specialTitle !== undefined) users[idx].specialTitle = userData.specialTitle;
        if (userData.consecrationApprovedByCreator !== undefined) users[idx].consecrationApprovedByCreator = userData.consecrationApprovedByCreator;
        if (userData.consecrationApprovedAt !== undefined) users[idx].consecrationApprovedAt = userData.consecrationApprovedAt;
        if (userData.consecrationApprovedBy !== undefined) users[idx].consecrationApprovedBy = userData.consecrationApprovedBy;
        if (userData.diosDelLoopClaimed !== undefined) users[idx].diosDelLoopClaimed = userData.diosDelLoopClaimed;
        if (userData.diosDelLoopClaimDate !== undefined) users[idx].diosDelLoopClaimDate = userData.diosDelLoopClaimDate;
        if (userData.diosDeLaUnionClaimed !== undefined) {
          users[idx].diosDelLoopClaimed = userData.diosDeLaUnionClaimed;
          users[idx].diosDeLaUnionClaimed = userData.diosDeLaUnionClaimed;
        }
        if (userData.verdaderoLoopRequested !== undefined) users[idx].verdaderoLoopRequested = userData.verdaderoLoopRequested;
        if (userData.verdaderoLoopRequestedAt !== undefined) users[idx].verdaderoLoopRequestedAt = userData.verdaderoLoopRequestedAt;
        if (userData.verdaderoLoopApproved !== undefined) users[idx].verdaderoLoopApproved = userData.verdaderoLoopApproved;
        if (userData.verdaderoLoopApprovedAt !== undefined) users[idx].verdaderoLoopApprovedAt = userData.verdaderoLoopApprovedAt;
        if (userData.verdaderoLoopApprovedBy !== undefined) users[idx].verdaderoLoopApprovedBy = userData.verdaderoLoopApprovedBy;
        if (userData.loopPoints !== undefined) users[idx].loopPoints = Number(userData.loopPoints);
        if (userData.completedDonations !== undefined) users[idx].completedDonations = Number(userData.completedDonations);
        if (userData.completedTrades !== undefined) users[idx].completedTrades = Number(userData.completedTrades);
        if (userData.ecoSaved !== undefined) users[idx].ecoSaved = Number(userData.ecoSaved);

        writeJsonFile('users.json', users);

        const safeUser = { ...users[idx] };
        delete safeUser.password;
        return sendJson(res, 200, { success: true, user: safeUser });
      }

      // Aprobar Consagración Divina de Nivel 25 (Exclusivo para El Creador)
      if (action === 'approve_consecration') {
        const targetUserId = input.targetUserId;
        const targetEmail = (input.targetEmail || '').trim().toLowerCase();

        const users = readJsonFile('users.json', []);
        const targetIdx = users.findIndex(u => (targetUserId && u.id === targetUserId) || ((u.email || '').trim().toLowerCase() === targetEmail));

        if (targetIdx === -1) {
          return sendJson(res, 404, { error: 'Candidato no encontrado' });
        }

        users[targetIdx].consecrationApprovedByCreator = true;
        users[targetIdx].consecrationApprovedAt = new Date().toISOString();
        users[targetIdx].consecrationApprovedBy = 'El Creador (Juan David Raigoso Gomez)';

        writeJsonFile('users.json', users);

        const safeTargetUser = { ...users[targetIdx] };
        delete safeTargetUser.password;
        return sendJson(res, 200, { success: true, message: 'Consagración aprobada exitosamente', user: safeTargetUser });
      }

      // Solicitar logro "El Verdadero Loop" (para usuarios consagrados de Nivel 25)
      if (action === 'request_verdadero_loop') {
        const email = (input.email || '').trim().toLowerCase();
        const userId = input.userId;
        const users = readJsonFile('users.json', []);
        const idx = users.findIndex(u => (userId && u.id === userId) || ((u.email || '').trim().toLowerCase() === email));

        if (idx === -1) {
          return sendJson(res, 404, { error: 'Usuario no encontrado' });
        }

        users[idx].verdaderoLoopRequested = true;
        users[idx].verdaderoLoopRequestedAt = new Date().toISOString();

        writeJsonFile('users.json', users);

        const safeUser = { ...users[idx] };
        delete safeUser.password;
        return sendJson(res, 200, { success: true, message: 'Solicitud de El Verdadero Loop enviada', user: safeUser });
      }

      // Conceder logro "El Verdadero Loop" (Exclusivo para El Creador)
      if (action === 'approve_verdadero_loop') {
        const targetUserId = input.targetUserId;
        const targetEmail = (input.targetEmail || '').trim().toLowerCase();

        const users = readJsonFile('users.json', []);
        const targetIdx = users.findIndex(u => (targetUserId && u.id === targetUserId) || ((u.email || '').trim().toLowerCase() === targetEmail));

        if (targetIdx === -1) {
          return sendJson(res, 404, { error: 'Usuario no encontrado' });
        }

        users[targetIdx].verdaderoLoopApproved = true;
        users[targetIdx].verdaderoLoopApprovedAt = new Date().toISOString();
        users[targetIdx].verdaderoLoopApprovedBy = 'El Creador (Juan David Raigoso Gomez)';

        writeJsonFile('users.json', users);

        const safeTargetUser = { ...users[targetIdx] };
        delete safeTargetUser.password;
        return sendJson(res, 200, { success: true, message: 'Logro «El Verdadero Loop» concedido con éxito', user: safeTargetUser });
      }

      // Eliminar cuenta
      if (action === 'delete_user') {
        const email = (input.email || '').trim().toLowerCase();
        let users = readJsonFile('users.json', []);
        users = users.filter((u) => (u.email || '').trim().toLowerCase() !== email);
        writeJsonFile('users.json', users);

        let donations = readJsonFile('donations.json', []);
        donations = donations.filter((d) => (d.authorEmail || d.donorEmail || '').trim().toLowerCase() !== email);
        writeJsonFile('donations.json', donations);

        let exchanges = readJsonFile('exchanges.json', []);
        exchanges = exchanges.filter((e) => (e.authorEmail || e.ownerEmail || '').trim().toLowerCase() !== email);
        writeJsonFile('exchanges.json', exchanges);

        let requests = readJsonFile('requests.json', []);
        requests = requests.filter((r) => (r.targetAuthorEmail || '').trim().toLowerCase() !== email && (r.requesterEmail || '').trim().toLowerCase() !== email);
        writeJsonFile('requests.json', requests);

        return sendJson(res, 200, { success: true, message: 'Cuenta eliminada' });
      }

      return sendJson(res, 400, { error: 'Acción no reconocida' });
    }
  }

  // 4. DONATIONS API
  if (pathname === '/api/donations.php' || pathname === '/api/donations') {
    if (method === 'GET') {
      const donations = readJsonFile('donations.json', []);
      return sendJson(res, 200, donations);
    }

    if (method === 'POST') {
      const input = await parseBody(req);
      const action = input.action || 'save';
      let donations = readJsonFile('donations.json', []);

      if (action === 'save') {
        const donation = input.donation || input;
        donations.unshift(donation);
        writeJsonFile('donations.json', donations);
        return sendJson(res, 200, { success: true, donation });
      }

      if (action === 'finish') {
        const id = input.id;
        donations = donations.filter((d) => String(d.id) !== String(id));
        writeJsonFile('donations.json', donations);
        return sendJson(res, 200, { success: true });
      }
    }
  }

  // 5. EXCHANGES API
  if (pathname === '/api/exchanges.php' || pathname === '/api/exchanges') {
    if (method === 'GET') {
      const exchanges = readJsonFile('exchanges.json', []);
      return sendJson(res, 200, exchanges);
    }

    if (method === 'POST') {
      const input = await parseBody(req);
      const action = input.action || 'save';
      let exchanges = readJsonFile('exchanges.json', []);

      if (action === 'save') {
        const exchange = input.exchange || input;
        exchanges.unshift(exchange);
        writeJsonFile('exchanges.json', exchanges);
        return sendJson(res, 200, { success: true, exchange });
      }

      if (action === 'complete') {
        const id = input.id;
        exchanges = exchanges.filter((e) => String(e.id) !== String(id));
        writeJsonFile('exchanges.json', exchanges);
        return sendJson(res, 200, { success: true });
      }
    }
  }

  // 6. REQUESTS API
  if (pathname === '/api/requests.php' || pathname === '/api/requests') {
    if (method === 'GET') {
      const requests = readJsonFile('requests.json', []);
      return sendJson(res, 200, requests);
    }

    if (method === 'POST') {
      const input = await parseBody(req);
      const action = input.action || 'save';
      let requests = readJsonFile('requests.json', []);

      if (action === 'save') {
        const request = input.request || input;
        requests.unshift(request);
        writeJsonFile('requests.json', requests);
        return sendJson(res, 200, { success: true, request });
      }

      if (action === 'update_status') {
        const { id, status } = input;
        const idx = requests.findIndex((r) => String(r.id) === String(id));
        if (idx !== -1) {
          requests[idx].status = status;
          writeJsonFile('requests.json', requests);
        }
        return sendJson(res, 200, { success: true });
      }

      if (action === 'schedule') {
        const { id, scheduled_date, scheduled_time, scheduled_datetime, reminder_time, reminder_minutes } = input;
        const idx = requests.findIndex((r) => String(r.id) === String(id));
        if (idx !== -1) {
          requests[idx].scheduled_date = scheduled_date || '';
          requests[idx].scheduled_time = scheduled_time || '';
          requests[idx].scheduled_datetime = scheduled_datetime || '';
          requests[idx].reminder_time = reminder_time || '';
          requests[idx].reminder_minutes = reminder_minutes || 15;
          writeJsonFile('requests.json', requests);
        }
        return sendJson(res, 200, { success: true });
      }

      if (action === 'confirm_exchange') {
        const { id, role } = input;
        const idx = requests.findIndex((r) => String(r.id) === String(id));
        if (idx !== -1) {
          if (role === 'donor' || role === 'owner') requests[idx].donor_confirmed = 1;
          else if (role === 'requester') requests[idx].requester_confirmed = 1;
          writeJsonFile('requests.json', requests);
        }
        return sendJson(res, 200, { success: true });
      }

      if (action === 'delete') {
        const id = input.id;
        requests = requests.filter((r) => String(r.id) !== String(id));
        writeJsonFile('requests.json', requests);
        return sendJson(res, 200, { success: true });
      }
    }
  }

  // ==========================================
  // SERVIR ARCHIVOS ESTÁTICOS
  // ==========================================
  let safePath = pathname === '/' ? '/index.html' : pathname;
  // Prevenir Directory Traversal
  safePath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Acceso denegado');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Archivo no encontrado');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  console.log(`====================================================`);
  console.log(`🚀 US-LOOP Servidor Local y de Red Activo`);
  console.log(`💻 En tu computadora: http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`📱 En tu teléfono (mismo Wi-Fi): http://${ip}:${PORT}`);
  });
  console.log(`💾 Base de datos local: Archivos JSON en /data/`);
  console.log(`====================================================`);
});
