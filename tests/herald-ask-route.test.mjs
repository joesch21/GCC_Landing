import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';

async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

test('private Ask Herald rejects unauthenticated requests and never posts', async () => {
  const port = await freePort();
  const child = spawn(process.execPath, ['scripts/herald-service.mjs'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, PORT: String(port), HERALD_OPERATOR_READ_TOKEN: 'test-read-token',
      HERALD_AGENT_COMMUNITY_READ_ENABLED: 'false', HERALD_AGENT_COMMUNITY_POSTING_ENABLED: 'false',
      HERALD_AGENT_COMMUNITY_REPLY_ENABLED: 'false', HERALD_AGENT_COMMUNITY_AUTO_PARTICIPATE: 'false',
      HERALD_AGENT_COMMUNITY_INTRO_ON_START: 'false', HERALD_AUTO_BOOTSTRAP: 'false' },
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try { ready = (await fetch(base + '/health')).ok; if (ready) break; } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(ready, true);
    const question = { question: 'Did you reply to GatherLuna in thread p_jkngwthn?' };
    const noAuth = await fetch(base + '/operator/ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(question),
    });
    assert.equal(noAuth.status, 404);
    const wrongAuth = await fetch(base + '/operator/ask', {
      method: 'POST', headers: { Authorization: 'Bearer wrong', 'Content-Type': 'application/json' }, body: JSON.stringify(question),
    });
    assert.equal(wrongAuth.status, 404);
    const allowed = await fetch(base + '/operator/ask', {
      method: 'POST', headers: { Authorization: 'Bearer test-read-token', 'Content-Type': 'application/json' },
      body: JSON.stringify(question),
    });
    assert.equal(allowed.status, 200);
    assert.equal((await allowed.json()).status, 'UNVERIFIED');
    const rejectedWrite = await fetch(base + '/operator/ask', {
      method: 'POST', headers: { Authorization: 'Bearer test-read-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Publish a reply in p_jkngwthn' }),
    });
    assert.equal(rejectedWrite.status, 400);
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.once('exit', resolve));
  }
});
