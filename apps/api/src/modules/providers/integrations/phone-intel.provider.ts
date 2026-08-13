import { 
  BaseProvider, 
  ProviderMetadata, 
  ProviderRunContext, 
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';

export class PhoneIntelligenceProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'phone_intel',
    displayName: 'Phone Intelligence',
    description: 'Advanced phone number validation, carrier identification and social footprint',
    supports: [EntityKind.PHONE],
    requiresApiKey: false,
    freeTier: 'Unlimited',
  };

  private readonly phoneUtil = PhoneNumberUtil.getInstance();

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<any>> {
    const { value } = ctx;
    const riskSignals: any[] = [];
    
    try {
      const number = this.phoneUtil.parseAndKeepRawInput(value);
      const isValid = this.phoneUtil.isValidNumber(number);
      
      if (!isValid) {
        return {
          data: { isValid: false },
          riskSignals: [{
            type: 'invalid_number',
            title: 'Invalid Phone Number',
            severity: 'HIGH' as const,
            score: 5,
            description: 'The provided phone number format is invalid.',
          }],
        };
      }

      const countryCode = number.getCountryCode();
      const regionCode = this.phoneUtil.getRegionCodeForNumber(number);
      const formattedE164 = this.phoneUtil.format(number, PhoneNumberFormat.E164);
      const type = this.phoneUtil.getNumberType(number);

      const typeNames = ['FIXED_LINE', 'MOBILE', 'FIXED_LINE_OR_MOBILE', 'TOLL_FREE', 'PREMIUM_RATE', 'SHARED_COST', 'VOIP', 'PERSONAL_NUMBER', 'PAGER', 'UAN', 'VOICEMAIL', 'UNKNOWN'];
      const typeName = typeNames[type] || 'UNKNOWN';

      riskSignals.push({
        type: 'phone_meta',
        title: 'Phone Metadata',
        severity: 'INFO' as const,
        score: 0,
        description: `Region: ${regionCode} (+${countryCode}). Type: ${typeName}. E164: ${formattedE164}`,
      });

      // Advanced OSINT Search Links
      const dorks = [
        { name: 'Google Search', url: `https://www.google.com/search?q=%22${formattedE164}%22+OR+%22${number.getNationalNumber()}%22` },
        { name: 'Social Lookup', url: `https://www.google.com/search?q=%22${formattedE164}%22+site:facebook.com+OR+site:instagram.com+OR+site:linkedin.com` },
        { name: 'Business Info', url: `https://www.google.com/search?q=%22${formattedE164}%22+site:avito.ru+OR+site:auto.ru+OR+site:vk.com` }
      ];

      riskSignals.push({
        type: 'web_search_links',
        title: 'Deep Web Lookup (Name Search)',
        severity: 'INFO' as const,
        score: 0,
        description: `Automated Dorks: ${dorks.map(d => `[${d.name}](${d.url})`).join(', ')}`,
      });

      riskSignals.push({
        type: 'caller_id_links',
        title: 'Caller ID Databases',
        severity: 'INFO' as const,
        score: 0,
        description: `Check name in: [TrueCaller](https://www.truecaller.com/search/${regionCode}/${number.getNationalNumber()}), [Sync.me](https://sync.me/search/?number=${formattedE164}), [NumLookup](https://www.numlookup.com/number/${formattedE164})`,
      });

      return {
        data: {
          isValid: true,
          formatted: formattedE164,
          region: regionCode,
          type: typeName,
        },
        riskSignals,
        relatedEntities: [],
      };
    } catch (e) {
      return { data: null };
    }
  }
}
