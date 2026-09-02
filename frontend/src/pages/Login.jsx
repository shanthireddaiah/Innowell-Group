import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login({ onSwitchToSignup, onSwitchToForgot }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmail, setShowEmail] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="innowell-logo-badge" style={{ margin: '0 auto 12px auto', width: '50px', height: '50px', fontSize: '1.5rem' }}>
            I
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--color-heading)' }}>Innowell Agentic HRMS</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--color-secondary-text)', marginTop: '4px' }}>
            Sign in to access your enterprise portal
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-error-tint)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Email ID with Show/Hide Toggle */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Email ID
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showEmail ? 'text' : 'password'}
                className="form-input"
                required
                style={{ paddingRight: '40px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email ID"
              />
              <button
                type="button"
                onClick={() => setShowEmail(!showEmail)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-secondary-text)',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showEmail ? "Mask Email / Username" : "Show Email / Username"}
              >
                {showEmail ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Password with Show/Hide Toggle */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 600 }}>Password</label>
              <span
                style={{ fontSize: '0.78rem', color: 'var(--color-primary)', cursor: 'pointer' }}
                onClick={onSwitchToForgot}
              >
                Forgot Password?
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                required
                style={{ paddingRight: '40px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-secondary-text)',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '6px', padding: '12px', fontSize: '0.95rem', fontWeight: 600 }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Signup Link */}
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-card-border)', fontSize: '0.84rem' }}>
          Don't have an account?{' '}
          <span style={{ color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={onSwitchToSignup}>
            Sign Up
          </span>
        </div>

      </div>
    </div>
  );
}
