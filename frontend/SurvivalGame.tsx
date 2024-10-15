import React from 'react';
import { motion } from 'framer-motion';
import { notificateStore } from './store/notificateStore';

const SurvivalGame: React.FC = () => {
  const { setSelectedGame} = notificateStore();

  return (
    
    <div className="relative min-h-screen mt-[-100px] bg-gradient-to-br from-purple-600 to-yellow-400 flex items-center justify-center pt-16 overflow-hidden">
      <div className="absolute top-28 left-0 flex items-center ml-8 mt-4">
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
      <div className="absolute max-w-xl z-0 transform perspective-1000 rotate-x-12">
          <img 
            src="/survival-map.png" 
            alt="Game Background"
            className="w-full h-full object-cover"
          />
      </div>
        
      <div className="relative w-full max-w-md">
        {/* Imagen de fondo inclinada */}
        

        <motion.div
          className="relative p-20 z-10"
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        >
          <img 
            src="/coming-soon.png" 
            alt="Coming Soon"
            className="w-full h-auto"
          />
        </motion.div>
        
        <motion.div
          className="absolute top-0 left-0 w-16 h-16 bg-yellow-300 rounded-full opacity-50"
          animate={{ 
            y: [0, -15, 0],
            x: [0, 15, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-12 h-12 bg-pink-400 rounded-full opacity-50"
          animate={{ 
            y: [0, 15, 0],
            x: [0, -15, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 -right-4 w-8 h-8 bg-purple-400 rounded-full opacity-50"
          animate={{ 
            x: [0, 10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
};

export default SurvivalGame;