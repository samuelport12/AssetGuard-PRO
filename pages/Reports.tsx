import React, { useState, useEffect, useCallback } from 'react';
import { dataService } from '../services/DataService';
import { FileText, FileSpreadsheet, Loader2, Calendar, TrendingDown, Search, BarChart3, Package } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface DepartmentRow {
    departmentId: string;
    departmentName: string;
    totalEntradas: number;
    totalSaidas: number;
    totalEntryCost: number;
}

interface TopConsumedRow {
    productId: string;
    productName: string;
    totalSaidas: number;
}

interface MovementRow {
    date: string;
    productName: string;
    barcode: string;
    quantity: number;
    type: string;
    departmentName: string;
    userName: string;
    reason: string;
}

function formatDate(isoStr: string): string {
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR');
}

function formatDatetime(isoStr: string): string {
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getDefaultDates() {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    const start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end,
    };
}

const Reports: React.FC = () => {
    const defaults = getDefaultDates();
    const [startDate, setStartDate] = useState(defaults.startDate);
    const [endDate, setEndDate] = useState(defaults.endDate);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [byDepartment, setByDepartment] = useState<DepartmentRow[]>([]);
    const [topConsumed, setTopConsumed] = useState<TopConsumedRow[]>([]);
    const [movements, setMovements] = useState<MovementRow[]>([]);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);

    const loadReport = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await dataService.getConsumptionReport(startDate, endDate);
            setByDepartment(data.byDepartment);
            setTopConsumed(data.topConsumed);
            setMovements(data.movements);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar relatório');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadReport();
    }, []);

    // ---------- PDF Export ----------

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Header with logo
            doc.setFillColor(30, 41, 59); // slate-800
            doc.rect(0, 0, pageWidth, 40, 'F');

            // Logo box
            doc.setFillColor(59, 130, 246); // blue-500
            doc.roundedRect(14, 10, 20, 20, 3, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('AG', 18.5, 23);

            // Title
            doc.setFontSize(18);
            doc.text('AssetGuard Pro', 40, 20);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Relatório de Consumo por Setor', 40, 28);

            // Period
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 40, 35);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 35, { align: 'right' });

            let yPos = 50;

            // Section 1: Consumption by Department
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('Consumo por Setor', 14, yPos);
            yPos += 2;

            if (byDepartment.length > 0) {
                autoTable(doc, {
                    startY: yPos,
                    head: [['Setor', 'Entradas', 'Saídas', 'Saldo', 'Custo Entradas']],
                    body: byDepartment.map(row => [
                        row.departmentName,
                        String(row.totalEntradas),
                        String(row.totalSaidas),
                        String(row.totalEntradas - row.totalSaidas),
                        formatCurrency(row.totalEntryCost),
                    ]),
                    foot: [[
                        'TOTAL',
                        String(byDepartment.reduce((a, r) => a + r.totalEntradas, 0)),
                        String(byDepartment.reduce((a, r) => a + r.totalSaidas, 0)),
                        String(byDepartment.reduce((a, r) => a + (r.totalEntradas - r.totalSaidas), 0)),
                        formatCurrency(totalEntryCost),
                    ]],
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 9 },
                    bodyStyles: { fontSize: 9 },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    margin: { left: 14, right: 14 },
                });
                yPos = (doc as any).lastAutoTable.finalY + 14;
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text('Nenhuma movimentação no período selecionado.', 14, yPos + 8);
                yPos += 20;
            }

            // Section 2: Top 10 Most Consumed
            if (topConsumed.length > 0) {
                // Check if we need a new page
                if (yPos > 220) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setTextColor(30, 41, 59);
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.text('Top 10 Itens Mais Consumidos', 14, yPos);
                yPos += 2;

                autoTable(doc, {
                    startY: yPos,
                    head: [['#', 'Produto', 'Total Saídas']],
                    body: topConsumed.map((row, i) => [
                        String(i + 1),
                        row.productName,
                        String(row.totalSaidas),
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 9 },
                    bodyStyles: { fontSize: 9 },
                    alternateRowStyles: { fillColor: [254, 242, 242] },
                    margin: { left: 14, right: 14 },
                    columnStyles: {
                        0: { cellWidth: 15, halign: 'center' },
                        2: { cellWidth: 30, halign: 'center' },
                    },
                });
            }

            doc.save(`relatorio_consumo_${startDate}_${endDate}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
        } finally {
            setExportingPdf(false);
        }
    };

    // ---------- Excel Export ----------

    const handleExportExcel = async () => {
        setExportingExcel(true);
        try {
            const wsData = [
                ['Data', 'Item', 'Código', 'Quantidade', 'Tipo', 'Setor', 'Usuário', 'Motivo'],
                ...movements.map(m => [
                    formatDatetime(m.date),
                    m.productName,
                    m.barcode,
                    m.quantity,
                    m.type === 'ENTRADA' ? 'Entrada' : 'Saída',
                    m.departmentName,
                    m.userName,
                    m.reason,
                ]),
            ];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Column widths
            ws['!cols'] = [
                { wch: 18 }, // Data
                { wch: 30 }, // Item
                { wch: 16 }, // Código
                { wch: 12 }, // Quantidade
                { wch: 10 }, // Tipo
                { wch: 20 }, // Setor
                { wch: 20 }, // Usuário
                { wch: 30 }, // Motivo
            ];

            XLSX.utils.book_append_sheet(wb, ws, 'Movimentações');

            // Also add department summary sheet
            const deptData = [
                ['Setor', 'Entradas', 'Saídas', 'Saldo', 'Custo Entradas'],
                ...byDepartment.map(r => [r.departmentName, r.totalEntradas, r.totalSaidas, r.totalEntradas - r.totalSaidas, r.totalEntryCost]),
            ];
            const wsDept = XLSX.utils.aoa_to_sheet(deptData);
            wsDept['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, wsDept, 'Consumo por Setor');

            XLSX.writeFile(wb, `movimentacoes_${startDate}_${endDate}.xlsx`);
        } catch (err) {
            console.error('Excel export error:', err);
        } finally {
            setExportingExcel(false);
        }
    };

    // ---------- Totals ----------

    const totalEntradas = byDepartment.reduce((acc, r) => acc + r.totalEntradas, 0);
    const totalSaidas = byDepartment.reduce((acc, r) => acc + r.totalSaidas, 0);
    const totalEntryCost = byDepartment.reduce((acc, r) => acc + r.totalEntryCost, 0);

    function formatCurrency(value: number): string {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Relatórios</h2>
                    <p className="text-sm text-slate-500 mt-1">Relatório de consumo e movimentação por setor</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportPdf}
                        disabled={exportingPdf || loading || movements.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        {exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                        Exportar PDF
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={exportingExcel || loading || movements.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        {exportingExcel ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                        Exportar Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            <Calendar size={12} className="inline mr-1" />
                            Data Início
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                            <Calendar size={12} className="inline mr-1" />
                            Data Fim
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={loadReport}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm font-semibold"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Buscar
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {!loading && !error && movements.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 rounded-lg">
                                <BarChart3 size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">Total Entradas</p>
                                <p className="text-2xl font-bold text-slate-800">{totalEntradas.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-50 rounded-lg">
                                <TrendingDown size={20} className="text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">Total Saídas</p>
                                <p className="text-2xl font-bold text-slate-800">{totalSaidas.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-50 rounded-lg">
                                <Package size={20} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">Movimentações</p>
                                <p className="text-2xl font-bold text-slate-800">{movements.length.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-50 rounded-lg">
                                <BarChart3 size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">Custo Entradas</p>
                                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalEntryCost)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                    Erro: {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Carregando relatório...
                </div>
            )}

            {/* Department Table */}
            {!loading && !error && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                            Consumo por Setor
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Período: {formatDate(startDate)} a {formatDate(endDate)}
                        </p>
                    </div>

                    {byDepartment.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            Nenhuma movimentação encontrada no período selecionado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                        <th className="px-6 py-4">Setor</th>
                                        <th className="px-6 py-4 text-center">Entradas</th>
                                        <th className="px-6 py-4 text-center">Saídas</th>
                                        <th className="px-6 py-4 text-center">Saldo</th>
                                        <th className="px-6 py-4 text-right">Custo Entradas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {byDepartment.map((row) => {
                                        const saldo = row.totalEntradas - row.totalSaidas;
                                        return (
                                            <tr key={row.departmentId} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-slate-900">{row.departmentName}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                        +{row.totalEntradas}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                                        -{row.totalSaidas}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`font-bold text-sm ${saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {saldo >= 0 ? '+' : ''}{saldo}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-medium text-sm text-slate-700">{formatCurrency(row.totalEntryCost)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-100 font-bold text-slate-700">
                                        <td className="px-6 py-3 text-sm">TOTAL</td>
                                        <td className="px-6 py-3 text-center text-sm text-blue-700">{totalEntradas}</td>
                                        <td className="px-6 py-3 text-center text-sm text-red-700">{totalSaidas}</td>
                                        <td className="px-6 py-3 text-center text-sm">
                                            <span className={totalEntradas - totalSaidas >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                {totalEntradas - totalSaidas >= 0 ? '+' : ''}{totalEntradas - totalSaidas}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right text-sm">{formatCurrency(totalEntryCost)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Top Consumed */}
            {!loading && !error && topConsumed.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                            Top 10 Itens Mais Consumidos
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                                    <th className="px-6 py-4 w-12 text-center">#</th>
                                    <th className="px-6 py-4">Produto</th>
                                    <th className="px-6 py-4 text-center">Total Saídas</th>
                                    <th className="px-6 py-4" style={{ width: '40%' }}>Proporção</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {topConsumed.map((row, i) => {
                                    const maxSaidas = topConsumed[0]?.totalSaidas || 1;
                                    const pct = (row.totalSaidas / maxSaidas) * 100;
                                    return (
                                        <tr key={row.productId} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                                                        i === 1 ? 'bg-slate-100 text-slate-600 border border-slate-300' :
                                                            i === 2 ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                                                                'bg-slate-50 text-slate-500'
                                                    }`}>
                                                    {i + 1}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-900 text-sm">{row.productName}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="font-bold text-red-600 text-sm">{row.totalSaidas}</span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                    <div
                                                        className="h-2.5 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${pct}%`,
                                                            background: i === 0 ? 'linear-gradient(90deg, #ef4444, #f97316)' :
                                                                i < 3 ? 'linear-gradient(90deg, #f97316, #fbbf24)' :
                                                                    '#94a3b8',
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
