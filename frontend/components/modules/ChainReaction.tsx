import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { doc, getDoc, updateDoc, Timestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { motion, AnimatePresence } from 'framer-motion';

// import { useTheme } from '../ThemeProvider';
import { notificateStore } from "@/store/notificateStore";
import { LoadingScreen } from "../common/LoadingScreen";
import Grid from '../common/Grid';
import { FirestoreGame } from '@/core/firebaseGame';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import WonOrLostModal from '../common/WonOrLostModal';
import GameCounter from '@/games-modules/DinamiteGame/components/GameCounter';
import { GameButton } from '../ui/GameButton';
import { toast } from '../ui/use-toast';
import { ChainReactionGame } from '@/entry-functions/ChainReactionGame';
import { aptosClient } from '@/utils/aptosClient';

export function ChainReaction() {
  const [onlyValidation, setOnlyValidation] = useState(0);
  const { account, signAndSubmitTransaction } = useWallet();
  const startCountRef = useRef<any>(0);
  const { game, grid, currentPlayer, initializeGame, addAtom, players } = useGameStore();
  const [showCounter, setShowCounter] = useState(false);
  const [timeLeft, setTimeLeft] = useState<any>(null);
  // const [gameStarted, setGameStarted] = useState(false);
  // const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const { currentRoom } = notificateStore();
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
    // setGameStarted(false)
    // setWaitingForOpponent(false)
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
        amount = amount * game?.totalPlayers
        //console.log(game?.isBettingRoom)
        let statusGame = `${winner.moves}winner`
        let roomCodeContract = game?.roomIdContract
        modalWonOrLostModal(amount, game?.isBettingRoom, statusGame, roomCodeContract, true)
      } else {
        modalWonOrLostModal(0, game?.isBettingRoom, '', 0, false)
      }
    }
  }, [winner, account?.address, selectedGame]);

  //@ts-ignore
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
      game.turnEndTime = Timestamp.now().toMillis() + 15000; 

      setShowCounter(true);
      // setWaitingForOpponent(false);
      // setGameStarted(true);
    }else{
      // setWaitingForOpponent(true);
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

  async function leaveRoomContract(roomId: any) {
    try {
      const committedTransaction = await signAndSubmitTransaction(
        ChainReactionGame.leaveRoom(roomId)
      );
      const executedTransaction = await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });

      console.log(executedTransaction)

      toast({
        title: "Success",
        description: `Succeeded, hash: ${executedTransaction.hash}`,
      });
      return executedTransaction.success
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: `Transaction contract error`,
      });
      return false
    }
  }
  
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


        console.log(game.roomIdContract)
        if (game.isBettingRoom) {

          await updateDoc(game.gameDoc, {
            status: "completed"
          });

          let contractSucces = await leaveRoomContract(game.roomIdContract)
          if (!contractSucces) {
            toast({
              title: "Error",
              description: `error Join room in contract`,
            });
           
            await updateDoc(game.gameDoc, {
              status: "waiting"
            });
            setLoading(false);
            return
          }
        }

        if (isCreator && isOnlyPlayer && game.status === "waiting") {
          // El creador sale cuando aún no se han unido otros jugadores
          await updateDoc(game.gameDoc, {
            status: "completed",
            playersWallets:[],
          });
        } 
        
        // else if (game.status === "waiting") {
        //   // Otros jugadores salen durante el estado de espera
        //   let playerList = game.players.filter(vl => vl.wallet !== account?.address);
        //   let playerAddress = playerList.map(player => player.wallet);
        //   let currentPlayerWallet = playerAddress.length > 0 ? playerAddress[0] : "";
        //   await updateDoc(game.gameDoc, {
        //     currentPlayerWallet: currentPlayerWallet,
        //     players: playerList,
        //     playersWallets: playerAddress
        //   });
        // } else if (game.status === "live") {
        //   // Un jugador sale durante el juego en vivo
        //   const winner = game.players.find((vl) => vl.winner === true);
        //   if (!winner) {
        //     game.players = game.players.map(vl => {
        //       if (account?.address !== vl.wallet) {
        //         vl.winner = true;
        //       }
        //       return vl;
        //     });
        //     await updatPLayer(game, true);
        //     await updateDoc(game.gameDoc, { players: game.players, status: "completed" });
        //   }
        // } else {
        //   // Para cualquier otro estado, marcar como completado
        //   await updateDoc(game.gameDoc, { status: "completed" });
        // }

        setNotifyCurrentRoom(null);
        setIsSpectator(true);
      } catch (error) {
        console.error("Error al salir del juego:", error);
        // Aquí puedes añadir una notificación de error para el usuario
      }
    }
    
    setLoading(false);
  };

  // const { theme } = useTheme();

  function modalWonOrLostModal(amount: any, isBet: any, status_game: string, room_code: number, is_won: boolean) {
    setIsBettingRoom(isBet)
    setWonAmount(amount)
    setIsWon(is_won)
    setModalOpen(true)
    setStatusGame(status_game)
    setRoomCodeContract(room_code)
  }

  const handleCountdownEnd = ()=> {
    if (game) {
      game.turnEndTime = Timestamp.now().toMillis() + 15000;
      game.startGame();
      
      // setGameStarted(true);
      setShowCounter(false);
    }
  }

  return (
    <div className='absolute inset-0 flex items-center justify-center bg-purple-500 min-h-screen'>
      {loading && <LoadingScreen />}
      
      <div className='mt-9'>
        <div className="current-turn-banner bg-white bg-opacity-20 p-4 rounded-lg shadow-md mb-8 overflow-hidden">
          <h2 className="text-3xl font-bold text-center text-white flex items-center justify-center">
            <span>Current Turn:</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={currentPlayer?.color}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={`text-[14px] ml-2 ${currentPlayer?.color === 'red' ? 'text-red-600' : 'text-blue-600'}`}
              >
              {/* {formatAddress(currentPlayer?.wallet)} */}
              {currentPlayer?.wallet}
              </motion.span>
            </AnimatePresence>
          </h2>
        </div>

        <div className="flex">
          <div className="game-board flex-grow">
            <Grid
              grid={grid}
              // isBet={game && game.isBettingRoom}
              handleClick={handleClick}
              currentPlayer={currentPlayer}
            />
          </div>

          <div className="game-info w-64 ml-8">

          <motion.div 
            className="bg-white bg-opacity-10 p-4 rounded-lg shadow-md mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
              <h3 className="text-xl font-bold mb-2 text-white flex justify-between items-center">
                <span>Players:</span>
                <span>{players.length} of {game?.totalPlayers}</span>
              </h3>
              <ul>
                {players.map((player, index) => (
                  <li key={index} className="mb-2 flex items-center">
                    <span 
                      className={`w-3 h-3 rounded-full mr-2 ${
                        player.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                    />
                    <span className="w-full text-sm text-white flex justify-between items-center">
                      <span>{formatAddress(player.wallet)}</span>
                      <span className='text-green-400'>{player.wallet === account?.address && "YOU"}</span>
                      {/* {player.winner && <span className="ml-2 font-bold text-green-400">(Winner)</span>} */}
                      {/* {player.wallet === game?.currentPlayerWallet && <span className="ml-2 font-bold">(Current Turn)</span>} */}
                    </span>
                  </li>
                ))}
                
                {game?.totalPlayers &&[...Array((game?.totalPlayers || 1) - (players.length ||0))].map((_, index) => (
                  <li key={`missing-${index}`} className="mb-2 flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2 bg-gray-400" />
                    <span className="text-sm text-white">Waiting player to join...</span>
                  </li>
                ))}
              </ul>
          </motion.div>

            <motion.div 
              className="bg-white bg-opacity-10 p-4 rounded-lg shadow-md"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-xl font-bold mb-2 text-white">Atomic Energy</h3>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-purple-600 bg-purple-200">
                      {Math.ceil(timeLeft / 1000)}s
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-purple-200">
                  <motion.div 
                    style={{ width: `${(timeLeft / 15000) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-700"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / 15000) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
            {(game?.totalPlayers || 0) > (players.length ||0) && (
              <GameButton onClick={exitGame} color="bg-red-500" color_hover="bg-red-550" className='mt-4 border-red-700'>
                Exit Game
              </GameButton>
              // <motion.button 
              //   className="mt-4 bg-red-500 text-white px-6 py-2 rounded-full shadow-lg hover:bg-red-600 transition-colors duration-200"
              //   whileHover={{ scale: 1.05 }}
              //   whileTap={{ scale: 0.95 }}
              //   onClick={exitGame}
              // >
              //   Exit Game
              // </motion.button>
            )}
          </div>
        </div>
      </div>    
      

      <WonOrLostModal
        isOpen={isModalOpen}
        amount={wonAmount}
        isBet={isBettingRoom}
        isWon={isWon}
        status_game={statusGame}
        room_code_contract={roomCodeContract}
        onClose={() => setModalOpen(false)}
      />

      {showCounter && (
        <GameCounter onCountdownEnd={handleCountdownEnd} />
      )}
    </div>
  );
}

