import { db } from '../config/firebase';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';

interface Player {
  wallet: string;
  winAmount: number;
  winCount: number;
  lostAmount: number;
  lostCount: number;
  actualRoom: string;
}

class FirestorePlayers {
  private playersCollection = collection(db, 'players');
  private onSnapshotCallback: ((players: Player[]) => void) | null = null;

  constructor() {
    const q = query(this.playersCollection, where('winCount', '>', 0), orderBy('winCount', 'desc'), limit(20));
    onSnapshot(q, (snapshot) => {
      const players: Player[] = snapshot.docs
      .map((doc) => doc.data() as Player)
      .filter((player) => player.winCount > player.lostCount);
      if (this.onSnapshotCallback) {
        this.onSnapshotCallback(players);
      }
    });
  }

  onSnapshot(callback: (players: Player[]) => void) {
    this.onSnapshotCallback = callback;
  }
}

export { FirestorePlayers };
export type { Player };
