import React from 'react';
import StatusChip from './StatusChip';
import { Mail, Phone, Briefcase, UserCheck } from 'lucide-react';

export default function CardView({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-secondary-text)' }}>
        No employees found matching the filters.
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'E';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
      {data.map((emp) => (
        <div key={emp.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar-circle" style={{ width: '42px', height: '42px', fontSize: '1rem' }}>
                {getInitials(emp.name)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>{emp.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)' }}>{emp.role}</div>
              </div>
            </div>
            <StatusChip status={emp.employment_type} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem', color: 'var(--color-secondary-text)', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={14} color="#3B82F6" />
              <span>{emp.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={14} color="#3B82F6" />
              <span>Project: <strong style={{ color: 'var(--color-heading)' }}>{emp.assigned_project}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={14} color="#3B82F6" />
              <span>Domain: {emp.domain || 'Engineering'}</span>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)' }}>
              Manager: <strong style={{ color: 'var(--color-heading)' }}>{emp.manager_name || 'Not Assigned'}</strong>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
