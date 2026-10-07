const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function captureWithRole(targetUrl, outputPath, rolePayload) {
  console.log(`Capturing ${targetUrl} as role...`);
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1440,1100',
    '--user-data-dir=C:\\Users\\Tinnaphat\\AppData\\Local\\Temp\\chrome-role-profile',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const res = await fetch(`http://127.0.0.1:9222/json/new`, { method: 'PUT' });
    const tab = await res.json();

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    function send(method, params = {}) {
      const id = ++msgId;
      return new Promise((resolve) => {
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const token = Buffer.from(JSON.stringify(rolePayload)).toString('base64');
    const fakeJwt = `eyJhbGciOiJIUzI1NiJ9.${token}.sig`;

    await send('Network.enable');
    await send('Network.setCookie', {
      name: 'tmo_session',
      value: fakeJwt,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    });

    await send('Page.enable');
    await send('Page.navigate', { url: targetUrl });

    await new Promise((r) => setTimeout(r, 3500));

    const result = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved: ${outputPath} (${buffer.length} bytes)`);

    ws.close();
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    chrome.kill();
  }
}

async function run() {
  // 1. Team Leader Approvals
  await captureWithRole(
    'http://localhost:3000/team-leader/approvals',
    'c:\\tmo\\screenshots\\team_leader_approval_real.png',
    { sub: 'u-4', username: 'teamleader_tu', role: 'TEAM_LEADER' }
  );

  await new Promise((r) => setTimeout(r, 1000));

  // 2. Admin Permissions Matrix
  await captureWithRole(
    'http://localhost:3000/admin/committee',
    'c:\\tmo\\screenshots\\admin_permissions_real.png',
    { sub: 'usr-admin', username: 'admin', role: 'ADMIN' }
  );

  console.log('All role captures complete!');
}

run();
