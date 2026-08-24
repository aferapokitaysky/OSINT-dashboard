import { z } from 'zod';

const PLACEHOLDER_SECRETS = new Set([
  'replace_me_with_random_48_byte_secret',
  'replace_me_with_another_random_secret',
]);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

    RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

    CORS_ORIGINS: z.string().min(1).default('http://localhost:3000'),
    LOG_LEVEL: z.string().default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;

    if (PLACEHOLDER_SECRETS.has(env.JWT_ACCESS_SECRET) || PLACEHOLDER_SECRETS.has(env.JWT_REFRESH_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_ACCESS_SECRET/JWT_REFRESH_SECRET are still the .env.example placeholder values',
        path: ['JWT_ACCESS_SECRET'],
      });
    }
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values',
        path: ['JWT_REFRESH_SECRET'],
      });
    }
    if (env.CORS_ORIGINS.split(',').map((o) => o.trim()).includes('*')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CORS_ORIGINS must not be "*" in production',
        path: ['CORS_ORIGINS'],
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

// Wired into ConfigModule.forRoot({ validate }) — runs synchronously while
// the (global, first-loaded) ConfigModule initializes, so the app never
// finishes bootstrapping with a missing DB URL or a placeholder JWT secret;
// it fails loudly at startup instead of at the first request that needs them.
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    // eslint-disable-next-line no-console
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }
  return result.data;
}
