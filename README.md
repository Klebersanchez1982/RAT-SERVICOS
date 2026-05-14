# RAT - Assistência Técnica

Aplicação web para gestão de assistência técnica, construída com React + TypeScript + Vite.
<<<<<<< HEAD

## Requisitos

- Node.js 18+ (recomendado Node.js 20 LTS)
- npm 9+

## Rodar localmente

1. Instale as dependências:

```bash
npm install
```

2. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

3. Abra no navegador:

```text
http://localhost:8080
```

Observação: a porta padrão está definida em `8080` no Vite.

## Scripts úteis

- `npm run dev`: inicia em modo desenvolvimento.
- `npm run build`: gera build de produção em `dist/`.
- `npm run preview`: serve localmente a build de produção.
- `npm run test`: executa os testes com Vitest.
- `npm run lint`: valida código com ESLint.

## Backend - Dados Mockados vs. Google Sheets

A aplicação suporta dois modos de operação:

### 1. Dados Mockados (padrão)
Sem configuração adicional, o projeto roda com dados em memória.



**Fallback automático**: Se a API remota falhar, o sistema volta para dados mockados sem interrupção.

## Deploy no GitHub Pages

Este projeto pode ser publicado como frontend estático no GitHub Pages.

1. Faça o deploy do backend Google Sheets/Apps Script separadamente e copie a URL do Web App.
2. Configure a URL e o CNPJ em **Configurações** dentro do app, ou via `VITE_APPS_SCRIPT_URL` e `VITE_CNPJ` no ambiente de build.
3. O build de produção usa base relativa, então funciona em qualquer nome de repositório no GitHub Pages.
4. Rotas internas da aplicação usam fallback via `public/404.html` para funcionar em navegação direta.

Observação: o GitHub Pages hospeda apenas o frontend. O salvamento real em planilha continua dependendo do Apps Script publicado.
