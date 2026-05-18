import { Client, Equipment, Vehicle, Report, User, PartKit } from './types';

export const mockUsers: User[] = [
  { id: '1', nome: 'Sanchez', email: 'sanchez@empresa.com', perfil: 'admin', ativo: true },
];

export const mockClients: Client[] = [];

export const mockEquipments: Equipment[] = [];

export const mockVehicles: Vehicle[] = [];

export const mockPartKits: PartKit[] = [];

export const mockReports: Report[] = [];

export const currentUser: User = mockUsers[0];
