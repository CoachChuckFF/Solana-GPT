import { ChatGPTAPI } from "chatgpt";
import { PublicKey } from "@solana/web3.js";
import { Program, } from "@coral-xyz/anchor"
import { Backend } from "../models/backend";

export function getHopperKey(program: Program<Backend>, apiWalletKey: PublicKey, ownerKey: PublicKey){
    const [hopperKey] = PublicKey.findProgramAddressSync(
        [Buffer.from("HOPPER"), apiWalletKey.toBuffer(), ownerKey.toBuffer()],
        program.programId
    )

    return hopperKey;
}