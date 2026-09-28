// Build helper: `node build.js`
//  1. stamps every script/stylesheet URL in index.html with ?v=<version> so browsers never run stale files
//  2. writes dist/scene-compiler.html: the whole app in ONE file (for hosting, sharing, or opening on a phone)
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const d = new Date();
const version = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/(src|href)="((?:js|styles)[^"?]*?\.(?:js|css))(?:\?v=[^"]*)?"/g, `$1="$2?v=${version}"`);
html = html.replace(/<span id="ver">[^<]*<\/span>/, `<span id="ver">v${version}</span>`);
fs.writeFileSync(path.join(ROOT, 'index.html'), html);

// single-file bundle
let single = html
  .replace(/<link rel="stylesheet" href="([^"?]+)(\?v=[^"]*)?" \/>/g, (m, f) => `<style>\n${fs.readFileSync(path.join(ROOT, f), 'utf8')}\n</style>`)
  .replace(/<script src="([^"?]+)(\?v=[^"]*)?"><\/script>/g, (m, f) => `<script>\n${fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/<\/script>/gi, '<\\/script>')}\n</script>`);
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'scene-compiler.html'), single);
// artifact variant: the host supplies <!doctype>/<html>/<head>/<body>, so emit title + styles + body content only
const title = (single.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
const styles = (single.match(/<style>[\s\S]*?<\/style>/g) || []).join('\n');
const body = (single.match(/<body[^>]*>([\s\S]*)<\/body>/) || ['', ''])[1];
fs.writeFileSync(path.join(ROOT, 'dist', 'artifact.html'), `${title}\n${styles}\n${body}`);
console.log(`version v${version} · dist/scene-compiler.html ${(single.length / 1024).toFixed(0)} KB`);
