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
    knightImg.src = 'knight.png';

    const ANIM_DURATION = 75;
    const STAY_DURATION = 8;

    let gameState = {
        boardErrors: new Set(),
        knightRow: 0,
        knightCol: 0,
        knightPrevRow: -1,
        knightPrevCol: -1,
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
        knightNextIsLight: true,
        waitAnimStart: 0
    };

    let rafId = null;

    function resize() {
        const oldCols = gameState.cols;
        const oldRows = gameState.rows;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gameState.cols = Math.ceil(canvas.width / CELL);
        gameState.rows = Math.ceil(canvas.height / CELL);

        // 初回のみ初期化
        if (oldCols === 0 && oldRows === 0) {
            initializeGame();
        }
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

                // 誤り色マスをグレーのマスク表示
                if (isError) {
                    ctx.fillStyle = 'rgba(128, 128, 128, 0.4)';
                    ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
                }
            }
        }
    }

    function drawKnight() {
        let row = gameState.knightRow;
        let col = gameState.knightCol;
        let offsetY = 0;

        const now = Date.now();

        // アニメーション中の場合は補間位置を計算
        if (gameState.knightAnim) {
            const elapsed = now - gameState.knightAnim.startTime;
            const progress = Math.min(elapsed / ANIM_DURATION, 1);

            row = gameState.knightAnim.fromRow + (gameState.knightAnim.toRow - gameState.knightAnim.fromRow) * progress;
            col = gameState.knightAnim.fromCol + (gameState.knightAnim.toCol - gameState.knightAnim.fromCol) * progress;

            if (progress >= 1) {
                gameState.knightAnim = null;
            }
        } else if (gameState.waitAnimStart > 0) {
            // 待機アニメーション（ぴょんぴょん）
            const elapsed = now - gameState.waitAnimStart;
            const bounceTime = 400; // 1往復400ms
            const bouncePhase = (elapsed % bounceTime) / bounceTime;
            offsetY = Math.sin(bouncePhase * Math.PI) * CELL * 0.15;
        }

        const x = col * CELL;
        const y = row * CELL + offsetY;

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
            // 前のマスへの往復を避ける
            if (nr === gameState.knightPrevRow && nc === gameState.knightPrevCol) {
                continue;
            }
            if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
                valid.push({row: nr, col: nc});
            }
        }
        return valid;
    }

    function knightDistance(x, y) {
        x = Math.abs(x);
        y = Math.abs(y);
        if (x < y) [x, y] = [y, x];

        if (x === 0 && y === 0) return 0;
        if (x === 1 && y === 0) return 3;
        if (x === 2 && y === 2) return 4;

        let d = Math.max(Math.ceil(x / 2), Math.ceil((x + y) / 3));
        if ((d - (x + y)) % 2 !== 0) d += 1;
        return d;
    }

    function getNextKnightMove(targetRow, targetCol) {
        const dx = targetRow - gameState.knightRow;
        const dy = targetCol - gameState.knightCol;

        const candidates = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];

        let bestMove = null;
        let bestDist = Infinity;

        for (const [dr, dc] of candidates) {
            const nr = gameState.knightRow + dr;
            const nc = gameState.knightCol + dc;

            if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
                if (nr === gameState.knightPrevRow && nc === gameState.knightPrevCol) continue;

                const newDx = targetRow - nr;
                const newDy = targetCol - nc;
                const dist = knightDistance(newDx, newDy);

                if (dist < bestDist) {
                    bestDist = dist;
                    bestMove = {row: nr, col: nc};
                }
            }
        }

        return bestMove;
    }

    function moveKnight() {
        // 誤り色マスがない場合は待機アニメーション
        if (gameState.boardErrors.size === 0) {
            gameState.waitAnimStart = Date.now();
            gameState.lastMoveTime = Date.now() + 500;
            return;
        }

        // 待機アニメーション停止
        gameState.waitAnimStart = 0;

        let chosen;

        // 誤り色マスがある場合
        // 最も近い誤り色マスを見つける
        let nearestError = null;
        let nearestDist = Infinity;

        for (const errorKey of gameState.boardErrors) {
            const [r, c] = errorKey.split(',').map(Number);
            const dist = knightDistance(r - gameState.knightRow, c - gameState.knightCol);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestError = {row: r, col: c};
            }
        }

        if (nearestError) {
            chosen = getNextKnightMove(nearestError.row, nearestError.col);
            if (!chosen) {
                // 移動できない場合はランダムウォーク
                const moves = getKnightMoves();
                chosen = moves.length > 0 ? moves[Math.floor(Math.random() * moves.length)] : null;
            }
        }

        if (!chosen) return;

        const now = Date.now();
        // アニメーション開始
        gameState.knightAnim = {
            fromRow: gameState.knightRow,
            fromCol: gameState.knightCol,
            toRow: chosen.row,
            toCol: chosen.col,
            startTime: now
        };

        gameState.knightPrevRow = gameState.knightRow;
        gameState.knightPrevCol = gameState.knightCol;
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
            return 50;
        }
        // 線形補間: 250ms (errorRatio=0) → 50ms (errorRatio=0.5)
        return 250 - (200 * errorRatio / 0.5);
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
