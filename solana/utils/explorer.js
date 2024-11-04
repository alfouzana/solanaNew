import { PublicKey, Transaction } from "@solana/web3.js";
import base58 from "bs58";

export function getExplorerUrl(
  endpoint,
  viewTypeOrItemAddress,
  itemType = "address"
) {
  const getClusterUrlParam = () => {
    let cluster = "";
    if (endpoint === "localnet") {
      cluster = `custom&customUrl=${encodeURIComponent(
        "http://127.0.0.1:8899"
      )}`;
    } else if (endpoint === "https://api.devnet.solana.com") {
      cluster = "devnet";
    }

    return cluster ? `?cluster=${cluster}` : "";
  };

  return `https://explorer.solana.com/${itemType}/${viewTypeOrItemAddress}${getClusterUrlParam()}`;
}
