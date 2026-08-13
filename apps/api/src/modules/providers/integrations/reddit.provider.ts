import { 
  BaseProvider, 
  ProviderMetadata, 
  ProviderRunContext, 
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import axios from 'axios';

export class RedditProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'reddit',
    displayName: 'Reddit Intelligence',
    description: 'Enrich usernames with Reddit profile data and karma metrics',
    supports: [EntityKind.USERNAME],
    requiresApiKey: false,
    freeTier: 'Public API',
    homepage: 'https://reddit.com',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<any>> {
    const { value } = ctx;

    try {
      const response = await axios.get(`https://www.reddit.com/user/${value}/about.json`, {
        headers: {
          'User-Agent': 'OSINT-Platform/1.0.0',
        },
        timeout: 10000,
      });

      const data = response.data?.data;
      if (!data) return { data: null };

      return {
        data: {
          username: data.name,
          karma: data.total_karma,
          created_at: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : null,
          has_verified_email: data.has_verified_email,
          is_employee: data.is_employee,
          is_gold: data.is_gold,
          is_mod: data.is_mod,
        },
        riskSignals: [
          {
            type: 'reddit_stats',
            severity: 'INFO' as const,
            score: 0,
            description: `Reddit user: ${data.name}. Total Karma: ${data.total_karma}. Created: ${new Date(data.created_utc * 1000).toDateString()}.`,
          },
          ...(data.is_suspended ? [{
            type: 'account_suspended',
            severity: 'MEDIUM' as const,
            score: 5,
            description: 'Reddit account is suspended',
          }] : []),
          {
            type: 'social_link',
            severity: 'INFO' as const,
            score: 0,
            description: `Profile URL: https://reddit.com/u/${data.name}`,
          }
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 403)) {
        return { data: null };
      }
      throw error;
    }
  }
}
