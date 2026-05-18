/**
 * Camada de serviço para integração com Google Apps Script.
 * Atualmente usa dados mock. Para integrar com Google Sheets,
 * substitua as funções por chamadas fetch() ao URL do Apps Script.
 * 
 * Exemplo de integração:
 * const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/SEU_ID/exec';
 * 
 * async function fetchData(action: string, params?: any) {
 *   const response = await fetch(`${APPS_SCRIPT_URL}?action=${action}`, {
 *     method: 'POST',
 *     body: JSON.stringify(params),
 *   });
 *   return response.json();
 * }
 */

import { mockClients, mockEquipments, mockVehicles, mockReports, mockUsers, mockPartKits, currentUser } from './mock-data';
import { Client, Equipment, Vehicle, Report, ReportPhoto, User, ReportStatus, PartKit, AccessControlConfig, AccessLevel, PermissionKey } from './types';
import { supabase, hasSupabaseConfigured } from './supabase';

// Simula delay de rede
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const USERS_STORAGE_KEY = 'rat-users';
const USER_PASSWORDS_STORAGE_KEY = 'rat-user-passwords';
const AUTH_STORAGE_KEY = 'rat-auth-user';
const AUTH_USER_STORAGE_KEY = 'rat-auth-user-data';
const RUNTIME_SETTINGS_STORAGE_KEY = 'rat-runtime-settings';
const PART_KITS_STORAGE_KEY = 'rat-part-kits';
const ACCESS_CONTROL_STORAGE_KEY = 'rat-access-control';

function normalizeEmail(email?: string) {
  return String(email || '').trim().toLowerCase();
}

type RuntimeSettings = {
  appsScriptUrl: string;
  driveFolderId: string;
  companyName: string;
  companyCnpj: string;
  companyPhone: string;
};

type AppsScriptResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type RemoteClientInput = Partial<Client> & {
  id?: string | number;
  ativo?: boolean | string | number;
  razao_social?: string;
  nome_fantasia?: string;
};
type RemoteEquipmentInput = Partial<Equipment> & {
  id?: string | number;
  ativo?: boolean | string | number;
  cliente_id?: string | number;
  cliente_nome?: string;
  numero_serie?: string;
  qr_code?: string;
};
type RemoteUserInput = Partial<User> & {
  id?: string | number;
  senha_hash?: string;
  senhaHash?: string;
  ativo?: boolean | string | number;
};
type RemoteReportInput = Partial<Report> & {
  id?: string | number;
  tipo_manutencao?: string;
  data_abertura?: string;
  hora_abertura?: string;
  numero_serie?: string;
  checklist_respostas?: unknown;
  checklist_corretivas?: unknown;
  checklist_observacoes_gerais?: string;
  checklist_link_externo?: string;
  checklist_arquivo_nome?: string;
  checklist_arquivo_url?: string;
  checklist_capa_nome?: string;
  checklist_capa_url?: string;
};
type RemoteReportPhotoInput = Partial<ReportPhoto> & {
  id?: string | number;
  relatorioId?: string | number;
  relatorio_id?: string | number;
  driveFileId?: string;
  drive_file_id?: string;
  criadoEm?: string;
  criado_em?: string;
};

type StoredPartKit = PartKit;

const allPermissionKeys: PermissionKey[] = [
  'dashboard.view',
  'reports.view',
  'reports.create',
  'reports.edit',
  'qrcode.view',
  'search.view',
  'clients.view',
  'clients.manage',
  'equipments.view',
  'equipments.manage',
  'vehicles.view',
  'vehicles.manage',
  'kits.view',
  'kits.manage',
  'users.view',
  'users.manage',
  'settings.view',
  'settings.manage',
];

const defaultAccessControl: AccessControlConfig = {
  gerente: {
    'dashboard.view': true,
    'reports.view': true,
    'reports.create': true,
    'reports.edit': true,
    'qrcode.view': true,
    'search.view': true,
    'clients.view': true,
    'clients.manage': true,
    'equipments.view': true,
    'equipments.manage': true,
    'vehicles.view': true,
    'vehicles.manage': true,
    'kits.view': true,
    'kits.manage': true,
    'users.view': false,
    'users.manage': false,
    'settings.view': false,
    'settings.manage': false,
  },
  tecnico: {
    'dashboard.view': true,
    'reports.view': true,
    'reports.create': false,
    'reports.edit': false,
    'qrcode.view': true,
    'search.view': true,
    'clients.view': true,
    'clients.manage': false,
    'equipments.view': true,
    'equipments.manage': false,
    'vehicles.view': true,
    'vehicles.manage': false,
    'kits.view': true,
    'kits.manage': false,
    'users.view': false,
    'users.manage': false,
    'settings.view': false,
    'settings.manage': false,
  },
};

function getDefaultRuntimeSettings(): RuntimeSettings {
  return {
    appsScriptUrl: ((import.meta as any).env?.VITE_APPS_SCRIPT_URL || '').trim(),
    driveFolderId: '',
    companyName: '',
    companyCnpj: ((import.meta as any).env?.VITE_CNPJ || '').trim(),
    companyPhone: '',
  };
}

function getStoredRuntimeSettings(): Partial<RuntimeSettings> {
  if (typeof window === 'undefined') return {};

  const raw = localStorage.getItem(RUNTIME_SETTINGS_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Partial<RuntimeSettings>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    localStorage.removeItem(RUNTIME_SETTINGS_STORAGE_KEY);
    return {};
  }
}

function getStoredPartKits(): PartKit[] {
  if (typeof window === 'undefined') return [...mockPartKits];

  const raw = localStorage.getItem(PART_KITS_STORAGE_KEY);
  if (!raw) return [...mockPartKits];

  try {
    const parsed = JSON.parse(raw) as StoredPartKit[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((kit, index) => normalizePartKit(kit, String(index + 1)));
    }
    return [...mockPartKits];
  } catch {
    localStorage.removeItem(PART_KITS_STORAGE_KEY);
    return [...mockPartKits];
  }
}

function persistPartKits(kits: PartKit[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PART_KITS_STORAGE_KEY, JSON.stringify(kits));
}

function normalizeAccessControl(config?: Partial<AccessControlConfig>): AccessControlConfig {
  const source = (config || {}) as Partial<AccessControlConfig> & {
    nivel_2?: Record<PermissionKey, boolean>;
    nivel_3?: Record<PermissionKey, boolean>;
  };

  const normalized: AccessControlConfig = {
    gerente: { ...defaultAccessControl.gerente },
    tecnico: { ...defaultAccessControl.tecnico },
  };

  allPermissionKeys.forEach((permission) => {
    if (source.gerente && typeof source.gerente[permission] === 'boolean') {
      normalized.gerente[permission] = source.gerente[permission];
    }
    if (source.tecnico && typeof source.tecnico[permission] === 'boolean') {
      normalized.tecnico[permission] = source.tecnico[permission];
    }

    // Migração de chaves legadas
    if (source.nivel_2 && typeof source.nivel_2[permission] === 'boolean') {
      normalized.gerente[permission] = source.nivel_2[permission];
    }
    if (source.nivel_3 && typeof source.nivel_3[permission] === 'boolean') {
      normalized.tecnico[permission] = source.nivel_3[permission];
    }
  });

  return normalized;
}

function getStoredAccessControl(): AccessControlConfig {
  if (typeof window === 'undefined') return defaultAccessControl;

  const raw = localStorage.getItem(ACCESS_CONTROL_STORAGE_KEY);
  if (!raw) return defaultAccessControl;

  try {
    const parsed = JSON.parse(raw) as Partial<AccessControlConfig>;
    return normalizeAccessControl(parsed);
  } catch {
    localStorage.removeItem(ACCESS_CONTROL_STORAGE_KEY);
    return defaultAccessControl;
  }
}

