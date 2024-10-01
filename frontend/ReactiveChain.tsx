import { GameBoard, GameRooms, GameBoardVisual } from "@/components/modules";
import { notificateStore } from "@/store/notificateStore";
import { motion } from "framer-motion";


export function ReactiveChain() {
    const { currentRoom, isSpectator ,setSelectedGame} = notificateStore();

    return (
        <div>
            <div className="flex items-center ml-8 mt-4">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-white hover:text-yellow-300 transition-colors"
                onClick={()=>setSelectedGame(null)}
              >
                <img className="w-16" src="./images/arrow-left.svg" alt="" />
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
  