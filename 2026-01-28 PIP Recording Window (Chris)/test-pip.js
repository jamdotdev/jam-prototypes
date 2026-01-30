const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  console.log('Launching Chrome...');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--auto-select-desktop-capture-source=Entire Screen',
      '--enable-features=DocumentPictureInPictureAPI',
      '--use-fake-ui-for-media-stream', // Auto-accept media permissions
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // Collect all console logs
  const logs = [];

  page.on('console', msg => {
    const text = msg.text();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${msg.type().toUpperCase()}] ${text}`;
    logs.push(logEntry);
    console.log(logEntry);
  });

  page.on('pageerror', err => {
    const logEntry = `[ERROR] Page error: ${err.message}`;
    logs.push(logEntry);
    console.log(logEntry);
  });

  // Load the PIP prototype
  const filePath = path.join(__dirname, 'index.html');
  console.log(`Loading: file://${filePath}`);
  await page.goto(`file://${filePath}`);

  console.log('\n========================================');
  console.log('PIP Test Page Loaded!');
  console.log('========================================');
  console.log('Instructions:');
  console.log('1. Click "Screen only" or "Screen + voice"');
  console.log('2. Select a screen to share');
  console.log('3. Wait a few seconds (watch for chunk logs)');
  console.log('4. Click the X on the PIP window');
  console.log('5. Watch the console output here');
  console.log('6. Press Ctrl+C when done to exit');
  console.log('========================================\n');

  // Keep the browser open until user closes it or Ctrl+C
  await new Promise((resolve) => {
    process.on('SIGINT', async () => {
      console.log('\n\n========================================');
      console.log('TEST SUMMARY - All captured logs:');
      console.log('========================================');
      logs.forEach(log => console.log(log));
      console.log('========================================');
      console.log(`Total logs captured: ${logs.length}`);
      await browser.close();
      resolve();
    });
  });
})();
