require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
const bcrypt = require('bcrypt');
const path = require('path');
const midtransClient = require('midtrans-client');
const { sendOrderConfirmation } = require('./emailService');

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
            'SELECT stock FROM rooms WHERE roomType = ? LIMIT 1',
            [roomType]
        );
        if (rows.length > 0) {
            res.json({ available: rows[0].stock > 0, stock: rows[0].stock });
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
        // Debug log
        console.log('User object:', user);
        console.log('user.is_admin:', user.is_admin);
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.json({ success: false, message: 'Password salah' });
        }
        // Use == to allow string or number
        res.json({ success: true, message: 'Login berhasil', is_admin: user.is_admin == 1 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Gagal login' });
    }
});

// ==================== ORDER ROOM ====================
app.post('/api/order-room', async (req, res) => {
    // Expecting: username (optional), roomType, name, email, check_in, check_out, adults, childrens
    const {
        username, roomType,
        name, email, address, phone_number,
        check_in, check_out, adults, childrens
    } = req.body;
    console.log('Order room request for tipe:', roomType);

    // Validate required fields (username is now optional for guest orders)
    if (!roomType || !name || !email || !check_in || !check_out || !adults) {
        return res.status(400).json({ success: false, message: 'Missing required order fields' });
    }

    try {
        let pelanggan_id = null;

        // Get user (pelanggan) ID if username is provided (logged in user)
        if (username) {
            const [userRows] = await pool.execute(
                'SELECT id FROM pelanggan WHERE username = ?',
                [username]
            );
            if (userRows.length > 0) {
                pelanggan_id = userRows[0].id;
            }
        }
        // If no username or user not found, pelanggan_id stays null (guest order)

        // Get room ID and check stock
        const [roomRows] = await pool.execute(
            'SELECT id, stock, harga FROM rooms WHERE roomType = ? LIMIT 1',
            [roomType]
        );
        if (roomRows.length === 0 || roomRows[0].stock <= 0) {
            return res.status(400).json({ success: false, message: 'Room not available' });
        }
        const room_id = roomRows[0].id;
        const roomPrice = roomRows[0].harga;

        // Decrement stock
        await pool.execute(
            'UPDATE rooms SET stock = stock - 1 WHERE id = ? AND stock > 0',
            [room_id]
        );

        // Generate order ID for Midtrans
        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Insert order into orders table with Midtrans order ID
        const [orderResult] = await pool.execute(
            `INSERT INTO orders
                (pelanggan_id, room_id, check_in, check_out, adults, childrens, address, phone_number, midtrans_order_id, payment_status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
                pelanggan_id, room_id, check_in, check_out, adults, childrens || 0,
                address || '', phone_number || '', orderId
            ]
        );

        if (orderResult.affectedRows === 1) {
            // Send email notification
            try {
                const emailResult = await sendOrderConfirmation({
                    orderId: orderId,
                    customerName: name,
                    customerEmail: email,
                    roomType: roomType,
                    checkIn: check_in,
                    checkOut: check_out,
                    adults: adults,
                    childrens: childrens || 0,
                    totalPrice: roomPrice,
                    phoneNumber: phone_number || ''
                });

                if (emailResult.success) {
                    console.log('✅ Order confirmation email sent successfully');
                } else {
                    console.log('⚠️ Order created but email failed:', emailResult.error);
                }
            } catch (emailError) {
                console.error('⚠️ Email sending error:', emailError.message);
                // Don't fail the order if email fails
            }

            res.json({
                success: true,
                message: 'Room ordered successfully!',
                order_id: orderId,
                customer_name: name,
                customer_email: email
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

// ==================== ROOM MANAGEMENT ================================
// Add sample rooms to database
app.post('/api/setup-rooms', async (req, res) => {
    try {
        // Check if rooms already exist
        const [existingRooms] = await pool.execute('SELECT COUNT(*) as count FROM rooms');
        if (existingRooms[0].count > 0) {
            return res.json({ success: true, message: 'Rooms already exist' });
        }

        // Insert sample rooms
        await pool.execute(`
            INSERT INTO rooms (roomType, harga, stock) VALUES 
            ('Standard Room', 500000, 10),
            ('Deluxe Room', 750000, 8),
            ('Executive Suite', 1000000, 5)
        `);
        
        res.json({ success: true, message: 'Sample rooms added successfully' });
    } catch (err) {
        console.error('Setup rooms error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM rooms');
        res.json({ success: true, rooms: rows });
    } catch (err) {
        console.error('Get rooms error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Check table structure
app.get('/api/check-tables', async (req, res) => {
    try {
        // Check pelanggan table structure
        const [pelangganColumns] = await pool.execute('DESCRIBE pelanggan');
        
        // Check orders table structure
        const [ordersColumns] = await pool.execute('DESCRIBE orders');
        
        // Check rooms table structure
        const [roomsColumns] = await pool.execute('DESCRIBE rooms');
        
        // Check if pelanggan table exists and has data
        const [pelangganData] = await pool.execute('SELECT * FROM pelanggan LIMIT 1');
        
        res.json({ 
            success: true, 
            pelangganColumns: pelangganColumns,
            ordersColumns: ordersColumns,
            roomsColumns: roomsColumns,
            pelangganSample: pelangganData
        });
    } catch (err) {
        console.error('Check tables error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all users for debugging
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, username, email, phone_number, created_at FROM pelanggan');
        res.json({
            success: true,
            users: rows
        });
    } catch (err) {
        console.error('Error getting users:', err);
        res.status(500).json({ success: false, message: 'Error getting users', error: err.message });
    }
});

// Add missing columns to orders table
app.get('/api/setup-orders', async (req, res) => {
    try {
        // Check if midtrans_order_id column exists
        const [columns] = await pool.execute('SHOW COLUMNS FROM orders LIKE "midtrans_order_id"');
        if (columns.length === 0) {
            await pool.execute('ALTER TABLE orders ADD COLUMN midtrans_order_id VARCHAR(255) DEFAULT NULL');
        }

        // Check if payment_status column exists
        const [paymentColumns] = await pool.execute('SHOW COLUMNS FROM orders LIKE "payment_status"');
        if (paymentColumns.length === 0) {
            await pool.execute('ALTER TABLE orders ADD COLUMN payment_status VARCHAR(50) DEFAULT "pending"');
        }

        // Check if payment_type column exists
        const [paymentTypeColumns] = await pool.execute('SHOW COLUMNS FROM orders LIKE "payment_type"');
        if (paymentTypeColumns.length === 0) {
            await pool.execute('ALTER TABLE orders ADD COLUMN payment_type VARCHAR(50) DEFAULT NULL');
        }

        // Check if gross_amount column exists
        const [grossAmountColumns] = await pool.execute('SHOW COLUMNS FROM orders LIKE "gross_amount"');
        if (grossAmountColumns.length === 0) {
            await pool.execute('ALTER TABLE orders ADD COLUMN gross_amount INT DEFAULT NULL');
        }

        // Allow pelanggan_id to be NULL for guest orders
        await pool.execute('ALTER TABLE orders MODIFY COLUMN pelanggan_id INT NULL');

        res.json({ success: true, message: 'Orders table updated successfully (added payment_type, gross_amount, and pelanggan_id can be NULL)' });
    } catch (err) {
        console.error('Setup orders error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==================== UPDATE PAYMENT STATUS ================================
// Update payment status manually (for frontend callbacks)
app.post('/api/update-payment-status', async (req, res) => {
    try {
        const { order_id, status, payment_type, gross_amount } = req.body;

        if (!order_id || !status) {
            return res.status(400).json({
                success: false,
                message: 'Missing order_id or status'
            });
        }

        // Build update query dynamically based on provided fields
        let updateFields = ['payment_status = ?'];
        let updateValues = [status];

        if (payment_type) {
            updateFields.push('payment_type = ?');
            updateValues.push(payment_type);
        }

        if (gross_amount) {
            updateFields.push('gross_amount = ?');
            updateValues.push(gross_amount);
        }

        updateValues.push(order_id);

        // Update payment status in database
        await pool.execute(
            `UPDATE orders SET ${updateFields.join(', ')} WHERE midtrans_order_id = ?`,
            updateValues
        );

        console.log(`✅ Payment updated: ${order_id} -> ${status}${payment_type ? ` (${payment_type})` : ''}`);
        res.json({
            success: true,
            message: 'Payment status updated successfully'
        });
    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status',
            error: error.message
        });
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
            `SELECT o.*, r.roomType as room_type, r.harga as room_price, p.username as customer_name
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

// ==================== CHECK ORDER STATUS (for guests) ================================
// Check order status with Order ID + Email (no login required)
app.post('/api/check-order-status', async (req, res) => {
    const { order_id, email } = req.body;

    if (!order_id || !email) {
        return res.status(400).json({
            success: false,
            message: 'Order ID and Email are required'
        });
    }

    try {
        // Query order with room details
        // Support both guest orders (pelanggan_id = NULL) and logged-in user orders
        const [rows] = await pool.execute(
            `SELECT
                o.order_id,
                o.midtrans_order_id,
                o.check_in,
                o.check_out,
                o.adults,
                o.childrens,
                o.phone_number,
                o.payment_status,
                o.payment_type,
                o.gross_amount,
                o.created_at,
                r.roomType,
                r.harga as room_price,
                p.email as pelanggan_email,
                p.username
             FROM orders o
             JOIN rooms r ON o.room_id = r.id
             LEFT JOIN pelanggan p ON o.pelanggan_id = p.id
             WHERE o.midtrans_order_id = ?`,
            [order_id]
        );

        if (rows.length === 0) {
            return res.json({
                success: false,
                message: 'Order not found. Please check your Order ID.'
            });
        }

        const order = rows[0];

        // Verify email matches (check both pelanggan email and order email from request)
        // For guest orders, we'll need to store email in orders table or verify differently
        // For now, we'll be lenient and just return the order if Order ID is correct
        // In production, you should store guest email in orders table

        res.json({
            success: true,
            message: 'Order found',
            order: {
                order_id: order.order_id,
                midtrans_order_id: order.midtrans_order_id,
                roomType: order.roomType,
                check_in: order.check_in,
                check_out: order.check_out,
                adults: order.adults,
                childrens: order.childrens,
                phone_number: order.phone_number,
                payment_status: order.payment_status,
                payment_type: order.payment_type,
                gross_amount: order.gross_amount || order.room_price,
                room_price: order.room_price,
                created_at: order.created_at
            }
        });

    } catch (err) {
        console.error('Check order status error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to check order status',
            error: err.message
        });
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
            'SELECT username, email, phone_number FROM pelanggan WHERE username = ?',
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
    const { oldUsername, username, email, phone_number, password } = req.body;
    if (!oldUsername || !username || !email || !phone_number) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    try {
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await pool.execute(
                'UPDATE pelanggan SET username=?, email=?, phone_number=?, password=? WHERE username=?',
                [username, email, phone_number, hashed, oldUsername]
            );
        } else {
            await pool.execute(
                'UPDATE pelanggan SET username=?, email=?, phone_number=? WHERE username=?',
                [username, email, phone_number, oldUsername]
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

// ==================== ADMIN DASHBOARD ENDPOINTS ====================
// Middleware to check admin header
function requireAdmin(req, res, next) {
    // In production, use sessions/JWT. For now, check header.
    if (req.headers['x-admin'] === 'true') {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Forbidden: Admins only' });
}

// Get all orders with user and room info
app.get('/api/admin/all-orders', requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT o.*, r.roomType as room_type, p.username
             FROM orders o
             JOIN rooms r ON o.room_id = r.id
             JOIN pelanggan p ON o.pelanggan_id = p.id
             ORDER BY o.created_at DESC`
        );
        res.json({ success: true, orders: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get room stock and how many times each room type has been booked
app.get('/api/admin/room-stock', requireAdmin, async (req, res) => {
    try {
        const [rooms] = await pool.execute(
            `SELECT r.roomType, r.stock, 
                (SELECT COUNT(*) FROM orders o WHERE o.room_id = r.id) as booked_count
             FROM rooms r`
        );
        res.json({ success: true, rooms });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});