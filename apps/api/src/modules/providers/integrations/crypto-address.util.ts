// Shared address-format detection for the crypto-chain providers
// (coordination/P2_INTELLIGENCE_WORKBENCH.md P2.2: "Detect chain/address
// format before lookup; do not query every provider blindly"). Each
// provider checks this before making a network call and returns
// `{ data: null }` immediately on a mismatch instead of wasting a
// request on an address that obviously isn't its chain.

export type CryptoChain = 'ethereum' | 'bitcoin' | 'tron';

const ETHEREUM_RE = /^0x[a-fA-F0-9]{40}$/;
const TRON_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const BITCOIN_LEGACY_RE = /^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/;
const BITCOIN_BECH32_RE = /^(bc1|tb1)[a-z0-9]{25,90}$/;

export function detectCryptoChain(value: string): CryptoChain | null {
  const address = value.trim();
  if (ETHEREUM_RE.test(address)) return 'ethereum';
  if (TRON_RE.test(address)) return 'tron';
  if (BITCOIN_LEGACY_RE.test(address) || BITCOIN_BECH32_RE.test(address.toLowerCase())) return 'bitcoin';
  return null;
}
