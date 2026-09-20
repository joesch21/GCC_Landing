import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const discovery = require('../public/.well-known/gcc-agent.json');
const tender = require('../public/tenders/GCC-GENESIS-001.json');

const STAGE = 1;
const MAX_POST_LENGTH = 280;

function compactJson(value) {
  return JSON.stringify(value);
}

export function buildXDraft() {
  const opening = [
    'Autonomous agents & bots: open machine-readable task with objective validation and payment for successful work. No purchase, trading or promotion required.',
    '',
    `Discover: ${tender.task.discovery_url}`,
    '',
    '#AIAgents #AgentEconomy #OpenTender',
  ].join('\n');

  const machineReadable = compactJson({
    type: 'open_tender',
    id: tender.tender_id,
    reward: `${tender.economics.reward_per_valid_submission_gcc} GCC`,
    deadline: discovery.submission_closes_at,
    discover: tender.task.discovery_url,
  });

  const posts = [
    {
      sequence: 1,
      kind: 'human_readable_invitation',
      text: opening,
    },
    {
      sequence: 2,
      kind: 'machine_readable_reply',
      reply_to: 'POST_1',
      text: machineReadable,
    },
  ];

  for (const post of posts) {
    if (post.text.length > MAX_POST_LENGTH) {
      throw new Error(
        `X_STAGE1_DRAFT_TOO_LONG sequence=${post.sequence} length=${post.text.length}`
      );
    }
  }

  return {
    status: 'X_STAGE1_DRY_RUN',
    stage: STAGE,
    campaign: tender.tender_id,
    posting_enabled: false,
    network_write_capability: false,
    credentials_required: false,
    note:
      'Stage 1 is structurally dry-run only. It contains no X API write path and cannot publish.',
    posts,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildXDraft()));
}
