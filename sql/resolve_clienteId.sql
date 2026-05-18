-- SQL para validar e popular equipments.clienteId a partir de clients.id
-- 1) Lista equipamentos sem correspondência (ajuste conforme necessário)
SELECT e.id, e.codigo_equipamento, e.codigo_cliente, e.cliente_nome
FROM equipments e
LEFT JOIN clients c ON e.codigo_cliente = c.codigo
WHERE c.id IS NULL
LIMIT 200;

-- 2) Atualiza clienteId usando o código original (executar apenas após verificar resultados acima)
BEGIN;
UPDATE equipments e
SET clienteId = c.id
FROM clients c
WHERE e.codigo_cliente = c.codigo;
COMMIT;

-- 3) Verificação rápida: quantos equipamentos agora têm clienteId preenchido
SELECT count(*) AS total_com_clienteId FROM equipments WHERE clienteId IS NOT NULL;

-- 4) Opcional: listar códigos em equipments que não possuem cliente correspondente
SELECT DISTINCT e.codigo_cliente
FROM equipments e
LEFT JOIN clients c ON e.codigo_cliente = c.codigo
WHERE c.id IS NULL
LIMIT 200;
