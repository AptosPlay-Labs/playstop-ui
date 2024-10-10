import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { notificateStore } from "@/store/notificateStore";
import { LoadingScreen } from "../common/LoadingScreen";
import Grid from '../common/Grid';
import { useTheme } from '../ThemeProvider'; // Asumiendo que has creado este hook

export function GameBoardVisual() {
  const { account } = useWallet();
  const { grid, currentPlayer, initializeGame, players } = useGameStore();
  const { currentRoom, setNotifyCurrentRoom, setIsSpectator } = notificateStore();
  const [loading] = useState<boolean>(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (currentRoom) {
      const fetchGame = async () => {
        const gameDoc = doc(db, 'games', currentRoom);
        const docSnap = await getDoc(gameDoc);
        if (docSnap.exists()) {
          const data = docSnap.data();
          initializeGame(8, 8, currentRoom, data.players);
        }
      };
      fetchGame();
    }
  }, [currentRoom, initializeGame, account?.address]);

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 8)}`;
  };

  const winner = players.find(player => player.winner == true);

  const closeGame = () => {
    setNotifyCurrentRoom(null);
    setIsSpectator(true);
  };

  const textStyle = {
    color: theme === 'light' ? '#1a202c' : '#ffffff',
    marginBottom: '10px'
  };

  const buttonStyle = {
    backgroundColor: theme === 'light' ? '#3182CE' : '#63B3ED',
    color: '#ffffff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  };

  return (
    <div>
      {loading && <LoadingScreen />}
      {winner ? (
        <p style={textStyle}>Ganador: {winner ? `${winner.color} [${formatAddress(winner.wallet)}]` : "En juego"}</p>
      ) : (
        <p style={textStyle}>Turno de: {currentPlayer?.color} [{formatAddress(currentPlayer?.wallet)}]</p>
      )}
      <Grid 
        grid={grid} 
        // isBet={game && game.isBettingRoom} 
        handleClick={() => { /* Disable interaction */ }} 
        // primaryColor="blue" 
        currentPlayer={currentPlayer}
      />
      <button style={buttonStyle} onClick={closeGame}>Close</button> 
    </div>
  );
}