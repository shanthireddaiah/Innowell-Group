import React, { useState } from 'react';
import { apiFetch } from '../api';
import { KeyRound, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function ForgotPassword({ onSwitchToLogin }) {
  const [step, setStep] = useState(1); // 1: Email verify, 2: Reset Password, 3: Success
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Verify Email
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setSuccessMessage(res.message);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email,
          new_password: newPassword
        })
      });
      setSuccessMessage(res.message);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: '20px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '36px', boxShadow: 'var(--shadow-lg)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="innowell-logo-badge" style={{ margin: '0 auto 12px auto', width: '48px', height: '48px', fontSize: '1.4rem' }}>
            <KeyRound size={24} color="#3B82F6" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-heading)' }}>Reset Your Password</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--color-secondary-text)', marginTop: '4px' }}>
            Innowell Agentic HRMS Authentication Service
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-error-tint)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleVerifyEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Email ID
              </label>
              <input
                type="email"
                className="form-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email ID"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 600, marginTop: '8px' }}
            >
              {loading ? 'Verifying Corporate Email...' : 'Verify Email & Continue'}
            </button>
          </form>
        )}

        {/* STEP 2: Set New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ backgroundColor: 'var(--color-primary-tint)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--color-primary)' }}>
              Verified: <strong>{email}</strong>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  required
                  style={{ paddingRight: '40px' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary-text)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 600, marginTop: '8px' }}
            >
              {loading ? 'Updating Password...' : 'Reset Password Now'}
            </button>
          </form>
        )}

        {/* STEP 3: Success */}
        {step === 3 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'var(--color-success)', display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={48} />
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-heading)' }}>
              Password Reset Successfully!
            </div>
            <div style={{ fontSize: '0.86rem', color: 'var(--color-secondary-text)' }}>
              {successMessage}
            </div>
            <button
              className="btn btn-primary"
              onClick={onSwitchToLogin}
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 600, marginTop: '8px' }}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Back to Login Link */}
        {step !== 3 && (
          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-card-border)', fontSize: '0.84rem' }}>
            <span
              style={{ color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={onSwitchToLogin}
            >
              <ArrowLeft size={16} />
              <span>Back to Sign In</span>
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
