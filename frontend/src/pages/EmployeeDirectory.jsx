import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import CardView from '../components/CardView';
import ListView from '../components/ListView';
import { Search, LayoutGrid, List } from 'lucide-react';

export default function EmployeeDirectory() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'

  // Filters
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (domainFilter) params.append('domain', domainFilter);
      if (typeFilter) params.append('employment_type', typeFilter);

      const data = await apiFetch(`/employees${params.toString() ? `?${params.toString()}` : ''}`);
      setEmployees(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, domainFilter, typeFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Search & Filter Toolbar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left: Search input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} color="var(--color-secondary-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search employee name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '38px', paddingRight: '12px', height: '40px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-card-border)', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Center: Dropdown Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-card-border)', fontSize: '0.86rem', backgroundColor: '#FFFFFF' }}
            >
              <option value="">All Employment Types</option>
              <option value="full-time">Full-Time</option>
              <option value="internship">Internship</option>
            </select>

            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-card-border)', fontSize: '0.86rem', backgroundColor: '#FFFFFF' }}
            >
              <option value="">All Domains</option>
              <option value="Software Engineering">Software Engineering</option>
              <option value="AI & Robotics">AI & Robotics</option>
              <option value="Automotive Systems">Automotive Systems</option>
              <option value="Human Resources">Human Resources</option>
            </select>
          </div>

          {/* Right: View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-card-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                border: 'none',
                backgroundColor: viewMode === 'card' ? 'var(--color-primary-tint)' : '#FFFFFF',
                color: viewMode === 'card' ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                fontWeight: viewMode === 'card' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.86rem'
              }}
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid size={16} />
              <span>Cards</span>
            </button>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                border: 'none',
                borderLeft: '1px solid var(--color-card-border)',
                backgroundColor: viewMode === 'list' ? 'var(--color-primary-tint)' : '#FFFFFF',
                color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                fontWeight: viewMode === 'list' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.86rem'
              }}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
              <span>List</span>
            </button>
          </div>

        </div>
      </div>

      {/* Directory Content */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-secondary-text)' }}>
          Loading directory...
        </div>
      ) : viewMode === 'card' ? (
        <CardView data={employees} />
      ) : (
        <ListView data={employees} />
      )}
    </div>
  );
}
