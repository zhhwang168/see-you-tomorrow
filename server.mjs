import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const address = 'http://127.0.0.1:3081';
const model = 'qwen3:4b-instruct';
const dataRoot = process.env.MIRA_DATA_DIR || 'C:/GitHub/output/See You Tomorrow';
const members = new Map([['mira','Mira'],['nora','Nora'],['room','Rooms']]);

async function memberData(request, response, id) {
  const folder = join(dataRoot, members.get(id));
  const path = join(folder, 'member.json');
  response.setHeader('Cache-Control', 'no-store');
  try {
    if (request.method === 'GET') {
      const content = await readFile(path, 'utf8').catch(error => {
        if (error.code === 'ENOENT') return 'null';
        throw error;
      });
      return response.writeHead(200, {'Content-Type':'application/json'}).end(content);
    }
    if (request.method !== 'PUT' || request.headers.origin !== address ||
        request.headers['content-type'] !== 'application/json') return response.writeHead(403).end();
    request.setEncoding('utf8');
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) return response.writeHead(413).end();
    }
    const { profile, history, topic, resetId } = JSON.parse(body);
    const current = JSON.parse(await readFile(path, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return 'null';
      throw error;
    }));
    if ((current?.resetId ?? null) !== (resetId ?? null)) {
      return response.writeHead(409).end('History was cleared. Refresh this tab.');
    }
    if (!profile || typeof profile.name !== 'string' || !Array.isArray(history) ||
        (topic !== null && typeof topic !== 'string')) return response.writeHead(400).end();
    await mkdir(folder, {recursive:true});
    const pending = join(folder, '.member-' + randomUUID() + '.tmp');
    await writeFile(pending, JSON.stringify({profile, history, topic, resetId:current?.resetId ?? null}, null, 2) + '\n', 'utf8');
    await rename(pending, path);
    response.writeHead(204).end();
  } catch (error) {
    console.error('Member file error:', error.message);
    response.writeHead(error instanceof SyntaxError ? 400 : 500).end('Could not save or read the member folder.');
  }
}

const routes = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/mira.png', ['nova-avatar.png', 'image/png']],
  ['/member-expressions.png', ['member-expressions.png', 'image/png']],
]);

async function chat(request, response) {
  if (request.headers.origin !== address || request.headers['content-type'] !== 'application/json') {
    response.writeHead(403).end();
    return;
  }
  request.setEncoding('utf8');
  let body = '';
  try {
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 32768) {
        response.writeHead(413).end();
        return;
      }
    }
    const { turns, topic, member, room } = JSON.parse(body);
    if (!Array.isArray(turns) || !turns.length || turns.length > 12 || turns.at(-1)?.role !== 'user' ||
        turns.some(turn => !turn || !['user', 'assistant'].includes(turn.role) ||
          typeof turn.content !== 'string' || turn.content.length > 2000)) {
      response.writeHead(400).end('Invalid conversation.');
      return;
    }
    const controller = new AbortController();
    response.on('close', () => controller.abort());
    const upstream = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]),
      body: JSON.stringify({
        model, stream: true, options: { num_ctx: 4096, num_predict: 220 },
        messages: [
          { role: 'system', content: 'You are a fictional adult family member in See You Tomorrow. Reply naturally in the language of the latest user message. Be warm and specific. Keep replies to 1–3 sentences, with at most one follow-up question. Start each reply with exactly one expression tag: [neutral], [happy], [concerned], or [upset]. The tag describes your own facial expression. Use happy for delight, concerned for empathy, and upset only when you are genuinely bothered. Then write the reply. Do not prefix it with any speaker name. A saved topic, if supplied, is context only. Never claim to have saved or deleted data. This app can transcribe the user microphone and read your replies aloud with Kokoro. The app handles audio automatically. If asked about voice, explain that Start live conversation enables spoken turns. Do not say that this is a text-only app or that you cannot speak.' },
          ...(member && typeof member === 'object' ? [{
            role: 'system',
            content: 'Character profile: ' + JSON.stringify(Object.fromEntries(
              ['name', 'relationship', 'personality'].map(key => [key, String(member[key] ?? '').slice(0, 240)])
            ))
          }] : []),
          ...(room && Array.isArray(room.participants) ? [{
            role: 'system',
            content: 'Shared room participants: ' + JSON.stringify(room.participants.slice(0, 2)) +
              '. Address the user directly. Answer their latest question first. If they addressed someone else by name, offer only a short relevant addition. You may acknowledge the previous reply briefly, then hand the conversation back to the user. Do not roleplay a side conversation or invent shared activities.' +
              (typeof room.previous?.text === 'string' ? ' Previous member reply for context: ' +
                JSON.stringify({name:String(room.previous.name).slice(0,32), text:room.previous.text.slice(0,1200)}) : '')
          }] : []),
          ...(typeof topic === 'string' && topic ? [{ role: 'system', content: 'User-saved topic: ' + topic.slice(0, 160) }] : []),
          ...turns
        ]
      })
    });
    if (!upstream.ok) {
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end(upstream.status === 404 ? 'Run ollama pull qwen3:4b-instruct first.' : 'Ollama could not start the model.');
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' });
    for await (const chunk of upstream.body) {
      if (!response.write(chunk)) {
        await new Promise(resolve => {
          const resume = () => {
            response.off('drain', resume);
            response.off('close', resume);
            resolve();
          };
          response.once('drain', resume);
          response.once('close', resume);
        });
      }
      if (response.destroyed) return;
    }
    response.end();
  } catch (error) {
    if (response.destroyed) return;
    if (response.headersSent) return response.end();
    response.writeHead(error instanceof SyntaxError ? 400 : 503, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end(error instanceof SyntaxError ? 'Invalid conversation.' : 'Ollama is unavailable. Start Ollama and load qwen3:4b-instruct.');
  }
}


