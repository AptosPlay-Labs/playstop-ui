import { useEffect, useState } from 'react';
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { BettingGames, NonBettingGames, MyGames, GameRoom } from './components/FirestoreGameRoom';
import { FirestorePlayers, Player } from '../../core/FirestorePlayers';
//import { Box, Tabs, TabList, TabPanel, TabPanels, VStack, Tab, Button, Grid } from '@chakra-ui/react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

//import { CHAIN_NAME } from '@/config';
// import { Text, useColorModeValue } from "@interchain-ui/react";
import { db } from '../../config/firebase';
import { addDoc, collection, updateDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore';
//import { useChain } from '@cosmos-kit/react';
import { notificateStore } from '@/store/notificateStore';
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { aptosClient } from "@/utils/aptosClient";
import { ChainReactionGame } from '@/entry-functions/ChainReactionGame';
import CreateRoomModal from './components/CreateRoomModal';
import { GameButton } from '../../components/ui/GameButton';
import { toast } from '../../components/ui/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import GifToPng from '@/components/GifToPng';


const characters = [
  { id: 1, name: 'Bleach', image: './characters/bleach-skin.gif', color: 'from-red-500 to-orange-500' },
  { id: 2, name: 'Robin', image: './characters/robin-skin.gif', color: 'from-blue-500 to-purple-500' },
  { id: 3, name: 'sasuke', image: './characters/sasuke-skin.gif', color: 'from-green-500 to-teal-500' },
  { id: 4, name: 'zoro', image: './characters/zoro-skin.gif', color: 'from-gray-500 to-gray-700' },
  { id: 5, name: 'Bleach', image: './characters/bleach-skin.gif', color: 'from-red-500 to-orange-500' },
  { id: 6, name: 'Robin', image: './characters/robin-skin.gif', color: 'from-blue-500 to-purple-500' },
  { id: 7, name: 'sasuke', image: './characters/sasuke-skin.gif', color: 'from-green-500 to-teal-500' },
  { id: 8, name: 'zoro', image: './characters/zoro-skin.gif', color: 'from-gray-500 to-gray-700' },
  // Añade más personajes según sea necesario
];

export function GameRooms() {
  const [roomsNoBet, setRoomsNoBet] = useState<GameRoom[]>([]);
  const [roomsBet, setRoomsBet] = useState<GameRoom[]>([]);
  //@ts-ignore
  const [topPlayers, setTopPlayers] = useState<Player[]>([]);
  const [myGames, setMyGames] = useState<any[]>([]); // Add state for MyGames
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState(characters[0]);

  //const primaryColor = useColorModeValue("#000000", "#FFFFFF");
  //const { status, account?.address } = useChain(chainName);
  const { account, signAndSubmitTransaction } = useWallet();
  const { selectedGame, setNotifyCurrentRoom, setIsSpectator } = notificateStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isBettingRoom, setIsBettingRoom] = useState(false);

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

        const gameQuery = query(collection(db, 'games_ably'),
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
                console.log(playerData)
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
  }, [account?.address, selectedGame]);

  async function joinRoomContract(roomId:any){
      try {
          const committedTransaction = await signAndSubmitTransaction(
              ChainReactionGame.joinRoom(roomId)
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

  async function joinGame(room: GameRoom) {
    setLoading(true);
    if (!account?.address) {
      toast({
        title: "Error",
        description: `Please connect your wallet to proceed.`,
      });
      setLoading(false);
      return;
    }
    
    const playerQuery = query(collection(db, 'players'), where('wallet', '==', account?.address));
    const playerSnapshot = await getDocs(playerQuery);
    let playerData: any = null;
    playerSnapshot.forEach((doc) => {
      playerData = doc.data();
    });

    const gameQuery = query(collection(db, 'games_ably'),
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
      toast({
        title: "Error",
        description: 'You are already in another room.',
      });
      setLoading(false);
      return;
    }

    console.log(room.roomIdContract)
    if(room.isBettingRoom){
      let contractSucces = await  joinRoomContract(room.roomIdContract)
      if(!contractSucces){
        toast({
          title: "Error",
          description: `error Join room in contract`,
        });
        setLoading(false);
        return
      }
    }

    if (room.players.length < room.totalPlayers && !room.isStart) {
      //aqui enivar al contrato transaccion

      setCurrentRoom(room.id);
      setNotifyCurrentRoom(room.id);
      setIsSpectator(false);
    } else {
      toast({
        title: "Error",
        description: `Unable to join this room.`,
      });
    }
    setLoading(false);
  }

  async function viewGamePlay(room_id: any) {
    setLoading(true);
    setNotifyCurrentRoom(room_id);
    setIsSpectator(true);
    setLoading(false);
  }

  function modalCreateRoom(isbet:boolean){
    setIsBettingRoom(isbet)
    setModalOpen(true)
  }

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 8)}`;
  };

  return (
    <div className="min-w-[650px]">
      {loading && <LoadingScreen />}
      <div 
          className="
            w-full
            rounded-2xl
            cursor-pointer
            inline-block
            font-sans
            text-base
            font-bold
            tracking-wider
            leading-5
            text-white
            text-center
            uppercase
            p-4
            transition-all
            duration-200
            ease-in-out
            select-none
            shadow-lg
          "
          style={{
            transform: 'perspective(500px) rotateX(-8deg) rotateY(1deg) rotateZ(-1deg)',
            boxShadow: '0 4px 8px rgba(255, 255, 255, 0), 0 4px 0 0 rgba(0, 0, 0, 0.2)',
          }}>
            <div className="flex h-[280px] border rounded-3xl border-green-500 text-white overflow-hidden">
              <div className="w-2/5 flex items-center justify-center relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedCharacter.id}
                    className={`absolute inset-0`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>
                <motion.img
                  key={selectedCharacter.id}
                  src={selectedCharacter.image}
                  alt={selectedCharacter.name}
                  className="w-48 h-48 object-contain z-10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.h2
                  key={`name-${selectedCharacter.id}`}
                  className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xl font-bold text-white text-shadow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {selectedCharacter.name}
                </motion.h2>
              </div>

              <div className="w-[3px] bg-gradient-to-b from-green-600 to-green-300 transform -skew-x-12 z-20" />

              <div className="w-3/5 p-4 px-10 overflow-y-auto ">
                <div className="grid grid-cols-4 gap-4">
                  {characters.map((character) => (
                    <motion.div
                      key={character.id}
                      className={`cursor-pointer p-1 rounded-lg ${
                        selectedCharacter.id === character.id
                          ? `bg-gradient-to-br ${character.color}`
                          : 'opacity-[0.4]'
                      } transition-colors duration-300`}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedCharacter(character)}
                    >
                      <GifToPng
                        src={character.image}
                        alt={character.name}
                        className="m-auto h-20 object-cover rounded-md"
                      />
                      <p className="mt-1 text-center text-xs font-semibold">{character.name}</p>
                    </motion.div>
                  ))}
              </div>
          </div>
        </div>
      </div>
      <Tabs className="text-center">
        <TabList>
          <Tab>Training Mode</Tab>
          <Tab>Challenge Mode</Tab>
          <Tab>My Wins</Tab>
          {/* <Tab>Top Players</Tab> */}
        </TabList>

        <TabPanel>
          <div className="max-h-[420px] min-w-[450px] pr-[10px] overflow-y-auto">
            <div className='flex m-2 items-center justify-between'>
              <div>
                Create new game room
              </div>
              <div onClick={()=>modalCreateRoom(false)}>
                <GameButton onClick={()=>{}} color="bg-blue-500" color_hover="bg-blue-550" className='border-blue-700'>
                  Create
                </GameButton>
              </div>
            </div>
            {roomsNoBet.filter(room => !room.isBettingRoom).map((room) => (
              <div key={room.id} className="border border-green-400 rounded-3xl p-4 mb-4 shadow-md">

                {/* <h3 className="text-xl mb-2">Game Room: #{index + 1}</h3> */}
                <p className='text-xl mb-2'>Room Id: {room.id}</p>
                <div className="grid grid-cols-2 gap-2">
                  <p>Players: {room.totalPlayers}</p>
                  <p>Game Started: {room.isStart ? "Yes" : "No"}</p>
                  <p>Players Needed: {room.totalPlayers - room.players.length}</p>
                  <p>Game Ended: {room.winnerWallet ? "Yes" : "No"}</p>
                  {room.winnerWallet && <p>Winner: {formatAddress(room.winnerWallet)}</p>}
                </div>
                {!room.isStart && room.players.length < room.totalPlayers && (
                  // <button
                  //   onClick={() => joinGame(room)}
                  //   disabled={!!currentRoom}
                  //   className="bg-blue-500 text-white px-4 py-2 rounded mt-2 w-[120px]"
                  // >
                  //   Join
                  // </button>
                  <GameButton onClick={()=>joinGame(room)} disabled={!!currentRoom} 
                    color="bg-green-500" color_hover="bg-green-550" className='border-green-700 px-12'>
                    Join
                  </GameButton>
                )}
                {room.isStart && (
                  <button 
                    onClick={() => viewGamePlay(room.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                  >
                    View Game
                  </button>
                )}
                {!room.isStart && room.players.length === room.totalPlayers && (
                  <p>Pending Start...</p>
                )}
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="max-h-[420px] min-w-[450px] pr-[10px] overflow-y-auto">
            <div className='flex m-2 items-center justify-between'>
              <div>
                Create Betting game room
              </div>
              <div onClick={()=>modalCreateRoom(true)}>
                <GameButton onClick={()=>{}} color="bg-blue-500" color_hover="bg-blue-550" className='border-blue-700'>
                  Create
                </GameButton>
              </div>
            </div>
            {roomsBet.filter(room => room.isBettingRoom).map((room) => (
              <div key={room.id} className="border border-green-400 rounded-3xl p-4 mb-4 shadow-md">
                {/* <h3 className="text-xl mb-2">Game Room: #{index + 1}</h3> */}
                <p className='text-xl mb-2'>Room Id: {room.id}</p>
                <div className="grid grid-cols-2 gap-2">
                  <p>Players: {room.totalPlayers}</p>
                  <p>Game Started: {room.isStart ? "Yes" : "No"}</p>
                  <p>Players Needed: {room.totalPlayers - room.players.length}</p>
                  <p>Game Ended: {room.winnerWallet ? "Yes" : "No"}</p>
                  {room.winnerWallet && <p>Winner: {formatAddress(room.winnerWallet)}</p>}
                </div>
                {!room.isStart && room.players.length < room.totalPlayers && (
                  // <button
                  //   onClick={() => joinGame(room)}
                  //   disabled={!!currentRoom}
                  //   className="bg-blue-500 text-white px-4 py-2 rounded mt-2 w-[120px]"
                  // >
                  //   Join
                  // </button>
                  <GameButton onClick={()=>joinGame(room)} disabled={!!currentRoom} 
                    color="bg-green-500" color_hover="bg-green-550" className='border-green-700 px-12'>
                    Join
                  </GameButton>
                )}
                {room.isStart && (
                  <button 
                    onClick={() => viewGamePlay(room.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded mt-2"
                  >
                    View Game
                  </button>
                )}
                {!room.isStart && room.players.length === room.totalPlayers && (
                  <p>Pending Start...</p>
                )}
              </div>
            ))}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="max-h-[420px] min-w-[450px] pr-[10px] overflow-y-auto">
            {myGames.map((game) => (
              <div key={game.id} className="border border-green-400 rounded-3xl p-4 mb-4 shadow-md">
                {/* <h3 className="text-xl mb-2">Game Room: #{index + 1}</h3> */}
                <p className='text-xl mb-2'>Room Id: {game.id}</p>
                {/* <p>Status: {game.status}</p> */}
                <p>Winner: {formatAddress(game.winnerWallet) || "N/A"}</p>
                <p>Players: {game.players.length}</p>
                {/* <p>Game Started: {game.grid !== "" ? "Yes" : "No"}</p> */}
                {game.winnerWallet === account?.address ? (
                  <p className="font-bold text-green-500">You Won!</p>
                ) : (
                  <p className="font-bold text-red-500">You Lost!</p>
                )}
              </div>
            ))}
          </div>
        </TabPanel>

        {/* <TabPanel>
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
        </TabPanel> */}
      </Tabs>
      <CreateRoomModal
        isOpen={isModalOpen}
        isbet={isBettingRoom}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
