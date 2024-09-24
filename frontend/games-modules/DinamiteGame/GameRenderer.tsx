import React, { useCallback, useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { Player, GameState } from './GameLogic';
import { fabricGif, FabricGifImage } from '@/utils/fabricGif';
import { GameLogic } from './GameLogic';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { dinamiteStore } from '@/store/dinamiteStore';

const mGameLogic = new GameLogic()
// interface GameRendererProps {
//   gameState: GameState | null;
// }


export const GameRenderer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const gifref = useRef<any>(null);
  const { account } = useWallet();
  const gameState = dinamiteStore(state => state.gameState);
  // const { gameState } = dinamiteStore()

  useEffect(() => {
    if (account?.address) {
      
      mGameLogic.initializeGame(account.address);

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        // console.log("clouse event")
        // window.removeEventListener('keydown', handleKeyDown);
        // mGameLogic.cleanup();
      };
    }
  }, [account?.address]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState) {
      let data = mGameLogic.handleKeyDown(e);
      mGameLogic.updatePlayerPosition(data?.id, data.x, data.y, data.angle);
      }
  }, [gameState]);

  useEffect(() => {
    if (gameState) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [ gameState, handleKeyDown]);

  useEffect(() => {
    fabricGif(
      "/images/flame.gif",
      100,
      100
    ).then((vl)=>{
      let gif = vl as FabricGifImage
      if(gifref.current>2) return
        gifref.current+=1
        gif.set({ top: 290, left: 260 });
        gif.play()
        fabricCanvasRef.current?.add(gif)
        fabricCanvasRef.current?.requestRenderAll();
        
    })
  
    fabric.util.requestAnimFrame(function render() {
      fabricCanvasRef.current?.requestRenderAll();
      fabric.util.requestAnimFrame(render);
    }); 
  }, [gameState]);

  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
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

      setupArena(fabricCanvasRef.current);
      setupDecorativeElements(fabricCanvasRef.current);

      fabricCanvasRef.current?.renderAll()
    }

    // return () => {
    //   if (fabricCanvasRef.current) {
    //     fabricCanvasRef.current.dispose();
    //   }
    // };
  }, []);

  useEffect(() => {
    console.log("update gamstate")
    console.log(gameState)
    if (fabricCanvasRef.current && gameState) {
      updateCanvas(fabricCanvasRef.current, gameState);
    }
  }, [gameState]);

  const setupArena = (canvas: fabric.Canvas) => {
    const arena = new fabric.Circle({
      left: 200,
      top: 200,
      radius: 180,
      fill: '#f9ffb9',
      stroke: '#8B4513',
      strokeWidth: 10,
      selectable: false
    });
    canvas.add(arena);
    canvas.centerObject(arena);
  };

  const setupDecorativeElements = (canvas: fabric.Canvas) => {
    const cactus1 = createCactus(50, 50);
    const cactus2 = createCactus(350, 350);
    const rock1 = createRock(350, 50);
    const rock2 = createRock(50, 350);

    canvas.add(cactus1, cactus2, rock1, rock2);
  };

  const createCactus = (x: number, y: number) => {
    return new fabric.Rect({
      left: x,
      top: y,
      width: 20,
      height: 40,
      fill: '#2ECC71',
      rx: 5,
      ry: 5,
      selectable: false
    });
  };

  const createRock = (x: number, y: number) => {
    return new fabric.Ellipse({
      left: x,
      top: y,
      rx: 20,
      ry: 15,
      fill: '#95A5A6',
      selectable: false
    });
  };

  const updateCanvas = async (canvas: fabric.Canvas, gameState: GameState) => {
    for (const player of gameState.players) {
      let playerObject = canvas.getObjects().find(obj => obj.data?.playerId === player.id);
      
      if (playerObject) {
        updatePlayerObject(canvas, playerObject as fabric.Group, player);
      } else {
        playerObject = await createPlayerObject(player);
        canvas.add(playerObject);
      }
    }

    canvas.getObjects().forEach(obj => {
      if (obj.data?.playerId && !gameState.players.some((p:any) => p.id === obj.data.playerId)) {
        canvas.remove(obj);
      }
    });

    canvas.renderAll();
  };

  const updatePlayerObject = (canvas: fabric.Canvas, playerObject: fabric.Group, player: Player) => {
    const personaje = player.hasDynamite ? `/players/personaje-${player.color}-tnt.svg` : `/players/personaje-${player.color}.svg`;
    if(player.hasDynamite) changePlayerSVG(canvas, player.id, personaje);
    
    const currentCenterPoint = playerObject.getCenterPoint();
    playerObject.rotate(player.angle);
    const newCenterPoint = playerObject.getCenterPoint();
    const deltaX = currentCenterPoint.x - newCenterPoint.x;
    const deltaY = currentCenterPoint.y - newCenterPoint.y;

    playerObject.set({
      left: player.x + deltaX,
      top: player.y + deltaY
    });
    playerObject.setPositionByOrigin(new fabric.Point(player.x + deltaX, player.y + deltaY), 'center', 'center');
    playerObject.moveTo(10);
  };

  const createPlayerObject = (player: Player): Promise<fabric.Object> => {
    return new Promise((resolve, reject) => {
      const personaje = player.hasDynamite ? `/players/personaje-${player.color}-tnt.svg` : `/players/personaje-${player.color}.svg`;
      
      fabric.loadSVGFromURL(personaje, (objects, options) => {
        const playerGroup = new fabric.Group(objects, {
          left: player.x,
          top: player.y,
          scaleX: 0.2,
          scaleY: 0.2,
          selectable: false,
          data: { playerId: player.id }
        });
        
        playerGroup.rotate(player.angle);
        playerGroup.setPositionByOrigin(new fabric.Point(player.x, player.y), 'center', 'center');
        playerGroup.moveTo(10);
        resolve(playerGroup);
      });
    });
  };

  const changePlayerSVG = (canvas: fabric.Canvas, playerId: string, newSVGUrl: string) => {
    const playerObject = canvas.getObjects().find(obj => obj.data?.playerId === playerId);
  
    if (playerObject instanceof fabric.Group) {
      fabric.loadSVGFromURL(newSVGUrl, (objects, options) => {
        const newGroup = new fabric.Group(objects, {
          scaleX: playerObject.scaleX,
          scaleY: playerObject.scaleY,
          left: playerObject.left,
          top: playerObject.top,
          angle: playerObject.angle,
          selectable: false,
          data: { playerId: playerId }
        });
  
        const dynamite = playerObject.getObjects().find(obj => obj.data?.isDynamite);
        if (dynamite) {
          newGroup.addWithUpdate(dynamite);
        }
  
        const index = canvas.getObjects().indexOf(playerObject);
        canvas.remove(playerObject);
        canvas.insertAt(newGroup, index, false);
  
        canvas.renderAll();
      });
    }
  };

  return (
    <div className="absolute w-full h-full top-0 right-0 flex flex-col items-center justify-center min-h-screen bg-yellow-100">
      <h1 className="text-4xl font-bold mb-4 text-yellow-800">Dinamite</h1>
      <canvas ref={canvasRef} />
    </div>
  );
};