import { useEffect, useState } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { BettingGames, NonBettingGames, MyGames, GameRoom } from '../../core/FirestoreGameRoom';
import { FirestorePlayers, Player } from '../../core/FirestorePlayers';
//import { Box, Tabs, TabList, TabPanel, TabPanels, VStack, Tab, Button, Grid } from '@chakra-ui/react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

//import { CHAIN_NAME } from '@/config';
// import { Text, useColorModeValue } from "@interchain-ui/react";
import { db } from '../../config/firebase';
import { addDoc, collection, updateDoc, doc, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
//import { useChain } from '@cosmos-kit/react';
import { notificateStore } from '@/store/notificateStore';
import { LoadingScreen } from "../common/LoadingScreen";

export function GameRooms() {
  const [roomsNoBet, setRoomsNoBet] = useState<GameRoom[]>([]);
  const [roomsBet, setRoomsBet] = useState<GameRoom[]>([]);
  const [topPlayers, setTopPlayers] = useState<Player[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]); // Add state for MyGames
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  //const primaryColor = useColorModeValue("#000000", "#FFFFFF");
  //const { status, account?.address } = useChain(chainName);
  const { account } = useWallet();
  const { setNotifyCurrentRoom, setIsSpectator } = notificateStore();
  const [loading, setLoading] = useState<boolean>(false);
  
  useEffect(() => {
    // [1,2,3,4,5,6,7,8].map(vl=>{
    //   createNewGameRoom()
    // })
    setLoading(true);
    const nonBettingGames = new NonBettingGames();
    nonBettingGames.onSnapshot((updatedRooms) => {
        setRoomsNoBet(updatedRooms);
    });

    const bettingGames = new BettingGames();
    bettingGames.onSnapshot((updatedRooms) => {
        setRoomsBet(updatedRooms);
    });

    const firestorePlayers = new FirestorePlayers();
    firestorePlayers.onSnapshot((players) => {
      setTopPlayers(players);
    });

    if (account?.address) {
        const firestoreMyGames = new MyGames(account?.address); // Initialize MyGames
        firestoreMyGames.onSnapshot((games) => {
        setMyGames(games);
        });
    }
    
    async function checkCurrentRoom() {
      setCurrentRoom(null);
      if (account?.address) {
        const q = query(collection(db, 'players'), where('wallet', '==', account?.address));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          const playersCollection = collection(db, 'players');
          const newPlayer = {
            actualRoom: "",
            lostAmount: 0,
            lostCount: 0,
            wallet: account?.address,
            winAmount: 0,
            winCount: 0
          };

          try {
            const docRef = await addDoc(playersCollection, newPlayer);
            console.log('Document created with ID:', docRef.id);
          } catch (error) {
            console.error("Error creating new player: ", error);
          }
        }

        const gameQuery = query(collection(db, 'games'),
          where('playersWallets', 'array-contains', account?.address),
          where('status', 'in', ['live', 'waiting']),
          orderBy('createRoomTime', 'desc'));

        const gameSnapshot = await getDocs(gameQuery);

        if (!gameSnapshot.empty) {
          gameSnapshot.forEach((doc_game) => {
            const gameData = doc_game.data();
            if (gameData.players.some((player: Player) => player.wallet === account?.address)) {
              querySnapshot.forEach((vl) => {
                const playerData = vl.data();
                if (playerData.actualRoom && playerData.actualRoom === doc_game.id) {
                  setCurrentRoom(playerData.actualRoom);
                  setNotifyCurrentRoom(playerData.actualRoom);
                  setIsSpectator(false);
                }
              });
            }
          });
        } else {
          if (!querySnapshot.empty) {
            await querySnapshot.forEach(async (doc_players) => {
              const playerData = doc_players.data();
              if (playerData.actualRoom && playerData.actualRoom !== "") {
                const playerDocRef = doc(db, 'players', doc_players.id);
                await updateDoc(playerDocRef, { actualRoom: "" });
              }
            });
          }

          setCurrentRoom(null);
        //   if (rooms.length > 0 && rooms[0].status === 'live') {
        //     setNotifyCurrentRoom(rooms[0].id);
        //   }
          setIsSpectator(true);
        }

      } else {
        setCurrentRoom(null);
        // if (rooms.length > 0 && rooms[0].status === 'live') {
        //   setNotifyCurrentRoom(rooms[0].id);
        // }
        setIsSpectator(true);
      }
      setLoading(false);
    }

    checkCurrentRoom();
  }, [account?.address]);

  async function joinGame(room: GameRoom) {
    setLoading(true);
    if (!account?.address) {
      alert('Please connect your wallet to proceed.');
      setLoading(false);
      return;
    }

    const playerQuery = query(collection(db, 'players'), where('wallet', '==', account?.address));
    const playerSnapshot = await getDocs(playerQuery);
    let playerData: any = null;
    playerSnapshot.forEach((doc) => {
      playerData = doc.data();
    });

    const gameQuery = query(collection(db, 'games'),
      where('playersWallets', 'array-contains', account?.address),
      where('status', '==', 'waiting'),
      orderBy('createRoomTime', 'desc'));

    const gameSnapshot = await getDocs(gameQuery);
    let existingGame: any = null;
    gameSnapshot.forEach((doc) => {
      existingGame = doc.data();
      existingGame.id = doc.id;
    });

    if ((playerData && playerData.actualRoom && playerData.actualRoom) ||
      (existingGame && existingGame.id)) {
      alert('You are already in another room.');
      return;
    }

    if (room.players.length < room.totalPlayers && room.grid === "") {
      const gameDocRef = doc(db, 'games', room.id);
      const newPlayer = {
        color: room.players.length === 0 ? 'red' : 'blue',
        moves: 0,
        play: false,
        wallet: account?.address,
        winner: false,
      };
      let newCurrentplayer = (existingGame && existingGame.currentPlayerWallet && (existingGame.currentPlayerWallet !== "")) ? existingGame.currentPlayerWallet : account?.address;

      //esto uede generar error en caso se unan 2 usuarios al mismo tiempo.
      await updateDoc(gameDocRef, { players: [...room.players, newPlayer],
        playersWallets: [...room.playersWallets, account?.address],
        currentPlayerWallet: newCurrentplayer });

      if (playerData) {
        const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);
        await updateDoc(playerDocRef, { actualRoom: room.id });
      }

      setCurrentRoom(room.id);
      setNotifyCurrentRoom(room.id);
      setIsSpectator(false);
    } else {
      alert('Unable to join this room.');
    }
    setLoading(false);
  }

  async function createNewGameRoom() {
    if (!account?.address) {
      alert('Player account?.address not found.');
      return;
    }

    const initialData = {
      currentPlayerWallet: "",//account?.address,
      grid: "",
      players: [
        // {
        //   color: "red",
        //   moves: 0,
        //   play: false,
        //   wallet: account?.address,
        //   winner: false
        // }
      ],
      playersWallets:[],
      totalPlayers: 2,
      isBettingRoom: true,
      createRoomTime: Timestamp.now(),
      status:"waiting"
    };

    try {
      const gameRoomsCollection = collection(db, 'games');
      const docRef = await addDoc(gameRoomsCollection, initialData);
      const newDocId = docRef.id;
    } catch (error) {
      console.error("Error creating new game room: ", error);
    }
  }

  async function viewGamePlay(room_id: any) {
    setLoading(true);
    setNotifyCurrentRoom(room_id);
    setIsSpectator(true);
    setLoading(false);
  }

  return (
    <div className="min-w-[650px]">
      {loading && <LoadingScreen />}
      <Tabs className="text-center">
        <TabList>
          <Tab>Training Mode</Tab>
          <Tab>Challenge Mode</Tab>
          <Tab>My Wins</Tab>
          <Tab>Top Players</Tab>
        </TabList>

        <TabPanel>
          <div className="max-h-[420px] min-w-[450px] pr-[10px] overflow-y-auto">
            {roomsNoBet.filter(room => !room.isBettingRoom).map((room, index) => (
              <div key={room.id} className="border border-green-400 rounded-3xl p-4 mb-4 shadow-md">
                <h3 className="text-xl mb-2">Game Room: #{index + 1}</h3>
                <p>Id: {room.id}</p>
                <div className="grid grid-cols-2 gap-2">
                  <p>Players: {room.totalPlayers}</p>
                  <p>Game Started: {room.grid !== "" ? "Yes" : "No"}</p>
                  <p>Players Needed: {room.totalPlayers - room.players.length}</p>
                  <p>Game Ended: {room.winnerWallet ? "Yes" : "No"}</p>
                  {room.winnerWallet && <p>Winner: {room.winnerWallet}</p>}
                </div>
                {room.grid === "" && room.players.length < room.totalPlayers && (
                  <button
                    onClick={() => joinGame(room)}
                    disabled={!!currentRoom}
                    className="bg-blue-500 text-white px-4 py-2 rounded mt-2 w-[120px]"
                  >
                    Join
                  </button>
                )}
                {room.grid !== "" && (
                  <button 
                    onClick={() => viewGamePlay(room.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                  >
                    View Game
                  </button>
                )}
                {room.grid === "" && room.players.length === room.totalPlayers && (
                  <p>Pending Start...</p>
                )}
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="max-h-[420px] min-w-[450px] pr-[10px] overflow-y-auto">
            {roomsBet.filter(room => room.isBettingRoom).map((room, index) => (
              <div key={room.id} className="border border-green-400 rounded-3xl p-4 mb-4 shadow-md">
                <h3 className="text-xl mb-2">Game Room: #{index + 1}</h3>
                <p>Id: {room.id}</p>
                <div className="grid grid-cols-2 gap-2">
                  <p>Players: {room.totalPlayers}</p>
                  <p>Game Started: {room.grid !== "" ? "Yes" : "No"}</p>
                  <p>Players Needed: {room.totalPlayers - room.players.length}</p>
                  <p>Game Ended: {room.winnerWallet ? "Yes" : "No"}</p>
                  {room.winnerWallet && <p>Winner: {room.winnerWallet}</p>}
                </div>
                {room.grid === "" && room.players.length < room.totalPlayers && (
                  <button
                    onClick={() => joinGame(room)}
                    disabled={!!currentRoom}
                    className="bg-blue-500 text-white px-4 py-2 rounded mt-2 w-[120px]"
                  >
                    Join
                  </button>
                )}
                {room.grid !== "" && (
                  <button 
                    onClick={() => viewGamePlay(room.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                  >
                    View Game
                  </button>
                )}
                {room.grid === "" && room.players.length === room.totalPlayers && (
                  <p>Pending Start...</p>
                )}
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="max-h-[420px] min-w-[450px] pr-[10px] overflow-y-auto">
            {myGames.map((game, index) => (
              <div key={game.id} className="border border-green-400 rounded-3xl p-4 mb-4 shadow-md">
                <h3 className="text-xl mb-2">Game Room: #{index + 1}</h3>
                <p>Id: {game.id}</p>
                <p>Status: {game.status}</p>
                <p>Winner: {game.winnerWallet || "N/A"}</p>
                <p>Players: {game.players.length}</p>
                <p>Game Started: {game.grid !== "" ? "Yes" : "No"}</p>
                {game.winnerWallet === account?.address ? (
                  <p className="font-bold text-green-500">You Won!</p>
                ) : (
                  <p className="font-bold text-red-500">You Lost!</p>
                )}
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="max-h-[420px] min-w-[450px] pr-[10px] overflow-y-auto">
            {topPlayers.map((player, index) => (
              <div key={player.wallet} className="border border-green-400 rounded-3xl p-4 mb-4 shadow-md">
                <h3 className="text-xl mb-2">Player #{index + 1}</h3>
                <p>Wallet: {player.wallet}</p>
                <p>Wins: {player.winCount}</p>
                <p>Lost: {player.lostCount}</p>
              </div>
            ))}
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
