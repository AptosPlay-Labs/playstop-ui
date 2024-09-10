// core/ChainReactionGame.ts
import { Timestamp } from 'firebase/firestore';

export interface Player {
  color: string;
  wallet: string;
  winner: boolean;
  moves: number;
  play: boolean;
}

export interface Cell {
  player: any | null;
  count: number;
}

export class ChainReactionGame {
  grid: Cell[][];
  rows: number;
  cols: number;
  isBettingRoom: boolean;
  players: Player[];
  currentPlayerWallet: string;
  turnEndTime: number | null = null;
  private isExploding: boolean;

  constructor(rows: number, cols: number, players: Player[]) {
    this.rows = rows;
    this.cols = cols;
    this.players = players;
    this.currentPlayerWallet = players.length>0?players[0].wallet:"";
    this.isExploding = false;
    this.isBettingRoom = false;
    this.grid = 
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ player: null, count: 0 }))
    );

    this.players.forEach(player => {
      player.moves = 0;
    });
  }

  get currentPlayer(): Player {
    return this.players.find(player => player.wallet === this.currentPlayerWallet)!;
  }

  nextTurn() {
    if (!this.isExploding) {
      const currentIndex = this.players.findIndex(player => player.wallet === this.currentPlayerWallet);
      this.currentPlayerWallet = this.players[(currentIndex + 1) % this.players.length].wallet;
      this.turnEndTime = Timestamp.now().toMillis() + 30000; // 30 segundos en el futuro
    }
  }

  addAtom(row: number, col: number) {
    const cell = this.grid[row][col];
    if (cell.player?.wallet === this.currentPlayerWallet || cell.player === null) {
      cell.player = { wallet: this.currentPlayer.wallet, color: this.currentPlayer.color }; // Crear una copia del jugador
      cell.count += 1;
      this.currentPlayer.moves += 1;
      if (cell.count >= this.maxAtoms()) {
        this.isExploding = true;
        this.explode(row, col);
        this.isExploding = false;
      }
      this.nextTurn();
    }
  }

  maxAtoms(): number {
    return 4;
  }

  explode(row: number, col: number) {
    const cell = this.grid[row][col];
    const player = cell.player;
    cell.count = 0;
    cell.player = null;
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    directions.forEach(([dx, dy]) => {
      const newRow = row + dx;
      const newCol = col + dy;
      if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
        const neighborCell:any = this.grid[newRow][newCol];
        neighborCell.player = { ...player }; // Crear una copia del jugador
        neighborCell.count += 1;
        if (neighborCell.count >= this.maxAtoms()) {
          this.explode(newRow, newCol);
        }
      }
    });
  }

  checkWinner() {
    if(this.players.length > 1) {
      this.players.forEach(player => {
        player.winner = false;
      });

      const playerCells = this.grid.flat().reduce((acc, cell) => {
        if (cell.player) {
          acc[cell.player.wallet] = (acc[cell.player.wallet] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const playersWithCells = this.players.filter(player => playerCells[player.wallet] > 0);

      const allPlayersHadTurns = this.players.every(player => player.moves > 0);

      if (playersWithCells.length === 1 && allPlayersHadTurns) {
        playersWithCells[0].winner = true;
      }
    }
  }
}
