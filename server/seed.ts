import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');

    // --- Users ---
    const adminPassword = await bcrypt.hash('admin123', 10);
    const operatorPassword = await bcrypt.hash('operador123', 10);

    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: adminPassword,
            fullName: 'Administrador do Sistema',
            role: 'ADMIN',
        },
    });

    const operador = await prisma.user.upsert({
        where: { username: 'operador' },
        update: {},
        create: {
            username: 'operador',
            password: operatorPassword,
            fullName: 'João Operador',
            role: 'OPERATOR',
        },
    });

    console.log('✅ Usuários criados:', admin.username, operador.username);

    // --- Products ---
    const products = [
        {
            name: 'Papel A4 Chamex',
            barcode: '7891011121314',
            quantity: 50,
            minStock: 20,
            location: 'Estante A1',
            category: 'Escritório',
            unitValue: 25.0,
        },
        {
            name: 'Caneta Esferográfica Azul',
            barcode: '7891011121315',
            quantity: 15,
            minStock: 30,
            location: 'Gaveta B2',
            category: 'Escritório',
            unitValue: 1.5,
        },
        {
            name: 'Cartucho Toner HP 85A',
            barcode: '7891011121316',
            quantity: 5,
            minStock: 5,
            location: 'Armário TI',
            category: 'Informática',
            unitValue: 150.0,
        },
        {
            name: 'Luvas de Proteção M',
            barcode: '7891011121317',
            quantity: 100,
            minStock: 50,
            location: 'Almoxarifado EPI',
            category: 'EPI',
            unitValue: 5.0,
        },
    ];

    for (const product of products) {
        const created = await prisma.product.upsert({
            where: { barcode: product.barcode },
            update: {},
            create: product,
        });

        // Create an initial ENTRADA movement so historical cost tracking
        // covers seeded products — unitCost is locked to unitValue at seed time.
        if (product.quantity > 0) {
            const exists = await prisma.stockMovement.findFirst({
                where: { productId: created.id, reason: 'Estoque inicial' },
            });
            if (!exists) {
                await prisma.stockMovement.create({
                    data: {
                        productId: created.id,
                        type: 'ENTRADA',
                        quantity: product.quantity,
                        unitCost: product.unitValue,
                        reason: 'Estoque inicial',
                        userId: admin.id,
                        userName: admin.fullName,
                    },
                });
            }
        }
    }

    console.log('✅ Produtos e movimentações iniciais criados:', products.length);

    // --- Assets ---
    const assets = [
        {
            assetTag: 'PAT-001023',
            serialNumber: 'SN-DELL-998877',
            name: 'Notebook Dell Latitude',
            description: 'Notebook para desenvolvimento',
            acquisitionDate: new Date('2023-01-15'),
            purchaseValue: 5500.0,
            location: 'TI - Sala 1',
            status: 'IN_USE' as const,
            usefulLifeYears: 5,
        },
        {
            assetTag: 'PAT-001024',
            serialNumber: 'SN-LG-112233',
            name: 'Monitor LG 29 Ultrawide',
            description: 'Monitor principal',
            acquisitionDate: new Date('2023-02-20'),
            purchaseValue: 1200.0,
            location: 'TI - Sala 1',
            status: 'IN_USE' as const,
            usefulLifeYears: 5,
        },
        {
            assetTag: 'PAT-000500',
            serialNumber: 'SN-HERMAN-55',
            name: 'Cadeira Ergônomica',
            description: 'Cadeira Presidente',
            acquisitionDate: new Date('2021-06-10'),
            purchaseValue: 2500.0,
            location: 'Diretoria',
            status: 'MAINTENANCE' as const,
            usefulLifeYears: 10,
        },
    ];

    for (const asset of assets) {
        await prisma.asset.upsert({
            where: { assetTag: asset.assetTag },
            update: {},
            create: asset,
        });
    }

    console.log('✅ Ativos criados:', assets.length);

    // --- Initial Audit Logs ---
    await prisma.auditLog.createMany({
        data: [
            {
                userId: admin.id,
                userName: admin.fullName,
                action: 'CREATE',
                targetType: 'ASSET',
                details: 'Cadastro inicial do ativo PAT-001023',
            },
            {
                userId: operador.id,
                userName: operador.fullName,
                action: 'MOVEMENT_OUT',
                targetType: 'PRODUCT',
                details: 'Retirada de 5 unidades para o Setor Financeiro',
            },
        ],
    });

    console.log('✅ Logs de auditoria criados');
    console.log('🎉 Seed concluído com sucesso!');
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
