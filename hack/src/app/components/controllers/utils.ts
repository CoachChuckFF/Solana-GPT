import { ChatMessage } from "chatgpt";
import { ENV } from "../models/env";
import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function countTokens(text: string): number {
    // A rough approximation of OpenAI's tokenization rules
    // Note: this is still not 100% accurate!
  
    // 1. Split by spaces
    let tokens = text.split(/\s+/);
  
    // 2. Split further by punctuation
    tokens = tokens.flatMap(t => t.split(/(?<=[.,!?])/));
    
    const tokenCount = tokens.length;
  
    // Add a 34% safety margin
    const safetyMargin = 0.20;
    const tokenCountWithMargin = Math.ceil(tokenCount * (1 + safetyMargin));
  
    return tokenCountWithMargin;
  }

  export function getQuestionCost(text: string, shouldDouble: boolean = true): BN {
    return new BN(
        countTokens(text) * ENV.lamportsPerToken * (shouldDouble ? 2 : 1)
    )
  }

  export const callChatGPT = async (
    ownerKeyString: string,
    hopperKeyString: string,
    signatureMessage: string,
    signature: string,
    question: string, 
    conversationId?: string, 
    parentMessageId?: string
  ) => {

      const response = await fetch(`${ENV.apiEndpoint}/gpt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question, conversationId, parentMessageId, signatureMessage, signature, ownerKeyString, hopperKeyString})
      });

      if(!response.ok){ throw new Error(response.statusText);}
      
      const data = await response.json();

      if(data.error){ throw new Error(data.error);}

      return data.response as ChatMessage;

    }