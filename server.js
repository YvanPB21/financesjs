require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- Firebase Admin Initialization ---
let serviceAccount;

if (process.env.FIREBASE_CREDENTIALS) {
    // Carga desde variable de entorno (JSON string)
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    } catch (e) {
        console.error('Error al parsear FIREBASE_CREDENTIALS:', e.message);
        process.exit(1);
    }
} else {
    // Carga desde archivo local (Desarrollo)
    const serviceAccountPath = process.env.FIREBASE_KEY_PATH;
    if (!serviceAccountPath) {
        console.error('ERROR: FIREBASE_KEY_PATH o FIREBASE_CREDENTIALS no definida.');
        process.exit(1);
    }
    try {
        serviceAccount = require(path.isAbsolute(serviceAccountPath) ? serviceAccountPath : path.resolve(__dirname, serviceAccountPath));
    } catch (error) {
        console.error('Error al cargar archivo de credenciales:', error.message);
        process.exit(1);
    }
}

const databaseId = process.env.DATABASE_ID || '(default)';

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseId: databaseId
    });
    console.log(`Firebase Admin inicializado para el proyecto: ${serviceAccount.project_id}`);
} catch (error) {
    console.error('Error al inicializar Firebase Admin:', error);
    process.exit(1);
}

const db = admin.firestore();

// --- API Endpoints ---

// Budget (Net Income and Fixed Expenses) - GLOBAL
app.get('/api/budget', async (req, res) => {
    try {
        const doc = await db.collection('settings').doc('budget').get();
        if (!doc.exists) {
            return res.json({ netIncome: 0, fixedExpenses: [] });
        }
        res.json(doc.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/budget', async (req, res) => {
    try {
        await db.collection('settings').doc('budget').set({
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Loans CRUD (Enhanced with TEA and Installments)
app.get('/api/loans', async (req, res) => {
    try {
        const snapshot = await db.collection('loans').orderBy('date', 'desc').get();
        const loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(loans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/loans', async (req, res) => {
    try {
        const data = {
            ...req.body,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('loans').add(data);
        res.status(201).json({ id: docRef.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/loans/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('loans').doc(id).update({
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/loans/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('loans').doc(id).delete();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Security Settings (PIN)
app.get('/api/settings/security', async (req, res) => {
    try {
        const doc = await db.collection('settings').doc('security').get();
        if (!doc.exists) {
            return res.json({ pinEnabled: false });
        }
        const data = doc.data();
        res.json({ pinEnabled: !!data.pin });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settings/security/verify', async (req, res) => {
    try {
        const { pin } = req.body;
        const doc = await db.collection('settings').doc('security').get();
        if (!doc.exists || !doc.data().pin) {
            return res.json({ success: true }); // No PIN set
        }
        const isValid = doc.data().pin === pin;
        res.json({ success: isValid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settings/security/setup', async (req, res) => {
    try {
        const { pin, enabled } = req.body;
        if (enabled === false) {
            await db.collection('settings').doc('security').update({ pin: null });
        } else {
            await db.collection('settings').doc('security').set({
                pin: pin,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Fallback for SPA (solo para rutas que no son de API)
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor de finanzas corriendo en http://localhost:${PORT}`);
});
