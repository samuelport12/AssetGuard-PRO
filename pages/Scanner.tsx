import React, { useState, useRef, useEffect } from 'react';
import { dataService } from '../services/DataService';
import { useAuth } from '../contexts/AuthContext';
import { Product, Department } from '../types';
import { ScanBarcode, ArrowRight, CheckCircle, XCircle, PackagePlus, PackageMinus, AlertTriangle } from 'lucide-react';

const Scanner: React.FC = () => {
  const { user } = useAuth();
  const [barcode, setBarcode] = useState('');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [mode, setMode] = useState<'IN' | 'OUT'>('OUT');
  const [quantity, setQuantity] = useState<number>(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Load active departments once
  useEffect(() => {
    dataService.getDepartments().then((deps) => {
      setDepartments(deps.filter((d) => d.isActive));
    }).catch(() => {});
  }, []);

  // Auto-focus barcode input logic
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'SELECT' &&
          !processing) {
        barcodeInputRef.current?.focus();
      }
    }, 2000);
    return () => clearInterval(focusInterval);
  }, [processing]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [currentProduct]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;

    try {
      const product = await dataService.getProductByBarcode(barcode);
      if (product) {
        setCurrentProduct(product);
        setBarcode('');
        setSelectedDepartmentId('');
        setTimeout(() => quantityInputRef.current?.focus(), 100);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: `Produto não encontrado: ${barcode}` });
        setBarcode('');
        barcodeInputRef.current?.focus();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setBarcode('');
      barcodeInputRef.current?.focus();
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || !user || !selectedDepartmentId) return;

    setProcessing(true);
    try {
      const delta = mode === 'IN' ? quantity : -quantity;
      await dataService.updateStock(currentProduct.id, delta, user, 'Scanner Rápido', selectedDepartmentId);
      setMessage({
        type: 'success',
        text: `Sucesso! ${mode === 'IN' ? 'Entrada' : 'Saída'} de ${quantity}x ${currentProduct.name}`
      });
      setCurrentProduct(null);
      setQuantity(1);
      setSelectedDepartmentId('');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const isLowStock = currentProduct ? currentProduct.quantity <= currentProduct.minStock : false;
  const canConfirm = !processing && !!selectedDepartmentId;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Scanner Rápido</h2>
        <p className="text-slate-500">Modo de alta velocidade para leitor de código de barras</p>
      </div>

      {/* Mode Switcher */}
      <div className="flex bg-slate-200 p-1 rounded-xl">
        <button
          onClick={() => { setMode('OUT'); barcodeInputRef.current?.focus(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${mode === 'OUT' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <PackageMinus size={20} />
          SAÍDA (Retirada)
        </button>
        <button
          onClick={() => { setMode('IN'); barcodeInputRef.current?.focus(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${mode === 'IN' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <PackagePlus size={20} />
          ENTRADA (Reposição)
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Status Bar */}
        <div className={`h-2 w-full ${message?.type === 'success' ? 'bg-emerald-500' : message?.type === 'error' ? 'bg-red-500' : 'bg-slate-200'}`} />

        <div className="p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle /> : <XCircle />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {!currentProduct ? (
            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-slate-500 uppercase tracking-wide">Aguardando Leitura</label>
              <div className="relative">
                <ScanBarcode className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={32} />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full pl-16 pr-4 py-4 text-2xl font-mono border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Escaneie o código aqui..."
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-slate-400 text-center">O cursor foca automaticamente neste campo</p>
            </form>
          ) : (
            <form onSubmit={handleTransaction} className="space-y-6 animate-in fade-in zoom-in duration-200">
              {/* Product info card */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">{currentProduct.name}</h3>
                <div className="flex justify-between items-end mt-2">
                  <span className="font-mono text-slate-500">{currentProduct.barcode}</span>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 uppercase block">Estoque Atual</span>
                    <span className="text-2xl font-bold text-slate-800">{currentProduct.quantity}</span>
                  </div>
                </div>
                {/* Min stock indicator */}
                <div className={`mt-3 flex items-center gap-2 text-sm ${isLowStock ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                  {isLowStock && <AlertTriangle size={16} className="text-red-500" />}
                  <span>Estoque mínimo: {currentProduct.minStock} un.</span>
                  {isLowStock && <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold uppercase">Abaixo do mínimo</span>}
                </div>
              </div>

              {/* Department dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {mode === 'OUT' ? 'Setor de Destino' : 'Setor de Origem'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none bg-white text-slate-800"
                >
                  <option value="">Selecione o setor...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {departments.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Nenhum setor cadastrado. Cadastre setores em Configurações.</p>
                )}
              </div>

              {/* Quantity + confirm */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Quantidade para {mode === 'IN' ? 'Adicionar' : 'Retirar'}</label>
                <div className="flex gap-2">
                  <input
                    ref={quantityInputRef}
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 text-2xl font-bold border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!canConfirm}
                    className={`px-8 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center gap-2 ${mode === 'IN' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'} ${!canConfirm ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {processing ? 'PROCESSANDO...' : 'CONFIRMAR'}
                    {!processing && <ArrowRight size={24} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setCurrentProduct(null); setBarcode(''); setSelectedDepartmentId(''); }}
                className="w-full text-slate-500 hover:text-slate-800 text-sm font-medium py-2"
              >
                Cancelar Operação (Esc)
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;
