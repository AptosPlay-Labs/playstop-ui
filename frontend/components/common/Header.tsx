// import ChainReactionIcon from "./ChainReactionIcon";
//import { notificateStore } from "@/store/notificateStore";
import { Moon, Sun } from "lucide-react"; // Asumiendo que estás usando lucide-react para iconos
import { useTheme } from '../ThemeProvider';
import { WalletSelector } from "../WalletSelector";
// import { notificateStore } from "@/store/notificateStore";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  // const { setSelectedGame} = notificateStore();

  //const { address } = notificateStore();

  const toggleColorMode = () => {
    //setTheme(theme === "light" ? "dark" : "light");
    toggleTheme()
  };

  // const copyToClipboard = (text: string) => {
  //   navigator.clipboard.writeText(text).then(() => {
  //     // Aquí podrías añadir una notificación de que se ha copiado correctamente
  //     console.log("Copiado al portapapeles");
  //   });
  // };

  return (
    //className="shadow-md bg-white dark:bg-gray-800"
    <header className="z-10"> 
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4 cursor-pointer">
            {/* <ChainReactionIcon /> */}
            <img className="w-16 h-16" src="./favicon.png" alt="" />
            {/* <h1 className="text-2xl font-bold text-gray-800 dark:text-white">PlayStop.fun</h1> */}
            {/* dark:text-[#46dc8e] */}
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">PlayStop.fun</h1>

          </div>
          
          
          
          <div className="flex items-center space-x-4">
            <span className="font-bold text-xl">Tesnet</span>
            <WalletSelector />
            {/* {address && (
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-full py-1 px-3">
                <span className="text-sm text-gray-600 dark:text-gray-300">{address.slice(0, 6)}...{address.slice(-4)}</span>
                <button onClick={() => copyToClipboard(address)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <Copy size={16} />
                </button>
              </div>
            )} */}
            
            <button
              onClick={toggleColorMode}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white"
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
        
        {/* <div className="mt-1 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to PlayStop.fun</h2>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">A gameFi on Aptos PvP</p>
        </div> */}
      </div>
    </header>
  );
}