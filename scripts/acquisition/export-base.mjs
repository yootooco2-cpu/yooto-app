// EXPORT BASE FRAIS pour la dédup du dry-run (lecture seule).
// Usage : node --env-file=.env.local export-base.mjs <sortie.json>
const out = process.argv[2];
const URL_ = process.env.SUPABASE_URL ?? 'https://zdssiposdphjfumsmxaj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY || !out) { console.error('usage: --env-file=.env.local export-base.mjs <sortie.json>'); process.exit(1); }

const rows = [];
for (let from = 0; ; from += 1000) {
  const res = await fetch(`${URL_}/rest/v1/merchants?select=id,name,siret,latitude,longitude,status,city&order=id.asc`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` },
  });
  const batch = await res.json();
  if (!Array.isArray(batch)) { console.error('réponse inattendue', JSON.stringify(batch).slice(0, 200)); process.exit(2); }
  rows.push(...batch);
  if (batch.length < 1000) break;
}
await import('node:fs').then((fs) => fs.writeFileSync(out, JSON.stringify(rows)));
console.log(`base=${rows.length} fiches (tous statuts — la dédup couvre pending aussi)`);
