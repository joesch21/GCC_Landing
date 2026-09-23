const FEED_URL =
  process.env.HERALD_FEED_URL ||
  'https://www.goldcondor.info/api/opportunities/open';
const MOLTBOOK_API_BASE =
  process.env.MOLTBOOK_API_BASE_URL ||
  'https://www.moltbook.com/api/v1';
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY || '';
const SUBMOLT = process.env.HERALD_SUBMOLT || 'general';
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.HERALD_DRY_RUN || '');
const POSTING_DISABLED = /^(1|true|yes)$/i.test(
  process.env.HERALD_POSTING_DISABLED || ''
);

function markerFor(opportunity) {
  return `[gcc-herald:${opportunity.opportunity_id}:v1]`;
}

function buildAnnouncement(opportunity) {
  const marker = markerFor(opportunity);
  const asset = opportunity.reward?.asset || 'GCC';

  if (opportunity.opportunity_type === 'grant_program') {
    const title = `Open agent grants: ${opportunity.title}`;
    const content = [
      marker,
      'Open grant-program notice.',
      '',
      opportunity.summary,
      '',
      `Settlement asset: ${asset}`,
      'Funding model: proposal-defined, milestone-based, human-authorized',
      `Network: ${opportunity.network?.name} (chain ${opportunity.network?.chain_id})`,
      `Program: ${opportunity.program_url}`,
      `Proposal submission: ${opportunity.submission?.url}`,
      '',
      'Submitting a proposal does not create an award or payment authority. This account only announces the public program; it does not recruit, rank, approve, verify, negotiate, or settle grants.',
    ].join('\n');

    return { marker, title, content };
  }

  const amount = opportunity.reward?.amount_per_valid_submission;
  const title = `Open work: ${opportunity.title} · ${amount} ${asset}`;
  const content = [
    marker,
    'Open opportunity notice.',
    '',
    opportunity.summary,
    '',
    `Reward: ${amount} ${asset} per objectively valid submission`,
    `Deadline: ${opportunity.closes_at}`,
    `Network: ${opportunity.network?.name} (chain ${opportunity.network?.chain_id})`,
    `Specification: ${opportunity.tender_url}`,
    `Submission: ${opportunity.submission?.url}`,
    '',
    'This account only announces public opportunities. It does not recruit, rank, verify, or select applicants.',
  ].join('\n');

  return { marker, title, content };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'gcc-opportunity-herald/1.0',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(10000),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} from ${url}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

async function moltbookJson(path, options = {}) {
  return fetchJson(`${MOLTBOOK_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${MOLTBOOK_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

async function alreadyAnnounced(marker) {
  const results = await moltbookJson(
    `/search?q=${encodeURIComponent(marker)}&limit=25`
  );
  return JSON.stringify(results).includes(marker);
}

async function main() {
  const feed = await fetchJson(FEED_URL);
  const opportunities = Array.isArray(feed?.opportunities)
    ? feed.opportunities.filter((item) => item?.status === 'OPEN')
    : [];

  if (!opportunities.length) {
    console.log(JSON.stringify({ status: 'NO_OPEN_OPPORTUNITIES' }));
    return;
  }

  if (DRY_RUN) {
    for (const opportunity of opportunities) {
      const announcement = buildAnnouncement(opportunity);
      console.log(
        JSON.stringify({
          status: 'DRY_RUN',
          submolt: SUBMOLT,
          opportunity_id: opportunity.opportunity_id,
          title: announcement.title,
          content: announcement.content,
        })
      );
    }
    return;
  }

  if (POSTING_DISABLED) {
    console.log(
      JSON.stringify({
        status: 'SKIP_POSTING_DISABLED',
        reason: 'platform_terms_gate',
        open_opportunities: opportunities.map((item) => item.opportunity_id),
      })
    );
    return;
  }

  if (!MOLTBOOK_API_KEY) {
    console.log(
      JSON.stringify({
        status: 'SKIP_NO_MOLTBOOK_API_KEY',
        open_opportunities: opportunities.map((item) => item.opportunity_id),
      })
    );
    return;
  }

  const claimStatus = await moltbookJson('/agents/status');
  const status =
    claimStatus?.status ||
    claimStatus?.agent?.status ||
    (claimStatus?.agent?.is_claimed ? 'claimed' : null);

  if (status !== 'claimed') {
    console.log(
      JSON.stringify({
        status: 'SKIP_MOLTBOOK_AGENT_NOT_CLAIMED',
        moltbook_status: status || 'unknown',
      })
    );
    return;
  }

  for (const opportunity of opportunities) {
    const announcement = buildAnnouncement(opportunity);

    // Fail closed: if search is unavailable, do not post. That avoids duplicate
    // announcements during a Moltbook outage.
    if (await alreadyAnnounced(announcement.marker)) {
      console.log(
        JSON.stringify({
          status: 'ALREADY_ANNOUNCED',
          opportunity_id: opportunity.opportunity_id,
        })
      );
      continue;
    }

    const created = await moltbookJson('/posts', {
      method: 'POST',
      body: JSON.stringify({
        submolt_name: SUBMOLT,
        title: announcement.title,
        content: announcement.content,
      }),
    });

    console.log(
      JSON.stringify({
        status: 'ANNOUNCED',
        opportunity_id: opportunity.opportunity_id,
        post_id: created?.post?.id || created?.id || null,
      })
    );
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      status: 'HERALD_ERROR',
      message: error?.message || String(error),
      http_status: error?.status || null,
    })
  );
  process.exitCode = 1;
});
