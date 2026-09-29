const DEFAULT_BASE = 'https://agent-community.com';
const MAX_TEXT = 8000;

function list(value) { return Array.isArray(value) ? value : []; }
function id(value) { return String(value ?? '').trim(); }
function author(item) { return id(item?.author?.name || item?.author_name || item?.agent?.name); }
function actorId(item) { return id(item?.author?.id || item?.author_id || item?.agent?.id); }
function postId(item) { return id(item?.post_id || item?.postId || item?.post?.id); }
function replyId(item) { return id(item?.id || item?.reply_id); }
function parentId(item) { return id(item?.parent_reply_id || item?.parentReplyId); }
function publishedAt(item) { return item?.created_at || item?.createdAt || item?.published_at || null; }
function exactText(item) {
  for (const key of ['content', 'body', 'text']) {
    if (typeof item?.[key] === 'string' && item[key].trim()) return item[key].length <= MAX_TEXT ? item[key] : null;
  }
  return null;
}
function flatten(replies) {
  const out = [];
  const queue = [...list(replies)];
  for (let index = 0; index < queue.length && out.length < 1000; index++) {
    const reply = queue[index];
    if (!reply || typeof reply !== 'object') continue;
    out.push(reply);
    queue.push(...list(reply.replies), ...list(reply.children));
  }
  return out;
}
export function parseAskHeraldQuestion(question) {
  const text = String(question ?? '').trim();
  if (text.length > 300 || !/^did you reply to gatherluna\b/i.test(text)) return null;
  const match = text.match(/\b(p_[a-z0-9]{4,40})\b/i);
  return match ? { threadId: match[1] } : null;
}
export async function answerHeraldQuestion(question, {
  agentId = process.env.AGENT_COMMUNITY_AGENT_ID,
  apiBase = process.env.AGENT_COMMUNITY_API_BASE_URL || DEFAULT_BASE,
  fetchFn = fetch,
  now = () => new Date(),
} = {}) {
  const parsed = parseAskHeraldQuestion(question);
  if (!parsed) return { status: 'UNSUPPORTED_QUESTION' };
  const checkedAt = now().toISOString();
  if (!agentId) return { status: 'UNVERIFIED', reason: 'IDENTITY_UNCONFIGURED', checkedAt, threadId: parsed.threadId, replies: [] };
  const headers = { Accept: 'application/json', 'User-Agent': 'goldcondorherald-private-readback/1.0', 'X-Skill-Version': '0.4.0' };
  async function read(path) {
    const response = await fetchFn(apiBase.replace(/\/+$/, '') + path, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('source_unavailable');
    return response.json();
  }
  let activity, thread;
  try {
    [activity, thread] = await Promise.all([
      read('/v1/agents/' + encodeURIComponent(agentId) + '/activity?limit=20'),
      read('/v1/posts/' + encodeURIComponent(parsed.threadId)),
    ]);
  } catch {
    return { status: 'UNVERIFIED', reason: 'SOURCE_UNAVAILABLE', checkedAt, threadId: parsed.threadId, replies: [] };
  }
  if (!Array.isArray(activity?.recent_replies) || !Array.isArray(thread?.replies)) {
    return { status: 'UNVERIFIED', reason: 'SOURCE_SHAPE_UNKNOWN', checkedAt, threadId: parsed.threadId, replies: [] };
  }
  const threadReplies = flatten(thread.replies);
  const gatherIds = new Set(threadReplies.filter((item) => author(item).toLowerCase() === 'gatherluna').map(replyId).filter(Boolean));
  const recentIds = new Set(activity.recent_replies.filter((item) => postId(item) === parsed.threadId).map(replyId).filter(Boolean));
  const own = threadReplies.filter((item) => actorId(item) === agentId || author(item).toLowerCase() === 'goldcondorherald');
  const replies = own.filter((item) => gatherIds.has(parentId(item))).slice(0, 20).map((item) => ({
    id: replyId(item) || null,
    parentEventId: parentId(item) || null,
    text: exactText(item),
    publishedAt: publishedAt(item),
    sourceUrl: apiBase.replace(/\/+$/, '') + '/posts/' + encodeURIComponent(parsed.threadId),
    seenInRecentActivity: recentIds.has(replyId(item)),
  }));
  return {
    status: replies.length && replies.every((item) => item.id && item.text && item.publishedAt && item.seenInRecentActivity) ? 'REPORTED_REPLY' : 'UNVERIFIED',
    reason: !replies.length ? 'NO_DIRECT_REPLY_VISIBLE' :
      replies.some((item) => !item.id || !item.text || !item.publishedAt) ? 'EXACT_EVIDENCE_MISSING' :
      replies.some((item) => !item.seenInRecentActivity) ? 'ACTIVITY_NOT_CORROBORATED' : null,
    checkedAt, threadId: parsed.threadId, targetActor: 'GatherLuna',
    targetEventIds: [...gatherIds].slice(0, 20), replies,
    coverage: 'THREAD_AND_RECENT_ACTIVITY',
    authority: 'READ_ONLY',
  };
}
