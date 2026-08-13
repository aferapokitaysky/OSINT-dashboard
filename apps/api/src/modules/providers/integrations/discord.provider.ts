import { 
  BaseProvider, 
  ProviderMetadata, 
  ProviderRunContext, 
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import axios from 'axios';

export class DiscordProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'discord',
    displayName: 'Discord Intelligence',
    description: 'Lookup Discord users by Snowflake ID to retrieve profile metadata',
    supports: [EntityKind.DISCORD],
    requiresApiKey: false,
    freeTier: 'Public Proxy',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<any>> {
    const { value } = ctx;

    // Discord Snowflake IDs are numeric and usually 17-19 characters long
    if (!/^\d{17,20}$/.test(value)) {
      // If it's not an ID, maybe it's a username (not supported by direct ID lookup)
      return { 
        data: null,
        riskSignals: [{
          type: 'invalid_format',
          title: 'Invalid Discord ID',
          severity: 'INFO' as const,
          score: 0,
          description: 'Discord IDs must be numeric snowflakes. For usernames, use the USERNAME search.'
        }]
      };
    }

    try {
      // Using a public Discord lookup proxy
      const response = await axios.get(`https://discordlookup.mesalytic.moe/v1/user/${value}`, {
        timeout: 5000,
      });

      const data = response.data;
      if (!data || !data.username) return { data: null };

      const riskSignals: any[] = [
        {
          type: 'discord_profile',
          title: `Profile: ${data.tag || data.username}`,
          severity: 'INFO' as const,
          score: 0,
          description: `Username: ${data.username}. ID: ${data.id}. Account Created: ${new Date(data.created_at).toLocaleString()}.`,
        }
      ];

      if (data.avatar?.url) {
        riskSignals.push({
          type: 'social_link',
          title: 'Profile Picture',
          severity: 'INFO' as const,
          score: 0,
          description: `[View Avatar](${data.avatar.url})`,
        });
      }

      return {
        data,
        riskSignals,
        relatedEntities: [
          {
            kind: EntityKind.SOCIAL_PROFILE,
            value: `discord:${data.username}`,
            relation: 'identifies_as',
            confidence: 1.0,
          }
        ],
      };
    } catch (error) {
      return { data: null };
    }
  }
}
