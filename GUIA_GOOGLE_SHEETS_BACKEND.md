# Configuração de Backend com Google Sheets

## Visão Geral

Este guia mostra como integrar o RAT App com Google Sheets via Google Apps Script, servindo como backend com suporte a múltiplas empresas (isolamento por CNPJ).

## Prerequisitos

- Conta Google
- Permissão para criar Google Sheets
- Permissão para criar Google Apps Script

## 1. Estrutura no Google Sheets

Crie um Google Sheet com as seguintes abas:

### Aba 1: `config`
| cnpj | empresa | ativo | url_apps_script |
|------|---------|-------|-----------------|
| 12.345.678/0001-90 | ABC Máquinas | TRUE | (preenchido depois) |

### Aba 2: `usuarios`
| cnpj | id | nome | email | senha_hash | perfil | ativo |
|------|----|----|--------|-----------|--------|-------|
| 12.345.678/0001-90 | 1 | Admin | admin@empresa.com | hash | admin | TRUE |

### Aba 3: `clientes`
| cnpj | id | razao_social | nome_fantasia | cnpj_cliente | endereco | cidade | estado | telefone | email | contato | ativo |
|------|----|----|--------|-----------|--------|--------|-------|---------|-------|--------|---------|

### Aba 4: `equipamentos`
| cnpj | id | cliente_id | descricao | marca | modelo | numero_serie | localizacao | qr_code | ativo |
|------|----|----|--------|-----------|--------|--------|--------|--------|--------|

### Aba 5: `relatorios`
| cnpj | id | numero | data_abertura | hora_abertura | tecnico_id | cliente_id | equipamento_id | tipo_manutencao | problema | diagnostico | servico | status | data_finalizacao | criado_por |
|------|----|----|--------|-----------|--------|--------|--------|--------|--------|--------|---------|--------|--------|--------|

### Aba 6: `veiculos`
| cnpj | id | descricao | placa | modelo | ano | ativo |
|------|----|----|--------|-----------|--------|--------|

## 2. Google Apps Script

### Passo a Passo

1. No seu Google Sheet, vá a **Extensões > Apps Script**.
2. Cole o código abaixo no editor.
3. Clique em **Deploy > Novo deployment > Web app**.
4. Configure como:
   - Execute como: Sua conta Google
   - Quem tem acesso: Qualquer pessoa
5. Copie a URL gerada.
6. Preencha na aba `config` coluna `url_apps_script`.

### Código do Apps Script

