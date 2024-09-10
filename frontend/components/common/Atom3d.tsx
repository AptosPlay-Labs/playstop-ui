// src/components/Atom.tsx
import React, { useEffect, useState } from 'react';

const Atom: React.FC<{ count: number }> = ({ count }) => {
  const orbits = [];
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    // Genera un ángulo de rotación aleatorio entre 0 y 360 grados
    const randomRotation = Math.floor(Math.random() * 360);
    setRotation(randomRotation);
  }, []);

  for (let i = 0; i < count; i++) {
    orbits.push(
      <div key={i} className="orbit">
        <div className="electron" />
      </div>
    );
  }

  return (
    <div id="atom" style={{ transform: `rotate(${rotation}deg)` }}>
      <div id="nucleus"></div>
      {orbits}
    </div>
  );
};

export default Atom;
