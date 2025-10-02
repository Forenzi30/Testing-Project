require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');
const midtransClient = require('midtrans-client');

const app = express();
const PORT = process.env.PORT || 3030;

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
    const { username, name, password, email, phone_number } = req.body;
    console.log('Register attempt:', req.body); // Debug: log data masuk
    if (!username || !name || !password || !email || !phone_number) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO pelanggan (username, name, email, phone_number, password, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [username, name, email, phone_number, hashedPassword]
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
    // Expecting: username, roomType, name, email, check_in, check_out, adults, childrens
    const {
        username, roomType,
        name, email,
        check_in, check_out, adults, childrens
    } = req.body;
    console.log('Order room request for tipe:', roomType);

    if (!username || !roomType || !name || !email || !check_in || !check_out || !adults) {
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

        // Generate order ID for Midtrans
        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Insert order into orders table with Midtrans order ID
        const [orderResult] = await pool.execute(
            `INSERT INTO orders
                (pelanggan_id, room_id, name, email, check_in, check_out, adults, childrens, midtrans_order_id, payment_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
                pelanggan_id, room_id, name, email,
                check_in, check_out, adults, childrens || 0, orderId
            ]
        );

        if (orderResult.affectedRows === 1) {
            res.json({ 
                success: true, 
                message: 'Room ordered successfully!',
                order_id: orderId
            });
        } else {
            console.error('Order insert failed:', orderResult);
            res.status(500).json({ success: false, message: 'Failed to insert order.' });
        }
    } catch (err) {
        console.error('Order error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== ORDER HISTORY ================================
// Get user's order history
app.get('/api/order-history', async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ success: false, message: 'No username provided' });
    }
    try {
        const [rows] = await pool.execute(
            `SELECT o.*, r.tipe as room_type, r.harga as room_price, p.name as customer_name
             FROM orders o 
             JOIN rooms r ON o.room_id = r.id 
             JOIN pelanggan p ON o.pelanggan_id = p.id 
             WHERE p.username = ? 
             ORDER BY o.created_at DESC`,
            [username]
        );
        res.json({ success: true, orders: rows });
    } catch (err) {
        console.error('Order history error:', err);
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

// ==================== MIDTRANS PAYMENT ====================
// Initialize Midtrans client
const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});


// ==================== MIDTRANS PAYMENT ENDPOINTS ====================
// Create Midtrans payment token
app.post('/api/midtrans/create-token', async (req, res) => {
    try {
        const { order_id, gross_amount, customer_details, item_details } = req.body;
        
        if (!order_id || !gross_amount || !customer_details || !item_details) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: order_id, gross_amount, customer_details, item_details' 
            });
        }

        const parameter = {
            transaction_details: {
                order_id: order_id,
                gross_amount: gross_amount
            },
            customer_details: customer_details,
            item_details: item_details,
            credit_card: {
                secure: true
            }
        };

        const transaction = await snap.createTransaction(parameter);
        res.json({
            success: true,
            token: transaction.token,
            redirect_url: transaction.redirect_url
        });
    } catch (error) {
        console.error('Midtrans create token error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create payment token',
            error: error.message 
        });
    }
});

// Get Midtrans payment status
app.get('/api/midtrans/status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const transaction = await snap.transaction.status(orderId);
        res.json({
            success: true,
            transaction: transaction
        });
    } catch (error) {
        console.error('Midtrans status check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to check payment status',
            error: error.message 
        });
    }
});

// Midtrans notification handler (webhook)
app.post('/api/midtrans/notification', express.json(), async (req, res) => {
    try {
        const notification = req.body;
        console.log('Midtrans notification received:', notification);
        
        // Verify the notification signature if needed
        // You can add signature verification here for security
        
        // Update order status based on notification
        const { order_id, transaction_status, fraud_status, gross_amount, payment_type } = notification;
        
        let paymentStatus = 'pending';
        
        if (transaction_status === 'capture') {
            if (fraud_status === 'challenge') {
                console.log('Payment challenged:', order_id);
                paymentStatus = 'challenged';
            } else if (fraud_status === 'accept') {
                console.log('Payment accepted:', order_id);
                paymentStatus = 'paid';
            }
        } else if (transaction_status === 'settlement') {
            console.log('Payment settled:', order_id);
            paymentStatus = 'completed';
        } else if (transaction_status === 'cancel' || 
                   transaction_status === 'deny' || 
                   transaction_status === 'expire') {
            console.log('Payment failed:', order_id, transaction_status);
            paymentStatus = 'failed';
        } else if (transaction_status === 'pending') {
            console.log('Payment pending:', order_id);
            paymentStatus = 'pending';
        }
        
        // Update order status in database
        try {
            await pool.execute(
                'UPDATE orders SET payment_status = ?, payment_type = ?, gross_amount = ? WHERE midtrans_order_id = ?',
                [paymentStatus, payment_type || 'unknown', gross_amount || 0, order_id]
            );
            console.log(`Order ${order_id} status updated to: ${paymentStatus}`);
        } catch (dbError) {
            console.error('Database update error:', dbError);
        }
        
        res.status(200).json({ message: 'Notification received' });
    } catch (error) {
        console.error('Midtrans notification error:', error);
        res.status(500).json({ message: 'Notification processing failed' });
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});