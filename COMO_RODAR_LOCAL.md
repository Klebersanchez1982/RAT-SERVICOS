# Como Rodar Localmente

## Pré-requisitos

- Node.js 18+ (recomendado 20 LTS)
- npm 9+

## Passo a passo

1. Instale as dependências:

```bash
npm install
```

2. Rode o projeto em desenvolvimento:

```bash
npm run dev
```

3. Acesse no navegador:

```text
http://localhost:8080
```

## Testar no celular (mesma rede Wi-Fi)

1. Deixe o projeto rodando no PC com:

```bash
npm run dev
```

2. Descubra o IPv4 do computador no Windows:

```powershell
ipconfig
```

Use o valor de `Endereço IPv4` da interface Wi-Fi, por exemplo `192.168.0.25`.

3. No celular, abra:

```text
http://SEU_IP:8080
```

Exemplo:

```text
http://192.168.0.25:8080
```

4. Se não abrir, verifique:

- PC e celular na mesma rede.
- Firewall do Windows liberando a porta `8080` para rede privada.
- VPN desligada durante o teste.

## Alternativa (se a URL de rede não aparecer)

Rode explicitamente expondo host IPv4:

```bash
npm run dev -- --host 0.0.0.0 --port 8080
```

## Comandos úteis

```bash
npm run build
npm run preview
npm run test
npm run lint
```

## Credenciais padrão (ambiente local)

- `admin@empresa.com` / `123456`
- `suporte.ti@manutexcnc.com.br` / `123456`
- `sanchez@empresa.com` / `010816`
- `carlos@empresa.com` / `123456`
- `joao@empresa.com` / `123456`

Você também pode usar o identificador curto no campo de e-mail (parte antes de `@`).
Exemplo: `sanchez` com senha `010816`.

## Reset rápido de login (se a senha não entrar)

Se o navegador estiver com dados antigos salvos, limpe as chaves de autenticação no DevTools (Application > Local Storage):

- `rat-users`
- `rat-user-passwords`
- `rat-auth-user`

Depois recarregue a página e tente novamente com as credenciais padrão.

## Observação

A aplicação está configurada para usar dados mockados em `src/lib/api-service.ts`, então não precisa de backend para subir localmente.

## Usar Google Planilhas como base

Para buscar e salvar clientes/equipamentos direto na planilha, configure a URL Web App do Google Apps Script:

1. Crie um arquivo `.env.local` na raiz do projeto.
2. Adicione:

```bash
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID/exec
```

3. Reinicie o `npm run dev`.

Se a URL não estiver definida, ou se a API remota falhar, o sistema volta automaticamente para os dados mock locais.

### Contrato esperado do Apps Script

O frontend envia `POST` para a URL com body JSON:

```json
{ "action": "getClients", "payload": {} }
```

Resposta esperada:

```json
{ "success": true, "data": [] }
```

Em erro:

```json
{ "success": false, "error": "mensagem" }
```

Ações usadas pelo sistema para clientes/equipamentos:

- `getClients`
- `saveClient`
- `updateClient`
- `getEquipments`
- `saveEquipment`
- `updateEquipment`
