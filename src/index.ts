import 'dotenv/config';
import { ensureDatabase } from './notion/setup.js';
import { createServer } from './server.js';

const PORT = Number(process.env.PORT ?? 3000);

async function main() {
  // Validate required env vars
  const required = ['ANTHROPIC_API_KEY', 'NOTION_TOKEN'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[Startup] Missing required env vars: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }

  // Create Notion database if this is the first run
  await ensureDatabase();

  // Start Express server
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`\n🐛 bug-ticket-agent running on http://localhost:${PORT}`);
    console.log(`   POST http://localhost:${PORT}/webhook  ← Sentry webhook`);
    console.log(`   GET  http://localhost:${PORT}/health\n`);
    console.log('Waiting for error events...\n');
  });
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
