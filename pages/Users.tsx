import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/DataService';
import { User, Role } from '../types';
import { Users as UsersIcon, UserPlus, Pencil, Power, X, ShieldCheck, Wrench } from 'lucide-react';

interface UserFormData {
    fullName: string;
    username: string;
    password: string;
    confirmPassword: string;
    role: Role;
}

const EMPTY_FORM: UserFormData = {
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'OPERATOR',
};

const Users: React.FC = () => {
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Redirect non-admin
    useEffect(() => {
        if (currentUser && currentUser.role !== 'ADMIN') {
            navigate('/', { replace: true });
        }
    }, [currentUser, navigate]);

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await dataService.getUsers();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData(EMPTY_FORM);
        setFormError(null);
        setModalOpen(true);
    };

    const openEditModal = (u: User) => {
        setEditingUser(u);
        setFormData({
            fullName: u.fullName,
            username: u.username,
            password: '',
            confirmPassword: '',
            role: u.role,
        });
        setFormError(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingUser(null);
        setFormData(EMPTY_FORM);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!formData.fullName.trim() || !formData.username.trim()) {
            setFormError('Nome completo e username são obrigatórios.');
            return;
        }

        if (!editingUser) {
            // Creating
            if (!formData.password) {
                setFormError('Senha é obrigatória para novo usuário.');
                return;
            }
            if (formData.password.length < 6) {
                setFormError('A senha deve ter no mínimo 6 caracteres.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setFormError('As senhas não coincidem.');
                return;
            }
        }

        try {
            setSaving(true);
            if (editingUser) {
                await dataService.updateUser(editingUser.id, {
                    fullName: formData.fullName.trim(),
                    username: formData.username.trim(),
                    role: formData.role,
                });
            } else {
                await dataService.createUser({
                    fullName: formData.fullName.trim(),
                    username: formData.username.trim(),
                    password: formData.password,
                    role: formData.role,
                });
            }
            closeModal();
            await loadUsers();
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (u: User) => {
        if (u.id === currentUser?.id) return;
        try {
            await dataService.toggleUserStatus(u.id);
            await loadUsers();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (currentUser?.role !== 'ADMIN') return null;

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-slate-500">Carregando usuários...</div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-64 text-red-500">Erro: {error}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center animate-in">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>Gerenciamento de Usuários</h2>
                    <p style={{ color: '#94a3b8' }} className="text-sm">Controle de acesso e permissões do sistema</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="btn-premium flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold"
                    style={{
                        background: 'linear-gradient(135deg, #4F6BFF 0%, #3b52db 100%)',
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(79, 107, 255, 0.3)',
                    }}
                >
                    <UserPlus size={16} />
                    Novo Usuário
                </button>
            </div>

            {/* Users Table */}
            <div className="glass-card animate-in overflow-hidden" style={{ animationDelay: '60ms' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.015)' }} className="text-xs uppercase font-semibold">
                                <th className="px-6 py-4">Nome Completo</th>
                                <th className="px-6 py-4">Username</th>
                                <th className="px-6 py-4">Perfil</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Data de Criação</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {users.map((u) => (
                                <tr key={u.id} className="table-row-hover">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: u.role === 'ADMIN' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'linear-gradient(135deg, #4F6BFF, #3b52db)' }}>
                                                {u.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-slate-900">{u.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{u.username}</td>
                                    <td className="px-6 py-4">
                                        {u.role === 'ADMIN' ? (
                                            <span className="badge-pill" style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                                                <ShieldCheck size={12} />
                                                Administrador
                                            </span>
                                        ) : (
                                            <span className="badge-pill" style={{ background: 'rgba(79, 107, 255, 0.08)', color: '#4F6BFF', border: '1px solid rgba(79, 107, 255, 0.15)' }}>
                                                <Wrench size={12} />
                                                Operador
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.isActive ? (
                                            <span className="badge-pill" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', display: 'inline-block' }}></span>
                                                Ativo
                                            </span>
                                        ) : (
                                            <span className="badge-pill" style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ef4444', display: 'inline-block' }}></span>
                                                Inativo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(u)}
                                                title="Editar usuário"
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            {u.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => handleToggleStatus(u)}
                                                    title={u.isActive ? 'Desativar usuário' : 'Ativar usuário'}
                                                    className={`p-2 rounded-lg transition-all duration-200 ${u.isActive
                                                            ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                        }`}
                                                >
                                                    <Power size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {modalOpen && createPortal(
                <div
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}
                    className="flex items-center justify-center"
                >
                    <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }} onClick={closeModal}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <UsersIcon size={20} className="text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {editingUser ? 'Alterar dados do usuário' : 'Preencha os dados do novo usuário'}
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
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto" style={{ flex: '1 1 auto' }}>
                            {formError && (
                                <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Ex: João Silva"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Ex: joao.silva"
                                />
                            </div>

                            {!editingUser && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            placeholder="Repita a senha"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Perfil</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Role }))}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="OPERATOR">Operador</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
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
                                    {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Users;
