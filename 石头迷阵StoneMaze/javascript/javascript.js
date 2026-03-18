// javascript.js
document.addEventListener('DOMContentLoaded', function() {
    // 游戏状态
    const gameState = {
        board: [],
        emptyPos: { row: 3, col: 3 },
        stepCount: 0,
        startTime: null,
        elapsedTime: 0, // 已用时间（毫秒）
        isWin: false,
        timerInterval: null,
        gameStarted: false // 标记游戏是否已开始（用户是否已移动第一个方块）
    };

    // 初始化游戏
    function initGame() {
        // 重置游戏状态
        gameState.stepCount = 0;
        gameState.isWin = false;
        gameState.startTime = null;
        gameState.elapsedTime = 0;
        gameState.gameStarted = false;

        // 清除定时器
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }

        updateStepCount();
        updateTimeDisplay();

        // 初始化游戏板
        initBoard();

        // 随机打乱
        shuffleBoard();

        // 渲染游戏板
        renderBoard();

        // 隐藏胜利消息
        document.getElementById('win-message').classList.remove('show');
    }

    // 初始化游戏板
    function initBoard() {
        gameState.board = [
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
            [13, 14, 15, 0]
        ];
        gameState.emptyPos = { row: 3, col: 3 };
    }

    // 随机打乱游戏板 - 修复版
    function shuffleBoard() {
        // 重置为初始状态
        initBoard();

        // 执行多次随机移动来打乱
        const moves = 200;

        for (let i = 0; i < moves; i++) {
            // 获取当前空白块所有可能的移动方向
            const possibleDirections = [];
            const empty = gameState.emptyPos;

            // 检查每个方向是否可移动
            if (empty.row < 3) possibleDirections.push('up');
            if (empty.row > 0) possibleDirections.push('down');
            if (empty.col < 3) possibleDirections.push('left');
            if (empty.col > 0) possibleDirections.push('right');

            // 随机选择一个可移动的方向
            if (possibleDirections.length > 0) {
                const randomIndex = Math.floor(Math.random() * possibleDirections.length);
                const direction = possibleDirections[randomIndex];

                // 执行移动但不计步数
                moveEmptyTile(direction, false);
            }
        }

        console.log("游戏板已随机打乱");
    }

    // 渲染游戏板
    function renderBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const value = gameState.board[row][col];
                const tile = document.createElement('div');
                tile.className = value === 0 ? 'tile empty' : 'tile';

                if (value !== 0) {
                    const number = document.createElement('div');
                    number.className = 'tile-number';
                    number.textContent = value;
                    tile.appendChild(number);

                    const pattern = document.createElement('div');
                    pattern.className = 'tile-pattern';
                    tile.appendChild(pattern);

                    // 添加点击事件
                    tile.addEventListener('click', () => {
                        if (!gameState.isWin) {
                            handleTileClick(row, col);
                        }
                    });
                }

                gameBoard.appendChild(tile);
            }
        }
    }

    // 处理方块点击
    function handleTileClick(row, col) {
        // 检查是否与空白方块相邻
        const empty = gameState.emptyPos;
        const isAdjacent =
            (Math.abs(row - empty.row) === 1 && col === empty.col) ||
            (Math.abs(col - empty.col) === 1 && row === empty.row);

        if (isAdjacent) {
            // 确定移动方向
            let direction;
            if (row < empty.row) direction = 'down';
            else if (row > empty.row) direction = 'up';
            else if (col < empty.col) direction = 'right';
            else direction = 'left';

            moveTile(direction);
        }
    }

    // 开始计时器 - 使用高精度计时
    function startTimer() {
        if (!gameState.startTime) {
            gameState.startTime = Date.now();

            // 立即更新一次时间显示（0毫秒）
            updateElapsedTime();
            updateTimeDisplay();

            // 设置定时器每16毫秒更新一次（约60fps）
            gameState.timerInterval = setInterval(function() {
                if (gameState.startTime && !gameState.isWin) {
                    updateElapsedTime();
                    updateTimeDisplay();
                }
            }, 16); // 每16毫秒更新一次，约60fps
        }
    }

    // 更新已用时间
    function updateElapsedTime() {
        if (gameState.startTime) {
            gameState.elapsedTime = Date.now() - gameState.startTime;
        }
    }

    // 停止计时器
    function stopTimer() {
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }
    }

    /**
     * 控制空白方块的移动
     * @param {string} direction - 移动方向: 'up', 'down', 'left', 'right'
     * @param {boolean} countStep - 是否计数步数（默认true）
     * @returns {boolean} - 移动是否成功
     */
    function moveEmptyTile(direction, countStep = true) {
        const empty = gameState.emptyPos;
        let targetRow = empty.row;
        let targetCol = empty.col;

        // 根据方向计算目标位置
        switch (direction) {
            case 'up':
                if (empty.row < 3) {
                    targetRow = empty.row + 1;
                } else {
                    return false; // 无法移动
                }
                break;
            case 'down':
                if (empty.row > 0) {
                    targetRow = empty.row - 1;
                } else {
                    return false;
                }
                break;
            case 'left':
                if (empty.col < 3) {
                    targetCol = empty.col + 1;
                } else {
                    return false;
                }
                break;
            case 'right':
                if (empty.col > 0) {
                    targetCol = empty.col - 1;
                } else {
                    return false;
                }
                break;
            default:
                return false; // 无效方向
        }

        // 交换方块
        gameState.board[empty.row][empty.col] = gameState.board[targetRow][targetCol];
        gameState.board[targetRow][targetCol] = 0;
        gameState.emptyPos = { row: targetRow, col: targetCol };

        // 如果是第一次移动，开始计时
        if (countStep && !gameState.gameStarted) {
            gameState.gameStarted = true;
            startTimer();
        }

        // 更新步数
        if (countStep) {
            gameState.stepCount++;
            updateStepCount();
        }

        return true; // 移动成功
    }

    // 移动方块（外部调用）
    function moveTile(direction, countStep = true) {
        if (gameState.isWin) return false;

        const success = moveEmptyTile(direction, countStep);

        if (success) {
            // 重新渲染
            renderBoard();

            // 检查胜利
            checkWin();
        }

        return success;
    }

    // 更新步数显示
    function updateStepCount() {
        document.getElementById('step-count').textContent = gameState.stepCount;
    }

    // 更新时间显示
    function updateTimeDisplay() {
        const timeElement = document.getElementById('game-time');
        if (timeElement) {
            if (gameState.gameStarted && !gameState.isWin) {
                // 游戏进行中，显示当前时间
                timeElement.textContent = formatTime(gameState.elapsedTime);
            } else if (gameState.isWin) {
                // 游戏已结束，显示完成时间
                timeElement.textContent = formatTime(gameState.elapsedTime);
            } else {
                // 游戏未开始
                timeElement.textContent = '00:00:000';
            }
        }
    }

    // 格式化时间（毫秒转换为 分:秒:毫秒 格式）
    function formatTime(milliseconds) {
        if (milliseconds === null || milliseconds === undefined || milliseconds === 0) return '00:00:000';

        // 计算分钟、秒和毫秒
        const totalSeconds = Math.floor(milliseconds / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const ms = milliseconds % 1000;

        // 格式化为两位数分钟、两位数秒、三位数毫秒
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
    }

    // 检查胜利
    function checkWin() {
        // 胜利状态应该是1到15顺序排列，最后一个是0
        let expected = 1;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (row === 3 && col === 3) {
                    // 最后一个应该是0
                    if (gameState.board[row][col] !== 0) {
                        return;
                    }
                } else {
                    if (gameState.board[row][col] !== expected) {
                        return;
                    }
                    expected++;
                }
            }
        }

        // 停止计时器
        stopTimer();

        // 确保最终时间准确
        if (gameState.startTime) {
            gameState.elapsedTime = Date.now() - gameState.startTime;
        }

        // 胜利
        gameState.isWin = true;

        // 更新时间显示
        updateTimeDisplay();

        // 显示胜利消息
        showWinMessage();
    }

    // 显示胜利消息
    function showWinMessage() {
        document.getElementById('win-steps').textContent = gameState.stepCount;
        const winTimeElement = document.getElementById('win-time');

        // 显示完成时间
        winTimeElement.textContent = formatTime(gameState.elapsedTime);

        document.getElementById('win-message').classList.add('show');
    }

    // 事件监听
    document.addEventListener('keydown', function(e) {
        if (gameState.isWin) return;

        switch(e.key) {
            case 'ArrowUp':
                moveTile('up');
                break;
            case 'ArrowDown':
                moveTile('down');
                break;
            case 'ArrowLeft':
                moveTile('left');
                break;
            case 'ArrowRight':
                moveTile('right');
                break;
        }
    });

    document.getElementById('restart-btn').addEventListener('click', initGame);
    document.getElementById('win-restart-btn').addEventListener('click', initGame);

    document.getElementById('about-btn').addEventListener('click', function() {
        alert('石头迷阵StoneMaze-Web版\n作者：benzhubenzhu\n有问题请联系作者！');
    });

    // 初始化游戏
    initGame();
});