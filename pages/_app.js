// pages/_app.js

import React, { useMemo, useState, useEffect } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css"; // Optional styles for wallet modal UI

import "../styles/styles.css";

function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);
  const network = WalletAdapterNetwork.Devnet;

  useEffect(() => {
    // This will only run on the client side
    setIsClient(true);
  }, []);

  const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);

  // Render null on the server to avoid SSR issues
  if (!isClient) {
    return null;
  }

  return (
    <ConnectionProvider endpoint={`https://api.devnet.solana.com`}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default MyApp;
