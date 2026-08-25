import {
  BaseProvider,
  ProviderMetadata,
  ProviderRunContext,
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import axios from 'axios';
import { detectCryptoChain } from './crypto-address.util';

interface TronAccount {
  balance?: number; // SUN, 1 TRX = 1_000_000 SUN
}

interface TronTrc20Transfer {
  transaction_id: string;
  token_info: { symbol: string; decimals: number; name: string };
  block_timestamp: number;
  from: string;
  to: string;
  value: string;
}

const SUN_PER_TRX = 1_000_000;
const MAX_TRANSFER_SAMPLE = 20;

export class TronProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'trongrid',
    displayName: 'TronGrid (TRON)',
    description: 'TRON address balance and TRC-20 token transfers',
    supports: [EntityKind.CRYPTO_WALLET],
    requiresApiKey: false,
    freeTier: 'Public API, no key (rate-limited per TronGrid policy)',
    homepage: 'https://developers.tron.network/reference/tron-grid-intro',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<unknown>> {
    const address = ctx.value.trim();
    if (detectCryptoChain(address) !== 'tron') {
      return { data: null };
    }

    const [accountRes, transfersRes] = await Promise.all([
      axios.get<{ data: TronAccount[] }>(`https://api.trongrid.io/v1/accounts/${address}`, {
        timeout: 15_000,
      }),
      axios.get<{ data: TronTrc20Transfer[] }>(
        `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20`,
        { params: { limit: MAX_TRANSFER_SAMPLE }, timeout: 15_000 },
      ),
    ]);

    const account = accountRes.data.data[0];
    if (!account) {
      return { data: null };
    }

    const transfers = transfersRes.data.data ?? [];
    const addressLower = address.toLowerCase();

    const relatedEntities = transfers
      .map((t) => {
        const isOutgoing = t.from.toLowerCase() === addressLower;
        const counterparty = isOutgoing ? t.to : t.from;
        if (!counterparty || counterparty.toLowerCase() === addressLower) return null;
        return {
          kind: EntityKind.CRYPTO_WALLET,
          value: counterparty,
          relation: isOutgoing ? 'sent_to' : 'received_from',
          confidence: 0.8,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return {
      data: {
        balanceTrx: (account.balance ?? 0) / SUN_PER_TRX,
        balanceSun: account.balance ?? 0,
        // TRC-20 only (e.g. USDT, by far the dominant use of TRON) — native
        // TRX transfers are TriggerSmartContract-encoded raw hex in
        // TronGrid's generic /transactions endpoint and not worth decoding
        // for this MVP; documented gap, not silently missing.
        recentTrc20Transfers: transfers.map((t) => ({
          txId: t.transaction_id,
          token: t.token_info.symbol,
          amount: Number(t.value) / 10 ** t.token_info.decimals,
          from: t.from,
          to: t.to,
          timestamp: new Date(t.block_timestamp).toISOString(),
        })),
      },
      relatedEntities,
    };
  }
}
