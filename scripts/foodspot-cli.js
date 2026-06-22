#!/usr/bin/env node

/**
 * foodspot-cli — Ask Claude about FoodSpot with prompt caching.
 *
 * Usage:
 *   node scripts/foodspot-cli.js "Why is the order total wrong?"
 *   node scripts/foodspot-cli.js --git "What changed in payments recently?"
 *   node scripts/foodspot-cli.js --full "Full audit question using all context"
 *
 * Requires: ANTHROPIC_API_KEY env var
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Config ─────────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFile(path) {
  const full = join(ROOT, path);
  return existsSync(full) ? readFileSync(full, 'utf8') : null;
}

function getGitLog(n = 30) {
  try {
    return execSync(`git -C "${ROOT}" log --oneline -${n}`, { encoding: 'utf8' });
  } catch {
    return null;
  }
}

function getGitDiff() {
  try {
    return execSync(`git -C "${ROOT}" diff HEAD~5 HEAD --stat`, { encoding: 'utf8' });
  } catch {
    return null;
  }
}

function formatTokens(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

function costEstimate(inputTokens, cacheWrite, cacheRead, outputTokens) {
  // Sonnet 4.6 pricing (per million tokens)
  const INPUT_RATE   = 3.00;
  const CACHE_WRITE  = 3.75;
  const CACHE_READ   = 0.30;
  const OUTPUT_RATE  = 15.00;

  const cost =
    (inputTokens  / 1_000_000) * INPUT_RATE  +
    (cacheWrite   / 1_000_000) * CACHE_WRITE +
    (cacheRead    / 1_000_000) * CACHE_READ  +
    (outputTokens / 1_000_000) * OUTPUT_RATE;

  const costWithoutCache =
    ((inputTokens + cacheWrite + cacheRead) / 1_000_000) * INPUT_RATE +
    (outputTokens / 1_000_000) * OUTPUT_RATE;

  return { cost, costWithoutCache };
}

// ─── Parse Args ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (!args.length || args[0] === '--help') {
  console.log(`
  foodspot-cli — Ask Claude about FoodSpot with prompt caching

  Usage:
    node scripts/foodspot-cli.js "your question"
    node scripts/foodspot-cli.js --git "What changed in payments recently?"
    node scripts/foodspot-cli.js --full "Full context question"

  Flags:
    --git    Include last 30 git commits + diff in context
    --full   Include CLAUDE.md + Database Bible + git history
    --help   Show this help

  Requires: ANTHROPIC_API_KEY env var
`);
  process.exit(0);
}

const includeGit  = args.includes('--git')  || args.includes('--full');
const includeFull = args.includes('--full');

const question = args.filter(a => !a.startsWith('--')).join(' ');
if (!question) {
  console.error('Error: provide a question. Example: node scripts/foodspot-cli.js "Why is this crashing?"');
  process.exit(1);
}

// ─── Check API Key ────────────────────────────────────────────────────────────

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error(`
Error: ANTHROPIC_API_KEY is not set.

Fix it:
  export ANTHROPIC_API_KEY=sk-ant-...

Or run inline:
  ANTHROPIC_API_KEY=sk-ant-... node scripts/foodspot-cli.js "your question"
`);
  process.exit(1);
}

// ─── Build Context Blocks ─────────────────────────────────────────────────────

const client = new Anthropic({ apiKey });

const systemBlocks = [];

// Block 1: CLAUDE.md — always included, always cached
const claudeMd = readFile('CLAUDE.md');
if (claudeMd) {
  systemBlocks.push({
    type: 'text',
    text: `# CLAUDE.md — Project Guidelines\n\n${claudeMd}`,
    cache_control: { type: 'ephemeral' },
  });
}

// Block 2: Database Bible — included with --full flag (or always, it's key context)
const dbBible = readFile('DATABASE_BIBLE.md');
if (dbBible) {
  systemBlocks.push({
    type: 'text',
    text: `# DATABASE_BIBLE.md — Schema & RPCs\n\n${dbBible}`,
    cache_control: { type: 'ephemeral' },
  });
}

// Block 3: Git context — only with --git or --full
if (includeGit) {
  const gitLog  = getGitLog(30);
  const gitDiff = getGitDiff();
  let gitContext = '# Recent Git History\n\n';
  if (gitLog)  gitContext += `## Last 30 Commits\n\`\`\`\n${gitLog}\`\`\`\n\n`;
  if (gitDiff) gitContext += `## Recent File Changes (last 5 commits)\n\`\`\`\n${gitDiff}\`\`\`\n`;

  systemBlocks.push({
    type: 'text',
    text: gitContext,
    cache_control: { type: 'ephemeral' },
  });
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const contextLabels = [
  claudeMd ? 'CLAUDE.md' : null,
  dbBible  ? 'Database Bible' : null,
  includeGit ? 'Git history' : null,
].filter(Boolean);

console.log(`\nFoodSpot CLI — ${MODEL}`);
console.log(`Context: ${contextLabels.join(' + ')}`);
console.log(`Question: "${question}"\n`);
console.log('─'.repeat(60));
console.log();

let fullResponse = '';

try {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemBlocks,
    messages: [{ role: 'user', content: question }],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      process.stdout.write(chunk.delta.text);
      fullResponse += chunk.delta.text;
    }
  }

  const finalMsg = await stream.finalMessage();
  const usage    = finalMsg.usage;

  const inputTokens = usage.input_tokens       ?? 0;
  const cacheWrite  = usage.cache_creation_input_tokens ?? 0;
  const cacheRead   = usage.cache_read_input_tokens     ?? 0;
  const outputToks  = usage.output_tokens      ?? 0;

  const { cost, costWithoutCache } = costEstimate(inputTokens, cacheWrite, cacheRead, outputToks);
  const savings = costWithoutCache - cost;

  console.log('\n');
  console.log('─'.repeat(60));
  console.log('Usage:');
  console.log(`  Input tokens:    ${formatTokens(inputTokens)}`);
  console.log(`  Cache WRITTEN:   ${formatTokens(cacheWrite)}   (first call — context stored)`);
  console.log(`  Cache READ:      ${formatTokens(cacheRead)}   (reused from cache — cheap!)`);
  console.log(`  Output tokens:   ${formatTokens(outputToks)}`);
  console.log(`  This call cost:  $${cost.toFixed(5)}`);
  console.log(`  Without cache:   $${costWithoutCache.toFixed(5)}`);
  console.log(`  Saved:           $${savings.toFixed(5)}  (${savings > 0 ? Math.round((savings / costWithoutCache) * 100) : 0}% cheaper)`);
  console.log('─'.repeat(60));
  console.log();

} catch (err) {
  if (err.status === 401) {
    console.error('Error: Invalid API key. Check your ANTHROPIC_API_KEY.');
  } else if (err.status === 429) {
    console.error('Error: Rate limited. Wait a moment and try again.');
  } else {
    console.error('Error:', err.message);
  }
  process.exit(1);
}
