require('dotenv').config();
const nodemailer = require('nodemailer');

// Create transporter for sending emails
let transporter = null;

// Initialize email transporter
function initializeTransporter() {
    // For testing, we'll use Ethereal Email (fake SMTP service)
    // In production, you would use real Gmail credentials

    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: 'your-ethereal-user@ethereal.email',
            pass: 'your-ethereal-password'
        }
    });

    // Test credentials will be created on-the-fly
    console.log('📧 Email service initialized (using Ethereal for testing)');
}

// Create Ethereal test account and initialize transporter
async function setupTestEmail() {
    try {
        // Create a test account
        const testAccount = await nodemailer.createTestAccount();

        transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });

        console.log('✅ Ethereal test email account created');
        console.log('📧 Test email credentials:', testAccount.user);
        return true;
    } catch (error) {
        console.error('❌ Failed to setup test email:', error.message);
        return false;
    }
}

// Send order confirmation email
async function sendOrderConfirmation(orderDetails) {
    try {
        // Ensure transporter is ready
        if (!transporter) {
            await setupTestEmail();
        }

        const {
            orderId,
            customerName,
            customerEmail,
            roomType,
            checkIn,
            checkOut,
            adults,
            childrens,
            totalPrice,
            phoneNumber
        } = orderDetails;

        // Format price in IDR
        const formattedPrice = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR'
        }).format(totalPrice);

        // Email HTML template
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px 10px 0 0;
            text-align: center;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .order-id {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .order-id strong {
            color: #856404;
            font-size: 18px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .details-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        .details-table td:first-child {
            font-weight: bold;
            color: #667eea;
            width: 40%;
        }
        .total-price {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            color: #155724;
        }
        .instructions {
            background-color: #d1ecf1;
            border-left: 4px solid #17a2b8;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .instructions h3 {
            margin-top: 0;
            color: #0c5460;
        }
        .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            margin: 10px 0;
            font-weight: bold;
        }
        .warning {
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            color: #721c24;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏨 Hotel 999</h1>
            <p style="margin: 5px 0 0 0;">Konfirmasi Pemesanan Kamar</p>
        </div>

        <p>Halo <strong>${customerName}</strong>,</p>

        <p>Terima kasih telah melakukan pemesanan di Hotel 999! Pesanan Anda telah berhasil dibuat dan menunggu pembayaran.</p>

        <div class="order-id">
            <strong>📋 Order ID Anda:</strong><br>
            <span style="font-size: 20px; font-family: monospace; color: #000;">${orderId}</span><br>
            <small style="color: #856404;">⚠️ Simpan Order ID ini untuk tracking pesanan Anda!</small>
        </div>

        <h3 style="color: #667eea;">📝 Detail Pemesanan:</h3>
        <table class="details-table">
            <tr>
                <td>Nama Pemesan</td>
                <td>${customerName}</td>
            </tr>
            <tr>
                <td>Email</td>
                <td>${customerEmail}</td>
            </tr>
            <tr>
                <td>No. Telepon</td>
                <td>${phoneNumber || '-'}</td>
            </tr>
            <tr>
                <td>Tipe Kamar</td>
                <td>${roomType}</td>
            </tr>
            <tr>
                <td>Check-in</td>
                <td>${checkIn}</td>
            </tr>
            <tr>
                <td>Check-out</td>
                <td>${checkOut}</td>
            </tr>
            <tr>
                <td>Jumlah Tamu</td>
                <td>${adults} Dewasa${childrens > 0 ? `, ${childrens} Anak` : ''}</td>
            </tr>
        </table>

        <div class="total-price">
            💰 Total Pembayaran: ${formattedPrice}
        </div>

        <div class="instructions">
            <h3>📌 Langkah Selanjutnya:</h3>
            <ol>
                <li><strong>Selesaikan pembayaran</strong> melalui Midtrans yang akan muncul di layar Anda</li>
                <li>Pilih metode pembayaran (Kartu Kredit, Transfer Bank, E-wallet, dll)</li>
                <li>Lakukan pembayaran sesuai instruksi</li>
                <li>Setelah pembayaran berhasil, Anda akan menerima email konfirmasi</li>
            </ol>
        </div>

        <div class="warning">
            <strong>⚠️ PENTING:</strong><br>
            • Order ID ini diperlukan untuk tracking pesanan Anda<br>
            • Simpan email ini sebagai bukti pemesanan<br>
            • Pembayaran harus diselesaikan dalam 24 jam<br>
            • Jika tidak dibayar, pesanan akan otomatis dibatalkan
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <p>Ada pertanyaan? Hubungi kami:</p>
            <p>
                📧 Email: support@hotel999.com<br>
                📱 WhatsApp: +62 812-3456-7890<br>
                ☎️ Telepon: (021) 1234-5678
            </p>
        </div>

        <div class="footer">
            <p><strong>Hotel 999</strong></p>
            <p>Jl. Example Street No. 999, Jakarta 12345</p>
            <p style="font-size: 12px; color: #999;">Email ini dikirim otomatis, mohon tidak membalas email ini.</p>
        </div>
    </div>
</body>
</html>
        `;

        // Plain text version (fallback)
        const textContent = `
Hotel 999 - Konfirmasi Pemesanan Kamar

Halo ${customerName},

Terima kasih telah melakukan pemesanan di Hotel 999!

ORDER ID: ${orderId}
⚠️ SIMPAN ORDER ID INI UNTUK TRACKING PESANAN!

=== DETAIL PEMESANAN ===
Nama Pemesan: ${customerName}
Email: ${customerEmail}
No. Telepon: ${phoneNumber || '-'}
Tipe Kamar: ${roomType}
Check-in: ${checkIn}
Check-out: ${checkOut}
Jumlah Tamu: ${adults} Dewasa${childrens > 0 ? `, ${childrens} Anak` : ''}

TOTAL PEMBAYARAN: ${formattedPrice}

=== LANGKAH SELANJUTNYA ===
1. Selesaikan pembayaran melalui Midtrans
2. Pilih metode pembayaran (Kartu Kredit, Transfer Bank, E-wallet, dll)
3. Lakukan pembayaran sesuai instruksi
4. Setelah pembayaran berhasil, Anda akan menerima email konfirmasi

PENTING:
• Order ID diperlukan untuk tracking pesanan
• Simpan email ini sebagai bukti pemesanan
• Pembayaran harus diselesaikan dalam 24 jam
• Jika tidak dibayar, pesanan akan otomatis dibatalkan

Hubungi kami:
Email: support@hotel999.com
WhatsApp: +62 812-3456-7890
Telepon: (021) 1234-5678

---
Hotel 999
Jl. Example Street No. 999, Jakarta 12345
        `;

        // Send email
        const info = await transporter.sendMail({
            from: '"Hotel 999 Booking" <noreply@hotel999.com>',
            to: customerEmail, // Will send to actual customer email
            subject: `✅ Konfirmasi Pemesanan - Order #${orderId}`,
            text: textContent,
            html: htmlContent
        });

        console.log('✅ Order confirmation email sent to:', customerEmail);
        console.log('📧 Message ID:', info.messageId);

        // For Ethereal, generate preview URL
        if (info.messageId && transporter.options.host === 'smtp.ethereal.email') {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('🔗 Preview email here:', previewUrl);
        }

        return {
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };

    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Initialize on module load
setupTestEmail();

module.exports = {
    sendOrderConfirmation,
    setupTestEmail
};
