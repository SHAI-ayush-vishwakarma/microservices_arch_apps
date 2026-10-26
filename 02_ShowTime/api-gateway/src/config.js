import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  AUTH_SERVICE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url(),
  PROXY_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("[api-gateway] Invalid environment variables:");
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = Object.freeze(result.data);
