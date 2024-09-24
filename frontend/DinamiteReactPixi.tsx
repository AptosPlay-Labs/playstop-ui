import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedGIF } from '@pixi/gif';
// import '@pixi/gif';
import { BlurFilter, TextStyle, Container as contain,  } from 'pixi.js';
import { Stage, Container, Sprite, Text} from '@pixi/react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
// import { X } from 'lucide-react';


const DinamiteReactPixi = () => {
  const blurFilter = useMemo(() => new BlurFilter(2), []);
  const bunnyUrl = '/players/personaje-red.png';
  const containerRef = useRef<contain>(null);
  const { account } = useWallet();

  const [ably, setAbly] = useState<any>(null);
  const gifref = useRef<any>(null);

  

    fetch('/images/flame-lit.gif')
    .then(res => res.arrayBuffer())
    .then(AnimatedGIF.fromBuffer)
    .then((image:AnimatedGIF) => {
        //image!.scale(2)
        if(gifref.current>2) return
        gifref.current +=1
        containerRef!.current!.addChild(image)
        console.log(containerRef!.current)
    });

    useEffect(() => {
        setAbly(Math.random()*10)
        console.log(containerRef!.current)
      }, [account?.address]);
   
    return (
    <Stage width={800} height={600} options={{ background: 0x1099bb }}>
      <Sprite image={bunnyUrl} x={300} y={20} scale={0.4}/>
      <Sprite image={bunnyUrl} x={500} y={150} scale={0.4}/>
      <Sprite image={bunnyUrl} x={400} y={300} scale={0.4}/>

      <Sprite image='/images/flame-lit.gif' x={10} y={10} scale={0.4}/>
      <Container ref={containerRef} scale={0.4} x={ably} y={300}/>  
      <Container x={200} y={200}>
        <Text
          text="Hello World"
          anchor={0.5}
          x={220}
          y={150}
          filters={[blurFilter]}
          style={
            new TextStyle({
              align: 'center', 
              fill: '0xffffff',
              fontSize: 50,
              letterSpacing: 20,
              dropShadow: true,
              dropShadowColor: '#E72264',
              dropShadowDistance: 6,
            })
          }
        />
      </Container>
    </Stage>
    
  );
};

export default DinamiteReactPixi;