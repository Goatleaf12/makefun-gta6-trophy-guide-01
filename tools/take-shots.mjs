// Screenshot driver for Leonida Ledger (authored for this entry).
// Launches headless Chromium, talks to it over the DevTools protocol with
// Node's built-in WebSocket, and captures the four shots from shots.json as
// JPEGs of at most 256 KiB each. Run: node tools/take-shots.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_BIN ?? '/home/hatch/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome';
const PORT = 9333;
const BASE = 'http://127.0.0.1:8123';
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDebugger() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chromium debugger did not come up');
}

function connect(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method && listeners.has(msg.method)) {
      for (const fn of listeners.get(msg.method)) fn(msg.params);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
  };
  return { ws, send, on, ready: new Promise((r) => ws.addEventListener('open', r, { once: true })) };
}

const READY_TEXT = {
  cover: 'YOUR COUNT',
  roadmap: 'NEXT UP',
  miss: 'MISSABLES & WATCH',
  sources: 'SOURCE MATRIX',
};
async function waitForApp(send, shotPath) {
  const demo = new URLSearchParams(shotPath.split('?')[1] ?? '').get('demo') ?? 'cover';
  const needle = READY_TEXT[demo] ?? 'steps cited';
  for (let i = 0; i < 80; i += 1) {
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const a = document.querySelector('#audit-strip');
        const visible = [...document.querySelectorAll('main .view')].filter((v) => !v.hidden);
        return !!(a && a.textContent.includes('steps cited') && visible.length === 1
          && visible[0].textContent.includes(${JSON.stringify(needle)}));
      })()`,
      returnByValue: true,
    });
    if (r.result && r.result.value) return;
    await sleep(200);
  }
  throw new Error('app did not render in time for ' + shotPath);
}

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--window-size=1280,800', 'about:blank',
], { stdio: 'ignore' });

try {
  const wsUrl = await waitForDebugger();
  const cdp = connect(wsUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
  });

  for (const shot of shots) {
    const target = join(root, 'screenshots', shot.file);
    const loaded = new Promise((r) => { cdp.on('Page.loadEventFired', () => r()); });
    await cdp.send('Page.navigate', { url: BASE + shot.path });
    await loaded;
    await waitForApp(cdp.send, shot.path);
    await sleep(500);
    let quality = 84;
    for (;;) {
      const shotRes = await cdp.send('Page.captureScreenshot', {
        format: 'jpeg', quality, captureBeyondViewport: false,
      });
      writeFileSync(target, Buffer.from(shotRes.data, 'base64'));
      const bytes = statSync(target).size;
      console.log(`${shot.file}: ${bytes} bytes at quality ${quality}`);
      if (bytes <= 262144 || quality <= 55) break;
      quality -= 8;
    }
  }
  cdp.ws.close();
} finally {
  chrome.kill('SIGKILL');
}
console.log('done');
