document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.querySelector('.sidebar');
    
    menuBtn.addEventListener('click', function() {
        sidebar.classList.add('active');
        menuBtn.classList.add('hide');
    });
    
    closeBtn.addEventListener('click', function() {
        sidebar.classList.remove('active');
        menuBtn.classList.remove('hide');
    });
    
    // Close sidebar when clicking outside
    document.addEventListener('click', function(event) {
        if (!sidebar.contains(event.target) && !menuBtn.contains(event.target)) {
            sidebar.classList.remove('active');
            menuBtn.classList.remove('hide');
        }
    });
});