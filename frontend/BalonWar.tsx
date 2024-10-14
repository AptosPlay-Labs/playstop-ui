import React from 'react';
import { motion } from 'framer-motion';

const BalonWar: React.FC = () => {
  return (
    <div className="min-h-screen mt-[-100px] bg-gradient-to-br from-purple-600 to-yellow-400 flex items-center justify-center pt-16 overflow-hidden">
      
      <div className="absolute max-w-2xl z-0 transform perspective-1000 rotate-x-12">
          <img 
            src="/balon-map.png" 
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

export default BalonWar;