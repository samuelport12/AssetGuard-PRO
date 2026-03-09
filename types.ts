export type Role = 'ADMIN' | 'OPERATOR';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  minStock: number;
  location: string;
  category: string;
  unitValue: number;
}

export type AssetStatus = 'IN_USE' | 'MAINTENANCE' | 'DISPOSED' | 'AVAILABLE';

export interface Asset {
  id: string;
  assetTag: string; // Plaqueta
  serialNumber: string;
  name: string;
  description: string;
  acquisitionDate: string;
  purchaseValue: number;
  location: string;
  status: AssetStatus;
  usefulLifeYears: number;
}

export interface Department {
  id: string;
  name: string;
  costCenterCode: string;
  isActive: boolean;
  createdAt: string;
}

export type LogAction = 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVEMENT_IN' | 'MOVEMENT_OUT';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: LogAction;
  targetType: 'PRODUCT' | 'ASSET' | 'SYSTEM' | 'USER' | 'DEPARTMENT';
  targetId?: string;
  details: string;
}

export interface DashboardStats {
  totalStockValue: number;
  totalAssetsValue: number;
  lowStockCount: number;
  activeAssetsCount: number;
  totalProducts: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'ENTRADA' | 'SAIDA';
  quantity: number;
  unitCost: number;
  reason: string;
  departmentId?: string | null;
  departmentName?: string | null;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface MovementsSummary {
  totalEntradas: number;
  totalSaidas: number;
  totalSpent: number;
  avgUnitCost: number;
}