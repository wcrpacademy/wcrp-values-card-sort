// Writes the QR codes from config.js into qr/ (Node 24, tooling only).
//
//   npm run qr                              → qr/online.svg + qr/online.png   for https://<onlineHost>/
//   npm run qr -- --offline 192.168.8.10:8000  → qr/offline.svg + qr/offline.png for http://192.168.8.10:8000/
//
// The SVGs are used by live.html (corner of the projector screen); the PNGs are for slides and printed cards.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import QRCode from 'qrcode';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} };
vm.runInNewContext(readFileSync(join(ROOT, 'config.js'), 'utf8'), ctx);
const cfg = ctx.window.CARD_SORT_CONFIG;

const args = process.argv.slice(2);
const offlineAt = args.indexOf('--offline');
const jobs = [];
if (offlineAt >= 0) {
  const host = args[offlineAt + 1];
  if (!host || !/^[\w.-]+(:\d+)?$/.test(host)) {
    console.error('Usage: npm run qr -- --offline <laptop-ip[:port]>   e.g. 192.168.8.10:8000');
    process.exit(1);
  }
  jobs.push(['offline', `http://${host}/`]);
} else {
  if (!cfg.onlineHost) {
    console.error('config.js has no onlineHost.');
    process.exit(1);
  }
  jobs.push(['online', `https://${cfg.onlineHost}/`]);
}

const style = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#232C3D', light: '#FFFFFF' } };
mkdirSync(join(ROOT, 'qr'), { recursive: true });
for (const [name, url] of jobs) {
  writeFileSync(join(ROOT, 'qr', `${name}.svg`), await QRCode.toString(url, { ...style, type: 'svg' }));
  await QRCode.toFile(join(ROOT, 'qr', `${name}.png`), url, { ...style, width: 1200 });
  console.log(`qr/${name}.svg and qr/${name}.png → ${url}`);
}
