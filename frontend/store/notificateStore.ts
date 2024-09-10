// store/notificateStore.ts
import { create } from 'zustand';

interface NotificateState {
  currentRoom: string | null;
  isSpectator: boolean;
  username:string | null;
  address: string | null;
  setNotifyCurrentRoom: (roomId: any) => void;
  setIsSpectator: (isSpectator: boolean) => void;
  setUsername: (username: any) => void;
  seAddress: (address: any) => void;
}

export const notificateStore = create<NotificateState>((set) => ({
  currentRoom: null,
  isSpectator: false,
  username:null,
  address:null,
  setNotifyCurrentRoom: (roomId) => set({ currentRoom: roomId }),
  setIsSpectator: (isSpectator) => set({ isSpectator }),
  setUsername:(username) => set({ username }),
  seAddress:(address) => set({ address })
}));
