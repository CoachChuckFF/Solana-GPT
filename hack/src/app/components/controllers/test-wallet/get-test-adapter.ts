import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ExcaliburTestPoorRandomWalletAdapter,
  ExcaliburTestRandomWalletAdapter
} from './adapter';
import { ExcaliburWallet } from './wallet';

export const getTestAdapter = (connection: Connection) => {

  const getPoorRandomUser = async () => {
    return new ExcaliburWallet(Keypair.generate(), connection);
  };

  const getRandomUser = async () => {
    const keypair = Keypair.generate();
    const wallet = new ExcaliburWallet(keypair, connection);

    const sig = await connection.requestAirdrop(keypair.publicKey, 0.3 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);

    return wallet;
  };

  return [
    new ExcaliburTestRandomWalletAdapter(getRandomUser),
    new ExcaliburTestPoorRandomWalletAdapter(getPoorRandomUser)
  ];
};
