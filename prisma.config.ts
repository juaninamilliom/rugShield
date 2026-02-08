import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  engine: 'classic',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://rugshield:rugshield@localhost:5434/rugshield?schema=public',
  },
});
