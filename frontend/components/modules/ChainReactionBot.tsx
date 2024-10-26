import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Grid from '../common/Grid';
import GameCounter from '@/games-modules/DinamiteGame/components/GameCounter';
import { LoadingScreen } from "../common/LoadingScreen";
import { notificateStore } from "@/store/notificateStore";
import WonOrLostModal from '../common/WonOrLostModal';
import { useWallet } from "@aptos-labs/wallet-adapter-react";

interface Player {
  color: string;
  wallet: string;
  winner: boolean;
  moves: number;
  play: boolean;
  isBot: boolean;
}

interface Cell {
  player: any | null;
  count: number;
}

interface Position {
  row: number;
  col: number;
  priority: number;
  riskLevel?: number;
}

class ChainReactionBotGame {
  grid: Cell[][];
  rows: number;
  cols: number;
  players: Player[];
  currentPlayerIndex: number;
  isExploding: boolean;
  turnEndTime: number | null;
  gameStarted: boolean;
  gameDoc: any;
  status: string;
  totalPlayers: number;
  lastBotMove: Position | null = null;
  consecutiveFailedMoves: number = 0;

  constructor(rows: number, cols: number, gameId: string, playerWallet: string) {
    this.rows = rows;
    this.cols = cols;
    this.currentPlayerIndex = 0;
    this.isExploding = false;
    this.turnEndTime = null;
    this.gameStarted = false;
    this.status = 'waiting';
    this.totalPlayers = 2;
    this.gameDoc = doc(db, 'games', gameId);
    
    const botWallet = `0x${Array.from({length: 64}, () => 
      Math.floor(Math.random() * 16).toString(16)).join('')}`;

    this.players = [
      {
        color: 'red',
        wallet: playerWallet,
        winner: false,
        moves: 0,
        play: true,
        isBot: false
      },
      {
        color: 'blue',
        wallet: botWallet,
        winner: false,
        moves: 0,
        play: true,
        isBot: true
      }
    ];

    this.grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ player: null, count: 0 }))
    );
  }

  private calculateRiskLevel(row: number, col: number): number {
    let risk = 0;
    const cell = this.grid[row][col];
    const maxAtoms = this.getMaxAtoms(row, col);

    // Higher risk for cells close to explosion
    if (cell.count > 0) {
      risk += (cell.count / maxAtoms) * 5;
    }

    // Check adjacent cells
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;
      if (this.isValidCell(newRow, newCol)) {
        const neighborCell = this.grid[newRow][newCol];
        if (neighborCell.player?.wallet === this.players[0].wallet) {
          risk += 2;
          if (neighborCell.count === this.getMaxAtoms(newRow, newCol) - 1) {
            risk += 5;
          }
        }
      }
    }

    return risk;
  }

  getBotMove(): { row: number; col: number } | null {
    if (!this.isValidGameState()) return null;

    let moves: Position[] = [];
    let hasCriticalMove = false;

    // First pass: collect all possible moves with their priorities and risk levels
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.grid[row][col];
        const maxAtoms = this.getMaxAtoms(row, col);
        
        if (!cell.player || cell.player.wallet === this.players[1].wallet) {
          let priority = 1;
          const riskLevel = this.calculateRiskLevel(row, col);

          // Critical situation: opponent cell about to explode
          if (cell.player?.wallet === this.players[0].wallet && 
              cell.count === maxAtoms - 1) {
            priority = 10;
            hasCriticalMove = true;
          }
          // Bot's cell that could form a chain reaction
          else if (cell.player?.wallet === this.players[1].wallet && 
                   cell.count >= maxAtoms - 2) {
            priority = 8;
          }
          // Corner positions
          else if ((row === 0 || row === this.rows - 1) && 
                   (col === 0 || col === this.cols - 1)) {
            priority = 6;
          }
          // Empty cells with low risk
          else if (!cell.player && riskLevel < 3) {
            priority = 4;
          }

          moves.push({ row, col, priority, riskLevel });
        }
      }
    }

    // If we have critical moves, only consider those
    if (hasCriticalMove) {
      moves = moves.filter(move => move.priority === 10);
    }

    // Sort moves by priority (high to low) and risk level (low to high)
    moves.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return (a.riskLevel || 0) - (b.riskLevel || 0);
    });

    // Avoid repeating the last move if it wasn't successful
    if (this.lastBotMove && this.consecutiveFailedMoves > 2) {
      moves = moves.filter(move => 
        move.row !== this.lastBotMove?.row || 
        move.col !== this.lastBotMove?.col
      );
      this.consecutiveFailedMoves = 0;
    }

    if (moves.length > 0) {
      // Get the best moves (same highest priority)
      const bestPriority = moves[0].priority;
      const bestMoves = moves.filter(move => move.priority === bestPriority);
      
      // Select randomly from the best moves
      const selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      this.lastBotMove = selectedMove;
      return { row: selectedMove.row, col: selectedMove.col };
    }

    this.consecutiveFailedMoves++;
    return null;
  }

  async initializeFirebase() {
    try {
      await updateDoc(this.gameDoc, {
        grid: JSON.stringify(this.grid),
        currentPlayerWallet: this.players[0].wallet,
        turnEndTime: null,
        players: this.players,
        status: 'waiting',
        totalPlayers: this.totalPlayers,
        playersWallets: this.players.map(p => p.wallet)
      });
    } catch (error) {
      console.error("Error initializing game in Firebase:", error);
    }
  }

  async sync() {
    try {
      await updateDoc(this.gameDoc, {
        grid: JSON.stringify(this.grid),
        currentPlayerWallet: this.players[this.currentPlayerIndex].wallet,
        turnEndTime: this.turnEndTime ? Timestamp.fromMillis(this.turnEndTime) : null,
        players: this.players,
        status: this.status,
        playersWallets: this.players.map(p => p.wallet)
      });
    } catch (error) {
      console.error("Error syncing game state:", error);
    }
  }

  get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  isValidGameState(): boolean {
    return this.players.length > 0 && 
           this.currentPlayerIndex >= 0 && 
           this.currentPlayerIndex < this.players.length &&
           this.status === 'live' &&
           this.gameStarted;
  }

  async nextTurn() {
    if (this.isExploding) return;
    
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.turnEndTime = Date.now() + 15000;
    
    if (this.currentPlayer.isBot) {
      const hasValidMove = this.getBotMove() !== null;
      if (!hasValidMove) {
        this.consecutiveFailedMoves++;
        await this.nextTurn();
        return;
      }
    }
    
    await this.sync();
  }

  // Continuación de la clase ChainReactionBotGame
  async addAtom(row: number, col: number) {
    const cell = this.grid[row][col];
    if (cell.player?.wallet === this.currentPlayer.wallet || cell.player === null) {
      cell.player = { 
        wallet: this.currentPlayer.wallet, 
        color: this.currentPlayer.color 
      };
      cell.count += 1;
      this.currentPlayer.moves += 1;

      if (cell.count >= this.getMaxAtoms(row, col)) {
        this.isExploding = true;
        await this.explode(row, col);
        this.isExploding = false;
      }

      if (this.currentPlayer.isBot) {
        if (this.lastBotMove && 
            this.lastBotMove.row === row && 
            this.lastBotMove.col === col) {
          this.consecutiveFailedMoves = 0;
        } else {
          this.consecutiveFailedMoves++;
        }
      }
      
      const winner = this.checkWinner();
      if (!winner) {
        await this.nextTurn();
      }
      return true;
    }
    return false;
  }

  getMaxAtoms(row: number, col: number): number {
    let maxAtoms = 4;
    if ((row === 0 && col === 0) || 
        (row === 0 && col === this.cols - 1) ||
        (row === this.rows - 1 && col === 0) ||
        (row === this.rows - 1 && col === this.cols - 1)) {
      maxAtoms = 2;
    } else if (row === 0 || row === this.rows - 1 || col === 0 || col === this.cols - 1) {
      maxAtoms = 3;
    }
    return maxAtoms;
  }

  async explode(row: number, col: number) {
    const cell = this.grid[row][col];
    const player = cell.player;
    cell.count = 0;
    cell.player = null;

    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    
    for (const [dx, dy] of directions) {
      const newRow = row + dx;
      const newCol = col + dy;
      if (this.isValidCell(newRow, newCol)) {
        const neighborCell = this.grid[newRow][newCol];
        neighborCell.player = { ...player };
        neighborCell.count += 1;
        if (neighborCell.count >= this.getMaxAtoms(newRow, newCol)) {
          await this.explode(newRow, newCol);
        }
      }
    }

    await this.sync();
  }

  checkWinner(): Player | null {
    if (this.players.every(player => player.moves > 0)) {
      const playerCells = this.grid.flat().reduce((acc, cell) => {
        if (cell.player) {
          acc[cell.player.wallet] = (acc[cell.player.wallet] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      if (Object.keys(playerCells).length === 0) return null;

      if (Object.keys(playerCells).length === 1) {
        const winner = this.players.find(p => p.wallet === Object.keys(playerCells)[0]);
        if (winner) {
          winner.winner = true;
          this.status = 'completed';
          this.sync();
          return winner;
        }
      }
    }
    return null;
  }

  isValidCell(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  async startGame() {
    this.gameStarted = true;
    this.status = 'live';
    await this.sync();
  }

  async cleanupGame() {
    try {
      await updateDoc(this.gameDoc, {
        status: 'completed'
      });
    } catch (error) {
      console.error("Error cleaning up game:", error);
    }
  }
}

export function ChainReactionBot() {
  const { currentRoom, setNotifyCurrentRoom } = notificateStore();
  const { account } = useWallet();
  const [game, setGame] = useState<ChainReactionBotGame | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [showCounter, setShowCounter] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(15000);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [wonAmount, setWonAmount] = useState(0);
  const [statusGame, setStatusGame] = useState('');
  const [roomCodeContract, setRoomCodeContract] = useState(0);
  const [isBettingRoom, setIsBettingRoom] = useState(false);
  const botTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isBotThinkingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const gameCleanedUpRef = useRef(false);
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateGame = useCallback(() => {
    if (game) {
      setGrid([...game.grid]);
      setWonAmount(0)
      setRoomCodeContract(0)
      setIsBettingRoom(false)
    }
  }, [game]);

  const makeBotMove = useCallback(async () => {
    if (!game || 
        isBotThinkingRef.current || 
        isProcessingRef.current || 
        game.checkWinner() || 
        !game.isValidGameState()) return;

    isBotThinkingRef.current = true;
    
    try {
      const botMove = game.getBotMove();
      if (botMove) {
        await game.addAtom(botMove.row, botMove.col);
        updateGame();
      } else {
        await game.nextTurn();
        updateGame();
      }
    } catch (error) {
      console.error("Bot move error:", error);
      await game.nextTurn();
      updateGame();
    } finally {
      isBotThinkingRef.current = false;
      // Asegurar que el bot tenga otra oportunidad si falló
      if (game.currentPlayer.isBot && !game.checkWinner()) {
        movementTimeoutRef.current = setTimeout(makeBotMove, 1000);
      }
    }
  }, [game, updateGame]);

  useEffect(() => {
    const initializeGame = async () => {
      if (!currentRoom || !account?.address) return;

      try {
        const gameRef = doc(db, 'games', currentRoom);
        const gameDoc = await getDoc(gameRef);
        
        if (gameDoc.exists()) {
          const data = gameDoc.data();
          if (data.players.length < data.totalPlayers && data.status === 'waiting') {
            const newGame = new ChainReactionBotGame(8, 8, currentRoom, account.address);
            await newGame.initializeFirebase();
            setGame(newGame);
            setGrid(newGame.grid);
            setShowCounter(true);
          } else {
            setNotifyCurrentRoom(null);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing game:", error);
        setLoading(false);
        setNotifyCurrentRoom(null);
      }
    };

    initializeGame();

    return () => {
      cleanupResources();
    };
  }, [currentRoom, account?.address, setNotifyCurrentRoom]);

  const cleanupResources = () => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    if (movementTimeoutRef.current) clearTimeout(movementTimeoutRef.current);
    if (game && !gameCleanedUpRef.current) {
      gameCleanedUpRef.current = true;
      game.cleanupGame();
    }
  };

  useEffect(() => {
    if (!game || !game.gameStarted) return;

    const timer = setInterval(async () => {
      if (game.turnEndTime && !isProcessingRef.current) {
        const remaining = game.turnEndTime - Date.now();
        setTimeLeft(remaining > 0 ? remaining : 0);
        
        if (remaining <= 0 && !game.checkWinner()) {
          isProcessingRef.current = true;
          try {
            if (game.currentPlayer.isBot) {
              await makeBotMove();
            } else {
              await game.nextTurn();
              updateGame();
            }
          } finally {
            isProcessingRef.current = false;
          }
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [game, game?.gameStarted, makeBotMove, updateGame]);

  useEffect(() => {
    if (game?.currentPlayer?.isBot && 
        game.gameStarted && 
        !game.checkWinner() && 
        !isBotThinkingRef.current && 
        !isProcessingRef.current) {
      movementTimeoutRef.current = setTimeout(makeBotMove, 1000);

      return () => {
        if (movementTimeoutRef.current) {
          clearTimeout(movementTimeoutRef.current);
        }
      };
    }
  }, [game?.currentPlayer?.wallet, game?.gameStarted, makeBotMove]);

  const handleClick = useCallback(async (row: number, col: number) => {
    if (!game || 
        game.currentPlayer.isBot || 
        game.checkWinner() || 
        !game.gameStarted || 
        isBotThinkingRef.current || 
        isProcessingRef.current) return;

    if (await game.addAtom(row, col)) {
      updateGame();
    }
  }, [game, updateGame]);

  useEffect(() => {
    if (!game || !game.gameStarted) return;

    const timer = setInterval(() => {
      if (game.turnEndTime) {
        const remaining = game.turnEndTime - Date.now();
        setTimeLeft(remaining > 0 ? remaining : 0);
        
        if (remaining <= 0 && !game.checkWinner()) {
          if (game.currentPlayer.isBot && !isBotThinkingRef.current) {
            makeBotMove();
          } else if (!game.currentPlayer.isBot) {
            game.nextTurn();
            updateGame();
          }
        }
      }
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, [game, game?.gameStarted, makeBotMove, updateGame]);

  useEffect(() => {
    if (game && 
        game.gameStarted && 
        game.currentPlayer.isBot && 
        !isBotThinkingRef.current && 
        !game.checkWinner()) {
      botTimeoutRef.current = setTimeout(makeBotMove, 1000);
      return () => {
        if (botTimeoutRef.current) {
          clearTimeout(botTimeoutRef.current);
        }
      };
    }
  }, [game?.currentPlayer?.wallet, game?.gameStarted, makeBotMove]);

  useEffect(() => {
    if (game) {
      const winner = game.checkWinner();
      if (winner) {
        const isPlayerWinner = winner.wallet === account?.address;
        setIsWon(isPlayerWinner);
        setStatusGame(isPlayerWinner ? 'playerWinner' : 'botWinner');
        setModalOpen(true);
      }
    }
  }, [game, grid, account?.address]);

  const handleCountdownEnd = async () => {
    if (!game) return;
    
    setShowCounter(false);
    await game.startGame();
    game.turnEndTime = Date.now() + 15000;
    updateGame();
  };

//   const formatAddress = useCallback((addr: string) => {
//     if (addr === account?.address) return 'You';
//     return addr;
//   }, [account?.address]);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 8)}`;
  };


  if (loading) {
    return <LoadingScreen />;
  }

  if (!game) {
    return (
      <div className='absolute inset-0 flex items-center justify-center bg-purple-500 min-h-screen'>
        <div className="text-2xl font-bold text-white">Waiting for game initialization...</div>
      </div>
    );
  }

  return (
    <div className='absolute inset-0 flex items-center justify-center bg-purple-500 min-h-screen'>
      {loading && <LoadingScreen />}
      
      <div className='mt-9'>
        <div className="current-turn-banner bg-white bg-opacity-20 p-4 rounded-lg shadow-md mb-8 overflow-hidden">
            <h2 className="text-3xl font-bold text-center text-white flex items-center justify-center">
            <span>Current Turn: </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={game.currentPlayer.color}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}    
                className={`text-[14px] ml-2 ${game.currentPlayer.color === 'red' ? 'text-red-600' : 'text-blue-600'}`}
              >
                {/* {formatAddress(game.currentPlayer.wallet)} */}
                {game.currentPlayer.wallet}
              </motion.span>
            </AnimatePresence>
          </h2>
        </div>

        <div className="flex">
          <div className="game-board flex-grow">
            <Grid
              grid={grid}
              handleClick={handleClick}
              currentPlayer={game.currentPlayer}
            />
          </div>

          <div className="game-info w-64 ml-8">
            <motion.div 
              className="bg-white bg-opacity-10 p-4 rounded-lg shadow-md mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-bold mb-2 text-white">Game Info:</h3>
              <ul>
                <li className="text-white mb-2">Game Status: {game.status}</li>
              </ul>
              <h3 className="text-xl font-bold mb-2 text-white mt-4">Players:</h3>
              <ul>
                {game.players.map((player, index) => (
                  <li key={index} className="mb-2 flex items-center">
                    <span 
                      className={`w-3 h-3 rounded-full mr-2 ${
                        player.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-sm text-white flex justify-between items-center w-full">
                      <span>{formatAddress(player.wallet)}</span>
                      {player.winner && (
                        <span className="ml-2 font-bold text-green-400">
                          (Winner!)
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div 
              className="bg-white bg-opacity-10 p-4 rounded-lg shadow-md"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-xl font-bold mb-2 text-white">Turn Timer</h3>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                      {Math.ceil(timeLeft / 1000)}s
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                  <motion.div 
                    style={{ width: `${(timeLeft / 15000) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-700"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / 15000) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {showCounter && (
        <GameCounter onCountdownEnd={handleCountdownEnd} />
      )}

      <WonOrLostModal
        isOpen={isModalOpen}
        amount={wonAmount}
        isBet={isBettingRoom}
        isWon={isWon}
        status_game={statusGame}
        room_code_contract={roomCodeContract}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}