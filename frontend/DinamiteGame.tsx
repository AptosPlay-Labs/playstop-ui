import React, { useEffect, useRef, useState } from 'react';
import { addDoc, collection, doc, getDocs, query, onSnapshot, updateDoc, where, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import * as Ably from 'ably';
import VirtualJoystick from './components/common/VirtualJoystick';

interface Player {
  id: string;
  x: number;
  y: number;
  color: string;
  hasDynamite: boolean;
}

interface GameState {
  players: Player[];
  dynamiteHolder: string | null;
  explosionTime: number;
}

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const MAX_PLAYERS = 2;
const ARENA_RADIUS = 180;
const PLAYER_RADIUS = 15;

const initialGameState: GameState = {
  players: [],
  dynamiteHolder: null,
  explosionTime: Date.now() + 30000,
};

const DinamiteGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [ably, setAbly] = useState<Ably.Realtime | null>(null);
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);

  const { account } = useWallet();

  useEffect(() => {
    if (account?.address) {
      initializeGame();
    }

    return () => {
      // Cleanup function
      // if (channel) {
      //   channel.unsubscribe();
      // }
      // if (ably) {
      //   ably.close();
      // }
    };
  }, [account?.address]);

  const initializeGame = async () => {
    if (!account?.address) return;
    
    try {
      // Initialize Ably
      const ablyInstance = new Ably.Realtime({ key: 'FPTfgA.aB0wSg:_YyjuDIAGM7aGA_pFp_IS2VEcXLHtZO4Ibg9Anu_NiI' });
      setAbly(ablyInstance);

      const playerQuery = query(collection(db, 'players_ably'), where('wallet', '==', account?.address));
      const playerSnapshot = await getDocs(playerQuery);
      if (playerSnapshot.docs[0]?.id) {
        setPlayerId(playerSnapshot.docs[0].id);
      }

      // Join the game
      await joinGame();

      // Set up game state listener
      const gameRef = doc(db, 'games_ably', "G4wc5hMBwefzX3r6bJ0W");
      onSnapshot(gameRef, (snapshot) => {
        console.log(snapshot.data())
        const newGameState = snapshot.data() as GameState;
        if (newGameState) {
          newGameState.explosionTime = Date.now() + 30000;
          setGameState(newGameState);
        }
      });

      // Subscribe to Ably channel
      const gameChannel = ablyInstance.channels.get('game-1726685339198')//('dinamite-game');
      setChannel(gameChannel);

      gameChannel.subscribe('playerMove', (message) => {
        const { id, x, y } = message.data;
        console.log({ id, x, y })
        updatePlayerPosition(id, x, y);
      });
    } catch (error) {
      console.error("Error initializing game:", error);
    }
  };

  const joinGame = async () => {
    if (!account?.address || !playerId) return;

    try {
      const gameRef = doc(db, 'games_ably', "G4wc5hMBwefzX3r6bJ0W");
      const gameDoc = await getDoc(gameRef);

      if (gameDoc.exists()) {
        const currentGame = gameDoc.data() as GameState;
        const existingPlayer = currentGame.players.find(p => p.id === playerId);

        if (!existingPlayer && currentGame.players.length < MAX_PLAYERS) {
          const angle = (currentGame.players.length / MAX_PLAYERS) * Math.PI * 2;
          const newPlayer: Player = {
            id: playerId,
            x: ARENA_RADIUS * Math.cos(angle) + 200,
            y: ARENA_RADIUS * Math.sin(angle) + 200,
            color: COLORS[currentGame.players.length],
            hasDynamite: currentGame.players.length === 0
          };
          const updatedPlayers = [...currentGame.players, newPlayer];
          await updateDoc(gameRef, { 
            players: updatedPlayers,
            dynamiteHolder: currentGame.players.length === 0 ? playerId : currentGame.dynamiteHolder
          });
        }
      } else {
        // Create a new game if it doesn't exist
        const gameRoomsCollection = collection(db, 'games_ably');
        const gameData = {
          players: [{
            id: playerId,
            x: 200,
            y: 200,
            color: COLORS[0],
            hasDynamite: true
          }],
          dynamiteHolder: playerId,
          explosionTime: Date.now() + 30000
        };
        await addDoc(gameRoomsCollection, gameData);
      }
    } catch (error) {
      console.error("Error joining game:", error);
    }
  };

  const updatePlayerPosition = (id: string, x: number, y: number) => {
    setGameState(prevState => ({
      ...prevState,
      players: prevState.players.map(p => 
        p.id === id ? { ...p, x, y } : p
      )
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!account?.address || !playerId) return;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    let newX = player.x;
    let newY = player.y;
    const speed = 40;

    switch (e.key) {
      case 'ArrowUp': newY -= speed; break;
      case 'ArrowDown': newY += speed; break;
      case 'ArrowLeft': newX -= speed; break;
      case 'ArrowRight': newX += speed; break;
    }

    const distanceFromCenter = Math.sqrt(Math.pow(newX - 200, 2) + Math.pow(newY - 200, 2));
    if (distanceFromCenter > ARENA_RADIUS - PLAYER_RADIUS) {
      const angle = Math.atan2(newY - 200, newX - 200);
      newX = 200 + (ARENA_RADIUS - PLAYER_RADIUS) * Math.cos(angle);
      newY = 200 + (ARENA_RADIUS - PLAYER_RADIUS) * Math.sin(angle);
    }

    //updatePlayerPosition(playerId, newX, newY);

    // Send position update through Ably
    if (channel) {
      channel.publish('playerMove', { id: playerId, x: newX, y: newY });
    }
  };

  // const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, time: number) => {
  //   const { x, y, color, hasDynamite } = player;
  //   const scale = 0.5;
  //   const bodyRadius = PLAYER_RADIUS * scale;
  //   const headRadius = bodyRadius * 0.6;
  //   const legLength = bodyRadius * 0.8;
  //   const armLength = bodyRadius * 0.7;
  
  //   // Sombra
  //   ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  //   ctx.beginPath();
  //   ctx.ellipse(x + 5, y + 5, bodyRadius * 1.2, bodyRadius * 0.7, 0, 0, Math.PI * 2);
  //   ctx.fill();
  
  //   // Cuerpo
  //   ctx.fillStyle = color;
  //   ctx.beginPath();
  //   ctx.arc(x, y, bodyRadius, 0, Math.PI * 2);
  //   ctx.fill();
  
  //   // Cabeza
  //   ctx.fillStyle = '#FFD700';
  //   ctx.beginPath();
  //   ctx.arc(x, y - bodyRadius * 0.5, headRadius, 0, Math.PI * 2);
  //   ctx.fill();
  
  //   // Animación de piernas
  //   const legAngle = Math.sin(time * 0.01) * 0.3;
  //   ctx.strokeStyle = color;
  //   ctx.lineWidth = 3;
  //   ctx.beginPath();
  //   ctx.moveTo(x - bodyRadius * 0.3, y);
  //   ctx.lineTo(x - bodyRadius * 0.3 - Math.sin(legAngle) * legLength, y + Math.cos(legAngle) * legLength);
  //   ctx.moveTo(x + bodyRadius * 0.3, y);
  //   ctx.lineTo(x + bodyRadius * 0.3 - Math.sin(-legAngle) * legLength, y + Math.cos(-legAngle) * legLength);
  //   ctx.stroke();
  
  //   // Brazos
  //   ctx.beginPath();
  //   ctx.moveTo(x - bodyRadius, y - bodyRadius * 0.2);
  //   ctx.lineTo(x - bodyRadius - armLength, y - bodyRadius * 0.2 + Math.sin(time * 0.01) * 5);
  //   ctx.moveTo(x + bodyRadius, y - bodyRadius * 0.2);
  //   ctx.lineTo(x + bodyRadius + armLength, y - bodyRadius * 0.2 + Math.sin(time * 0.01 + Math.PI) * 5);
  //   ctx.stroke();
  
  //   // Dinamita (si el jugador la tiene)
  //   if (hasDynamite) {
  //     drawDynamite(ctx, x + bodyRadius + armLength, y - bodyRadius * 0.2 + Math.sin(time * 0.01 + Math.PI) * 5);
  //   }
  // };

  //public/players/personaje.svg
  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    const time = Date.now();
    const { x, y, color, hasDynamite } = player;
    const scale = 0.8;
    const bodyRadius = PLAYER_RADIUS * scale;
    const headRadius = bodyRadius * 0.6;
    const eyeRadius = headRadius * 0.3;
    const armLength = bodyRadius * 1.2;
    const legLength = bodyRadius * 0.8;
  
    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 5, y + 5, bodyRadius * 1.2, bodyRadius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  
    // Cuerpo
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, bodyRadius, 0, Math.PI * 2);
    ctx.fill();
  
    // Cabeza
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y - bodyRadius * 0.8, headRadius, 0, Math.PI * 2);
    ctx.fill();
  
    // Ojos
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x - headRadius * 0.3, y - bodyRadius * 0.8, eyeRadius, 0, Math.PI * 2);
    ctx.arc(x + headRadius * 0.3, y - bodyRadius * 0.8, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
  
    // Animación de piernas
    const legAngle = Math.sin(time * 0.01) * 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = bodyRadius * 0.3;
    ctx.lineCap = 'round';
    
    // Pierna izquierda
    ctx.beginPath();
    ctx.moveTo(x - bodyRadius * 0.3, y + bodyRadius * 0.5);
    ctx.lineTo(x - bodyRadius * 0.3 - Math.sin(legAngle) * legLength, y + bodyRadius * 0.5 + Math.cos(legAngle) * legLength);
    ctx.stroke();
    
    // Pierna derecha
    ctx.beginPath();
    ctx.moveTo(x + bodyRadius * 0.3, y + bodyRadius * 0.5);
    ctx.lineTo(x + bodyRadius * 0.3 - Math.sin(-legAngle) * legLength, y + bodyRadius * 0.5 + Math.cos(-legAngle) * legLength);
    ctx.stroke();
  
    // Brazos estirados hacia adelante
    ctx.strokeStyle = color;
    ctx.lineWidth = bodyRadius * 0.25;
    ctx.beginPath();
    ctx.moveTo(x - bodyRadius * 0.5, y);
    ctx.lineTo(x - bodyRadius * 0.5 - armLength, y - bodyRadius * 0.2);
    ctx.moveTo(x + bodyRadius * 0.5, y);
    ctx.lineTo(x + bodyRadius * 0.5 + armLength, y - bodyRadius * 0.2);
    ctx.stroke();
  
    // Dinamita (si el jugador la tiene)
    if (hasDynamite) {
      drawDynamite(ctx, x + bodyRadius * 0.5 + armLength, y - bodyRadius * 0.2);
    }
  };

  const drawDynamite = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    // ctx.fillStyle = '#E74C3C';
    // ctx.fillRect(x - 5, y - 10, 10, 20);
    // ctx.fillStyle = '#F1C40F';
    // ctx.beginPath();
    // ctx.arc(x, y - 10, 2, 0, Math.PI * 2);
    // ctx.fill();
    let width = 20, height = 40
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.roundRect(x - width/2, y - height/2, width, height, 5);
    ctx.fill();

    // Etiqueta
    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(x - width/2 + 2, y - height/6, width - 4, height/4);
    
    // Texto "TNT"
    ctx.fillStyle = '#000000';
    ctx.font = `${width/3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', x, y);

    // Mecha ondulada y más corta
    ctx.strokeStyle = '#8E44AD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - height/2);
    ctx.bezierCurveTo(
      x + width/4, y - height/2 - 5,
      x + width/2, y - height/2 + 5,
      x + width/2 + 5, y - height/2 - 10
    );
    ctx.stroke();

    // Llama más detallada y más grande
    const flameX = x + width/2 + 5;
    const flameY = y - height/2 - 10;
    
    // Base de la llama (naranja)
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(flameX, flameY);
    ctx.quadraticCurveTo(flameX + 6, flameY - 12, flameX + 9, flameY);
    ctx.quadraticCurveTo(flameX + 4, flameY - 3, flameX, flameY);
    ctx.fill();

    // Centro de la llama (amarillo)
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.moveTo(flameX, flameY);
    ctx.quadraticCurveTo(flameX + 4, flameY - 9, flameX + 6, flameY);
    ctx.quadraticCurveTo(flameX + 3, flameY - 3, flameX, flameY);
    ctx.fill();

    // Punta de la llama (blanco)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(flameX, flameY);
    ctx.quadraticCurveTo(flameX + 2, flameY - 6, flameX + 3, flameY);
    ctx.quadraticCurveTo(flameX + 1.5, flameY - 2, flameX, flameY);
    ctx.fill();
  };
  
  
  const drawGame = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 400, 400);

    // Draw background
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(0, 0, 400, 400);

    // Draw arena
    ctx.fillStyle = '#f9ffb9';
    ctx.beginPath();
    ctx.arc(200, 200, ARENA_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Draw arena border
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(200, 200, ARENA_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Draw decorative elements
    drawCactus(ctx, 50, 50);
    drawCactus(ctx, 350, 350);
    drawRock(ctx, 350, 50);
    drawRock(ctx, 50, 350);

    // Draw players
    if (gameState.players && Array.isArray(gameState.players)) {
      gameState.players.forEach(player => {
        // ctx.fillStyle = player.color;
        // ctx.beginPath();
        // ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
        // ctx.fill();
        
        drawPlayer(ctx, player);
        // if (player.hasDynamite) {
        //   drawDynamite(ctx, player.x, player.y - PLAYER_RADIUS - 10);
        // }
      });
    }

    // Draw remaining time
    const timeLeft = Math.max(0, Math.floor((gameState.explosionTime - Date.now()) / 1000));
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Time: ${timeLeft}s`, 10, 30);
  };

  const drawCactus = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#2ECC71';
    ctx.beginPath();
    ctx.ellipse(x, y, 15, 25, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawRock = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#95A5A6';
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  

  // useEffect(() => {
  //   if (canvasRef.current) {
  //     const canvas = canvasRef.current;
  //     const ctx = canvas.getContext('2d');
  //     if (ctx) {
  //       drawGame(ctx);
  //     }
  //   }
  // }, [gameState]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawGame(ctx);
        }
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(intervalId);
  }, [gameState]);


  const joystickMove = (x: number, y: number) => {
    if (!account?.address || !playerId) return;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    const speed = 300; // Adjust this value to control the speed of movement
    let newX = player.x + x * speed;
    let newY = player.y + y * speed;

    // Ensure the player stays within the arena
    const distanceFromCenter = Math.sqrt(Math.pow(newX - 200, 2) + Math.pow(newY - 200, 2));
    if (distanceFromCenter > ARENA_RADIUS - PLAYER_RADIUS) {
      const angle = Math.atan2(newY - 200, newX - 200);
      newX = 200 + (ARENA_RADIUS - PLAYER_RADIUS) * Math.cos(angle);
      newY = 200 + (ARENA_RADIUS - PLAYER_RADIUS) * Math.sin(angle);
    }

    // Send position update through Ably
    if (channel) {
      channel.publish('playerMove', { id: playerId, x: newX, y: newY });
    }
  };

  return (
      // Aqui el div debe ser full scream para que sea exacto toda la pantalla
      // position: absolute;
      // width: 100%;
      // height: 100vh;
      // top: 0;
      // right: 0;
    <div className="absolute w-full h-full top-0 right-0 flex flex-col items-center justify-center min-h-screen bg-yellow-100">
      <h1 className="text-4xl font-bold mb-4 text-yellow-800">Dinamite</h1>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="border-4 border-yellow-600 rounded-lg shadow-lg"
        tabIndex={0}
        onKeyDown={handleKeyPress}
      />
      <VirtualJoystick size={100} onMove={joystickMove}/>
    </div>
  );
};

export default DinamiteGame;