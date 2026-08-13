import { 
  BaseProvider, 
  ProviderMetadata, 
  ProviderRunContext, 
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import whoiser from 'whoiser';

export class WhoisProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'whois',
    displayName: 'WHOIS / RDAP',
    description: 'Domain and IP registration data lookup',
    supports: [EntityKind.DOMAIN, EntityKind.IP],
    requiresApiKey: false,
    freeTier: 'Unlimited (standard WHOIS)',
    homepage: 'https://github.com/danehansen/whoiser',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<any>> {
    const { entityKind, value } = ctx;

    try {
      let data: any;
      const relatedEntities = [];

      if (entityKind === EntityKind.DOMAIN || entityKind === EntityKind.IP) {
        data = await whoiser(value);
        
        if (entityKind === EntityKind.DOMAIN) {
          // Extract registrar and contacts as potential related entities
          const regInfo = data[Object.keys(data)[0]];
          if (regInfo?.Registrar) {
            relatedEntities.push({
              kind: EntityKind.COMPANY,
              value: regInfo.Registrar,
              relation: 'registered_at',
              confidence: 0.9,
            });
          }
        }
      } else {
        return { data: null };
      }

      return {
        data,
        relatedEntities,
        riskSignals: [
          {
            type: 'registration_data',
            title: 'Registration Registry',
            severity: 'INFO' as const,
            score: 0,
            description: `Entity registered through ${entityKind === EntityKind.DOMAIN ? 'Registrar' : 'RIR'}: ${Object.keys(data)[0] || 'Unknown'}`,
          }
        ],
      };
    } catch (error) {
      throw error;
    }
  }
}
