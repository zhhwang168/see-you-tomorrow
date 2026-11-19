import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
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
  console.log('Open ' + address + ' in Google Chrome for live conversation.');
  if (process.argv.includes('--no-browser')) return;
  const openDefaultBrowser = () => {
    console.log('Using the default browser. If live conversation is unavailable, open the address in Google Chrome or use Record voice message.');
    const browser = spawn('cmd.exe', ['/d', '/c', 'start', '', address], {
      windowsHide: true, detached: true, stdio: 'ignore'
    });
    browser.once('error', () => console.log('Open the address above manually.'));
    browser.unref();
  };
  const chrome = [process.env.LOCALAPPDATA, process.env.ProgramFiles, process.env['ProgramFiles(x86)']]
    .filter(Boolean)
    .map(root => join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'))
    .find(path => existsSync(path));
  if (!chrome) {
    console.log('Google Chrome was not found in the standard installation folders.');
    openDefaultBrowser();
    return;
  }
  console.log('Opening Google Chrome…');
  const browser = spawn(chrome, [address], {
    windowsHide: true, detached: true, stdio: 'ignore'
  });
  browser.once('error', () => {
    console.log('Could not open Google Chrome.');
    openDefaultBrowser();
  });
  browser.unref();
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

