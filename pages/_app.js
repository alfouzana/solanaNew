// pages/_app.js

import React, { useMemo, useState, useEffect } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

import "../styles/styles.css";

function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);
  const network = WalletAdapterNetwork.Devnet;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);

  // Ensure environment variable is loaded
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC || "https://api.devnet.solana.com";
  console.log("Solana endpoint:", endpoint); // For debugging

  if (!isClient) return null;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default MyApp;
