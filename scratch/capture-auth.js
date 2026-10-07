/**
 * Authenticated CDP Screenshot Tool
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = process.argv[2] || 'http://localhost:3000/committee';
const outputPath = process.argv[3] || 'c:\\tmo\\screenshots\\committee_real_grading.png';
const width = parseInt(process.argv[4] || '1440', 10);
const height = parseInt(process.argv[5] || '1200', 10);

async function main() {
  console.log(`Starting headless Chrome for: ${targetUrl}`);
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    `--window-size=${width},${height}`,
    '--user-data-dir=C:\\Users\\Tinnaphat\\AppData\\Local\\Temp\\chrome-auth-profile',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const res = await fetch(`http://127.0.0.1:9222/json/new`, { method: 'PUT' });
    const tab = await res.json();
    console.log(`Tab opened: ${tab.id}`);

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

    // Set auth cookie
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItMSIsInVzZXJuYW1lIjoiY29tbWl0dGVlMSIsInJvbGUiOiJDT01NSVRURUUifQ.dummy_signature';
    await send('Network.enable');
    await send('Network.setCookie', {
      name: 'tmo_session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    });

    // Navigate to targetUrl
    console.log(`Navigating to ${targetUrl}...`);
    await send('Page.enable');
    await send('Page.navigate', { url: targetUrl });

    console.log('Waiting 3500ms for authenticated page to render...');
    await new Promise((r) => setTimeout(r, 3500));

    // Capture screenshot
    console.log('Capturing screenshot...');
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
    console.log(`Screenshot saved successfully to ${outputPath} (${buffer.length} bytes)`);

    ws.close();
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    chrome.kill();
  }
}

main();