const kokoroAddress = 'http://127.0.0.1:3082';
let speechStartup;
let speechWorker;

async function speechReady() {
  try {
    const response = await fetch(kokoroAddress + '/health', {signal:AbortSignal.timeout(1200)});
    return response.ok && await response.text() === 'kokoro';
  } catch { return false; }
}

function ensureSpeech() {
  speechStartup ??= (async () => {
    if (await speechReady()) return;
    if (!speechWorker) {
      const worker = spawn(fileURLToPath(new URL('.kokoro/Scripts/python.exe', import.meta.url)), [
        '-u', fileURLToPath(new URL('kokoro_server.py', import.meta.url))
      ], {
        windowsHide:true, stdio:'inherit',
        env:{...process.env, HF_HOME:fileURLToPath(new URL('.kokoro/hf', import.meta.url))}
      });
      speechWorker = worker;
      const clear = () => { if (speechWorker === worker) speechWorker = undefined; };
      worker.once('exit', clear);
      worker.once('error', error => { console.error('Could not start Kokoro:', error.message); clear(); });
    }
    for (let attempt = 0; attempt < 90; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (await speechReady()) return;
      if (!speechWorker) break;
    }
    throw Error('Kokoro could not start.');
  })().finally(() => { speechStartup = undefined; });
  return speechStartup;
}
process.on('exit', () => speechWorker?.kill());

async function releaseModels(request, response) {
  if (request.headers.origin !== address) return response.writeHead(403).end();
  try {
    if (speechStartup) await speechStartup.catch(() => {});
    const worker = speechWorker;
    if (worker && worker.exitCode === null) {
      await new Promise((resolve, reject) => {
        worker.once('exit', resolve);
        if (!worker.kill()) {
          worker.off('exit', resolve);
          reject(Error('Could not stop the Kokoro worker.'));
        }
      });
    }
    const result = await fetch('http://127.0.0.1:11434/api/generate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model, keep_alive:0}), signal:AbortSignal.timeout(12000)
    });
    await result.text();
    if (!result.ok && result.status !== 404) throw Error('Ollama could not unload the model.');
    response.writeHead(204).end();
  } catch (error) {
    console.error('Model release failed:', error.message);
    response.writeHead(503).end('Could not release all model memory.');
  }
}

async function speech(request, response) {
  if (request.headers.origin !== address || request.headers['content-type'] !== 'application/json') {
    return response.writeHead(403).end();
  }
  try {
    request.setEncoding('utf8');
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 8192) return response.writeHead(413).end();
    }
    await ensureSpeech();
    let audio;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const upstream = await fetch(kokoroAddress + '/speech', {
          method: 'POST', headers: {'Content-Type':'application/json'}, body,
          signal: AbortSignal.timeout(45000)
        });
        if (!upstream.ok) return response.writeHead(502).end('Kokoro could not synthesize this reply.');
        audio = Buffer.from(await upstream.arrayBuffer());
        break;
      } catch (error) {
        if (attempt || response.destroyed) throw error;
        console.warn('Retrying interrupted Kokoro WAV transfer:', error.cause?.code || error.name);
      }
    }
    response.writeHead(200, {'Content-Type':'audio/wav', 'Content-Length':audio.length, 'Cache-Control':'no-store'}).end(audio);
  } catch (error) {
    console.error('Kokoro connection failed:', error);
    response.writeHead(503).end('Kokoro could not deliver the audio. Check the app console for details.');
  }
}

createServer(async (request, response) => {
  if (request.headers.host !== '127.0.0.1:3081') return response.writeHead(404).end();
  if (request.method === 'POST' && request.url === '/models/release') return releaseModels(request, response);
  if (request.method === 'POST' && request.url === '/speech') return speech(request, response);
  if (request.method === 'POST' && request.url === '/chat') return chat(request, response);
  const memberMatch = /^\/members\/(mira|nora|room)$/.exec(request.url);
  if (memberMatch) return memberData(request, response, memberMatch[1]);
  const asset = routes.get(request.url?.split('?')[0]);
  if (!asset || request.method !== 'GET') return response.writeHead(404).end();
  try {
    const bytes = await readFile(new URL(asset[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': asset[1], 'Cache-Control': 'no-store' }).end(bytes);
  } catch {
    response.writeHead(500).end('Local asset could not be read.');
  }
}).listen(3081, '127.0.0.1', () => console.log(address));



