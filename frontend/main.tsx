import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "@/App.tsx";
// Internal components
import { Toaster } from "@/components/ui/toaster.tsx";
import { WalletProvider } from "@/components/WalletProvider.tsx";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
// @import url("./styles/globals.css"); 
//import './styles/globals.css';


const queryClient = new QueryClient();
function ThemedApp() {
  const { theme } = useTheme();
  
  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: theme === 'light' ? '#ffffff' : '#6128b6',
        color: theme === 'light' ? '#6128b6' : '#ffffff',
      }}
    >
      <App />
      <Toaster />
    </div>
  );
}

function AptosApp() {
  return (
    <React.StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <ThemedApp />
          </WalletProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<AptosApp />);

