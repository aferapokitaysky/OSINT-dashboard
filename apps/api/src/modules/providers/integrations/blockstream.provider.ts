import {
  BaseProvider,
  ProviderMetadata,
  ProviderRunContext,
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import axios from 'axios';
import { detectCryptoChain } from './crypto-address.util';

interface BlockstreamAddressStats {
  address: string;
  chain_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
  mempool_stats: { funded_txo_sum: number; spent_txo_sum: number; tx_count: number };
}

interface BlockstreamVout {
  scriptpubkey_address?: string;
  value: number;
}

interface BlockstreamTx {
  txid: string;
  vin: Array<{ prevout?: { scriptpubkey_address?: string; value: number } }>;
  vout: BlockstreamVout[];
  status: { confirmed: boolean; block_time?: number };
}

const MAX_TX_SAMPLE = 20;
const SATS_PER_BTC = 100_000_000;

export class BlockstreamProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'blockstream',
    displayName: 'Blockstream Esplora (Bitcoin)',
    description: 'Bitcoin address balance, UTXO summary, and recent transactions',
    supports: [EntityKind.CRYPTO_WALLET],
    requiresApiKey: false,
    freeTier: 'Unlimited, no key',
    homepage: 'https://blockstream.info/api/',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<unknown>> {
    const address = ctx.value.trim();
    if (detectCryptoChain(address) !== 'bitcoin') {
      return { data: null };
    }

    const base = `https://blockstream.info/api/address/${address}`;
    const [statsRes, txsRes] = await Promise.all([
      axios.get<BlockstreamAddressStats>(base, { timeout: 15_000 }),
      axios.get<BlockstreamTx[]>(`${base}/txs`, { timeout: 15_000 }),
    ]);

    const stats = statsRes.data;
    const balanceSats =
      stats.chain_stats.funded_txo_sum -
      stats.chain_stats.spent_txo_sum +
      stats.mempool_stats.funded_txo_sum -
      stats.mempool_stats.spent_txo_sum;

    const txs = txsRes.data.slice(0, MAX_TX_SAMPLE);
    const relatedEntities = [];
    const addressLower = address.toLowerCase();

    for (const tx of txs) {
      const inputAddresses = new Set(
        tx.vin.map((v) => v.prevout?.scriptpubkey_address).filter((a): a is string => !!a),
      );
      const isOutgoing = inputAddresses.has(address);

      for (const vout of tx.vout) {
        const counterparty = vout.scriptpubkey_address;
        if (!counterparty || counterparty.toLowerCase() === addressLower) continue;
        if (isOutgoing) {
          relatedEntities.push({
            kind: EntityKind.CRYPTO_WALLET,
            value: counterparty,
            relation: 'sent_to',
            confidence: 0.8,
          });
        }
      }
      if (!isOutgoing) {
        for (const counterparty of inputAddresses) {
          relatedEntities.push({
            kind: EntityKind.CRYPTO_WALLET,
            value: counterparty,
            relation: 'received_from',
            confidence: 0.8,
          });
        }
      }
    }

    return {
      data: {
        balanceBtc: balanceSats / SATS_PER_BTC,
        balanceSats,
        txCount: stats.chain_stats.tx_count + stats.mempool_stats.tx_count,
        recentTransactions: txs.map((tx) => ({
          txid: tx.txid,
          confirmed: tx.status.confirmed,
          blockTime: tx.status.block_time ? new Date(tx.status.block_time * 1000).toISOString() : null,
        })),
      },
      // Dedup: the same counterparty address can legitimately appear across
      // several transactions; the enrichment pipeline's EntityRelation
      // upsert (fromId, toId, relation, source) already collapses exact
      // duplicates, so no need to dedupe here too.
      relatedEntities,
    };
  }
}
