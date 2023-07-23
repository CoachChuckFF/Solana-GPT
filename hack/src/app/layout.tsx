import './globals.css'
import type { Metadata } from 'next'
import { WalletAdapter } from './components/hooks/WalletAdapter'
import { ENV } from './components/models/env'


export const metadata: Metadata = {
  title: 'Solana-GPT',
  description: 'A GPT a-la-carte implementation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <WalletAdapter rpcUrl={ENV.rpcEndpoint} showTestWallets={ENV.showTestWallets}>
          {children}
        </WalletAdapter>
      </body>
    </html>
  );
}
