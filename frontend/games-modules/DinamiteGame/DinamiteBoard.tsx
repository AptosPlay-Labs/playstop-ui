import { useEffect, useState } from "react";
import { DinamiteGameBot } from "./DinamiteGameBot";
import { DinamiteGame } from "./DinamiteGame";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { notificateStore } from '@/store/notificateStore';

interface GameState {
  isBettingRoom: boolean;
  status: string;
  // other fields you might need
}

export function DinamiteBoard() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const { currentRoom } = notificateStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGameState() {
      if (!currentRoom) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const gameRef = doc(db, 'games_ably', currentRoom);
        const gameDoc = await getDoc(gameRef);
        
        if (!gameDoc.exists()) {
          setError("Game room doesn't exist");
          setIsLoading(false);
          return;
        }

        const gameData = gameDoc.data() as GameState;
        setGameState(gameData);
        
      } catch (err) {
        console.error("Error fetching game state:", err);
        setError("Error loading game");
      } finally {
        setIsLoading(false);
      }
    }

    fetchGameState();
  }, [currentRoom]);

  if (isLoading) {
    return (
      <div className="absolute w-full h-full top-0 right-0 flex items-center justify-center min-h-screen bg-yellow-100">
        <div className="text-2xl font-bold text-yellow-800">Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute w-full h-full top-0 right-0 flex items-center justify-center min-h-screen bg-yellow-100">
        <div className="text-2xl font-bold text-red-600">{error}</div>
      </div>
    );
  }

  if (!gameState || !currentRoom) {
    return (
      <div className="absolute w-full h-full top-0 right-0 flex items-center justify-center min-h-screen bg-yellow-100">
        <div className="text-2xl font-bold text-yellow-800">Waiting for game data...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {gameState.isBettingRoom ? <DinamiteGame /> : <DinamiteGameBot />}
    </div>
  );
}