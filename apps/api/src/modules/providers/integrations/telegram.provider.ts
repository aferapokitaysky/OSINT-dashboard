import { 
  BaseProvider, 
  ProviderMetadata, 
  ProviderRunContext, 
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';

export class TelegramProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'telegram',
    displayName: 'Telegram Intelligence',
    description: 'Lookup Telegram users by Username or ID with historical context',
    supports: [EntityKind.TELEGRAM],
    requiresApiKey: false,
    freeTier: 'OSINT Links',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<any>> {
    const { value } = ctx;
    const isId = /^\d+$/.test(value);
    
    const riskSignals: any[] = [];

    if (!isId) {
      // Username lookup
      riskSignals.push({
        type: 'telegram_meta',
        title: `Telegram: @${value.replace('@', '')}`,
        severity: 'INFO' as const,
        score: 0,
        description: `Direct Link: [t.me/${value.replace('@', '')}](https://t.me/${value.replace('@', '')})`,
      });
      
      riskSignals.push({
        type: 'tg_history',
        title: 'Historical Discovery',
        severity: 'INFO' as const,
        score: 0,
        description: `Search history in bots: [TGStat](https://tgstat.ru/channel/@${value}), [Telemetr](https://telemetr.me/channels/?search=${value})`,
      });
    } else {
      // ID lookup
      riskSignals.push({
        type: 'telegram_id',
        title: `Telegram ID: ${value}`,
        severity: 'INFO' as const,
        score: 0,
        description: `Search ID in databases: [SangMata](https://t.me/sangmatabot), [QuickOSINT](https://t.me/QuickOSINT_bot)`,
      });
    }

    return {
      data: { isId, value },
      riskSignals,
      relatedEntities: !isId ? [
        {
          kind: EntityKind.SOCIAL_PROFILE,
          value: `telegram:${value}`,
          relation: 'identifies_as',
          confidence: 1.0,
        }
      ] : [],
    };
  }
}
