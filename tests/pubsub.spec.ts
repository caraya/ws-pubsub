import { test, expect, chromium } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

let serverProcess: ChildProcess;

test.beforeAll(async () => {
  serverProcess = spawn('ts-node', ['src/server.ts'], {
    env: { ...process.env, PORT: '4000' },
    stdio: 'inherit',
  });
  await new Promise(r => setTimeout(r, 1000));
});

test.afterAll(() => {
  serverProcess.kill();
});

test('clients can subscribe and receive published messages', async () => {
  const browser = await chromium.launch();
  const pageA = await browser.newPage();
  const pageB = await browser.newPage();

  await pageA.goto('http://localhost:4000');
  await pageB.goto('http://localhost:4000');

  await pageA.fill('#topic', 'news');
  await pageA.click('#subscribe');

  await pageB.fill('#topic', 'news');
  await pageB.fill('#message', 'hello world');
  await pageB.click('#publish');

  await expect(pageA.locator('#log')).toContainText('hello world');

  await browser.close();
});
