// Prints the SHA-256 hash of an organiser PIN for adminPinHash in config.js. The PIN itself is never saved.
//   npm run pin
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const pin = (await rl.question('Organiser PIN (4+ digits or characters): ')).trim();
rl.close();
if (pin.length < 4) {
  console.error('Use at least 4 characters.');
  process.exit(1);
}
console.log(`\nadminPinHash: "${createHash('sha256').update(pin).digest('hex')}"`);
console.log('Paste that line into config.js. Keep the PIN itself somewhere safe (not in the repo or the vault).');