```javascript
/**************************************
 * RAT - Backend Google Sheets + Drive
 * Compatível com:
 * - getClients / saveClient / updateClient
 * - getEquipments / saveEquipment / updateEquipment
 * - getReportPhotos / uploadPhoto / deletePhoto
 * Também aceita aliases:
 * - getClientes, getEquipamentos, etc.
 **************************************/

// ========= CONFIG =========
const SPREADSHEET_ID = 'SEU_SHEET_ID_AQUI';

const SHEET_NAMES = {
  config: 'config',
  clientes: 'clientes',
  equipamentos: 'equipamentos',
  fotos: 'fotos',
  usuarios: 'usuarios',
  relatorios: 'relatorios',
};

const DRIVE_ROOT_FOLDER = 'RAT-FOTOS';

// ========= ENTRYPOINTS =========
function doGet() {
  return sendResponse(true, { status: 'ok', service: 'RAT Apps Script' }, null);
}

function doPost(e) {
  try {
    const body = parseRequestBody(e);
    const action = String(body.action || '').trim();
    const payload = body.payload || {};
    const cnpj = String(body.cnpj || '').trim();

    if (!cnpj) {
      return sendResponse(false, null, 'CNPJ e obrigatorio');
    }

    if (!isCompanyActive(cnpj)) {
      return sendResponse(false, null, 'Empresa nao encontrada ou inativa');
    }

    switch (action) {
      case 'getClients':
      case 'getClientes':
        return handleGetClients(cnpj);
      case 'saveClient':
      case 'saveCliente':
        return handleSaveClient(cnpj, payload);
      case 'updateClient':
      case 'updateCliente':
        return handleUpdateClient(cnpj, payload);
      case 'getEquipments':
      case 'getEquipamentos':
        return handleGetEquipments(cnpj, payload);
      case 'saveEquipment':
      case 'saveEquipamento':
        return handleSaveEquipment(cnpj, payload);
      case 'updateEquipment':
      case 'updateEquipamento':
        return handleUpdateEquipment(cnpj, payload);
      case 'getReportPhotos':
        return handleGetReportPhotos(cnpj, payload);
      case 'uploadPhoto':
        return handleUploadPhoto(cnpj, payload);
      case 'deletePhoto':
        return handleDeletePhoto(cnpj, payload);
      case 'getUsers':
      case 'getUsuarios':
        return handleGetUsers(cnpj);
      case 'saveUser':
      case 'saveUsuario':
        return handleSaveUser(cnpj, payload);
      case 'updateUser':
      case 'updateUsuario':
        return handleUpdateUser(cnpj, payload);
      case 'setUserBlocked':
      case 'bloquearUsuario':
        return handleSetUserBlocked(cnpj, payload);
      default:
        return sendResponse(false, null, 'Acao nao reconhecida: ' + action);
    }
  } catch (err) {
    return sendResponse(false, null, 'Erro: ' + stringifyError(err));
  }
}

// ========= HELPERS GERAIS =========
function sendResponse(success, data, error) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: success, data: data, error: error }))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function stringifyError(err) {
  if (!err) return 'Erro desconhecido';
  return err.message ? err.message : String(err);
}

function openSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(sheetName) {
  return openSpreadsheet().getSheetByName(sheetName);
}

function ensureSheet(sheetName) {
  const ss = openSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function getHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });
}

function getSheetRowsAsObjects(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const headers = getHeaders(sheet);
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return values.map(function (row) {
    const obj = {};
    headers.forEach(function (header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}

function appendObjectByHeaders(sheetName, obj) {
  const sheet = ensureSheet(sheetName);
  const headers = getHeaders(sheet);

  if (!headers.length) {
    throw new Error('Aba sem cabecalho: ' + sheetName);
  }

  const row = headers.map(function (h) {
    return obj[h] !== undefined ? obj[h] : '';
  });

  sheet.appendRow(row);
}

function toBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'sim', 's', 'ativo'].indexOf(v) >= 0) return true;
    if (['false', '0', 'nao', 'não', 'n', 'inativo'].indexOf(v) >= 0) return false;
  }
  return fallback;
}

function nextNumericId(sheetName) {
  const rows = getSheetRowsAsObjects(sheetName);
  let max = 0;
  rows.forEach(function (r) {
    const n = parseInt(r.id, 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return max + 1;
}

function isCompanyActive(cnpj) {
  const configRows = getSheetRowsAsObjects(SHEET_NAMES.config);
  const row = configRows.find(function (r) {
    return String(r.cnpj) === String(cnpj);
  });
  if (!row) return false;
  return toBoolean(row.ativo, false);
}

function findRowIndexByCnpjAndId(sheetName, cnpj, idValue) {
  const sheet = getSheet(sheetName);
  if (!sheet) return -1;

  const headers = getHeaders(sheet);
  const cnpjCol = headers.indexOf('cnpj') + 1;
  const idCol = headers.indexOf('id') + 1;
  if (cnpjCol < 1 || idCol < 1) return -1;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const cnpjValues = sheet.getRange(2, cnpjCol, lastRow - 1, 1).getValues();
  const idValues = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();

  for (var i = 0; i < cnpjValues.length; i++) {
    if (String(cnpjValues[i][0]) === String(cnpj) && String(idValues[i][0]) === String(idValue)) {
      return i + 2;
    }
  }

  return -1;
}

function updateRowByHeaders(sheetName, rowIndex, patchObject) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheet);

  headers.forEach(function (header, idx) {
    if (Object.prototype.hasOwnProperty.call(patchObject, header)) {
      sheet.getRange(rowIndex, idx + 1).setValue(patchObject[header]);
    }
  });
}

// ========= CLIENTES =========
function handleGetClients(cnpj) {
  const rows = getSheetRowsAsObjects(SHEET_NAMES.clientes)
    .filter(function (r) { return String(r.cnpj) === String(cnpj); })
    .map(function (r) {
      return {
        id: r.id,
        razaoSocial: r.razao_social || r.razaoSocial || '',
        nomeFantasia: r.nome_fantasia || r.nomeFantasia || '',
        cnpj: r.cnpj_cliente || r.cnpj || '',
        endereco: r.endereco || '',
        cidade: r.cidade || '',
        estado: r.estado || '',
        telefone: r.telefone || '',
        email: r.email || '',
        contato: r.contato || '',
        ativo: toBoolean(r.ativo, true),
      };
    });

  return sendResponse(true, rows, null);
}

function handleSaveClient(cnpj, payload) {
  const id = nextNumericId(SHEET_NAMES.clientes);

  const rowObj = {
    cnpj: cnpj,
    id: id,
    razao_social: payload.razaoSocial || payload.nomeFantasia || '',
    nome_fantasia: payload.nomeFantasia || payload.razaoSocial || '',
    cnpj_cliente: payload.cnpj || '',
    endereco: payload.endereco || '',
    cidade: payload.cidade || '',
    estado: payload.estado || '',
    telefone: payload.telefone || '',
    email: payload.email || '',
    contato: payload.contato || '',
    ativo: toBoolean(payload.ativo, true) ? 'TRUE' : 'FALSE',
  };

  appendObjectByHeaders(SHEET_NAMES.clientes, rowObj);

  return sendResponse(true, {
    id: String(id),
    razaoSocial: rowObj.razao_social,
    nomeFantasia: rowObj.nome_fantasia,
    cnpj: rowObj.cnpj_cliente,
    endereco: rowObj.endereco,
    cidade: rowObj.cidade,
    estado: rowObj.estado,
    telefone: rowObj.telefone,
    email: rowObj.email,
    contato: rowObj.contato,
    ativo: toBoolean(rowObj.ativo, true),
  }, null);
}

function handleUpdateClient(cnpj, payload) {
  const clientId = payload.clientId;
  const updates = payload.updates || {};

  if (!clientId) return sendResponse(false, null, 'clientId obrigatorio');

  const rowIndex = findRowIndexByCnpjAndId(SHEET_NAMES.clientes, cnpj, clientId);
  if (rowIndex < 0) return sendResponse(false, null, 'Cliente nao encontrado');

  const patch = {};
  if (updates.razaoSocial !== undefined) patch.razao_social = updates.razaoSocial;
  if (updates.nomeFantasia !== undefined) patch.nome_fantasia = updates.nomeFantasia;
  if (updates.cnpj !== undefined) patch.cnpj_cliente = updates.cnpj;
  if (updates.endereco !== undefined) patch.endereco = updates.endereco;
  if (updates.cidade !== undefined) patch.cidade = updates.cidade;
  if (updates.estado !== undefined) patch.estado = updates.estado;
  if (updates.telefone !== undefined) patch.telefone = updates.telefone;
  if (updates.email !== undefined) patch.email = updates.email;
  if (updates.contato !== undefined) patch.contato = updates.contato;
  if (updates.ativo !== undefined) patch.ativo = toBoolean(updates.ativo, true) ? 'TRUE' : 'FALSE';

  updateRowByHeaders(SHEET_NAMES.clientes, rowIndex, patch);

  const all = getSheetRowsAsObjects(SHEET_NAMES.clientes);
  const updated = all.find(function (r) {
    return String(r.cnpj) === String(cnpj) && String(r.id) === String(clientId);
  });

  return sendResponse(true, {
    id: String(updated.id),
    razaoSocial: updated.razao_social || '',
    nomeFantasia: updated.nome_fantasia || '',
    cnpj: updated.cnpj_cliente || '',
    endereco: updated.endereco || '',
    cidade: updated.cidade || '',
    estado: updated.estado || '',
    telefone: updated.telefone || '',
    email: updated.email || '',
    contato: updated.contato || '',
    ativo: toBoolean(updated.ativo, true),
  }, null);
}

// ========= EQUIPAMENTOS =========
function handleGetEquipments(cnpj, payload) {
  const clienteId = payload && payload.clienteId ? String(payload.clienteId) : '';

  let rows = getSheetRowsAsObjects(SHEET_NAMES.equipamentos)
    .filter(function (r) { return String(r.cnpj) === String(cnpj); });

  if (clienteId) {
    rows = rows.filter(function (r) {
      return String(r.cliente_id) === clienteId;
    });
  }

  const mapped = rows.map(function (r) {
    return {
      id: r.id,
      clienteId: String(r.cliente_id || ''),
      clienteNome: r.cliente_nome || '',
      descricao: r.descricao || '',
      marca: r.marca || '',
      modelo: r.modelo || '',
      numeroSerie: r.numero_serie || '',
      localizacao: r.localizacao || '',
      qrCode: r.qr_code || ('EQ-' + String(r.id).padStart(3, '0')),
      ativo: toBoolean(r.ativo, true),
    };
  });

  return sendResponse(true, mapped, null);
}

function handleSaveEquipment(cnpj, payload) {
  const id = nextNumericId(SHEET_NAMES.equipamentos);

  const rowObj = {
    cnpj: cnpj,
    id: id,
    cliente_id: payload.clienteId || '',
    cliente_nome: payload.clienteNome || '',
    descricao: payload.descricao || '',
    marca: payload.marca || '',
    modelo: payload.modelo || '',
    numero_serie: payload.numeroSerie || '',
    localizacao: payload.localizacao || '',
    qr_code: payload.qrCode || ('EQ-' + String(id).padStart(3, '0')),
    ativo: toBoolean(payload.ativo, true) ? 'TRUE' : 'FALSE',
  };

  appendObjectByHeaders(SHEET_NAMES.equipamentos, rowObj);

  return sendResponse(true, {
    id: String(id),
    clienteId: String(rowObj.cliente_id),
    clienteNome: rowObj.cliente_nome,
    descricao: rowObj.descricao,
    marca: rowObj.marca,
    modelo: rowObj.modelo,
    numeroSerie: rowObj.numero_serie,
    localizacao: rowObj.localizacao,
    qrCode: rowObj.qr_code,
    ativo: toBoolean(rowObj.ativo, true),
  }, null);
}

function handleUpdateEquipment(cnpj, payload) {
  const equipmentId = payload.equipmentId;
  const updates = payload.updates || {};

  if (!equipmentId) return sendResponse(false, null, 'equipmentId obrigatorio');

  const rowIndex = findRowIndexByCnpjAndId(SHEET_NAMES.equipamentos, cnpj, equipmentId);
  if (rowIndex < 0) return sendResponse(false, null, 'Equipamento nao encontrado');

  const patch = {};
  if (updates.clienteId !== undefined) patch.cliente_id = updates.clienteId;
  if (updates.clienteNome !== undefined) patch.cliente_nome = updates.clienteNome;
  if (updates.descricao !== undefined) patch.descricao = updates.descricao;
  if (updates.marca !== undefined) patch.marca = updates.marca;
  if (updates.modelo !== undefined) patch.modelo = updates.modelo;
  if (updates.numeroSerie !== undefined) patch.numero_serie = updates.numeroSerie;
  if (updates.localizacao !== undefined) patch.localizacao = updates.localizacao;
  if (updates.qrCode !== undefined) patch.qr_code = updates.qrCode;
  if (updates.ativo !== undefined) patch.ativo = toBoolean(updates.ativo, true) ? 'TRUE' : 'FALSE';

  updateRowByHeaders(SHEET_NAMES.equipamentos, rowIndex, patch);

  const all = getSheetRowsAsObjects(SHEET_NAMES.equipamentos);
  const updated = all.find(function (r) {
    return String(r.cnpj) === String(cnpj) && String(r.id) === String(equipmentId);
  });

  return sendResponse(true, {
    id: String(updated.id),
    clienteId: String(updated.cliente_id || ''),
    clienteNome: updated.cliente_nome || '',
    descricao: updated.descricao || '',
    marca: updated.marca || '',
    modelo: updated.modelo || '',
    numeroSerie: updated.numero_serie || '',
    localizacao: updated.localizacao || '',
    qrCode: updated.qr_code || ('EQ-' + String(updated.id).padStart(3, '0')),
    ativo: toBoolean(updated.ativo, true),
  }, null);
}

// ========= FOTOS =========
function handleGetReportPhotos(cnpj, payload) {
  const reportId = String((payload && payload.reportId) || '').trim();
  if (!reportId) return sendResponse(false, null, 'reportId obrigatorio');

  const rows = getSheetRowsAsObjects(SHEET_NAMES.fotos)
    .filter(function (r) {
      return String(r.cnpj) === String(cnpj) && String(r.relatorio_id) === String(reportId);
    })
    .map(function (r) {
      return {
        id: String(r.id),
        relatorioId: String(r.relatorio_id),
        categoria: String(r.categoria || 'durante'),
        descricao: String(r.descricao || ''),
        driveFileId: String(r.drive_file_id || ''),
        url: String(r.url || ''),
        criadoEm: String(r.criado_em || ''),
      };
    });

  return sendResponse(true, rows, null);
}

function handleUploadPhoto(cnpj, payload) {
  const reportId = String((payload && payload.reportId) || '').trim();
  const categoria = String((payload && payload.categoria) || 'durante');
  const descricao = String((payload && payload.descricao) || '');
  const mimeType = String((payload && payload.mimeType) || 'image/jpeg');
  const imageBase64Raw = String((payload && payload.imageBase64) || '').trim();

  if (!reportId) return sendResponse(false, null, 'reportId obrigatorio');
  if (!imageBase64Raw) return sendResponse(false, null, 'imageBase64 obrigatorio');

  const imageBase64 = extractBase64Payload(imageBase64Raw);
  const bytes = Utilities.base64Decode(imageBase64);

  const ext = extensionFromMimeType(mimeType);
  const fileName = 'foto_' + new Date().getTime() + '.' + ext;

  const reportFolder = getOrCreateReportFolder(cnpj, reportId);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = reportFolder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  const publicUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;

  const photoId = nextNumericId(SHEET_NAMES.fotos);
  const createdAt = new Date().toISOString();

  appendObjectByHeaders(SHEET_NAMES.fotos, {
    cnpj: cnpj,
    id: photoId,
    relatorio_id: reportId,
    categoria: categoria,
    descricao: descricao,
    drive_file_id: fileId,
    url: publicUrl,
    criado_em: createdAt,
  });

  return sendResponse(true, {
    id: String(photoId),
    relatorioId: String(reportId),
    categoria: categoria,
    descricao: descricao,
    driveFileId: fileId,
    url: publicUrl,
    criadoEm: createdAt,
  }, null);
}

function handleDeletePhoto(cnpj, payload) {
  const photoId = String((payload && payload.photoId) || '').trim();
  const reportId = String((payload && payload.reportId) || '').trim();
  const driveFileIdFromPayload = String((payload && (payload.driveFileId || payload.drive_file_id)) || '').trim();

  if (!photoId) return sendResponse(false, null, 'photoId obrigatorio');

  const sheet = getSheet(SHEET_NAMES.fotos);
  if (!sheet) return sendResponse(true, null, null);

  const headers = getHeaders(sheet);
  const cnpjCol = headers.indexOf('cnpj') + 1;
  const idCol = headers.indexOf('id') + 1;
  const reportCol = headers.indexOf('relatorio_id') + 1;
  const driveCol = headers.indexOf('drive_file_id') + 1;

  if (cnpjCol < 1 || idCol < 1) {
    return sendResponse(false, null, 'Cabecalho invalido na aba fotos');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return sendResponse(true, null, null);

  let foundRow = -1;
  let driveFileId = driveFileIdFromPayload;

  for (var row = 2; row <= lastRow; row++) {
    const rowCnpj = String(sheet.getRange(row, cnpjCol).getValue());
    const rowId = String(sheet.getRange(row, idCol).getValue());

    if (rowCnpj !== cnpj || rowId !== photoId) continue;

    if (reportId && reportCol > 0) {
      const rowReportId = String(sheet.getRange(row, reportCol).getValue());
      if (rowReportId !== reportId) continue;
    }

    foundRow = row;
    if (!driveFileId && driveCol > 0) {
      driveFileId = String(sheet.getRange(row, driveCol).getValue() || '');
    }
    break;
  }

  if (foundRow < 0) {
    return sendResponse(false, null, 'Foto nao encontrada');
  }

  if (driveFileId) {
    try {
      DriveApp.getFileById(driveFileId).setTrashed(true);
    } catch (err) {
      // Se o arquivo ja foi removido/manualmente, segue o fluxo.
    }
  }

  sheet.deleteRow(foundRow);
  return sendResponse(true, null, null);
}

// ========= USUARIOS =========
function handleGetUsers(cnpj) {
  const rows = getSheetRowsAsObjects(SHEET_NAMES.usuarios)
    .filter(function (r) {
      return String(r.cnpj) === String(cnpj);
    })
    .map(function (r) {
      return {
        id: String(r.id),
        nome: String(r.nome || ''),
        email: String(r.email || ''),
        perfil: String(r.perfil || 'consulta'),
        ativo: toBoolean(r.ativo, true),
      };
    });

  return sendResponse(true, rows, null);
}

function hashPassword(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password), Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function handleSaveUser(cnpj, payload) {
  const id = nextNumericId(SHEET_NAMES.usuarios);
  const email = String(payload.email || '').trim().toLowerCase();

  if (!email) return sendResponse(false, null, 'email obrigatorio');
  if (!payload.password) return sendResponse(false, null, 'password obrigatorio');

  const rowObj = {
    cnpj: cnpj,
    id: id,
    nome: payload.nome || '',
    email: email,
    senha_hash: hashPassword(payload.password),
    perfil: payload.perfil || 'consulta',
    ativo: toBoolean(payload.ativo, true) ? 'TRUE' : 'FALSE',
  };

  appendObjectByHeaders(SHEET_NAMES.usuarios, rowObj);

  return sendResponse(true, {
    id: String(id),
    nome: rowObj.nome,
    email: rowObj.email,
    perfil: rowObj.perfil,
    ativo: toBoolean(rowObj.ativo, true),
  }, null);
}

function handleUpdateUser(cnpj, payload) {
  const userId = payload.userId;
  const updates = payload.updates || {};
  const newPassword = payload.newPassword || '';

  if (!userId) return sendResponse(false, null, 'userId obrigatorio');

  const rowIndex = findRowIndexByCnpjAndId(SHEET_NAMES.usuarios, cnpj, userId);
  if (rowIndex < 0) return sendResponse(false, null, 'Usuario nao encontrado');

  const patch = {};
  if (updates.nome !== undefined) patch.nome = updates.nome;
  if (updates.email !== undefined) patch.email = String(updates.email).trim().toLowerCase();
  if (updates.perfil !== undefined) patch.perfil = updates.perfil;
  if (updates.ativo !== undefined) patch.ativo = toBoolean(updates.ativo, true) ? 'TRUE' : 'FALSE';
  if (newPassword) patch.senha_hash = hashPassword(newPassword);

  updateRowByHeaders(SHEET_NAMES.usuarios, rowIndex, patch);

  const all = getSheetRowsAsObjects(SHEET_NAMES.usuarios);
  const updated = all.find(function (r) {
    return String(r.cnpj) === String(cnpj) && String(r.id) === String(userId);
  });

  return sendResponse(true, {
    id: String(updated.id),
    nome: String(updated.nome || ''),
    email: String(updated.email || ''),
    perfil: String(updated.perfil || 'consulta'),
    ativo: toBoolean(updated.ativo, true),
  }, null);
}

function handleSetUserBlocked(cnpj, payload) {
  const userId = payload.userId;
  const blocked = toBoolean(payload.blocked, false);

  if (!userId) return sendResponse(false, null, 'userId obrigatorio');

  return handleUpdateUser(cnpj, {
    userId: userId,
    updates: { ativo: !blocked },
  });
}

// ========= DRIVE HELPERS =========
function sanitizeForFolderName(text) {
  return String(text || '')
    .replace(/[\\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function getOrCreateFolder(parent, name) {
  const cleanName = sanitizeForFolderName(name);
  const folders = parent.getFoldersByName(cleanName);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(cleanName);
}

function getOrCreateRootFolder() {
  const folders = DriveApp.getFoldersByName(DRIVE_ROOT_FOLDER);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_ROOT_FOLDER);
}

function getOrCreateReportFolder(cnpj, reportId) {
  const root = getOrCreateRootFolder();
  const companyFolder = getOrCreateFolder(root, String(cnpj).replace(/[^\d]/g, ''));
  const reportFolder = getOrCreateFolder(companyFolder, String(reportId));
  return reportFolder;
}

function extractBase64Payload(input) {
  if (input.indexOf('base64,') >= 0) {
    return input.split('base64,')[1];
  }
  return input;
}

function extensionFromMimeType(mimeType) {
  const mt = String(mimeType || '').toLowerCase();
  if (mt === 'image/jpeg' || mt === 'image/jpg') return 'jpg';
  if (mt === 'image/png') return 'png';
  if (mt === 'image/webp') return 'webp';
  if (mt === 'image/gif') return 'gif';
  return 'jpg';
}
```

