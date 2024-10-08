import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function RoomDetailsDisplay() {
  const { game, currentPlayer, players } = useGameStore();
  const [, setUpdateTrigger] = useState(0);

  useEffect(() => {
    // Este efecto se ejecutará cada vez que game o players cambien
    setUpdateTrigger(prev => prev + 1);
  }, [game, players]);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 8)}`;
  };

  if (!game) return <div>No game data available</div>;

  return (
    <div className="game-data-display p-4 rounded-lg shadow-md">
      <ul className="space-y-2">
        {/* <li><span className="font-semibold">Status:</span> {game.status}</li>
    <li><span className="font-semibold">Is Betting Room:</span> {game.isBettingRoom ? 'Yes' : 'No'}</li>
    <li><span className="font-semibold">Bet Amount:</span> {game.betAmount}</li>
    <li><span className="font-semibold">Room ID Contract:</span> {game.roomIdContract}</li>
    <li><span className="font-semibold">Turn End Time:</span> {game.turnEndTime ? new Date(game.turnEndTime).toLocaleString() : 'Not set'}</li>
    <li><span className="font-semibold">Grid Size:</span> {grid.length}x{grid[0]?.length}</li> */}
        <li>
          <span className="font-semibold">Current Player:</span>
          <span className={`font-bold ${currentPlayer?.color === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
            {currentPlayer?.color} [{formatAddress(currentPlayer?.wallet)}]
          </span>
        </li>
        <li>
          <span className="font-semibold">Players:</span> {players.length}
          <ul className="ml-4 mt-2 space-y-1">
            {players.map((player, index) => (
              <li key={index} className={`${player.color === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
                {player.color} - {formatAddress(player.wallet)}
                {player.winner && <span className="ml-2 font-bold text-green-600">(Winner)</span>}
                {player.wallet === game.currentPlayerWallet && <span className="ml-2 font-bold">(Current Turn)</span>}
              </li>
            ))}
          </ul>
        </li>
        {/* <li><span className="font-semibold">Game Started:</span> {game.status === 'live' ? 'Yes' : 'No'}</li>
        <li>
          <span className="font-semibold">Winner:</span>
          {players.find(p => p.winner) ? (
            <span className={`font-bold ${players.find(p => p.winner)?.color === 'red' ? 'text-red-600' : 'text-blue-600'}`}>
              {players.find(p => p.winner)?.color}
            </span>
          ) : 'No winner yet'}
        </li> */}
      </ul>
    </div>
  );
}

