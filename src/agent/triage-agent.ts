import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages.js';
import { getNotionClient } from '../mcp/notion-client.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';
import type { ErrorEvent, TriageResult } from '../types.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const MAX_ITERATIONS = 10; // prevent infinite loops

export async function triageError(event: ErrorEvent): Promise<TriageResult> {
  const databaseId = process.env.NOTION_DATABASE_ID!;
  const claude = new Anthropic();
  const notion = await getNotionClient();

  const tools = await notion.getAnthropicTools();
  const messages: MessageParam[] = [
    {
      role: 'user',
      content: buildUserPrompt(event, databaseId),
    },
  ];

  console.log(`[Agent] Triaging: "${event.title}"`);

  let isDuplicate = false;
  let existingPageId: string | undefined;
  let finalText = '';

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await claude.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    // Collect any text from this turn
    for (const block of response.content) {
      if (block.type === 'text') {
        finalText = block.text;
      }
    }

    if (response.stop_reason === 'end_turn') {
      console.log(`[Agent] Done after ${i + 1} iteration(s)`);
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b) => b.type === 'tool_use',
      );

      // Push assistant turn
      messages.push({ role: 'assistant', content: response.content });

      // Execute each tool call via MCP
      const toolResults: ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use') continue;

        console.log(`[Agent] → Tool: ${block.name}`);
        const result = await notion.callTool(
          block.name,
          block.input as Record<string, unknown>,
        );

        const resultText =
          result.content
            .map((c) => c.text ?? JSON.stringify(c))
            .join('\n') || '(empty result)';

        // Detect duplicate from search results
        if (
          block.name.includes('query') ||
          block.name.includes('search')
        ) {
          if (resultText.includes('"id"') && resultText.includes(event.title)) {
            isDuplicate = true;
            // Extract page ID from JSON result
            try {
              const parsed = JSON.parse(resultText);
              const results = parsed?.results ?? parsed;
              if (Array.isArray(results) && results.length > 0) {
                existingPageId = results[0]?.id as string | undefined;
              }
            } catch {
              // result may not be parseable JSON, leave existingPageId undefined
            }
          }
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: resultText,
        });
      }

      // Push tool results turn
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Any other stop reason (max_tokens, etc.)
    break;
  }

  // Parse priority from the final confirmation text
  const priorityMatch = finalText.match(/\b(P[0-3])\b/);
  const priority = (priorityMatch?.[1] as TriageResult['priority']) ?? 'P2';

  console.log(
    `[Agent] Result: ${isDuplicate ? 'DUPLICATE — updated' : 'NEW ticket'} | Priority: ${priority}`,
  );

  if (priority === 'P0' || priority === 'P1') {
    console.log(
      `\n🚨 ESCALATION ALERT — ${priority} issue detected in ${event.environment.toUpperCase()}!\n` +
        `   Error: ${event.title}\n` +
        `   Affected users: ${event.affectedUsers}\n` +
        `   [In production: this would trigger PagerDuty / Slack alert]\n`,
    );
  }

  return {
    priority,
    errorType: event.errorType,
    summary: finalText,
    suggestedFix: '', // Claude writes fix directly into Notion
    isDuplicate,
    existingPageId,
  };
}
