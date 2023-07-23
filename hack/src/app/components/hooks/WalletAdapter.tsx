'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { useMemo } from 'react';
import { getTestAdapter } from '../controllers/test-wallet/get-test-adapter';
import { Connection } from '@solana/web3.js';

// Default styles that can be overridden by your app
require('@solana/wallet-adapter-react-ui/styles.css');


export interface WalletAdapterProps{
    children: React.ReactNode,
    rpcUrl: string,
    showTestWallets: boolean
}

export const WalletAdapter = (props: WalletAdapterProps) => {
    const { rpcUrl, children, showTestWallets } = props;

    const endpoint = useMemo(() => {return rpcUrl}, [rpcUrl]);
    const wallets = useMemo(() => [
        ...(showTestWallets ? getTestAdapter(new Connection(rpcUrl)) : []),
    ],[]);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};