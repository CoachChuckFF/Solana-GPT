import { getProgram, gptApi } from "@/app/components/controllers/server/server";
import { getQuestionCost } from "@/app/components/controllers/utils";
import { Backend, IDL } from "@/app/components/models/backend";
import { ENV } from "@/app/components/models/env";
import { BN, Program, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import base58 from "bs58";
import { NextResponse } from "next/server";
import nacl from "tweetnacl";

enum API_STATE {
    checkingSignature = 'Checking Signature',
    gettingChatGPT = 'Calling ChatGPT',
    withdrawing = 'Withdrawing from Hopper'
}

export async function POST(req: Request) {
    let state = API_STATE.checkingSignature;

    try {

        const { question, conversationId, parentMessageId, signatureMessage, signature, ownerKeyString, hopperKeyString } = await req.json();

        // ---------- CHECK SIGNATURE ------------------
        const signatureBytes = base58.decode(signature);
        const signatureMessageBytes = new TextEncoder().encode(signatureMessage);
        const publicKeyBytes = base58.decode(ownerKeyString);

        if(!nacl.sign.detached.verify(signatureMessageBytes, signatureBytes, publicKeyBytes)) 
            throw new Error("Signature does not match!")

        // ---------- GRAB GPT REPONSE ------------------
        state = API_STATE.checkingSignature;
        const response = await gptApi.sendMessage(question, {
            conversationId,
            parentMessageId
        })

        // ---------- WITHDRAW SOLANA ------------------
        state = API_STATE.withdrawing;
        const lamportsToSpend = getQuestionCost(question + " " + response.text, false);
        const hopperKey = new PublicKey(hopperKeyString);
        const ownerKey = new PublicKey(ownerKeyString);
        const apiProgram = getProgram();

        if(!apiProgram.provider.publicKey) throw new Error("Need provider!")

        await apiProgram.methods.withdraw(lamportsToSpend)
            .accounts({
                hopper: hopperKey,
                owner: ownerKey,
                api: apiProgram.provider.publicKey,
                systemProgram: web3.SystemProgram.programId
            }).rpc()


        return NextResponse.json({status: "OK", response: response, cost: lamportsToSpend.toNumber()});
    } catch(e) {
        console.log(e)
        return NextResponse.json({status: "ERROR", error: `Error at ${state}\n\n Error:\n${e}`});
    }

  }