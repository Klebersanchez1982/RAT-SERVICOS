-- Script para limpar a base do Supabase e deixar apenas um usuário administrador.
-- Execute no SQL Editor do Supabase ou via CLI.

-- Remover registros dependentes primeiro.
delete from reports;
delete from part_kits;
delete from equipments;
delete from vehicles;
delete from clients;
delete from users;

-- Inserir apenas o usuário Sanchez.
-- Senha padrão: admin123 (armazenada como hash SHA-256).
insert into users (nome, email, perfil, ativo, senha)
values ('Sanchez', 'sanchez@empresa.com', 'admin', true, '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

-- Obs: após rodar, o usuário pode alterar a senha no frontend ou no banco.
