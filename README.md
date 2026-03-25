🤖 AI Bug Ticket Agent
This is a submission for the Notion MCP Challenge

🚀 What I Built
In distributed environments, alert fatigue is a primary bottleneck for engineering velocity. When a service fails at 2:00 AM, the manual overhead of triaging stack traces, deduplicating issues, and assigning priority often takes longer than the actual fix.

Bug-Ticket-Agent is an event-driven triage pipeline that bridges the gap between observability (Sentry) and project management (Notion). It transforms raw error data into structured, actionable intelligence in seconds.

High-Impact Features:
Intelligent Deduplication: Prevents database bloat by performing semantic searches on existing tickets before creation. It updates the "frequency" and "last seen" metadata for known issues instead of creating noise.

Deterministic Prioritization: Eradicates subjective triaging. The agent applies a consistent P0–P3 rubric based on error impact, service criticality, and stack trace depth.

Root Cause Synthesis: Instead of a "investigate further" placeholder, the agent analyzes the trace to suggest a specific fix, identifying the exact file and function at fault.

Instant Escalation: High-priority production failures (P0/P1) are flagged for immediate routing to PagerDuty or Slack, ensuring critical path uptime.

🛠 How I Used Notion MCP
The core of this system is the @notionhq/notion-mcp-server. By leveraging the Model Context Protocol, I’ve moved away from brittle, hard-coded API integrations in favor of an Agentic Reasoning Loop.

The Orchestration Pipeline:
Sentry Alert → Webhook → Claude (Agentic Reasoning) → Notion MCP → Bug Tracker DB

Why MCP is the "Unlock":
Standard automation relies on fixed conditional logic. By using MCP, Claude treats the Notion workspace as a set of dynamic tools. The agent can reason through ambiguous cases:

Contextual Search: It queries the database to understand if the current error is a regression or a new edge case.

Schema-Aware Writing: It populates complex Notion properties (Relations, Formulas, Selects) without needing a custom wrapper for every change.

Autonomous Resolution: MCP allows the agent to navigate auth, pagination, and versioning automatically.

The real value isn't just the automation—it's the abstraction. The agent is given a high-level goal ("Triage this error"), and it determines the optimal sequence of Notion tool calls to achieve it.

