import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export class ChainReactionGame {
  private static MODULE_ADDRESS = MODULE_ADDRESS;
  private static MODULE_NAME = "chain_reaction_game";

  static createRoom(betAmount: number, maxPlayers: number): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::${this.MODULE_NAME}::create_room`,
        functionArguments: [betAmount, maxPlayers],
      },
    };
  }

  static joinRoom(roomId: number): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::${this.MODULE_NAME}::join_room`,
        functionArguments: [roomId],
      },
    };
  }

  static leaveRoom(roomId: number): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::${this.MODULE_NAME}::leave_room`,
        functionArguments: [roomId],
      },
    };
  }

  static declareWinner(roomId: number, winnerAddress: string, gameState: Uint8Array, signature: Uint8Array): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::${this.MODULE_NAME}::declare_winner`,
        functionArguments: [roomId, winnerAddress, gameState, signature],
      },
    };
  }

  static changeFeePercentage(newPercentage: number): InputTransactionData {
    return {
      data: {
        function: `${this.MODULE_ADDRESS}::${this.MODULE_NAME}::change_fee_percentage`,
        functionArguments: [newPercentage],
      },
    };
  }
}