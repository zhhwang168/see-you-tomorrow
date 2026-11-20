import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('website');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.vtt':'text/vtt', '.mp4':'video/mp4', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml', '.ttf':'font/ttf' };
createServer(async (req,res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
    if (!path.startsWith(root+sep)) { res.writeHead(403).end(); return; }
    const info = await stat(path);
    let start=0,end=info.size-1,code=200;
    const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    const headers={'Content-Type':types[extname(path)]||'application/octet-stream','Accept-Ranges':'bytes'};
    if(range){start=Number(range[1]);if(range[2])end=Math.min(end,Number(range[2]));if(start>end){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}code=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;}
    headers['Content-Length']=end-start+1;
    res.writeHead(code,headers);
    if(req.method==='HEAD'){res.end();return;}
    createReadStream(path,{start,end}).pipe(res);
  } catch {res.writeHead(404).end('Not found');}
}).listen(8361,'127.0.0.1',()=>console.log('Showcase preview: http://127.0.0.1:8361/'));
