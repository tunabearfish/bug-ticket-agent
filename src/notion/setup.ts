/**
 * Auto-scaffolds the Notion bug-tracker database on first run.
 * If NOTION_DATABASE_ID is already set in .env, this is a no-op.
 */
import fs from 'fs';
import path from 'path';

const NOTION_API = 'https://api.notion.com/v1';

async function notionRequest(
  endpoint: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${NOTION_API}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

export async function ensureDatabase(): Promise<string> {
  if (process.env.NOTION_DATABASE_ID) {
    console.log(
      `[Setup] Using existing database: ${process.env.NOTION_DATABASE_ID}`,
    );
    return process.env.NOTION_DATABASE_ID;
  }

  if (!process.env.NOTION_PARENT_PAGE_ID) {
    throw new Error(
      'NOTION_PARENT_PAGE_ID is required to create the database on first run.\n' +
        'Set it in your .env file and re-run.',
    );
  }

  console.log('[Setup] No NOTION_DATABASE_ID found — creating database...');

  const db = await notionRequest('/databases', {
    parent: { type: 'page_id', page_id: process.env.NOTION_PARENT_PAGE_ID },
    icon: { type: 'emoji', emoji: '🐛' },
    title: [{ type: 'text', text: { content: 'Bug Tracker' } }],
    properties: {
      Name: { title: {} },
      Priority: {
        select: {
          options: [
            { name: 'P0', color: 'red' },
            { name: 'P1', color: 'orange' },
            { name: 'P2', color: 'yellow' },
            { name: 'P3', color: 'blue' },
          ],
        },
      },
      Status: {
        select: {
          options: [
            { name: 'New', color: 'red' },
            { name: 'In Progress', color: 'yellow' },
            { name: 'Resolved', color: 'green' },
          ],
        },
      },
      'Error Type': {
        select: {
          options: [
            { name: 'TypeError', color: 'pink' },
            { name: 'NetworkError', color: 'orange' },
            { name: 'ReferenceError', color: 'purple' },
            { name: 'SyntaxError', color: 'brown' },
            { name: 'RangeError', color: 'gray' },
            { name: 'AuthError', color: 'red' },
            { name: 'DatabaseError', color: 'blue' },
            { name: 'UnhandledRejection', color: 'orange' },
            { name: 'Other', color: 'default' },
          ],
        },
      },
      Environment: {
        select: {
          options: [
            { name: 'production', color: 'red' },
            { name: 'staging', color: 'yellow' },
            { name: 'development', color: 'blue' },
          ],
        },
      },
      Frequency: { number: { format: 'number' } },
      'Affected Users': { number: { format: 'number' } },
      'First Seen': { date: {} },
      'Last Seen': { date: {} },
      'AI Summary': { rich_text: {} },
      'Suggested Fix': { rich_text: {} },
    },
  });

  const databaseId = db.id as string;
  console.log(`[Setup] Database created: ${databaseId}`);

  // Persist to .env so subsequent runs skip creation
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    let current = fs.readFileSync(envPath, 'utf-8');
    if (current.includes('NOTION_DATABASE_ID=')) {
      current = current.replace(/NOTION_DATABASE_ID=.*/, `NOTION_DATABASE_ID=${databaseId}`);
      fs.writeFileSync(envPath, current);
    } else {
      fs.appendFileSync(envPath, `\nNOTION_DATABASE_ID=${databaseId}\n`);
    }
    console.log(`[Setup] Saved NOTION_DATABASE_ID to .env`);
  }

  process.env.NOTION_DATABASE_ID = databaseId;
  return databaseId;
}
