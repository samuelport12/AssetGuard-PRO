import { Asset, AuditLog, Product, User } from "./types";

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    username: 'admin',
    fullName: 'Administrador do Sistema',
    role: 'ADMIN'
  },
  {
    id: 'u2',
    username: 'operador',
    fullName: 'João Operador',
    role: 'OPERATOR'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Papel A4 Chamex',
    barcode: '7891011121314',
    quantity: 50,
    minStock: 20,
    location: 'Estante A1',
    category: 'Escritório',
    unitValue: 25.00
  },
  {
    id: 'p2',
    name: 'Caneta Esferográfica Azul',
    barcode: '7891011121315',
    quantity: 15,
    minStock: 30, // Low stock
    location: 'Gaveta B2',
    category: 'Escritório',
    unitValue: 1.50
  },
  {
    id: 'p3',
    name: 'Cartucho Toner HP 85A',
    barcode: '7891011121316',
    quantity: 5,
    minStock: 5,
    location: 'Armário TI',
    category: 'Informática',
    unitValue: 150.00
  },
  {
    id: 'p4',
    name: 'Luvas de Proteção M',
    barcode: '7891011121317',
    quantity: 100,
    minStock: 50,
    location: 'Almoxarifado EPI',
    category: 'EPI',
    unitValue: 5.00
  }
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'a1',
    assetTag: 'PAT-001023',
    serialNumber: 'SN-DELL-998877',
    name: 'Notebook Dell Latitude',
    description: 'Notebook para desenvolvimento',
    acquisitionDate: '2023-01-15',
    purchaseValue: 5500.00,
    location: 'TI - Sala 1',
    status: 'IN_USE',
    usefulLifeYears: 5
  },
  {
    id: 'a2',
    assetTag: 'PAT-001024',
    serialNumber: 'SN-LG-112233',
    name: 'Monitor LG 29 Ultrawide',
    description: 'Monitor principal',
    acquisitionDate: '2023-02-20',
    purchaseValue: 1200.00,
    location: 'TI - Sala 1',
    status: 'IN_USE',
    usefulLifeYears: 5
  },
  {
    id: 'a3',
    assetTag: 'PAT-000500',
    serialNumber: 'SN-HERMAN-55',
    name: 'Cadeira Ergônomica',
    description: 'Cadeira Presidente',
    acquisitionDate: '2021-06-10',
    purchaseValue: 2500.00,
    location: 'Diretoria',
    status: 'MAINTENANCE',
    usefulLifeYears: 10
  }
];

export const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'l1',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    userId: 'u1',
    userName: 'Administrador do Sistema',
    action: 'CREATE',
    targetType: 'ASSET',
    targetId: 'a1',
    details: 'Cadastro inicial do ativo PAT-001023'
  },
  {
    id: 'l2',
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    userId: 'u2',
    userName: 'João Operador',
    action: 'MOVEMENT_OUT',
    targetType: 'PRODUCT',
    targetId: 'p2',
    details: 'Retirada de 5 unidades para o Setor Financeiro'
  }
];