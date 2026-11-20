import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('./website/', import.meta.url);
const vtt = await readFile(new URL('assets/showcase.en.vtt', root), 'utf8');
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const transcript = vtt.trim().split(/\r?\n\r?\n/).filter(block => block.includes('-->')).map(block => {
  const lines = block.split(/\r?\n/); const timing = lines.findIndex(line => line.includes('-->'));
  return lines.slice(timing + 1).join(' ');
}).join(' ');
const page = await readFile(new URL('index.html', root), 'utf8');
await writeFile(new URL('index.html', root), page.replace(/<div id="spoken-transcript">[\s\S]*?<\/div>/, `<div id="spoken-transcript"><p>${escape(transcript)}</p><p><a href="assets/showcase.mp4" download>Download the showcase MP4</a> · <a href="assets/showcase.en.vtt" download>Download English captions</a></p></div>`));
console.log('Embedded the recorded dialogue transcript.');
