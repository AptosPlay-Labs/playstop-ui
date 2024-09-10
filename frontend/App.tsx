//import { useWallet } from "@aptos-labs/wallet-adapter-react";

// Internal Components
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
//import { Header } from "@/components/Header";
// import { WalletDetails } from "@/components/WalletDetails";
// import { NetworkInfo } from "@/components/NetworkInfo";
// import { AccountInfo } from "@/components/AccountInfo";
// import { TransferAPT } from "@/components/TransferAPT";
// import { MessageBoard } from "@/components/MessageBoard";

import { notificateStore } from "@/store/notificateStore";
import { GameBoard, GameRooms, GameBoardVisual } from "@/components/modules";
import {Layout} from "@/components/common"


function App() {
  //const { account } = useWallet();
  const { currentRoom, isSpectator } = notificateStore();

  return (
    <Layout>
      {/* <Header /> */}
      <div className="flex items-center justify-center flex-col">
      <div className="flex justify-center">
        {(!currentRoom || isSpectator) && (
          <div className="mx-2">
            <GameRooms/>
          </div>
        )}
        {(currentRoom && !isSpectator) && (
          <div className="mx-2">
            <GameBoard/>
          </div>
        )}
        {(currentRoom && isSpectator) && (
          <div className="mx-2">
            <GameBoardVisual/>
          </div>
        )}
      </div>
        {/* {connected ? (
          <Card>
            <CardContent className="flex flex-col gap-10 pt-6">
              <WalletDetails />
              <NetworkInfo />
              <AccountInfo />
              <TransferAPT />
              <MessageBoard />
            </CardContent>
          </Card>
        ) : (
          <CardHeader>
            <CardTitle>To get started Connect a wallet</CardTitle>
          </CardHeader>
        )} */}
      </div>
    </Layout>
  );
}

export default App;
