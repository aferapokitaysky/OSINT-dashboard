import { 
  BaseProvider, 
  ProviderMetadata, 
  ProviderRunContext, 
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import axios from 'axios';

export class GeoIpProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'geoip',
    displayName: 'GeoIP Intelligence',
    description: 'Geolocation, ISP and ASN lookup for IP addresses',
    supports: [EntityKind.IP],
    requiresApiKey: false,
    freeTier: '45 requests/min (ip-api.com)',
    homepage: 'https://ip-api.com/',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<any>> {
    const { value } = ctx;

    try {
      const response = await axios.get(`http://ip-api.com/json/${value}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
        timeout: 5000,
      });

      const data = response.data;
      if (data.status !== 'success') return { data: null };

      const riskSignals = [
        {
          type: 'location_info',
          title: 'Geographic Location',
          severity: 'INFO' as const,
          score: 0,
          description: `${data.city}, ${data.country} (${data.countryCode})`,
        },
        {
          type: 'network_info',
          title: 'Network Intelligence',
          severity: 'INFO' as const,
          score: 0,
          description: `ISP: ${data.isp}. Org: ${data.org}. ASN: ${data.as}`,
        }
      ];

      return {
        data,
        riskSignals,
        relatedEntities: [
          {
            kind: EntityKind.ASN,
            value: data.as.split(' ')[0], // Extract ASXXXXX
            relation: 'belongs_to_as',
            confidence: 1.0,
          }
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { data: null };
      }
      throw error;
    }
  }
}
