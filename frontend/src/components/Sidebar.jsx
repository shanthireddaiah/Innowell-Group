import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Video, 
  LifeBuoy, 
  Receipt, 
  UserCheck, 
  UserCircle 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employee Directory', icon: Users },
    { id: 'leaves', label: 'Leave Management', icon: CalendarDays },
    { id: 'meetings', label: 'Meeting Scheduler', icon: Video },
    { id: 'tickets', label: 'Ticket Support', icon: LifeBuoy },
    { id: 'payroll', label: 'Payroll & Payslips', icon: Receipt },
    { id: 'attendance', label: 'Attendance Log', icon: UserCheck },
    { id: 'profile', label: 'My Profile', icon: UserCircle },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="innowell-logo-badge">I</div>
        <div>
          <div className="brand-text-title">Innowell HRMS</div>
          <div className="brand-text-subtitle">Agentic AI Portal</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-card-border)', fontSize: '0.8rem', color: 'var(--color-secondary-text)' }}>
        <div>Logged in as:</div>
        <div style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{user?.name}</div>
        <div style={{ fontSize: '0.75rem', marginTop: '2px' }} className="tag-chip tag-info">
          Role: {user?.role}
        </div>
      </div>
    </aside>
  );
}
