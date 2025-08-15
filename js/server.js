require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // harus ada sebelum endpoint

// ==================== API CEK KAMAR ====================
app.get('/api/room-availability', async (req, res) => {
    const roomType = req.query.roomType;
    if (!roomType) {
        return res.status(400).json({ available: false });
    }
    try {
        // Contoh query: sesuaikan nama tabel/kolom dengan database Anda
        const result = await pool.query(
            'SELECT stock FROM rooms WHERE type = $1 LIMIT 1',
            [roomType]
        );
        if (result.rows.length > 0 && result.rows[0].stock > 0) {
            res.json({ available: true });
        } else {
            res.json({ available: false });
        }
    } catch (err) {
        res.status(500).json({ available: false, error: err.message });
    }
});

// ==================== REGISTER ====================
app.post('/register', async (req, res) => {
    const { username, email, phone, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO pelanggan (username, email, phone, password, create_at)
             VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
            [username, email, phone, hashedPassword]
        );

        res.json({ success: true, message: 'Registrasi berhasil' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal registrasi' });
    }
});

// Endpoint register pelanggan
app.post('/api/register', async (req, res) => {
    const { username, password, email, phone } = req.body;
    console.log('Register attempt:', req.body); // Debug: log data masuk
    if (!username || !password || !email || !phone) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO pelanggan (username, email, phone, password, create_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
            [username, email, phone, hashedPassword]
        );
        console.log('Inserted pelanggan:', result.rows[0]); // Debug: log hasil insert
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
        const result = await pool.query(
            `SELECT * FROM pelanggan WHERE username = $1`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.json({ success: false, message: 'Username tidak ditemukan' });
        }

        const user = result.rows[0];
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
