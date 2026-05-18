const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Erro: defina SUPABASE_URL e SUPABASE_KEY (ou VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function batchProcess(batchSize = 500) {
  let updatedTotal = 0;
  // busca equipamentos que possuem codigo_cliente e clienteId é null
  const { data: initial, error: errInit } = await supabase
    .from('equipments')
    .select('id,codigo_equipamento,codigo_cliente')
    .is('clienteId', null)
    .not('codigo_cliente', 'is', null)
    .limit(batchSize);

  if (errInit) throw errInit;
  if (!initial || initial.length === 0) {
    console.log('Nenhum equipamento pendente encontrado.');
    return;
  }

  // agrupa por codigo_cliente
  const codigos = Array.from(new Set(initial.map(e => e.codigo_cliente).filter(Boolean)));

  // busca clientes por codigo
  const { data: clients, error: errClients } = await supabase
    .from('clients')
    .select('id,codigo')
    .in('codigo', codigos);

  if (errClients) throw errClients;

  const mapCodigoToId = new Map((clients || []).map(c => [String(c.codigo), c.id]));

  // prepara updates por lote
  const updates = initial
    .map(e => ({
      id: e.id,
      clienteId: mapCodigoToId.get(String(e.codigo_cliente)) || null,
    }))
    .filter(u => u.clienteId !== null);

  if (updates.length === 0) {
    console.log('Nenhuma correspondência encontrada para o lote atual. Exibindo códigos sem correspondência:');
    const unmatched = codigos.filter(c => !mapCodigoToId.has(String(c)));
    console.log(unmatched.slice(0, 200));
    return;
  }

  // aplica updates em lote usando upsert via RPC (ou update por id em loop se necessário)
  // Supabase permite múltiplas atualizações por id usando .update().match? Simulamos atualizações individuais em série para maior compatibilidade.
  for (const u of updates) {
    const { error } = await supabase
      .from('equipments')
      .update({ clienteId: u.clienteId })
      .eq('id', u.id);
    if (error) console.error('Erro atualizando equipamento id=', u.id, error.message || error);
    else updatedTotal++;
  }

  console.log(`Atualizados no lote: ${updatedTotal}`);

  // se ainda houver mais, executar recursivamente
  if (initial.length === batchSize) {
    return batchProcess(batchSize);
  }
}

(async () => {
  try {
    console.log('Iniciando população de clienteId...');
    await batchProcess(500);
    console.log('Processamento concluído.');
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(1);
  }
})();
