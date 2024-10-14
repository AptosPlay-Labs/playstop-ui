//import { useWallet } from "@aptos-labs/wallet-adapter-react";

// Internal Components
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
//import { Header } from "@/components/Header";
// import { WalletDetails } from "@/components/WalletDetails";
// import { NetworkInfo } from "@/components/NetworkInfo";
// import { AccountInfo } from "@/components/AccountInfo";
// import { TransferAPT } from "@/components/TransferAPT";
// import { MessageBoard } from "@/components/MessageBoard";
import {Layout} from "@/components/common"
import { motion } from 'framer-motion';
import { ReactiveChain } from './ReactiveChain';

// import { useState } from "react";
import { notificateStore } from "./store/notificateStore";
// import DinamiteGame from "./DinamiteGame";
import { DinamiteGameFabric } from "./DinamiteGameFabric";
import VideoBackground from "./components/common/VideoBackground";
// import { DinamiteGame } from "./games-modules/DinamiteGame/DinamiteGame";
// import DinamiteReactPixi from "./DinamiteReactPixi";
// import DinamiteGameV2 from "./DinamiteGameV2";

const games = [
  { name: 'REACTIVE CHAIN', id:"reactive-chain", color: 'from-yellow-400 to-yellow-600', img:"./images/reactive-chain.png"},
  { name: 'DINAMITE', id:"dinamite", color: 'from-purple-400 to-purple-600', img:"./images/dinamite.png"},
  { name: 'SURVIVAL', id:"missile-battle", color: 'from-green-400 to-green-600', img:"./images/missile-battle.svg"}, 
  { name: 'FATAL SIEGE', id:"missile-battle", color: 'from-red-400 to-red-600', img:"./images/fatal-siege.png"}
  // { name: 'STICKMAN RUN', color: 'from-blue-400 to-cyan-300', svg: <path d="M17.5,4.5C17.5,5.6 16.6,6.5 15.5,6.5C14.4,6.5 13.5,5.6 13.5,4.5C13.5,3.4 14.4,2.5 15.5,2.5C16.6,2.5 17.5,3.4 17.5,4.5M15,8V16H13V8H11L8,10V12H10L11,11V16H9V21H11V18H13V21H15V18H17V8H15Z" /> },
  // { name: 'TANK BATTLE', color: 'from-yellow-400 to-yellow-600', svg: <path d="M20,10H4V17H20V10M20,19H4V21H20V19M9,11H5V15H9V11M19,7V4H9V7H19Z" /> },
  // { name: 'RACE', color: 'from-red-500 to-red-700', svg: <path d="M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z" /> },
  // { name: 'SOCCER', color: 'from-green-500 to-green-700', svg: <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,3C13.76,3 15.4,3.53 16.78,4.41L16.5,5H13.5L12,7.5L10.5,5H7.5L7.22,4.41C8.6,3.53 10.24,3 12,3M6.5,5.89L9,10L6,13L3.34,11.66C3.12,11.31 2.96,10.93 2.84,10.54L6.5,5.89M17.5,5.89L21.16,10.54C21.04,10.93 20.88,11.31 20.66,11.66L18,13L15,10L17.5,5.89M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M7,16L10,13.5L12,15L14,13.5L17,16L15.5,19H8.5L7,16Z" /> },
  // 00_PARAM
  // ... Add more games with appropriate colors and SVGs
];

//@ts-ignore
const GameCard = ({ name, color, img }) => (
  <motion.div 
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="aspect-square"
  >
    <div className={`trapezoidal-card w-full h-70 w-[120px] h-[180px] bg-gradient-to-br ${color} flex flex-col items-center justify-center p-4`}>
      <img className="transform scale-125 -mt-6 mb-5" src={img} alt=""/>
      <div className="font-bold text-white text-center text-xl">{name}</div>
    </div>  
  </motion.div>
);



function App() {
  //const { account } = useWallet();
  //const [selectedGame, setSelectedGame] = useState(null);
  const {selectedGame, setSelectedGame } = notificateStore();

  const handleCardClick = (gameId:any) => {
    setSelectedGame(gameId);
  };

  return (
    <Layout>
      {/* <ColorWar/> */}
      {(selectedGame=="reactive-chain") && (
          <ReactiveChain/>
      )}
      {(selectedGame=="dinamite") && (
          
          // <DinamiteGame/>
          <DinamiteGameFabric/>
          
      )}
      {(!selectedGame) && (      
        // bg-gradient-to-br from-purple-600 to-indigo-700
        <div className="min-h-screen bg-[#6128b6]">
          {/* <img src="/bg-playstop.gif" className="w-full opacity-[0.85] mt-[-100px]" alt=""/> */}
          <VideoBackground 
            videoSrc="/bg-playstop.mp4" 
            fallbackImageSrc="/bg-playstop.png"
          />
          <div className="max-w-7xl mx-auto p-8"> 
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-24 p-20 mt-[-170px]">
              {games.map((game, index) => (
                <div onClick={() => handleCardClick(game.id)} >
                  <GameCard key={index} name={game.name} color={game.color} img={game.img}/>  
                </div>
              ))}
            </div>
            {/* <div className='space-invader'></div> */}
          </div>

        </div>
      )}  
    </Layout>
  );
}


export default App;
