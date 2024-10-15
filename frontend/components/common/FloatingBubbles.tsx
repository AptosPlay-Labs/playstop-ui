import React from 'react';
import { motion } from 'framer-motion';

const pleasantColors = [
  '#FFB3BA', '#BAE1FF', '#BAFFC9', '#FFFFBA', '#FFD9BA',
  '#E0BBE4', '#957DAD', '#D0F0C0', '#F0E68C', '#F08080'
];
//@ts-ignore
const Bubble = ({ size, top, left, color }) => {
  return (
    <motion.div
      className="absolute rounded-full opacity-20"
      style={{
        width: size,
        height: size,
        top,
        left,
        backgroundColor: color,
      }}
      animate={{ 
        y: [0, -15, 0],
        x: [0, 15, 0],
        scale: [1, 1.1, 1]
      }}
      transition={{ 
        repeat: Infinity, 
        duration: 3 + Math.random() * 2, 
        ease: "easeInOut" 
      }}
    />
  );
};

export const FloatingBubbles = () => {
  const bubbles = React.useMemo(() => {
    return [...Array(30)].map((_, index) => {
      let top, left;
      const size = `${Math.random() * 40 + 20}px`;
      const color = pleasantColors[index % pleasantColors.length];

      // Determinar si la burbuja estará en la parte superior/inferior o izquierda/derecha
      if (Math.random() < 0.5) {
        // Parte superior o inferior
        top = Math.random() < 0.5 ? `${Math.random() * 25}%` : `${75 + Math.random() * 25}%`;
        left = `${Math.random() * 100}%`;
      } else {
        // Parte izquierda o derecha
        top = `${Math.random() * 100}%`;
        left = Math.random() < 0.5 ? `${Math.random() * 25}%` : `${75 + Math.random() * 25}%`;
      }

      return { size, top, left, color };
    });
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none z-0">
      {bubbles.map((bubble, index) => (
        <Bubble
          key={index}
          size={bubble.size}
          top={bubble.top}
          left={bubble.left}
          color={bubble.color}
        />
      ))}
    </div>
  );
};