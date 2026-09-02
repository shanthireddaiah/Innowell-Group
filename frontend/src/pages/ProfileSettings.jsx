import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import StatusChip from '../components/StatusChip';
import { User, Phone, MapPin, Mail, Briefcase, Award, GraduationCap, Lock, Check } from 'lucide-react';

export default function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    domain: user?.domain || '',
    education: user?.education || '',
    previous_experience: user?.previous_experience || ''
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmitSelf = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await apiFetch('/employees/me', {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      await refreshUser();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert(`Profile update error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
      {/* Self-Service Personal Profile Card */}
      <div className="card">
        <div className="card-header-row">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="#3B82F6" />
            <span>Personal Information (Self-Service Editable)</span>
          </h3>
        </div>

        {savedSuccess && (
          <div style={{ backgroundColor: 'var(--color-success-tint)', color: 'var(--color-success)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.86rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={16} />
            <span>Personal details updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmitSelf} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.86rem' }}>Full Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="var(--color-primary)" />
              <span>Company Email ID (Read-Only)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                disabled
                readOnly
                style={{ backgroundColor: '#F1F5F9', color: '#475569', cursor: 'not-allowed', fontWeight: 600, paddingRight: '36px' }}
                value={user?.email || ''}
              />
              <Lock size={16} color="#94A3B8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '3px' }}>
              🔒 Official Company Email ID ({user?.email}). Non-editable.
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.86rem' }}>Phone Number</label>
            <input
              type="text"
              className="form-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.86rem' }}>Residential Address</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Bangalore, Karnataka, India"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.86rem' }}>Technical Domain / Specialization</label>
            <input
              type="text"
              className="form-input"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.86rem' }}>Highest Education</label>
            <input
              type="text"
              className="form-input"
              value={formData.education}
              onChange={(e) => setFormData({ ...formData, education: e.target.value })}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.86rem' }}>Prior Industry Experience</label>
            <input
              type="text"
              className="form-input"
              value={formData.previous_experience}
              onChange={(e) => setFormData({ ...formData, previous_experience: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '8px' }}>
            {saving ? 'Saving...' : 'Update Personal Details'}
          </button>
        </form>
      </div>

      {/* Professional Profile Card (Read-Only to Employee) */}
      <div className="card">
        <div className="card-header-row">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={18} color="#3B82F6" />
            <span>Professional Profile (HR / Manager Managed)</span>
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} /> Read-Only to Employee
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.88rem' }}>
          <div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', textTransform: 'uppercase' }}>Assigned Project</div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-heading)' }}>{user?.assigned_project || 'Innowell Mobility Cloud Platform'}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', textTransform: 'uppercase' }}>Assigned Manager</div>
              <div style={{ fontWeight: 600 }}>{user?.manager_name || 'Kannan'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', textTransform: 'uppercase' }}>Employment Type</div>
              <div style={{ marginTop: '4px' }}><StatusChip status={user?.employment_type || 'full-time'} /></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', textTransform: 'uppercase' }}>Domain</div>
              <div style={{ fontWeight: 600 }}>{user?.domain || 'Software Engineering'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', textTransform: 'uppercase' }}>Tenure Start Date</div>
              <div style={{ fontWeight: 600 }}>{user?.tenure_start_date || '2023-01-15'}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', textTransform: 'uppercase' }}>Education</div>
            <div style={{ fontWeight: 500 }}>{user?.education || 'B.Tech in Computer Science / M.Tech AI'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', textTransform: 'uppercase' }}>Prior Industry Experience</div>
            <div style={{ fontWeight: 500 }}>{user?.previous_experience || '5+ years in Enterprise Software & Cloud Technology'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
