import { ChatGPTAPI } from "chatgpt";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor"
import { ENV } from "../../models/env";
import { Backend, IDL } from "../../models/backend";

export const gptApi = new ChatGPTAPI({
    apiKey: process.env.GPT_API_KEY as string,
    completionParams: {
      model: 'gpt-4',
      temperature: 0.5,
      top_p: 0.8
    }
  })

export const getProgram = ()=>{
  const keyString = process.env.SERVER_PRIVATE_KEY as string;
  const keyArray = JSON.parse(keyString);
  const keyBuffer = Buffer.from(keyArray);
  const apiKeypair = Keypair.fromSecretKey(keyBuffer);
  const apiProvider = new AnchorProvider(
    new Connection(ENV.rpcEndpoint),
    new Wallet(apiKeypair),
    AnchorProvider.defaultOptions()
  );
  return new Program<Backend>(IDL, ENV.apiProgramKey, apiProvider);
}
