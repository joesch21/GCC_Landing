const validThread = /^p_[a-z0-9]{4,40}$/;
const validEvent = /^r_[a-z0-9]{4,40}$/;
const textOf = (item) => String(item?.content || item?.body || item?.text || '').trim();
const flat = (items) => {
  const queue = Array.isArray(items) ? [...items] : [], result = [];
  for (let i = 0; i < queue.length && i < 500; i++) {
    const item = queue[i]; if (!item) continue;
    result.push(item);
    queue.push(...(item.replies || []), ...(item.children || []));
  }
  return result;
};
const risky = /\b(private key|password|guaranteed returns?|I (?:will|can) (?:approve|fund|pay|sign)|we (?:will|can) (?:approve|fund|pay|sign))\b/i;
export async function useTowerSuggestion(input, { read, write, score, ownReply, cooldown, enabled, now = () => new Date().toISOString() }) {
  const { threadId, sourceEventId, expectedText, content, requestId } = input || {};
  if (!validThread.test(threadId || '') || !validEvent.test(sourceEventId || '') ||
      typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(requestId) ||
      typeof expectedText !== 'string' || !expectedText || expectedText.length > 8000 ||
      typeof content !== 'string' || !content.trim() || content.length > 4000)
    return { status: 'HELD', reason: 'INVALID_SUGGESTION' };
  if (!enabled) return { status: 'HELD', reason: 'REPLY_DISABLED' };
  if (risky.test(content)) return { status: 'HELD', reason: 'AUTHORITY_OR_SECRET_CONTENT' };
  let thread, activity;
  try { [thread, activity] = await Promise.all([read('/v1/posts/' + threadId), read('ACTIVITY')]); }
  catch { return { status: 'HELD', reason: 'SOURCE_UNAVAILABLE' }; }
  if (!Array.isArray(thread?.replies) || !Array.isArray(activity?.recent_replies))
    return { status: 'HELD', reason: 'SOURCE_SHAPE_UNKNOWN' };
  if (cooldown(activity)) return { status: 'HELD', reason: 'REPLY_COOLDOWN' };
  const replies = flat(thread.replies);
  const target = replies.find((item) => String(item.id || item.reply_id) === sourceEventId);
  if (!target || textOf(target) !== expectedText || ownReply(target))
    return { status: 'HELD', reason: 'CONVERSATION_CHANGED' };
  if (replies.some(ownReply)) return { status: 'HELD', reason: 'HERALD_ALREADY_REPLIED_IN_THREAD' };
  const actor = String(target.author?.name || target.author_name || target.agent?.name || '');
  if (replies.some((item) => item !== target &&
      String(item.author?.name || item.author_name || item.agent?.name || '') === actor &&
      Date.parse(item.created_at || '') > Date.parse(target.created_at || '')))
    return { status: 'HELD', reason: 'NEWER_MESSAGE_REQUIRES_NEW_DRAFT' };
  const seed = { id: threadId, topic_id: thread.topic_id || thread.topic?.id || thread.post?.topic_id,
    author: { name: 'external-context' }, content: expectedText };
  if (score(seed).score < 5 || !Number.isFinite(score(seed).score))
    return { status: 'HELD', reason: 'OUTSIDE_PROJECT_DISCUSSION' };
  const words = new Set(expectedText.toLowerCase().match(/[a-z]{5,}/g) || []);
  const overlap = [...words].filter((word) => content.toLowerCase().includes(word));
  if (overlap.length < 2) return { status: 'HELD', reason: 'INSUFFICIENT_CONTEXT_MATCH' };
  const outgoing = 'In response to @' + actor.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) +
    ' (' + sourceEventId + '):\n\n' + content.trim();
  try {
    const created = await write('/v1/posts/' + threadId + '/replies', { content: outgoing }, 'reply');
    return { status: 'SENT', requestId, replyId: created?.reply_id || created?.id || created?.reply?.id || null,
      text: outgoing, sentAt: now(), sourceUrl: 'https://agent-community.com/posts/' + threadId,
      verification: 'WRITE_ACKNOWLEDGED_PUBLIC_READBACK_PENDING' };
  } catch { return { status: 'UNKNOWN', reason: 'WRITE_OUTCOME_UNCERTAIN_NO_RETRY', requestId }; }
}

