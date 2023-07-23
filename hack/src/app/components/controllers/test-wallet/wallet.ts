import { AnchorProvider } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { EventEmitter } from '@solana/wallet-adapter-base';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

interface ExcaliburWalletEvents {
  connect(...args: unknown[]): unknown;
  disconnect(...args: unknown[]): unknown;
}

export class ExcaliburWallet extends EventEmitter<ExcaliburWalletEvents> {
  // Public
  publicKey: PublicKey;
  provider: AnchorProvider;

  // Private
  _keypair: Keypair;

  constructor(keypair: Keypair, connection: Connection) {
    super();

    this._keypair = keypair;
    this.publicKey = this._keypair.publicKey;

    this.provider = new AnchorProvider(connection, new NodeWallet(this._keypair), {});

    // this.emit("connect", this.publicKey ?? web3.PublicKey.default);
  }

  // --------------- WALLET FUNCTIONS ------------------
  signTransaction = async (tx: Transaction) => {
    return this.provider.wallet.signTransaction(tx);
  };

  signAllTransactions = (txs: Transaction[]) => {
    return this.provider.wallet.signAllTransactions(txs);
  };

  createRawSignature = (message: Uint8Array) => {
    return nacl.sign.detached(message, this._keypair.secretKey);
  };

  createSignature = (message: Uint8Array) => {
    return bs58.encode(this.createRawSignature(message));
  };
}
