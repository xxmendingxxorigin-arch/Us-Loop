/**
 * US-LOOP - Integración Firebase
 * Reemplaza el backend PHP con Firebase Firestore + Authentication
 * Compatible con GitHub Pages (100% JavaScript, sin servidor)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// ============================================================
// CONFIGURACIÓN DEL PROYECTO FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDeBWq0Za_TpMQGwOQSybmQ7pi5IYqiahA",
  authDomain: "us-loop.firebaseapp.com",
  projectId: "us-loop",
  storageBucket: "us-loop.firebasestorage.app",
  messagingSenderId: "320193988814",
  appId: "1:320193988814:web:820ca07af2166a523c289f",
  measurementId: "G-RVMGJ52HYV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window._fbDb = db;
window._fbAuth = auth;

// ============================================================
// HELPER
// ============================================================
function snapshotToArray(snapshot) {
  return snapshot.docs.map(d => ({ _docId: d.id, ...d.data() }));
}

// ============================================================
// CUENTA DEL CREADOR (se sincroniza en Firestore si no existe)
// ============================================================
const CREATOR_EMAIL = 'xxmendingxxorigin@gmail.com';

async function ensureCreatorExists() {
  try {
    const q = query(collection(db, 'users'), where('email', '==', CREATOR_EMAIL));
    const snap = await getDocs(q);
    if (snap.empty) {
      await setDoc(doc(db, 'users', 'usr_1790041333118'), {
        id: 'usr_1790041333118',
        name: 'Juan David Raigoso Gomez',
        email: CREATOR_EMAIL,
        grade: '11 Grado',
        institution: 'Institucion Educativa Fagua sede principal',
        avatar: 'lightning_cosmos',
        completedDonations: 65,
        completedTrades: 65,
        loopPoints: 4077,
        ecoSaved: 245.0,
        bio: 'Creador Principal y Desarrollador de US-Loop! Administrador del campus y guardian de la economia circular escolar.',
        isCreator: true,
        specialRole: 'creator',
        specialTitle: 'El Creador',
        createdAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.warn('No se pudo verificar cuenta del creador:', e);
  }
}

ensureCreatorExists();

// ============================================================
// REEMPLAZAR window.USLoopAPI con Firebase
// ============================================================
window.USLoopAPI = {
  isServer: () => true,

  // ---------- USUARIOS ----------
  async getUsers() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const users = snapshotToArray(snap);
      localStorage.setItem('users', JSON.stringify(users));
      return users;
    } catch (e) {
      console.warn('Error obteniendo usuarios de Firebase:', e);
      return JSON.parse(localStorage.getItem('users') || '[]');
    }
  },

  async getUser(email) {
    if (!email) return null;
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { _docId: snap.docs[0].id, ...snap.docs[0].data() };
      }
    } catch (e) {
      console.warn('Error obteniendo usuario:', e);
    }
    return null;
  },

  async loginUser(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = { ...snap.docs[0].data(), _docId: snap.docs[0].id, isLoggedIn: true };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        let users = JSON.parse(localStorage.getItem('users') || '[]');
        const idx = users.findIndex(u => (u.email || '').toLowerCase() === email.toLowerCase());
        if (idx !== -1) users[idx] = { ...users[idx], ...userData };
        else users.push(userData);
        localStorage.setItem('users', JSON.stringify(users));
        return { success: true, user: userData };
      }
      throw new Error('Perfil de usuario no encontrado.');
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-email') {
        throw new Error('Correo o contrasena incorrectos.');
      }
      throw new Error(e.message || 'Error al iniciar sesion.');
    }
  },

  async signupUser(newUser) {
    const q = query(collection(db, 'users'), where('email', '==', (newUser.email || '').toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error('Ya existe una cuenta con este correo electronico.');
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password);
      await updateProfile(cred.user, { displayName: newUser.name });
      const userData = {
        id: newUser.id || ('usr_' + Date.now()),
        name: newUser.name || '',
        email: (newUser.email || '').toLowerCase(),
        grade: newUser.grade || '10 Grado',
        institution: newUser.institution || 'Institucion Educativa Fagua sede principal',
        avatar: newUser.avatar || 'person',
        completedDonations: 0,
        completedTrades: 0,
        loopPoints: 0,
        ecoSaved: 0.0,
        bio: newUser.bio || '',
        isCreator: false,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', userData.id), userData);
      let localUsers = JSON.parse(localStorage.getItem('users') || '[]');
      localUsers.push({ ...userData, password: newUser.password });
      localStorage.setItem('users', JSON.stringify(localUsers));
      return { success: true, user: userData };
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        throw new Error('Ya existe una cuenta con este correo electronico.');
      }
      throw new Error(e.message || 'Error al crear la cuenta.');
    }
  },

  async updateUserStats(email, type) {
    if (!email) return;
    try {
      const cleanEmail = email.toLowerCase().trim();
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      let donations = 0;
      let trades = 0;
      let loopPoints = 0;
      let ecoSaved = 0.0;

      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const data = userDoc.data();
        donations = (data.completedDonations || 0) + (type === 'donation' ? 1 : 0);
        trades = (data.completedTrades || 0) + (type === 'trade' ? 1 : 0);
        loopPoints = (donations * 25) + (trades * 20);
        ecoSaved = parseFloat(((donations * 3.2) + (trades * 2.5)).toFixed(1));
        await updateDoc(userDoc.ref, { completedDonations: donations, completedTrades: trades, loopPoints, ecoSaved });
      } else {
        const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
        donations = (cu.completedDonations || 0) + (type === 'donation' ? 1 : 0);
        trades = (cu.completedTrades || 0) + (type === 'trade' ? 1 : 0);
        loopPoints = (donations * 25) + (trades * 20);
        ecoSaved = parseFloat(((donations * 3.2) + (trades * 2.5)).toFixed(1));
        const newDocId = 'usr_' + Date.now();
        await setDoc(doc(db, 'users', newDocId), {
          id: newDocId,
          name: cu.name || 'Estudiante',
          email: cleanEmail,
          completedDonations: donations,
          completedTrades: trades,
          loopPoints,
          ecoSaved,
          grade: cu.grade || '10 Grado',
          institution: cu.institution || 'Institución Educativa Fagua sede principal',
          createdAt: serverTimestamp()
        });
      }

      let users = JSON.parse(localStorage.getItem('users') || '[]');
      const idx = users.findIndex(u => (u.email || '').toLowerCase() === cleanEmail);
      if (idx !== -1) {
        users[idx] = { ...users[idx], completedDonations: donations, completedTrades: trades, loopPoints, ecoSaved };
        localStorage.setItem('users', JSON.stringify(users));
      }
      const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if ((cu.email || '').toLowerCase() === cleanEmail) {
        Object.assign(cu, { completedDonations: donations, completedTrades: trades, loopPoints, ecoSaved });
        localStorage.setItem('currentUser', JSON.stringify(cu));
      }
      return { success: true, loopPoints, completedDonations: donations, completedTrades: trades, ecoSaved };
    } catch (e) { console.warn('Error actualizando estadisticas:', e); }
  },

  async deleteUserAccount(email) {
    if (!email) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) await deleteDoc(snap.docs[0].ref);
      const dSnap = await getDocs(query(collection(db, 'donations'), where('authorEmail', '==', email.toLowerCase())));
      for (const d of dSnap.docs) await deleteDoc(d.ref);
      const eSnap = await getDocs(query(collection(db, 'exchanges'), where('authorEmail', '==', email.toLowerCase())));
      for (const e of eSnap.docs) await deleteDoc(e.ref);
      let users = JSON.parse(localStorage.getItem('users') || '[]');
      users = users.filter(u => (u.email || '').toLowerCase() !== email.toLowerCase());
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.removeItem('currentUser');
      if (auth.currentUser) await signOut(auth);
    } catch (e) { console.warn('Error eliminando cuenta:', e); }
  },

  // ---------- DONACIONES ----------
  async getDonations() {
    try {
      const q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const donations = snapshotToArray(snap);
      localStorage.setItem('donations', JSON.stringify(donations));
      return donations;
    } catch (e) {
      console.warn('Error obteniendo donaciones:', e);
      return JSON.parse(localStorage.getItem('donations') || '[]');
    }
  },

  async saveDonation(donation) {
    try {
      const docId = donation.id || ('don_' + Date.now());
      const userEmail = (auth.currentUser?.email || donation.authorEmail || donation.donorEmail || '').toLowerCase();
      const data = { ...donation, id: docId, authorEmail: userEmail, donorEmail: userEmail, status: 'active', createdAt: serverTimestamp() };
      await setDoc(doc(db, 'donations', docId), data);
      let donations = JSON.parse(localStorage.getItem('donations') || '[]');
      donations.unshift(data);
      localStorage.setItem('donations', JSON.stringify(donations));
      return data;
    } catch (e) {
      console.warn('Error guardando donacion:', e);
      let donations = JSON.parse(localStorage.getItem('donations') || '[]');
      donations.unshift(donation);
      localStorage.setItem('donations', JSON.stringify(donations));
      return donation;
    }
  },

  async finishDonation(id) {
    try {
      await deleteDoc(doc(db, 'donations', String(id)));
      let donations = JSON.parse(localStorage.getItem('donations') || '[]');
      donations = donations.filter(d => String(d.id) !== String(id));
      localStorage.setItem('donations', JSON.stringify(donations));
    } catch (e) { console.warn('Error finalizando donacion:', e); }
    return { success: true };
  },

  // ---------- INTERCAMBIOS ----------
  async getExchanges() {
    try {
      const q = query(collection(db, 'exchanges'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const exchanges = snapshotToArray(snap);
      localStorage.setItem('exchanges', JSON.stringify(exchanges));
      return exchanges;
    } catch (e) {
      console.warn('Error obteniendo intercambios:', e);
      return JSON.parse(localStorage.getItem('exchanges') || '[]');
    }
  },

  async saveExchange(exchange) {
    try {
      const docId = exchange.id || ('exc_' + Date.now());
      const userEmail = (auth.currentUser?.email || exchange.authorEmail || exchange.ownerEmail || '').toLowerCase();
      const data = { ...exchange, id: docId, authorEmail: userEmail, ownerEmail: userEmail, status: 'active', createdAt: serverTimestamp() };
      await setDoc(doc(db, 'exchanges', docId), data);
      let exchanges = JSON.parse(localStorage.getItem('exchanges') || '[]');
      exchanges.unshift(data);
      localStorage.setItem('exchanges', JSON.stringify(exchanges));
      return data;
    } catch (e) {
      console.warn('Error guardando intercambio:', e);
      let exchanges = JSON.parse(localStorage.getItem('exchanges') || '[]');
      exchanges.unshift(exchange);
      localStorage.setItem('exchanges', JSON.stringify(exchanges));
      return exchange;
    }
  },

  async completeExchange(id) {
    try {
      await deleteDoc(doc(db, 'exchanges', String(id)));
      let exchanges = JSON.parse(localStorage.getItem('exchanges') || '[]');
      exchanges = exchanges.filter(e => String(e.id) !== String(id));
      localStorage.setItem('exchanges', JSON.stringify(exchanges));
    } catch (e) { console.warn('Error completando intercambio:', e); }
    return { success: true };
  },

  // ---------- SOLICITUDES ----------
  async getRequests() {
    try {
      const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const requests = snapshotToArray(snap);
      localStorage.setItem('tradeRequests', JSON.stringify(requests));
      return requests;
    } catch (e) {
      console.warn('Error obteniendo solicitudes:', e);
      return JSON.parse(localStorage.getItem('tradeRequests') || '[]');
    }
  },

  async saveRequest(request) {
    try {
      const docId = request.id || ('req_' + Date.now());
      const reqEmail = (auth.currentUser?.email || request.requesterEmail || request.requesterContact || '').toLowerCase();
      const data = { ...request, id: docId, requesterEmail: reqEmail, status: request.status || 'pending', createdAt: serverTimestamp() };
      await setDoc(doc(db, 'requests', docId), data);
      let requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
      requests.unshift(data);
      localStorage.setItem('tradeRequests', JSON.stringify(requests));
      return data;
    } catch (e) {
      console.warn('Error guardando solicitud:', e);
      let requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
      requests.unshift(request);
      localStorage.setItem('tradeRequests', JSON.stringify(requests));
      return request;
    }
  },

  async updateRequestStatus(id, status) {
    try {
      await updateDoc(doc(db, 'requests', String(id)), { status });
      let requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
      const idx = requests.findIndex(r => String(r.id) === String(id));
      if (idx !== -1) { requests[idx].status = status; localStorage.setItem('tradeRequests', JSON.stringify(requests)); }
    } catch (e) { console.warn('Error actualizando solicitud:', e); }
    return { success: true };
  },

  async confirmDelivery(id, confirmedBy) {
    try {
      const docRef = doc(db, 'requests', String(id));
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const updates = {};
        if (confirmedBy === 'donor') updates.donorConfirmed = true;
        if (confirmedBy === 'requester') updates.requesterConfirmed = true;
        const donorConfirmed = confirmedBy === 'donor' ? true : (data.donorConfirmed || false);
        const requesterConfirmed = confirmedBy === 'requester' ? true : (data.requesterConfirmed || false);
        const bothConfirmed = donorConfirmed && requesterConfirmed;
        if (bothConfirmed) {
          updates.status = 'completed';
          // Otorgar puntos automáticamente en Firestore a las cuentas involucradas
          const isDonation = (data.itemType || data.type) === 'donation';
          const donorEmail = (data.targetAuthorEmail || '').toLowerCase();
          const reqEmail = (data.requesterEmail || '').toLowerCase();
          if (isDonation) {
            if (donorEmail) await this.updateUserStats(donorEmail, 'donation');
          } else {
            if (donorEmail) await this.updateUserStats(donorEmail, 'trade');
            if (reqEmail) await this.updateUserStats(reqEmail, 'trade');
          }
          if (data.itemId) {
            if (isDonation) await this.finishDonation(data.itemId);
            else await this.completeExchange(data.itemId);
          }
        }
        await updateDoc(docRef, updates);
        let requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
        const idx = requests.findIndex(r => String(r.id) === String(id));
        if (idx !== -1) { Object.assign(requests[idx], updates); localStorage.setItem('tradeRequests', JSON.stringify(requests)); }
        return { success: true, bothConfirmed, request: { ...data, ...updates } };
      }
    } catch (e) { console.warn('Error confirmando entrega:', e); }
    return { success: true, bothConfirmed: false };
  },

  async deleteRequest(id) {
    try {
      await deleteDoc(doc(db, 'requests', String(id)));
      let requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
      requests = requests.filter(r => String(r.id) !== String(id));
      localStorage.setItem('tradeRequests', JSON.stringify(requests));
    } catch (e) { console.warn('Error eliminando solicitud:', e); }
    return { success: true };
  },

  async getRequestsForUser(email, name) {
    const requests = await this.getRequests();
    const em = (email || '').trim().toLowerCase();
    const nm = (name || '').trim().toLowerCase();
    return requests.filter(req => {
      const targetEmail = (req.targetAuthorEmail || '').trim().toLowerCase();
      const targetName = (req.targetAuthorName || '').trim().toLowerCase();
      if (em && targetEmail && em === targetEmail) return true;
      if (nm && targetName && (nm === targetName || nm.includes(targetName) || targetName.includes(nm))) return true;
      return false;
    });
  }
};

// ============================================================
// SINCRONIZAR AUTH STATE
// ============================================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const q = query(collection(db, 'users'), where('email', '==', user.email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userData = { ...snap.docs[0].data(), _docId: snap.docs[0].id, isLoggedIn: true };
        const existing = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (existing.isLoggedIn) {
          localStorage.setItem('currentUser', JSON.stringify({ ...existing, ...userData }));
        }
      }
    } catch (e) { console.warn('Error sincronizando auth state:', e); }
  }
});

console.log('US-Loop Firebase inicializado correctamente');
