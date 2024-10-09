import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { doc, getDoc, updateDoc, Timestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

import { useTheme } from '../ThemeProvider';
import { notificateStore } from "@/store/notificateStore";
import { LoadingScreen } from "../common/LoadingScreen";
import Grid from '../common/Grid';
import { FirestoreGame } from '@/core/firebaseGame';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import WonOrLostModal from '../common/WonOrLostModal';
import GameCounter from '@/games-modules/DinamiteGame/components/GameCounter';

export function GameBoard() {
  const [onlyValidation, setOnlyValidation] = useState(0);
  const { account } = useWallet();
  const startCountRef = useRef<any>(0);
  const { game, grid, currentPlayer, initializeGame, addAtom, players } = useGameStore();
  const [showCounter, setShowCounter] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const { currentRoom, isSpectator } = notificateStore();
  const { selectedGame, setNotifyCurrentRoom, setIsSpectator } = notificateStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [wonAmount, setWonAmount] = useState(0);
  const [statusGame, setStatusGame] = useState('');
  const [roomCodeContract, setRoomCodeContract] = useState(0);
  const [isBettingRoom, setIsBettingRoom] = useState(false);

  const winner = players.find(player => player.winner == true);


  useEffect(() => {
    setOnlyValidation(0)
    setGameStarted(false)
    setWaitingForOpponent(false)
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
  }, [currentRoom, initializeGame, account?.address, selectedGame]);

  useEffect(() => { 
    const timer = setInterval(() => {
      const winner = game?.players.find(player => player.winner == true);
      console.log(game?.players.length)
      if (!winner && game && game.turnEndTime &&  game.players.length >= 2) {
        const timeRemaining = game.turnEndTime - Timestamp.now().toMillis();
        setTimeLeft(timeRemaining > 0 ? timeRemaining : 0);
        if (timeRemaining <= 0) {
          game.nextTurn();
          game.sync();
        }
      }
    }, 1000);
    return () => clearInterval(timer);

  }, [game, players, account?.address]);

  useEffect(() => {
    if (game?.status == 'live' && winner) {
      if (winner.wallet == account?.address) {
        let amount = parseFloat(game?.betAmount)
        //console.log(game?.isBettingRoom)
        let statusGame = `${winner.moves}winner`
        let roomCodeContract = game?.roomIdContract
        modalWonOrLostModal(amount, game?.isBettingRoom, statusGame, roomCodeContract, true)
      } else {
        modalWonOrLostModal(0, game?.isBettingRoom, '', 0, false)
      }
    }
  }, [winner, account?.address, selectedGame]);

  async function updatPLayer(game: FirestoreGame, isExit: Boolean) {

    if (onlyValidation > 0) return
    const winner = game?.players.find(player => player.winner == true);
    const lost = game?.players.find(player => player.winner == false);


    if (game && winner && game.status === "live" && winner?.wallet === account?.address) {
      const playerQuery = query(collection(db, 'players'), where('wallet', '==', winner?.wallet));
      const playerSnapshot = await getDocs(playerQuery);
      if (!playerSnapshot.empty) {
        let playerData: any = null;
        playerSnapshot.forEach((doc) => {
          playerData = doc.data();
        });
        const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);

        await updateDoc(playerDocRef, { winCount: playerData.winCount + 1 });
        setOnlyValidation(onlyValidation + 1)
      }
    }

    if (game && winner && game.status === "live" && (lost?.wallet === account?.address || isExit)) {
      //console.log("lost")
      //console.log(lost?.wallet)
      const playerQuery = query(collection(db, 'players'), where('wallet', '==', lost?.wallet));
      const playerSnapshot = await getDocs(playerQuery);
      if (!playerSnapshot.empty) {
        let playerData: any = null;
        playerSnapshot.forEach((doc) => {
          playerData = doc.data();
        });
        const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);
        await updateDoc(playerDocRef, { lostCount: playerData.lostCount + 1 });
        setOnlyValidation(onlyValidation + 1)
      }

    }
  }

  useEffect(() => {
    
    const winner = game?.players.find(player => player.winner == true);
    if (game && game.players.length >= 2 && !game?.turnEndTime && !winner && startCountRef.current<1) {

      startCountRef.current+=1
      game.turnEndTime = Timestamp.now().toMillis() + 30000; 

      setShowCounter(true);
      setWaitingForOpponent(false);
      setGameStarted(true);
    }else{
      setWaitingForOpponent(true);
    }

  }, [game, players, account?.address]);

  
  const handleClick = (row: number, col: number) => {
    const winner = game?.players.find(player => player.winner == true);
    if (game && !winner && account?.address && currentPlayer?.wallet === account?.address && players.every(player => player.play === true) && game.status && game.status === "live") {
      addAtom(row, col);
    } else {
      console.log('Not your turn, account?.address is invalid, or game has a winner');
    }
  };

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 8)}`;
  };

  const exitGame = async () => {
    setLoading(true);
    if (currentRoom && game) {
      try {
        const playerQuery = query(collection(db, 'players'), where('wallet', '==', account?.address));
        const playerSnapshot = await getDocs(playerQuery);
        const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);
        await updateDoc(playerDocRef, { actualRoom: "" });

        const isCreator = game.players[0].wallet === account?.address;
        const isOnlyPlayer = game.players.length === 1;

        if (isCreator && isOnlyPlayer && game.status === "waiting") {
          // El creador sale cuando aún no se han unido otros jugadores
          await updateDoc(game.gameDoc, {
            status: "leave",
            players: [],
            playersWallets: []
          });
        } else if (game.status === "waiting") {
          // Otros jugadores salen durante el estado de espera
          let playerList = game.players.filter(vl => vl.wallet !== account?.address);
          let playerAddress = playerList.map(player => player.wallet);
          let currentPlayerWallet = playerAddress.length > 0 ? playerAddress[0] : "";
          await updateDoc(game.gameDoc, {
            currentPlayerWallet: currentPlayerWallet,
            players: playerList,
            playersWallets: playerAddress
          });
        } else if (game.status === "live") {
          // Un jugador sale durante el juego en vivo
          const winner = game.players.find((vl) => vl.winner === true);
          if (!winner) {
            game.players = game.players.map(vl => {
              if (account?.address !== vl.wallet) {
                vl.winner = true;
              }
              return vl;
            });
            await updatPLayer(game, true);
            await updateDoc(game.gameDoc, { players: game.players, status: "completed" });
          }
        } else {
          // Para cualquier otro estado, marcar como completado
          await updateDoc(game.gameDoc, { status: "completed" });
        }

        setNotifyCurrentRoom(null);
        setIsSpectator(true);
      } catch (error) {
        console.error("Error al salir del juego:", error);
        // Aquí puedes añadir una notificación de error para el usuario
      }
    }
    setLoading(false);
  };

  const { theme } = useTheme();

  function modalWonOrLostModal(amount: any, isBet: any, status_game: string, room_code: number, is_won: boolean) {
    setIsBettingRoom(isBet)
    setWonAmount(amount)
    setIsWon(is_won)
    setModalOpen(true)
    setStatusGame(status_game)
    setRoomCodeContract(room_code)
  }

  const textStyle = {
    color: theme === 'light' ? '#1a202c' : '#ffffff',
    margin: '10px 0',
  };

  const buttonStyle = {
    backgroundColor: theme === 'light' ? '#3182CE' : '#63B3ED',
    color: '#ffffff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginRight: '10px',
  };

  const progressStyle = {
    width: '100%',
    height: '20px',
  };

  const handleCountdownEnd = ()=> {
    if (game) {
      game.turnEndTime = Timestamp.now().toMillis() + 30000;
      game.startGame();
      
      setGameStarted(true);
      setShowCounter(false);
    }
  }

  return (
    <div>
      {loading && <LoadingScreen />}

      <div>
        {showCounter && (
          <GameCounter onCountdownEnd={handleCountdownEnd} />
        )}
      </div>
      {winner ? (
        <p style={textStyle}>Winner: {winner.color} [{formatAddress(winner.wallet)}]</p>
      ) : (
        <div>
          <div className="grid grid-rows-3 grid-flow-col gap-4">
            <div className=" row-span-2 ...">
            <div className="game-data-display p-4 rounded-lg shadow-md">
              <ul className="space-y-2">
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
                        {player.wallet === game?.currentPlayerWallet && <span className="ml-2 font-bold">(Current Turn)</span>}
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </div>
            </div>
          </div>


          {gameStarted && (
            <div>
              {waitingForOpponent && <p style={textStyle}>Waiting for another player to join</p>}
            </div>
          )}
          <p style={textStyle}>Turn of: {currentPlayer?.color} [{formatAddress(currentPlayer?.wallet || '')}]</p>
          <div>
            {timeLeft !== null && <p style={textStyle}>Time remaining: {Math.ceil(timeLeft / 1000)}s</p>}
            <progress style={progressStyle} value={timeLeft ? (30000 - timeLeft) : 0} max="30000" />
          </div>

        </div>
      )}

      <Grid
        grid={grid}
        isBet={game && game.isBettingRoom}
        handleClick={handleClick}
        primaryColor="blue"
      />

      {!isSpectator && (
        <button style={buttonStyle} onClick={exitGame}>
          Exit
        </button>
      )}

      <WonOrLostModal
        isOpen={isModalOpen}
        amount={wonAmount}
        isBet={isBettingRoom}
        isWon={isWon}
        status_game={statusGame}
        room_code_contract={roomCodeContract}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

