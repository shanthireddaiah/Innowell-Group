import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api';
import { Search, UserCheck, X, Building, Mail, Hash, Briefcase } from 'lucide-react';

export default function EmployeeSearch({ selectedEmployee, onSelectEmployee }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/employees/search?q=${encodeURIComponent(searchTerm)}`);
        setResults(data || []);
        setIsOpen(true);
      } catch (err) {
        console.error("Employee search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelect = (emp) => {
    onSelectEmployee({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      assigned_project: emp.assigned_project || "AI HRMS",
      domain: emp.domain || "Artificial Intelligence & Data Science",
      employee_id: `EMP${emp.id.toString().padStart(3, '0')}`
    });
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      {selectedEmployee ? (
        /* Selected Employee Card (Requirement #1 & #3) */
        <div className="card" style={{ padding: '16px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#3B82F6', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>
                {selectedEmployee.name ? selectedEmployee.name.charAt(0) : 'E'}
              </div>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-heading)' }}>
                  {selectedEmployee.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#0369A1', fontWeight: 500 }}>
                  {selectedEmployee.domain || 'AI & Data Science'} • {selectedEmployee.role || 'Employee'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onSelectEmployee(null)}
              style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <X size={14} />
              <span>Change Employee</span>
            </button>
          </div>

          {/* Profile Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.82rem', color: 'var(--color-heading)', paddingTop: '10px', borderTop: '1px solid #E0F2FE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="#0284C7" />
              <span><strong>Email:</strong> {selectedEmployee.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Hash size={14} color="#0284C7" />
              <span><strong>Employee ID:</strong> {selectedEmployee.employee_id || `EMP${selectedEmployee.id}`}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={14} color="#0284C7" />
              <span><strong>Department:</strong> {selectedEmployee.domain || 'Engineering'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={14} color="#0284C7" />
              <span><strong>Project:</strong> {selectedEmployee.assigned_project || 'Unassigned'}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Autocomplete Search Input */
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.86rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={16} color="#3B82F6" />
            <span>Search Employee (Name or Email)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Type 'Shanthi', 'Janani', 'Kannan', 'Leninkumar', 'Ravi', 'Priya'..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm.trim() && setIsOpen(true)}
              style={{ height: '42px', fontSize: '0.9rem', paddingLeft: '36px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--color-secondary-text)' }} />
          </div>

          {/* Autocomplete Results Dropdown */}
          {isOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-md)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', border: '1px solid var(--color-card-border)', marginTop: '4px', maxHeight: '260px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '14px', fontSize: '0.84rem', color: 'var(--color-secondary-text)', textAlign: 'center' }}>
                  Searching employee database...
                </div>
              ) : results.length === 0 ? (
                <div style={{ padding: '14px', fontSize: '0.84rem', color: 'var(--color-secondary-text)', textAlign: 'center' }}>
                  No matching employees found in database.
                </div>
              ) : (
                results.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-heading)' }}>
                        {emp.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)' }}>
                        {emp.domain || 'AI & Data Science'} • {emp.email}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.74rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      EMP{emp.id.toString().padStart(3, '0')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
