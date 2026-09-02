import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import StatusChip from '../components/StatusChip';
import { Sparkles, Calendar, LifeBuoy, Users, CheckCircle, Clock, Video } from 'lucide-react';

export default function Dashboard({ setActiveTab, onOpenChatbot }) {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [balRes, mtgRes, tktRes] = await Promise.all([
          apiFetch('/leaves/balances'),
          apiFetch('/meetings'),
          apiFetch('/tickets')
        ]);
        setBalances(balRes || []);
        setMeetings(mtgRes || []);
        setTickets(tktRes || []);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const totalEarnedLeave = balances.find(b => b.leave_type_code === 'EL')?.remaining_days || 0;
  const totalGeneralLeave = balances.find(b => b.leave_type_code === 'GL')?.remaining_days || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #FFFFFF, #EFF6FF)', borderColor: '#BFDBFE' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="tag-chip tag-info">Role: {user?.role}</span>
              <span className="tag-chip tag-success">{user?.assigned_project || 'Innowell Mobility Platform'}</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-heading)' }}>
              Welcome back, {user?.name}! 👋
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-secondary-text)', marginTop: '4px' }}>
              Innowell Agentic AI Copilot is actively monitoring your leave eligibility, schedule, and support tickets.
            </p>
          </div>
          <button className="btn btn-ai" onClick={onOpenChatbot} style={{ padding: '10px 18px', fontSize: '0.9rem' }}>
            <Sparkles size={18} />
            <span>Launch Innowell AI Agent</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-primary-tint)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', fontWeight: 600, textTransform: 'uppercase' }}>Earned Leave Balance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-heading)' }}>{totalEarnedLeave} Days</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-success-tint)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', fontWeight: 600, textTransform: 'uppercase' }}>General Leave Balance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-heading)' }}>{totalGeneralLeave} Days</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-info-tint)', color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <Video size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', fontWeight: 600, textTransform: 'uppercase' }}>Upcoming Meetings</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-heading)' }}>{meetings.length} Scheduled</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-warning-tint)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <LifeBuoy size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', fontWeight: 600, textTransform: 'uppercase' }}>Active Support Tickets</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-heading)' }}>{tickets.length} Active</div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Upcoming Meetings Card */}
        <div className="card">
          <div className="card-header-row">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} color="#3B82F6" />
              <span>Agentic Meeting Schedule</span>
            </div>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setActiveTab('meetings')}>
              Schedule New
            </button>
          </div>

          {meetings.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-secondary-text)', fontSize: '0.88rem' }}>
              No upcoming meetings. Use the Agentic Scheduler to request one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {meetings.slice(0, 3).map((m) => (
                <div key={m.id} style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-card-border)', backgroundColor: '#FAFAFA' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{m.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', marginTop: '4px' }}>
                    📅 {new Date(m.parsed_datetime).toLocaleString()} ({m.duration_minutes} mins)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Tickets Overview */}
        <div className="card">
          <div className="card-header-row">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LifeBuoy size={18} color="#3B82F6" />
              <span>Support Tickets & AI Resolution Guidance</span>
            </div>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => setActiveTab('tickets')}>
              View All
            </button>
          </div>

          {tickets.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-secondary-text)', fontSize: '0.88rem' }}>
              No active tickets reported.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tickets.slice(0, 3).map((t) => (
                <div key={t.id} style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-card-border)', backgroundColor: '#FAFAFA' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-heading)' }}>{t.category}</span>
                    <StatusChip status={t.status} />
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-heading)', fontWeight: 500 }}>
                    {t.description}
                  </div>
                  {t.ai_explanation && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', marginTop: '4px' }}>
                      {t.ai_explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
