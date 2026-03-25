/**
 * Demo simulator — fires sample Sentry-style payloads at the local webhook.
 * Usage:  npm run demo
 *         npm run demo -- --scenario p0   (run only the P0 scenario)
 */
import 'dotenv/config';

const BASE_URL = `http://localhost:${process.env.PORT ?? 3000}/webhook`;

const scenarios: Record<string, object> = {
  p0: {
    action: 'created',
    data: {
      issue: {
        title: "TypeError: Cannot read properties of undefined (reading 'id')",
        culprit: 'src/auth/session.ts in getUser',
        level: 'fatal',
        platform: 'node',
        firstSeen: '2026-03-22T08:00:00Z',
        lastSeen: '2026-03-22T08:45:00Z',
        count: 847,
        userCount: 312,
        tags: [{ key: 'environment', value: 'production' }],
        metadata: {
          type: 'TypeError',
          value: "Cannot read properties of undefined (reading 'id')",
          filename: 'src/auth/session.ts',
        },
        entries: [
          {
            type: 'exception',
            data: {
              values: [
                {
                  type: 'TypeError',
                  value: "Cannot read properties of undefined (reading 'id')",
                  stacktrace: {
                    frames: [
                      { filename: 'node_modules/express/lib/router/index.js', function: 'Layer.handle', lineno: 95 },
                      { filename: 'src/middleware/auth.ts', function: 'authenticate', lineno: 34 },
                      { filename: 'src/auth/session.ts', function: 'getUser', lineno: 18 },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  },

  p1: {
    action: 'created',
    data: {
      issue: {
        title: 'NetworkError: Failed to fetch /api/payments/charge',
        culprit: 'src/payments/stripe.ts in chargeCard',
        level: 'error',
        platform: 'javascript',
        firstSeen: '2026-03-22T09:10:00Z',
        lastSeen: '2026-03-22T09:30:00Z',
        count: 43,
        userCount: 17,
        tags: [{ key: 'environment', value: 'production' }],
        metadata: {
          type: 'NetworkError',
          value: 'Failed to fetch /api/payments/charge',
          filename: 'src/payments/stripe.ts',
        },
        entries: [
          {
            type: 'exception',
            data: {
              values: [
                {
                  type: 'NetworkError',
                  value: 'Failed to fetch /api/payments/charge',
                  stacktrace: {
                    frames: [
                      { filename: 'src/utils/http.ts', function: 'post', lineno: 52 },
                      { filename: 'src/payments/stripe.ts', function: 'chargeCard', lineno: 89 },
                      { filename: 'src/routes/checkout.ts', function: 'handleCheckout', lineno: 22 },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  },

  // Same error as p0 — should trigger deduplication
  duplicate: {
    action: 'created',
    data: {
      issue: {
        title: "TypeError: Cannot read properties of undefined (reading 'id')",
        culprit: 'src/auth/session.ts in getUser',
        level: 'fatal',
        platform: 'node',
        firstSeen: '2026-03-22T08:00:00Z',
        lastSeen: '2026-03-22T09:55:00Z', // newer last seen
        count: 1203, // higher frequency
        userCount: 441,
        tags: [{ key: 'environment', value: 'production' }],
        metadata: {
          type: 'TypeError',
          value: "Cannot read properties of undefined (reading 'id')",
          filename: 'src/auth/session.ts',
        },
        entries: [],
      },
    },
  },

  p3: {
    action: 'created',
    data: {
      issue: {
        title: 'RangeError: Invalid date format in date picker',
        culprit: 'src/components/DatePicker.tsx in formatDate',
        level: 'warning',
        platform: 'javascript',
        firstSeen: '2026-03-21T14:00:00Z',
        lastSeen: '2026-03-21T14:01:00Z',
        count: 2,
        userCount: 1,
        tags: [{ key: 'environment', value: 'development' }],
        metadata: {
          type: 'RangeError',
          value: 'Invalid time value',
          filename: 'src/components/DatePicker.tsx',
        },
        entries: [
          {
            type: 'exception',
            data: {
              values: [
                {
                  type: 'RangeError',
                  value: 'Invalid time value',
                  stacktrace: {
                    frames: [
                      { filename: 'src/utils/date.ts', function: 'formatDate', lineno: 11 },
                      { filename: 'src/components/DatePicker.tsx', function: 'render', lineno: 67 },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  },
};

async function sendScenario(name: string, payload: object) {
  console.log(`\n━━━ Sending scenario: ${name.toUpperCase()} ━━━`);
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    console.log(`Response ${res.status}:`, body);
  } catch (err) {
    console.error(
      `Failed to reach ${BASE_URL} — is the server running? (npm run dev)`,
    );
    process.exit(1);
  }
}

async function run() {
  const arg = process.argv[3]; // npm run demo -- --scenario p0
  const target = arg?.replace('--scenario=', '').replace('--scenario', '').trim();

  if (target && scenarios[target]) {
    await sendScenario(target, scenarios[target]);
    return;
  }

  // Run all scenarios with a short pause between them
  const names = Object.keys(scenarios);
  for (const name of names) {
    await sendScenario(name, scenarios[name]);
    await new Promise((r) => setTimeout(r, 30000)); // wait for triage to finish before next scenario
  }

  console.log('\n✓ All demo scenarios sent. Check your Notion database!\n');
}

run();
