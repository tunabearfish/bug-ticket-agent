import { z } from 'zod';
import type { ErrorEvent, ErrorType, Environment } from '../types.js';

// Sentry issue-alert webhook payload schema
const SentryIssueSchema = z.object({
  title: z.string(),
  culprit: z.string().optional().default('unknown'),
  level: z.string().optional().default('error'),
  platform: z.string().optional().default('other'),
  firstSeen: z.string(),
  lastSeen: z.string(),
  count: z.union([z.string(), z.number()]).transform(Number),
  userCount: z.number().optional().default(0),
  tags: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional()
    .default([]),
  metadata: z
    .object({
      type: z.string().optional(),
      value: z.string().optional(),
      filename: z.string().optional(),
    })
    .optional()
    .default({}),
  entries: z
    .array(
      z.object({
        type: z.string(),
        data: z.record(z.unknown()),
      }),
    )
    .optional()
    .default([]),
});

const SentryWebhookSchema = z.object({
  action: z.string(),
  data: z.object({
    issue: SentryIssueSchema,
  }),
});

function extractErrorType(rawType: string | undefined): ErrorType {
  if (!rawType) return 'Other';
  const map: Record<string, ErrorType> = {
    TypeError: 'TypeError',
    ReferenceError: 'ReferenceError',
    SyntaxError: 'SyntaxError',
    RangeError: 'RangeError',
    NetworkError: 'NetworkError',
    AuthError: 'AuthError',
    DatabaseError: 'DatabaseError',
    UnhandledPromiseRejection: 'UnhandledRejection',
    UnhandledRejection: 'UnhandledRejection',
  };
  for (const [key, value] of Object.entries(map)) {
    if (rawType.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return 'Other';
}

function extractStackTrace(
  entries: Array<{ type: string; data: Record<string, unknown> }>,
): string {
  const exceptionEntry = entries.find((e) => e.type === 'exception');
  if (!exceptionEntry) return 'No stack trace available.';

  const values = exceptionEntry.data?.values as
    | Array<{
        type?: string;
        value?: string;
        stacktrace?: { frames?: Array<{ filename?: string; function?: string; lineno?: number }> };
      }>
    | undefined;
  if (!values?.length) return 'No stack trace available.';

  const ex = values[0];
  const frames = ex?.stacktrace?.frames ?? [];
  const lines = frames
    .slice(-8) // last 8 frames are most relevant
    .map((f) => `  at ${f.function ?? '<anonymous>'} (${f.filename ?? '?'}:${f.lineno ?? '?'})`)
    .join('\n');

  return `${ex?.type ?? 'Error'}: ${ex?.value ?? ''}\n${lines}`;
}

function extractEnvironment(
  tags: Array<{ key: string; value: string }>,
): Environment {
  const envTag = tags.find((t) => t.key === 'environment');
  const val = envTag?.value?.toLowerCase() ?? '';
  if (val === 'production') return 'production';
  if (val === 'staging') return 'staging';
  return 'development';
}

export function parseSentryWebhook(raw: unknown): ErrorEvent {
  const parsed = SentryWebhookSchema.parse(raw);
  const issue = parsed.data.issue;

  const tagsMap = Object.fromEntries(issue.tags.map((t) => [t.key, t.value]));

  return {
    title: issue.title,
    errorType: extractErrorType(issue.metadata?.type ?? issue.title),
    environment: extractEnvironment(issue.tags),
    stackTrace: extractStackTrace(issue.entries),
    culprit: issue.culprit,
    frequency: issue.count,
    affectedUsers: issue.userCount,
    firstSeen: issue.firstSeen,
    lastSeen: issue.lastSeen,
    platform: issue.platform,
    tags: tagsMap,
  };
}
