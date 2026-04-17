import { Client, Equipment, Vehicle, Report, User, PartKit } from './types';

export const mockUsers: User[] = [
  { id: '1', nome: 'Admin Sistema', email: 'admin@empresa.com', perfil: 'admin', ativo: true },
  { id: '4', nome: 'Suporte TI', email: 'suporte.ti@manutexcnc.com.br', perfil: 'admin', ativo: true },
  { id: '5', nome: 'Sanchez', email: 'sanchez@empresa.com', perfil: 'admin', ativo: true },
  { id: '2', nome: 'Carlos Silva', email: 'carlos@empresa.com', perfil: 'tecnico', ativo: true },
  { id: '3', nome: 'João Santos', email: 'joao@empresa.com', perfil: 'gerente', ativo: true },
];

export const mockClients: Client[] = [
  { id: '1', razaoSocial: 'Indústria ABC Ltda', nomeFantasia: 'ABC Máquinas', cnpj: '12.345.678/0001-90', endereco: 'Rua Industrial, 500', cidade: 'São Paulo', estado: 'SP', telefone: '(11) 3456-7890', email: 'contato@abc.com', contato: 'Roberto Lima', ativo: true },
  { id: '2', razaoSocial: 'Metalúrgica XYZ S/A', nomeFantasia: 'XYZ Metal', cnpj: '98.765.432/0001-10', endereco: 'Av. da Produção, 1200', cidade: 'Campinas', estado: 'SP', telefone: '(19) 2345-6789', email: 'contato@xyz.com', contato: 'Maria Souza', ativo: true },
];

export const mockEquipments: Equipment[] = [
  { id: '1', clienteId: '1', clienteNome: 'ABC Máquinas', descricao: 'Torno CNC Romi GL 240', marca: 'Romi', modelo: 'GL 240', numeroSerie: 'ROM-2023-0451', localizacao: 'Galpão A - Setor 3', qrCode: 'EQ-001', ativo: true },
  { id: '2', clienteId: '1', clienteNome: 'ABC Máquinas', descricao: 'Centro de Usinagem Haas VF-2', marca: 'Haas', modelo: 'VF-2', numeroSerie: 'HAS-2022-1287', localizacao: 'Galpão A - Setor 1', qrCode: 'EQ-002', ativo: true },
  { id: '3', clienteId: '2', clienteNome: 'XYZ Metal', descricao: 'Prensa Hidráulica Schuler 200T', marca: 'Schuler', modelo: '200T', numeroSerie: 'SCH-2021-0893', localizacao: 'Linha de Produção B', qrCode: 'EQ-003', ativo: true },
];

export const mockVehicles: Vehicle[] = [
  { id: '1', descricao: 'Fiorino Furgão', placa: 'ABC-1234', modelo: 'Fiat Fiorino', ano: '2022', ativo: true },
  { id: '2', descricao: 'Saveiro Cabine Dupla', placa: 'DEF-5678', modelo: 'VW Saveiro', ano: '2023', ativo: true },
];

export const mockPartKits: PartKit[] = [
  {
    id: '1',
    nome: 'Kit Preventivo Básico',
    descricao: 'Conjunto padrão para intervenções preventivas e inspeções leves.',
    tecnicoId: '2',
    tecnicoNome: 'Carlos Silva',
    pecas: [
      { descricao: 'Filtro de óleo', quantidade: 1, observacao: '' },
      { descricao: 'Correia industrial', quantidade: 1, observacao: '' },
      { descricao: 'Rolamento SKF 6205', quantidade: 2, observacao: '' },
    ],
  },
  {
    id: '2',
    nome: 'Kit Corretiva Pesada',
    descricao: 'Itens mais comuns para manutenção corretiva em campo.',
    tecnicoId: '3',
    tecnicoNome: 'João Santos',
    pecas: [
      { descricao: 'Sensor indutivo', quantidade: 1, observacao: '' },
      { descricao: 'Fusível 10A', quantidade: 2, observacao: '' },
      { descricao: 'Terminal elétrico', quantidade: 10, observacao: '' },
    ],
  },
];

export const mockReports: Report[] = [
  {
    id: '1', numero: 'RAT-2025-0001', dataAbertura: '2025-01-15', horaAbertura: '08:30',
    tecnicoId: '2', tecnicoNome: 'Carlos Silva', tipoManutencao: 'corretiva',
    clienteId: '1', clienteNome: 'ABC Máquinas', equipamentoId: '1',
    equipamentoDescricao: 'Torno CNC Romi GL 240', numeroSerie: 'ROM-2023-0451',
    problemaRelatado: 'Máquina apresentando vibração excessiva durante operação.',
    diagnostico: 'Rolamento do eixo principal desgastado.',
    servicoExecutado: 'Substituição do rolamento do eixo principal e alinhamento.',
    pecas: [{ id: '1', descricao: 'Rolamento SKF 6205', quantidade: 2, observacao: '', origem: 'kit', kitId: '1', kitNome: 'Kit Preventivo Básico' }],
    informacoesAdicionais: 'Recomendado manutenção preventiva em 90 dias.',
    horasTrabalho: 4, deslocamentoIda: '08:00', deslocamentoVolta: '17:00',
    veiculoId: '1', veiculoDescricao: 'Fiorino Furgão', placa: 'ABC-1234',
    pedagio: 25.50, refeicao: 35.00, estadia: 0,
    status: 'finalizado', fotos: [],
    criadoPor: 'Carlos Silva', editadoPor: 'Carlos Silva', dataFinalizacao: '2025-01-15',
  },
  {
    id: '2', numero: 'RAT-2025-0002', dataAbertura: '2025-01-20', horaAbertura: '09:00',
    tecnicoId: '2', tecnicoNome: 'Carlos Silva', tipoManutencao: 'preventiva',
    clienteId: '2', clienteNome: 'XYZ Metal', equipamentoId: '3',
    equipamentoDescricao: 'Prensa Hidráulica Schuler 200T', numeroSerie: 'SCH-2021-0893',
    problemaRelatado: 'Manutenção preventiva programada.',
    diagnostico: '', servicoExecutado: '',
    pecas: [], informacoesAdicionais: '',
    horasTrabalho: 0, deslocamentoIda: '', deslocamentoVolta: '',
    veiculoId: '', veiculoDescricao: '', placa: '',
    pedagio: 0, refeicao: 0, estadia: 0,
    status: 'rascunho', fotos: [],
    criadoPor: 'Carlos Silva', editadoPor: '',
  },
];

export const currentUser: User = mockUsers[1]; // Carlos Silva - técnico externo
