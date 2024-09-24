import { Network } from "@aptos-labs/ts-sdk";
import { NetworkInfo, isAptosNetwork } from "@aptos-labs/wallet-adapter-react";
import { PRIVATE_KEY } from "@/constants";
import * as ed from '@noble/ed25519';
import { hexToBytes } from '@noble/hashes/utils';
import { sha512 } from '@noble/hashes/sha512';
import { Buffer } from 'buffer';

ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export const isValidNetworkName = (network: NetworkInfo | null) => {
  if (isAptosNetwork(network)) {
    return Object.values<string | undefined>(Network).includes(network?.name);
  }
  // If the configured network is not an Aptos network, i.e is a custom network
  // we resolve it as a valid network name
  return true;
};

export function createSignature(roomId: number, status: string, wallet: string) {
  // Convertir la clave privada de hexadecimal a Uint8Array
  const privateKey = hexToBytes(PRIVATE_KEY);

  // Crear el mensaje a firmar
  const message = createGameMessage(roomId, status, wallet);

  // Firmar el mensaje
  const signatureBytes = ed.sign(message, privateKey);

  // Convertir el status a bytes
  const statusBytes = new TextEncoder().encode(status);

  return { signatureBytes, statusBytes };
}

function createGameMessage(roomId: number, status: string, wallet: string): Uint8Array {
  // Convertir roomId a una cadena de 16 caracteres (8 bytes en hexadecimal)
  const roomIdHex = roomId.toString(16).padStart(16, '0');

  // Asegurarse de que el wallet no tenga el prefijo '0x'
  const cleanedWallet = wallet.startsWith('0x') ? wallet.slice(2) : wallet;

  // Convertir status a hexadecimal
  const statusHex = Buffer.from(status).toString('hex');

  // Concatenar todo en una sola cadena hexadecimal
  const messageHex = roomIdHex + cleanedWallet + statusHex;

  // Convertir la cadena hexadecimal a Uint8Array
  return hexToBytes(messageHex);
}