## 3. Configurar Frontend

No arquivo [COMO_RODAR_LOCAL.md](COMO_RODAR_LOCAL.md), configure a variável de ambiente:

```bash
# .env.local
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID/exec
VITE_CNPJ=12.345.678/0001-90
```

## 4. Estrutura de Dados Esperada

Cada requisição ao Apps Script deve enviar:

```json
{
  "action": "getClientes",
  "cnpj": "12.345.678/0001-90",
  "payload": {}
}
```

O frontend já está estruturado para isso em `src/lib/api-service.ts`.

## 5. Próximos Passos

- [ ] Validação de senhas com hash
- [ ] Limites de taxa (rate limiting)
- [ ] Auditoria de alterações
- [ ] Integração com API OMIE (fase final)
- [ ] Personalização no-code para admin

## Troubleshooting

**Erro: "Empresa não encontrada"**
- Verifique se o CNPJ está correto na aba `config`
- Confirme se a coluna `ativo` é `TRUE`

**Erro: "CNPJ é obrigatório"**
- O frontend precisa enviar `cnpj` no payload
- Configure a variável `VITE_CNPJ` no `.env.local`

**Erro de permissões**
- Deploy como "Qualquer pessoa"
- Confirme que a conta tem acesso ao Sheet

## Fotos dos relatórios (como será)

