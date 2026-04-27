/**
 * Abhaya Backend Server
 *
 * Handles secure SOS SMS sending via Twilio.
 * Keeps API credentials server-side (never exposed to the app).
 *
 * Endpoints:
 *  POST /api/sos/send  — Send SOS SMS to emergency contacts
 *  GET  /health        — Health check
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Direct Artifact Storage ──────────────────────────────────────────────────

const UPLOADS_DIR = path.join(__dirname, 'uploads', 'evidence');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'evidence-' + uniqueSuffix + '.m4a');
    },
});

const upload = multer({ storage: storage });

// ─── Twilio Client ────────────────────────────────────────────────────────────

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors()); // Allow requests from the React Native app

// Global Logger for Debugging
app.use((req, res, next) => {
    console.log(`[Server] 📨 Incoming: ${req.method} ${req.url}`);
    next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Abhaya Backend', timestamp: new Date().toISOString() });
});

// ─── SOS SMS Endpoint ─────────────────────────────────────────────────────────

/**
 * POST /api/sos/send
 *
 * Sends an SOS SMS to all provided emergency contacts.
 *
 * Body:
 *  {
 *    "message": "🆘 EMERGENCY! I need help...",
 *    "contacts": ["+919326786943", "+91XXXXXXXXXX"]
 *  }
 */
app.post('/api/sos/send', async (req, res) => {
    const { message, contacts } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'message is required' });
    }
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ success: false, error: 'contacts array is required' });
    }

    console.log(`[SOS] Sending to ${contacts.length} contact(s)...`);

    // Send to all contacts in parallel
    const results = await Promise.allSettled(
        contacts.map((to) =>
            twilioClient.messages.create({
                body: message,
                messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                to: to,
            })
        )
    );

    // Count successes and failures
    let sent = 0;
    let failed = 0;
    const errors = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            sent++;
            console.log(`[SOS] ✅ Sent to ${contacts[index]} — SID: ${result.value.sid}`);
        } else {
            failed++;
            const errMsg = result.reason?.message || 'Unknown error';
            errors.push({ contact: contacts[index], error: errMsg });
            console.error(`[SOS] ❌ Failed to send to ${contacts[index]}: ${errMsg}`);
        }
    });

    // Return result
    const statusCode = sent > 0 ? 200 : 500;
    return res.status(statusCode).json({
        success: sent > 0,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
    });
});

// ─── Evidence Upload Endpoint ─────────────────────────────────────────────────

/**
 * POST /api/evidence/upload
 * 
 * Receives multipart audio chunks (m4a) from the stealth recorder.
 */
app.post('/api/evidence/upload', upload.single('evidence'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file provided' });
    }

    console.log(`[Evidence] 🎙️ Received evidence chunk: ${req.file.filename} (${req.file.size} bytes)`);
    
    return res.status(200).json({ 
        success: true, 
        message: 'Evidence securely stored',
        filename: req.file.filename 
    });
});

// ─── Serve Evidence (Optional for Dev Viewing) ────────────────────────────────

app.use('/evidence', express.static(UPLOADS_DIR));

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n🚀 Abhaya Backend running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   SOS:    http://localhost:${PORT}/api/sos/send`);
    console.log(`\n   Twilio Account: ${process.env.TWILIO_ACCOUNT_SID}`);
    console.log(`   From Number:    ${process.env.TWILIO_FROM_NUMBER}\n`);
});
