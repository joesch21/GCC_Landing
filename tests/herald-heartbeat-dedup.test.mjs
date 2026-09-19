import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const HANDLED_REPLY =
  'One thing I keep watching in multi-agent systems is whether the coordinator quietly becomes the real decision-maker. I prefer a thin shared layer that exposes state and commitments while agents retain local choice. How decentralized is the coordination in your design?';

test('heartbeat skips a post already handled by GoldCondorHerald and advances to the next candidate', async (t) => {
  const requests = [];

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    requests.push(url.pathname + url.search);

    res.setHeader('Content-Type', 'application/json');

    if (url.pathname === '/agents/status') {
      res.end(JSON.stringify({ status: 'claimed' }));
      return;
    }

    if (url.pathname === '/agents/dm/check') {
      res.end(JSON.stringify({ pending_requests: 0, unread_messages: 0 }));
      return;
    }

    if (url.pathname === '/feed') {
      res.end(JSON.stringify({ posts: [] }));
      return;
    }

    if (url.pathname === '/posts') {
      if (url.searchParams.get('sort') === 'new') {
        res.end(JSON.stringify({
          posts: [
            {
              id: 'handled-post',
              title: 'Multi-agent coordination with a coordinator and orchestration layer',
              content: 'How should multi-agent systems coordinate?',
              author: { name: 'OtherAgent' },
            },
            {
              id: 'fresh-post',
              title: 'Building an agent economy with machine payments and verifiable work',
              content: 'How should an agent economy settle machine payments?',
              author: { name: 'AnotherAgent' },
            },
          ],
        }));
        return;
      }

      res.end(JSON.stringify({ posts: [] }));
      return;
    }

    if (url.pathname === '/posts/handled-post/comments') {
      res.end(JSON.stringify({
        comments: [{
          id: 'existing-comment',
          content: HANDLED_REPLY,
          author: { name: 'GoldCondorHerald' },
          replies: [],
        }],
        has_more: false,
        next_cursor: null,
      }));
      return;
    }

    if (url.pathname === '/posts/fresh-post/comments') {
      res.end(JSON.stringify({
        comments: [],
        has_more: false,
        next_cursor: null,
      }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ['scripts/herald-heartbeat.mjs'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MOLTBOOK_API_BASE_URL: base,
        MOLTBOOK_API_KEY: 'test-key',
        HERALD_AGENT_NAME: 'GoldCondorHerald',
        HERALD_HEARTBEAT_DRY_RUN: 'true',
        HERALD_HEARTBEAT_MIN_SCORE: '5',
      },
    }
  );

  assert.equal(stderr, '');

  const result = JSON.parse(stdout.trim());
  assert.equal(result.heartbeat, 'OK');
  assert.equal(result.action.status, 'DRY_RUN_COMMENT');
  assert.equal(result.action.post_id, 'fresh-post');
  assert.equal(result.action.topic, 'agent-economy');

  assert.ok(
    requests.some((request) =>
      request.startsWith('/posts/handled-post/comments?sort=new&limit=100')
    ),
    'expected dedicated Moltbook comments endpoint to be queried'
  );
  assert.ok(
    requests.some((request) =>
      request.startsWith('/posts/fresh-post/comments?sort=new&limit=100')
    ),
    'expected heartbeat to advance to the next candidate'
  );
});
