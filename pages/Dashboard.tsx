import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/DataService';
import { DashboardStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, Box, DollarSign, ArrowUpDown, Calendar, Search, Plus, Package, Monitor } from 'lucide-react';
import { chart, text, gradients, emerald, red, COLORS_DASHBOARD } from '../theme/colors';

interface MovementDay {
  date: string;
  entradas: number;
  saidas: number;
  valorEntradas: number;
  valorSaidas: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const formatDateLabel = (dateStr: string): string => {
  const monthlyMatch = dateStr.match(/^([A-Za-zÀ-ú]+)\/(.+)$/);
  if (monthlyMatch) {
    const shortName = monthlyMatch[1];
    const year = monthlyMatch[2];
    const idx = MONTH_SHORT.findIndex(m => m === shortName);
    return idx >= 0 ? `${MONTH_NAMES[idx]} / 20${year}` : dateStr;
  }
  const parts = dateStr.split('/');
  if (parts.length !== 2) return dateStr;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(day) || isNaN(month) || month < 1 || month > 12) return dateStr;
  return `${day} de ${MONTH_NAMES[month - 1]}`;
};

const formatTickDate = (dateStr: string): string => dateStr;

const processChartData = (data: MovementDay[], start: string, end: string): MovementDay[] => {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diffDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays <= 31) return data;

  const monthMap: Record<string, MovementDay> = {};
  for (const item of data) {
    const parts = item.date.split('/');
    if (parts.length !== 2) continue;
    const mm = parts[1];
    const monthNum = parseInt(mm, 10);
    const startYear = new Date(start).getFullYear();
    const endYear = new Date(end).getFullYear();
    const year = monthNum < new Date(start).getMonth() + 1 && endYear > startYear
      ? endYear : startYear;
    const shortYear = String(year).slice(-2);
    const key = `${mm}-${year}`;
    if (!monthMap[key]) {
      monthMap[key] = {
        date: `${MONTH_SHORT[monthNum - 1]}/${shortYear}`,
        entradas: 0, saidas: 0, valorEntradas: 0, valorSaidas: 0,
      };
    }
    monthMap[key].entradas += item.entradas;
    monthMap[key].saidas += item.saidas;
    monthMap[key].valorEntradas += item.valorEntradas ?? 0;
    monthMap[key].valorSaidas += item.valorSaidas ?? 0;
  }

  return Object.values(monthMap);
};

const CustomMovementTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 16,
      boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
      padding: '16px 20px',
      minWidth: 220,
    }}>
      <p style={{ fontWeight: 700, color: text.primary, fontSize: 13, marginBottom: 10, fontFamily: "'Outfit', sans-serif" }}>{formatDateLabel(label)}</p>
      {payload.map((entry: any) => {
        const valor = entry.dataKey === 'entradas' ? data?.valorEntradas : data?.valorSaidas;
        return (
          <div key={entry.dataKey} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.fill, flexShrink: 0 }} />
              <span style={{ color: text.secondary, fontSize: 12 }}>{entry.name}:</span>
              <strong style={{ color: entry.fill, fontSize: 12, marginLeft: 'auto' }}>{entry.value} unidades</strong>
            </div>
            {valor != null && valor > 0 && (
              <span style={{ color: text.muted, fontSize: 11, marginLeft: 18 }}>
                {formatBRL(valor)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, delay }) => (
  <div
    className="glass-card animate-in p-6"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94a3b8', letterSpacing: '0.06em' }}>{title}</p>
        <h3 className="text-2xl font-bold mt-2" style={{ color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>{value}</h3>
      </div>
      <div
        className="stat-icon-gradient"
        style={{ background: gradient }}
      >
        {icon}
      </div>
    </div>
  </div>
);

const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const getFirstDayOfMonth = () => {
  const d = new Date();
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
};
const getToday = () => toDateStr(new Date());

const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatBRL = (value: number) => brlFormatter.format(value);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [movements, setMovements] = useState<MovementDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const processedMovements = useMemo(
    () => processChartData(movements, startDate, endDate)
      .filter(d => d.entradas > 0 || d.saidas > 0),
    [movements, startDate, endDate]
  );

  const totalEntradas = processedMovements.reduce((sum, d) => sum + d.entradas, 0);
  const totalSaidas = processedMovements.reduce((sum, d) => sum + d.saidas, 0);
  const totalValorEntradas = processedMovements.reduce((sum, d) => sum + (d.valorEntradas ?? 0), 0);
  const totalValorSaidas = processedMovements.reduce((sum, d) => sum + (d.valorSaidas ?? 0), 0);

  const chartData = useMemo(() => [
    { name: 'Almoxarifado', value: stats?.totalStockValue ?? 0 },
    { name: 'Ativos Fixos', value: stats?.totalAssetsValue ?? 0 },
  ], [stats?.totalStockValue, stats?.totalAssetsValue]);

  const normalStockCount = (stats?.totalProducts ?? 0) - (stats?.lowStockCount ?? 0);
  const pieData = useMemo(() => [
    { name: 'Estoque Normal', value: normalStockCount },
    { name: 'Estoque Baixo', value: stats?.lowStockCount ?? 0 },
  ], [normalStockCount, stats?.lowStockCount]);

  const COLORS = useMemo(() => COLORS_DASHBOARD, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
        <span className="text-sm">Carregando dashboard...</span>
      </div>
    </div>
  );
  if (error) return <div className="flex items-center justify-center h-64 text-red-500">Erro: {error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 animate-in">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>Visão Geral</h2>
          <span className="text-xs" style={{ color: '#94a3b8' }}>Última atualização: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory')}
            className="btn-premium flex items-center gap-2.5"
            style={{
              background: 'linear-gradient(135deg, #4F6BFF 0%, #3b52db 100%)',
              border: 'none',
              borderRadius: 14,
              padding: '10px 20px 10px 12px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(79, 107, 255, 0.3)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Package size={16} color="#fff" />
            </span>
            Novo Item
            <Plus size={14} style={{ opacity: 0.7 }} />
          </button>

          <button
            onClick={() => navigate('/assets')}
            className="btn-premium flex items-center gap-2.5"
            style={{
              background: gradients.heroViolet,
              border: 'none',
              borderRadius: 14,
              padding: '10px 20px 10px 12px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Monitor size={16} color="#fff" />
            </span>
            Novo Ativo
            <Plus size={14} style={{ opacity: 0.7 }} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Valor em Estoque"
          value={`R$ ${stats.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign size={22} />}
          gradient="linear-gradient(135deg, #10b981, #059669)"
          delay={60}
        />
        <StatCard
          title="Valor em Ativos"
          value={`R$ ${stats.totalAssetsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={<TrendingUp size={22} />}
          gradient="linear-gradient(135deg, #4F6BFF, #3b52db)"
          delay={120}
        />
        <StatCard
          title="Alerta de Estoque"
          value={stats.lowStockCount}
          icon={<AlertTriangle size={22} />}
          gradient="linear-gradient(135deg, #ef4444, #dc2626)"
          delay={180}
        />
        <StatCard
          title="Ativos em Uso"
          value={stats.activeAssetsCount}
          icon={<Box size={22} />}
          gradient="linear-gradient(135deg, #8b5cf6, #6d28d9)"
          delay={240}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">
        <div className="glass-card animate-in p-6 h-96" style={{ animationDelay: '300ms' }}>
          <h3 className="text-base font-bold mb-6" style={{ color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>Distribuição Financeira</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tickFormatter={(v) => formatBRL(v)} width={105} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                formatter={(value: number) => formatBRL(value)}
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 14,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                }}
              />
              <Bar dataKey="value" fill={chart.primary} radius={[8, 8, 0, 0]} name="Valor Total (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card animate-in p-6 h-96" style={{ animationDelay: '360ms' }}>
          <h3 className="text-base font-bold mb-6" style={{ color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>Saúde do Estoque</h3>
          <div className="flex items-center justify-center h-full pb-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill={chart.tertiary}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: 14,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stock Movements Chart */}
      <div className="glass-card animate-in p-6" style={{ animationDelay: '420ms' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: 'rgba(79, 107, 255, 0.08)' }}>
              <ArrowUpDown size={20} style={{ color: '#4F6BFF' }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: '#1e293b', fontFamily: "'Outfit', sans-serif" }}>Movimentações do Estoque</h3>
              <p className="text-xs" style={{ color: '#94a3b8' }}>Entradas e saídas por período</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex flex-col items-end gap-0.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full status-dot-pulse" style={{ background: '#10b981' }} />
                <span style={{ color: '#475569', fontSize: 12 }}>Entradas: <strong style={{ color: '#059669' }}>{totalEntradas}</strong></span>
              </div>
              <span className="text-xs font-semibold" style={{ color: '#059669' }}>{formatBRL(totalValorEntradas)}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full status-dot-pulse" style={{ background: '#ef4444' }} />
                <span style={{ color: '#475569', fontSize: 12 }}>Saídas: <strong style={{ color: '#dc2626' }}>{totalSaidas}</strong></span>
              </div>
              <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>{formatBRL(totalValorSaidas)}</span>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-end gap-3 mb-6 p-3.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Data Início</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-white outline-none"
                style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10 }}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#94a3b8' }}>Data Fim</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-white outline-none"
                style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10 }}
              />
            </div>
          </div>
          <button
            onClick={() => loadMovements(startDate, endDate)}
            disabled={loadingMovements}
            className="btn-premium flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #4F6BFF, #3b52db)',
              borderRadius: 10,
              border: 'none',
              cursor: loadingMovements ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(79, 107, 255, 0.25)',
            }}
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
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
                cursor={{ fill: 'rgba(79, 107, 255, 0.04)' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Bar
                dataKey="entradas"
                name="Entradas"
                fill={emerald[500]}
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
                minPointSize={0}
              />
              <Bar
                dataKey="saidas"
                name="Saídas"
                fill={red[500]}
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