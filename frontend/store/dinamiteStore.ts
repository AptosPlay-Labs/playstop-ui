import {create} from 'zustand';
import { GameState } from '../games-modules/DinamiteGame/GameLogic';

interface EstadoStore {
    gameState: GameState | null;
    setGameDatos: (gameState: GameState) => void;
}

export const dinamiteStore = create<EstadoStore>((set) => ({
    gameState: null,
    setGameDatos: (gameState) => {
        console.log('Actualizando gameState:', gameState);
        set({ gameState })},
}));