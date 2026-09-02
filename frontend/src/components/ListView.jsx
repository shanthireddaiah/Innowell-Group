import React from 'react';
import StatusChip from './StatusChip';

export default function ListView({ data }) {
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
    <div className="table-container">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Employee Name</th>
            <th>Role</th>
            <th>Project</th>
            <th>Domain</th>
            <th>Employment Type</th>
            <th>Manager</th>
          </tr>
        </thead>
        <tbody>
          {data.map((emp) => (
            <tr key={emp.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="avatar-circle" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                    {getInitials(emp.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{emp.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)' }}>{emp.email}</div>
                  </div>
                </div>
              </td>
              <td>{emp.role}</td>
              <td>{emp.assigned_project || 'Unassigned'}</td>
              <td>{emp.domain || 'N/A'}</td>
              <td>
                <StatusChip status={emp.employment_type} />
              </td>
              <td>{emp.manager_name || 'Not Assigned'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
