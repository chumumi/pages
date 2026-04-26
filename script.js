// Interactive checkerboard background
(function() {
    const CELL = 50;
    const CA = '#EDE8DC', CB = '#D4E8C2';
    const FLASH_MS = 250;

    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    const flipped = new Set();
    const flashes = [];
    let rafId = null;
    let isDragging = false;
    let lastCell = null;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawBase();
    }

    function drawBase() {
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

    function loop() {
        const now = Date.now();
        drawBase();
        for (let i = flashes.length - 1; i >= 0; i--) {
            const age = now - flashes[i].t;
            if (age >= FLASH_MS) { flashes.splice(i, 1); continue; }
            const alpha = (1 - age / FLASH_MS) * 0.55;
            ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    ctx.fillRect((flashes[i].col + dc) * CELL, (flashes[i].row + dr) * CELL, CELL, CELL);
                }
            }
        }
        rafId = flashes.length > 0 ? requestAnimationFrame(loop) : null;
    }

    function flipAt(col, row) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const key = (row + dr) + ',' + (col + dc);
                flipped.has(key) ? flipped.delete(key) : flipped.add(key);
            }
        }
        flashes.push({ col, row, t: Date.now() });
        if (!rafId) rafId = requestAnimationFrame(loop);
    }

    function cellFrom(x, y) {
        return { col: Math.floor(x / CELL), row: Math.floor(y / CELL) };
    }

    function startDrag(x, y) {
        isDragging = true;
        const { col, row } = cellFrom(x, y);
        lastCell = col + ',' + row;
        flipAt(col, row);
    }

    function moveDrag(x, y) {
        if (!isDragging) return;
        const { col, row } = cellFrom(x, y);
        const key = col + ',' + row;
        if (key !== lastCell) { lastCell = key; flipAt(col, row); }
    }

    function endDrag() { isDragging = false; lastCell = null; }

    document.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
    document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);

    document.addEventListener('touchstart', e => {
        const t = e.touches[0]; startDrag(t.clientX, t.clientY);
    }, { passive: false });
    document.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = e.touches[0]; moveDrag(t.clientX, t.clientY);
    }, { passive: false });
    document.addEventListener('touchend', endDrag);

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
