const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// Dummy data stok kamar (sementara)
const roomStock = {
    Standard: 2,
    Deluxe: 0,
    Executive: 1
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Koneksi ke Railway PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ==================== API CEK KAMAR ====================
app.get('/api/room-availability', (req, res) => {
    const roomType = req.query.roomType;
    if (!roomType || !roomStock.hasOwnProperty(roomType)) {
        return res.status(400).json({ available: false });
    }
    res.json({ available: roomStock[roomType] > 0 });
});

// ==================== REGISTER ====================
app.post('/register', async (req, res) => {
    const { username, email, phone_number, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO login (username, email, phone_number, password, create_at)
             VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
            [username, email, phone_number, hashedPassword]
        );

        res.json({ success: true, message: 'Registrasi berhasil' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal registrasi' });
    }
});

// ==================== LOGIN ====================
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            `SELECT * FROM login WHERE username = $1`,
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
