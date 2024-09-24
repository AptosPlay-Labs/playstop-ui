import { addDoc, collection, doc, getDocs, onSnapshot, updateDoc, where, getDoc, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import * as Ably from 'ably';
import { dinamiteStore } from '@/store/dinamiteStore';
// import { useGameStore, Player, GameState } from './store/GameStateStore';

export interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
  color: string;
  hasDynamite: boolean;
}

export interface GameState {
  players: Player[];
  dynamiteHolder: string | null;
  explosionTime: number;
}

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const MAX_PLAYERS = 4;
const ARENA_RADIUS = 180;
const PLAYER_RADIUS = 20;

export class GameLogic {
  private gameState: GameState | null = null;
  private playerId: string | null = null;
  private ably: Ably.Realtime | null = null;
  private channel: Ably.RealtimeChannel | null = null;
  private refCount = 0
  
//   constructor(private onGameStateChange: (gameState: GameState) => void) {}

  async initializeGame(accountAddress: string) {
    // console.log("doble initialice")
    // if(this.refCount==1) return
    // this.refCount +=1
    
    this.ably = new Ably.Realtime({ key: 'FPTfgA.aB0wSg:_YyjuDIAGM7aGA_pFp_IS2VEcXLHtZO4Ibg9Anu_NiI' });
    await this.joinGame(accountAddress);
    const gameRef = doc(db, 'games_ably', "G4wc5hMBwefzX3r6bJ0W");
    onSnapshot(gameRef, (snapshot) => {
      const newGameState = snapshot.data() as GameState;
      if (newGameState) {
        console.log("firebase data")
        this.gameState = newGameState;
        dinamiteStore.getState().setGameDatos(newGameState);
        
        // this.onGameStateChange(newGameState);
      }
    });
    
    const channel = this.ably.channels.get('game-1726685339198');

    channel.subscribe('playerMove', (message) => {
        console.log("playerMove")
        //const { id, x, y, angle } = message.data;
        //this.updatePlayerPosition(id, x, y, angle);
    });
    this.channel = channel
  }

  async joinGame(accountAddress: string) {
    try {
      const playerQuery = query(collection(db, 'players_ably'), where('wallet', '==', accountAddress));
      const playerSnapshot = await getDocs(playerQuery);
      
      this.playerId = playerSnapshot.docs[0].id;
      
      const gameRef = doc(db, 'games_ably', "G4wc5hMBwefzX3r6bJ0W");
      const gameDoc = await getDoc(gameRef);

      if (gameDoc.exists()) {
        const currentGame = gameDoc.data() as GameState;
        const existingPlayer = currentGame.players.find(p => p.id === this.playerId);

        if (!existingPlayer && currentGame.players.length < MAX_PLAYERS) {
          const newPlayer = this.createNewPlayer(currentGame.players.length);
          const updatedPlayers = [...currentGame.players, newPlayer];
          await updateDoc(gameRef, { 
            players: updatedPlayers,
            dynamiteHolder: currentGame.players.length === 0 ? this.playerId : currentGame.dynamiteHolder
          });
        }
      } else {
        const gameRoomsCollection = collection(db, 'games_ably');
        const gameData = {
          players: [this.createNewPlayer(0)],
          dynamiteHolder: this.playerId,
          explosionTime: Date.now() + 30000
        };
        await addDoc(gameRoomsCollection, gameData);
      }
    } catch (error) {
      console.error("Error joining game:", error);
    }
  }

  private createNewPlayer(playerIndex: number): Player {
    const angleStep = (2 * Math.PI) / MAX_PLAYERS;
    const angle = playerIndex * angleStep;
    const rotationAngle = (angle + Math.PI) % (2 * Math.PI);
    const rotationAngleDegrees = (rotationAngle * 180) / Math.PI;

    return {
      id: this.playerId!,
      x: ARENA_RADIUS * Math.cos(angle) + 200,
      y: ARENA_RADIUS * Math.sin(angle) + 200,
      angle: rotationAngleDegrees,
      color: COLORS[playerIndex],
      hasDynamite: playerIndex === 0
    };
  }

updatePlayerPosition(id: string, x: number, y: number, angle: number) {
    // useGameStore.getState().updatePlayer(id, { x, y, angle });

    // console.log("actual position")
    // console.log(this.gameState)
    // console.log(x, y, angle)
    //dinamiteStore.getState()
    if (this.gameState) {
      this.gameState.players = this.gameState.players.map(player => 
        player.id === id ? { ...player, x, y, angle } : player
      );
      console.log("update position")
      dinamiteStore.getState().setGameDatos(this.gameState);
    //   this.onGameStateChange(this.gameState);
    }
  }

  handleKeyDown(e: KeyboardEvent):any {
    console.log(Date.now())
    if (!this.playerId) return;
    
    const player = this.gameState?.players.find(p => p.id === this.playerId);
    // const player = dinamiteStore.getState().gameState!.players.find(p => p.id === this.playerId);

    if (!player) return;
    
    let newX = player.x;
    let newY = player.y;
    let angle = player.angle;
    
    const speed = 20;
    
    switch (e.key) {
      case 'ArrowUp': 
        newY -= speed; 
        angle = 270;
        break;
      case 'ArrowDown': 
        newY += speed; 
        angle = 90;
        break;
      case 'ArrowLeft': 
        newX -= speed; 
        angle = 180;
        break;
      case 'ArrowRight': 
        newX += speed; 
        angle = 0;
        break;
      default: return;
    }
    
    e.preventDefault();
    
    [newX, newY] = this.constrainToArena(newX, newY);
    //se debe mejorar esta actualizacion
    //this.updatePlayerPosition(this.playerId, newX, newY, angle);
    
    if (this.channel) {
    //    console.log('e.key') 
      //this.channel.publish('playerMove', { id: this.playerId, x: newX, y: newY, angle: angle });
    }

    // return (this.playerId, newX, newY, angle)
    return { id: this.playerId, x: newX, y: newY, angle };

  }

  private constrainToArena(x: number, y: number): [number, number] {
    const centerX = 200;
    const centerY = 200;
    
    const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    if (distanceFromCenter > 160) {
      const angleToCenter = Math.atan2(y - centerY, x - centerX);
      x = centerX + 160 * Math.cos(angleToCenter);
      y = centerY + 160 * Math.sin(angleToCenter);
    }
    
    return [x, y];
  }

  cleanup() {
    if (this.channel) {
      this.channel.unsubscribe();
    }
    if (this.ably) {
      this.ably.close();
    }
  }
}