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
} from "@solana/web3.js";
import { getHopperKey } from "./components/controllers/hopper";

interface ExtendedChatMessage extends ChatMessage {
  isUser: boolean;
}
type HopperStruct = IdlAccounts<Backend>["hopper"];

export default function Home() {
  const [questionText, setQuestionText] = useState("");
  const [questionCost, setQuestionCost] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [shakeFeedbackOn, setShakeFeedbackOn] = useState(false);
  const [program, setProgram] = useState<Program<Backend> | null>(null);
  const [hopperKey, setHopperKey] = useState<PublicKey | null>(null);
  const [hopperAccount, setHopperAccount] = useState<HopperStruct | null>(null);

  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet(); // For the program
  const walletModal = useWalletModal();

  // Set autofocus to the question input
  const questionInputRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    updateHopperAccount();
  }, [program, hopperKey]);

  useEffect(() => {
    questionInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setQuestionCost(getQuestionCost(questionText).toNumber());
  }, [questionText, getQuestionCost, countTokens]);

  const updateHopperAccount = () => {
    if (program && hopperKey) {
      program.account.hopper
        .fetch(hopperKey)
        .then((hopper) => {
          console.log(hopper.loadedLamports.toNumber());
          setHopperAccount({ ...hopper });
        })
        .catch(() => {
          setHopperAccount(null);
        });
    }
  };

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

      const tx = new Transaction();
      tx.add(ix);

      const txSig = await wallet.sendTransaction(tx, connection);
      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: txSig,
      });
    } catch (e) {
      console.log(e);
    }

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

      const tx = new Transaction();
      tx.add(ix);

      const txSig = await wallet.sendTransaction(tx, connection);
      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: txSig,
      });
    } catch (e) {
      console.log(e);
    }

    updateHopperAccount();
    setIsLoading(false);
  };

  const handleInputChange = (e: any) => {
    setQuestionText(e.target.value);
  };

  const shake = () => {
    if (shakeFeedbackOn) return;
    setShakeFeedbackOn(true);
    setTimeout(() => setShakeFeedbackOn(false), 555);
  };

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
    )}...\n\n will deduct roughly ~◎${questionCost.toPrecision(
      2
    )} lamports from your loader account! \n\nSign to Agree`;
    const encodedMessage = new TextEncoder().encode(signatureMessage);

    if (!wallet.signMessage) throw new Error("Wallet needs to sign");

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
          .then((response) => {
            const aiMessage = { ...response, isUser: false };
            setMessages([...messages, userMessage, aiMessage]);
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
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

  return (
    <>
      <div className="flex flex-col h-screen bg-gray-900 text-white">
        {/* Socials */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-opacity-10 text-5xl" style={{top: 'calc(50% - 5vh)'}}>
          Solana-GPT
        </div>

        {/* Socials */}

        <div className="absolute h-screen bg-gray-900 text-white">
          {/* Icons Section */}
          <div className="absolute top-4 left-4 space-x-4">
            <a
              href="https://github.com/CoachChuckFF"
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
                createOrLoadHopperAccount(LAMPORTS_PER_SOL * 0.1);
              }}
              className="cursor-pointer hover:bg-blue-700 text-white font-bold px-4 rounded"
            >
              🔥 Create 0.1
            </button>
          )}
          {hopperAccount && (
            <p className="cursor-pointer">
              ◎{" "}
              {(hopperAccount.loadedLamports / LAMPORTS_PER_SOL).toPrecision(8)}
            </p>
          )}
          {hopperAccount && (
            <button
              onClick={() => {
                createOrLoadHopperAccount(LAMPORTS_PER_SOL * 0.1);
              }}
              className="cursor-pointer hover:bg-blue-700 text-white font-bold px-4 rounded"
            >
              🚂 Load 0.1
            </button>
          )}
          {hopperAccount && (
            <button
              onClick={() => {
                closeHopperAccount();
              }}
              className="cursor-pointer hover:bg-blue-700 text-white font-bold px-4 rounded"
            >
              🚧 Close
            </button>
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
          className="flex-grow overflow-auto space-y-4 flex items-center justify-center"
          style={{ height: "80vh"}}
        >
          <div className="w-full h-full overflow-y-auto px-20">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`my-5 mx-4 p-3 rounded-lg ${
                  message.isUser
                    ? "ml-auto bg-blue-500 text-white"
                    : "mr-auto bg-gray-700 text-white"
                } max-w-md`}
              >
                <p className="text-base">{message.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="flex flex-col items-center px-4 pb-2 bg-gray-800 border-t-2 border-gray-700">
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
                ).toPrecision(2)}`
              : "Your Hopper account will be charged per question"}
          </p>
        </div>
      </div>
    </>
  );
}
