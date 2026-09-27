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
  return dedupe(ledger);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.id || `${item.post_id || ''}:${item.created_at || ''}:${item.text || ''}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function flattenComments(comments, postId, out = []) {
  if (!Array.isArray(comments)) return out;
  for (const comment of comments) {
    const author = first(comment?.agent, ['name']) || first(comment?.author, ['name']) ||
      first(comment, ['agent_name', 'author_name']);
    if (author === AGENT_NAME) {
      out.push({
        id: first(comment, ['id', 'comment_id']),
        created_at: first(comment, ['created_at', 'createdAt', 'timestamp']),
        post_id: postId,
        text: first(comment, ['content', 'body', 'text']),
      });
    }
    flattenComments(comment?.replies, postId, out);
  }
  return out;
}

async function reconstructFromRecentPosts(targetCount) {
  const found = [];
  let cursor = null;
  let postsScanned = 0;
  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({ sort: 'new', limit: '100' });
    if (cursor) query.set('cursor', cursor);
    const body = await getJson(`/posts?${query.toString()}`).catch(() => null);
    const posts = Array.isArray(body?.posts) ? body.posts : Array.isArray(body) ? body : [];
    if (!posts.length) break;
    for (const post of posts) {
      const postId = first(post, ['id', 'post_id']);
      if (!postId) continue;
      postsScanned += 1;
      const commentsBody = await getJson(
        `/posts/${encodeURIComponent(postId)}/comments?sort=new&limit=100`
      ).catch(() => null);
      const comments = Array.isArray(commentsBody?.comments)
        ? commentsBody.comments
        : Array.isArray(commentsBody) ? commentsBody : [];
      flattenComments(comments, postId, found);
      if (targetCount !== null && dedupe(found).length >= Number(targetCount)) {
        return { comments: dedupe(found), posts_scanned: postsScanned, target_reached: true };
      }
    }
    if (!body?.has_more || !body?.next_cursor) break;
    cursor = String(body.next_cursor);
  }
  return { comments: dedupe(found), posts_scanned: postsScanned, target_reached: false };
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
  const declaredCount = first(agent, [
    'comment_count', 'commentCount', 'comments_count', 'commentsCount',
  ]) ?? first(publicProfile?.agent, [
    'comment_count', 'commentCount', 'comments_count', 'commentsCount',
  ]);

  const profileLedger = dedupe([...collectActivity(me), ...collectActivity(publicProfile)]);
  const reconstruction = declaredCount !== null && profileLedger.length < Number(declaredCount)
    ? await reconstructFromRecentPosts(declaredCount)
    : { comments: [], posts_scanned: 0, target_reached: true };
  const deduped = dedupe([...profileLedger, ...reconstruction.comments]);
  const complete = declaredCount !== null && Number(declaredCount) === deduped.length;

  console.log(JSON.stringify({
    audit: 'MOLTBOOK_ACTIVITY_READ_ONLY',
    agent_name: first(agent, ['name']) || AGENT_NAME,
    agent_id: first(agent, ['id']),
    declared_comment_count: declaredCount === null ? null : Number(declaredCount),
    ledger_count: deduped.length,
    ledger_complete: complete,
    comments: deduped,
    reconstruction: {
      attempted: reconstruction.posts_scanned > 0,
      posts_scanned: reconstruction.posts_scanned,
      target_reached: reconstruction.target_reached,
      bounded_max_posts: 1000,
    },
    source: {
      agents_me: true,
      public_profile: !publicProfile?.unavailable,
      recent_post_comment_scan: reconstruction.posts_scanned > 0,
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
