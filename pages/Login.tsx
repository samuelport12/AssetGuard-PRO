import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight, Shield, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(username, password);
    
    if (success) {
      navigate('/');
    } else {
      setError('Credenciais inválidas. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        fontFamily: "'DM Sans', sans-serif",
        background: '#f5f7fb',
      }}
    >
      {/* ── Left panel: Login form ──────────────────────────────── */}
      <div
        style={{
          flex: '0 0 480px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 56px',
          background: '#fff',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Logo & brand */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #4F6BFF 0%, #7B61FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              boxShadow: '0 8px 24px rgba(79, 107, 255, 0.3)',
            }}
          >
            <Shield size={26} color="#fff" />
          </div>
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            Entrar
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            Bem-vindo de volta ao <strong style={{ color: '#4F6BFF' }}>Bastion</strong>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 20,
              color: '#dc2626',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <span style={{ fontSize: 15 }}>⚠</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Username */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 8,
              }}
            >
              Usuário
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu usuário corporativo"
                required
                style={{
                  width: '100%',
                  paddingLeft: 44,
                  paddingRight: 16,
                  paddingTop: 13,
                  paddingBottom: 13,
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 14,
                  color: '#0f172a',
                  background: '#f8fafc',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4F6BFF';
                  e.target.style.boxShadow = '0 0 0 3px rgba(79, 107, 255, 0.1)';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#f8fafc';
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 8,
              }}
            >
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha segura"
                required
                style={{
                  width: '100%',
                  paddingLeft: 44,
                  paddingRight: 48,
                  paddingTop: 13,
                  paddingBottom: 13,
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 14,
                  color: '#0f172a',
                  background: '#f8fafc',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4F6BFF';
                  e.target.style.boxShadow = '0 0 0 3px rgba(79, 107, 255, 0.1)';
                  e.target.style.background = '#fff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#f8fafc';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0,
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-premium"
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #4F6BFF 0%, #7B61FF 100%)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(79, 107, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s',
            }}
          >
            {loading ? 'Autenticando...' : (
              <>
                Entrar
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Demo credentials */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid #f1f5f9',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 6px' }}>
            Demo:{' '}
            <span
              style={{
                fontFamily: 'monospace',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 6,
                color: '#475569',
                fontSize: 11,
              }}
            >
              admin
            </span>{' '}
            /{' '}
            <span
              style={{
                fontFamily: 'monospace',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 6,
                color: '#475569',
                fontSize: 11,
              }}
            >
              admin
            </span>
          </p>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            Operador:{' '}
            <span
              style={{
                fontFamily: 'monospace',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 6,
                color: '#475569',
                fontSize: 11,
              }}
            >
              operador
            </span>{' '}
            /{' '}
            <span
              style={{
                fontFamily: 'monospace',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 6,
                color: '#475569',
                fontSize: 11,
              }}
            >
              operador
            </span>
          </p>
        </div>
      </div>

      {/* ── Right panel: Illustration ──────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #f0f2f7 0%, #e8ecf4 100%)',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            right: '12%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(79, 107, 255, 0.08), rgba(123, 97, 255, 0.04))',
            animation: 'floatShape1 20s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '8%',
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(123, 97, 255, 0.06), rgba(79, 107, 255, 0.03))',
            animation: 'floatShape2 18s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '20%',
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79, 107, 255, 0.04), transparent)',
            animation: 'floatShape3 15s ease-in-out infinite',
          }}
        />

        {/* Illustration container */}
        <div
          style={{
            maxWidth: 520,
            width: '80%',
            textAlign: 'center',
            animation: 'scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
          }}
        >
          <img
            src="/login_illustration.png"
            alt="Pessoa trabalhando no escritório"
            style={{
              width: '100%',
              height: 'auto',
              filter: 'drop-shadow(0 16px 48px rgba(0, 0, 0, 0.08))',
            }}
          />
          <div style={{ marginTop: 32 }}>
            <h2
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 8px',
              }}
            >
              Gerencie seu patrimônio com eficiência
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              Controle de estoque, ativos e movimentações em uma plataforma unificada e segura.
            </p>
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 960px) {
          /* Stack vertically on smaller screens */
          div:first-child {
            flex-direction: column !important;
          }
          div:first-child > div:first-child {
            flex: none !important;
            padding: 32px 24px !important;
          }
          div:first-child > div:last-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;