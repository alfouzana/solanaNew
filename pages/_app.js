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
    setIsClient(true);
  }, []);

  // Initialize wallets only on client side
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);

  // Render null on the server to avoid SSR issues
  if (!isClient) {
    return null;
  }

  // Use the environment variable for the endpoint
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC || "https://api.devnet.solana.com";
  console.log("Solana endpoint:", endpoint); // Debugging to confirm endpoint is correct

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* Temporarily disable autoConnect to ensure button is displayed */}
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default MyApp;
