import { 
  BaseProvider, 
  ProviderMetadata, 
  ProviderRunContext, 
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import axios from 'axios';

export class GitHubProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'github',
    displayName: 'GitHub OSINT',
    description: 'Lookup public profiles, organizations and activity on GitHub',
    supports: [EntityKind.USERNAME],
    requiresApiKey: false,
    freeTier: '60 requests/hr (unauthenticated)',
    homepage: 'https://github.com',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<any>> {
    const { value, apiKey } = ctx;
    
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `token ${apiKey}`;
    }

    try {
      const response = await axios.get(`https://api.github.com/users/${value}`, {
        headers,
        timeout: 10000,
      });

      const data = response.data;
      if (!data) return { data: null };

      return {
        data: {
          username: data.login,
          name: data.name,
          bio: data.bio,
          location: data.location,
          company: data.company,
          public_repos: data.public_repos,
          followers: data.followers,
          profile_url: data.html_url,
          avatar_url: data.avatar_url,
        },
        relatedEntities: [],
        riskSignals: [
          {
            type: 'profile_summary',
            severity: 'INFO' as const,
            score: 0,
            description: `GitHub user: ${data.name || data.login}. Bio: ${data.bio || 'N/A'}. Location: ${data.location || 'N/A'}. Repos: ${data.public_repos}.`,
          },
          {
            type: 'social_link',
            severity: 'INFO' as const,
            score: 0,
            description: `Profile URL: ${data.html_url}`,
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
