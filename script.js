// Knight auto-repair checkerboard game
(function() {
    const CELL = 50;
    const CA = '#EDE8DC', CB = '#D4E8C2';
    const KNIGHT_COLOR = '#32B840';
    const KNIGHT_OUTLINE = '#1a1a1a';
    const FLASH_MS = 250;

    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    const knightImg = new Image();
    knightImg.src = 'images/sns/knight.svg';

    const ANIM_DURATION = 150;
    const STAY_DURATION = 16;

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
        lastCell: null,
        knightAnim: null,
        knightStayTime: 0,
        knightNextIsLight: true
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

        // 初期位置の色を基準に、最初に変える色を決定
        // shouldBeLight=true の場所なら、最初は CB (緑) に変更
        // shouldBeLight=false の場所なら、最初は CA (白) に変更
        const initialShouldBeLight = (gameState.knightRow + gameState.knightCol) % 2 === 0;
        gameState.knightNextIsLight = !initialShouldBeLight;

        gameState.lastMoveTime = Date.now();
    }

    function drawBase() {
        for (let r = 0; r < gameState.rows; r++) {
            for (let c = 0; c < gameState.cols; c++) {
                const key = r + ',' + c;
                const isError = gameState.boardErrors.has(key);
                const shouldBeLight = (r + c) % 2 === 0;
                const displayLight = shouldBeLight === !isError;

                ctx.fillStyle = displayLight ? CA : CB;
                ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
            }
        }
    }

    function drawKnight() {
        let row = gameState.knightRow;
        let col = gameState.knightCol;

        // アニメーション中の場合は補間位置を計算
        if (gameState.knightAnim) {
            const now = Date.now();
            const elapsed = now - gameState.knightAnim.startTime;
            const progress = Math.min(elapsed / ANIM_DURATION, 1);

            row = gameState.knightAnim.fromRow + (gameState.knightAnim.toRow - gameState.knightAnim.fromRow) * progress;
            col = gameState.knightAnim.fromCol + (gameState.knightAnim.toCol - gameState.knightAnim.fromCol) * progress;

            if (progress >= 1) {
                gameState.knightAnim = null;
            }
        }

        const x = col * CELL;
        const y = row * CELL;

        // knight.png が読み込まれていれば使用
        if (knightImg.complete && knightImg.naturalWidth > 0) {
            ctx.drawImage(knightImg, x, y, CELL, CELL);
        }
    }

    function drawFlashes() {
        const now = Date.now();
        for (let i = gameState.flashes.length - 1; i >= 0; i--) {
            const age = now - gameState.flashes[i].t;
            if (age >= FLASH_MS) {
                gameState.flashes.splice(i, 1);
                continue;
            }
            const alpha = (1 - age / FLASH_MS) * 0.5;
            ctx.fillStyle = 'rgba(50, 184, 64,' + alpha + ')';

            if (gameState.flashes[i].is3x3) {
                // プレイヤーの3x3ハイライト
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        ctx.fillRect((gameState.flashes[i].col + dc) * CELL,
                                    (gameState.flashes[i].row + dr) * CELL, CELL, CELL);
                    }
                }
            } else {
                // ナイトの1マスハイライト
                ctx.fillRect(gameState.flashes[i].col * CELL, gameState.flashes[i].row * CELL, CELL, CELL);
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

        // アニメーション開始
        gameState.knightAnim = {
            fromRow: gameState.knightRow,
            fromCol: gameState.knightCol,
            toRow: chosen.row,
            toCol: chosen.col,
            startTime: now
        };

        gameState.knightRow = chosen.row;
        gameState.knightCol = chosen.col;

        // マスを修復
        updateCell(chosen.row, chosen.col);

        gameState.lastMoveTime = now + ANIM_DURATION + STAY_DURATION;
    }

    function updateCell(row, col) {
        const key = row + ',' + col;
        const isError = gameState.boardErrors.has(key);

        // ナイトの次の色に合わせて修正
        // knightNextIsLight = true → CA (light) を表示したい
        // knightNextIsLight = false → CB (dark) を表示したい
        const displayLight = gameState.knightNextIsLight;

        // displayLight の色を表示するには
        // displayLight = shouldBeLight !== isError
        // shouldBeLight = displayLight ? (displayLight === !isError) : ...
        // isError を制御して displayLight を実現
        const shouldBeLight = (row + col) % 2 === 0;
        const targetIsError = shouldBeLight !== displayLight;

        if (isError !== targetIsError) {
            if (targetIsError) {
                gameState.boardErrors.add(key);
            } else {
                gameState.boardErrors.delete(key);
            }
            // 色が変わったらハイライト
            gameState.flashes.push({ col, row, t: Date.now(), is3x3: false });
        }

        // 次の訪問時は反対の色
        gameState.knightNextIsLight = !gameState.knightNextIsLight;
        gameState.visitedTime.set(key, Date.now());
    }

    function calcMoveInterval() {
        const totalCells = gameState.rows * gameState.cols;
        const errorRatio = gameState.boardErrors.size / totalCells;

        if (errorRatio >= 0.5) {
            return 100;
        }
        // 線形補間: 500ms (errorRatio=0) → 100ms (errorRatio=0.5)
        return 500 - (400 * errorRatio / 0.5);
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
        gameState.flashes.push({ col, row, t: Date.now(), is3x3: true });
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
