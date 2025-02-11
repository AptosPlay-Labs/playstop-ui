import { fabricGif, FabricGifImage } from '@/utils/fabricGif';
import { fabric } from 'fabric';


export const setupDecorativeElements = (fabricCanvas: fabric.Canvas) => {
    createCactus(0, 0, fabricCanvas);
    createCactus(290, 290, fabricCanvas);
    createRock(300, 0, fabricCanvas);
    createRock(0, 300, fabricCanvas);

    // fabricCanvas.add(rock1, rock2);
};

export const createCactus = (x: number, y: number, fabricCanvas:fabric.Canvas) => {
    // return new fabric.Rect({
    //   left: x,
    //   top: y,
    //   width: 20,
    //   height: 40,
    //   fill: '#2ECC71',
    //   rx: 5,
    //   ry: 5,
    //   selectable: false
    // });
    return fabric.Image.fromURL('/objects/tree.png',(img)=>{
      let imgObject = img.set({ 
        left: x, 
        top: y, 
        scaleX: 0.3,
        scaleY: 0.3,
      });
      fabricCanvas.add(imgObject)
      fabricCanvas.requestRenderAll()
    })
};


export const setupArena = (fabricCanvas: fabric.Canvas, arena_radius:number) => {
    const arena = new fabric.Circle({
      left: 200,
      top: 200,
      radius: arena_radius,
      fill: '#f9ffb9',
      stroke: '#8B4513',
      strokeWidth: 10,
      selectable: false
    });
    fabricCanvas.add(arena);
    fabricCanvas.centerObject(arena);
};


export const createRock = (x: number, y: number, fabricCanvas:fabric.Canvas) => {
    // return new fabric.Ellipse({
    //   left: x,
    //   top: y,
    //   rx: 20,
    //   ry: 15,
    //   fill: '#95A5A6',
    //   selectable: false
    // });

    return fabric.Image.fromURL('/objects/rock-1.png',(img)=>{
      let imgObject = img.set({ 
        left: x, 
        top: y, 
        scaleX: 0.3,
        scaleY: 0.3,
      });
      fabricCanvas.add(imgObject)
      fabricCanvas.requestRenderAll()
    })
};  


export function  changePlayerSVG(fabricCanvas: fabric.Canvas, playerId: string, newSVGUrl: string) {
  // Encuentra el objeto del jugador
  const playerObject = fabricCanvas.getObjects().find(obj => obj.data?.playerId === playerId);

  if (playerObject instanceof fabric.Group) {
    // Añade una bandera para evitar múltiples actualizaciones simultáneas
    if (playerObject.data.isUpdating) {
      console.log('Update in progress, skipping...');
      return;
    }

    playerObject.data.isUpdating = true;
    // Carga el nuevo SVG
    fabric.loadSVGFromURL(newSVGUrl, (objects) => {
      // Crea un nuevo grupo con los objetos del SVG
      const newGroup = new fabric.Group(objects, {
        ...playerObject.toObject(),
        data: { 
          ...playerObject.data,
          isUpdating: false,
          hasDynamite:!playerObject.data.hasDynamite
        }
      });

      // Si el jugador tiene dinamita, la añadimos al nuevo grupo
      const dynamite = playerObject.getObjects().find(obj => obj.data?.isDynamite);
      if (dynamite) {
        newGroup.addWithUpdate(dynamite);
      }

      // Reemplaza el grupo antiguo con el nuevo
      fabricCanvas.remove(playerObject);
      fabricCanvas.requestRenderAll();
      fabricCanvas.add(newGroup);
      fabricCanvas.requestRenderAll();

      // Asegúrate de que el nuevo grupo esté en la misma posición en el stack
      //newGroup.moveTo(playerObject.getObjects().indexOf(dynamite!));
    });
  } else {
    console.log('Player object not found or is not a group');
  }
}

export const createDynamite = async() => {
    const dynamiteGroup = new fabric.Group([], {
        width: 60,
        height: 80,
        data: { isDynamite: true }
    });

    // Create the three sticks of dynamite
    const dynamiteStick1 = new fabric.Rect({
        width: 20,
        height: 60,
        fill: '#E74C3C',
        rx: 5,
        ry: 5,
        left: -15,
        top: 5, 
        stroke: '#000000', 
        strokeWidth: 1
    });

    const dynamiteStick2 = new fabric.Rect({
        width: 20,
        height: 70,
        fill: '#E74C3C',
        rx: 5,
        ry: 5,
        left: 0,
        top: 0, 
        stroke: '#000000', 
        strokeWidth: 1
    });

    const dynamiteStick3 = new fabric.Rect({
        width: 20,
        height: 60,
        fill: '#E74C3C',
        rx: 5,
        ry: 5,
        left: 15,
        top: 5,
        stroke: '#000000', 
        strokeWidth: 1
    });

    // Label across all sticks
    const label = new fabric.Rect({
        width: 50,
        height: 15,
        fill: '#F1C40F',
        left: -15,
        top: 22
    });

    const text = new fabric.Text('TNT', {
        fontSize: 12,
        fill: 'black',
        left: -3,
        top: 22
    });

    const fuse = new fabric.Line([0, -10, 0, -30], {
        stroke: 'brown',
        strokeWidth: 3,
        left: 10, 
        top: -20
    });


    const gif1 = await fabricGif(
      "/images/flame-lit.gif",
      50,
      50
    ) as FabricGifImage;
    gif1.set({ top: -48, left: -4 });
    gif1.play()
    //dynamiteGroup.data.gif = gif1;
    // canvas?.add(gif1); 
    // canvas?.renderAll();
    dynamiteGroup.addWithUpdate(gif1);
    //dynamiteGroup.addWithUpdate(dynamiteGroup.data.gif);

 
    ///images/falme-lit-sprint.png
    fabric.Image.fromURL('/images/flame-lit.gif', function(flameSpark) {
      flameSpark.set({
          left: 34,
          top: -6,
          // angle: 90,
          scaleX: 0.07,   
          scaleY: 0.07
      });

      dynamiteGroup.addWithUpdate(flameSpark);
      //canvas?.renderAll();  
    });
    
    
    dynamiteGroup.addWithUpdate(dynamiteStick1);
    dynamiteGroup.addWithUpdate(dynamiteStick3);
    dynamiteGroup.addWithUpdate(dynamiteStick2);
    dynamiteGroup.addWithUpdate(label);
    dynamiteGroup.addWithUpdate(text);
    dynamiteGroup.addWithUpdate(fuse);
    //dynamiteGroup.addWithUpdate(flameSpark);

    return dynamiteGroup;
};


export const updateDynamite = async (playerObject: fabric.Object, hasDynamite: boolean) => {
    if (playerObject instanceof fabric.Group) {
      const dynamite = playerObject.getObjects().find(obj => obj.data?.isDynamite);
      if (hasDynamite && !dynamite) {
        const newDynamite = await createDynamite();
        newDynamite.set({
          left: 32, 
          top: 4,
          scaleX: 0.3,
          scaleY: 0.3,
        });
        playerObject.addWithUpdate(newDynamite);
      } else if (!hasDynamite && dynamite) {
        playerObject.remove(dynamite);
        playerObject.setCoords();
      }
    }
};