import React, { useRef, useEffect, useState } from 'react';

interface JoystickProps {
  size: number;
  onMove: (x: number, y: number) => void;
}

const VirtualJoystickCanva: React.FC<JoystickProps> = ({ size, onMove }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const radius = size / 2;
  const innerRadius = size / 6;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawJoystick = () => {
      ctx.clearRect(0, 0, size, size);

      // Draw outer circle
      ctx.beginPath();
      ctx.arc(radius, radius, radius - 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.fill();

      // Draw inner circle (joystick)
      ctx.beginPath();
      ctx.arc(radius + position.x, radius + position.y, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
      ctx.fill();
    };

    drawJoystick();
  }, [size, position, innerRadius]);

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsPressed(true);
    handleMove(e);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPressed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : e;
    const x = touch.clientX - rect.left - radius;
    const y = touch.clientY - rect.top - radius;

    const distance = Math.sqrt(x * x + y * y);
    const maxDistance = radius - innerRadius;

    if (distance > maxDistance) {
      const angle = Math.atan2(y, x);
      const newX = Math.cos(angle) * maxDistance;
      const newY = Math.sin(angle) * maxDistance;
      setPosition({ x: newX, y: newY });
      onMove(newX / maxDistance, -newY / maxDistance);
    } else {
      setPosition({ x, y });
      onMove(x / maxDistance, -y / maxDistance);
    }
  };

  const handleEnd = () => {
    setIsPressed(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="touch-none"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    />
  );
};

export default VirtualJoystickCanva;