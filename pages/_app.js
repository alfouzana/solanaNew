// pages/_app.js

import React, { useMemo, useState, useEffect } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { NetworkConfigurationProvider } from "../solana/contexts/NetworkConfigurationProvider";
import "@solana/wallet-adapter-react-ui/styles.css";
import "../styles/styles.css";

function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);
  const network = WalletAdapterNetwork.Devnet;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const wallets = useMemo(() => [new PhantomWalletAdapter()], [network]);
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC || "https://api.devnet.solana.com";

  if (!isClient) {
    return null;
  }

  return (
    <NetworkConfigurationProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Component {...pageProps} />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkConfigurationProvider>
  );
}

export default MyApp;
