import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { dataService } from '../services/DataService';
import { Asset, AssetPhoto, AssetStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import BarcodeField from '../components/BarcodeField';
import CustomSelect from '../components/CustomSelect';
import CreatableSelect from '../components/CreatableSelect';
import { Search, Tag, Settings, Monitor, Trash2, X, Loader2, CheckCircle, AlertTriangle, Plus, Pencil, MapPin, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Upload, ImageIcon, Camera } from 'lucide-react';

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

const STATUS_SELECT_OPTIONS = [
  { value: 'AVAILABLE', label: 'Disponível', icon: '✅' },
  { value: 'IN_USE', label: 'Em Uso', icon: '🔧' },
  { value: 'MAINTENANCE', label: 'Manutenção', icon: '⚙️' },
  { value: 'DISPOSED', label: 'Baixado', icon: '📤' },
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

  // Discard confirmation state
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  // Lightbox / Gallery state
  const [galleryPhotos, setGalleryPhotos] = useState<AssetPhoto[]>([]);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  // Photo upload state
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<AssetPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_PHOTOS = 5;
  const SERVER_BASE = 'http://localhost:3001';

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

  // Close on Escape & Arrow Keys
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showGallery) {
        if (e.key === 'Escape') setShowGallery(false);
        if (e.key === 'ArrowRight') setCurrentGalleryIndex((prev) => (prev + 1) % galleryPhotos.length);
        if (e.key === 'ArrowLeft') setCurrentGalleryIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length);
        return;
      }
      if (e.key === 'Escape') {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else if (showDeleteConfirm && !deleting) {
          closeDeleteConfirm();
        } else if (showModal && !submitting) {
          requestCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showModal, submitting, showDeleteConfirm, deleting, showDiscardConfirm, showGallery, galleryPhotos.length]);

  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Disponível
          </span>
        );
      case 'IN_USE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            Em Uso
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
            Manutenção
          </span>
        );
      case 'DISPOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md">
            <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
            Baixado
          </span>
        );
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
    setPendingPhotos([]);
    setPendingPreviews([]);
    setExistingPhotos([]);
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
    setPendingPhotos([]);
    setPendingPreviews([]);
    setExistingPhotos(asset.photos || []);
    setShowModal(true);
  };

  const hasUnsavedChanges = (): boolean => {
    if (submitSuccess) return false;
    if (editingAsset) {
      const dateStr = editingAsset.acquisitionDate.includes('T')
        ? editingAsset.acquisitionDate.split('T')[0]
        : editingAsset.acquisitionDate;
      return (
        form.assetTag !== editingAsset.assetTag ||
        form.serialNumber !== editingAsset.serialNumber ||
        form.name !== editingAsset.name ||
        form.description !== editingAsset.description ||
        form.acquisitionDate !== dateStr ||
        form.purchaseValue !== String(editingAsset.purchaseValue) ||
        form.location !== editingAsset.location ||
        form.status !== editingAsset.status ||
        form.usefulLifeYears !== String(editingAsset.usefulLifeYears) ||
        pendingPhotos.length > 0
      );
    }
    return Object.values(form).some(v => v !== '' && v !== 'AVAILABLE') || pendingPhotos.length > 0;
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditingAsset(null);
    setShowDiscardConfirm(false);
  };

  const requestCloseModal = () => {
    if (submitting) return;
    if (hasUnsavedChanges()) {
      setShowDiscardConfirm(true);
    } else {
      closeModal();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      requestCloseModal();
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

  const totalPhotoCount = existingPhotos.length + pendingPhotos.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;

    const remaining = MAX_PHOTOS - totalPhotoCount;
    if (remaining <= 0) {
      setSubmitError(`Limite de ${MAX_PHOTOS} fotos atingido.`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setSubmitError(`Formato não aceito: ${file.name}. Use JPEG, PNG ou WebP.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError(`Arquivo muito grande: ${file.name}. Máximo: 5MB.`);
        return;
      }
      validFiles.push(file);
    }

    const newPreviews = validFiles.map(f => URL.createObjectURL(f));
    setPendingPhotos(prev => [...prev, ...validFiles]);
    setPendingPreviews(prev => [...prev, ...newPreviews]);
    if (submitError) setSubmitError(null);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingPhoto = (index: number) => {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingPhotos(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (photo: AssetPhoto) => {
    if (!editingAsset) return;
    try {
      await dataService.deleteAssetPhoto(editingAsset.id, photo.id);
      setExistingPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao excluir foto');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files) as File[];
    if (!files.length) return;

    // Simulate a file input change
    const dataTransfer = new DataTransfer();
    files.forEach(f => dataTransfer.items.add(f));
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Manually handle since synthetic event may not fire
    handleFileSelect({ target: { files: dataTransfer.files } } as any);
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
      acquisitionDate: new Date(form.acquisitionDate).toISOString(),
      purchaseValue: Number(form.purchaseValue),
      location: form.location.trim(),
      status: form.status as AssetStatus,
      usefulLifeYears: Number(form.usefulLifeYears),
    };

    try {
      let savedAsset: Asset;
      if (editingAsset) {
        savedAsset = await dataService.updateAsset(editingAsset.id, payload);
      } else {
        savedAsset = await dataService.addAsset(payload, user);
      }

      // Upload pending photos
      if (pendingPhotos.length > 0) {
        setUploadingPhotos(true);
        try {
          await dataService.uploadAssetPhotos(savedAsset.id, pendingPhotos);
        } catch (uploadErr: any) {
          setSubmitError(uploadErr.message || 'Ativo salvo, mas erro ao enviar fotos');
          setUploadingPhotos(false);
          await loadAssets(page);
          setSubmitting(false);
          return;
        }
        setUploadingPhotos(false);
      }

      // Clean up preview URLs
      pendingPreviews.forEach(url => URL.revokeObjectURL(url));
      setPendingPhotos([]);
      setPendingPreviews([]);

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
              <div style={{ minWidth: 200 }}>
                <CustomSelect
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  options={[
                    { value: '', label: 'Todas Localizações', icon: '📍' },
                    ...locationOptions.map(loc => ({ value: loc, label: loc })),
                  ]}
                  placeholder="Todas Localizações"
                />
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
                          {asset.photos && asset.photos.length > 0 ? (
                            <div 
                              className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity relative group"
                              onClick={() => {
                                setGalleryPhotos(asset.photos || []);
                                setCurrentGalleryIndex(0);
                                setShowGallery(true);
                              }}
                              title="Ver fotos"
                            >
                              <img src={`${SERVER_BASE}${asset.photos[0].url}`} alt={asset.name} className="w-full h-full object-cover" />
                              {asset.photos.length > 1 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-white text-[10px] font-bold">+{asset.photos.length - 1}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-2 bg-slate-100 rounded text-slate-500">
                              <Monitor size={16} />
                            </div>
                          )}
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
      {showModal && createPortal(
        <div
          className="flex items-center justify-center p-4"
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh' }} />

          <div
            ref={modalRef}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex-shrink-0"
            style={{ animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
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
                onClick={requestCloseModal}
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto" style={{ flex: '1 1 auto' }}>
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

              {/* Photos */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Fotos <span className="text-slate-400 font-normal">({totalPhotoCount}/{MAX_PHOTOS})</span>
                </label>

                {/* Existing photos grid */}
                {existingPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {existingPhotos.map(photo => (
                      <div key={photo.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200">
                        <img src={`${SERVER_BASE}${photo.url}`} alt={photo.filename} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeExistingPhoto(photo)}
                          disabled={submitting || submitSuccess}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending photos preview */}
                {pendingPreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {pendingPreviews.map((preview, i) => (
                      <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-dashed border-indigo-300 bg-indigo-50">
                        <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePendingPhoto(i)}
                          disabled={submitting || submitSuccess}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">Novo</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload area */}
                {totalPhotoCount < MAX_PHOTOS && (
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                  >
                    <Camera size={20} className="text-slate-400" />
                    <div className="text-sm text-slate-500">
                      <span className="font-medium text-indigo-600">Clique para selecionar</span> ou arraste fotos aqui
                      <div className="text-xs text-slate-400 mt-0.5">JPEG, PNG ou WebP. Max 5MB cada.</div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Location + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Localização *</label>
                  <CreatableSelect
                    value={form.location}
                    onChange={(val) => updateField('location', val)}
                    options={locationOptions.map(loc => ({ value: loc, label: loc }))}
                    placeholder="Ex: TI - Sala 1"
                    disabled={submitting || submitSuccess}
                    hasError={!!formErrors.location}
                  />
                  {formErrors.location && <p className="mt-1 text-xs text-red-600">{formErrors.location}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status *</label>
                  <CustomSelect
                    value={form.status}
                    onChange={(val) => updateField('status', val)}
                    options={STATUS_SELECT_OPTIONS}
                    placeholder="Selecione..."
                    disabled={submitting || submitSuccess}
                    hasError={!!formErrors.status}
                  />
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
                      type="text"
                      placeholder="0,00"
                      value={form.purchaseValue ? Number(form.purchaseValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                      onChange={(e) => {
                        const numericString = e.target.value.replace(/\D/g, '');
                        if (!numericString) {
                          updateField('purchaseValue', '');
                          return;
                        }
                        const floatValue = parseInt(numericString, 10) / 100;
                        updateField('purchaseValue', floatValue.toString());
                      }}
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
                onClick={requestCloseModal}
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
                {submitting || uploadingPhotos ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {uploadingPhotos ? 'Enviando fotos...' : isEditing ? 'Salvando...' : 'Registrando...'}
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
        </div>,
        document.body
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {showDeleteConfirm && deletingAsset && createPortal(
        <div
          className="flex items-center justify-center p-4"
          onClick={handleDeleteBackdropClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh' }} />

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
        </div>,
        document.body
      )}

      {/* ===== DISCARD CONFIRMATION MODAL ===== */}
      {showDiscardConfirm && createPortal(
        <div
          className="flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div className="modal-backdrop" onClick={() => setShowDiscardConfirm(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.4)' }} />

          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden my-auto flex-shrink-0"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Descartar alterações?</h3>
              <p className="text-slate-600 text-sm mb-6">
                Você tem alterações não salvas. Se sair agora, todo o seu progresso neste ativo será perdido.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Continuar editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    closeModal();
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===== LIGHTBOX / GALLERY MODAL ===== */}
      {showGallery && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowGallery(false)}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          {/* Close button */}
          <button 
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[10001]"
            onClick={() => setShowGallery(false)}
            title="Fechar"
          >
            <X size={24} />
          </button>
          
          {/* Main Photo */}
          <div 
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {galleryPhotos.length > 1 && (
              <button 
                type="button"
                className="absolute left-4 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-[10001]"
                onClick={(e) => { e.stopPropagation(); setCurrentGalleryIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length); }}
                title="Foto anterior"
              >
                <ChevronLeft size={32} />
              </button>
            )}

            <img 
              src={`${SERVER_BASE}${galleryPhotos[currentGalleryIndex].url}`} 
              alt="Asset" 
              className="max-w-full max-h-full object-contain rounded drop-shadow-2xl" 
            />

            {galleryPhotos.length > 1 && (
              <button 
                type="button"
                className="absolute right-4 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors z-[10001]"
                onClick={(e) => { e.stopPropagation(); setCurrentGalleryIndex((prev) => (prev + 1) % galleryPhotos.length); }}
                title="Próxima foto"
              >
                <ChevronRight size={32} />
              </button>
            )}
          </div>
          
          {/* Indicator */}
          {galleryPhotos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-1.5 rounded-full text-sm font-semibold tracking-widest z-[10001]">
              {currentGalleryIndex + 1} / {galleryPhotos.length}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Assets;
