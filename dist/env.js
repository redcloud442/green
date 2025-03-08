import { config } from "dotenv";
import { z } from "zod";
config();
const envSchema = z.object({
    SUPABASE_URL: z.string(),
    SUPABASE_ANON_KEY: z.string(),
    SUPABASE_SERVICE_ROLE_KEY: z.string(),
    REDIS_URL: z.string(),
    REDIS_PASSWORD: z.string(),
    PORT: z.coerce.number().default(8080),
    RESEND_API_KEY: z.string(),
    MOVIDER_API_KEY: z.string(),
    MOVIDER_API_SECRET: z.string(),
});
export const envConfig = envSchema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ADMIN_KEY: process.env.SUPABASE_ADMIN_KEY,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MOVIDER_API_KEY: process.env.MOVIDER_API_KEY,
    MOVIDER_API_SECRET: process.env.MOVIDER_API_SECRET,
    PORT: process.env.PORT,
});
