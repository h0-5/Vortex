import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run Drizzle commands');
}

const dbUrl = process.env.DATABASE_URL;
const url = dbUrl.replace(/sslmode=(require|verify-full|verify-ca|prefer)/iu, 'sslmode=no-verify');

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/schema.ts',
  dbCredentials: {
    url,
  },
  strict: true,
  verbose: true,
});
