import React from 'react';

interface AtomProps {
  count: number;
}

const Atom: React.FC<AtomProps> = ({ count }) => {
  const atoms = Array.from({ length: count }, (_, i) => (
    <div key={i} className="atom" />
  ));

  return (
    <div className="atoms-container">
      {atoms}
    </div>
  );
};

export default Atom;