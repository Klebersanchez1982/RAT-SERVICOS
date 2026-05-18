
create table if not exists clients (
  id serial primary key,
  codigo text unique not null,
  razao_social text not null,
  nome_fantasia text,
  razaoSocial text,
  nomeFantasia text,
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

-- Para o cadastro de clientes, o import mínimo usa apenas estas colunas:
-- codigo, razao_social, cidade, estado
-- Exemplo de CSV válido:
-- codigo,razao_social,cidade,estado
-- 100984,"WELLINGTON DOS SANTOS VIEIRA",MONTE ALTO,SP

-- Índices úteis
create index if not exists idx_clients_codigo on clients(codigo);
create index if not exists idx_clients_cnpj on clients(cnpj);
create index if not exists idx_clients_nomeFantasia on clients(nome_fantasia);

-- Observação: se você preferir usar UUIDs, troque `serial` por `uuid` e gere os IDs no insert.

-- Tabela de equipamentos
create table if not exists equipments (
  id serial primary key,
  codigo_equipamento text unique not null,
  codigo_cliente text not null,
  cliente_nome text not null,
  clienteId integer,
  clienteNome text,
  descricao text,
  marca text,
  modelo text,
  numero_serie text,
  numeroSerie text,
  localizacao text,
  qr_code text,
  qrCode text,
  ativo boolean default true,
  created_at timestamptz default now(),
  foreign key (codigo_cliente) references clients(codigo) on delete cascade
);

-- Para o cadastro de equipamentos, o import mínimo usa apenas estas colunas:
-- codigo_equipamento, codigo_cliente, cliente_nome, marca, modelo, numero_serie
-- Exemplo de CSV válido:
-- codigo_equipamento,codigo_cliente,cliente_nome,marca,modelo,numero_serie
-- 1,100018,"TOTAL HEALTH DO BRASIL EIRELI",ROMI,"GL 280","016.015203-465"

-- Índices
create index if not exists idx_equipments_codigo_cliente on equipments(codigo_cliente);
create index if not exists idx_equipments_codigo_equipamento on equipments(codigo_equipamento);
create index if not exists idx_equipments_numeroSerie on equipments(numero_serie);

-- Tabela de usuários
create table if not exists users (
  id serial primary key,
  nome text not null,
  email text unique not null,
  perfil text not null,
  ativo boolean default true,
  senha text not null,
  created_at timestamptz default now()
);

-- A coluna `senha` armazena o hash SHA-256 da senha fornecida pelo usuário.
create index if not exists idx_users_email on users(email);

-- Tabela de veículos
create table if not exists vehicles (
  id serial primary key,
  descricao text not null,
  placa text unique not null,
  modelo text,
  ano text,
  ativo boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_vehicles_placa on vehicles(placa);

-- Tabela de kits de peças
create table if not exists part_kits (
  id serial primary key,
  nome text not null,
  descricao text,
  tecnicoId integer,
  tecnicoNome text,
  pecas jsonb default '[]'::jsonb,
  ativo boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_part_kits_tecnicoId on part_kits(tecnicoId);

-- Tabela de relatórios
create table if not exists reports (
  id serial primary key,
  numero text unique not null,
  data_abertura text,
  hora_abertura text,
  tecnicoId integer,
  tecnicoNome text,
  tipo_manutencao text,
  clienteId integer,
  clienteNome text,
  equipamentoId integer,
  equipamentoDescricao text,
  numeroSerie text,
  problemaRelatado text,
  diagnostico text,
  servicoExecutado text,
  pecas jsonb default '[]'::jsonb,
  informacoesAdicionais text,
  horasTrabalho numeric,
  deslocamentoIda text,
  deslocamentoVolta text,
  checklistModelo text,
  checklistStatus text,
  checklistRespostas jsonb default '[]'::jsonb,
  checklistObservacoesGerais text,
  checklistCorretivas jsonb default '[]'::jsonb,
  checklistLinkExterno text,
  checklistArquivoNome text,
  checklistArquivoUrl text,
  checklistCapaNome text,
  checklistCapaUrl text,
  veiculoId integer,
  veiculoDescricao text,
  placa text,
  pedagio numeric,
  refeicao numeric,
  estadia numeric,
  atendimentos jsonb default '[]'::jsonb,
  status text,
  fotos jsonb default '[]'::jsonb,
  criadoPor text,
  editadoPor text,
  dataFinalizacao text,
  created_at timestamptz default now(),
  foreign key (clienteId) references clients(id) on delete set null,
  foreign key (equipamentoId) references equipments(id) on delete set null,
  foreign key (tecnicoId) references users(id) on delete set null,
  foreign key (veiculoId) references vehicles(id) on delete set null
);

create index if not exists idx_reports_numero on reports(numero);
create index if not exists idx_reports_clienteNome on reports(clienteNome);
create index if not exists idx_reports_numeroSerie on reports(numeroSerie);
create index if not exists idx_reports_status on reports(status);

-- Exemplo de insert manual para clientes (usando o código original):
-- insert into clients (codigo, razao_social, nome_fantasia, cidade, estado, ativo) values ('100984','WELLINGTON DOS SANTOS VIEIRA', '', 'MONTE ALTO','SP', true);

-- Exemplo de insert manual para equipamentos (usando codigo_cliente):
-- insert into equipments (codigo_equipamento, codigo_cliente, cliente_nome, descricao, marca, modelo, numero_serie, localizacao, qr_code, ativo)
-- values ('1', '100018', 'TOTAL HEALTH DO BRASIL EIRELI', 'GL 280', 'ROMI', 'GL 280', '016.015203-465', '', 'EQ-001', true);
