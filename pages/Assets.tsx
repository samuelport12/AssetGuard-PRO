import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dataService } from '../services/DataService';
import { Asset, AssetStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import BarcodeField from '../components/BarcodeField';
import { Search, Tag, Settings, Monitor, Trash2, X, Loader2, CheckCircle, AlertTriangle, Plus, Pencil, MapPin, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface AssetForm {
  assetTag: string;
  serialNumber: string;
  name: string;
  description: string;
  acquisitionDate: string;
  purchaseValue: string;
  location: string;
  status: string;
  usefulLifeYears: string;
}

const EMPTY_FORM: AssetForm = {
  assetTag: '',
  serialNumber: '',
  name: '',
  description: '',
  acquisitionDate: '',
  purchaseValue: '',
  location: '',
  status: 'AVAILABLE',
  usefulLifeYears: '',
};

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Disponível' },
  { value: 'IN_USE', label: 'Em Uso' },
  { value: 'MAINTENANCE', label: 'Manutenção' },
  { value: 'DISPOSED', label: 'Baixado' },
];

const PAGE_SIZE = 20;

const Assets: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [totalAssets, setTotalAssets] = useState(0);

  // Debounce search (500ms)
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AssetForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  const loadAssets = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.getAssets({
        page: targetPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: selectedStatus || undefined,
        location: selectedLocation || undefined,
      });
      setAssets(data.assets);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setLocationOptions(data.filterOptions.locations);
      setStatusCounts(data.filterOptions.statusCounts);
      setTotalAssets(data.filterOptions.totalAssets);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedStatus, selectedLocation]);

  // Load on mount and when filters change (reset to page 1)
  useEffect(() => {
    loadAssets(1);
  }, [loadAssets]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadAssets(p);
  };

  // Focus first input when modal opens
  useEffect(() => {
    if (showModal && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 150);
    }
  }, [showModal]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm && !deleting) {
          closeDeleteConfirm();
        } else if (showModal && !submitting) {
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal, submitting, showDeleteConfirm, deleting]);

  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'IN_USE': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">EM USO</span>;
      case 'MAINTENANCE': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">MANUTENÇÃO</span>;
      case 'DISPOSED': return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200">BAIXADO</span>;
      case 'AVAILABLE': return <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold border border-blue-200">DISPONÍVEL</span>;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.label || status;
  };

  // Generate page numbers
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // ---- Create / Edit Modal ----

  const openCreateModal = () => {
    setEditingAsset(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setShowModal(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    const dateStr = asset.acquisitionDate.includes('T')
      ? asset.acquisitionDate.split('T')[0]
      : asset.acquisitionDate;
    setForm({
      assetTag: asset.assetTag,
      serialNumber: asset.serialNumber,
      name: asset.name,
      description: asset.description,
      acquisitionDate: dateStr,
      purchaseValue: String(asset.purchaseValue),
      location: asset.location,
      status: asset.status,
      usefulLifeYears: String(asset.usefulLifeYears),
    });
    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditingAsset(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      closeModal();
    }
  };

  const updateField = (field: keyof AssetForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof AssetForm, string>> = {};

    if (!form.assetTag.trim()) errors.assetTag = 'Plaqueta é obrigatória';
    if (!form.serialNumber.trim()) errors.serialNumber = 'Número de série é obrigatório';
    if (!form.name.trim()) errors.name = 'Nome do ativo é obrigatório';
    if (!form.description.trim()) errors.description = 'Descrição é obrigatória';
    if (!form.location.trim()) errors.location = 'Localização é obrigatória';
    if (!form.acquisitionDate) errors.acquisitionDate = 'Data de aquisição é obrigatória';
    if (!form.status) errors.status = 'Selecione um status';

    const val = Number(form.purchaseValue);
    if (!form.purchaseValue || isNaN(val) || val < 0) {
      errors.purchaseValue = 'Valor de aquisição deve ser ≥ 0';
    }

    const life = Number(form.usefulLifeYears);
    if (!form.usefulLifeYears || isNaN(life) || life < 1 || !Number.isInteger(life)) {
      errors.usefulLifeYears = 'Vida útil deve ser um número inteiro ≥ 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      assetTag: form.assetTag.trim(),
      serialNumber: form.serialNumber.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      acquisitionDate: form.acquisitionDate,
      purchaseValue: Number(form.purchaseValue),
      location: form.location.trim(),
      status: form.status as AssetStatus,
      usefulLifeYears: Number(form.usefulLifeYears),
    };

    try {
      if (editingAsset) {
        await dataService.updateAsset(editingAsset.id, payload);
      } else {
        await dataService.addAsset(payload, user);
      }

      setSubmitSuccess(true);
      await loadAssets(page);

      setTimeout(() => {
        setShowModal(false);
        setSubmitSuccess(false);
        setEditingAsset(null);
      }, 1200);
    } catch (err: any) {
      setSubmitError(err.message || (editingAsset ? 'Erro ao atualizar ativo' : 'Erro ao registrar ativo'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete Confirmation ----

  const openDeleteConfirm = (asset: Asset) => {
    setDeletingAsset(asset);
    setDeleteError(null);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setShowDeleteConfirm(false);
    setDeletingAsset(null);
  };

  const handleDeleteBackdropClick = (e: React.MouseEvent) => {
    if (deleteModalRef.current && !deleteModalRef.current.contains(e.target as Node)) {
      closeDeleteConfirm();
    }
  };

  const handleDelete = async () => {
    if (!deletingAsset) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await dataService.deleteAsset(deletingAsset.id);
      setShowDeleteConfirm(false);
      setDeletingAsset(null);
      await loadAssets(page);
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir ativo');
    } finally {
      setDeleting(false);
    }
  };

  // ---- Render ----

  const isEditing = !!editingAsset;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Controle Patrimonial (Ativos Fixos)</h2>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Tag size={18} />
          Registrar Ativo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por plaqueta, nome..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {locationOptions.length > 0 && (
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="pl-8 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Todas Localizações</option>
                  {locationOptions.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={14} className="text-slate-400 mr-1" />
            {[
              { value: '', label: 'Todos', count: totalAssets },
              { value: 'IN_USE', label: 'Em Uso', count: statusCounts['IN_USE'] || 0 },
              { value: 'AVAILABLE', label: 'Disponível', count: statusCounts['AVAILABLE'] || 0 },
              { value: 'MAINTENANCE', label: 'Manutenção', count: statusCounts['MAINTENANCE'] || 0 },
              { value: 'DISPOSED', label: 'Baixado', count: statusCounts['DISPOSED'] || 0 },
            ].map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setSelectedStatus(opt.value === selectedStatus ? '' : opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedStatus === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
              >
                {opt.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${selectedStatus === opt.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                  {opt.count}
                </span>
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            Exibindo <span className="font-semibold text-slate-700">{assets.length}</span> de <span className="font-semibold text-slate-700">{total}</span> ativos
            {(selectedStatus || selectedLocation || debouncedSearch) && ' (filtrado)'}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Carregando ativos...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">Erro: {error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <th className="px-6 py-4">Plaqueta / Serial</th>
                    <th className="px-6 py-4">Ativo</th>
                    <th className="px-6 py-4">Localização</th>
                    <th className="px-6 py-4">Data Aquisição</th>
                    <th className="px-6 py-4 text-right">Valor Compra</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded w-fit text-xs">{asset.assetTag}</span>
                          <span className="text-xs text-slate-400 mt-1">{asset.serialNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded text-slate-500">
                            <Monitor size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{asset.name}</div>
                            <div className="text-xs text-slate-500 max-w-[200px] truncate">{asset.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {asset.location}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(asset.acquisitionDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">
                        R$ {asset.purchaseValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(asset.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(asset)}
                            title="Editar ativo"
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(asset)}
                            title="Excluir ativo"
                            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {assets.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Nenhum ativo encontrado.
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">
                  Página <span className="font-semibold text-slate-700">{page}</span> de <span className="font-semibold text-slate-700">{totalPages}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => goToPage(1)} disabled={page === 1} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Primeira página"><ChevronsLeft size={16} /></button>
                  <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 1} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Página anterior"><ChevronLeft size={16} /></button>
                  {getPageNumbers().map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                    ) : (
                      <button type="button" key={p} onClick={() => goToPage(p)} className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-200'}`}>{p}</button>
                    )
                  )}
                  <button type="button" onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Próxima página"><ChevronRight size={16} /></button>
                  <button type="button" onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Última página"><ChevronsRight size={16} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== CREATE / EDIT ASSET MODAL ===== */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-12 overflow-y-auto"
          onClick={handleBackdropClick}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div className="fixed inset-0 modal-backdrop" />

          <div
            ref={modalRef}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex-shrink-0"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r ${isEditing ? 'from-amber-500 to-orange-500' : 'from-indigo-600 to-purple-600'
              }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  {isEditing ? <Pencil size={20} className="text-white" /> : <Tag size={20} className="text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{isEditing ? 'Editar Ativo' : 'Registrar Novo Ativo'}</h3>
                  <p className={`text-xs ${isEditing ? 'text-amber-100' : 'text-indigo-100'}`}>
                    {isEditing ? `Editando: ${editingAsset?.assetTag} — ${editingAsset?.name}` : 'Preencha os dados do ativo patrimonial'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Success feedback */}
            {submitSuccess && (
              <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"
                style={{ animation: 'fadeIn 0.3s ease-out' }}
              >
                <CheckCircle size={18} />
                {isEditing ? 'Ativo atualizado com sucesso!' : 'Ativo registrado com sucesso!'}
              </div>
            )}

            {/* Error feedback */}
            {submitError && (
              <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
                style={{ animation: 'fadeIn 0.3s ease-out' }}
              >
                <AlertTriangle size={18} />
                {submitError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AssetTag with barcode generator */}
                <BarcodeField
                  ref={firstInputRef}
                  value={form.assetTag}
                  onChange={(val) => updateField('assetTag', val)}
                  disabled={submitting || submitSuccess}
                  error={formErrors.assetTag}
                  prefix="PAT"
                  label="Plaqueta (Tag) *"
                  placeholder="Ex: PAT-M1R2K3456789"
                />

                {/* SerialNumber */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nº de Série *</label>
                  <input
                    type="text"
                    placeholder="Ex: SN-DELL-123456"
                    value={form.serialNumber}
                    onChange={(e) => updateField('serialNumber', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm font-mono disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.serialNumber
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                  />
                  {formErrors.serialNumber && <p className="mt-1 text-xs text-red-600">{formErrors.serialNumber}</p>}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome do Ativo *</label>
                <input
                  type="text"
                  placeholder="Ex: Notebook Dell Latitude"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  disabled={submitting || submitSuccess}
                  className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.name
                    ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição *</label>
                <textarea
                  placeholder="Descreva o ativo brevemente..."
                  rows={2}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  disabled={submitting || submitSuccess}
                  className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm resize-none disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.description
                    ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                />
                {formErrors.description && <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>}
              </div>

              {/* Location + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Localização *</label>
                  <input
                    type="text"
                    placeholder="Ex: TI - Sala 1"
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.location
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                  />
                  {formErrors.location && <p className="mt-1 text-xs text-red-600">{formErrors.location}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status *</label>
                  <select
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed appearance-none bg-white ${formErrors.status
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {formErrors.status && <p className="mt-1 text-xs text-red-600">{formErrors.status}</p>}
                </div>
              </div>

              {/* AcquisitionDate + PurchaseValue + UsefulLife */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data Aquisição *</label>
                  <input
                    type="date"
                    value={form.acquisitionDate}
                    onChange={(e) => updateField('acquisitionDate', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-3 py-2.5 border rounded-lg outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.acquisitionDate
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                  />
                  {formErrors.acquisitionDate && <p className="mt-1 text-xs text-red-600">{formErrors.acquisitionDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Valor (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.purchaseValue}
                      onChange={(e) => updateField('purchaseValue', e.target.value)}
                      disabled={submitting || submitSuccess}
                      className={`w-full pl-10 pr-3 py-2.5 border rounded-lg outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.purchaseValue
                        ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                        }`}
                    />
                  </div>
                  {formErrors.purchaseValue && <p className="mt-1 text-xs text-red-600">{formErrors.purchaseValue}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vida Útil (anos) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="5"
                    value={form.usefulLifeYears}
                    onChange={(e) => updateField('usefulLifeYears', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm text-center disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.usefulLifeYears
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                  />
                  {formErrors.usefulLifeYears && <p className="mt-1 text-xs text-red-600">{formErrors.usefulLifeYears}</p>}
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting || submitSuccess}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm ${isEditing
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {isEditing ? 'Salvando...' : 'Registrando...'}
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle size={16} />
                    {isEditing ? 'Salvo!' : 'Registrado!'}
                  </>
                ) : (
                  <>
                    {isEditing ? <Pencil size={16} /> : <Plus size={16} />}
                    {isEditing ? 'Salvar Alterações' : 'Registrar Ativo'}
                  </>
                )}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(24px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {showDeleteConfirm && deletingAsset && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-12 overflow-y-auto"
          onClick={handleDeleteBackdropClick}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div className="fixed inset-0 modal-backdrop" />

          <div
            ref={deleteModalRef}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex-shrink-0"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-500 to-rose-600">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Trash2 size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Excluir Ativo</h3>
                  <p className="text-xs text-red-100">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Tem certeza que deseja excluir o ativo abaixo? Esta ação é <strong className="text-red-600">irreversível</strong>.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">{deletingAsset.assetTag}</span>
                  {getStatusBadge(deletingAsset.status)}
                </div>
                <div className="font-semibold text-slate-900">{deletingAsset.name}</div>
                <div className="text-xs text-slate-500 mt-1">{deletingAsset.description}</div>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {deletingAsset.location}
                  </span>
                  <span>R$ {deletingAsset.purchaseValue.toFixed(2)}</span>
                </div>
              </div>

              {deleteError && (
                <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium"
                  style={{ animation: 'fadeIn 0.3s ease-out' }}
                >
                  <AlertTriangle size={18} />
                  {deleteError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Excluir Ativo
                  </>
                )}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(24px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default Assets;