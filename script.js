// Knight auto-repair checkerboard game
(function() {
    const CELL = 50;
    const CA = '#EDE8DC', CB = '#D4E8C2';
    const KNIGHT_COLOR = '#32B840';
    const KNIGHT_OUTLINE = '#1a1a1a';

    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');

    let gameState = {
        boardErrors: new Set(),
        knightRow: 0,
        knightCol: 0,
        visitedTime: new Map(),
        lastMoveTime: 0,
        moveInterval: 1000,
        isGameOver: false,
        cols: 0,
        rows: 0
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

        // ランダムに約50%のマスを誤り状態に
        for (let r = 0; r < gameState.rows; r++) {
            for (let c = 0; c < gameState.cols; c++) {
                if (Math.random() < 0.5) {
                    gameState.boardErrors.add(r + ',' + c);
                }
            }
        }

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

    function checkGameOver() {
        return gameState.boardErrors.size === 0;
    }

    function gameLoop() {
        const now = Date.now();

        // ナイト移動判定
        if (now - gameState.lastMoveTime >= gameState.moveInterval) {
            moveKnight();

            if (checkGameOver()) {
                gameState.isGameOver = true;
            }
        }

        // 速度更新
        gameState.moveInterval = calcMoveInterval();

        // 描画
        drawBase();
        drawKnight();

        // 勝利メッセージ
        if (gameState.isGameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#32B840';
            ctx.font = 'bold 48px "Meiryo UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ゲーム完了！', canvas.width / 2, canvas.height / 2);
        } else {
            rafId = requestAnimationFrame(gameLoop);
        }
    }

    window.addEventListener('resize', resize);
    resize();
    gameLoop();
})();
