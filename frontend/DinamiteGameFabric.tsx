import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { addDoc, collection, doc, getDocs, query, onSnapshot, updateDoc, where, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import * as Ably from 'ably';
// import { fabricGif, FabricGifImage } from './utils/fabricGif';
import { changePlayerSVG, setupArena, setupDecorativeElements } from './games-modules/DinamiteGame/components/ElementGame';


interface Player {
  id: string;
  x: number;
  y: number;
  angle:number;
  color: string;
  hasDynamite: boolean;
}

interface GameState {
  players: Player[];
  dynamiteHolder: string | null;
  explosionTime: number;
  winner:string|null;
}

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const MAX_PLAYERS = 4;
const ARENA_RADIUS = 180;
const PLAYER_RADIUS = 12;

const DinamiteGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [gameState, setGameState] = useState<GameState>();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [ably, setAbly] = useState<Ably.Realtime | null>(null);
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);
  const gameStateRef = useRef<any>(null);
  const gifref = useRef<any>(null);
  
  const { account } = useWallet();
  

  useEffect(() => {
    gameStateRef.current = gameState;
    // fabricGif(
    //   "/images/flame.gif",
    //   100,
    //   100
    // ).then((vl)=>{
    //   let gif = vl as FabricGifImage
    //   if(gifref.current>2) return
    //     gifref.current+=1
    //     gif.set({ top: 290, left: 260 });
    //     gif.play()
    //     canvas?.add(gif)
    //     canvas?.renderAll();
        
    // })
  
    // fabric.util.requestAnimFrame(function render() {
    //   canvas?.renderAll();
    //   fabric.util.requestAnimFrame(render);
    // }); 
  }, [gameState]);

  useEffect(() => {
    if (account?.address) {
      initializeGame();
    }
    
    return () => {
      if (canvas) {
        canvas.dispose();
      }
      if (channel) {
        channel.unsubscribe();
      }
      if (ably) {
        ably.close();
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [account?.address]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!playerId || !canvas) return;
    
    const player = gameState?.players.find((p:any) => p.id === playerId);
    if (!player) return;
    
    let newX = player.x;
    let newY = player.y;
    let angle = player.angle || 0;
    
    const speed = 20;
    
    switch (e.key) {
      case 'ArrowUp': 
        newY -= speed; 
        angle = 270; // 270 grados
        break;
      case 'ArrowDown': 
        newY += speed; 
        angle = 90; // 90 grados
        break;
      case 'ArrowLeft': 
        newX -= speed; 
        angle = 180; // 180 grados
        break;
      case 'ArrowRight': 
        newX += speed; 
        angle = 0; // 0 grados
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

    const collidedPlayer = gameState?.players.find((p:any) => 
      p.id !== playerId && !p.isDead &&
      Math.sqrt(Math.pow(p.x - newX, 2) + Math.pow(p.y - newY, 2)) < PLAYER_RADIUS * 2
    );

    if (collidedPlayer) {
      // Calculate push direction
      const pushAngle = Math.atan2(collidedPlayer.y - newY, collidedPlayer.x - newX);
      const pushDistance = PLAYER_RADIUS * 2 - Math.sqrt(Math.pow(collidedPlayer.x - newX, 2) + Math.pow(collidedPlayer.y - newY, 2));
      
      // Push both players apart
      newX -= Math.cos(pushAngle) * pushDistance / 2;
      newY -= Math.sin(pushAngle) * pushDistance / 2;
      
      const newCollidedX = collidedPlayer.x + Math.cos(pushAngle) * pushDistance / 2;
      const newCollidedY = collidedPlayer.y + Math.sin(pushAngle) * pushDistance / 2;
      
      // Pass dynamite if necessary
      // if (player.hasDynamite && !collidedPlayer.hasDynamite) {
      //   updateDynamiteHolder(collidedPlayer.id);
      // }

      if (player.hasDynamite) {
        console.log("tengo la dinamita")
        updateDynamiteHolder(collidedPlayer.id);
      } else if (collidedPlayer.hasDynamite) {
        console.log("otro tiene la dinamita")
        updateDynamiteHolder(playerId!);
      }
      
      // Update collided player position
      if (channel) {
        channel.publish('playerMove', { id: collidedPlayer.id, x: newCollidedX, y: newCollidedY, angle: collidedPlayer.angle });
      }
    }else{
      setGameState((prevState:any) => ({
        ...prevState,
        players: prevState.players.map((p:any) =>
          p.id === playerId ? { ...p, x: newX, y: newY, angle: angle } : p
        )
      }));
      
      if (channel) {
        channel.publish('playerMove', { id: playerId, x: newX, y: newY, angle: angle });
      }
    }
  }, [playerId, canvas, gameState, channel]);

  useEffect(() => {
    if (canvas && playerId) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [canvas, playerId, handleKeyDown]);

  const initializeGame = async () => {
    console.log("doble initialice")
    //para que no se instancie muchos veces
    if(gifref.current==1) return
    gifref.current+=1

    if (!account?.address || !canvasRef.current) return;
    
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 400,
      height: 400,
      selection: false,
      hoverCursor: 'auto',
      defaultCursor: 'default',
      renderOnAddRemove: false,
      skipTargetFind: true,
      interactive: false,
      stopContextMenu:true,
      preserveObjectStacking:true
    });
  
    fabricCanvas.off('mouse:down');
    fabricCanvas.off('mouse:up');
    fabricCanvas.off('mouse:move');
  
    setCanvas(fabricCanvas);

    const ablyInstance = new Ably.Realtime({ key: 'FPTfgA.aB0wSg:_YyjuDIAGM7aGA_pFp_IS2VEcXLHtZO4Ibg9Anu_NiI' });
    setAbly(ablyInstance);

    await joinGame();

    const gameRef = doc(db, 'games_ably', "G4wc5hMBwefzX3r6bJ0W");
    onSnapshot(gameRef, (snapshot) => {
      const newGameState = snapshot.data() as GameState;
      console.log("firebase doble")
      if (newGameState) {

        if (gameStateRef.current) {
          newGameState.players = newGameState.players.map(newPlayer => {
            const currentPlayer = gameStateRef.current.players.find(
              (p: any) => p.id === newPlayer.id
            );
            if (currentPlayer) {
              return {
                ...newPlayer,
                x: currentPlayer.x,
                y: currentPlayer.y,
                angle:currentPlayer.angle
              };
            }
            return newPlayer;
          });
        }
        
      
        setGameState(newGameState);
        updateCanvas(fabricCanvas, newGameState);
      }
    });

    const gameChannel = ablyInstance.channels.get('game-1726685339198');
    setChannel(gameChannel);

    gameChannel.subscribe('playerMove', (message) => {
      const { id, x, y, angle } = message.data;
      updatePlayerPosition(fabricCanvas, id, x, y, angle, gameStateRef.current);
    });

    setupArena(fabricCanvas, ARENA_RADIUS);
    setupDecorativeElements(fabricCanvas);

    fabricCanvas.renderAll();
  };

  const joinGame = async () => {
    if (!account?.address) return;

    try {
      const playerQuery = query(collection(db, 'players_ably'), where('wallet', '==', account.address));
      const playerSnapshot = await getDocs(playerQuery);
      
      let playerId = playerSnapshot.docs[0].id
      setPlayerId(playerSnapshot.docs[0].id);
      
      const gameRef = doc(db, 'games_ably', "G4wc5hMBwefzX3r6bJ0W");
      const gameDoc = await getDoc(gameRef);

      if (gameDoc.exists()) {
        const currentGame = gameDoc.data() as GameState;
        const existingPlayer = currentGame.players.find(p => p.id === playerId);

        if (!existingPlayer && currentGame.players.length < MAX_PLAYERS) {
          const playerIndex = currentGame.players.length;
          const angleStep = (2 * Math.PI) / MAX_PLAYERS;
          const angle = playerIndex * angleStep;
          
          // Calculamos el ángulo de rotación del jugador
          let rotationAngle = (angle + Math.PI) % (2 * Math.PI);
          
          // Convertimos el ángulo de rotación a grados
          let rotationAngleDegrees = (rotationAngle * 180) / Math.PI;

          const newPlayer: Player = {
            id: playerId!,
            x: ARENA_RADIUS * Math.cos(angle) + 200,
            y: ARENA_RADIUS * Math.sin(angle) + 200,
            angle: rotationAngleDegrees,
            color: COLORS[currentGame.players.length],
            hasDynamite: false//currentGame.players.length === 0
          };
          const updatedPlayers = [...currentGame.players, newPlayer];
          await updateDoc(gameRef, { 
            players: updatedPlayers,
            dynamiteHolder: currentGame.players.length === 0 ? playerId : currentGame.dynamiteHolder
          });
        }
      } else {
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


  const createPlayerObject = (player: Player): Promise<fabric.Object> => {
    return new Promise((resolve) => {
      let personaje = player.hasDynamite? `/players/personaje-${player.color}-tnt.svg`:`/players/personaje-${player.color}.svg`
      
      fabric.loadSVGFromURL(personaje, async (objects) => {
        const playerGroup = new fabric.Group(objects, {
          left: player.x,
          top: player.y,
          // angle:player.angle,
          scaleX: 0.2,  // Adjust scale as needed
          scaleY: 0.2,  // Adjust scale as needed
          selectable: false,
          data: { playerId: player.id }
        });
        
        const currentCenterPoint = playerGroup.getCenterPoint();

        playerGroup.rotate(player.angle);

        const newCenterPoint = playerGroup.getCenterPoint();
        const deltaX = currentCenterPoint.x - newCenterPoint.x;
        const deltaY = currentCenterPoint.y - newCenterPoint.y;

        // Ajustamos la posición para mantener el centro
        playerGroup.set({
          left: player.x + deltaX,
          top: player.y + deltaY
        });
        playerGroup.setPositionByOrigin(new fabric.Point(player.x+deltaX, player.y+deltaY), 'center', 'center');
        playerGroup.moveTo(10);
        resolve(playerGroup);
      });
    });
  };  

  const updateCanvas = async (fabricCanvas: fabric.Canvas, newGameState: GameState) => {
    console.log(newGameState)
    for (const player of newGameState.players) {
     

      let playerObject = fabricCanvas.getObjects().find(obj => obj.data?.playerId === player.id);
      
      if (playerObject) {


        let personaje = player.hasDynamite? `/players/personaje-${player.color}-tnt.svg`:`/players/personaje-${player.color}.svg`

        
        changePlayerSVG(fabricCanvas,player.id, personaje) 
        
        
        
      } else {
        playerObject = await createPlayerObject(player);
        fabricCanvas.add(playerObject);
      }
   }

    fabricCanvas.getObjects().forEach(obj => {
      if (obj.data?.playerId && !newGameState.players.some(p => p.id === obj.data.playerId)) {
        fabricCanvas.remove(obj);
      }
    });

    fabricCanvas.renderAll();
  };
 
  const updatePlayerPosition = (fabricCanvas: fabric.Canvas, id: string, x: number, y: number, angle: number, gameState:GameState|undefined) => {
    const playerObject = fabricCanvas.getObjects().find(obj => obj.data?.playerId === id) as fabric.Group;
    if (playerObject) {

      // Aplicamos la nueva rotación
      playerObject.rotate(angle);
      // Poscicion anterior
      playerObject.setPositionByOrigin(new fabric.Point(x, y), 'center', 'center');
      playerObject.moveTo(10);

      fabricCanvas.renderAll();
      // console.log(gameState.players)

      let objects = fabricCanvas.getObjects().filter(obj=>obj.data?.playerId)
      let updateGameState:any = {}
      updateGameState.dynamiteHolder = gameState?.dynamiteHolder
      updateGameState.explosionTime = gameState?.explosionTime
      updateGameState.winner = gameState?.winner
      updateGameState.players = []
      objects.forEach(obj=>{
        let point = obj.getCenterPoint()
        let player = gameState?.players.find(p=>p.id==obj.data?.playerId)
        player!.x = point.x
        player!.y = point.y
        player!.angle = obj.angle!
        updateGameState.players.push(player)        
      })
      //console.log(gameStateRef.current)
      // gameStateRef.current = updateGameState
      setGameState(updateGameState);
    }
  };

  const updateDynamiteHolder = async (newHolderId: string) => {
    const gameRef = doc(db, 'games_ably', "G4wc5hMBwefzX3r6bJ0W");
    await updateDoc(gameRef, { 
      dynamiteHolder: newHolderId,
      explosionTime: Date.now() + getRandomExplosionTime(),
      players: gameState?.players.map((p:any) => ({
        ...p,
        hasDynamite: p.id === newHolderId
      })) || []
    });
  };

  const getRandomExplosionTime = () => {
    return Math.floor(Math.random() * (10000 - 5000 + 1) + 5000); // Random time between 5 to 10 seconds
  };

  // const updatePlayerPosition = (fabricCanvas: fabric.Canvas, id: string, x: number, y: number, angle: number) => {
  //   const playerObject = fabricCanvas.getObjects().find(obj => obj.data?.playerId === id) as fabric.Group;
  //   if (playerObject) {
  //     playerObject.set({ left: x, top: y, angle: angle });
  //     fabricCanvas.renderAll();
  //   }
  // };


  return (
    <div className="absolute w-full h-full top-0 right-0 flex flex-col items-center justify-center min-h-screen bg-yellow-100">
      <h1 className="text-4xl font-bold mb-4 text-yellow-800">Dinamite</h1>
      <canvas
        ref={canvasRef}
        tabIndex={0}
      />
    </div>
  );
};

export default DinamiteGame;