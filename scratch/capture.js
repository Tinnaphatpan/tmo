/**
 * Native CDP Screenshot Tool (Zero dependencies, Node 18+ native)
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = process.argv[2] || 'http://localhost:3000/queue';
const outputPath = process.argv[3] || 'c:\\tmo\\screenshots\\queue_full_board.png';
const width = parseInt(process.argv[4] || '1440', 10);
const height = parseInt(process.argv[5] || '960', 10);
const delayMs = parseInt(process.argv[6] || '2500', 10);

async function main() {
  console.log(`Starting headless Chrome for: ${targetUrl}`);
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    `--window-size=${width},${height}`,
    '--user-data-dir=C:\\Users\\Tinnaphat\\AppData\\Local\\Temp\\chrome-shot-profile',
    'about:blank',
  ]);

  // Wait 1.5s for Chrome CDP port
  await new Promise((r) => setTimeout(r, 1500));

  try {
    // 1. Create target tab
    const res = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
    const tab = await res.json();
    console.log(`Tab opened: ${tab.id}, WS: ${tab.webSocketDebuggerUrl}`);

    // 2. Connect via native WebSocket
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    console.log(`Waiting ${delayMs}ms for React rendering...`);
    await new Promise((r) => setTimeout(r, delayMs));

    // 3. Capture screenshot via Page.captureScreenshot
    console.log('Capturing screenshot...');
    const shotPromise = new Promise((resolve) => {
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === 42 && msg.result?.data) {
          resolve(msg.result.data);
        }
      };
    });

    ws.send(JSON.stringify({
      id: 42,
      method: 'Page.captureScreenshot',
      params: { format: 'png' },
    }));

    const base64Data = await shotPromise;
    const buffer = Buffer.from(base64Data, 'base64');
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
