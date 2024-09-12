import { GameBoard, GameRooms, GameBoardVisual } from "@/components/modules";
import { notificateStore } from "@/store/notificateStore";
import { motion } from "framer-motion";

const BackArrow = () => (
    <svg viewBox="0 0 100 100" className="w-12 h-12 text-white">
      <path d="M60,10 Q80,10 80,30 L80,70 Q80,90 60,90 L20,90 Q0,90 0,70 L0,30 Q0,10 20,10 Z" fill="white" />
      <path d="M50,30 L30,50 L50,70" fill="none" stroke="purple" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export function ColorWar() {
    const { currentRoom, isSpectator } = notificateStore();

    return (
        <div>
            <div className="flex items-center ml-8 mt-4">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-white hover:text-yellow-300 transition-colors"
              >
                <BackArrow />
                {/* <svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 100 60" fill="none">
                <path d="M110 30 Q110 20 100 20 L50 20 Q52 20 52 18 L52 12 Q52 5 45 5 Q40 5 35 10 Q2 30 35 50 Q40 55 45 55 Q52 55 52 48 L52 42 Q52 40 50 40 L100 40 Q110 40 110 30 Z" fill="#D4E2FF" stroke="black" stroke-width="2"/>
                </svg> */}
              </motion.button>
              
              <div className="text-2xl font-bold text-white ml-2">Back</div>

            </div>
            <div className="flex items-center justify-center flex-col">
                <div className="flex justify-center">
                    {(!currentRoom || isSpectator) && (
                    <div className="mx-2">
                        <GameRooms/>
                    </div>
                    )}
                    {(currentRoom && !isSpectator) && (
                    <div className="mx-2">
                        <GameBoard/>
                    </div>
                    )}
                    {(currentRoom && isSpectator) && (
                    <div className="mx-2">
                        <GameBoardVisual/>
                    </div>
                    )}
                </div>
            </div>
        </div>
    )
  }
  