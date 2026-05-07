import { z } from 'zod';

// ==========================================
// 1. AUTH & USERS
// ==========================================

export const loginSchema = z.object({
    username: z.string().min(1, 'Username é obrigatório'),
    password: z.string().min(1, 'Senha é obrigatória'),
});

export const createUserSchema = z.object({
    fullName: z.string().min(1, 'Nome completo é obrigatório'),
    username: z.string().min(1, 'Username é obrigatório'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    role: z.enum(['ADMIN', 'OPERATOR']).optional(),
});

export const updateUserSchema = z.object({
    fullName: z.string().min(1, 'Nome completo é obrigatório'),
    username: z.string().min(1, 'Username é obrigatório'),
    role: z.enum(['ADMIN', 'OPERATOR']).optional(),
});

export const resetPasswordSchema = z.object({
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});



// ==========================================
// 2. DEPARTMENTS
// ==========================================

export const departmentSchema = z.object({
    name: z.string().min(1, 'Nome do setor é obrigatório'),
    costCenterCode: z.string().min(1, 'Código do centro de custo é obrigatório'),
});


// ==========================================
// 3. PRODUCTS & STOCK
// ==========================================

export const productCreateSchema = z.object({
    name: z.string().min(1, 'Nome do produto é obrigatório'),
    barcode: z.string().min(1, 'Código de barras é obrigatório'),
    quantity: z.number().int().min(0, 'Quantidade não pode ser negativa'),
    minStock: z.number().int().min(0, 'Estoque mínimo não pode ser negativo'),
    location: z.string().min(1, 'Localização é obrigatória'),
    category: z.string().min(1, 'Categoria é obrigatória'),
    unitValue: z.number().min(0, 'Valor unitário deve ser maior ou igual a zero'),
});

export const productUpdateSchema = z.object({
    name: z.string().min(1, 'Nome do produto é obrigatório'),
    barcode: z.string().min(1, 'Código de barras é obrigatório'),
    quantity: z.number().int().min(0, 'Quantidade não pode ser negativa'),
    minStock: z.number().int().min(0, 'Estoque mínimo não pode ser negativo'),
    location: z.string().min(1, 'Localização é obrigatória'),
    category: z.string().min(1, 'Categoria é obrigatória'),
});

export const stockMovementSchema = z.object({
    type: z.enum(['ENTRADA', 'SAIDA'], { message: 'Tipo inválido. Use ENTRADA ou SAIDA.' }),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero.'),
    unitCost: z.number().positive('Custo unitário inválido').optional(),
    reason: z.string().min(1, 'Motivo da movimentação é obrigatório'),
    departmentId: z.string().optional().nullable(),
    movementDate: z.string().or(z.date()).optional(),
}).refine((data) => {
    if (data.type === 'ENTRADA' && (!data.unitCost || data.unitCost <= 0)) {
        return false;
    }
    return true;
}, {
    message: 'Custo unitário deve ser maior que zero para ENTRADA.',
    path: ['unitCost'],
});


// ==========================================
// 4. ASSETS (Ativos) - [Item 4 Crítico]
// ==========================================

export const assetSchema = z.object({
    assetTag: z.string().min(1, 'Plaqueta (Asset Tag) é obrigatória'),
    serialNumber: z.string().min(1, 'Número de série é obrigatório'),
    name: z.string().min(1, 'Nome do ativo é obrigatório'),
    description: z.string().min(1, 'Descrição é obrigatória'),
    acquisitionDate: z.string().datetime({ message: 'Data de aquisição deve ser uma data ISO válida' }).or(z.date()),
    purchaseValue: z.number().min(0, 'Valor de compra não pode ser negativo'),
    location: z.string().min(1, 'Localização é obrigatória'),
    status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'DISPOSED']).optional(),
    usefulLifeYears: z.number().int().positive('Vida útil (anos) deve ser maior que zero'),
});
