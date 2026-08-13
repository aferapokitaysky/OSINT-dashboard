import { 
  BaseProvider, 
  ProviderMetadata, 
  ProviderRunContext, 
  ProviderRunResult,
} from '@osint/plugin-sdk';
import { EntityKind } from '@osint/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export class SherlockProvider extends BaseProvider {
  readonly meta: ProviderMetadata = {
    name: 'sherlock',
    displayName: 'Sherlock OSINT (Native)',
    description: 'Deep social media discovery using the official Sherlock tool (400+ platforms)',
    supports: [EntityKind.USERNAME],
    requiresApiKey: false,
    freeTier: 'Unlimited',
    homepage: 'https://github.com/sherlock-project/sherlock',
  };

  protected async query(ctx: ProviderRunContext): Promise<ProviderRunResult<any>> {
    const { value } = ctx;
    const projectRoot = '/Users/korova/Desktop/osint';
    const sherlockPath = path.join(projectRoot, 'tools/sherlock');
    const outputPath = path.join(sherlockPath, `${value}.json`);

    try {
      // Run sherlock with a timeout and limited site list for speed if needed, 
      // but the user asked for "Real Sherlock", so we go full power.
      // We use --json to get structured output.
      // --timeout 5 to avoid hanging on slow sites
      const cmd = `python3 -m sherlock_project ${value} --json --timeout 5`;
      
      await execAsync(cmd, { 
        cwd: sherlockPath,
        timeout: 120000, // 2 minute hard timeout
      });

      const data = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
      
      // Cleanup
      await fs.unlink(outputPath).catch(() => {});

      const found = Object.entries(data)
        .filter(([_, info]: any) => info.status === 'claimed')
        .map(([site, info]: any) => ({
          site,
          url: info.url_user
        }));

      if (found.length === 0) return { data: null };

      return {
        data: { platforms: found },
        riskSignals: found.slice(0, 15).map(f => ({
          type: 'social_presence',
          title: `Profile found: ${f.site}`,
          severity: 'INFO' as const,
          score: 0,
          description: `Verified account on ${f.site}: ${f.url}`,
        })),
        relatedEntities: found.map(f => ({
          kind: EntityKind.URL,
          value: f.url,
          relation: 'profile_on_' + f.site.toLowerCase(),
          confidence: 1.0,
        })),
      };
    } catch (error) {
      // Even if it errors, check if output file exists (Sherlock might have partial results)
      try {
        const data = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
        await fs.unlink(outputPath).catch(() => {});
        // ... same processing as above ...
        const found = Object.entries(data)
          .filter(([_, info]: any) => info.status === 'claimed')
          .map(([site, info]: any) => ({ site, url: info.url_user }));
        
        if (found.length > 0) {
          return {
            data: { platforms: found },
            riskSignals: found.slice(0, 10).map(f => ({
              type: 'social_presence',
              title: `Profile found: ${f.site}`,
              severity: 'INFO' as const,
              score: 0,
              description: `Discovered on ${f.site}: ${f.url}`,
            })),
            relatedEntities: found.map(f => ({
              kind: EntityKind.URL,
              value: f.url,
              relation: 'profile_on_' + f.site.toLowerCase(),
              confidence: 1.0,
            })),
          };
        }
      } catch (e) {}
      
      console.error('Sherlock failed:', error);
      return { data: null };
    }
  }
}
