// components/SolanaCreateToken.js

import React, { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"; // This provides the connect button

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
import UploadICON from "./UploadICON";
import Input from "./Input";

const SolanaCreateToken = ({ setLoader }) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [tokenMintAddress, setTokenMintAddress] = useState("");
  const [token, updateToken] = useState({ name: "", symbol: "", supply: "", decimals: "", image: "", description: "" });

  const notifySuccess = (msg) => toast.success(msg);
  const notifyError = (msg) => toast.error(msg);

  const createToken = useCallback(async () => {
    if (!publicKey) return notifyError("Wallet not connected!");
    try {
      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const mintKeypair = Keypair.generate();
      const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey);
      const metadataUrl = await uploadMetadata(token);
      
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
            metadata: PublicKey.findProgramAddressSync([Buffer.from("metadata"), TOKEN_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()], TOKEN_PROGRAM_ID)[0],
            mint: mintKeypair.publicKey,
            mintAuthority: publicKey,
            payer: publicKey,
            updateAuthority: publicKey,
          },
          {
            createMetadataAccountArgsV3: { data: { name: token.name, symbol: token.symbol, uri: metadataUrl, creators: null, sellerFeeBasisPoints: 0 }, isMutable: false },
          }
        )
      );

      await chargeFee();
      const signature = await sendTransaction(transaction, connection, { signers: [mintKeypair] });
      setTokenMintAddress(mintKeypair.publicKey.toString());
      notifySuccess("Token created successfully!");

    } catch (error) {
      notifyError("Failed to create token");
    }
  }, [publicKey, connection, sendTransaction]);

  const chargeFee = useCallback(async () => {
    const receiverAddress = new PublicKey(process.env.SOLANA_RECEIVER);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: receiverAddress,
        lamports: LAMPORTS_PER_SOL * Number(process.env.SOLANA_FEE),
      })
    );
    await sendTransaction(transaction, connection);
    notifySuccess("Fee charged successfully!");
  }, [publicKey, sendTransaction, connection]);

  const uploadMetadata = async (token) => {
    const data = JSON.stringify(token);
    const response = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", data, {
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
      },
    });
    return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
  };

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
        },
      });
      updateToken({ ...token, image: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}` });
    }
  };

  return (
    <div className="modal-dark">
      <div className="modal-content-dark">
        <h2>Create a Solana Token</h2>

        {/* Wallet connect button */}
        <WalletMultiButton />
        
        {connected ? (
          <>
            <Input icon={<MdOutlineGeneratingTokens />} placeholder="Name" handleChange={(e) => updateToken({ ...token, name: e.target.value })} />
            <Input icon={<MdOutlineGeneratingTokens />} placeholder="Symbol" handleChange={(e) => updateToken({ ...token, symbol: e.target.value })} />
            <Input icon={<MdOutlineGeneratingTokens />} placeholder="Supply" handleChange={(e) => updateToken({ ...token, supply: e.target.value })} />
            <Input icon={<MdOutlineGeneratingTokens />} placeholder="Decimals" handleChange={(e) => updateToken({ ...token, decimals: e.target.value })} />
            <div className="upload-section">
              <label htmlFor="file">Upload Logo</label>
              <input type="file" id="file" onChange={handleImageChange} />
            </div>
            <button onClick={createToken}>Create Token (Fee: {process.env.SOLANA_FEE} SOL)</button>
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
