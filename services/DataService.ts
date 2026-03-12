import { Asset, AuditLog, Department, Product, User, DashboardStats, StockMovement, MovementsSummary } from "../types";

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('assetguard_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// This service now communicates with the Next.js backend API
class DataService {

  // --- Consumables / Products ---

  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    lowStock?: boolean;
  }): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    filterOptions: { categories: string[] };
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    if (params?.category) qs.set('category', params.category);
    if (params?.lowStock) qs.set('lowStock', 'true');
    const query = qs.toString();
    const response = await fetch(`${API_BASE}/products${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(product),
    });
    return handleResponse<Product>(response);
  }

  async updateProduct(id: string, product: Omit<Product, 'id'>): Promise<Product> {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(product),
    });
    return handleResponse<Product>(response);
  }

  async deleteProduct(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const response = await fetch(`${API_BASE}/products/barcode/${barcode}`, {
      headers: getAuthHeaders(),
    });
    if (response.status === 404) return undefined;
    return handleResponse<Product>(response);
  }

  async updateStock(
    productId: string,
    params: {
      type: 'ENTRADA' | 'SAIDA';
      quantity: number;
      unitCost?: number;
      reason: string;
      departmentId?: string;
      movementDate?: string;
    }
  ): Promise<{ product: Product; movement: { id: string; type: string; quantity: number; unitCost: number } }> {
    const response = await fetch(`${API_BASE}/products/${productId}/stock`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return handleResponse(response);
  }

  // --- Fixed Assets ---

  async getAssets(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    location?: string;
  }): Promise<{
    assets: Asset[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    filterOptions: {
      locations: string[];
      statusCounts: Record<string, number>;
      totalAssets: number;
    };
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.search) qs.set('search', params.search);
    if (params?.status) qs.set('status', params.status);
    if (params?.location) qs.set('location', params.location);
    const query = qs.toString();
    const response = await fetch(`${API_BASE}/assets${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }

  async addAsset(asset: Omit<Asset, 'id'>, user: User): Promise<Asset> {
    const response = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(asset),
    });
    return handleResponse<Asset>(response);
  }

  async updateAssetStatus(assetId: string, status: Asset['status'], user: User, location?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/assets/${assetId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, location }),
    });
    await handleResponse(response);
  }

  async updateAsset(id: string, asset: Omit<Asset, 'id'>): Promise<Asset> {
    const response = await fetch(`${API_BASE}/assets/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(asset),
    });
    return handleResponse<Asset>(response);
  }

  async deleteAsset(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/assets/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  }

  // --- Logs & Stats ---

  async getLogs(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    userName?: string;
    action?: string;
  }): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    filterOptions: { users: string[]; actions: string[] };
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    if (params?.userName) qs.set('userName', params.userName);
    if (params?.action) qs.set('action', params.action);
    const query = qs.toString();
    const response = await fetch(`${API_BASE}/logs${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    return handleResponse<DashboardStats>(response);
  }

  async getMovements(startDate?: string, endDate?: string): Promise<{ date: string; entradas: number; saidas: number; valorEntradas: number; valorSaidas: number }[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    const response = await fetch(`${API_BASE}/dashboard/movements${qs ? `?${qs}` : ''}`, {
      headers: getAuthHeaders(),
      cache: 'no-store',
    });
    return handleResponse<{ date: string; entradas: number; saidas: number; valorEntradas: number; valorSaidas: number }[]>(response);
  }

  // --- Users ---

  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<User[]>(response);
  }

  async createUser(data: { fullName: string; username: string; password: string; role: string }): Promise<User> {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<User>(response);
  }

  async updateUser(id: string, data: { fullName: string; username: string; role: string }): Promise<User> {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<User>(response);
  }

  async toggleUserStatus(id: string): Promise<User> {
    const response = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse<User>(response);
  }

  // --- Departments ---

  async getDepartments(): Promise<Department[]> {
    const response = await fetch(`${API_BASE}/departments`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Department[]>(response);
  }

  async createDepartment(data: { name: string; costCenterCode: string }): Promise<Department> {
    const response = await fetch(`${API_BASE}/departments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Department>(response);
  }

  async updateDepartment(id: string, data: { name: string; costCenterCode: string }): Promise<Department> {
    const response = await fetch(`${API_BASE}/departments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<Department>(response);
  }

  async toggleDepartmentStatus(id: string): Promise<Department> {
    const response = await fetch(`${API_BASE}/departments/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse<Department>(response);
  }

  // --- Stock Movements ---

  async getStockMovements(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    productId?: string;
    type?: string;
    supplierId?: string;
    search?: string;
    barcode?: string;
  }): Promise<{
    movements: StockMovement[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    summary: MovementsSummary;
    filterOptions: { suppliers: string[] };
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    if (params?.productId) qs.set('productId', params.productId);
    if (params?.type) qs.set('type', params.type);
    if (params?.supplierId) qs.set('supplierId', params.supplierId);
    if (params?.search) qs.set('search', params.search);
    if (params?.barcode) qs.set('barcode', params.barcode);
    const query = qs.toString();
    const response = await fetch(`${API_BASE}/movements${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }

  // --- Reports ---

  async getConsumptionReport(startDate?: string, endDate?: string, departmentIds?: string[]): Promise<{
    byDepartment: { departmentId: string; departmentName: string; totalEntradas: number; totalSaidas: number; totalExitCost: number }[];
    topConsumed: { productId: string; productName: string; totalSaidas: number }[];
    movements: {
      date: string;
      productName: string;
      barcode: string;
      quantity: number;
      type: string;
      departmentName: string;
      userName: string;
      reason: string;
    }[];
    departments: { id: string; name: string }[];
  }> {
    const qs = new URLSearchParams();
    if (startDate) qs.set('startDate', startDate);
    if (endDate) qs.set('endDate', endDate);
    if (departmentIds && departmentIds.length > 0) qs.set('departmentIds', departmentIds.join(','));
    const query = qs.toString();
    const response = await fetch(`${API_BASE}/reports/consumption${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
}

export const dataService = new DataService();