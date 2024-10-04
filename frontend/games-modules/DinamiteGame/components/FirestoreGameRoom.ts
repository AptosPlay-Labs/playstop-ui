import { db } from '../../../config/firebase';
import { collection, limit, orderBy, query, where, onSnapshot } from 'firebase/firestore';

interface Player {
  color: string;
  wallet: string;
  winner: boolean;
}

interface GameRoom {
  id: string;
  betAmount: string;
  chanel: string;
  createRoomTime: number; // Timestamp in milliseconds
  dynamiteHolder: string | null;
  explosionTime: number | null;
  isBettingRoom: boolean;
  isStart: boolean;
  players: Player[];
  playersWallets: string[];
  roomIdContract: number;
  status: string;
  totalPlayers: number;
  winner: string;
  winnerWallet: string;
}

class BettingGames {
  private roomsCollection = collection(db, 'games_ably');
  private onSnapshotCallback: ((rooms: GameRoom[]) => void) | null = null;

  constructor() {
    const q = query(
      this.roomsCollection,
      where('isBettingRoom', '==', true),
      where('status', 'in', ['live', 'waiting']),
      orderBy('createRoomTime', 'desc'),
      limit(20)
    );

    onSnapshot(q, (snapshot) => {
      const rooms: GameRoom[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          betAmount: data.betAmount,
          chanel: data.chanel,
          createRoomTime: data.createRoomTime.toMillis(),
          dynamiteHolder: data.dynamiteHolder,
          explosionTime: data.explosionTime ? data.explosionTime.toMillis() : null,
          isBettingRoom: data.isBettingRoom,
          isStart: data.isStart,
          players: data.players,
          playersWallets: data.playersWallets,
          roomIdContract: data.roomIdContract,
          status: data.status,
          totalPlayers: data.totalPlayers,
          winner: data.winner,
          winnerWallet: data.winnerWallet
        };
      });
      if (this.onSnapshotCallback) {
        this.onSnapshotCallback(rooms);
      }
    });
  }

  onSnapshot(callback: (rooms: GameRoom[]) => void) {
    this.onSnapshotCallback = callback;
  }
}

class NonBettingGames {
  private roomsCollection = collection(db, 'games_ably');
  private onSnapshotCallback: ((rooms: GameRoom[]) => void) | null = null;

  constructor() {
    const q = query(
      this.roomsCollection,
      where('isBettingRoom', '==', false),
      where('status', 'in', ['live', 'waiting']),
      orderBy('createRoomTime', 'desc'),
      limit(20)
    );

    onSnapshot(q, (snapshot) => {
      const rooms: GameRoom[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          betAmount: data.betAmount,
          chanel: data.chanel,
          createRoomTime: data.createRoomTime.toMillis(),
          dynamiteHolder: data.dynamiteHolder,
          explosionTime: data.explosionTime ? data.explosionTime.toMillis() : null,
          isBettingRoom: data.isBettingRoom,
          isStart: data.isStart,
          players: data.players,
          playersWallets: data.playersWallets,
          roomIdContract: data.roomIdContract,
          status: data.status,
          totalPlayers: data.totalPlayers,
          winner: data.winner,
          winnerWallet: data.winnerWallet
        };
      });
      if (this.onSnapshotCallback) {
        this.onSnapshotCallback(rooms);
      }
    });
  }

  onSnapshot(callback: (rooms: GameRoom[]) => void) {
    this.onSnapshotCallback = callback;
  }
}

class MyGames {
  private roomsCollection = collection(db, 'games_ably');
  private onSnapshotCallback: ((rooms: GameRoom[]) => void) | null = null;

  constructor(walletAddress: string) {
    const q = query(
      this.roomsCollection,
      where('playersWallets', 'array-contains', walletAddress),
      orderBy('createRoomTime', 'desc'),
      limit(10)
    );

    onSnapshot(q, (snapshot) => {
      const rooms: GameRoom[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          betAmount: data.betAmount,
          chanel: data.chanel,
          createRoomTime: data.createRoomTime.toMillis(),
          dynamiteHolder: data.dynamiteHolder,
          explosionTime: data.explosionTime ? data.explosionTime.toMillis() : null,
          isBettingRoom: data.isBettingRoom,
          isStart: data.isStart,
          players: data.players,
          playersWallets: data.playersWallets,
          roomIdContract: data.roomIdContract,
          status: data.status,
          totalPlayers: data.totalPlayers,
          winner: data.winner,
          winnerWallet: data.winnerWallet
        };
      });
      if (this.onSnapshotCallback) {
        this.onSnapshotCallback(rooms);
      }
    });
  }

  onSnapshot(callback: (rooms: GameRoom[]) => void) {
    this.onSnapshotCallback = callback;
  }
}

export { BettingGames, NonBettingGames, MyGames };
export type { GameRoom, Player };