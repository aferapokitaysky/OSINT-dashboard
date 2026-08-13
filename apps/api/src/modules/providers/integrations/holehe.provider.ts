import { 
  BaseProvider, 
  ProviderMetadata, 
  ProviderRunContext, 
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class HoleheProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'holehe',
    displayName: 'Email Presence (Holehe)',
    description: 'Check if email is registered on 120+ social media platforms',
    supports: [EntityKind.EMAIL],
    requiresApiKey: false,
    freeTier: 'Unlimited',
    homepage: 'https://github.com/megadose/holehe',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<any>> {
    const { value } = ctx;

    try {
      // Use absolute path to avoid PATH issues in background worker
      const holeheBinary = '/Library/Frameworks/Python.framework/Versions/3.14/bin/holehe';
      const { stdout, stderr } = await execAsync(`${holeheBinary} ${value} --only-used --no-color`, {
        timeout: 60000,
      });

      if (stderr) console.warn('Holehe stderr:', stderr);

      const lines = stdout.split('\n');
      const found: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('[+]')) {
          const site = trimmed.replace('[+]', '').trim().split(' ')[0];
          if (site && site.includes('.')) {
            found.push(site);
          }
        }
      }

      if (found.length === 0) {
        return { 
          data: { platforms: [] }
        };
      }

      return {
        data: { platforms: found },
        riskSignals: found.map(site => ({
          type: 'email_registration',
          title: `Account found: ${site}`,
          severity: 'INFO' as const,
          score: 0,
          description: `The email ${value} is registered on ${site}.`,
        })),
        relatedEntities: found.map(site => ({
          kind: EntityKind.SOCIAL_PROFILE,
          value: `${site}:${value}`,
          relation: 'registered_on',
          confidence: 0.9,
        })),
      };
    } catch (error: any) {
      console.error('Holehe execution failed:', error.message);
      return { 
        data: null
      };
    }
  }
}