export function getRuntimeSettings(): RuntimeSettings {
  return {
    ...getDefaultRuntimeSettings(),
    ...getStoredRuntimeSettings(),
  };
}

export function saveRuntimeSettings(settings: Partial<RuntimeSettings>): RuntimeSettings {
  if (getCurrentUser().perfil !== 'admin') {
    throw new Error('Apenas administradores podem alterar configurações.');
  }

  const merged = {
    ...getRuntimeSettings(),
    ...settings,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(RUNTIME_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
  }

  return merged;
}

export function getAccessControlConfig(): AccessControlConfig {
  return getStoredAccessControl();
}

export function saveAccessControlConfig(config: Partial<AccessControlConfig>): AccessControlConfig {
  if (getCurrentUser().perfil !== 'admin') {
    throw new Error('Apenas administradores podem alterar permissões.');
  }

  const merged = normalizeAccessControl({
    ...getStoredAccessControl(),
    ...config,
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(ACCESS_CONTROL_STORAGE_KEY, JSON.stringify(merged));
  }

  return merged;
}

export function getAccessLevel(user?: User): AccessLevel {
  const target = user || getCurrentUser();
  if (target.perfil === 'admin') return 'admin';
  if (target.perfil === 'gerente') return 'gerente';
  return 'tecnico';
}

export function hasPermission(permission: PermissionKey, user?: User): boolean {
  const level = getAccessLevel(user);
  if (level === 'admin') return true;

  const config = getStoredAccessControl();
  return config[level][permission] ?? false;
}

function parseBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'sim', 's', 'ativo'].includes(normalized)) return true;
    if (['false', '0', 'nao', 'não', 'n', 'inativo'].includes(normalized)) return false;
  }
  return fallback;
}

function isPasswordHash(value: unknown): boolean {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string') return '';
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const encoded = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return password;
}

async function verifyPassword(storedPassword: string | undefined, candidate: string): Promise<boolean> {
  if (!storedPassword) return false;
  if (isPasswordHash(storedPassword)) {
    return (await hashPassword(candidate)) === storedPassword;
  }
  return storedPassword === candidate;
}

function getStoredAuthUser(): User | undefined {
  if (typeof window === 'undefined') return undefined;

  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY) || sessionStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as User;
    if (parsed && typeof parsed === 'object' && parsed.id) {
      return normalizeUser(parsed, String(parsed.id));
    }
  } catch {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }

  return undefined;
}

function persistAuthenticatedUser(user: User, rememberSession: boolean) {
  if (typeof window === 'undefined') return;
  const destination = rememberSession ? localStorage : sessionStorage;
  destination.setItem(AUTH_STORAGE_KEY, user.id);
  destination.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  const otherDestination = rememberSession ? sessionStorage : localStorage;
  otherDestination.removeItem(AUTH_STORAGE_KEY);
  otherDestination.removeItem(AUTH_USER_STORAGE_KEY);
}

function removeAuthenticatedUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

function normalizeClient(input: RemoteClientInput, fallbackId: string): Client {
  const razaoSocial = String(input.razaoSocial || input.razao_social || input.nomeFantasia || input.nome_fantasia || '');
  const nomeFantasia = String(input.nomeFantasia || input.nome_fantasia || input.razaoSocial || input.razao_social || razaoSocial || '');

  return {
    id: String(input.id ?? fallbackId),
    codigo: String(input.codigo || ''),
    razaoSocial,
    nomeFantasia,
    cnpj: String(input.cnpj || ''),
    endereco: String(input.endereco || ''),
    cidade: String(input.cidade || ''),
    estado: String(input.estado || ''),
    telefone: String(input.telefone || ''),
    email: String(input.email || ''),
    contato: String(input.contato || ''),
    ativo: parseBoolean(input.ativo, true),
  };
}

function normalizeEquipment(input: RemoteEquipmentInput, fallbackId: string): Equipment {
  const qrCode = String(input.qrCode || input.qr_code || `EQ-${String(input.id ?? fallbackId).padStart(3, '0')}`);
  const clienteIdValue = input.clienteId ?? input.cliente_id ?? (input.clienteId === 0 ? 0 : '');

  return {
    id: String(input.id ?? fallbackId),
    clienteId: String(clienteIdValue),
    clienteNome: String(input.clienteNome || input.cliente_nome || ''),
    descricao: String(input.descricao || ''),
    marca: String(input.marca || ''),
    modelo: String(input.modelo || ''),
    numeroSerie: String(input.numeroSerie || input.numero_serie || ''),
    localizacao: String(input.localizacao || ''),
    qrCode,
    ativo: parseBoolean(input.ativo, true),
  };
}

function normalizeVehicle(input: Vehicle, fallbackId: string): Vehicle {
  return {
    id: String(input.id ?? fallbackId),
    descricao: String(input.descricao || ''),
    placa: String(input.placa || ''),
    modelo: String(input.modelo || ''),
    ano: String(input.ano || ''),
    ativo: parseBoolean(input.ativo, true),
  };
}

function normalizeReport(input: RemoteReportInput, fallbackId: string): Report {
  return {
    id: String(input.id ?? fallbackId),
    numero: String(input.numero || ''),
    dataAbertura: String(input.dataAbertura || input.data_abertura || ''),
    horaAbertura: String(input.horaAbertura || input.hora_abertura || ''),
    tecnicoId: String(input.tecnicoId || ''),
    tecnicoNome: String(input.tecnicoNome || ''),
    tipoManutencao: (input.tipoManutencao as Report['tipoManutencao']) || (input.tipo_manutencao as Report['tipoManutencao']) || 'corretiva',
    clienteId: String(input.clienteId || ''),
    clienteNome: String(input.clienteNome || ''),
    equipamentoId: String(input.equipamentoId || ''),
    equipamentoDescricao: String(input.equipamentoDescricao || ''),
    numeroSerie: String(input.numeroSerie || input.numero_serie || ''),
    problemaRelatado: String(input.problemaRelatado || ''),
    diagnostico: String(input.diagnostico || ''),
    servicoExecutado: String(input.servicoExecutado || ''),
    pecas: Array.isArray(input.pecas) ? input.pecas.map(part => ({
      id: String(part.id || ''),
      descricao: String(part.descricao || ''),
      quantidade: Number(part.quantidade || 0),
      observacao: String(part.observacao || ''),
      origem: (part.origem as ReportPart['origem']) || 'avulso',
      kitId: String(part.kitId || ''),
      kitNome: String(part.kitNome || ''),
    })) : [],
    informacoesAdicionais: String(input.informacoesAdicionais || ''),
    horasTrabalho: Number(input.horasTrabalho ?? 0),
    deslocamentoIda: String(input.deslocamentoIda || ''),
    deslocamentoVolta: String(input.deslocamentoVolta || ''),
    checklistModelo: input.checklistModelo as Report['checklistModelo'] || undefined,
    checklistStatus: input.checklistStatus as Report['checklistStatus'] || (input.checklist_status as Report['checklistStatus']) || 'pendente',
    checklistRespostas: Array.isArray(input.checklistRespostas) ? input.checklistRespostas : Array.isArray((input as any).checklist_respostas) ? (input as any).checklist_respostas : [],
    checklistObservacoesGerais: String(input.checklistObservacoesGerais || (input as any).checklist_observacoes_gerais || ''),
    checklistCorretivas: Array.isArray(input.checklistCorretivas) ? input.checklistCorretivas : Array.isArray((input as any).checklist_corretivas) ? (input as any).checklist_corretivas : [],
    checklistLinkExterno: String(input.checklistLinkExterno || (input as any).checklist_link_externo || ''),
    checklistArquivoNome: String(input.checklistArquivoNome || (input as any).checklist_arquivo_nome || ''),
    checklistArquivoUrl: String(input.checklistArquivoUrl || (input as any).checklist_arquivo_url || ''),
    checklistCapaNome: String(input.checklistCapaNome || (input as any).checklist_capa_nome || ''),
    checklistCapaUrl: String(input.checklistCapaUrl || (input as any).checklist_capa_url || ''),
    veiculoId: String(input.veiculoId || ''),
    veiculoDescricao: String(input.veiculoDescricao || ''),
    placa: String(input.placa || ''),
    pedagio: Number(input.pedagio ?? 0),
    refeicao: Number(input.refeicao ?? 0),
    estadia: Number(input.estadia ?? 0),
    atendimentos: Array.isArray(input.atendimentos) ? input.atendimentos : [],
    status: (input.status as Report['status']) || 'rascunho',
    fotos: Array.isArray(input.fotos) ? input.fotos.map(photo => normalizeReportPhoto(photo, String(Date.now()), String(input.id || fallbackId))) : [],
    criadoPor: String(input.criadoPor || ''),
    editadoPor: String(input.editadoPor || ''),
    dataFinalizacao: String(input.dataFinalizacao || ''),
  };
}

