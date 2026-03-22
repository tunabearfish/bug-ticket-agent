import express from 'express';
import { parseSentryWebhook } from './sentry/parser.js';
import { triageError } from './agent/triage-agent.js';

export function createServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Sentry issue-alert webhook
  app.post('/webhook', async (req, res) => {
    try {
      // Validate that it looks like a Sentry payload
      if (!req.body?.data?.issue) {
        res.status(400).json({ error: 'Invalid Sentry webhook payload' });
        return;
      }

      const event = parseSentryWebhook(req.body);
      console.log(
        `\n[Webhook] Received: "${event.title}" (${event.environment}, ${event.frequency} occurrences)`,
      );

      // Respond immediately so Sentry doesn't time out waiting for us
      res.status(202).json({ status: 'accepted', title: event.title });

      // Triage async after responding
      const result = await triageError(event);
      console.log(
        `[Webhook] Triage complete — ${result.isDuplicate ? 'duplicate updated' : 'ticket created'}\n`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Webhook] Error:', message);
      // Only send error response if headers not sent yet
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    }
  });

  return app;
}
