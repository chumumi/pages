// Knight auto-repair checkerboard game
(function() {
    const CELL = 50;
    const CA = '#EDE8DC', CB = '#D4E8C2';
    const KNIGHT_COLOR = '#32B840';
    const KNIGHT_OUTLINE = '#1a1a1a';
    const FLASH_MS = 250;

    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    let gameState = {
        boardErrors: new Set(),
        knightRow: 0,
        knightCol: 0,
        visitedTime: new Map(),
        lastMoveTime: 0,
        moveInterval: 1000,
        cols: 0,
        rows: 0,
        flashes: [],
        isDragging: false,
        lastCell: null
    };

    let rafId = null;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gameState.cols = Math.ceil(canvas.width / CELL);
        gameState.rows = Math.ceil(canvas.height / CELL);
        initializeGame();
    }

    function initializeGame() {
        gameState.boardErrors.clear();
        gameState.visitedTime.clear();

        // ナイトを中央に配置
        gameState.knightRow = Math.floor(gameState.rows / 2);
        gameState.knightCol = Math.floor(gameState.cols / 2);
        gameState.lastMoveTime = Date.now();
        gameState.isGameOver = false;
    }

    function drawBase() {
        for (let r = 0; r < gameState.rows; r++) {
            for (let c = 0; c < gameState.cols; c++) {
                const key = r + ',' + c;
                const isError = gameState.boardErrors.has(key);
                const shouldBeLight = (r + c) % 2 === 0;
                const isLight = shouldBeLight !== isError;

                ctx.fillStyle = isLight ? CA : CB;
                ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
            }
        }
    }

    function drawKnight() {
        const x = gameState.knightCol * CELL;
        const y = gameState.knightRow * CELL;
        const s = CELL * 0.4;

        ctx.save();
        ctx.translate(x + CELL / 2, y + CELL / 2);

        // Neck
        ctx.fillStyle = KNIGHT_COLOR;
        ctx.strokeStyle = KNIGHT_OUTLINE;
        ctx.lineWidth = 2;
        ctx.fillRect(-s * 0.3, -s * 0.5, s * 0.6, s);
        ctx.strokeRect(-s * 0.3, -s * 0.5, s * 0.6, s);

        // Head (horse shape)
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.2);
        ctx.lineTo(s * 0.4, -s * 0.7);
        ctx.lineTo(s * 0.5, -s * 0.2);
        ctx.lineTo(s * 0.3, s * 0.2);
        ctx.lineTo(-s * 0.3, s * 0.2);
        ctx.lineTo(-s * 0.5, -s * 0.2);
        ctx.lineTo(-s * 0.4, -s * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ear
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, -s * 1.2);
        ctx.lineTo(0, -s * 1.5);
        ctx.lineTo(s * 0.2, -s * 1.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = KNIGHT_OUTLINE;
        ctx.beginPath();
        ctx.arc(s * 0.15, -s * 0.6, s * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -s * 0.1, s * 0.3, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
    }

    function drawFlashes() {
        const now = Date.now();
        for (let i = gameState.flashes.length - 1; i >= 0; i--) {
            const age = now - gameState.flashes[i].t;
            if (age >= FLASH_MS) {
                gameState.flashes.splice(i, 1);
                continue;
            }
            const alpha = (1 - age / FLASH_MS) * 0.4;
            ctx.fillStyle = 'rgba(50, 184, 64,' + alpha + ')';
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    ctx.fillRect((gameState.flashes[i].col + dc) * CELL,
                                (gameState.flashes[i].row + dr) * CELL, CELL, CELL);
                }
            }
        }
    }

    function getKnightMoves() {
        const moves = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];

        const valid = [];
        for (const [dr, dc] of moves) {
            const nr = gameState.knightRow + dr;
            const nc = gameState.knightCol + dc;
            if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
                valid.push({row: nr, col: nc});
            }
        }
        return valid;
    }

    function moveKnight() {
        const moves = getKnightMoves();
        if (moves.length === 0) return;

        // ソート（最後に訪れてからの経過時間が長い順）
        const now = Date.now();
        moves.sort((a, b) => {
            const timeA = now - (gameState.visitedTime.get(a.row + ',' + a.col) || 0);
            const timeB = now - (gameState.visitedTime.get(b.row + ',' + b.col) || 0);
            return timeB - timeA;
        });

        // 上位3つから選択
        const candidates = moves.slice(0, 3);
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];

        gameState.knightRow = chosen.row;
        gameState.knightCol = chosen.col;

        // マスを修復
        updateCell(chosen.row, chosen.col);
        gameState.lastMoveTime = now;
    }

    function updateCell(row, col) {
        const key = row + ',' + col;
        const correctColor = (row + col) % 2 === 0;
        const isError = gameState.boardErrors.has(key);

        // 誤った色なら修正
        if (correctColor === isError) {
            if (isError) {
                gameState.boardErrors.delete(key);
            } else {
                gameState.boardErrors.add(key);
            }
        }

        gameState.visitedTime.set(key, Date.now());
    }

    function calcMoveInterval() {
        const totalCells = gameState.rows * gameState.cols;
        const errorRatio = gameState.boardErrors.size / totalCells;

        if (errorRatio >= 0.5) {
            return 200;
        }
        // 線形補間: 1000ms (errorRatio=0) → 200ms (errorRatio=0.5)
        return 1000 - (800 * errorRatio / 0.5);
    }


    function flipCell(row, col) {
        const key = row + ',' + col;
        if (gameState.boardErrors.has(key)) {
            gameState.boardErrors.delete(key);
        } else {
            gameState.boardErrors.add(key);
        }
    }

    function flipRange(row, col) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < gameState.rows && c >= 0 && c < gameState.cols) {
                    flipCell(r, c);
                }
            }
        }
        gameState.flashes.push({ col, row, t: Date.now() });
    }

    function startDrag(x, y) {
        gameState.isDragging = true;
        const col = Math.floor(x / CELL);
        const row = Math.floor(y / CELL);
        gameState.lastCell = row + ',' + col;
        flipRange(row, col);
    }

    function moveDrag(x, y) {
        if (!gameState.isDragging) return;
        const col = Math.floor(x / CELL);
        const row = Math.floor(y / CELL);
        const key = row + ',' + col;
        if (key !== gameState.lastCell) {
            gameState.lastCell = key;
            flipRange(row, col);
        }
    }

    function endDrag() {
        gameState.isDragging = false;
        gameState.lastCell = null;
    }

    function gameLoop() {
        const now = Date.now();

        // ナイト移動判定
        if (now - gameState.lastMoveTime >= gameState.moveInterval) {
            moveKnight();
        }

        // 速度更新
        gameState.moveInterval = calcMoveInterval();

        // 描画
        drawBase();
        drawFlashes();
        drawKnight();

        rafId = requestAnimationFrame(gameLoop);
    }

    document.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
    document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);

    document.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.touches[0];
        startDrag(t.clientX, t.clientY);
    }, { passive: false });
    document.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = e.touches[0];
        moveDrag(t.clientX, t.clientY);
    }, { passive: false });
    document.addEventListener('touchend', endDrag);

    window.addEventListener('resize', resize);
    resize();
    gameLoop();
})();
