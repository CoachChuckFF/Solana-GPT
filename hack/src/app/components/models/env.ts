import { PublicKey } from "@solana/web3.js";

export const ENV = {
    showTestWallets: Boolean(process.env["NEXT_PUBLIC_SHOW_TEST_WALLETS"] as string),
    apiEndpoint: process.env["NEXT_PUBLIC_API_URL"] as string,
    rpcEndpoint: process.env["NEXT_PUBLIC_SOLANA_RPC_URL"] as string,
    apiProgramKey: new PublicKey(process.env["NEXT_PUBLIC_API_PROGRAM_KEY"] as string),
    apiWalletKey: new PublicKey(process.env["NEXT_PUBLIC_API_WALLET_KEY"] as string),
    lamportsPerToken: Number(process.env["NEXT_PUBLIC_LAMPORTS_PER_TOKEN"])
}