const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Credenciais Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  try {
    console.log('Testando SELECT em `clients`...');
    const { data: cdata, error: cerr } = await supabase.from('clients').select('id').limit(1);
    console.log('clients:', cerr ? ('ERRO: ' + cerr.message) : `OK (${cdata ? cdata.length : 0} rows)`);

    console.log('Testando SELECT em `equipments`...');
    const { data: edata, error: eerr } = await supabase.from('equipments').select('id').limit(1);
    console.log('equipments:', eerr ? ('ERRO: ' + eerr.message) : `OK (${edata ? edata.length : 0} rows)`);
  } catch (err) {
    console.error('Erro inesperado:', err.message || err);
    process.exit(1);
  }
})();
