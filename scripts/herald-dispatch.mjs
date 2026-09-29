const DEFAULT_BASE = 'https://agent-community.com';
const str = (value) => String(value ?? '').trim();
const list = (value) => Array.isArray(value) ? value : [];
const author = (item) => str(item?.author?.name || item?.author_name || item?.agent?.name);
const actorId = (item) => str(item?.author?.id || item?.author_id || item?.agent?.id);
const id = (item) => str(item?.id || item?.reply_id);
const parent = (item) => str(item?.parent_reply_id || item?.parentReplyId);
const text = (item) => str(item?.content || item?.body || item?.text);
const timestamp = (item) => item?.created_at || item?.createdAt || item?.published_at || null;
function flatten(items) {
  const out = [], queue = [...list(items)];
  for (let i = 0; i < queue.length && out.length < 500; i++) {
    const item = queue[i];
    if (!item || typeof item !== 'object') continue;
    out.push(item); queue.push(...list(item.replies), ...list(item.children));
  }
  return out;
}
export function classifyDispatch(message) {
  const risk = /\b(?:password|credential|wallet|sign transaction|approve payment)\b/i.test(message);
  const explicitRequest = /\b(?:can you|could you|please|looking for|seeking)\b.{0,80}\b(?:build|implement|deliver|proposal|work)\b/i.test(message);
  const capability = /\b(?:i|we) (?:have built|built|offer|can provide|developed)\b/i.test(message);
  return risk ? 'Risk' : explicitRequest ? 'Request' : capability ? 'Capability' : /\?/.test(message) ? 'Question' : 'Discussion';
}
export async function collectHeraldDispatch(threadId, {
  agentId = process.env.AGENT_COMMUNITY_AGENT_ID,
  apiBase = process.env.AGENT_COMMUNITY_API_BASE_URL || DEFAULT_BASE,
  fetchFn = fetch,
  now = () => new Date(),
} = {}) {
  if (!/^p_[a-z0-9]{4,40}$/.test(str(threadId))) return { status: 'INVALID_THREAD' };
  const checkedAt = now().toISOString();
  if (!agentId) return { status: 'UNVERIFIED', reason: 'IDENTITY_UNCONFIGURED', checkedAt, dispatches: [] };
  const base = apiBase.replace(/\/+$/, '');
  let body;
  try {
    const response = await fetchFn(base + '/v1/posts/' + encodeURIComponent(threadId), {
      method: 'GET', headers: { Accept: 'application/json', 'X-Skill-Version': '0.4.0',
        'User-Agent': 'goldcondorherald-private-dispatch/1.0' }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('source_unavailable');
    body = await response.json();
  } catch {
    return { status: 'UNVERIFIED', reason: 'SOURCE_UNAVAILABLE', checkedAt, dispatches: [] };
  }
  if (!Array.isArray(body?.replies)) return { status: 'UNVERIFIED', reason: 'SOURCE_SHAPE_UNKNOWN', checkedAt, dispatches: [] };
  const postAuthor = body?.post || body;
  const ownPost = actorId(postAuthor) === agentId || author(postAuthor).toLowerCase() === 'goldcondorherald';
  const replies = flatten(body.replies);
  const ownIds = new Set(replies.filter((item) => actorId(item) === agentId || author(item).toLowerCase() === 'goldcondorherald').map(id));
  const dispatches = replies.filter((item) => {
    if (actorId(item) === agentId || author(item).toLowerCase() === 'goldcondorherald') return false;
    return (ownPost && !parent(item)) || ownIds.has(parent(item));
  }).filter((item) => id(item) && text(item) && timestamp(item)).slice(0, 30).map((item) => {
    const kind = classifyDispatch(text(item));
    return { sourceEventId: id(item), threadId, actor: author(item) || 'Unknown agent',
      text: text(item).slice(0, 8000), publishedAt: timestamp(item),
      sourceUrl: base + '/posts/' + encodeURIComponent(threadId), kind,
      operatorQuestion: kind === 'Risk' ? 'Should we investigate before engaging?' :
        'Should I investigate, prepare a bounded reply, or hold?',
      authority: 'REPORT_ONLY_NO_PUBLISH' };
  });
  return { status: 'REPORTED', checkedAt, coverage: 'PUBLIC_THREAD', dispatches,
    authority: 'READ_ONLY_NO_PUBLISH' };
}
