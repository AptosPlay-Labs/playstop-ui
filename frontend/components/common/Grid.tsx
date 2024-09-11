import React from 'react';
import Atom from './Atom';
import Atom3d from './Atom3d';
import ExplodingCell from './ExplodingCell';
import '../../styles/globals.css';

interface GridProps {
  grid: any[];
  isBet: boolean | null;
  handleClick: (rowIndex: number, colIndex: number) => void;
  primaryColor: string;
}

const Grid: React.FC<GridProps> = ({ grid, isBet, handleClick }) => {
  return (
      <div className="board-grid">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell: any, colIndex: number) => (
              <div
                key={colIndex}
                className={`cell ${cell.player?.color}`}
                onClick={() => handleClick(rowIndex, colIndex)}
              >
                {cell.count < 4 ? (
                  <>
                    {isBet ? (
                      <Atom3d count={cell.count} />
                    ) : (
                      <Atom count={cell.count} />
                    )}
                  </>
                ) : (
                  <ExplodingCell count={cell.count} onExplode={() => handleClick(rowIndex, colIndex)} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
  );
};

export default Grid;