"use client";
import { useEffect, useRef, useState } from "react";
import { FaGithub, FaTwitter } from "react-icons/fa";
import { ChatMessage } from "chatgpt";
import {
  callChatGPT,
  countTokens,
  getQuestionCost,
} from "./components/controllers/utils";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import WalletButton from "./components/hooks/WalletButton";
import * as base58 from "bs58";
import { Backend, IDL } from "./components/models/backend";
import { AnchorProvider, BN, IdlAccounts, Program } from "@coral-xyz/anchor";
import { ENV } from "./components/models/env";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getHopperKey } from "./components/controllers/hopper";
import Head from "next/head";

interface ExtendedChatMessage extends ChatMessage {
  isUser: boolean;
}
type HopperStruct = IdlAccounts<Backend>["hopper"];

export default function Home() {

  // -------------- STATE ---------------------------
  const [solanaPrice, setSolanaPrice] = useState<number | null>(null)
  const [questionText, setQuestionText] = useState("");
  const [questionCost, setQuestionCost] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [shakeFeedbackOn, setShakeFeedbackOn] = useState(false);
  const [program, setProgram] = useState<Program<Backend> | null>(null);
  const [hopperKey, setHopperKey] = useState<PublicKey | null>(null);
  const [hopperAccount, setHopperAccount] = useState<HopperStruct | null>(null);
  const [lastTransactionCost, setLastTransactionCost] = useState<number | null>(null);

  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet(); // For the program
  const walletModal = useWalletModal();
  const questionInputRef = useRef<HTMLTextAreaElement>(null);


  // -------------- EFFECTS ---------------------------

  // On Wallet
  useEffect(() => {
    if (anchorWallet) {
      const backendProgramProvider = new AnchorProvider(
        connection,
        anchorWallet,
        AnchorProvider.defaultOptions()
      );
      const backendProgram = new Program<Backend>(
        IDL,
        ENV.apiProgramKey,
        backendProgramProvider
      );
      setProgram(
        new Program<Backend>(IDL, ENV.apiProgramKey, backendProgramProvider)
      );

      setHopperKey(
        getHopperKey(backendProgram, ENV.apiWalletKey, anchorWallet.publicKey)
      );

      updateHopperAccount();
    } else {
      setProgram(null);
      setHopperKey(null);
      setHopperAccount(null);
    }
  }, [anchorWallet, wallet.publicKey]);

  // On Program Update
  useEffect(() => {
    updateHopperAccount();
  }, [program, hopperKey]);

  // Question Costs
  useEffect(() => {
    setQuestionCost(getQuestionCost(questionText).toNumber());
  }, [questionText, getQuestionCost, countTokens]);

  // Focus on start
  useEffect(() => {
    questionInputRef.current?.focus();
    fetchSolanaCost();
    setMessages([
      {
        isUser: false,
        id: "",
        text: "Hello there! Welcome to Solana-GPT! Here you can spend small amounts of ◎Solana per Chat-GPT4 question. To start you will need to:\n\n1. Connect your Solana wallet\n2. Load up your Hopper\n3. Ask a question!\n\nHappy Chatting!",
        role: "system"
      },
    ])
  }, []);


  // -------------- FUNCTIONS ---------------------------

  const fetchSolanaCost = () => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd").then((res)=>{
      res.json().then((data)=>{
        if(data.solana)
          if(data.solana.usd)
            setSolanaPrice(data.solana.usd)
      })
    })
  }

  const updateHopperAccount = () => {
    if (program && hopperKey) {
      program.account.hopper
        .fetch(hopperKey)
        .then((hopper) => {
          setHopperAccount({ ...hopper });
        })
        .catch(() => {
          setHopperAccount(null);
        });
    }
  };

  const sendAndConfirmIx = async(ix: TransactionInstruction)=>{
    if (!connection) throw new Error("Needs a connection");
    if (!wallet) throw new Error("Needs a wallet");

    const tx = new Transaction().add(ix);
    const txSig = await wallet.sendTransaction(tx, connection);
    const latestBlockHash = await connection.getLatestBlockhash();
    return connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: txSig,
    });
  }

  const createOrLoadHopperAccount = async (lamports: number) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (!wallet) throw new Error("Needs a wallet");
      if (!wallet.publicKey) throw new Error("Needs to be connected");
      if (!program) throw new Error("Need the program");
      if (!hopperKey) throw new Error("Need the hopper key");

      const ix = await program.methods
        .load(new BN(lamports))
        .accounts({
          hopper: hopperKey,
          owner: wallet.publicKey,
          api: ENV.apiWalletKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      await sendAndConfirmIx(ix)

    } catch (e) {
      console.log(e);
    }

    setTimeout(updateHopperAccount, 987)
    updateHopperAccount();
    setIsLoading(false);
  };

  const closeHopperAccount = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      if (!wallet) throw new Error("Needs a wallet");
      if (!wallet.publicKey) throw new Error("Needs to be connected");
      if (!program) throw new Error("Need the program");
      if (!hopperKey) throw new Error("Need the hopper key");

      const ix = await program.methods
        .close()
        .accounts({
          hopper: hopperKey,
          owner: wallet.publicKey,
          api: ENV.apiWalletKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

        await sendAndConfirmIx(ix)

    } catch (e) {
      console.log(e);
    }

    setTimeout(updateHopperAccount, 987);
    updateHopperAccount();
    setIsLoading(false);
  };

  const shake = () => {
    if (shakeFeedbackOn) return;
    setShakeFeedbackOn(true);
    setTimeout(() => setShakeFeedbackOn(false), 555);
  };

  // ------------ HANDLERS -------------------

  const handleSendMessage = (e: any) => {
    // So Enter can be used
    e.preventDefault();

    // Shakes if nothing entered
    if (!questionText) {
      shake();
      return;
    }

    // Checks connection
    if (!wallet.connected) {
      shake();
      walletModal.setVisible(true);
      return;
    }

    if (!hopperAccount) {
      shake();
      alert("You need a hopper account! Click Create to make one");
      return;
    }

    if (hopperAccount.loadedLamports.toNumber() < questionCost) {
      shake();
      alert("You need more lamports! Click Load to add more");
      return;
    }

    // Checks loading
    if (isLoading) return;
    setIsLoading(true);

    // Checks wallet sign
    if (!wallet.signMessage) throw new Error("Wallet needs to sign");

    // Sets up question
    const userMessage: ExtendedChatMessage = {
      conversationId:
        messages.length > 0 ? messages[0].conversationId : undefined,
      parentMessageId:
        messages.length > 0 ? messages[messages.length - 1].id : undefined,
      text: questionText,
      isUser: true,
      id: "",
      role: "user",
    };

    // Sets up signature
    const signatureMessage = `The following question: \n\n${questionText.substring(
      0,
      55
    )}...\n\n will deduct roughly ~◎${questionCost} ${solanaPrice ? `( \$${(solanaPrice * questionCost / LAMPORTS_PER_SOL).toFixed(5)} )` : ''} lamports from your loader account! \n\nSign to Agree`;
    const encodedMessage = new TextEncoder().encode(signatureMessage);


    wallet
      .signMessage(encodedMessage)
      .then((signatureArray) => {
        const signature = base58.encode(signatureArray);

        if (!signature) throw new Error("User did not sign");
        if (!wallet.publicKey) throw new Error("Wallet needs to sign in");
        if (!hopperKey) throw new Error("Need a hopper key");

        callChatGPT(
          wallet.publicKey.toString(),
          hopperKey.toString(),
          signatureMessage,
          signature,
          questionText,
          userMessage.conversationId,
          userMessage.parentMessageId
        )
          .then((data) => {
            const aiMessage = { ...data.response, isUser: false };
            setMessages([...messages, userMessage, aiMessage]);
            setLastTransactionCost(data.cost);
          })
          .catch((e) => {
            alert(`${e}`)
            console.error(e);
          })
          .finally(() => {
            setTimeout(updateHopperAccount, 987)
            updateHopperAccount();
            setIsLoading(false);
            setQuestionText("");
          });
      })
      .catch((e) => {
        alert(e);
        console.error(e);
        setIsLoading(false);
      });
  };

  const handleInputChange = (e: any) => {
    setQuestionText(e.target.value);
  };

  return (
    <>
      {/* Metadata */}
      <Head>
        <title>Solana-GPT</title>
        <meta property="og:title" content="Solana-GPT" key="title" />
        <meta name="description" content="Pay Per Question!" />
        <meta property="og:title" content="Solana-GPT" />
        <meta property="og:description" content="Pay Per Question!" />
        <meta property="og:type" content="website" />
      </Head>

      <div className="flex flex-col h-screen bg-gray-900 text-white">
        {/* Socials */}
        <div className="absolute z-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-opacity-10 text-5xl" style={{top: 'calc(50% - 5vh)'}}>
          Solana-GPT
        </div>

        {/* Socials */}

        <div className="absolute h-screen bg-gray-900 text-white">
          {/* Icons Section */}
          <div className="absolute top-4 left-4 space-x-4">
            <a
              href="https://github.com/CoachChuckFF/Solana-GPT"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub className="text-2xl text-white hover:text-blue-500 cursor-pointer" />
            </a>
            <a
              href="https://twitter.com/CoachChuckFF"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter className="text-2xl text-white hover:text-blue-500 cursor-pointer" />
            </a>
          </div>
        </div>

        {/* Solana Section */}
        <div className="absolute top-4 right-4 text-right space-y-2 flex flex-col items-end rounded-md pr-2 pb-2">
          <div className="px-3">
            <WalletButton />
          </div>
          {program && !hopperAccount && (
            <button
              onClick={() => {
                createOrLoadHopperAccount(LAMPORTS_PER_SOL * 0.01);
              }}
              className="cursor-pointer hover:bg-blue-700 text-white font-bold px-4 rounded"
            >
              🔥 Create Hopper ◎ 0.01
            </button>
          )}
          {hopperAccount && (
            <button
              onClick={() => {
                createOrLoadHopperAccount(LAMPORTS_PER_SOL * 0.01);
              }}
              className="cursor-pointer hover:bg-blue-700 text-white font-bold px-4 rounded"
            >
              🚂 Load Hopper ◎ 0.01
            </button>
          )}
          {hopperAccount && (
            <button
              onClick={() => {
                closeHopperAccount();
              }}
              className="cursor-pointer hover:bg-blue-700 text-white font-bold px-4 rounded"
            >
              🚧 Close Hopper
            </button>
          )}
          {hopperAccount && (
            <p className="cursor-pointer hover:bg-blue-700 text-white font-bold px-4 rounded" onClick={()=>{
              updateHopperAccount();
              if(lastTransactionCost){
                alert(`Last transaction cost: ◎ ${(
                  lastTransactionCost / LAMPORTS_PER_SOL
                ).toPrecision(2)} ${solanaPrice ? `( \$${(solanaPrice * lastTransactionCost / LAMPORTS_PER_SOL).toFixed(5)} )` : ''}`);
              }
            }}>
              ◎{" "}
              {(hopperAccount.loadedLamports / LAMPORTS_PER_SOL).toPrecision(8)}
            </p>
          )}
        </div>

        {/* Loader Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <p className="animate-pulse text-5xl">Loading...</p>
          </div>
        )}

{/* Chat Section */}
<div
  className="flex-grow overflow-auto space-y-4 flex items-center justify-center h-[80vh] z-1"
>
  <div className="w-full h-full overflow-y-auto px-32 pr-64">
    {messages.map((message, index) => (
      <div
        key={index}
        className={`my-5 mx-4 p-3 rounded-lg max-w-md ${
          message.isUser
            ? "ml-auto bg-blue-500 text-white"
            : "mr-auto bg-gray-700 text-white"
        }`}
      >
        <p className="text-base whitespace-pre-wrap">{message.text}</p>
      </div>
    ))}
  </div>
</div>

        {/* Input Section */}
        <div className="flex flex-col items-center px-4 pb-2 bg-gray-800 border-t-2 border-gray-700 z-2">
          <form
            onSubmit={handleSendMessage}
            className="flex justify-between items-center w-full mt-5"
          >
            <textarea
              maxLength={4000}
              style={{ height: "18vh" }}
              className={`border-2 border-gray-600 rounded-lg flex-grow mr-4 py-2 px-4 bg-gray-700 text-white placeholder-gray-400 ${
                shakeFeedbackOn ? "animate-shake" : ""
              }`}
              value={questionText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Ask a question..."
              ref={questionInputRef}
            />
            <button
              className="py-2 px-6 rounded-lg bg-blue-500 text-white"
              type="submit"
            >
              Send
            </button>
          </form>
          <p className="text-sm mt-3 text-gray-400">
            {questionText
              ? `This question will cost roughly ~◎ ${(
                  questionCost / LAMPORTS_PER_SOL
                ).toPrecision(2)} ${solanaPrice ? `( \$${(solanaPrice * questionCost / LAMPORTS_PER_SOL).toFixed(5)} )` : ''}`
              : "Your Hopper account will be charged per question"}
          </p>
        </div>
      </div>
    </>
  );
}
