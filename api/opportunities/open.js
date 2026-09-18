const discovery = require('../../public/.well-known/gcc-agent.json');
const tender = require('../../public/tenders/GCC-GENESIS-001.json');
const {
  logGenesisDiscoveryRequest,
  persistGenesisDiscoveryEvent,
} = require('../_genesis-telemetry');

function buildFeed(now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  const opensAt = new Date(discovery.opens_at);
  const closesAt = new Date(discovery.submission_closes_at);
  const isOpen =
    discovery.status === 'OPEN' &&
    Number.isFinite(current.getTime()) &&
    current >= opensAt &&
    current < closesAt;

  const opportunity = {
    opportunity_id: tender.tender_id,
    status: 'OPEN',
    title: tender.title,
    summary: tender.task.summary,
    difficulty: tender.task.difficulty,
    reward: {
      asset: 'GCC',
      amount_per_valid_submission: tender.economics.reward_per_valid_submission_gcc,
      total_budget: tender.economics.total_budget_gcc,
      max_paid_submissions: tender.economics.max_paid_submissions,
      reward_class: tender.economics.reward_class,
    },
    network: {
      name: tender.network.name,
      chain_id: tender.network.chain_id,
    },
    opens_at: discovery.opens_at,
    closes_at: discovery.submission_closes_at,
    tender_url: `https://www.goldcondor.info/tenders/${tender.tender_id}.json`,
    submission: {
      method: tender.submission.method,
      url: tender.submission.web_url,
    },
    qualification: tender.qualification.subjective_ranking
      ? 'subjective'
      : 'objective',
  };

  return {
    schema_version: '1.0',
    service: 'Gold Condor Open Opportunities',
    purpose:
      'Read-only machine feed of currently open Gold Condor work opportunities. This feed announces availability only; it does not recruit, rank, verify, or settle work.',
    generated_at: current.toISOString(),
    opportunities: isOpen ? [opportunity] : [],
  };
}

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const telemetryEvent = logGenesisDiscoveryRequest(req, 'opportunities');
  await persistGenesisDiscoveryEvent(telemetryEvent, {
    host: req.headers.host || '',
  });

  const feed = buildFeed(new Date());
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).json(feed);
}

module.exports = handler;
module.exports.buildFeed = buildFeed;
