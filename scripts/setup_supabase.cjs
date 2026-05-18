const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_KEY = SERVICE_ROLE_KEY || ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Erro: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_SERVICE_ROLE_KEY), ou ao menos VITE_SUPABASE_ANON_KEY no .env.local ou .env');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.warn('Atenção: usando anon key em vez de service role. O import pode falhar se houver RLS ou permissões restritas.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (char === ',' && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    const row = {};
    headers.forEach((header, index) => {
      const value = values[index] ?? '';
      row[header] = value === '' ? null : value;
    });
    return row;
  });
}

async function insertCsv(table, csvPath, uniqueKey) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Arquivo não encontrado: ${csvPath}`);
  }

  const rows = parseCsv(csvPath);
  if (rows.length === 0) {
    console.log(`Nenhum registro encontrado em ${csvPath}`);
    return;
  }

  console.log(`Importando ${rows.length} registros em ${table}...`);
  const chunkSize = 200;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: uniqueKey });
    if (error) {
      console.error(`Erro importando lote em ${table}:`, error.message || error);
      process.exit(1);
    }
    console.log(`  Lote ${Math.floor(offset / chunkSize) + 1} importado (${chunk.length} registros)`);
  }
}

async function verifyTables() {
  const tables = ['clients', 'equipments'];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.error(`Tabela ausente ou inacessível: ${table}`);
      return false;
    }
  }
  return true;
}

(async () => {
  try {
    console.log('Verificando tabelas no Supabase...');
    const tablesReady = await verifyTables();
    if (!tablesReady) {
      console.error('As tabelas `clients` e/ou `equipments` não existem ou não estão acessíveis. Execute `sql/supabase-schema.sql` no editor do Supabase primeiro.');
      process.exit(1);
    }

    await insertCsv('clients', path.resolve(process.cwd(), 'data', 'clients_full_import.csv'), 'codigo');
    await insertCsv('equipments', path.resolve(process.cwd(), 'data', 'equipments_full_import.csv'), 'codigo_equipamento');

    console.log('Importação concluída. Agora execute sql/resolve_clienteId.sql no Supabase para popular clienteId.');
  } catch (err) {
    console.error('Erro durante o setup Supabase:', err.message || err);
    process.exit(1);
  }
})();
