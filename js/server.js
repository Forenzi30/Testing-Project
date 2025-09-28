require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');
const Xendit = require('xendit-node');

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

// ==================== API CEK KAMAR ====================
app.get('/api/room-availability', async (req, res) => {
    const roomType = req.query.roomType;
    console.log('Room availability check for tipe:', roomType);
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
    // Expecting: username, roomType, first_name, last_name, email, check_in, check_out, adults, childrens
    const {
        username, roomType,
        first_name, last_name, email,
        check_in, check_out, adults, childrens
    } = req.body;
    console.log('Order room request for tipe:', roomType);

    if (!username || !roomType || !first_name || !last_name || !email || !check_in || !check_out || !adults) {
        return res.status(400).json({ success: false, message: 'Missing required order fields' });
    }

    try {
        // Get user (pelanggan) ID
        const [userRows] = await pool.execute(
            'SELECT id FROM pelanggan WHERE username = ?',
            [username]
        );
        if (userRows.length === 0) {
            return res.status(401).json({ success: false, message: 'User must login first' });
        }
        const pelanggan_id = userRows[0].id;

        // Get room ID and check stock
        const [roomRows] = await pool.execute(
            'SELECT id, stok FROM rooms WHERE tipe = ? LIMIT 1',
            [roomType]
        );
        if (roomRows.length === 0 || roomRows[0].stok <= 0) {
            return res.status(400).json({ success: false, message: 'Room not available' });
        }
        const room_id = roomRows[0].id;

        // Decrement stock
        await pool.execute(
            'UPDATE rooms SET stok = stok - 1 WHERE id = ? AND stok > 0',
            [room_id]
        );

        // Insert order into orders table
        const [orderResult] = await pool.execute(
            `INSERT INTO orders
                (pelanggan_id, room_id, first_name, last_name, email, check_in, check_out, adults, childrens, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                pelanggan_id, room_id, first_name, last_name, email,
                check_in, check_out, adults, childrens || 0
            ]
        );

        if (orderResult.affectedRows === 1) {
            res.json({ success: true, message: 'Room ordered successfully!' });
        } else {
            console.error('Order insert failed:', orderResult);
            res.status(500).json({ success: false, message: 'Failed to insert order.' });
        }
    } catch (err) {
        console.error('Order error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== USER PROFILE ================================
app.get('/api/profile', async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ success: false, message: 'No username provided' });
    }
    try {
        const [rows] = await pool.execute(
            'SELECT username, name, email, phone_number, address FROM pelanggan WHERE username = ?',
            [username]
        );
        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.json({ success: false, message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/profile', async (req, res) => {
    const { oldUsername, username, name, email, phone_number, address, password } = req.body;
    if (!oldUsername || !username || !name || !email || !phone_number) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    try {
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await pool.execute(
                'UPDATE pelanggan SET username=?, name=?, email=?, phone_number=?, address=?, password=? WHERE username=?',
                [username, name, email, phone_number, address, hashed, oldUsername]
            );
        } else {
            await pool.execute(
                'UPDATE pelanggan SET username=?, name=?, email=?, phone_number=?, address=? WHERE username=?',
                [username, name, email, phone_number, address, oldUsername]
            );
        }
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== XENDIT PAYMENT ====================
let x, Invoice, invoiceClient;
try {
    x = new Xendit({ secretKey: process.env.PAYMENT_API_KEY });
    ({ Invoice } = x);
    invoiceClient = new Invoice({});
} catch (err) {
    console.error('Xendit initialization error:', err);
}

app.post('/api/create-invoice', async (req, res) => {
    try {
        // Get order data from request body
        const { externalID, payerEmail, description, amount } = req.body;
        if (!externalID || !payerEmail || !description || !amount) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const invoice = await invoiceClient.createInvoice({
            externalID,
            payerEmail,
            description,
            amount,
        });
        res.json(invoice); // invoice.invoice_url gives payment link
    } catch (err) {
        res.status(500).json({ message: err.message, error: err });
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});