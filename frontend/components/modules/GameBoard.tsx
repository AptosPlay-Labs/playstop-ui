import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { doc, getDoc, updateDoc, Timestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

import { useTheme } from '../ThemeProvider';
import { notificateStore } from "@/store/notificateStore";
import {LoadingScreen} from "../common/LoadingScreen";
import Grid from '../common/Grid';
import { FirestoreGame } from '@/core/firebaseGame';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import WonOrLostModal from '../common/WonOrLostModal';

export function GameBoard() {
  const [onlyValidation, setOnlyValidation] = useState(0);
  const { account } = useWallet();

  const { game, grid, currentPlayer, initializeGame, addAtom, players } = useGameStore();
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

  const winner = players.find(player => player.winner==true);

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
          //const winner = data.players.find((vl:any) => vl.winner===true);
          initializeGame(8, 8, currentRoom, data.players);
          // if (data.status === 'waiting' && !winner) {
          //   initializeGame(8, 8, currentRoom, data.players);
          // } 
          // if (data.status === 'live' && !winner) {
          //   initializeGame(8, 8, currentRoom, data.players);
          // }
          // if (data.status === 'completed' && winner) {
          //   initializeGame(8, 8, currentRoom, data.players);
          // }
          
          // else {
          //   console.log("El juego ha finalizado.");
          // }
        }
      };
      fetchGame();
    }
  }, [currentRoom, initializeGame, account?.address, selectedGame]);

  useEffect(() => {
    const timer = setInterval(() => {
      const winner = game?.players.find(player => player.winner==true);
      if (!winner && game && game.turnEndTime) {
        const timeRemaining = game.turnEndTime - Timestamp.now().toMillis();
        setTimeLeft(timeRemaining > 0 ? timeRemaining : 0);
        if (timeRemaining <= 0) {
          game.nextTurn();
          game.sync();
        }
      }
    }, 1000);
    return () => clearInterval(timer);
    
  }, [game, account?.address, selectedGame]);

  useEffect(() => {
    if(game?.status == 'live' && winner){
      if(winner.wallet==account?.address){
        let amount = parseFloat(game?.betAmount) 
        //console.log(game?.isBettingRoom)
        let statusGame = `${winner.moves}winner`
        let roomCodeContract = game?.roomIdContract
        modalWonOrLostModal(amount,game?.isBettingRoom,statusGame,roomCodeContract,true)
      }else{
        modalWonOrLostModal(0,game?.isBettingRoom,'',0,false)
      }
    }
  }, [winner, account?.address, selectedGame]);

  async function updatPLayer(game:FirestoreGame, isExit:Boolean){

    
    if(onlyValidation>0) return
    const winner = game?.players.find(player => player.winner==true);
    const lost = game?.players.find(player => player.winner==false);
    
    
    if( game && winner && game.status === "live" && winner?.wallet === account?.address){
        const playerQuery = query(collection(db, 'players'), where('wallet', '==', winner?.wallet));
        const playerSnapshot = await getDocs(playerQuery);
        if(!playerSnapshot.empty){
            let playerData: any = null;
            playerSnapshot.forEach((doc) => {
                playerData = doc.data();
            });
            const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);

            await updateDoc(playerDocRef, { winCount:playerData.winCount+1});
            setOnlyValidation(onlyValidation+1)
        }
    }
    
    if( game && winner && game.status === "live" && (lost?.wallet === account?.address||isExit)){
      //console.log("lost")
      //console.log(lost?.wallet)
        const playerQuery = query(collection(db, 'players'), where('wallet', '==', lost?.wallet));
        const playerSnapshot = await getDocs(playerQuery);
        if(!playerSnapshot.empty){
            let playerData: any = null;
            playerSnapshot.forEach((doc) => {
                playerData = doc.data();
            });
            const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);
            await updateDoc(playerDocRef, { lostCount:playerData.lostCount+1});
            setOnlyValidation(onlyValidation+1)
        }
        
    }
  }

  useEffect(() => {
    const winner = game?.players.find(player => player.winner==true);
    if (game && players.length >= 2 && players.every(player => player.play === true) && game.status && game.status !== "live" && !game?.turnEndTime && !winner) {
      game.turnEndTime = Timestamp.now().toMillis() + 30000; // 30 segundos en el futuro
      //console.log("ingresa en comando start to live")
      game.startGame(); // Cambiar el estado a "live"
      setGameStarted(true);
    }
  

    // if (winner && game && game.status && game.status !== "completed") {
    //     updatPLayer(game, false)
    //     game.completeGame(); // Cambiar el estado a "completed"
    // }
  
    if (game && players.length >= 2 && players.every(player => player.play === true)) {
      setWaitingForOpponent(false);
      setGameStarted(true);
    } else {
      setWaitingForOpponent(true);
    }
  
    if (game) {
      let playerAddress = game.players.find(vl => vl.wallet === account?.address);
      if (playerAddress && playerAddress.play && !winner) {
        setGameStarted(true);
      }
    }
  }, [game, players, account?.address]);

  const startGame = async () => {
    if (game && !gameStarted && account?.address) {
      const playerIndex = game.players.findIndex(player => player.wallet === account?.address);
      if (playerIndex !== -1) {
        game.players[playerIndex].play = true;
        await updateDoc(game.gameDoc, { players: game.players });
        // if (game && players.length >= 2 && players.every(player => player.play === true)){
        //     setWaitingForOpponent(false);
        // }else {
        //     setWaitingForOpponent(true);
        // }
      }
    }
  };

  const handleClick = (row: number, col: number) => {
    const winner = game?.players.find(player => player.winner==true);
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
    setLoading(true)
    if (currentRoom && game) {
        const playerQuery = query(collection(db, 'players'), where('wallet', '==', account?.address));
        const playerSnapshot = await getDocs(playerQuery);
        //let playerData: any = null;
        // playerSnapshot.forEach((doc) => {
        //     playerData = doc.data();
        // });
        const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);
        await updateDoc(playerDocRef, { actualRoom: "" });

        const winner = game.players.find((vl:any) => vl.winner===true);
        if(!winner && game.status === "live"){
            game.players.map(vl=>{
                if(account?.address !== vl.wallet){
                    vl.winner = true    
                }
                return vl
            })
            await updatPLayer(game, true)
            await updateDoc(game.gameDoc, { players: game.players, status: "completed" });
            
        }
        
        if ( game.status === "waiting") {
            //revisar en caso sea mas de 2 jugadores, aqui solo se esta mateneindo los jugadores que se queden en el juego
            let playerList = game.players.filter(vl => vl.wallet !== account?.address);
            let playerAddress = playerList.map(player => player.wallet) //aqui que retorno ["",""] los adres asi
            let currentPlayerWallet = playerAddress.length>0 ?playerAddress[0]:""
            await updateDoc(game.gameDoc, {
                currentPlayerWallet: currentPlayerWallet,
                players: playerList,
                playersWallets: playerAddress
            });
        } else{
            await updateDoc(game.gameDoc, { status: "completed" });
        }
        
        setNotifyCurrentRoom(null);
        setIsSpectator(true);
    }
    setLoading(false)
  };

  const { theme } = useTheme();

  function modalWonOrLostModal(amount:any, isBet:any, status_game:string, room_code:number, is_won:boolean){
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

  const disabledButtonStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  const progressStyle = {
    width: '100%',
    height: '20px',
  };

  return (
    <div>
      {loading && <LoadingScreen />}

      {winner ? (
        <p style={textStyle}>Ganador: {winner.color} [{formatAddress(winner.wallet)}]</p>
      ) : (
        <div>
          <button 
            style={gameStarted ? disabledButtonStyle : buttonStyle} 
            onClick={startGame} 
            disabled={gameStarted}
          >
            Iniciar Juego
          </button>
          {gameStarted && (
            <div>
              {waitingForOpponent && <p style={textStyle}>Esperando que el otro jugador esté listo...</p>}    
            </div>
          )}
          <p style={textStyle}>Turno de: {currentPlayer?.color} [{formatAddress(currentPlayer?.wallet || '')}]</p>
          <div>
            {timeLeft !== null && <p style={textStyle}>Tiempo restante: {Math.ceil(timeLeft / 1000)}s</p>}
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
        amount= {wonAmount}
        isBet = {isBettingRoom}
        isWon={isWon}
        status_game = {statusGame}
        room_code_contract = {roomCodeContract}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
