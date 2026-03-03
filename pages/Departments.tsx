import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/DataService';
import { Department } from '../types';
import { Building2, Plus, Pencil, Power, X } from 'lucide-react';

interface DepartmentFormData {
    name: string;
    costCenterCode: string;
}

const EMPTY_FORM: DepartmentFormData = {
    name: '',
    costCenterCode: '',
};

const Departments: React.FC = () => {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [formData, setFormData] = useState<DepartmentFormData>(EMPTY_FORM);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Redirect non-admin
    useEffect(() => {
        if (currentUser && currentUser.role !== 'ADMIN') {
            navigate('/', { replace: true });
        }
    }, [currentUser, navigate]);

    const loadDepartments = useCallback(async () => {
        try {
            setLoading(true);
            const data = await dataService.getDepartments();
            setDepartments(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDepartments();
    }, [loadDepartments]);

    const openCreateModal = () => {
        setEditingDept(null);
        setFormData(EMPTY_FORM);
        setFormError(null);
        setModalOpen(true);
    };

    const openEditModal = (d: Department) => {
        setEditingDept(d);
        setFormData({
            name: d.name,
            costCenterCode: d.costCenterCode,
        });
        setFormError(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingDept(null);
        setFormData(EMPTY_FORM);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.name.trim() || !formData.costCenterCode.trim()) {
            setFormError('Nome e código do centro de custo são obrigatórios.');
            return;
        }

        try {
            setSaving(true);
            if (editingDept) {
                await dataService.updateDepartment(editingDept.id, {
                    name: formData.name.trim(),
                    costCenterCode: formData.costCenterCode.trim(),
                });
            } else {
                await dataService.createDepartment({
                    name: formData.name.trim(),
                    costCenterCode: formData.costCenterCode.trim(),
                });
            }
            closeModal();
            await loadDepartments();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (d: Department) => {
        try {
            await dataService.toggleDepartmentStatus(d.id);
            await loadDepartments();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (currentUser?.role !== 'ADMIN') return null;

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-500">Carregando setores...</div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-64 text-red-500">Erro: {error}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Setores</h2>
                    <p className="text-slate-500 text-sm">Cadastro e controle de setores e centros de custo</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-600/20 transition-all duration-200 hover:shadow-blue-600/30"
                >
                    <Plus size={16} />
                    Novo Setor
                </button>
            </div>

            {/* Departments Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Centro de Custo</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Data de Criação</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {departments.map((d) => (
                                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm bg-indigo-500">
                                                {d.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-slate-900">{d.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{d.costCenterCode}</td>
                                    <td className="px-6 py-4">
                                        {d.isActive ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                Ativo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                Inativo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(d)}
                                                title="Editar setor"
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(d)}
                                                title={d.isActive ? 'Desativar setor' : 'Ativar setor'}
                                                className={`p-2 rounded-lg transition-all duration-200 ${d.isActive
                                                    ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                    }`}
                                            >
                                                <Power size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {departments.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        Nenhum setor encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <Building2 size={20} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {editingDept ? 'Editar Setor' : 'Novo Setor'}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {editingDept ? 'Alterar dados do setor' : 'Preencha os dados do novo setor'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Setor</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Ex: Financeiro"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Código do Centro de Custo</label>
                                <input
                                    type="text"
                                    value={formData.costCenterCode}
                                    onChange={(e) => setFormData(prev => ({ ...prev, costCenterCode: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Ex: CC-001"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-600/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Salvando...' : editingDept ? 'Salvar Alterações' : 'Criar Setor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Departments;
