-- Esquema para Supabase (Postgres) - tabela de clientes
-- Crie este script no SQL Editor do Supabase ou execute via psql.

-- Tabela de clientes
create table if not exists clients (
  id serial primary key,
  codigo text unique,
  razao_social text,
  nome_fantasia text,
  cnpj text,
  endereco text,
  cidade text,
  estado text,
  telefone text,
  email text,
  contato text,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Índices úteis
create index if not exists idx_clients_codigo on clients(codigo);
create index if not exists idx_clients_cnpj on clients(cnpj);

-- Observação: se você preferir usar UUIDs, troque `serial` por `uuid` e gere os IDs no insert.

-- Exemplo de insert manual (caso queira testar):
-- insert into clients (codigo, razao_social, cidade, estado, ativo) values ('100984','WELLINGTON DOS SANTOS VIEIRA','MONTE ALTO','SP', true);

-- Tabela de equipamentos
create table if not exists equipments (
  id serial primary key,
  codigo_equipamento text unique,
  codigo_cliente text,
  cliente_nome text,
  descricao text,
  marca text,
  modelo text,
  numero_serie text,
  localizacao text,
  qr_code text,
  ativo boolean default true,
  created_at timestamptz default now(),
  foreign key (codigo_cliente) references clients(codigo) on delete cascade
);

-- Índices
create index if not exists idx_equipments_codigo_cliente on equipments(codigo_cliente);
create index if not exists idx_equipments_codigo_equipamento on equipments(codigo_equipamento);

-- Exemplo de insert (com JOIN via codigo_cliente):
-- insert into equipments (codigo_equipamento, codigo_cliente, descricao, modelo, numero_serie, ativo)
-- values ('1', '100018', 'GL 280', 'GL 280', '016.015203-465', true);
