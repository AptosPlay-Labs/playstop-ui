import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GameCounter: React.FC<{onCountdownEnd: ()=>void}> = ({ onCountdownEnd }) => {
// const GameCounter = ({ onCountdownEnd }) => {
  const [counter, setCounter] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const [showCounter, setShowCounter] = useState(true);

  useEffect(() => {
    const timer = counter > 0? setInterval(() => setCounter(counter - 1), 1000):0;
    if (counter === 0) {
      setShowGo(true);
      setShowCounter(false);
      onCountdownEnd();
    //   setTimeout(() => {
    //     setShowCounter(false);
    //     onCountdownEnd();
    //   }, 1000);
    }
    return () => clearInterval(timer);
  }, [counter, onCountdownEnd]);

  const variants = {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.5, opacity: 0 }
  };

  return (
    <AnimatePresence>
      {showCounter && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            key={counter || 'go'}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5 }}
            className={`text-9xl font-bold ${
              showGo ? 'text-green-500' : 'text-white'
            }`}
          >
            {showGo ? 'GO!' : counter}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameCounter;