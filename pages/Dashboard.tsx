import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/DataService';
import { DashboardStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, Box, DollarSign, ArrowUpDown, Calendar, Search } from 'lucide-react';

interface MovementDay {
  date: string;
  entradas: number;
  saidas: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

// Tooltip label: converts "DD/MM" → "24 de Fevereiro" or "Mês/AA" → "Fevereiro/26"
const formatDateLabel = (dateStr: string): string => {
  // Monthly format: "Fev/26"
  const monthlyMatch = dateStr.match(/^([A-Za-zÀ-ú]+)\/(.+)$/);
  if (monthlyMatch) {
    const shortName = monthlyMatch[1];
    const year = monthlyMatch[2];
    const idx = MONTH_SHORT.findIndex(m => m === shortName);
    return idx >= 0 ? `${MONTH_NAMES[idx]} / 20${year}` : dateStr;
  }
  // Daily format: "DD/MM"
  const parts = dateStr.split('/');
  if (parts.length !== 2) return dateStr;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(day) || isNaN(month) || month < 1 || month > 12) return dateStr;
  return `${day} de ${MONTH_NAMES[month - 1]}`;
};

// Simple tick formatter — data already comes as DD/MM, just pass through
const formatTickDate = (dateStr: string): string => dateStr;

// Groups daily data into monthly buckets when the period is > 31 days
const processChartData = (data: MovementDay[], start: string, end: string): MovementDay[] => {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diffDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays <= 31) return data;

  // Group by MM key, produce "Mês/AA" labels
  const monthMap: Record<string, MovementDay> = {};
  for (const item of data) {
    const parts = item.date.split('/');
    if (parts.length !== 2) continue;
    const mm = parts[1]; // "02"

    // Determine year from the date range context
    const monthNum = parseInt(mm, 10);
    const startYear = new Date(start).getFullYear();
    const endYear = new Date(end).getFullYear();
    // Approximate: if month < start month and we span years, it's from endYear
    const year = monthNum < new Date(start).getMonth() + 1 && endYear > startYear
      ? endYear : startYear;
    const shortYear = String(year).slice(-2);

    const key = `${mm}-${year}`;
    if (!monthMap[key]) {
      monthMap[key] = {
        date: `${MONTH_SHORT[monthNum - 1]}/${shortYear}`,
        entradas: 0,
        saidas: 0,
      };
    }
    monthMap[key].entradas += item.entradas;
    monthMap[key].saidas += item.saidas;
  }

  return Object.values(monthMap);
};

const CustomMovementTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: '#fff', border: 'none', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', padding: '14px 18px', minWidth: 190 }}>
      <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, marginBottom: 10 }}>{formatDateLabel(label)}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.fill, flexShrink: 0 }} />
          <span style={{ color: '#64748b', fontSize: 12 }}>{entry.name}:</span>
          <strong style={{ color: entry.fill, fontSize: 12, marginLeft: 'auto' }}>{entry.value} unidades</strong>
        </div>
      ))}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} text-white`}>
        {icon}
      </div>
    </div>
  </div>
);

// Helper to get YYYY-MM-DD strings
const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const getFirstDayOfMonth = () => {
  const d = new Date();
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
};
const getToday = () => toDateStr(new Date());

// BRL currency formatter
const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatBRL = (value: number) => brlFormatter.format(value);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [movements, setMovements] = useState<MovementDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range for movements chart
  const [startDate, setStartDate] = useState(getFirstDayOfMonth);
  const [endDate, setEndDate] = useState(getToday);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const loadMovements = async (start: string, end: string) => {
    setLoadingMovements(true);
    try {
      const data = await dataService.getMovements(start, end);
      setMovements(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsData, movementsData] = await Promise.all([
          dataService.getDashboardStats(),
          dataService.getMovements(startDate, endDate),
        ]);
        setStats(statsData);
        setMovements(movementsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- All hooks and derived data MUST be above early returns ---
  const processedMovements = useMemo(
    () => processChartData(movements, startDate, endDate)
      .filter(d => d.entradas > 0 || d.saidas > 0),
    [movements, startDate, endDate]
  );

  const totalEntradas = processedMovements.reduce((sum, d) => sum + d.entradas, 0);
  const totalSaidas = processedMovements.reduce((sum, d) => sum + d.saidas, 0);

  const chartData = useMemo(() => [
    { name: 'Almoxarifado', value: stats?.totalStockValue ?? 0 },
    { name: 'Ativos Fixos', value: stats?.totalAssetsValue ?? 0 },
  ], [stats?.totalStockValue, stats?.totalAssetsValue]);

  const normalStockCount = (stats?.totalProducts ?? 0) - (stats?.lowStockCount ?? 0);
  const pieData = useMemo(() => [
    { name: 'Estoque Normal', value: normalStockCount },
    { name: 'Estoque Baixo', value: stats?.lowStockCount ?? 0 },
  ], [normalStockCount, stats?.lowStockCount]);

  const COLORS = useMemo(() => ['#3b82f6', '#ef4444'], []);

  // --- Early returns (safe — all hooks are above) ---
  if (loading) return <div className="flex items-center justify-center h-64 text-slate-500">Carregando dashboard...</div>;
  if (error) return <div className="flex items-center justify-center h-64 text-red-500">Erro: {error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
        <span className="text-sm text-slate-500">Última atualização: {new Date().toLocaleTimeString()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Valor em Estoque"
          value={`R$ ${stats.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign size={24} />}
          color="bg-emerald-500"
        />
        <StatCard
          title="Valor em Ativos"
          value={`R$ ${stats.totalAssetsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp size={24} />}
          color="bg-blue-500"
        />
        <StatCard
          title="Alerta de Estoque"
          value={stats.lowStockCount}
          icon={<AlertTriangle size={24} />}
          color="bg-red-500"
        />
        <StatCard
          title="Ativos em Uso"
          value={stats.activeAssetsCount}
          icon={<Box size={24} />}
          color="bg-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Distribuição Financeira</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => formatBRL(v)} width={105} />
              <Tooltip formatter={(value: number) => formatBRL(value)} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Valor Total (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Saúde do Estoque</h3>
          <div className="flex items-center justify-center h-full pb-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stock Movements Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <ArrowUpDown size={20} className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Movimentações do Estoque</h3>
              <p className="text-xs text-slate-500">Entradas e saídas por período</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Entradas: <strong className="text-emerald-600">{totalEntradas}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-600">Saídas: <strong className="text-red-600">{totalSaidas}</strong></span>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-end gap-3 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Data Início</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Data Fim</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              />
            </div>
          </div>
          <button
            onClick={() => loadMovements(startDate, endDate)}
            disabled={loadingMovements}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingMovements ? (
              <><Search size={14} className="animate-spin" /> Buscando...</>
            ) : (
              <><Search size={14} /> Aplicar</>
            )}
          </button>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedMovements} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tickFormatter={formatTickDate}
                minTickGap={15}
                height={35}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={35}
              />
              <Tooltip
                content={<CustomMovementTooltip />}
                cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Bar
                dataKey="entradas"
                name="Entradas"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
                minPointSize={0}
              />
              <Bar
                dataKey="saidas"
                name="Saídas"
                fill="#ef4444"
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
                minPointSize={0}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;