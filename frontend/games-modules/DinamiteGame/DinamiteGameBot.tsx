import { useCallback, useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { changePlayerSVG, setupArena, setupDecorativeElements } from './components/ElementGame';
import GameCounter from './components/GameCounter';
import { notificateStore } from '@/store/notificateStore';
import WonOrLostModal from './components/WonOrLostModal';

interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
  color: string;
  hasDynamite: boolean;
  isDead: boolean;
  wallet: string;
  isBot: boolean;
}

interface GameState {
  players: Player[];
  dynamiteHolder: string | null;
  explosionTime: number;
  winner: string | null;
  isStart: boolean;
  winnerWallet: string;
  status: string;
  roomIdContract: number;
  totalPlayers: number;
  isBettingRoom: boolean;
  betAmount: any;
  playersWallets: string[];
}

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const ARENA_RADIUS = 180;
const PLAYER_RADIUS = 16;
const BOT_MOVE_INTERVAL = 200; // Interval for bot movement in milliseconds
const BOT_SPEED = 18; // 20 Increased speed for faster movements
const MIN_BOT_SPEED = 15;
const MAX_BOT_SPEED = 25;
const CENTER_X = 200;
const CENTER_Y = 200;


export function DinamiteGameBot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  //const [gameState, setGameState] = useState<GameState>();
  const [playerId, setPlayerId] = useState<string | null>(null);
  //const gameStateRef = useRef<GameState>();
  const gameStateRef = useRef<GameState>({
    players: [],
    dynamiteHolder: null,
    explosionTime: 0,
    winner: null,
    isStart: false,
    winnerWallet: '',
    status: '',
    roomIdContract: 0,
    totalPlayers: 0,
    isBettingRoom: false,
    betAmount: 0,
    playersWallets: []
  });
  // const startCountRef = useRef<any>(0);
  const [showCounter, setShowCounter] = useState(false);
  const { currentRoom } = notificateStore();
  const [isModalOpen, setModalOpen] = useState(false);
  const [statusContractGame, setStatusContractGame] = useState('');
  const [isWon, setIsWon] = useState(false);
  const [isPlayEnd, setIsPlayEnd] = useState(false);
  const [wonAmount, setWonAmount] = useState(0);
  const playGameAfterStart = useRef(false);
  // const explosionTimeoutRef = useRef<any>(null);
  const startDynamitePassingTimeoutRef = useRef<any>(null);
  const botMoveIntervalRef = useRef<any>(null);
  const { setNotifyCurrentRoom, setIsSpectator } = notificateStore();
  const gifref = useRef<any>(null);
  


  const { account } = useWallet();

  useEffect(() => {
    // gameStateRef.current = gameState;
    // console.log(gameState)
    if (gameStateRef.current?.winner && gameStateRef.current.winner !== '' && gameStateRef.current.winner !== null) {
      playGameAfterStart.current = false;
      let amount = parseFloat(gameStateRef.current?.betAmount);
      amount = amount * gameStateRef.current.totalPlayers;
      setWonAmount(amount);
      setIsWon(gameStateRef.current?.winnerWallet === account?.address);
      let statusGame = `${gameStateRef.current.winner}winner`;
      setStatusContractGame(statusGame);
      setIsPlayEnd(true);
      setModalOpen(true);
    } else {
      let playerStatus = gameStateRef.current?.players.find(p => p.wallet === account?.address);

      if (gameStateRef.current && playerStatus && playerStatus.isDead) {
        setIsWon(false);
        setIsPlayEnd(false);
        setModalOpen(true);
      }

      if (gameStateRef.current?.isStart && gameStateRef.current.winner !== ''  &&gameStateRef.current.winner !== null && gameStateRef.current.status === "live" && !playerStatus?.isDead) {
        playGameAfterStart.current = true;
      }
    }
  }, [gameStateRef.current, currentRoom]);

  useEffect(() => {
    if (account?.address) {
      if(gifref.current==1) return
        gifref.current+=1
      initializeGame();
    }
    
    return () => {
      if (canvas) {
        canvas.dispose();
      }
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(botMoveIntervalRef.current);
    };
  }, [account?.address]);


  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    
    if (!playerId || !canvas || !currentRoom) return;
    if (!playGameAfterStart.current) return;
    
    const player = gameStateRef.current?.players.find((p: any) => p.id === playerId);
    if (!player) return;
    
    let newX = player.x;
    let newY = player.y;
    let angle = player.angle || 0;
    
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
    
    const centerX = 200;
    const centerY = 200;
    
    const distanceFromCenter = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2));
    if (distanceFromCenter > 160) {
      const angleToCenter = Math.atan2(newY - centerY, newX - centerX);
      newX = centerX + 160 * Math.cos(angleToCenter);
      newY = centerY + 160 * Math.sin(angleToCenter);
    }

    // console.log(playerId)
    const collidedPlayer = gameStateRef.current?.players.find((p: any) => 
      p.id !== playerId && !p.isDead &&
      Math.sqrt(Math.pow(p.x - newX, 2) + Math.pow(p.y - newY, 2)) < PLAYER_RADIUS * 2
    );
    
    if (collidedPlayer) {
      // const pushAngle = Math.atan2(collidedPlayer.y - newY, collidedPlayer.x - newX);
      // const pushDistance = PLAYER_RADIUS * 2 - Math.sqrt(Math.pow(collidedPlayer.x - newX, 2) + Math.pow(collidedPlayer.y - newY, 2));
      
      // newX -= Math.cos(pushAngle) * pushDistance / 0.5;
      // newY -= Math.sin(pushAngle) * pushDistance / 0.5;
      
      // const newCollidedX = collidedPlayer.x + Math.cos(pushAngle) * pushDistance / 0.5;
      // const newCollidedY = collidedPlayer.y + Math.sin(pushAngle) * pushDistance / 0.5;
      
      
      // gameStateRef.current = {
      //   ...gameStateRef.current,
      //   players: gameStateRef.current.players.map((p: any) =>
      //     p.id === collidedPlayer.id 
      //       ? { ...p, x: newCollidedX, y: newCollidedY, angle: collidedPlayer.angle } 
      //       : p
      //   )
      // };
      const pushAngle = Math.atan2(collidedPlayer.y - newY, collidedPlayer.x - newX);
      const pushDistance = PLAYER_RADIUS * 3;
      
      const newCollidedX = collidedPlayer.x + Math.cos(pushAngle) * pushDistance / 2;
      const newCollidedY = collidedPlayer.y + Math.sin(pushAngle) * pushDistance / 2;
      updatePlayerPosition(canvas, collidedPlayer.id, newCollidedX, newCollidedY, collidedPlayer.angle);

      // updatePlayerPosition(canvas, collidedPlayer.id, newCollidedX, newCollidedY, collidedPlayer.angle);

      if (player.hasDynamite) {
        console.log(collidedPlayer.id)
        updateDynamiteHolder(collidedPlayer.id);
      } else if (collidedPlayer.hasDynamite) {
        console.log(playerId)
        updateDynamiteHolder(playerId!);
      }
      
      updateCanvas(canvas);
    } else {

      updatePlayerPosition(canvas, player.id, newX, newY, angle);

    }
    

    // moveBots(canvas!)
  }, [playerId, canvas, gameStateRef.current]);


  useEffect(() => {
    if (canvas && playerId) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [canvas, playerId, handleKeyDown, playGameAfterStart]);

  const initializeGame = async () => {
    if (!account?.address || !canvasRef.current || !currentRoom) return;
    
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 400,
      height: 400,
      selection: false,
      hoverCursor: 'auto',
      defaultCursor: 'default',
      renderOnAddRemove: false,
      skipTargetFind: true,
      interactive: false,
      stopContextMenu: true,
      preserveObjectStacking: true
    });
  
    fabricCanvas.off('mouse:down');
    fabricCanvas.off('mouse:up');
    fabricCanvas.off('mouse:move');
  
    setCanvas(fabricCanvas);

    await joinGame();

    const gameRef = doc(db, 'games_ably', currentRoom);
    const gamDoc = await getDoc(gameRef);
    
    const newGameState = gamDoc.data() as GameState;
    if (newGameState) {
      // setGameState(newGameState);
      gameStateRef.current = newGameState
      updateCanvas(fabricCanvas);
    }

    setupArena(fabricCanvas, ARENA_RADIUS);
    setupDecorativeElements(fabricCanvas);

    fabricCanvas.requestRenderAll();
  };

  const joinGame = async () => {
    if (!account?.address) return;
  
    try {
      const gameRef = doc(db, 'games_ably', currentRoom!);
      const gameDoc = await getDoc(gameRef);
      
      if (!gameDoc.exists()) {
        throw "La sala de juego no existe";
      }

      const currentGame = gameDoc.data() as GameState;
      
      // Create player
      const playerId = `player-${Date.now()}`;
      setPlayerId(playerId);

      const playerIndex = 0;
      const angleStep = (2 * Math.PI) / currentGame.totalPlayers;
      const angle = playerIndex * angleStep;
      
      let rotationAngle = (angle + Math.PI) % (2 * Math.PI);
      let rotationAngleDegrees = (rotationAngle * 180) / Math.PI;

      const newPlayer = {
        id: playerId,
        x: ARENA_RADIUS * Math.cos(angle) + 200,
        y: ARENA_RADIUS * Math.sin(angle) + 200,
        angle: rotationAngleDegrees,
        color: COLORS[0],
        hasDynamite: false,
        isDead: false,
        wallet: account?.address,
        isBot: false
      };

      // Create bots
      const bots = [];
      for (let i = 1; i < currentGame.totalPlayers; i++) {
        const botAngle = i * angleStep;
        const botRotationAngle = (botAngle + Math.PI) % (2 * Math.PI);
        const botRotationAngleDegrees = (botRotationAngle * 180) / Math.PI;

        bots.push({
          id: `bot-${i}`,
          x: ARENA_RADIUS * Math.cos(botAngle) + 200,
          y: ARENA_RADIUS * Math.sin(botAngle) + 200,
          angle: botRotationAngleDegrees,
          color: COLORS[i],
          hasDynamite: false,
          isDead: false,
          wallet: `bot-wallet-${i}`,
          isBot: true
        });
      }

      let updatedPlayers = [newPlayer, ...bots];

      // const randomIndex = 2
      const randomIndex = Math.floor(Math.random() * updatedPlayers.length);
  
      updatedPlayers = updatedPlayers.map((player, index) => ({
        ...player,
        hasDynamite: index === randomIndex
      }));

      const updatedPlayersWallets = [account?.address, ...bots.map(bot => bot.wallet)];

      // console.log(updatedPlayers)
      await updateDoc(gameRef, { 
        players: updatedPlayers,
        dynamiteHolder: playerId,
        playersWallets: updatedPlayersWallets,
        explosionTime: Date.now() + getRandomExplosionTime(),
        isStart: true,
        status: "live"
      });
      setShowCounter(true)
      console.log("Jugador y bots unidos exitosamente");
    } catch (error) {
      console.error("Error al unirse al juego:", error);
      setNotifyCurrentRoom(null);
      setIsSpectator(false);
    }
  };
  
  const createPlayerObject = (player: Player): Promise<fabric.Object> => {
    return new Promise((resolve) => {
      let personaje = player.hasDynamite ? `/players/personaje-${player.color}-tnt.svg` : `/players/personaje-${player.color}.svg`;
      
      fabric.loadSVGFromURL(personaje, async (objects) => {
        const playerGroup = new fabric.Group(objects, {
          left: player.x,
          top: player.y,
          scaleX: 0.2,
          scaleY: 0.2,
          selectable: false,
          data: { playerId: player.id, hasDynamite: player.hasDynamite }
        });
        
        playerGroup.rotate(player.angle);

        playerGroup.setPositionByOrigin(new fabric.Point(player.x, player.y), 'center', 'center');
        playerGroup.moveTo(10);
        resolve(playerGroup);
      });
    });
  };  

  const updateCanvas = async (fabricCanvas: fabric.Canvas) => {
    fabricCanvas.getObjects().forEach((obj, index, objects) => {
      if (obj.data?.playerId) {
        const duplicateIndex = objects.findIndex((otherObj, otherIndex) => 
          otherIndex > index && otherObj.data?.playerId === obj.data.playerId
        );
        if (duplicateIndex !== -1) {
          fabricCanvas.remove(objects[duplicateIndex]);
        }
        if (!gameStateRef.current.players.some(p => p.id === obj.data.playerId)) {
          fabricCanvas.remove(obj);
        }
        fabricCanvas.requestRenderAll()
      }
    });

    for (const player of gameStateRef.current.players) {
      let playerObject = fabricCanvas.getObjects().find(obj => obj.data?.playerId === player.id);
      
      if (playerObject) {
        if (player.isDead) {
          fabricCanvas.remove(playerObject);  
        } else {
          let personaje = player.hasDynamite ? `/players/personaje-${player.color}-tnt.svg` : `/players/personaje-${player.color}.svg`;
          if (playerObject.data.hasDynamite !== player.hasDynamite) {
            changePlayerSVG(fabricCanvas, player.id, personaje);
          }
        }
      } else if (!player.isDead) {
        playerObject = await createPlayerObject(player);
        fabricCanvas.add(playerObject);
      }
      fabricCanvas.requestRenderAll()
    }
    
    fabricCanvas.renderAll();
  };
 
  const updatePlayerPosition = (fabricCanvas: fabric.Canvas, id: string, x: number, y: number, angle: number) => {
    //if (!gameState.winner && gameState.winner !== "" && gameState.winner !==null) return;

    const playerObject = fabricCanvas.getObjects().find(obj => obj.data?.playerId === id) as fabric.Group;
    if (playerObject) {
      playerObject.rotate(angle);
      playerObject.setPositionByOrigin(new fabric.Point(x, y), 'center', 'center');
      playerObject.moveTo(10);

      fabricCanvas.requestRenderAll();

      let objects = fabricCanvas.getObjects().filter(obj => obj.data?.playerId);
      let updatedPlayers: Player[] = [];
      objects.forEach(obj => {
        let point = obj.getCenterPoint();
        let player = gameStateRef.current?.players.find(p => p.id == obj.data?.playerId);
        if (player) {
          player.x = point.x;
          player.y = point.y;
          player.angle = obj.angle!;
          updatedPlayers.push(player);
        }
      });

      gameStateRef.current = {
        ...gameStateRef.current,
        players: updatedPlayers
      };

    }
  };

  const updateDynamiteHolder = (newHolderId: string) => {
    const uniquePlayers = new Map();
    
    if (gameStateRef.current?.players) {
      for (let i = gameStateRef.current.players.length - 1; i >= 0; i--) {
        const player = gameStateRef.current.players[i];
        if (!uniquePlayers.has(player.id)) {
          uniquePlayers.set(player.id, {
            ...player,
            hasDynamite: player.id === newHolderId
          });
        }
      }
    }
    console.log(gameStateRef.current)
    
    const updatedPlayers = Array.from(uniquePlayers.values());
    
    gameStateRef.current = {
      ...gameStateRef.current,
      players: updatedPlayers,
      dynamiteHolder: newHolderId,
      explosionTime: Date.now() + getRandomExplosionTime()
    };

  };

  const startDynamitePassing = () => {
    const passDynamite = async () => {
      // if (!gameStateRef.current || gameStateRef.current.winner !== "") return;

      const alivePlayers = gameStateRef.current.players.filter((p: Player) => (!p.isDead));
      const someHasDinamite = alivePlayers.filter((p: Player) => (p.hasDynamite));
      if (alivePlayers.length > 1 && someHasDinamite.length <= 0) {
        const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        await updateDynamiteHolder(randomPlayer.id);
      }

      if (gameStateRef.current && gameStateRef.current.winner !== "") {
        if (startDynamitePassingTimeoutRef.current) clearTimeout(startDynamitePassingTimeoutRef.current); 
        return;
      }

      startDynamitePassingTimeoutRef.current = setTimeout(passDynamite, getRandomPassTime());
    };

    startDynamitePassingTimeoutRef.current = setTimeout(passDynamite, getRandomPassTime());
  };

  const getRandomPassTime = () => {
    return Math.floor(Math.random() * (6000 - 4000 + 1) + 4000); // Random time between 4 to 6 seconds
  };

  const getRandomExplosionTime = () => {
    return Math.floor(Math.random() * (14000 - 8000 + 1) + 8000); // Random time between 8 to 14 seconds
  };



  function getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  function getNearestPlayer(currentBot: Player, players: Player[]): Player | null {
    let nearestPlayer: Player | null = null;
    let minDistance = Infinity;
  
    players.forEach(player => {
      if (player.id !== currentBot.id && !player.isDead && !player.isBot) {
        const distance = getDistance(currentBot.x, currentBot.y, player.x, player.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearestPlayer = player;
        }
      }
    });
  
    return nearestPlayer;
  }

  function getDynamiteHolder(players: Player[]): Player | null {
    return players.find(player => player.hasDynamite && !player.isDead) || null;
  }

  function calculateNewPosition(
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number,
    speed: number
  ): { newX: number; newY: number } {
    const angle = Math.atan2(targetY - currentY, targetX - currentX);
    let newX = currentX + speed * Math.cos(angle);
    let newY = currentY + speed * Math.sin(angle);
  
    // Asegurarse de que el bot se mantenga dentro de la arena
    const distanceFromCenter = Math.sqrt(Math.pow(newX - CENTER_X, 2) + Math.pow(newY - CENTER_Y, 2));
    if (distanceFromCenter > ARENA_RADIUS) {
      const angleToCenter = Math.atan2(newY - CENTER_Y, newX - CENTER_X);
      newX = CENTER_X + ARENA_RADIUS * 0.95 * Math.cos(angleToCenter);
      newY = CENTER_Y + ARENA_RADIUS * 0.95 * Math.sin(angleToCenter);
    }
  
    return { newX, newY };
  }

  // Agregar estas variables al principio del archivo, fuera de cualquier función
  const botDirections: { [key: string]: { angle: number, duration: number, lastUpdate: number, speed: number } } = {};

  // Agregar esta función para manejar el movimiento natural
  function getNaturalMovement(bot: Player, currentTime: number): { targetX: number, targetY: number } {
    if (!botDirections[bot.id] || currentTime - botDirections[bot.id].lastUpdate > botDirections[bot.id].duration) {
      // Establecer una nueva dirección y duración
      botDirections[bot.id] = getNewDirection(bot);
    }
  
    const distance = botDirections[bot.id].speed * 0.05; // Ajusta esto para controlar la distancia recorrida
    let targetX = bot.x + distance * Math.cos(botDirections[bot.id].angle);
    let targetY = bot.y + distance * Math.sin(botDirections[bot.id].angle);
  
    // Comprobar si el bot está cerca del límite de la arena
    const distanceFromCenter = Math.sqrt(Math.pow(targetX - CENTER_X, 2) + Math.pow(targetY - CENTER_Y, 2));
    if (distanceFromCenter > ARENA_RADIUS * 0.9) {
      // Si está cerca del límite, obtener una nueva dirección hacia el interior
      botDirections[bot.id] = getNewDirection(bot, true);
      targetX = bot.x + distance * Math.cos(botDirections[bot.id].angle);
      targetY = bot.y + distance * Math.sin(botDirections[bot.id].angle);
    }
  
    return { targetX, targetY };
  }
  
  function getNewDirection(bot: Player, nearBoundary: boolean = false): { angle: number, duration: number, lastUpdate: number, speed: number } {
    let angle: number;
    
    if (nearBoundary) {
      // Calcular el ángulo hacia el centro de la arena
      const angleToCenter = Math.atan2(CENTER_Y - bot.y, CENTER_X - bot.x);
      // Generar un ángulo aleatorio dentro de un rango de 180 grados hacia el interior
      angle = angleToCenter + (Math.random() - 0.5) * Math.PI;
    } else {
      // Si no está cerca del límite, elegir un ángulo completamente aleatorio
      angle = Math.random() * 2 * Math.PI;
    }
  
    const duration = 2000 + Math.random() * 2000; // Entre 2 y 5 segundos
    const speed = MIN_BOT_SPEED + Math.random() * (MAX_BOT_SPEED - MIN_BOT_SPEED);
    return { angle, duration, lastUpdate: Date.now(), speed };
  }

  function moveBots(fabricCanvas: fabric.Canvas) {
    //const currentGameState = gameStateRef.current;
    //if (!gameState || gameState.winner !== null || gameState.winner !== "") return;
  
    const dynamiteHolder = getDynamiteHolder(gameStateRef.current.players);

    gameStateRef.current.players.forEach(bot => {
      if (bot.isBot && !bot.isDead) {

        let targetX: number, targetY: number;
        let speed = BOT_SPEED //* (0.8 + Math.random() * 0.4); // Variable speed between 80% and 120% of BOT_SPEED
  
        if (bot.hasDynamite) {
          // If the bot has the dynamite, chase the nearest player
          const nearestPlayer = getNearestPlayer(bot, gameStateRef.current.players);
          if (nearestPlayer) {
            targetX = nearestPlayer.x;
            targetY = nearestPlayer.y;
          } else {
            // If no players, move towards the center
            targetX = CENTER_X + (Math.random() - 0.5) * ARENA_RADIUS;
            targetY = CENTER_Y + (Math.random() - 0.5) * ARENA_RADIUS;
          }
        } else if (dynamiteHolder && dynamiteHolder.id !== bot.id) {
          // If the bot doesn't have the dynamite, move evasively
          const distanceToDynamite = getDistance(bot.x, bot.y, dynamiteHolder.x, dynamiteHolder.y);
          const dangerZone = ARENA_RADIUS * 0.4; // 40% of arena radius
  
          if (distanceToDynamite < dangerZone) {
            // Close to dynamite holder, move away quickly
            const angleAwayFromDynamite = Math.atan2(bot.y - dynamiteHolder.y, bot.x - dynamiteHolder.x);
            const escapeAngle = angleAwayFromDynamite + (Math.random() - 0.9) * Math.PI / 2; // ±45 degrees
            const escapeDistance = ARENA_RADIUS * (0.2 + Math.random() * 0.3); // 20-50% of arena radius
            targetX = bot.x + escapeDistance * Math.cos(escapeAngle);
            targetY = bot.y + escapeDistance * Math.sin(escapeAngle);
            speed *= 1.2; // Increase speed when escaping
          } else {
            // Far from dynamite holder, move more naturally
            const currentTime = Date.now();
            const { targetX: naturalX, targetY: naturalY } = getNaturalMovement(bot, currentTime);
            targetX = naturalX;
            targetY = naturalY;
          }
        } else {
          const { targetX: naturalX, targetY: naturalY } = getNaturalMovement(bot, Date.now());
          targetX = naturalX;
          targetY = naturalY;
        }
  
        // Ensure the target is within the arena
        const distanceFromCenter = Math.sqrt(Math.pow(targetX - CENTER_X, 2) + Math.pow(targetY - CENTER_Y, 2));
        if (distanceFromCenter > ARENA_RADIUS * 0.9) {
          const angleToCenter = Math.atan2(targetY - CENTER_Y, targetX - CENTER_X);
          targetX = CENTER_X + ARENA_RADIUS * 0.8 * Math.cos(angleToCenter);
          targetY = CENTER_Y + ARENA_RADIUS * 0.8 * Math.sin(angleToCenter);
        }
  
        const { newX, newY } = calculateNewPosition(bot.x, bot.y, targetX, targetY, speed);
        
        // Verificar colisión con otros jugadores/bots
        const collidedPlayer = gameStateRef.current.players.find((p: any) => 
          p.id !== bot.id && !p.isDead &&
          getDistance(p.x, p.y, newX, newY) < PLAYER_RADIUS * 2
        );

        //Validacion cuando coliciona
        if (collidedPlayer) {
          // Manejar colisión
          // handleCollision(bot, collidedPlayer, setGameState);
          
          
          // Calcular nueva posición para evitar superposición
          const pushAngle = Math.atan2(collidedPlayer.y - bot.y, collidedPlayer.x - bot.x);
          const pushDistance = PLAYER_RADIUS * 2;
          
          const newCollidedX = collidedPlayer.x + Math.cos(pushAngle) * pushDistance / 2;
          const newCollidedY = collidedPlayer.y + Math.sin(pushAngle) * pushDistance / 2;
          updatePlayerPosition(fabricCanvas, collidedPlayer.id, newCollidedX, newCollidedY, collidedPlayer.angle);

          if (bot.hasDynamite) {
            // Transferir la dinamita al jugador colisionado
            updateDynamiteHolder(collidedPlayer.id);
          } else if (collidedPlayer.hasDynamite) {
            // Transferir la dinamita al bot
            updateDynamiteHolder(bot.id);
          }

          updateCanvas(fabricCanvas);
          // Actualizar posiciones
          // setGameState((prevState: any) => ({
          //   ...prevState,
          //   players: prevState.players.map((p: any) =>
          //     p.id === collidedPlayer.id ? { ...p, x: newCollidedX, y: newCollidedY } : p
          //   )
          // }));
        } else {
          // Mover el bot si no hay colisión
          const newAngle = Math.atan2(newY - bot.y, newX - bot.x) * (180 / Math.PI);
          updatePlayerPosition(fabricCanvas, bot.id, newX, newY, newAngle);
        }

      }
    });

    // setGameState((prevState:any) => ({
    //   ...prevState,
    //   players: gameState.players
    // }));
  }

  // const updateDynamiteHolderBot = (newHolderId: string) => {
  //   const uniquePlayers = new Map();
    
  //   if (gameStateRef.current?.players) {
  //     for (let i = gameStateRef.current.players.length - 1; i >= 0; i--) {
  //       const player = gameStateRef.current.players[i];
  //       if (!uniquePlayers.has(player.id)) {
  //         uniquePlayers.set(player.id, {
  //           ...player,
  //           hasDynamite: player.id === newHolderId
  //         });
  //       }
  //     }
  //   }
    
  //   const updatedPlayers = Array.from(uniquePlayers.values());
    
  //   // setGameState((prevState: any) => ({
  //   //   ...prevState,
  //   //   players: updatedPlayers,
  //   //   dynamiteHolder: newHolderId,
  //   //   explosionTime: Date.now() + getRandomExplosionTime()
  //   // }));
  //   gameStateRef.current = {
  //     ...gameStateRef.current,
  //     players: updatedPlayers,
  //     dynamiteHolder: newHolderId,
  //     explosionTime: Date.now() + getRandomExplosionTime()
  //   };

  //   console.log(newHolderId)
  //   console.log(updatedPlayers)
    
  //   const gameRef = doc(db, 'games_ably', currentRoom!);
  //   updateDoc(gameRef, {
  //     dynamiteHolder: newHolderId,
  //     explosionTime: Date.now() + getRandomExplosionTime(),
  //     players: updatedPlayers
  //   });
  // };

  
  const handleCountdownEnd = () => {
    setShowCounter(false);
    playGameAfterStart.current = true;
    startDynamitePassing();
    // verifyExplotion();
    // Start bot movement
    //botMoveIntervalRef.current = setInterval(() => moveBots(canvas!), BOT_MOVE_INTERVAL);
    botMoveIntervalRef.current = setInterval(() => moveBots(canvas!), BOT_MOVE_INTERVAL);


  }

  return (
    <div className="absolute w-full h-full top-0 right-0 flex flex-col items-center justify-center min-h-screen bg-yellow-100">
      <div className="text-4xl font-bold mb-4 text-yellow-800">Dinamite</div>
      <div>
        {showCounter && (
          <GameCounter onCountdownEnd={handleCountdownEnd} />
        )}
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
      />
      <div>
        {gameStateRef.current && <WonOrLostModal
          isOpen={isModalOpen}
          amount={wonAmount}
          isBet={gameStateRef.current!.isBettingRoom}
          isWon={isWon}
          isPlayEnd={isPlayEnd}
          status_game={statusContractGame}
          room_code_contract={gameStateRef.current!.roomIdContract}
          onClose={() => setModalOpen(false)}
        />}
      </div>
    </div>
  );
}