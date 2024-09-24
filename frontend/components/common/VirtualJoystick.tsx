import React, { useState, useRef, useEffect } from 'react';

interface JoystickProps {
  size: number;
  onMove: (x: number, y: number) => void;
}

const VirtualJoystick: React.FC<JoystickProps> = ({ size, onMove }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const joystickRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (joystickRef.current) {
      const rect = joystickRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let x = event.clientX - centerX;
      let y = event.clientY - centerY;

      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = size / 2;

      if (distance > maxDistance) {
        x = (x / distance) * maxDistance;
        y = (y / distance) * maxDistance;
      }

      setPosition({ x, y });
      onMove(x / maxDistance, -y / maxDistance);
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div 
      ref={joystickRef}
      className="relative bg-gray-200 rounded-full cursor-pointer"
      style={{ width: size, height: size }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="absolute bg-blue-500 rounded-full"
        style={{
          width: size / 2,
          height: size / 2,
          left: `calc(50% + ${position.x}px)`,
          top: `calc(50% + ${position.y}px)`,
          transform: 'translate(-50%, -50%)'
        }}
      />
    </div>
  );
};

export default VirtualJoystick;