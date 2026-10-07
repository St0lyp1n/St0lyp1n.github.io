import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';

// Check the generated artifact, including every local link and image.
const root = resolve(process.argv[2] || 'public');
const origin = 'https://st0lyp1n.github.io';
const walk = dir => readdirSync(dir, {withFileTypes:true}).flatMap(x => x.isDirectory() ? walk(join(dir,x.name)) : [join(dir,x.name)]);
const files = walk(root), errors = [], html = files.filter(p=>extname(p)==='.html');
let links = 0;
for (const file of html) {
  const text = readFileSync(file,'utf8');
  const route = '/' + relative(root,file).replaceAll('\\','/').replace(/index\.html$/,'');
  if (!text.includes('lang=zh-CN') && !text.includes('lang="zh-CN"')) errors.push(`${route}: missing language`);
  if (!text.includes('<title>') || !text.includes('<h1')) errors.push(`${route}: missing title or heading`);
  if (text.includes('ZgotmplZ')) errors.push(`${route}: template rejected a URL/style value`);
  for (const match of text.matchAll(/\b(?:href|src)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    const raw = (match[1] ?? match[2] ?? match[3]).replaceAll('&amp;','&');
    if (!raw || /^(data:|mailto:|tel:|javascript:)/i.test(raw)) continue;
    let url; try { url = new URL(raw,origin+route); } catch { errors.push(`${route}: invalid URL ${raw}`); continue; }
    if (url.origin !== origin) continue;
    const pathname = decodeURIComponent(url.pathname);
    const target = join(root,pathname.endsWith('/') ? pathname+'index.html' : pathname);
    links++;
    if (!existsSync(target)) { errors.push(`${route}: missing ${pathname}`); continue; }
    if (url.hash && extname(target)==='.html') {
      const fragment = decodeURIComponent(url.hash.slice(1));
      const targetText = readFileSync(target,'utf8');
      const ids = [...targetText.matchAll(/\bid=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>m[1]??m[2]??m[3]);
      if (!ids.includes(fragment)) errors.push(`${route}: missing anchor ${raw}`);
    }
  }
}
const index = JSON.parse(readFileSync(join(root,'index.json'),'utf8'));
if (!index.some(x=>x.url==='/posts/hello-world/')) errors.push('Original article missing from index');
if (!index.some(x=>x.kind==='notes')) errors.push('Notes missing from index');
for (const item of index) if (!existsSync(join(root,item.url.split('#')[0],'index.html'))) errors.push(`Search result broken: ${item.url}`);
for (const required of ['index.xml','sitemap.xml','robots.txt','404.html','favicon.svg']) if (!existsSync(join(root,required))) errors.push(`Missing ${required}`);
const rss = readFileSync(join(root,'index.xml'),'utf8');
if (rss.includes('example.org') || rss.includes('0001') || rss.includes('localhost')) errors.push('RSS contains placeholder values');
console.log(`Checked ${html.length} HTML pages, ${links} local references, ${index.length} search records.`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('PASS: generated site integrity');
