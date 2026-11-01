import { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

// Constants
const GRID_SIZE = 20;
const SPEEDS: Record<Difficulty, number> = { easy: 150, medium: 100, hard: 60 };
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

// Helper functions
const getRandomPosition = (snake: Position[]): Position => {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
  return pos;
};

const getHighScore = (): number => {
  try {
    return parseInt(localStorage.getItem('snake-high-score') || '0', 10);
  } catch {
    return 0;
  }
};

const setHighScore = (score: number) => {
  try {
    localStorage.setItem('snake-high-score', score.toString());
  } catch {
    // silently fail
  }
};

export default function App() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScoreState] = useState(getHighScore());
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showNewHighScore, setShowNewHighScore] = useState(false);

  const directionRef = useRef<Direction>('RIGHT');
  const gameStateRef = useRef<GameState>('idle');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameLoopRef = useRef<number | null>(null);

  // Sync refs
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Game logic
  const moveSnake = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const dir = directionRef.current;
      let newHead: Position;

      switch (dir) {
        case 'UP':
          newHead = { x: head.x, y: head.y - 1 };
          break;
        case 'DOWN':
          newHead = { x: head.x, y: head.y + 1 };
          break;
        case 'LEFT':
          newHead = { x: head.x - 1, y: head.y };
          break;
        case 'RIGHT':
          newHead = { x: head.x + 1, y: head.y };
          break;
      }

      // Check wall collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameState('gameover');
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameState('gameover');
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      setFood(prevFood => {
        if (newHead.x === prevFood.x && newHead.y === prevFood.y) {
          setScore(prev => {
            const newScore = prev + 10;
            if (newScore > getHighScore()) {
              setHighScore(newScore);
              setHighScoreState(newScore);
              setShowNewHighScore(true);
            }
            return newScore;
          });
          const newFood = getRandomPosition(newSnake);
          return newFood;
        }
        newSnake.pop();
        return prevFood;
      });

      return newSnake;
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = window.setInterval(moveSnake, SPEEDS[difficulty]);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, difficulty, moveSnake]);

  // Reset new high score notification
  useEffect(() => {
    if (showNewHighScore) {
      const timer = setTimeout(() => setShowNewHighScore(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showNewHighScore]);

  // Controls
  const changeDirection = useCallback((newDir: Direction) => {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    if (opposites[newDir] !== directionRef.current) {
      setDirection(newDir);
    }
  }, []);

  const startGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(getRandomPosition(initialSnake));
    setDirection('RIGHT');
    setScore(0);
    setGameState('playing');
    setShowNewHighScore(false);
  }, []);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          if (gameStateRef.current === 'playing') changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          if (gameStateRef.current === 'playing') changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (gameStateRef.current === 'playing') changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (gameStateRef.current === 'playing') changeDirection('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
            togglePause();
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          startGame();
          break;
        case 'Enter':
          e.preventDefault();
          if (gameStateRef.current === 'idle' || gameStateRef.current === 'gameover') {
            startGame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, togglePause, startGame]);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  }, [changeDirection]);

  // Render game board
  const renderBoard = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnakeHead = snake[0]?.x === x && snake[0]?.y === y;
        const isSnakeBody = snake.slice(1).some(seg => seg.x === x && seg.y === y);
        const isFood = food.x === x && food.y === y;

        let cellClass = 'transition-all duration-75 ';

        if (isSnakeHead) {
          cellClass += 'bg-emerald-400 rounded-md shadow-lg shadow-emerald-400/50 scale-110 z-10';
        } else if (isSnakeBody) {
          const index = snake.findIndex(seg => seg.x === x && seg.y === y);
          const opacity = Math.max(0.4, 1 - (index / snake.length) * 0.6);
          cellClass += `rounded-sm`;
          cells.push(
            <div
              key={`${x}-${y}`}
              className={cellClass}
              style={{
                backgroundColor: `rgba(52, 211, 153, ${opacity})`,
              }}
            />
          );
          continue;
        } else if (isFood) {
          cellClass += 'bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-400/50 scale-90';
        } else {
          cellClass += 'bg-slate-800/40 rounded-sm';
        }

        cells.push(
          <div
            key={`${x}-${y}`}
            className={cellClass}
          />
        );
      }
    }
    return cells;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-white mb-2 tracking-tight">
          🐍 Snake
        </h1>

        {/* Score display */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Score</p>
              <p className="text-2xl font-bold text-white tabular-nums">{score}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Best</p>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{highScore}</p>
            </div>
          </div>

          {/* New high score notification */}
          {showNewHighScore && (
            <div className="animate-bounce text-amber-400 font-bold text-sm">
              🏆 New High Score!
            </div>
          )}

          {/* Difficulty selector */}
          <div className="flex gap-1">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => {
                  if (gameState === 'idle' || gameState === 'gameover') {
                    setDifficulty(d);
                  }
                }}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                  difficulty === d
                    ? d === 'easy'
                      ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50'
                      : d === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50'
                      : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                } ${gameState !== 'idle' && gameState !== 'gameover' ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={gameState !== 'idle' && gameState !== 'gameover'}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div
        className="relative w-full max-w-lg aspect-square bg-slate-900/80 rounded-xl border border-slate-700/50 shadow-2xl overflow-hidden backdrop-blur-sm"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid */}
        <div
          className="w-full h-full grid gap-[1px] p-1"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {renderBoard()}
        </div>

        {/* Overlay states */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div className="text-6xl mb-2">🐍</div>
            <h2 className="text-2xl font-bold text-white">Ready to Play?</h2>
            <p className="text-slate-400 text-sm text-center px-4">
              Use arrow keys or swipe to control the snake
            </p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/30"
            >
              Start Game
            </button>
            <p className="text-slate-500 text-xs">Press Enter to start</p>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-fade-in">
            <div className="text-5xl">⏸️</div>
            <h2 className="text-2xl font-bold text-white">Paused</h2>
            <button
              onClick={togglePause}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30"
            >
              Resume
            </button>
            <p className="text-slate-500 text-xs">Press Space to resume</p>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-fade-in">
            <div className="text-5xl">💀</div>
            <h2 className="text-2xl font-bold text-white">Game Over</h2>
            <p className="text-slate-300 text-lg">
              Score: <span className="font-bold text-white">{score}</span>
            </p>
            {score === highScore && score > 0 && (
              <p className="text-amber-400 font-bold animate-pulse">🏆 New High Score!</p>
            )}
            <button
              onClick={startGame}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/30 mt-2"
            >
              Play Again
            </button>
            <p className="text-slate-500 text-xs">Press Enter to restart</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg mt-4">
        {/* Action buttons */}
        <div className="flex justify-center gap-3 mb-4">
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all active:scale-95"
            >
              ⏸ Pause
            </button>
          )}
          {gameState === 'paused' && (
            <button
              onClick={togglePause}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-lg transition-all active:scale-95"
            >
              ▶ Resume
            </button>
          )}
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={startGame}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all active:scale-95"
            >
              🔄 Restart
            </button>
          )}
        </div>

        {/* Mobile D-pad */}
        <div className="md:hidden flex flex-col items-center gap-1">
          <button
            onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('UP'); }}
            className="w-14 h-14 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 rounded-xl flex items-center justify-center text-white text-xl transition-all active:scale-90 shadow-lg"
          >
            ▲
          </button>
          <div className="flex gap-1">
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('LEFT'); }}
              className="w-14 h-14 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 rounded-xl flex items-center justify-center text-white text-xl transition-all active:scale-90 shadow-lg"
            >
              ◀
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); togglePause(); }}
              className="w-14 h-14 bg-slate-700/50 hover:bg-slate-600 active:bg-slate-500 rounded-xl flex items-center justify-center text-white text-xs font-bold transition-all active:scale-90 shadow-lg"
            >
              {gameState === 'paused' ? '▶' : '⏸'}
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('RIGHT'); }}
              className="w-14 h-14 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 rounded-xl flex items-center justify-center text-white text-xl transition-all active:scale-90 shadow-lg"
            >
              ▶
            </button>
          </div>
          <button
            onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('DOWN'); }}
            className="w-14 h-14 bg-slate-700/80 hover:bg-slate-600 active:bg-slate-500 rounded-xl flex items-center justify-center text-white text-xl transition-all active:scale-90 shadow-lg"
          >
            ▼
          </button>
        </div>

        {/* Desktop instructions */}
        <div className="hidden md:block text-center text-slate-500 text-xs space-y-1">
          <p>Arrow keys / WASD to move • Space to pause • R to restart</p>
        </div>
      </div>
    </div>
  );
}
