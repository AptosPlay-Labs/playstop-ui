// store/gameStore.ts
import { create } from 'zustand';
import { FirestoreGame } from '../core/firebaseGame';
import { Cell, Player } from '../core/ChainReactionGame';

interface GameState {
  game: FirestoreGame | null;
  currentPlayer: Player | null;
  grid: Cell[][];
  players: Player[];
  turnEndTime: number | null;
  status: any; // Agregar status
  initializeGame: (rows: number, cols: number, gameId: string, players: Player[]) => void;
  addAtom: (row: number, col: number) => void;
  updateStatus: (newStatus: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  game: null,
  currentPlayer: null,
  grid: [],
  players: [],
  turnEndTime: null,
  status: null, // Inicializar status
  initializeGame: (rows, cols, gameId, players) => {
    const game = new FirestoreGame(rows, cols, gameId, players);
    game.onSnapshot((updatedGrid, updatedCurrentPlayer, updatedStatus) => {
      set({
        grid: updatedGrid,
        currentPlayer: updatedCurrentPlayer,
        players: game.players,
        turnEndTime: game.turnEndTime,
        status: updatedStatus // Actualizar status
      });
    });
    set({
      game,
      grid: game.grid,
      currentPlayer: game.currentPlayer,
      players: game.players,
      turnEndTime: game.turnEndTime,
      status: game.status // Inicializar status
    });
  },
  addAtom: (row, col) => {
    set((state) => {
      state.game?.addAtom(row, col);
      return {
        grid: [...state.game!.grid],
        currentPlayer: state.game!.currentPlayer,
        players: state.game!.players,
        turnEndTime: state.game!.turnEndTime,
        status: state.game!.status // Actualizar status
      };
    });
  },
  updateStatus: (newStatus: string) => {
    set((state) => {
      if (state.game) {
        state.game.status = newStatus;
        state.game.sync();
      }
      return { status: newStatus };
    });
  }
}));