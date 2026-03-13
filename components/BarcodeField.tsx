import React, { useRef, useEffect, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import { barcode, gradients } from '../theme/colors';

const BarcodeIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 13l2 2 4-4" />
        <circle cx="12" cy="18" r="3" />
        <path d="M12 15v1" />
        <path d="M12 20v1" />
        <path d="M10.5 18h-1" />
        <path d="M14.5 18h-1" />
    </svg>
);

interface BarcodeFieldProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: string;
    prefix?: string;
    label?: string;
    placeholder?: string;
}

const generateCode = (prefix: string): string => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${ts}${rand}`;
};

const BarcodeField = React.forwardRef<HTMLInputElement, BarcodeFieldProps>(({
    value,
    onChange,
    disabled = false,
    error,
    prefix = 'AG',
    label = 'Código de Barras *',
    placeholder = 'Ex: AG-M1234567890',
}, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);

    // Render barcode whenever value changes
    useEffect(() => {
        if (!svgRef.current) return;
        if (!value || value.trim().length < 3) {
            // Clear SVG if value is too short
            svgRef.current.innerHTML = '';
            return;
        }
        try {
            JsBarcode(svgRef.current, value, {
                format: 'CODE128',
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 13,
                font: 'monospace',
                textMargin: 4,
                margin: 8,
                background: barcode.background,
                lineColor: barcode.lineColor,
            });
        } catch {
            // If barcode can't be rendered (invalid chars), clear
            if (svgRef.current) svgRef.current.innerHTML = '';
        }
    }, [value]);

    const handleGenerate = useCallback(() => {
        if (disabled) return;
        onChange(generateCode(prefix));
    }, [disabled, onChange, prefix]);

    const handlePrint = useCallback(() => {
        if (!svgRef.current || !value) return;

        const svgHtml = svgRef.current.outerHTML;
        const printWindow = window.open('', '_blank', 'width=400,height=300');
        if (!printWindow) return;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${value}</title>
        <style>
          @page {
            size: 60mm 30mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 4mm;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: monospace;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${svgHtml}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        <\/script>
      </body>
      </html>
    `);
        printWindow.document.close();
    }, [value]);

    return (
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    ref={ref}
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`flex-1 px-4 py-2.5 border rounded-lg outline-none transition-all text-sm font-mono disabled:opacity-60 disabled:cursor-not-allowed ${error
                        ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                />
                <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={disabled}
                    title="Gerar código automaticamente"
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    style={{
                        background: gradients.primaryBtn,
                        whiteSpace: 'nowrap',
                    }}
                >
                    <BarcodeIcon size={14} />
                    Gerar
                </button>
                {value && value.trim().length >= 3 && (
                    <button
                        type="button"
                        onClick={handlePrint}
                        disabled={disabled}
                        title="Imprimir etiqueta"
                        className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200 disabled:opacity-50"
                    >
                        <Printer size={16} />
                    </button>
                )}
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

            {/* Barcode preview */}
            {value && value.trim().length >= 3 && (
                <div
                    className="mt-3 flex justify-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
                    style={{ animation: 'fadeIn 0.3s ease-out' }}
                >
                    <svg ref={svgRef} />
                </div>
            )}
        </div>
    );
});

export default BarcodeField;
