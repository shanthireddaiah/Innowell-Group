import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import InnowellChatbot from './components/InnowellChatbot';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import EmployeeDirectory from './pages/EmployeeDirectory';
import LeaveManagement from './pages/LeaveManagement';
import MeetingScheduler from './pages/MeetingScheduler';
import TicketDesk from './pages/TicketDesk';
import PayrollAttendance from './pages/PayrollAttendance';
import ProfileSettings from './pages/ProfileSettings';

export default function App() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatbotOpen, setChatbotOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', color: 'var(--color-secondary-text)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="innowell-logo-badge" style={{ margin: '0 auto 16px auto', width: '56px', height: '56px', fontSize: '1.6rem' }}>I</div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-heading)' }}>Loading Innowell HRMS...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'signup') {
      return <Signup onSwitchToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot') {
      return <ForgotPassword onSwitchToLogin={() => setAuthView('login')} />;
    }
    return (
      <Login
        onSwitchToSignup={() => setAuthView('signup')}
        onSwitchToForgot={() => setAuthView('forgot')}
      />
    );
  }

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Executive Workspace Dashboard';
      case 'employees': return 'Employee Directory (Card & List Views)';
      case 'leaves': return 'Agentic AI Leave Management';
      case 'meetings': return 'Agentic Meeting Scheduler';
      case 'tickets': return 'Intelligent Ticket Desk & Triage';
      case 'payroll': return 'Payroll & Payslips (Row-Isolated)';
      case 'attendance': return 'Daily Attendance Log';
      case 'profile': return 'My Employee Profile';
      default: return 'Innowell Agentic HRMS';
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Area */}
      <div className="main-content">
        <Header
          title={getPageTitle()}
          onToggleChatbot={() => setChatbotOpen(!chatbotOpen)}
        />

        <main className="page-body">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} onOpenChatbot={() => setChatbotOpen(true)} />}
          {activeTab === 'employees' && <EmployeeDirectory />}
          {activeTab === 'leaves' && <LeaveManagement />}
          {activeTab === 'meetings' && <MeetingScheduler />}
          {activeTab === 'tickets' && <TicketDesk />}
          {activeTab === 'payroll' && <PayrollAttendance type="payroll" />}
          {activeTab === 'attendance' && <PayrollAttendance type="attendance" />}
          {activeTab === 'profile' && <ProfileSettings />}
        </main>
      </div>

      {/* Embedded Innowell AI Assistant Drawer */}
      <InnowellChatbot isOpen={chatbotOpen} onClose={() => setChatbotOpen(false)} />

      {/* Floating AI Assistant FAB Button */}
      <button
        className="chatbot-fab"
        onClick={() => setChatbotOpen(!chatbotOpen)}
        title={chatbotOpen ? "Close Innowell AI Assistant" : "Open Innowell AI Assistant"}
        aria-label="Toggle Innowell AI Assistant"
      >
        {chatbotOpen ? <X size={22} color="#FFFFFF" /> : <Sparkles size={22} color="#FFFFFF" />}
      </button>
    </div>
  );
}
