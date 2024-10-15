import { GameBoard, GameRooms, GameBoardVisual } from "@/components/modules";
import { notificateStore } from "@/store/notificateStore";
import { motion } from "framer-motion";
import { FloatingBubbles } from './components/common/FloatingBubbles';


export function ReactiveChain() {
    const { currentRoom, isSpectator, setSelectedGame } = notificateStore();

    return (
        <div className="relative">
            <FloatingBubbles />  {/* Añadimos el componente de burbujas aquí */}
            <div className="flex items-center ml-8 mt-4">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-white z-10 hover:text-yellow-300 transition-colors"
                onClick={() => setSelectedGame(null)}
              >
                <img className="w-16" src="./images/arrow-left.svg" alt="" />
              </motion.button>
              
              <div className="text-2xl font-bold text-white ml-2">Back</div>
            </div>
            <img className="absolute w-full z-1 top-[-100px]  select-none pointer-events-none" 
             src="/bg-chain-banner.png" alt="" />

            <div className="flex items-center justify-center flex-col">
                <div className="flex z-10 justify-center">
                    {(!currentRoom || isSpectator) && (
                    <div className="mx-2">
                        <div className="text-xl text-center mb-10">A reactive, thought-provoking strategy game for everyone</div>
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