async function getClientCodigoById(clientId: string): Promise<string> {
  if (!clientId) return '';

  const tableName = await getSupabaseClientTableName();
  const { data, error } = await supabase.from(tableName).select('codigo').eq('id', clientId).single();
  if (error || !data) return '';
  return String((data as any).codigo || '');
}

function normalizeLegacyUserRole(role: unknown): User['perfil'] {
  if (role === 'admin' || role === 'gerente' || role === 'tecnico') return role;
  if (role === 'tecnico_interno') return 'gerente';
  if (role === 'tecnico_externo' || role === 'consulta') return 'tecnico';
  return 'tecnico';
}

function normalizeUser(input: RemoteUserInput, fallbackId: string): User {
  return {
    id: String(input.id ?? fallbackId),
    nome: String(input.nome || ''),
    email: String(input.email || ''),
    perfil: normalizeLegacyUserRole(input.perfil),
    ativo: parseBoolean(input.ativo, true),
  };
}

function getKitOwnerFallback() {
  const tecnico = mockUsers.find(user => user.perfil === 'tecnico' || user.perfil === 'gerente');
  if (tecnico) return { tecnicoId: tecnico.id, tecnicoNome: tecnico.nome };

  const admin = mockUsers.find(user => user.perfil === 'admin');
  if (admin) return { tecnicoId: admin.id, tecnicoNome: admin.nome };

  return { tecnicoId: '', tecnicoNome: '' };
}

function normalizePartKit(input: Partial<PartKit>, fallbackId: string): PartKit {
  const ownerFallback = getKitOwnerFallback();
  const parts = Array.isArray(input.pecas) ? input.pecas : [];

  return {
    id: String(input.id ?? fallbackId),
    nome: String(input.nome || ''),
    descricao: String(input.descricao || ''),
    tecnicoId: String(input.tecnicoId || ownerFallback.tecnicoId),
    tecnicoNome: String(input.tecnicoNome || ownerFallback.tecnicoNome),
    pecas: parts.map(part => ({
      descricao: String(part.descricao || ''),
      quantidade: Number(part.quantidade || 1),
      observacao: String(part.observacao || ''),
    })),
  };
}

