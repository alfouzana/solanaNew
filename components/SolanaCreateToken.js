import React, { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
import axios from "axios";
import toast from "react-hot-toast";
import { MdOutlineGeneratingTokens } from "react-icons/md";
import Input from "./Input";

const SolanaCreateToken = ({ setLoader }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [tokenMintAddress, setTokenMintAddress] = useState("");
  const [token, updateToken] = useState({
    name: "",
    symbol: "",
    decimals: "",
    supply: "",
    image: "",
    description: "",
  });

  const SOLANA_FEE = process.env.NEXT_PUBLIC_SOLANA_FEE;
  const SOLANA_RECEIVER = process.env.NEXT_PUBLIC_SOLANA_RECEIVER;
  const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

  const notifySuccess = (msg) => toast.success(msg, { duration: 2000 });
  const notifyError = (msg) => toast.error(msg, { duration: 2000 });

  const createToken = useCallback(async () => {
    if (!publicKey) return notifyError("Wallet not connected!");

    try {
      setLoader(true);
      console.log("Initializing token creation...");

      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const mintKeypair = Keypair.generate();
      const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey);
      const metadataUrl = await uploadMetadata(token);

      console.log("Preparing transaction for token creation...");
      
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: 82,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          Number(token.decimals),
          publicKey,
          publicKey,
          TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(publicKey, tokenATA, publicKey, mintKeypair.publicKey),
        createMintToInstruction(mintKeypair.publicKey, tokenATA, publicKey, Number(token.supply) * Math.pow(10, Number(token.decimals))),
        createCreateMetadataAccountV3Instruction(
          {
            metadata: PublicKey.findProgramAddressSync(
              [Buffer.from("metadata"), TOKEN_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
              TOKEN_PROGRAM_ID
            )[0],
            mint: mintKeypair.publicKey,
            mintAuthority: publicKey,
            payer: publicKey,
            updateAuthority: publicKey,
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                name: token.name,
                symbol: token.symbol,
                uri: metadataUrl,
                creators: null,
                sellerFeeBasisPoints: 0,
                collection: null,
                uses: null,
              },
              isMutable: false,
              collectionDetails: null,
            }
          }
        )
      );

      console.log("Charging fee...");
      await chargeFee();
      
      console.log("Sending token creation transaction...");
      const signature = await sendTransaction(transaction, connection, { signers: [mintKeypair] });
      console.log("Transaction signature:", signature);
      
      setTokenMintAddress(mintKeypair.publicKey.toString());
      notifySuccess("Token created successfully!");

    } catch (error) {
      console.error("Token creation failed:", error);
      notifyError("Failed to create token");
    } finally {
      setLoader(false);
    }
  }, [publicKey, connection, sendTransaction, setLoader, token]);

  const chargeFee = useCallback(async () => {
    try {
      const receiverAddress = new PublicKey(SOLANA_RECEIVER);
      console.log("Charging fee to receiver:", receiverAddress.toString());
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: receiverAddress,
          lamports: LAMPORTS_PER_SOL * Number(SOLANA_FEE),
        })
      );
      const signature = await sendTransaction(transaction, connection);
      console.log("Fee transaction signature:", signature);
      notifySuccess("Fee charged successfully!");
    } catch (error) {
      console.error("Fee transaction failed:", error);
      notifyError("Fee transaction failed");
    }
  }, [publicKey, sendTransaction, connection, SOLANA_RECEIVER, SOLANA_FEE]);

  const uploadMetadata = async (token) => {
    const { name, symbol, description, image } = token;
    if (!name || !symbol || !description || !image) {
      notifyError("Missing token metadata fields.");
      return null;
    }

    try {
      console.log("Uploading metadata to IPFS...");
      const response = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", { name, symbol, description, image }, {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
          "Content-Type": "application/json",
        },
      });
      console.log("Metadata uploaded successfully, IPFS URL:", `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`);
      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
      console.error("Error uploading metadata to IPFS:", error);
      notifyError("Failed to upload metadata to IPFS.");
      throw new Error("Metadata upload failed");
    }
  };

  return (
    <div className="modal-dark">
      <div className="modal-content-dark">
        <h2>Create a Solana Token</h2>
        <Input icon={<MdOutlineGeneratingTokens />} placeholder="Name" handleChange={(e) => updateToken({ ...token, name: e.target.value })} />
        <Input icon={<MdOutlineGeneratingTokens />} placeholder="Symbol" handleChange={(e) => updateToken({ ...token, symbol: e.target.value })} />
        <Input icon={<MdOutlineGeneratingTokens />} placeholder="Supply" handleChange={(e) => updateToken({ ...token, supply: e.target.value })} />
        <Input icon={<MdOutlineGeneratingTokens />} placeholder="Decimals" handleChange={(e) => updateToken({ ...token, decimals: e.target.value })} />
        <button onClick={createToken}>Create Token</button>
        {tokenMintAddress && <p>Token Minted: {tokenMintAddress}</p>}
      </div>
    </div>
  );
};

export default SolanaCreateToken;
