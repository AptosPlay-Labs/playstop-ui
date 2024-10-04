import { db } from '@/config/firebase';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { addDoc, collection, doc, getDocs, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { aptosClient } from "@/utils/aptosClient";
import { ChainReactionGame } from '@/entry-functions/ChainReactionGame';
import { GameButton } from '../../../components/ui/GameButton.tsx';
import { toast } from '../../../components/ui/use-toast';
import { LoadingScreen } from '../../../components/common/LoadingScreen';
import { notificateStore } from '@/store/notificateStore';

//import { createNewGameRoom, createNewGameRoomBet } from './gameFunctions'; // Asegúrate de importar las funciones correctas
// const GameButton: React.FC<{ children: React.ReactNode,color: string, color_hover:string, onClick:()=>void, className?:string }> = ({ children, color = "bg-blue-500", color_hover, onClick, className="" }) => {
    
//     return (
//         <button
//         onClick={onClick}
//         className={`relative ${color} text-white font-bold py-3 px-4 rounded-2xl 
//         border-b-4
//         active:border-b-0 active:border-t-4 active:translate-y-[4px] 
//         transition-all duration-100 ${className}`}
//         >
//         <span className="relative z-10">{children}</span>
//         <span className={`absolute inset-0 ${color_hover} rounded-2xl -z-10 translate-y-1`}></span>
//         </button>
//     )
    
// };
  
//@ts-ignore
const GameInput = ({ label, value, onChange, type = 'text', disabled = false }) => (
    <div className="mb-6 relative">
        <label className="block text-yellow-800 font-bold mb-2">{label}</label>
        <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl border-4 border-yellow-300 ${disabled?'bg-yellow-200':'bg-yellow-100'} text-yellow-800 focus:outline-none focus:border-yellow-500 transition-colors duration-200`}
        //className={`w-full px-4 py-3 rounded-xl border-4 border-yellow-300 ${disabled ? 'bg-yellow-200' : 'bg-yellow-100'} text-yellow-800 focus:outline-none focus:border-yellow-500 transition-colors duration-200 custom-number-input`}
        />
    </div>
);

//@ts-ignore
const BetInput = ({ label, value, onChange, disabled = false }) => {
    //const [displayValue, setDisplayValue] = useState('');
  
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
    
        if (/^$|^[0-9]*\.?[0-9]*$/.test(input)) {
            let processedInput = input;
      
            // Manejar casos especiales de números que comienzan con 0
            if (input.length > 1 && input.startsWith('0') && !input.startsWith('0.')) {
              // Si es un número que comienza con 0 pero no es decimal, lo reemplazamos con ''
              processedInput = '';
            } else if (input === '0') {
              // Permitir un solo '0'
              processedInput = '0';
            } else if (input.startsWith('0') && input !== '0' && !input.startsWith('0.')) {
              // Si comienza con 0 pero no es '0' ni un decimal, eliminamos el 0 inicial
              processedInput = input.slice(1);
            }
      
            onChange({ target: { value: processedInput } });
        }
      
    };
  
    return (
      <div className="mb-6 relative">
        <label className="block text-yellow-800 font-bold mb-2">{label}</label>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-xl border-4 border-yellow-300 ${
            disabled ? 'bg-yellow-200' : 'bg-yellow-100'
          } text-yellow-800 focus:outline-none focus:border-yellow-500 transition-colors duration-200`}
        />
        <span className='text-yellow-800 absolute right-2 m-4 item-aling-center justify-center'>APT</span>
      </div>
    );
};

//@ts-ignore
const NumberInput = ({ label, value, onChange, disabled=false, min = 2, max = 4 }) => {
    const handleIncrement = () => {
      const newValue = Math.min(value + 1, max);
      onChange({ target: { value: newValue } });
    };
  
    const handleDecrement = () => {
      const newValue = Math.max(value - 1, min);
      onChange({ target: { value: newValue } });
    };
  
    return (
      <div className="mb-6">
        <label className="block text-yellow-800 font-bold mb-2">{label}</label>
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || value <= min}
            className= "px-3 py-2 bg-yellow-300 text-yellow-800 font-bold rounded-l-xl border-b-4 border-yellow-500 active:border-b-0 active:border-t-4 active:translate-y-[4px] transition-all duration-100"
            // className="px-3 py-2 bg-yellow-300 text-yellow-800 rounded-l-xl border-2 border-yellow-300 focus:outline-none focus:border-yellow-500 transition-colors duration-200"
          >
            -
          </button>
          <input
            type="number"
            value={value}
            readOnly
            disabled={disabled}
            className={`w-full px-4 py-3 text-center border-y-4 border-yellow-300 ${
              disabled ? 'bg-yellow-200' : 'bg-yellow-100'
            } text-yellow-800 focus:outline-none transition-colors duration-200 custom-number-input`}
            min={min}
            max={max}
          />
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || value >= max}
            className= "px-3 py-2 bg-yellow-300 text-yellow-800 font-bold rounded-r-xl border-b-4 border-yellow-500 active:border-b-0 active:border-t-4 active:translate-y-[4px] transition-all duration-100"
            // className="px-3 py-2 bg-yellow-300 text-yellow-800 rounded-r-xl border-2 border-yellow-300 focus:outline-none focus:border-yellow-500 transition-colors duration-200"
          >
            +
          </button>
        </div>
        <div className='text-yellow-800 text-xs'>version beta max 4 players</div>
      </div>
    );
};
  
