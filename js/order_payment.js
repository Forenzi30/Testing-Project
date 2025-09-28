document.querySelector('.order-btn').addEventListener('click', function(e) {
    e.preventDefault();
    // Ganti URL di bawah dengan link QR payment Anda
    window.location.href = 'https://your-payment-qr-link.com';
});

// Call this function after a successful order
function redirectToPayment(orderId) {
    fetch('/api/payment-key')
        .then(res => res.json())
        .then(data => {
            const paymentApiKey = data.key;
            // Example: redirect to payment gateway with API key and orderId
            // Replace the URL below with your actual payment gateway URL and parameters
            const paymentUrl = `https://payment-gateway.example.com/pay?api_key=${encodeURIComponent(paymentApiKey)}&order_id=${encodeURIComponent(orderId)}`;
            window.location.href = paymentUrl;
        })
        .catch(() => {
            alert('Failed to initiate payment. Please try again.');
        });
}

// Example usage: call redirectToPayment(orderId) after order is successful
// You may need to integrate this with your order form's .then() logic in room_availability.js or similar
