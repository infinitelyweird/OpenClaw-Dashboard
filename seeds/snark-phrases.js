require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { sql, getPool } = require(path.join(__dirname, '..', 'db'));

async function seedPhrases() {
  const pool = await getPool();
  const existing = await pool.request().query('SELECT COUNT(*) AS cnt FROM SnarkPhrases');
  if (existing.recordset[0].cnt > 0) {
    console.log(`Already have ${existing.recordset[0].cnt} phrases. Skipping.`);
    process.exit(0);
  }

  // Load all batch files
  const batchDir = __dirname;
  const batches = ['snark-batch-1.json', 'snark-batch-2.json', 'snark-batch-3.json', 'snark-batch-4.json'];
  let phrases = [];
  
  for (const file of batches) {
    const filePath = path.join(batchDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing batch file: ${file}`);
      process.exit(1);
    }
    const batch = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    phrases = phrases.concat(batch);
    console.log(`Loaded ${batch.length} phrases from ${file}`);
  }

  console.log(`Total phrases: ${phrases.length}`);

  // Deduplicate by phrase text
  const seen = new Set();
  phrases = phrases.filter(p => {
    const key = p.phrase.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`After dedup: ${phrases.length}`);

  // Batch insert 100 at a time
  for (let i = 0; i < phrases.length; i += 100) {
    const batch = phrases.slice(i, i + 100);
    const values = batch.map((_, idx) => `(@p${i + idx}, @c${i + idx})`).join(',');
    const request = pool.request();
    batch.forEach((p, idx) => {
      request.input(`p${i + idx}`, sql.NVarChar(300), p.phrase);
      request.input(`c${i + idx}`, sql.NVarChar(50), p.category);
    });
    await request.query(`INSERT INTO SnarkPhrases (Phrase, Category) VALUES ${values}`);
    console.log(`Inserted ${Math.min(i + 100, phrases.length)} / ${phrases.length}`);
  }

  console.log('All snark phrases seeded!');
  process.exit(0);
}

seedPhrases().catch(err => { console.error(err); process.exit(1); });
