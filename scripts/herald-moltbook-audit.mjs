const MOLTBOOK_API_BASE =
  process.env.MOLTBOOK_API_BASE_URL || 'https://www.moltbook.com/api/v1';
const MOLTBOOK_API_KEY = process.env.MOLTBOOK_API_KEY || '';
const AGENT_NAME = process.env.HERALD_AGENT_NAME || 'GoldCondorHerald';

async function getJson(path) {
  if (!MOLTBOOK_API_KEY) throw new Error('MOLTBOOK_API_KEY missing');
  const response = await fetch(`${MOLTBOOK_API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${MOLTBOOK_API_KEY}`,
      Accept: 'application/json',
      'User-Agent': 'goldcondorherald-audit/1.0',
    },
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} from ${path}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function first(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return null;
}

function normalizeActivity(item) {
  if (!item || typeof item !== 'object') return null;
  const type = String(first(item, ['type', 'kind', 'activity_type']) || '').toLowerCase();
  const commentLike = type.includes('comment') || item.comment || item.comment_id;
  if (!commentLike) return null;
  const source = item.comment && typeof item.comment === 'object' ? item.comment : item;
  return {
    id: first(source, ['id', 'comment_id']),
    created_at: first(source, ['created_at', 'createdAt', 'timestamp']),
    post_id: first(source, ['post_id', 'postId']) || first(item, ['post_id', 'postId']),
    text: first(source, ['content', 'body', 'text']),
  };
}

function collectActivity(profile) {
  const candidates = [
    profile?.recent_activity,
    profile?.recentActivity,
    profile?.activity,
    profile?.agent?.recent_activity,
    profile?.agent?.recentActivity,
    profile?.agent?.activity,
    profile?.comments,
    profile?.agent?.comments,
  ];
  const ledger = [];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      const normalized = normalizeActivity(item);
      if (normalized?.id || normalized?.text) ledger.push(normalized);
    }
  }
  const seen = new Set();
  return ledger.filter((item) => {
    const key = String(item.id || `${item.post_id || ''}:${item.created_at || ''}:${item.text || ''}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const [me, publicProfile] = await Promise.all([
    getJson('/agents/me'),
    getJson(`/agents/profile?name=${encodeURIComponent(AGENT_NAME)}`).catch((error) => ({
      unavailable: true,
      status: error?.status || null,
    })),
  ]);

  const agent = me?.agent || me || {};
  const ledger = [...collectActivity(me), ...collectActivity(publicProfile)];
  const deduped = [];
  const seen = new Set();
  for (const item of ledger) {
    const key = String(item.id || `${item.post_id || ''}:${item.created_at || ''}:${item.text || ''}`);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  const declaredCount = first(agent, [
    'comment_count', 'commentCount', 'comments_count', 'commentsCount',
  ]) ?? first(publicProfile?.agent, [
    'comment_count', 'commentCount', 'comments_count', 'commentsCount',
  ]);

  console.log(JSON.stringify({
    audit: 'MOLTBOOK_ACTIVITY_READ_ONLY',
    agent_name: first(agent, ['name']) || AGENT_NAME,
    agent_id: first(agent, ['id']),
    declared_comment_count: declaredCount === null ? null : Number(declaredCount),
    ledger_count: deduped.length,
    ledger_complete: declaredCount !== null && Number(declaredCount) === deduped.length,
    comments: deduped,
    source: {
      agents_me: true,
      public_profile: !publicProfile?.unavailable,
      methods_used: ['GET'],
    },
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    audit: 'ERROR',
    message: error?.message || String(error),
    http_status: error?.status || null,
  }));
  process.exitCode = 1;
});
