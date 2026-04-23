export type UserRole = 'admin' | 'gerente' | 'tecnico';

export type AccessLevel = 'admin' | 'gerente' | 'tecnico';

export type PermissionKey =
  | 'dashboard.view'
  | 'reports.view'
  | 'reports.create'
  | 'reports.edit'
  | 'qrcode.view'
  | 'search.view'
  | 'clients.view'
  | 'clients.manage'
  | 'equipments.view'
  | 'equipments.manage'
  | 'vehicles.view'
  | 'vehicles.manage'
  | 'kits.view'
  | 'kits.manage'
  | 'users.view'
  | 'users.manage'
  | 'settings.view'
  | 'settings.manage';

export type AccessControlConfig = {
  gerente: Record<PermissionKey, boolean>;
  tecnico: Record<PermissionKey, boolean>;
};

export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: UserRole;
  ativo: boolean;
}

export interface Client {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  contato: string;
  ativo: boolean;
}

export interface Equipment {
  id: string;
  clienteId: string;
  clienteNome: string;
  descricao: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  localizacao: string;
  qrCode: string;
  ativo: boolean;
}

export interface Vehicle {
  id: string;
  descricao: string;
  placa: string;
  modelo: string;
  ano: string;
  ativo: boolean;
}

export type ReportStatus = 'rascunho' | 'aberto' | 'em_andamento' | 'finalizado' | 'fechado';
export type MaintenanceType = 'corretiva' | 'preventiva' | 'instalacao' | 'treinamento' | 'vistoria' | 'garantia';
export type PhotoCategory = 'antes' | 'durante' | 'depois';
export type ChecklistTemplateKey = 'checklist_cu' | 'checklist_preventiva' | 'inspecao_geometria' | 'instrucao_geometrica';
export type ChecklistStatus = 'pendente' | 'em_preenchimento' | 'concluido';
export type ChecklistItemResult = 'pendente' | 'conforme' | 'nao_conforme' | 'na';
export type ChecklistBinaryChoice = 'sim' | 'nao';

export interface ChecklistAnswer {
  itemId: string;
  itemLabel: string;
  resultado: ChecklistItemResult;
  revisado?: ChecklistBinaryChoice;
  trocado?: ChecklistBinaryChoice;
  statusLivre?: string;
  valorEncontrado?: string;
  valorAtual?: string;
  observacao: string;
}

export interface ReportPhoto {
  id: string;
  relatorioId: string;
  url: string;
  categoria: PhotoCategory;
  descricao: string;
  driveFileId?: string;
  criadoEm?: string;
}

export interface ReportPart {
  id: string;
  descricao: string;
  quantidade: number;
  observacao: string;
  origem?: 'kit' | 'avulso';
  kitId?: string;
  kitNome?: string;
}

export interface PartKit {
  id: string;
  nome: string;
  descricao: string;
  tecnicoId: string;
  tecnicoNome: string;
  pecas: Array<{
    descricao: string;
    quantidade: number;
    observacao?: string;
  }>;
}

export interface Report {
  id: string;
  numero: string; // RAT-2025-0001
  dataAbertura: string;
  horaAbertura: string;
  tecnicoId: string;
  tecnicoNome: string;
  tipoManutencao: MaintenanceType;
  clienteId: string;
  clienteNome: string;
  equipamentoId: string;
  equipamentoDescricao: string;
  numeroSerie: string;
  problemaRelatado: string;
  diagnostico: string;
  servicoExecutado: string;
  pecas: ReportPart[];
  informacoesAdicionais: string;
  horasTrabalho: number;
  deslocamentoIda: string;
  deslocamentoVolta: string;
  checklistModelo?: ChecklistTemplateKey;
  checklistStatus?: ChecklistStatus;
  checklistRespostas?: ChecklistAnswer[];
  checklistObservacoesGerais?: string;
  checklistLinkExterno?: string;
  checklistArquivoNome?: string;
  checklistArquivoUrl?: string;
  checklistCapaNome?: string;
  checklistCapaUrl?: string;
  veiculoId: string;
  veiculoDescricao: string;
  placa: string;
  pedagio: number;
  refeicao: number;
  estadia: number;
  status: ReportStatus;
  fotos: ReportPhoto[];
  criadoPor: string;
  editadoPor: string;
  dataFinalizacao?: string;
}

export interface EquipmentHistory {
  relatorioNumero: string;
  data: string;
  tecnico: string;
  problema: string;
  servico: string;
  status: ReportStatus;
}

export interface Company {
  id: string;
  cnpj: string;
  nome: string;
  nomeFantasia: string;
  ativo: boolean;
}

export function formatCNPJ(cnpj: string): string {
  const clean = (cnpj || '').replace(/\D/g, '');
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function validateCNPJ(cnpj: string): boolean {
  const clean = (cnpj || '').replace(/\D/g, '');
  if (clean.length !== 14) return false;
  
  let size = clean.length - 2;
  let numbers = clean.substring(0, size);
  const digits = clean.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = clean.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === Number(digits.charAt(1));
}
