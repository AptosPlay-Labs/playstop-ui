// store/notificateStore.ts
import { create } from 'zustand';

interface NotificateState {
  currentRoom: string | null;
  isSpectator: boolean;
  username:string | null;
  address: string | null;
  selectedGame: string | null;
  setSelectedGame: (selectedGame: any) => void;
  setNotifyCurrentRoom: (selectedGame: any) => void;
  setIsSpectator: (isSpectator: boolean) => void;
  setUsername: (username: any) => void;
  seAddress: (address: any) => void;
}

export const notificateStore = create<NotificateState>((set) => ({
  currentRoom: null,
  isSpectator: false,
  username:null,
  address:null,
  selectedGame:null,
  setSelectedGame: (selectedGame) => set({ selectedGame }),
  setNotifyCurrentRoom: (roomId) => set({ currentRoom: roomId }),
  setIsSpectator: (isSpectator) => set({ isSpectator }),
  setUsername:(username) => set({ username }),
  seAddress:(address) => set({ address })
}));