interface CreateRoom {
    isOpen: boolean;
    isbet: boolean;
    onClose: () => void;
}  

const CreateRoomModal: React.FC<CreateRoom> = ({ isOpen,isbet, onClose }) => {
    const { account, signAndSubmitTransaction } = useWallet();
    const [loading, setLoading] = useState<boolean>(false);

    const [betAmount, setBetAmount] = useState<any>('');
    const [totalPlayers, setTotalPlayers] = useState(2);
    const [isBettingRoom, setIsBettingRoom] = useState(false);
    const [isPrivateRoom, setIsPrivateRoom] = useState(false);
    const { setNotifyCurrentRoom, setIsSpectator } = notificateStore();

    useEffect(() => {
        setIsBettingRoom(isbet)
        setBetAmount(1)
    }, [isbet]);

    const handleCreateRoom = () => {
        setLoading(true);
        if (!account?.address) {
          toast({
            title: "Error",
            description: `Please connect your wallet to proceed.`,
          });
          setLoading(false);
          return;
        }

        if (isBettingRoom) {
        createNewGameRoomBet();
        } else {
        createNewGameRoom();
        }
    };

    async function createRoomContract(amount:any, players:any){

        try {
            const committedTransaction = await signAndSubmitTransaction(
                ChainReactionGame.createRoom(amount, players)
            );
            const executedTransaction = await aptosClient().waitForTransaction({
              transactionHash: committedTransaction.hash 
            });
            // console.log(executedTransaction)

            let roomContractData:any
            if ('events' in executedTransaction) {
                let events = executedTransaction.events;
                roomContractData = events.find(vl => vl.data.room_id !== undefined && vl.data.room_id !== '');
            } else {
            console.log('error transaccion');
            }

            toast({
              title: "Success",
              description: `Succeeded, hash: ${executedTransaction.hash}`,
            });
            let success = executedTransaction.success
            let room_id = roomContractData?.data?.room_id;
            return {success, room_id}

          } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: `Transaction contract error`,
              });
            return {success:false, room_id:0}
          }
    }

    async function createNewGameRoom() {
        // let amount = (betAmount * 100000000).toFixed(8).replace(/\.?0+$/, '');

        let isPlaynow = await validateIsPlayNow()
        if(isPlaynow=='') return
        
        const initialData = {
          roomIdContract:null,
          channel:`game-${Date.now()}`,
          isStart: false,
          players: [],
          dynamiteHolder:"",
          explosionTime:0,
          playersWallets:[account?.address],
          betAmount: "0.0",
          totalPlayers: totalPlayers,
          isBettingRoom: isBettingRoom,
          createRoomTime: Timestamp.now(),
          status:"waiting",
          winner: "",
          winnerWallet: ""
        };
    
        try {
            const gameRoomsCollection = collection(db, 'games_ably');
            const docRef = await addDoc(gameRoomsCollection, initialData);
            const newDocId = docRef.id;
            
            const playerQuery = query(collection(db, 'players'), where('wallet', '==', account?.address));
            const playerSnapshot = await getDocs(playerQuery);
            const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);
            await updateDoc(playerDocRef, { actualRoom: newDocId });

            setNotifyCurrentRoom(newDocId);
            setIsSpectator(false);
            onClose();
        } catch (error) {
            console.error("Error creating new game room: ", error);
            toast({
                title: "Error",
                description: `error create room in database`,
            });
        }
        setLoading(false);
    }
    
    async function createNewGameRoomBet() {
        let amountfloat = parseFloat(betAmount)
        let amountInCents = Math.round(amountfloat * 100000000);

        let amount = amountInCents.toFixed(8).replace(/\.?0+$/, '');

        let isPlaynow = await validateIsPlayNow()
        if(isPlaynow=='') return

        let txContract = await createRoomContract(amount, totalPlayers)

        if(txContract.success && txContract.room_id){
            let roomIdContract = parseInt(txContract.room_id)

              const initialData = {
                roomIdContract:roomIdContract,
                channel:`game-${Date.now()}`,
                isStart: false,
                players: [],
                dynamiteHolder:"",
                explosionTime:0,
                playersWallets:[account?.address],
                betAmount: betAmount,
                totalPlayers: totalPlayers,
                isBettingRoom: isBettingRoom,
                createRoomTime: Timestamp.now(),
                status:"waiting",
                winner: "",
                winnerWallet: ""
              };
          
              try {
                const gameRoomsCollection = collection(db, 'games_ably');
                const docRef = await addDoc(gameRoomsCollection, initialData);
                const newDocId = docRef.id;

                const playerQuery = query(collection(db, 'players'), where('wallet', '==', account?.address));
                const playerSnapshot = await getDocs(playerQuery);
                const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);
                await updateDoc(playerDocRef, { actualRoom: newDocId });

                setNotifyCurrentRoom(newDocId);
                setIsSpectator(false);
                onClose();
              } catch (error) {
                console.error("Error creating new game room: ", error);
                toast({
                    title: "Error",
                    description: `error create room in database`,
                });
              }
        }else{
            toast({
                title: "Error",
                description: `error create room in contract`,
            });
        }
        setLoading(false);
    }

    async function validateIsPlayNow() {
        const playerQuery = query(collection(db, 'players'), where('wallet', '==', account?.address));
        const playerSnapshot = await getDocs(playerQuery);
    
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

        let isPlayerSnapshot = (playerSnapshot && playerSnapshot.docs[0] && 
            playerSnapshot.docs[0].id && playerSnapshot.docs[0].data() && 
            playerSnapshot.docs[0].data().actualRoom && 
            playerSnapshot.docs[0].data().actualRoom !='')
            
        let isExistingGame = (gameSnapshot && gameSnapshot.docs && 
            gameSnapshot.docs[0] && gameSnapshot.docs[0].id)

        if ( isPlayerSnapshot || isExistingGame) {
            toast({
                title: "Error",
                description: `You are already in another room.`,
            });
            return ''
        }
        return playerSnapshot
    }

  if (!isOpen) return null;

  return (
    <>
    {loading && <LoadingScreen />}
    <div className="fixed inset-0 bg-black bg-opacity-65 flex justify-center items-center">
      <div className="bg-yellow-200 rounded-3xl p-8 max-w-lg w-full border-b-8 border-yellow-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-4 bg-sky-300 transform -translate-y-1"></div>
        
        <h2 className="text-3xl font-bold mb-6 text-yellow-800">Create a New Game Room</h2>

        <NumberInput
          label="Total Players"
          value={totalPlayers}
          onChange={(e:any) => setTotalPlayers(Number(e.target.value))}
        />

        <BetInput
          label="Bet Amount"
          value={betAmount}
          onChange={(e:any) => setBetAmount(e.target.value)}
          disabled={!isBettingRoom}
        />
        
        <div className="mb-6">
          <div className="flex">
            <label className="flex items-center cursor-pointer">
                <div className="relative">
                <input
                    type="checkbox"
                    checked={isBettingRoom}
                    onChange={(e) => setIsBettingRoom(e.target.checked)}
                    className="sr-only"
                />
                <div className="w-14 h-8 bg-yellow-300 rounded-full shadow-inner"></div>
                <div className={`absolute w-6 h-6 bg-white rounded-full shadow transition ${isBettingRoom ? 'right-1' : 'left-1'} top-1`}></div>
                </div>
                <div className="ml-3 w-[90px] text-yellow-800 font-bold">
                {isBettingRoom ? 'Betting' : 'Non-Betting'}
                </div>
            </label>
            <label className="hidden flex items-center cursor-pointer pl-4">
                <div className="relative">
                <input
                    type="checkbox"
                    checked={isPrivateRoom}
                    onChange={(e) => setIsPrivateRoom(e.target.checked)}
                    className="sr-only"
                />
                <div className="w-14 h-8 bg-yellow-300 rounded-full shadow-inner"></div>
                <div className={`absolute w-6 h-6 bg-white rounded-full shadow transition ${isPrivateRoom ? 'right-1' : 'left-1'} top-1`}></div>
                </div>
                <div className="ml-3 text-yellow-800 font-bold">
                {isPrivateRoom ? 'Private' : 'Non-Private'}
                </div>
            </label>
          </div>
        </div>
        

        <div className="flex justify-end space-x-4">
          <GameButton onClick={onClose} color="bg-red-500" color_hover="bg-red-550" className='border-red-700'>
            Cancel
          </GameButton>
          <GameButton onClick={handleCreateRoom} color="bg-green-500" color_hover="bg-green-550" className='border-green-700'>
            Create Room
          </GameButton>
        </div>
      </div>
    </div>
    </>
  );
};

export default CreateRoomModal;