Para fotos, o melhor desenho é:

- Arquivo da imagem: Google Drive
- Metadados da foto (id, relatorio_id, categoria, descricao, url): aba do Google Sheets

Evite salvar base64 dentro da planilha. Isso cresce muito rápido, piora performance e estoura limites.

### Nova aba no Sheet

Crie a aba `fotos` com colunas:

| cnpj | id | relatorio_id | categoria | descricao | drive_file_id | url | criado_em |
|------|----|--------------|-----------|-----------|---------------|-----|-----------|

### Fluxo recomendado

1. Frontend tira a foto no celular.
2. Frontend envia a imagem para ação `uploadPhoto` no Apps Script.
3. Apps Script grava no Drive em pasta por empresa (CNPJ).
4. Apps Script grava metadados na aba `fotos`.
5. App usa a URL salva para exibir no relatório.

### Estrutura de pastas no Drive

- RAT-FOTOS/
- RAT-FOTOS/12.345.678-0001-90/
- RAT-FOTOS/12.345.678-0001-90/RAT-2026-0001/

### Ações novas na API Apps Script

- `uploadPhoto` (upload e registro da foto)
- `getReportPhotos` (listar fotos do relatório)
- `deletePhoto` (remover do Drive e da planilha)

### Boas práticas de foto

- Converter para JPEG no frontend antes de enviar
- Limitar lado maior para 1600px a 1920px
- Qualidade entre 0.75 e 0.85
- Limite de tamanho por foto: 1 MB a 2 MB
- Exigir pelo menos 1 foto ao finalizar relatório (regra opcional)

### Segurança e acesso

- Salvar arquivos em pasta da conta de serviço/conta dona do Apps Script
- Compartilhar por link somente leitura quando necessário
- Sempre filtrar por CNPJ no get/delete para manter isolamento multiempresa
