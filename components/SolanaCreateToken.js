// components/SolanaCreateToken.js

import React, { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  MINT_SIZE,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import axios from "axios";
import toast from "react-hot-toast";
import { MdOutlineGeneratingTokens } from "react-icons/md";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
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

  const notifySuccess = (msg) => {
    console.log("Success notification:", msg);
    toast.success(msg, { duration: 2000 });
  };
  const notifyError = (msg) => {
    console.error("Error notification:", msg);
    toast.error(msg, { duration: 2000 });
  };

  const createToken = useCallback(async () => {
    console.log("Starting token creation process...");

    if (!publicKey) {
      notifyError("Wallet not connected!");
      return;
    }

    try {
      setLoader(true);
      console.log("Fetching minimum balance for rent exemption...");
      const lamports = await getMinimumBalanceForRentExemptMint(connection);

      console.log("Generating mint keypair...");
      const mintKeypair = Keypair.generate();

      console.log("Getting associated token address...");
      const tokenATA = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey
      );
      console.log("Token ATA:", tokenATA.toBase58());

      console.log("Uploading metadata...");
      const metadataUrl = await uploadMetadata(token);
      console.log("Metadata URL:", metadataUrl);

      console.log("Creating transaction for token creation...");
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
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
        createAssociatedTokenAccountInstruction(
          publicKey,
          tokenATA,
          publicKey,
          mintKeypair.publicKey
        ),
        createMintToInstruction(
          mintKeypair.publicKey,
          tokenATA,
          publicKey,
          Number(token.supply) * Math.pow(10, Number(token.decimals))
        ),
        createCreateMetadataAccountV3Instruction(
          {
            metadata: PublicKey.findProgramAddressSync(
              [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
              METADATA_PROGRAM_ID
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
              },
              isMutable: false,
            },
          }
        )
      );

      console.log("Charging fee...");
      await chargeFee();

      console.log("Sending transaction...");
      const signature = await sendTransaction(transaction, connection, {
        signers: [mintKeypair],
      });
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
    if (!publicKey) {
      notifyError("Wallet not connected!");
      console.log("Error: Wallet not connected!");
      return;
    }

    console.log("Charging transaction fee to receiver address...");
    const receiverAddress = new PublicKey(SOLANA_RECEIVER);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: receiverAddress,
        lamports: LAMPORTS_PER_SOL * Number(SOLANA_FEE),
      })
    );

    try {
      const signature = await sendTransaction(transaction, connection);
      console.log("Fee transaction signature:", signature);
      notifySuccess("Fee charged successfully!");
    } catch (error) {
      console.error("Transaction failed:", error);
      notifyError(`Transaction failed: ${error.message}`);
    }
  }, [publicKey, sendTransaction, connection, SOLANA_RECEIVER, SOLANA_FEE]);

  const uploadMetadata = async (token) => {
    const { name, symbol, description, image } = token;
    if (!name || !symbol || !description || !image) {
      notifyError("Missing token metadata fields.");
      console.error("Error: Missing token metadata fields.");
      return null;
    }

    console.log("Uploading metadata to IPFS...");
    try {
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        { name, symbol, description, image },
        {
          headers: {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Metadata uploaded, IPFS URL:", response.data.IpfsHash);
      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
      console.error("Error uploading metadata to IPFS:", error);
      notifyError("Failed to upload metadata to IPFS.");
      throw new Error("Metadata upload failed");
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("Uploading image to IPFS...");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          formData,
          {
            headers: {
              pinata_api_key: PINATA_API_KEY,
              pinata_secret_api_key: PINATA_SECRET_KEY,
            },
          }
        );
        const imgHash = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
        console.log("Image uploaded, IPFS URL:", imgHash);
        updateToken({ ...token, image: imgHash });
      } catch (error) {
        console.error("Error uploading image to IPFS:", error);
        notifyError("Image upload failed");
      }
    }
  };

  return (
    <div className="modal-dark">
      <div className="modal-content-dark">
        <h2>Create a Solana Token</h2>
        <WalletMultiButton />

        {connected ? (
          <>
            <Input icon={<MdOutlineGeneratingTokens />} placeholder="Name" handleChange={(e) => updateToken({ ...token, name: e.target.value })} />
            <Input icon={<MdOutlineGeneratingTokens />} placeholder="Symbol" handleChange={(e) => updateToken({ ...token, symbol: e.target.value })} />
            <Input icon={<MdOutlineGeneratingTokens />} placeholder="Supply" handleChange={(e) => updateToken({ ...token, supply: e.target.value })} />
            <Input icon={<MdOutlineGeneratingTokens />} placeholder="Decimals" handleChange={(e) => updateToken({ ...token, decimals: e.target.value })} />
            <Input icon={<MdOutlineGeneratingTokens />} placeholder="Description" handleChange={(e) => updateToken({ ...token, description: e.target.value })} />
            <div className="upload-section">
              <label htmlFor="file">Upload Logo</label>
              <input type="file" id="file" onChange={handleImageChange} />
            </div>
            <button onClick={createToken}>Create Token (Fee: {SOLANA_FEE} SOL)</button>
            {tokenMintAddress && <p>Token Minted: {tokenMintAddress}</p>}
          </>
        ) : (
          <p>Please connect your wallet to create a token.</p>
        )}
      </div>
    </div>
  );
};

export default SolanaCreateToken;
