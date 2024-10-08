import React, { useEffect, useState } from 'react';
import { Home, PlayCircle, Award } from 'lucide-react';
import { Crown } from 'lucide-react';
import { GameButton } from '../ui/GameButton';
import { aptosClient } from "@/utils/aptosClient";
import { ChainReactionGame } from '@/entry-functions/ChainReactionGame';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { toast } from '../ui/use-toast';
import { createSignature } from '@/utils/helpers';
import { notificateStore } from '@/store/notificateStore';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { LoadingScreen } from './LoadingScreen';

interface Withdraw {
    isOpen: boolean;
    amount: number;
    isBet: boolean;
    isWon: boolean;
    status_game: string;
    room_code_contract: number;
    onClose: () => void;
}

const WonOrLostModal: React.FC<Withdraw> = ({ isOpen, amount, isBet, isWon, status_game, room_code_contract, onClose }) => {
    const [amountWon, setAmountWon] = useState(0);
    const [amountFee, setAmountFee] = useState(0);
    const { account, signAndSubmitTransaction } = useWallet();
    const { setSelectedGame, setNotifyCurrentRoom, setIsSpectator } = notificateStore();
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (amount && account?.address) {
            let fee = (amount * 5) / 100;
            fee = parseFloat(fee.toFixed(3));

            let amount_won = amount - fee;
            amount_won = parseFloat(amount_won.toFixed(3));
            setAmountFee(fee)
            setAmountWon(amount_won)
        }
    }, [isWon, amount, isBet]);

    async function onPlayHome() {
        setLoading(true)
        let roomId = await endRoom()
        if (roomId) {
            onClose()

            setNotifyCurrentRoom(null);
            setIsSpectator(false);
            setSelectedGame(null)
        }
        setLoading(false)
    }

    async function onPlayRoom() {
        setLoading(true)
        let roomId = await endRoom()
        if (roomId) {
            onClose()

            setNotifyCurrentRoom(null);
            setIsSpectator(false);
        }
        setLoading(false)
    }

    async function endRoom() {
        try {
            const playerQuery = query(collection(db, 'players'), where('wallet', '==', account?.address));
            const playerSnapshot = await getDocs(playerQuery);
            let roomId = playerSnapshot.docs[0].data().actualRoom
            const playerDocRef = doc(db, 'players', playerSnapshot.docs[0].id);
            await updateDoc(playerDocRef, { actualRoom: "" });
            if(!isBet) {await endGame(roomId)}
            return roomId
        } catch (error) {
            return null
        }
    }

    async function endGame(id: string) {
        const gameDocRef = doc(db, 'games', id);
        await updateDoc(gameDocRef, { status: "completed" });
    }

    /* async function endGameNoBet(id: string) {
        const gameDocRef = doc(db, 'games', id);
        await updateDoc(gameDocRef, { status: "completed" });
    } */

    async function onClaimPrize() {
        setLoading(true)
        if (account && account?.address && isWon) {
            let signeture = createSignature(room_code_contract, status_game, account!.address)
            let declare_winner = await declareWinner(room_code_contract, signeture.statusBytes, signeture.signatureBytes, account.address)
            if (declare_winner) {
                let roomId = await endRoom()
                if (roomId) {
                    await endGame(roomId)
                    onClose()
                    setNotifyCurrentRoom(null);
                    setIsSpectator(false);
                }
            }
        }
        setLoading(false)
    }

    async function declareWinner(room_id: number, status: Uint8Array, signature: Uint8Array, wallet: string) {

        try {
            const committedTransaction = await signAndSubmitTransaction(
                ChainReactionGame.declareWinner(room_id, wallet, status, signature)
            );
            const executedTransaction = await aptosClient().waitForTransaction({
                transactionHash: committedTransaction.hash,
            });

            // console.log(executedTransaction)

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

    if (!isOpen) return null;
    return (
        <>
            {loading && <LoadingScreen />}
            <div className="fixed inset-0 bg-black bg-opacity-65 flex items-center justify-center">
                <div className="relative bg-purple-600 p-6 rounded-3xl border-b-8 shadow-lg w-80 border-purple-700">
                    <div className="basolute">
                        <Crown fill="currentColor" className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-yellow-400 w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-bold text-white text-center mb-4">End Game</h2>

                    <div className="text-center mb-6">
                        <p className="text-xl font-semibold text-yellow-300">
                            {isWon ? "Wow, you won 😎!" : "Sorry, you lost 😏"}
                        </p>
                        {isWon && isBet && (
                            <>
                                <p className="font-bold text-white mt-2">
                                    <span className='text-md mr-2'>Amount:</span>
                                    <span className='text-2xl '>{amountWon} APT</span>
                                </p>
                                <p className="text-white mt-1">
                                    Fee: {amountFee} APT
                                </p>
                            </>
                        )}
                    </div>

                    {isWon && isBet? (
                        <>
                            <div className="space-y-4">
                                <GameButton onClick={onClaimPrize} color="bg-yellow-500" color_hover="bg-yellow-550" className='border-yellow-700 w-full'>
                                    <div className='flex items-center justify-center space-x-2'>
                                        <Award fill="currentColor" size={20} />
                                        <span>Claim</span>
                                    </div>
                                </GameButton>
                            </div>
                        </>
                    ):(
                        <>
                            <div className="space-y-4 mb-4">
                                <GameButton onClick={onPlayHome} color="bg-blue-500" color_hover="bg-blue-550" className='border-blue-700 w-full'>
                                    <div className='flex items-center justify-center space-x-2'>
                                        <Home size={20} />
                                        <span>Home</span>
                                    </div>
                                </GameButton>
                                <GameButton onClick={onPlayRoom} color="bg-green-500" color_hover="bg-green-550" className='border-green-700 w-full'>
                                    <div className='flex items-center justify-center space-x-2'>
                                        <PlayCircle size={20} />
                                        <span>Rooms</span>
                                    </div>
                                </GameButton>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default WonOrLostModal;