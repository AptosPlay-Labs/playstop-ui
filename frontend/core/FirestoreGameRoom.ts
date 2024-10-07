import { db } from '../config/firebase';
import { collection, limit, orderBy, query, where, onSnapshot } from 'firebase/firestore';

interface Player {
  color: string;
  wallet: string;
  winner: boolean;
  play: boolean;
}

interface GameRoom {
  id: string;
  players: Player[];
  currentPlayerWallet: string;
  grid: string;
  totalPlayers: number;
  turnEndTime: string;
  winnerWallet: string | null;
  isBettingRoom: boolean;
  roomIdContract:number;
  betAmount:any;
  status: string | null;
  playersWallets: string[];
  createRoomTime: number; // Timestamp in milliseconds
}

class BettingGames {
  private roomsCollection = collection(db, 'games');
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
          players: data.players,
          currentPlayerWallet: data.currentPlayerWallet,
          grid: data.grid,
          status: data.status,
          totalPlayers: data.totalPlayers,
          turnEndTime: data.turnEndTime,
          winnerWallet: data.players.find((player: Player) => player.winner)?.wallet || null,
          isBettingRoom: data.isBettingRoom || false,
          roomIdContract: data.roomIdContract,
          betAmount: data.betAmount,
          playersWallets: data.playersWallets || [],
          createRoomTime: data.createRoomTime.toMillis()
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
  private roomsCollection = collection(db, 'games');
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
          players: data.players,
          currentPlayerWallet: data.currentPlayerWallet,
          grid: data.grid,
          status: data.status,
          totalPlayers: data.totalPlayers,
          turnEndTime: data.turnEndTime,
          winnerWallet: data.players.find((player: Player) => player.winner)?.wallet || null,
          isBettingRoom: data.isBettingRoom || false,
          roomIdContract: data.roomIdContract,
          betAmount: data.betAmount,
          playersWallets: data.playersWallets || [],
          createRoomTime: data.createRoomTime.toMillis()
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
  private roomsCollection = collection(db, 'games');
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
          players: data.players,
          currentPlayerWallet: data.currentPlayerWallet,
          grid: data.grid,
          status: data.status,
          totalPlayers: data.totalPlayers,
          turnEndTime: data.turnEndTime,
          winnerWallet: data.players.find((player: Player) => player.winner)?.wallet || null,
          isBettingRoom: data.isBettingRoom || false,
          roomIdContract: data.roomIdContract,
          betAmount: data.betAmount,
          playersWallets: data.playersWallets || [],
          createRoomTime: data.createRoomTime.toMillis()
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
