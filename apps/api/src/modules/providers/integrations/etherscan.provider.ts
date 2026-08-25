import {
  BaseProvider,
  ProviderMetadata,
  ProviderRunContext,
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import axios from 'axios';
import { detectCryptoChain } from './crypto-address.util';

const ETH_MAINNET_CHAIN_ID = 1;
const WEI_PER_ETH = 1e18;
const MAX_TX_SAMPLE = 20;

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string; // Wei
  timeStamp: string; // unix seconds
  isError: string; // '0' | '1'
}

interface EtherscanTokenTx extends EtherscanTx {
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

export class EtherscanProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'etherscan',
    displayName: 'Etherscan (Ethereum)',
    description: 'Ethereum address balance, native transfers, and ERC-20 token transfers',
    supports: [EntityKind.CRYPTO_WALLET],
    requiresApiKey: true,
    freeTier: '5 req/s, free registration',
    homepage: 'https://etherscan.io/apis',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<unknown>> {
    const address = ctx.value.trim();
    if (detectCryptoChain(address) !== 'ethereum') {
      return { data: null };
    }

    const apiKey = ctx.apiKey!; // isEnabled() already gated this — see BaseProvider.run()
    const params = { chainid: ETH_MAINNET_CHAIN_ID, address, apikey: apiKey };

    const [balanceRes, txRes, tokenTxRes] = await Promise.all([
      this.call('account', 'balance', { ...params, tag: 'latest' }),
      this.call('account', 'txlist', { ...params, sort: 'desc', page: 1, offset: MAX_TX_SAMPLE }),
      this.call('account', 'tokentx', { ...params, sort: 'desc', page: 1, offset: MAX_TX_SAMPLE }),
    ]);

    const balanceWei = typeof balanceRes.result === 'string' ? balanceRes.result : '0';
    const nativeTxs: EtherscanTx[] = Array.isArray(txRes.result) ? txRes.result : [];
    const tokenTxs: EtherscanTokenTx[] = Array.isArray(tokenTxRes.result) ? tokenTxRes.result : [];

    const addressLower = address.toLowerCase();
    const relatedEntities = [
      ...nativeTxs
        .filter((tx) => tx.isError === '0')
        .map((tx) => this.toRelation(tx, addressLower)),
      ...tokenTxs.map((tx) => this.toRelation(tx, addressLower)),
    ].filter((r): r is NonNullable<typeof r> => r !== null);

    return {
      data: {
        balanceEth: Number(balanceWei) / WEI_PER_ETH,
        balanceWei,
        recentTransactions: nativeTxs.map((tx) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          valueEth: Number(tx.value) / WEI_PER_ETH,
          timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
          failed: tx.isError === '1',
        })),
        recentTokenTransfers: tokenTxs.map((tx) => ({
          hash: tx.hash,
          token: tx.tokenSymbol,
          contractAddress: tx.contractAddress,
          amount: Number(tx.value) / 10 ** Number(tx.tokenDecimal || '18'),
          from: tx.from,
          to: tx.to,
          timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
        })),
      },
      relatedEntities,
    };
  }

  private toRelation(tx: EtherscanTx, addressLower: string) {
    const isOutgoing = tx.from.toLowerCase() === addressLower;
    const counterparty = isOutgoing ? tx.to : tx.from;
    if (!counterparty || counterparty.toLowerCase() === addressLower) return null;
    return {
      kind: EntityKind.CRYPTO_WALLET,
      value: counterparty,
      relation: isOutgoing ? 'sent_to' : 'received_from',
      confidence: 0.8,
    };
  }

  private async call(
    module: string,
    action: string,
    params: Record<string, string | number>,
  ): Promise<{ status: string; message: string; result: unknown }> {
    const res = await axios.get('https://api.etherscan.io/v2/api', {
      params: { module, action, ...params },
      timeout: 15_000,
    });
    return res.data;
  }
}
