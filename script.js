// Interactive checkerboard background
(function() {
    const CELL = 50;
    const CA = '#EDE8DC', CB = '#D4E8C2';
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    const flipped = new Set();

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        draw();
    }

    function draw() {
        const cols = Math.ceil(canvas.width / CELL);
        const rows = Math.ceil(canvas.height / CELL);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const f = flipped.has(r + ',' + c);
                const alt = (r + c) % 2 === 1;
                ctx.fillStyle = (alt !== f) ? CB : CA;
                ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
            }
        }
    }

    document.addEventListener('click', function(e) {
        const col = Math.floor(e.clientX / CELL);
        const row = Math.floor(e.clientY / CELL);
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const key = (row + dr) + ',' + (col + dc);
                flipped.has(key) ? flipped.delete(key) : flipped.add(key);
            }
        }
        draw();
    });

    window.addEventListener('resize', resize);
    resize();
})();

// Navigation active link update
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    window.addEventListener('scroll', function() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
