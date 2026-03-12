import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dataService } from '../services/DataService';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import BarcodeField from '../components/BarcodeField';
import { Search, Plus, AlertTriangle, CheckCircle, MapPin, X, Package, Loader2, Pencil, Trash2, Tag, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface ProductForm {
  name: string;
  barcode: string;
  category: string;
  location: string;
  quantity: string;
  minStock: string;
  unitValue: string;
}

const EMPTY_FORM: ProductForm = {
  name: '',
  barcode: '',
  category: '',
  location: '',
  quantity: '',
  minStock: '',
  unitValue: '',
};

const CATEGORIES = ['Escritório', 'Informática', 'EPI', 'Limpeza', 'Brindes', 'Itens de copa', 'Outros'];

const PAGE_SIZE = 20;

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  // Debounce search (500ms)
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  const loadProducts = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.getProducts({
        page: targetPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        category: selectedCategory || undefined,
        lowStock: lowStockFilter || undefined,
      });
      setProducts(data.products);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setCategoryOptions(data.filterOptions.categories);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, lowStockFilter]);

  // Load on mount and when filters change (reset to page 1)
  useEffect(() => {
    loadProducts(1);
  }, [loadProducts]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadProducts(p);
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
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      location: product.location,
      quantity: String(product.quantity),
      minStock: String(product.minStock),
      unitValue: String(product.unitValue),
    });
    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      closeModal();
    }
  };

  const updateField = (field: keyof ProductForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof ProductForm, string>> = {};

    if (!form.name.trim()) errors.name = 'Nome é obrigatório';
    if (!form.barcode.trim()) errors.barcode = 'Código de barras é obrigatório';
    if (!form.category) errors.category = 'Selecione uma categoria';
    if (!form.location.trim()) errors.location = 'Localização é obrigatória';

    const qty = Number(form.quantity);
    if (!form.quantity || isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      errors.quantity = 'Quantidade deve ser um número inteiro ≥ 0';
    }

    const min = Number(form.minStock);
    if (!form.minStock || isNaN(min) || min < 0 || !Number.isInteger(min)) {
      errors.minStock = 'Estoque mínimo deve ser um número inteiro ≥ 0';
    }

    const val = Number(form.unitValue);
    if (!form.unitValue || isNaN(val) || val < 0) {
      errors.unitValue = 'Valor unitário deve ser um número ≥ 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      category: form.category,
      location: form.location.trim(),
      quantity: Number(form.quantity),
      minStock: Number(form.minStock),
      unitValue: editingProduct ? editingProduct.unitValue : Number(form.unitValue),
    };

    try {
      if (editingProduct) {
        await dataService.updateProduct(editingProduct.id, payload);
      } else {
        await dataService.addProduct(payload);
      }

      setSubmitSuccess(true);
      await loadProducts(page);

      setTimeout(() => {
        setShowModal(false);
        setSubmitSuccess(false);
        setEditingProduct(null);
      }, 1200);
    } catch (err: any) {
      setSubmitError(err.message || (editingProduct ? 'Erro ao atualizar produto' : 'Erro ao cadastrar produto'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete Confirmation ----

  const openDeleteConfirm = (product: Product) => {
    setDeletingProduct(product);
    setDeleteError(null);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setShowDeleteConfirm(false);
    setDeletingProduct(null);
  };

  const handleDeleteBackdropClick = (e: React.MouseEvent) => {
    if (deleteModalRef.current && !deleteModalRef.current.contains(e.target as Node)) {
      closeDeleteConfirm();
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await dataService.deleteProduct(deletingProduct.id);
      setShowDeleteConfirm(false);
      setDeletingProduct(null);
      await loadProducts(page);
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir produto');
    } finally {
      setDeleting(false);
    }
  };

  // ---- Render ----

  const isEditing = !!editingProduct;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Almoxarifado (Consumíveis)</h2>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, código de barras..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setLowStockFilter(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border whitespace-nowrap ${lowStockFilter
                ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm ring-2 ring-amber-200'
                : 'bg-white text-slate-600 border-slate-300 hover:border-amber-400 hover:text-amber-600'
                }`}
            >
              <AlertTriangle size={16} />
              Estoque Baixo
            </button>
          </div>

          {/* Category filter pills */}
          {categoryOptions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={14} className="text-slate-400 mr-1" />
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedCategory === ''
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                  }`}
              >
                Todas
              </button>
              {categoryOptions.map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-slate-500">
            Exibindo <span className="font-semibold text-slate-700">{products.length}</span> de <span className="font-semibold text-slate-700">{total}</span> produtos
            {(selectedCategory || lowStockFilter || debouncedSearch) && ' (filtrado)'}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Carregando inventário...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">Erro: {error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <th className="px-6 py-4">Produto</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Localização</th>
                    <th className="px-6 py-4 text-center">Qtd Atual</th>
                    <th className="px-6 py-4 text-right">Custo Médio</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.map((product) => {
                    const isLowStock = product.quantity <= product.minStock;
                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors ${isLowStock ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">{product.name}</div>
                            <div className="text-xs text-slate-500 font-mono mt-1">{product.barcode}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <span className="px-2 py-1 bg-white bg-opacity-60 rounded-full text-xs font-medium border border-slate-200">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-slate-400" />
                            {product.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-bold text-lg ${isLowStock ? 'text-red-700' : 'text-slate-700'}`}>
                            {product.quantity}
                          </span>
                          {isLowStock && (
                            <div className="text-[10px] text-red-600 font-medium">Mín: {product.minStock}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600">
                          R$ {product.unitValue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          {isLowStock ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 animate-pulse shadow-sm">
                              <AlertTriangle size={14} />
                              BAIXO ESTOQUE
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <CheckCircle size={14} />
                              NORMAL
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              title="Editar produto"
                              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteConfirm(product)}
                              title="Excluir produto"
                              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {products.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Nenhum produto encontrado.
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
                      <button type="button" key={p} onClick={() => goToPage(p)} className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-200'}`}>{p}</button>
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

      {/* ===== CREATE / EDIT MODAL ===== */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-12 overflow-y-auto"
          onClick={handleBackdropClick}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            ref={modalRef}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex-shrink-0"
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r ${isEditing ? 'from-amber-500 to-orange-500' : 'from-blue-600 to-indigo-600'
              }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  {isEditing ? <Pencil size={20} className="text-white" /> : <Package size={20} className="text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{isEditing ? 'Editar Produto' : 'Novo Produto'}</h3>
                  <p className={`text-xs ${isEditing ? 'text-amber-100' : 'text-blue-100'}`}>
                    {isEditing ? `Editando: ${editingProduct?.name}` : 'Preencha os dados do consumível'}
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
                {isEditing ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!'}
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
                {/* Barcode */}
                <BarcodeField
                  ref={firstInputRef}
                  value={form.barcode}
                  onChange={(val) => updateField('barcode', val)}
                  disabled={submitting || submitSuccess}
                  error={formErrors.barcode}
                  prefix="AG"
                  label="Código de Barras *"
                  placeholder="Ex: AG-M1R2K3456789"
                />

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome do Produto *</label>
                  <input
                    type="text"
                    placeholder="Ex: Papel A4 Chamex"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.name
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                </div>
              </div>

              {/* Category + Location grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoria *</label>
                  <select
                    value={form.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed appearance-none bg-white ${formErrors.category
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  >
                    <option value="">Selecione...</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {formErrors.category && <p className="mt-1 text-xs text-red-600">{formErrors.category}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Localização *</label>
                  <input
                    type="text"
                    placeholder="Ex: Estante A1"
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.location
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.location && <p className="mt-1 text-xs text-red-600">{formErrors.location}</p>}
                </div>
              </div>

              {/* Quantity + MinStock + UnitValue grid */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantidade *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) => updateField('quantity', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm text-center disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.quantity
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.quantity && <p className="mt-1 text-xs text-red-600">{formErrors.quantity}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Est. Mínimo *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.minStock}
                    onChange={(e) => updateField('minStock', e.target.value)}
                    disabled={submitting || submitSuccess}
                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm text-center disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.minStock
                      ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  {formErrors.minStock && <p className="mt-1 text-xs text-red-600">{formErrors.minStock}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {isEditing ? 'Custo Médio' : 'Valor Unit. *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.unitValue}
                      onChange={(e) => updateField('unitValue', e.target.value)}
                      disabled={submitting || submitSuccess || isEditing}
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed ${formErrors.unitValue
                        ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                        : isEditing
                          ? 'border-slate-200 bg-slate-100 text-slate-500'
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                    />
                  </div>
                  {isEditing && (
                    <p className="mt-1 text-xs text-slate-400">Calculado automaticamente via movimentações de entrada</p>
                  )}
                  {formErrors.unitValue && <p className="mt-1 text-xs text-red-600">{formErrors.unitValue}</p>}
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
                  : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {isEditing ? 'Salvando...' : 'Cadastrando...'}
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle size={16} />
                    {isEditing ? 'Salvo!' : 'Cadastrado!'}
                  </>
                ) : (
                  <>
                    {isEditing ? <Pencil size={16} /> : <Plus size={16} />}
                    {isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}
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
      {showDeleteConfirm && deletingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-12 overflow-y-auto"
          onClick={handleDeleteBackdropClick}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

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
                  <h3 className="text-lg font-bold text-white">Excluir Produto</h3>
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
                Tem certeza que deseja excluir o produto abaixo? Esta ação é <strong className="text-red-600">irreversível</strong>.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="font-semibold text-slate-900">{deletingProduct.name}</div>
                <div className="text-xs text-slate-500 font-mono mt-1">{deletingProduct.barcode}</div>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {deletingProduct.location}
                  </span>
                  <span>Qtd: <strong className="text-slate-700">{deletingProduct.quantity}</strong></span>
                  <span>R$ {deletingProduct.unitValue.toFixed(2)}</span>
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
                    Excluir Produto
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

export default Inventory;