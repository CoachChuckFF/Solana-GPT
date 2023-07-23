import { WalletName } from '@solana/wallet-adapter-base';
import { TransactionVersion } from '@solana/web3.js';
import { BaseExcaliburWalletAdapter } from './base';
import { WALLET_IMAGE } from './wallet-image';

export const ExcaliburTestRandomWalletName = 'Excalibur Test ( Random )' as WalletName<'Excalibur Test ( Random )'>;
export const ExcaliburTestPoorRandomWalletName = 'Excalibur Test ( Poor )' as WalletName<'Excalibur Test ( Random )'>;
export const ExcaliburTestKnownWalletName = 'Excalibur Test ( Known )' as WalletName<'Excalibur Test ( Known )'>;

export class ExcaliburTestRandomWalletAdapter extends BaseExcaliburWalletAdapter {
  supportedTransactionVersions?: ReadonlySet<TransactionVersion>;
  name = ExcaliburTestRandomWalletName;
  url = 'https://excalibur.fm';
  icon = WALLET_IMAGE;
}

export class ExcaliburTestPoorRandomWalletAdapter extends BaseExcaliburWalletAdapter {
  supportedTransactionVersions?: ReadonlySet<TransactionVersion>;
  name = ExcaliburTestPoorRandomWalletName;
  url = 'https://excalibur.fm';
  icon = WALLET_IMAGE;
}

export class ExcaliburTestKnownWalletAdapter extends BaseExcaliburWalletAdapter {
  supportedTransactionVersions?: ReadonlySet<TransactionVersion>;
  name = ExcaliburTestKnownWalletName;
  url = 'https://excalibur.fm';
  icon = WALLET_IMAGE;
}
