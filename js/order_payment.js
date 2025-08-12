document.querySelector('.order-btn').addEventListener('click', function(e) {
    e.preventDefault();
    // Ganti URL di bawah dengan link QR payment Anda
    window.location.href = 'https://your-payment-qr-link.com';
});
