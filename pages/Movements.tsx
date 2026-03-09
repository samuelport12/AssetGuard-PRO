import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  Search,
  X,
  Hash,
  Package,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import { dataService } from '../services/DataService';
import { StockMovement, MovementsSummary } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const fmtDateShort = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getDefaultDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
    }}>
      <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em' }}>
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: entry.color, display: 'inline-block' }} />
          <span style={{ color: '#e2e8f0', fontSize: 12 }}>
            {entry.name === 'entradas' ? 'Entradas' : 'Saídas'}:{' '}
            <strong style={{ color: '#fff' }}>{entry.value} un.</strong>
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const Movements: React.FC = () => {
  const defaults = getDefaultDates();

  // Filters
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [debouncedBarcode, setDebouncedBarcode] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [supplierId, setSupplierId] = useState('');

  // Data
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<MovementsSummary>({
    totalEntradas: 0,
    totalSaidas: 0,
    totalSpent: 0,
    avgUnitCost: 0,
  });
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Product detail panel
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);

  // Debounce
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(searchDebounce.current);
  }, [search]);

  const barcodeDebounce = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(barcodeDebounce.current);
    barcodeDebounce.current = setTimeout(() => setDebouncedBarcode(barcodeSearch), 400);
    return () => clearTimeout(barcodeDebounce.current);
  }, [barcodeSearch]);

  // Fetch all movements for chart (high limit)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await dataService.getStockMovements({
        limit: 500,
        startDate,
        endDate,
        search: debouncedSearch || undefined,
        barcode: debouncedBarcode || undefined,
        type: typeFilter || undefined,
        supplierId: supplierId || undefined,
      });
      setMovements(result.movements);
      setTotal(result.total);
      setSummary(result.summary);
      if (result.filterOptions.suppliers.length > 0) {
        setSuppliers(result.filterOptions.suppliers);
      }
    } catch (err) {
      console.error('Failed to load movements:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, debouncedSearch, debouncedBarcode, typeFilter, supplierId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clearFilters = () => {
    setSearch('');
    setBarcodeSearch('');
    setTypeFilter('');
    setSupplierId('');
  };

  // Open product detail panel
  const handleProductClick = async (productId: string, productName: string) => {
    setSelectedProduct({ id: productId, name: productName });
    setPanelLoading(true);
    try {
      const result = await dataService.getStockMovements({
        productId,
        startDate,
        endDate,
        limit: 500,
      });
      setProductMovements(result.movements);
    } catch (err) {
      console.error('Failed to load product movements:', err);
    } finally {
      setPanelLoading(false);
    }
  };

  // ── Aggregate by day for main chart ──────────────────────────────────────
  const chartData = useMemo(() => {
    const byDay: Record<string, { date: string; entradas: number; saidas: number }> = {};

    // Build full date range skeleton
    if (startDate && endDate) {
      const cur = new Date(startDate + 'T12:00:00');
      const end = new Date(endDate + 'T12:00:00');
      while (cur <= end) {
        const key = cur.toISOString().split('T')[0];
        byDay[key] = { date: fmtDateShort(cur.toISOString()), entradas: 0, saidas: 0 };
        cur.setDate(cur.getDate() + 1);
      }
    }

    movements.forEach((m) => {
      const key = m.createdAt.split('T')[0];
      if (!byDay[key]) {
        byDay[key] = { date: fmtDateShort(m.createdAt), entradas: 0, saidas: 0 };
      }
      if (m.type === 'ENTRADA') byDay[key].entradas += m.quantity;
      else byDay[key].saidas += m.quantity;
    });

    return Object.keys(byDay)
      .sort()
      .map((k) => byDay[k]);
  }, [movements, startDate, endDate]);

  // ── Top products by total movement ───────────────────────────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; entradas: number; saidas: number }> = {};
    movements.forEach((m) => {
      if (!map[m.productId]) map[m.productId] = { name: m.productName, entradas: 0, saidas: 0 };
      if (m.type === 'ENTRADA') map[m.productId].entradas += m.quantity;
      else map[m.productId].saidas += m.quantity;
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v, total: v.entradas + v.saidas }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [movements]);

  // ── Product panel chart data ──────────────────────────────────────────────
  const priceEvolution = productMovements
    .filter((m) => m.type === 'ENTRADA')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => ({ date: fmtDate(m.createdAt), unitCost: m.unitCost }));

  const entradasSorted = productMovements
    .filter((m) => m.type === 'ENTRADA')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let priceVariation: number | null = null;
  if (entradasSorted.length >= 2) {
    const first = entradasSorted[0].unitCost;
    const last = entradasSorted[entradasSorted.length - 1].unitCost;
    priceVariation = ((last - first) / first) * 100;
  }

  const hasActiveFilters = search || barcodeSearch || typeFilter || supplierId;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Movimentações</h1>
        <p className="text-slate-500 text-sm mt-1">Visão gráfica de entradas e saídas de estoque</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Data Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Data Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Produto (nome)</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Código (barcode)</label>
          <div className="relative">
            <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ex: 7891234..."
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="ENTRADA">Apenas Entradas</option>
            <option value="SAIDA">Apenas Saídas</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fornecedor</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={13} /> Limpar filtros
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Entradas</p>
            <p className="text-xl font-bold text-slate-800">{summary.totalEntradas.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-slate-400">unidades no período</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingDown size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Saídas</p>
            <p className="text-xl font-bold text-slate-800">{summary.totalSaidas.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-slate-400">unidades no período</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <DollarSign size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Gasto</p>
            <p className="text-xl font-bold text-slate-800">{fmtCurrency(summary.totalSpent)}</p>
            <p className="text-xs text-slate-400">em entradas</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <BarChart2 size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Custo Médio Unit.</p>
            <p className="text-xl font-bold text-slate-800">{fmtCurrency(summary.avgUnitCost)}</p>
            <p className="text-xs text-slate-400">por unidade (entradas)</p>
          </div>
        </div>
      </div>

      {/* Chart + side panel layout */}
      <div className="flex gap-6 items-start">

        {/* Main area (chart + top products) */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">

          {/* Smooth area chart */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-700">Movimentações por Dia</h2>
                {!loading && (
                  <p className="text-xs text-slate-400 mt-0.5">{total} registros no período</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                  Entradas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                  Saídas
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24 text-slate-400">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Carregando...</p>
                </div>
              </div>
            ) : chartData.length === 0 || movements.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-slate-400">
                <div className="text-center">
                  <Package size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma movimentação encontrada</p>
                </div>
              </div>
            ) : (
              <div className="px-2 pt-4 pb-2">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5 }}
                    />
                    <Area
                      type="monotoneX"
                      dataKey="entradas"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      fill="url(#gradEntradas)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#34d399', strokeWidth: 0 }}
                    />
                    <Area
                      type="monotoneX"
                      dataKey="saidas"
                      stroke="#fb7185"
                      strokeWidth={2.5}
                      fill="url(#gradSaidas)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#fb7185', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Products table */}
          {!loading && topProducts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">Produtos com Mais Movimentação</h2>
                <p className="text-xs text-slate-400 mt-0.5">Clique no produto para ver detalhes</p>
              </div>
              <div className="divide-y divide-slate-50">
                {topProducts.map((p, i) => {
                  const maxTotal = topProducts[0].total;
                  const pct = maxTotal > 0 ? (p.total / maxTotal) * 100 : 0;
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProductClick(p.id, p.name)}
                      className={`w-full px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left ${isSelected ? 'bg-blue-50/60' : ''}`}
                    >
                      <span className="text-xs font-bold text-slate-300 w-4 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                          {p.name}
                        </p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                        <div className="text-center">
                          <p className="font-semibold text-emerald-600">{p.entradas.toLocaleString('pt-BR')}</p>
                          <p className="text-slate-400">entradas</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-rose-500">{p.saidas.toLocaleString('pt-BR')}</p>
                          <p className="text-slate-400">saídas</p>
                        </div>
                        <div className="text-center min-w-[52px]">
                          <p className="font-bold text-slate-700">{p.total.toLocaleString('pt-BR')}</p>
                          <p className="text-slate-400">total</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Product Detail Panel */}
        {selectedProduct && (
          <div className="w-96 flex-shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col sticky top-0">
            {/* Panel header */}
            <div className="px-4 py-4 border-b border-slate-100 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-700 text-sm leading-tight">{selectedProduct.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Detalhes do produto no período</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                <X size={15} />
              </button>
            </div>

            {panelLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Carregando...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[70vh]">
                {/* Price variation badge */}
                {priceVariation !== null && (
                  <div className="px-4 pt-4">
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${priceVariation >= 0
                        ? 'bg-red-50 text-red-700'
                        : 'bg-green-50 text-green-700'
                        }`}
                    >
                      {priceVariation >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                      Variação de preço:{' '}
                      {priceVariation >= 0 ? '+' : ''}
                      {priceVariation.toFixed(1)}%
                    </div>
                  </div>
                )}

                {/* Price evolution chart */}
                {priceEvolution.length >= 2 ? (
                  <div className="px-4 pt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Evolução do Preço (Entradas)
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={priceEvolution} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                          width={52}
                        />
                        <RechartsTooltip
                          formatter={(v: number) => [fmtCurrency(v), 'Custo Unit.']}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="unitCost"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : priceEvolution.length === 1 ? (
                  <div className="px-4 pt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Custo Unitário
                    </p>
                    <p className="text-2xl font-bold text-slate-700">{fmtCurrency(priceEvolution[0].unitCost)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Apenas uma entrada no período</p>
                  </div>
                ) : null}

                {/* Mini timeline */}
                <div className="px-4 pt-4 pb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Movimentações no Período ({productMovements.length})
                  </p>
                  {productMovements.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhuma movimentação</p>
                  ) : (
                    <div className="space-y-2">
                      {productMovements.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-start justify-between p-3 rounded-lg bg-slate-50 gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              {m.type === 'ENTRADA' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                                  ENTRADA
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                                  SAÍDA
                                </span>
                              )}
                              <span className="text-xs text-slate-400">{fmtDate(m.createdAt)}</span>
                            </div>
                            {m.reason && (
                              <p className="text-xs text-slate-500 truncate" title={m.reason}>
                                {m.reason}
                              </p>
                            )}
                            {m.departmentName && (
                              <p className="text-xs text-slate-400">{m.departmentName}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-slate-700">{m.quantity} un.</p>
                            {m.type === 'ENTRADA' && (
                              <p className="text-xs text-slate-500">{fmtCurrency(m.unitCost)}/un</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Movements;
