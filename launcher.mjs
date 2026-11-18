import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const address = 'http://127.0.0.1:3081/';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function appIsReady() {
  try {
    const response = await fetch(address, { signal: AbortSignal.timeout(500) });
    return response.ok && (await response.text()).includes('<h1>See You Tomorrow</h1>');
  } catch {
    return false;
  }
}

function openBrowser() {
  console.log('Open ' + address + ' in your browser.');
  if (process.argv.includes('--no-browser')) return;
  const browser = spawn('cmd.exe', ['/d', '/c', 'start', '', address], { windowsHide: true });
  browser.on('error', () => console.log('Open the address above manually.'));
}

if (await appIsReady()) {
  openBrowser();
} else {
  const server = spawn(process.execPath, [fileURLToPath(new URL('server.mjs', import.meta.url))], { stdio: 'inherit' });
  const exited = new Promise(resolve => {
    server.once('error', error => { console.error(error.message); resolve(1); });
    server.once('exit', code => resolve(code ?? 0));
  });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await appIsReady()) { ready = true; break; }
    if (await Promise.race([exited.then(() => true), delay(150).then(() => false)])) break;
  }
  if (ready) {
    console.log('Keep this window open while using Mira.');
    openBrowser();
    process.exitCode = await exited;
  } else {
    server.kill();
    console.error('Could not start See You Tomorrow on port 3081.');
    process.exitCode = 1;
  }
}

