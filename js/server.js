require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // harus ada sebelum endpoint

// Serve static files
app.use(express.static("public"));

// Serve your custom index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

// ==================== API CEK KAMAR ====================
app.get('/api/room-availability', async (req, res) => {
    const roomType = req.query.roomType;
    if (!roomType) {
        return res.status(400).json({ available: false });
    }
    try {
        // MySQL query
        const [rows] = await pool.execute(
            'SELECT stock FROM rooms WHERE type = ? LIMIT 1',
            [roomType]
        );
        if (rows.length > 0 && rows[0].stock > 0) {
            res.json({ available: true });
        } else {
            res.json({ available: false });
        }
    } catch (err) {
        res.status(500).json({ available: false, error: err.message });
    }
});

// ==================== REGISTER ====================
// Endpoint register pelanggan
app.post('/api/register', async (req, res) => {
    const { username, password, email, phone_number } = req.body;
    console.log('Register attempt:', req.body); // Debug: log data masuk
    if (!username || !password || !email || !phone_number) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO pelanggan (username, email, phone_number, password, create_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [username, email, phone_number, hashedPassword]
        );
        res.json({ success: true, message: 'Pelanggan registered' });
    } catch (err) {
        console.error('Register error:', err); // Debug: log error
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== LOGIN ====================
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM pelanggan WHERE username = ?`,
            [username]
        );
        if (rows.length === 0) {
            return res.json({ success: false, message: 'Username tidak ditemukan' });
        }
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.json({ success: false, message: 'Password salah' });
        }
        res.json({ success: true, message: 'Login berhasil' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal login' });
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});