function normalizeKitStockKey(value?: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getReportKitPartKey(part: Pick<ReportPart, 'descricao' | 'observacao'>) {
  return `${normalizeKitStockKey(part.descricao)}|${normalizeKitStockKey(part.observacao)}`;
}

function clonePartKits(kits: PartKit[]): PartKit[] {
  return kits.map(kit => ({
    ...kit,
    pecas: kit.pecas.map(part => ({ ...part })),
  }));
}

function applyKitStockChange(kits: PartKit[], parts: ReportPart[], direction: 1 | -1) {
  for (const part of parts) {
    if (part.origem !== 'kit' || !part.kitId) {
      continue;
    }

    const quantity = Number(part.quantidade || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    const kit = kits.find(item => item.id === part.kitId);
    if (!kit) {
      continue;
    }

    const matchKey = getReportKitPartKey(part);
    const kitPart = kit.pecas.find(item => getReportKitPartKey(item) === matchKey);
    if (!kitPart) {
      throw new Error(`Peça ${part.descricao} não encontrada no kit ${kit.nome}.`);
    }

    const nextQuantity = kitPart.quantidade + direction * quantity;
    if (nextQuantity < 0) {
      throw new Error(`Estoque insuficiente no kit ${kit.nome} para ${part.descricao}.`);
    }

    kitPart.quantidade = nextQuantity;
  }
}

function normalizeReportPhoto(input: RemoteReportPhotoInput, fallbackId: string, reportId: string): ReportPhoto {
  return {
    id: String(input.id ?? fallbackId),
    relatorioId: String(input.relatorioId ?? input.relatorio_id ?? reportId),
    url: String(input.url || ''),
    categoria: (input.categoria as ReportPhoto['categoria']) || 'durante',
    descricao: String(input.descricao || ''),
    driveFileId: input.driveFileId || input.drive_file_id,
    criadoEm: String(input.criadoEm || input.criado_em || ''),
  };
}

function getMimeTypeFromDataUrl(dataUrl: string): string {
  const match = /^data:([^;]+);base64,/i.exec(dataUrl);
  return match?.[1] || 'image/jpeg';
}

function getAppsScriptUrl(): string {
  return getRuntimeSettings().appsScriptUrl.trim();
}

function hasRemoteDataSource(): boolean {
  return getAppsScriptUrl().length > 0;
}

function hasSupabaseDataSource(): boolean {
  try {
    return typeof window !== 'undefined' && hasSupabaseConfigured();
  } catch {
    return false;
  }
}

let supabaseClientTableName: string | null = null;
let supabaseEquipmentTableName: string | null = null;

async function getSupabaseClientTableName(): Promise<string> {
  if (supabaseClientTableName) return supabaseClientTableName;

  const preferred = 'clients';
  const fallback = 'clientes';

  const { error: preferredError } = await supabase.from(preferred).select('id').limit(1);
  if (!preferredError) {
    supabaseClientTableName = preferred;
    return preferred;
  }

  const { error: fallbackError } = await supabase.from(fallback).select('id').limit(1);
  if (!fallbackError) {
    supabaseClientTableName = fallback;
    return fallback;
  }

  supabaseClientTableName = preferred;
  return preferred;
}

async function getSupabaseEquipmentTableName(): Promise<string> {
  if (supabaseEquipmentTableName) return supabaseEquipmentTableName;

  const preferred = 'equipments';
  const fallback = 'equipamentos';

  const { error: preferredError } = await supabase.from(preferred).select('id').limit(1);
  if (!preferredError) {
    supabaseEquipmentTableName = preferred;
    return preferred;
  }

  const { error: fallbackError } = await supabase.from(fallback).select('id').limit(1);
  if (!fallbackError) {
    supabaseEquipmentTableName = fallback;
    return fallback;
  }

  supabaseEquipmentTableName = preferred;
  return preferred;
}

async function callAppsScript<T>(action: string, payload?: unknown): Promise<T> {
  const appsScriptUrl = getAppsScriptUrl();

  if (!appsScriptUrl) {
    throw new Error('Fonte remota não configurada.');
  }

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ action, payload, cnpj: getCurrentCNPJ() }),
  });

  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status}`);
  }

  const result = (await response.json()) as AppsScriptResponse<T>;
  if (!result.success) {
    throw new Error(result.error || 'Erro na API Google Apps Script.');
  }

  return result.data as T;
}

const mockUserPasswords: Record<string, string> = Object.fromEntries(
  mockUsers.map((user) => [
    user.id,
    user.email.toLowerCase() === 'sanchez@empresa.com' ? '010816' : '123456',
  ]),
);

function persistUsersAuthData() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mockUsers));
  localStorage.setItem(USER_PASSWORDS_STORAGE_KEY, JSON.stringify(mockUserPasswords));
}

function hydrateUsersAuthData() {
  if (typeof window === 'undefined') return;

  const storedUsersRaw = localStorage.getItem(USERS_STORAGE_KEY);
  const storedPasswordsRaw = localStorage.getItem(USER_PASSWORDS_STORAGE_KEY);

  if (storedUsersRaw) {
    try {
      const parsedUsers = JSON.parse(storedUsersRaw) as User[];
      if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
        const normalizedUsers = parsedUsers.map((user, index) => ({
          ...user,
          id: String(user.id ?? index + 1),
          perfil: normalizeLegacyUserRole(user.perfil),
        }));
        mockUsers.splice(0, mockUsers.length, ...normalizedUsers);
      }
    } catch {
      localStorage.removeItem(USERS_STORAGE_KEY);
    }
  }

  if (storedPasswordsRaw) {
    try {
      const parsedPasswords = JSON.parse(storedPasswordsRaw) as Record<string, string>;
      Object.keys(mockUserPasswords).forEach((key) => delete mockUserPasswords[key]);
      Object.assign(mockUserPasswords, parsedPasswords);
    } catch {
      localStorage.removeItem(USER_PASSWORDS_STORAGE_KEY);
    }
  }

  mockUsers.forEach((user) => {
    if (!mockUserPasswords[user.id]) {
      mockUserPasswords[user.id] = user.email.toLowerCase() === 'sanchez@empresa.com' ? '010816' : '123456';
    }
  });

  persistUsersAuthData();
}

hydrateUsersAuthData();

function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
}

function getAuthenticatedUser(): User | undefined {
  const storedUserId = getStoredUserId();
  if (!storedUserId) return undefined;

  const storedUser = getStoredAuthUser();
  if (storedUser && storedUser.id === storedUserId && storedUser.ativo) {
    return storedUser;
  }

  return mockUsers.find(user => user.id === storedUserId && user.ativo);
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthenticatedUser());
}

export function isRemoteBackendEnabled(): boolean {
  return hasRemoteDataSource();
}

export async function loginUser(email: string, password: string, rememberSession = true): Promise<User> {
  await delay(300);

  const normalizedIdentifier = email.trim().toLowerCase();

  if (hasSupabaseDataSource()) {
    try {
      const { data, error } = await supabase.from('users').select('id, nome, email, perfil, ativo, senha').eq('email', normalizedIdentifier).single();
      if (!error && data) {
        const fetchedUser = data as any;
        const validPassword = await verifyPassword(String(fetchedUser.senha || ''), password);
        if (!validPassword) {
          throw new Error('E-mail ou senha inválidos.');
        }
        if (!parseBoolean(fetchedUser.ativo, true)) {
          throw new Error('Usuário bloqueado. Procure um administrador.');
        }

        const user = normalizeUser(fetchedUser, String(fetchedUser.id || ''));
        persistAuthenticatedUser(user, rememberSession);
        return user;
      }
    } catch {
      // fallback to local auth
    }
  }

  let user = mockUsers.find(existingUser => existingUser.email.toLowerCase() === normalizedIdentifier);

  if (!user && normalizedIdentifier) {
    const matchesByLocalPart = mockUsers.filter((existingUser) => {
      const localPart = existingUser.email.split('@')[0]?.toLowerCase() || '';
      return localPart === normalizedIdentifier;
    });

    if (matchesByLocalPart.length === 1) {
      user = matchesByLocalPart[0];
    } else if (matchesByLocalPart.length > 1) {
      throw new Error('Login ambíguo. Use o e-mail completo para entrar.');
    }
  }

  if (!user || mockUserPasswords[user.id] !== password) {
    throw new Error('E-mail ou senha inválidos.');
  }

  if (!user.ativo) {
    throw new Error('Usuário bloqueado. Procure um administrador.');
  }

  persistAuthenticatedUser(user, rememberSession);
  return user;
}

export function logoutUser() {
  removeAuthenticatedUser();
}

export async function getClients(): Promise<Client[]> {
  if (hasSupabaseDataSource()) {
    try {
      const tableName = await getSupabaseClientTableName();
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;
      if (!Array.isArray(data)) return [];
      return data.map((client: any, index: number) => normalizeClient(client, String(index + 1)));
    } catch {
      // fallback to other remote or local
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const remoteClients = await callAppsScript<RemoteClientInput[]>('getClients');
      if (!Array.isArray(remoteClients)) return [];
      return remoteClients.map((client, index) => normalizeClient(client, String(index + 1)));
    } catch {
      await delay(300);
      return [...mockClients];
    }
  }

  await delay(300);
  return [...mockClients];
}

export async function saveClient(client: Partial<Client>): Promise<Client> {
  if (hasSupabaseDataSource()) {
    try {
      const payload = {
        codigo: client.codigo || '',
        razaoSocial: client.razaoSocial || client.nomeFantasia || '',
        nomeFantasia: client.nomeFantasia || client.razaoSocial || '',
        razao_social: client.razaoSocial || client.nomeFantasia || '',
        nome_fantasia: client.nomeFantasia || client.razaoSocial || '',
        cnpj: client.cnpj || '',
        endereco: client.endereco || '',
        cidade: client.cidade || '',
        estado: client.estado || '',
        telefone: client.telefone || '',
        email: client.email || '',
        contato: client.contato || '',
        ativo: client.ativo ?? true,
      } as any;

      const tableName = await getSupabaseClientTableName();
      const { data, error } = await supabase.from(tableName).insert([payload]).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) return normalizeClient(data[0], String(Date.now()));
    } catch {
      // fallback
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const savedClient = await callAppsScript<RemoteClientInput>('saveClient', client);
      return normalizeClient(savedClient, String(Date.now()));
    } catch {
      // fallback local
    }
  }

  await delay(500);

  const currentMaxId = mockClients.reduce((max, c) => {
    const parsedId = Number.parseInt(c.id, 10);
    if (Number.isNaN(parsedId)) return max;
    return Math.max(max, parsedId);
  }, 0);

  const newClient: Client = {
    id: String(currentMaxId + 1),
    codigo: client.codigo || '',
    razaoSocial: client.razaoSocial || client.nomeFantasia || '',
    nomeFantasia: client.nomeFantasia || client.razaoSocial || '',
    cnpj: client.cnpj || '',
    endereco: client.endereco || '',
    cidade: client.cidade || '',
    estado: client.estado || '',
    telefone: client.telefone || '',
    email: client.email || '',
    contato: client.contato || '',
    ativo: client.ativo ?? true,
  };

  mockClients.unshift(newClient);
  return newClient;
}

export async function updateClient(clientId: string, updates: Partial<Client>): Promise<Client | undefined> {
  if (hasSupabaseDataSource()) {
    try {
      const payload = {
        ...updates,
        razao_social: updates.razaoSocial || updates.nomeFantasia,
        nome_fantasia: updates.nomeFantasia || updates.razaoSocial,
      } as any;

      const tableName = await getSupabaseClientTableName();
      const { data, error } = await supabase.from(tableName).update(payload).eq('id', clientId).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) return normalizeClient(data[0], clientId);
    } catch {
      // fallback
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const updatedClient = await callAppsScript<RemoteClientInput | null>('updateClient', { clientId, updates });
      if (!updatedClient) return undefined;
      return normalizeClient(updatedClient, clientId);
    } catch {
      // fallback local
    }
  }

  await delay(500);

  const index = mockClients.findIndex(client => client.id === clientId);
  if (index < 0) return undefined;

  mockClients[index] = { ...mockClients[index], ...updates };
  return mockClients[index];
}

export async function setClientBlocked(clientId: string, blocked: boolean): Promise<Client | undefined> {
  return updateClient(clientId, { ativo: !blocked });
}

export async function getEquipments(clienteId?: string): Promise<Equipment[]> {
  if (hasSupabaseDataSource()) {
    try {
      const tableName = await getSupabaseEquipmentTableName();
      let query = supabase.from(tableName).select('*');
      if (clienteId) {
        const parsedClienteId = Number(clienteId);
        query = Number.isFinite(parsedClienteId)
          ? query.eq('clienteId', parsedClienteId)
          : query.eq('clienteId', clienteId);
      }
      const { data, error } = await query;
      if (error) throw error;
      const normalized = Array.isArray(data) ? data.map((equipment: any, index: number) => normalizeEquipment(equipment, String(index + 1))) : [];
      if (clienteId) return normalized.filter(e => e.clienteId === clienteId);
      return normalized;
    } catch {
      // fallback
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const remoteEquipments = await callAppsScript<RemoteEquipmentInput[]>('getEquipments', { clienteId });
      if (!Array.isArray(remoteEquipments)) return [];
      const normalized = remoteEquipments.map((equipment, index) => normalizeEquipment(equipment, String(index + 1)));
      if (clienteId) return normalized.filter(e => e.clienteId === clienteId);
      return normalized;
    } catch {
      await delay(300);
      if (clienteId) return mockEquipments.filter(e => e.clienteId === clienteId);
      return [...mockEquipments];
    }
  }

  await delay(300);
  if (clienteId) return mockEquipments.filter(e => e.clienteId === clienteId);
  return [...mockEquipments];
}

export async function saveEquipment(equipment: Partial<Equipment>): Promise<Equipment> {
  if (hasSupabaseDataSource()) {
    try {
      const clientCodigo = equipment.clienteId ? await getClientCodigoById(equipment.clienteId) : '';
      const generatedQr = equipment.qrCode || `EQ-${String(Date.now())}`;
      const payload = {
        codigo_equipamento: equipment.codigo_equipamento || `EQ-${String(Date.now())}`,
        codigo_cliente: clientCodigo,
        cliente_nome: equipment.clienteNome || '',
        clienteId: equipment.clienteId || '',
        clienteNome: equipment.clienteNome || '',
        descricao: equipment.descricao || '',
        marca: equipment.marca || '',
        modelo: equipment.modelo || '',
        numeroSerie: equipment.numeroSerie || '',
        numero_serie: equipment.numeroSerie || '',
        localizacao: equipment.localizacao || '',
        qr_code: generatedQr,
        qrCode: generatedQr,
        ativo: equipment.ativo ?? true,
      } as any;

      const tableName = await getSupabaseEquipmentTableName();
      const { data, error } = await supabase.from(tableName).insert([payload]).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) return normalizeEquipment(data[0], String(Date.now()));
    } catch {
      // fallback
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const savedEquipment = await callAppsScript<RemoteEquipmentInput>('saveEquipment', equipment);
      return normalizeEquipment(savedEquipment, String(Date.now()));
    } catch {
      // fallback local
    }
  }

  await delay(500);

  const currentMaxId = mockEquipments.reduce((max, e) => {
    const parsedId = Number.parseInt(e.id, 10);
    if (Number.isNaN(parsedId)) return max;
    return Math.max(max, parsedId);
  }, 0);

  const fallbackQr = `EQ-${String(currentMaxId + 1).padStart(3, '0')}`;

  const newEquipment: Equipment = {
    id: String(currentMaxId + 1),
    clienteId: equipment.clienteId || '',
    clienteNome: equipment.clienteNome || '',
    descricao: equipment.descricao || '',
    marca: equipment.marca || '',
    modelo: equipment.modelo || '',
    numeroSerie: equipment.numeroSerie || '',
    localizacao: equipment.localizacao || '',
    qrCode: equipment.qrCode || fallbackQr,
    ativo: equipment.ativo ?? true,
  };

  mockEquipments.unshift(newEquipment);
  return newEquipment;
}

export async function updateEquipment(equipmentId: string, updates: Partial<Equipment>): Promise<Equipment | undefined> {
  if (hasSupabaseDataSource()) {
    try {
      const payload = { ...updates } as any;
      if (updates.clienteId) {
        const clientCodigo = await getClientCodigoById(updates.clienteId);
        payload.codigo_cliente = clientCodigo;
      }
      if (updates.clienteNome) payload.cliente_nome = updates.clienteNome;
      if (updates.numeroSerie) payload.numero_serie = updates.numeroSerie;

      const tableName = await getSupabaseEquipmentTableName();
      const { data, error } = await supabase.from(tableName).update(payload).eq('id', equipmentId).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) return normalizeEquipment(data[0], equipmentId);
    } catch {
      // fallback
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const updatedEquipment = await callAppsScript<RemoteEquipmentInput | null>('updateEquipment', { equipmentId, updates });
      if (!updatedEquipment) return undefined;
      return normalizeEquipment(updatedEquipment, equipmentId);
    } catch {
      // fallback local
    }
  }

  await delay(500);

  const index = mockEquipments.findIndex(equipment => equipment.id === equipmentId);
  if (index < 0) return undefined;

  mockEquipments[index] = { ...mockEquipments[index], ...updates };
  return mockEquipments[index];
}

export async function setEquipmentBlocked(equipmentId: string, blocked: boolean): Promise<Equipment | undefined> {
  return updateEquipment(equipmentId, { ativo: !blocked });
}

export async function getEquipmentByQrCode(qrCode: string): Promise<Equipment | undefined> {
  if (hasSupabaseDataSource()) {
    try {
      const query = supabase
        .from('equipments')
        .select('*')
        .or(
          `qr_code.eq.${qrCode},qrCode.eq.${qrCode},numero_serie.eq.${qrCode},numeroSerie.eq.${qrCode}`,
        )
        .limit(1);
      const { data, error } = await query;
      if (!error && Array.isArray(data) && data[0]) {
        return normalizeEquipment(data[0], String(data[0].id || ''));
      }
    } catch {
      // fallback
    }
  }

  await delay(300);
  return mockEquipments.find(e => e.qrCode === qrCode || e.numeroSerie === qrCode);
}

export async function getEquipmentHistory(equipamentoId: string): Promise<Report[]> {
  if (hasSupabaseDataSource()) {
    try {
      const { data, error } = await supabase.from('reports').select('*').eq('equipamentoId', equipamentoId);
      if (!error && Array.isArray(data)) {
        return data.map((report: any, index: number) => normalizeReport(report, String(index + 1)));
      }
    } catch {
      // fallback
    }
  }

  await delay(300);
  return mockReports.filter(r => r.equipamentoId === equipamentoId);
}

export async function getVehicles(): Promise<Vehicle[]> {
  if (hasSupabaseDataSource()) {
    try {
      const { data, error } = await supabase.from('vehicles').select('*');
      if (error) throw error;
      if (Array.isArray(data)) {
        return data.map((vehicle: any, index: number) => normalizeVehicle(vehicle, String(index + 1)));
      }
    } catch {
      // fallback
    }
  }

  await delay(300);
  return [...mockVehicles];
}

export async function saveVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
  if (hasSupabaseDataSource()) {
    try {
      const payload = {
        descricao: vehicle.descricao || '',
        placa: vehicle.placa || '',
        modelo: vehicle.modelo || '',
        ano: vehicle.ano || '',
        ativo: vehicle.ativo ?? true,
      } as any;

      const { data, error } = await supabase.from('vehicles').insert([payload]).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) return normalizeVehicle(data[0], String(Date.now()));
    } catch {
      // fallback
    }
  }

  await delay(500);

  const currentMaxId = mockVehicles.reduce((max, v) => {
    const parsedId = Number.parseInt(v.id, 10);
    if (Number.isNaN(parsedId)) return max;
    return Math.max(max, parsedId);
  }, 0);

  const newVehicle: Vehicle = {
    id: String(currentMaxId + 1),
    descricao: vehicle.descricao || '',
    placa: vehicle.placa || '',
    modelo: vehicle.modelo || '',
    ano: vehicle.ano || '',
    ativo: vehicle.ativo ?? true,
  };

  mockVehicles.unshift(newVehicle);
  return newVehicle;
}

export async function getPartKits(): Promise<PartKit[]> {
  if (hasSupabaseDataSource()) {
    try {
      const { data, error } = await supabase.from('part_kits').select('*');
      if (error) throw error;
      if (Array.isArray(data)) {
        return data.map((kit: any, index: number) => normalizePartKit(kit, String(index + 1)));
      }
    } catch {
      // fallback
    }
  }

  await delay(200);
  return getStoredPartKits();
}

export async function savePartKit(kit: Partial<PartKit>): Promise<PartKit> {
  if (!kit.tecnicoId || !kit.tecnicoNome) {
    throw new Error('Selecione o técnico responsável pelo kit.');
  }

  const newKit = normalizePartKit({ ...kit, id: String(Date.now()) }, String(Date.now()));

  if (hasSupabaseDataSource()) {
    try {
      const payload = {
        nome: newKit.nome,
        descricao: newKit.descricao,
        tecnicoId: newKit.tecnicoId,
        tecnicoNome: newKit.tecnicoNome,
        pecas: newKit.pecas,
        ativo: newKit.ativo ?? true,
      } as any;

      const { data, error } = await supabase.from('part_kits').insert([payload]).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) {
        return normalizePartKit(data[0], String(data[0].id || String(Date.now())));
      }
    } catch {
      // fallback
    }
  }

  await delay(300);
  const kits = getStoredPartKits();
  const currentMaxId = kits.reduce((max, item) => {
    const parsedId = Number.parseInt(item.id, 10);
    if (Number.isNaN(parsedId)) return max;
    return Math.max(max, parsedId);
  }, 0);

  const createdKit = normalizePartKit({ ...kit, id: String(currentMaxId + 1) }, String(currentMaxId + 1));
  kits.unshift(createdKit);
  persistPartKits(kits);
  return createdKit;
}

export async function updatePartKit(kitId: string, updates: Partial<PartKit>): Promise<PartKit | undefined> {
  if (hasSupabaseDataSource()) {
    try {
      const payload = {
        ...updates,
        pecas: updates.pecas,
      } as any;
      const { data, error } = await supabase.from('part_kits').update(payload).eq('id', kitId).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) return normalizePartKit(data[0], kitId);
    } catch {
      // fallback
    }
  }

  await delay(300);
  const kits = getStoredPartKits();
  const index = kits.findIndex(item => item.id === kitId);
  if (index < 0) return undefined;

  kits[index] = normalizePartKit(
    {
      ...kits[index],
      ...updates,
      pecas: updates.pecas ?? kits[index].pecas,
    },
    kitId,
  );

  persistPartKits(kits);
  return kits[index];
}

export async function deletePartKit(kitId: string): Promise<boolean> {
  if (hasSupabaseDataSource()) {
    try {
      const { error } = await supabase.from('part_kits').delete().eq('id', kitId);
      if (error) throw error;
      return true;
    } catch {
      // fallback
    }
  }

  await delay(200);
  const kits = getStoredPartKits();
  const nextKits = kits.filter(item => item.id !== kitId);
  if (nextKits.length === kits.length) return false;

  persistPartKits(nextKits);
  return true;
}

export async function updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
  if (hasSupabaseDataSource()) {
    try {
      const payload = { ...updates } as any;
      const { data, error } = await supabase.from('vehicles').update(payload).eq('id', vehicleId).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) return normalizeVehicle(data[0], vehicleId);
    } catch {
      // fallback
    }
  }

  await delay(500);

  const index = mockVehicles.findIndex(vehicle => vehicle.id === vehicleId);
  if (index < 0) return undefined;

  mockVehicles[index] = { ...mockVehicles[index], ...updates };
  return mockVehicles[index];
}

export async function setVehicleBlocked(vehicleId: string, blocked: boolean): Promise<Vehicle | undefined> {
  return updateVehicle(vehicleId, { ativo: !blocked });
}

export async function getReports(filters?: { status?: ReportStatus; tecnicoId?: string }): Promise<Report[]> {
  if (hasSupabaseDataSource()) {
    try {
      let query = supabase.from('reports').select('*');
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.tecnicoId) query = query.eq('tecnicoId', filters.tecnicoId);
      const { data, error } = await query;
      if (error) throw error;
      if (Array.isArray(data)) {
        return data.map((report: any, index: number) => normalizeReport(report, String(index + 1)));
      }
    } catch {
      // fallback
    }
  }

  await delay(300);
  let results = [...mockReports];
  if (filters?.status) results = results.filter(r => r.status === filters.status);
  if (filters?.tecnicoId) results = results.filter(r => r.tecnicoId === filters.tecnicoId);
  return results;
}

export async function getReportById(id: string): Promise<Report | undefined> {
  if (hasSupabaseDataSource()) {
    try {
      const { data, error } = await supabase.from('reports').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) return normalizeReport(data, id);
    } catch {
      // fallback
    }
  }

  await delay(300);
  return mockReports.find(r => r.id === id);
}

async function persistKitStockChanges(kits: PartKit[]): Promise<void> {
  if (hasSupabaseDataSource()) {
    await Promise.all(kits.map(async (kit) => {
      await updatePartKit(kit.id, { pecas: kit.pecas });
    }));
  } else {
    persistPartKits(kits);
  }
}

export async function saveReport(report: Partial<Report>): Promise<Report> {
  const activeUser = getCurrentUser();
  const now = new Date();
  const nextParts = Array.isArray(report.pecas) ? report.pecas : [];
  const kitsSnapshot = clonePartKits(await getPartKits());

  let previousParts: ReportPart[] = [];
  if (report.id) {
    const existing = await getReportById(report.id);
    previousParts = Array.isArray(existing?.pecas) ? existing!.pecas : [];
  }

  if (previousParts.length > 0) {
    applyKitStockChange(kitsSnapshot, previousParts, 1);
  }
  applyKitStockChange(kitsSnapshot, nextParts, -1);
  await persistKitStockChanges(kitsSnapshot);

  const payload = {
    numero: report.numero || '',
    dataAbertura: report.dataAbertura || now.toISOString().split('T')[0],
    horaAbertura: report.horaAbertura || now.toTimeString().slice(0, 5),
    tecnicoId: report.tecnicoId || activeUser.id,
    tecnicoNome: report.tecnicoNome || activeUser.nome,
    tipoManutencao: report.tipoManutencao || 'corretiva',
    clienteId: report.clienteId || '',
    clienteNome: report.clienteNome || '',
    equipamentoId: report.equipamentoId || '',
    equipamentoDescricao: report.equipamentoDescricao || '',
    numeroSerie: report.numeroSerie || '',
    problemaRelatado: report.problemaRelatado || '',
    diagnostico: report.diagnostico || '',
    servicoExecutado: report.servicoExecutado || '',
    pecas: nextParts,
    informacoesAdicionais: report.informacoesAdicionais || '',
    horasTrabalho: report.horasTrabalho ?? 0,
    deslocamentoIda: report.deslocamentoIda || '',
    deslocamentoVolta: report.deslocamentoVolta || '',
    checklistModelo: report.checklistModelo || null,
    checklistStatus: report.checklistStatus || 'pendente',
    checklistRespostas: report.checklistRespostas || [],
    checklistObservacoesGerais: report.checklistObservacoesGerais || '',
    checklistCorretivas: report.checklistCorretivas || [],
    checklistLinkExterno: report.checklistLinkExterno || '',
    checklistArquivoNome: report.checklistArquivoNome || '',
    checklistArquivoUrl: report.checklistArquivoUrl || '',
    checklistCapaNome: report.checklistCapaNome || '',
    checklistCapaUrl: report.checklistCapaUrl || '',
    veiculoId: report.veiculoId || '',
    veiculoDescricao: report.veiculoDescricao || '',
    placa: report.placa || '',
    pedagio: report.pedagio ?? 0,
    refeicao: report.refeicao ?? 0,
    estadia: report.estadia ?? 0,
    atendimentos: report.atendimentos || [],
    status: report.status || 'rascunho',
    fotos: report.fotos || [],
    criadoPor: report.criadoPor || activeUser.nome,
    editadoPor: report.editadoPor || (report.id ? activeUser.nome : ''),
    dataFinalizacao: report.dataFinalizacao || '',
  } as any;

  if (hasSupabaseDataSource()) {
    try {
      if (report.id) {
        const { data, error } = await supabase.from('reports').update(payload).eq('id', report.id).select();
        if (error) throw error;
        if (Array.isArray(data) && data[0]) return normalizeReport(data[0], report.id);
      }

      const countResult = await supabase.from('reports').select('id', { count: 'exact', head: true });
      const nextNumber = typeof countResult.count === 'number' ? countResult.count + 1 : 1;
      payload.numero = payload.numero || `RAT-${now.getFullYear()}-${String(nextNumber).padStart(4, '0')}`;
      const { data, error } = await supabase.from('reports').insert([payload]).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) return normalizeReport(data[0], String(data[0].id || nextNumber));
    } catch {
      // fallback
    }
  }

  await delay(500);
  const activeUserName = activeUser.nome;

  if (report.id) {
    const index = mockReports.findIndex(r => r.id === report.id);
    if (index >= 0) {
      mockReports[index] = { ...mockReports[index], ...report, editadoPor: activeUserName } as Report;
      return mockReports[index];
    }
  }

  const newReport: Report = {
    id: String(mockReports.length + 1),
    numero: report.numero || `RAT-${now.getFullYear()}-${String(mockReports.length + 1).padStart(4, '0')}`,
    dataAbertura: report.dataAbertura || now.toISOString().split('T')[0],
    horaAbertura: report.horaAbertura || now.toTimeString().slice(0, 5),
    status: report.status || 'rascunho',
    fotos: report.fotos || [],
    pecas: nextParts,
    criadoPor: report.criadoPor || activeUserName,
    editadoPor: report.editadoPor || '',
    ...report,
  } as Report;

  mockReports.push(newReport);
  return newReport;
}

export async function getReportPhotos(reportId: string): Promise<ReportPhoto[]> {
  if (hasSupabaseDataSource()) {
    try {
      const { data, error } = await supabase.from('reports').select('fotos').eq('id', reportId).single();
      if (!error && data && Array.isArray((data as any).fotos)) {
        return ((data as any).fotos as any[]).map((photo, index) => normalizeReportPhoto(photo, String(index + 1), reportId));
      }
    } catch {
      // fallback
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const remotePhotos = await callAppsScript<RemoteReportPhotoInput[]>('getReportPhotos', { reportId });
      if (!Array.isArray(remotePhotos)) return [];
      return remotePhotos.map((photo, index) => normalizeReportPhoto(photo, String(index + 1), reportId));
    } catch {
      // fallback local
    }
  }

  await delay(200);
  return mockReports.find(report => report.id === reportId)?.fotos || [];
}

export async function uploadReportPhoto(
  reportId: string,
  photo: { dataUrl: string; categoria: ReportPhoto['categoria']; descricao: string },
): Promise<ReportPhoto> {
  if (hasSupabaseDataSource()) {
    const newPhoto = {
      id: String(Date.now()),
      relatorioId: reportId,
      url: photo.dataUrl,
      categoria: photo.categoria,
      descricao: photo.descricao,
    } as ReportPhoto;

    const existingReport = await getReportById(reportId);
    if (existingReport) {
      const updatedPhotos = [...(existingReport.fotos || []), newPhoto];
      await saveReport({ ...existingReport, fotos: updatedPhotos });
    }
    return newPhoto;
  }

  if (hasRemoteDataSource()) {
    const remotePhoto = await callAppsScript<RemoteReportPhotoInput>('uploadPhoto', {
      reportId,
      categoria: photo.categoria,
      descricao: photo.descricao,
      imageBase64: photo.dataUrl,
      mimeType: getMimeTypeFromDataUrl(photo.dataUrl),
    });

    return normalizeReportPhoto(remotePhoto, String(Date.now()), reportId);
  }

  await delay(200);
  return {
    id: String(Date.now()),
    relatorioId: reportId,
    url: photo.dataUrl,
    categoria: photo.categoria,
    descricao: photo.descricao,
  };
}

export async function deleteReportPhoto(reportId: string, photoId: string, driveFileId?: string): Promise<void> {
  if (hasSupabaseDataSource()) {
    const existingReport = await getReportById(reportId);
    const updatedPhotos = (existingReport?.fotos || []).filter(photo => photo.id !== photoId);
    if (existingReport) {
      await saveReport({ ...existingReport, fotos: updatedPhotos });
    }
    return;
  }

  if (hasRemoteDataSource()) {
    await callAppsScript<null>('deletePhoto', { reportId, photoId, driveFileId });
  }

  const report = mockReports.find(item => item.id === reportId);
  if (report) {
    report.fotos = (report.fotos || []).filter(photo => photo.id !== photoId);
  }
}

export async function getUsers(): Promise<User[]> {
  if (hasSupabaseDataSource()) {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      if (Array.isArray(data)) return data.map((user: any, index: number) => normalizeUser(user, String(index + 1)));
    } catch {
      // fallback
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const remoteUsers = await callAppsScript<RemoteUserInput[]>('getUsers');
      if (Array.isArray(remoteUsers)) {
        return remoteUsers.map((user, index) => normalizeUser(user, String(index + 1)));
      }
    } catch {
      // fallback local
    }
  }

  await delay(300);
  return [...mockUsers];
}

export async function saveUser(user: Partial<User> & { password: string }): Promise<User> {
  if (getCurrentUser().perfil !== 'admin') {
    throw new Error('Apenas administradores podem cadastrar novos usuários.');
  }

  const normalizedEmail = normalizeEmail(user.email);
  if (!normalizedEmail) {
    throw new Error('E-mail é obrigatório.');
  }

  if (hasSupabaseDataSource()) {
    try {
      if (!user.password || user.password.length < 6) {
        throw new Error('Senha inválida. A senha deve ter pelo menos 6 caracteres.');
      }

      const senhaHash = await hashPassword(user.password);
      const payload = {
        nome: user.nome || '',
        email: (user.email || '').trim().toLowerCase(),
        perfil: normalizeLegacyUserRole(user.perfil),
        ativo: user.ativo ?? true,
        senha: senhaHash,
      } as any;

      const { data, error } = await supabase.from('users').insert([payload]).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) {
        const normalizedUser = normalizeUser(data[0], String(Date.now()));
        const existingIndex = mockUsers.findIndex(existingUser => existingUser.id === normalizedUser.id);
        if (existingIndex >= 0) {
          mockUsers[existingIndex] = normalizedUser;
        } else {
          mockUsers.unshift(normalizedUser);
        }
        if (user.password) mockUserPasswords[normalizedUser.id] = user.password;
        persistUsersAuthData();
        return normalizedUser;
      }
    } catch {
      // fallback
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const createdUser = await callAppsScript<RemoteUserInput>('saveUser', user);
      const normalizedUser = normalizeUser(createdUser, String(Date.now()));

      const existingIndex = mockUsers.findIndex(existingUser => existingUser.id === normalizedUser.id);
      if (existingIndex >= 0) {
        mockUsers[existingIndex] = normalizedUser;
      } else {
        mockUsers.unshift(normalizedUser);
      }

      if (user.password) {
        mockUserPasswords[normalizedUser.id] = user.password;
      }

      persistUsersAuthData();
      return normalizedUser;
    } catch {
      // fallback local
    }
  }

  await delay(500);

  if (!user.password || user.password.length < 6) {
    throw new Error('Senha inválida. A senha deve ter pelo menos 6 caracteres.');
  }

  if (!normalizedEmail) {
    throw new Error('E-mail é obrigatório.');
  }
  if (mockUsers.some(existingUser => existingUser.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Já existe um usuário cadastrado com este e-mail.');
  }

  const currentMaxId = mockUsers.reduce((max, u) => {
    const parsedId = Number.parseInt(u.id, 10);
    if (Number.isNaN(parsedId)) return max;
    return Math.max(max, parsedId);
  }, 0);

  const newUser: User = {
    id: String(currentMaxId + 1),
    nome: user.nome || '',
    email: normalizedEmail,
    perfil: normalizeLegacyUserRole(user.perfil),
    ativo: user.ativo ?? true,
  };

  mockUsers.unshift(newUser);
  mockUserPasswords[newUser.id] = user.password;
  persistUsersAuthData();
  return newUser;
}

export async function updateUser(
  userId: string,
  updates: Partial<User>,
  newPassword?: string,
): Promise<User | undefined> {
  if (updates.email) {
    updates.email = normalizeEmail(updates.email);
  }

  if (hasSupabaseDataSource()) {
    try {
      const payload = { ...updates } as any;
      if (typeof payload.email === 'string') payload.email = payload.email.trim().toLowerCase();
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error('Senha inválida. A senha deve ter pelo menos 6 caracteres.');
        }
        payload.senha = await hashPassword(newPassword);
      }

      const { data, error } = await supabase.from('users').update(payload).eq('id', userId).select();
      if (error) throw error;
      if (Array.isArray(data) && data[0]) {
        const normalizedUser = normalizeUser(data[0], userId);
        const existingIndex = mockUsers.findIndex(user => user.id === normalizedUser.id);
        if (existingIndex >= 0) mockUsers[existingIndex] = normalizedUser;
        if (newPassword) mockUserPasswords[userId] = newPassword;
        persistUsersAuthData();
        return normalizedUser;
      }
    } catch {
      // fallback
    }
  }

  if (hasRemoteDataSource()) {
    try {
      const updatedUser = await callAppsScript<RemoteUserInput | null>('updateUser', { userId, updates, newPassword });
      if (!updatedUser) return undefined;

      const normalizedUser = normalizeUser(updatedUser, userId);
      const existingIndex = mockUsers.findIndex(user => user.id === normalizedUser.id);
      if (existingIndex >= 0) {
        mockUsers[existingIndex] = normalizedUser;
      }

      if (newPassword) {
        mockUserPasswords[userId] = newPassword;
      }

      persistUsersAuthData();
      return normalizedUser;
    } catch {
      // fallback local
    }
  }

  await delay(500);

  const index = mockUsers.findIndex(user => user.id === userId);
  if (index < 0) return undefined;

  if (typeof updates.email === 'string') {
    const normalizedEmail = updates.email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('E-mail é obrigatório.');
    }

    const hasDuplicateEmail = mockUsers.some(
      existingUser => existingUser.id !== userId && existingUser.email.toLowerCase() === normalizedEmail,
    );
    if (hasDuplicateEmail) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    updates.email = normalizedEmail;
  }

  if (updates.perfil) {
    updates.perfil = normalizeLegacyUserRole(updates.perfil);
  }

  mockUsers[index] = { ...mockUsers[index], ...updates };

  if (newPassword) {
    if (newPassword.length < 6) {
      throw new Error('Senha inválida. A senha deve ter pelo menos 6 caracteres.');
    }
    mockUserPasswords[userId] = newPassword;
  }

  persistUsersAuthData();

  return mockUsers[index];
}

export async function setUserBlocked(userId: string, blocked: boolean): Promise<User | undefined> {
  if (hasSupabaseDataSource()) {
    return updateUser(userId, { ativo: !blocked });
  }

  if (hasRemoteDataSource()) {
    try {
      const updatedUser = await callAppsScript<RemoteUserInput | null>('setUserBlocked', { userId, blocked });
      if (!updatedUser) return undefined;

      const normalizedUser = normalizeUser(updatedUser, userId);
      const existingIndex = mockUsers.findIndex(user => user.id === normalizedUser.id);
      if (existingIndex >= 0) {
        mockUsers[existingIndex] = normalizedUser;
      }

      persistUsersAuthData();
      return normalizedUser;
    } catch {
      // fallback local
    }
  }

  return updateUser(userId, { ativo: !blocked });
}

export function getCurrentUser(): User {
  return getAuthenticatedUser() || currentUser;
}

export function getCurrentCNPJ(): string {
  return getRuntimeSettings().companyCnpj;
}

export async function searchReports(query: string): Promise<Report[]> {
  if (hasSupabaseDataSource()) {
    try {
      const q = query.trim();
      if (!q) return [];
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .or(
          `numero.ilike.%${q}%,clienteNome.ilike.%${q}%,numeroSerie.ilike.%${q}%,equipamentoDescricao.ilike.%${q}%`,
        )
        .limit(50);
      if (!error && Array.isArray(data)) {
        return data.map((report: any, index: number) => normalizeReport(report, String(index + 1)));
      }
    } catch {
      // fallback
    }
  }

  await delay(300);
  const q = query.toLowerCase();
  return mockReports.filter(r =>
    r.numero.toLowerCase().includes(q) ||
    r.clienteNome.toLowerCase().includes(q) ||
    r.numeroSerie.toLowerCase().includes(q) ||
    r.equipamentoDescricao.toLowerCase().includes(q)
  );
}
