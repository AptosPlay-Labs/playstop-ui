import React from 'react';
import { motion } from 'framer-motion';
// import Atom from './Atom';
import Atom3d from './Atom3d';
import ExplodingCell from './ExplodingCell';

interface GridProps {
  grid: any[];
  // isBet: boolean | null;
  handleClick: (rowIndex: number, colIndex: number) => void;
  currentPlayer: any;
}

const Grid: React.FC<GridProps> = ({ grid, handleClick, currentPlayer }) => {
  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 rounded-xl shadow-lg overflow-hidden">
      {grid.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row flex justify-center">
          {row.map((cell: any, colIndex: number) => (
            <motion.div
              key={colIndex}
              className={`cell relative w-12 h-12 m-1 rounded-lg overflow-hidden`}
              onClick={() => handleClick(rowIndex, colIndex)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute inset-0"
                animate={{
                  backgroundColor: 
                    cell.player?.color === 'red' ? 'rgba(255,0,0,1)' : 
                    cell.player?.color === 'blue' ? 'rgba(0,0,255,1)' :
                    'rgba(200,200,200,0.2)', // Gris claro para celdas sin jugador
                }}
                transition={{ duration: 0.3 }}
              />
              
              {cell.count < 4 ? (
                <motion.div
                  className="w-full h-full flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <Atom3d count={cell.count} />
                  {/* {isBet ? (
                    <Atom3d count={cell.count} />
                  ) : (
                    <Atom count={cell.count} />
                  )} */}
                </motion.div>
              ) : (
                <ExplodingCell count={cell.count} onExplode={() => handleClick(rowIndex, colIndex)} />
              )}
              
              {cell.player?.color === currentPlayer?.color && (
                <motion.div
                  className="absolute inset-0 border-2 border-yellow-400 rounded-lg pointer-events-none"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Grid;