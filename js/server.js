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

// Serve static files from the project root
app.use(express.static(path.join(__dirname, '..')));

// Serve your custom index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Optional: SPA fallback for client-side routing (uncomment if needed)
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../index.html'));
// });

// ==================== API CEK KAMAR ====================
app.get('/api/room-availability', async (req, res) => {
    const roomType = req.query.roomType;
    if (!roomType) {
        return res.status(400).json({ available: false, stock: 0 });
    }
    try {
        // Return actual stock count
        const [rows] = await pool.execute(
            'SELECT stok FROM rooms WHERE tipe = ? LIMIT 1',
            [roomType]
        );
        if (rows.length > 0) {
            res.json({ available: rows[0].stok > 0, stock: rows[0].stok });
        } else {
            res.json({ available: false, stock: 0 });
        }
    } catch (err) {
        res.status(500).json({ available: false, stock: 0, error: err.message });
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
            'INSERT INTO pelanggan (username, email, phone_number, password, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [username, email, phone_number, hashedPassword]
        );
        console.log('Insert result:', result); // Debug: log SQL result
        res.json({ success: true, message: 'Pelanggan registered' });
    } catch (err) {
        console.error('Register error:', err); // Debug: log error
        // Add error code and stack for easier debugging
        res.status(500).json({ success: false, message: err.message, code: err.code, stack: err.stack });
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

// ==================== ORDER ROOM ====================
app.post('/api/order-room', async (req, res) => {
    const { username, roomType } = req.body;
    if (!username || !roomType) {
        return res.status(400).json({ success: false, message: 'Missing username or roomType' });
    }
    try {
        // Check if user exists
        const [userRows] = await pool.execute(
            'SELECT * FROM pelanggan WHERE username = ?',
            [username]
        );
        if (userRows.length === 0) {
            return res.status(401).json({ success: false, message: 'User must login first' });
        }

        // Check room availability
        const [roomRows] = await pool.execute(
            'SELECT stok FROM rooms WHERE tipe = ? LIMIT 1',
            [roomType]
        );
        if (roomRows.length === 0 || roomRows[0].stok <= 0) {
            return res.status(400).json({ success: false, message: 'Room not available' });
        }

        // Decrement stock
        await pool.execute(
            'UPDATE rooms SET stok = stok - 1 WHERE tipe = ? AND stok > 0',
            [roomType]
        );

        res.json({ success: true, message: 'Room ordered successfully!' });
    } catch (err) {
        console.error('Order error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});