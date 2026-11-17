// Lists your MailerLite groups and subscriber fields, so you can set MAILERLITE_GROUP_ID (Script properties)
// and check ML_FIELDS in apps-script/apps-script.gs. Read-only: it changes nothing in MailerLite.
//
// Put your key in .env as MAILERLITE_API_TOKEN=... (copy .env.example), then run:  npm run mailerlite
// The key is read from .env on this computer only; it is never printed.
import { readFileSync } from 'node:fs';

const key = process.env.MAILERLITE_API_TOKEN || process.env.API_KEY;
if (!key) {
  console.error('No key found. Add MAILERLITE_API_TOKEN=your-key to .env (copy .env.example first).');
  process.exit(1);
}

async function get(path) {
  const res = await fetch(`https://connect.mailerlite.com/api${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (res.status === 401) throw new Error('MailerLite says the key is not valid (401). Check MAILERLITE_API_TOKEN in .env.');
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()).data || [];
}

try {
  const groups = await get('/groups?limit=100');
  console.log('\nGroups (put the id of the newsletter group in Script properties as MAILERLITE_GROUP_ID):');
  for (const g of groups) console.log(`  ${String(g.id).padEnd(22)} ${g.name}  (${g.active_count ?? '?'} active)`);

  const fields = await get('/fields?limit=100');
  console.log('\nSubscriber fields (the "key" column is what ML_FIELDS in apps-script.gs must use):');
  console.log(`  ${'key'.padEnd(22)} ${'type'.padEnd(8)} name`);
  for (const f of fields) console.log(`  ${String(f.key).padEnd(22)} ${String(f.type).padEnd(8)} ${f.name}`);

  // The keys apps-script.gs uses, read from its ML_FIELDS block so this check never goes stale
  const gs = readFileSync(new URL('../apps-script/apps-script.gs', import.meta.url), 'utf8');
  const block = (gs.match(/const ML_FIELDS = \{([\s\S]*?)\};/) || [])[1] || '';
  const wanted = [...block.matchAll(/:\s*'([^']*)'/g)].map((m) => m[1]).filter(Boolean);
  const have = new Set(fields.map((f) => f.key));
  const missing = wanted.filter((k) => !have.has(k));
  console.log(
    missing.length
      ? `\nNot found in your account: ${missing.join(', ')}. Change ML_FIELDS to the right keys, or set them to ''.`
      : '\nAll field keys used by ML_FIELDS exist.'
  );
} catch (err) {
  console.error(String(err.message || err));
  process.exit(1);
}
