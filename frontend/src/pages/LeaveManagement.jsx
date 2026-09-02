import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import StatusChip from '../components/StatusChip';
import { Sparkles, Calendar, Plus, CheckCircle, XCircle, AlertCircle, ShieldCheck, Zap, Info, RotateCw } from 'lucide-react';

export default function LeaveManagement() {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [holidays, setHolidays] = useState([]);
  const [holidaysModalOpen, setHolidaysModalOpen] = useState(false);
  const [holidayTab, setHolidayTab] = useState('upcoming'); // 'upcoming' | 'all'
  const [holidaySearch, setHolidaySearch] = useState('');

  // Leave Application Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(1);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [daysRequested, setDaysRequested] = useState(1);
  const [userNotes, setUserNotes] = useState('');
  const [agenticLoading, setAgenticLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);

  const computeEndDate = (start, days) => {
    if (!start) return '';
    const d = new Date(start);
    const numDays = Math.max(1, Math.ceil(Number(days) || 1));
    d.setDate(d.getDate() + numDays - 1);
    return d.toISOString().split('T')[0];
  };

  const getHolidayInfo = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    
    if (d.getDay() === 0) {
      return { isHoliday: true, reason: 'Sunday (Weekly Off)' };
    }
    if (d.getDay() === 6) {
      const dayOfMonth = d.getDate();
      const satIndex = Math.floor((dayOfMonth - 1) / 7) + 1;
      if (satIndex === 2 || satIndex === 4) {
        return { isHoliday: true, reason: `${satIndex === 2 ? '2nd' : '4th'} Saturday (Company Off)` };
      }
    }
    const pubHol = holidays.find(h => h.date === dateStr);
    if (pubHol) {
      return { isHoliday: true, reason: `Public Holiday: ${pubHol.name}` };
    }
    return null;
  };

  const selectedHolidayInfo = getHolidayInfo(startDate);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [hrReason, setHrReason] = useState('');
  const [aiHrLoading, setAiHrLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [balRes, typeRes, reqRes, holRes] = await Promise.all([
        apiFetch('/leaves/balances'),
        apiFetch('/leaves/types'),
        apiFetch(`/leaves/requests${statusFilter ? `?status_filter=${statusFilter}` : ''}`),
        apiFetch('/leaves/holidays')
      ]);
      setBalances(balRes || []);
      setLeaveTypes(typeRes || []);
      setRequests(reqRes || []);
      setHolidays(holRes || []);
      if (typeRes && typeRes.length > 0 && !selectedType) {
        setSelectedType(typeRes[0].id);
      }
    } catch (err) {
      console.error("Leave data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Find currently selected leave balance
  const activeBalanceObj = balances.find(b => Number(b.leave_type_id) === Number(selectedType)) || balances[0];

  // Employee Agentic AI Auto-Apply
  const handleAgenticAutoApply = async (e) => {
    e.preventDefault();
    setAgenticLoading(true);
    setSuccessBanner(null);
    const computedEnd = computeEndDate(startDate, daysRequested);
    try {
      const res = await apiFetch('/leaves/agentic-auto-apply', {
        method: 'POST',
        body: JSON.stringify({
          leave_type_id: Number(selectedType),
          days_requested: Number(daysRequested),
          start_date: startDate,
          end_date: computedEnd,
          user_notes: userNotes
        })
      });
      
      setSuccessBanner({
        message: res.message,
        summary: res.eligibility_summary,
        aiReason: res.ai_drafted_reason
      });
      setUserNotes('');
      loadData();
      
      // Auto close after 3 seconds
      setTimeout(() => {
        setModalOpen(false);
        setSuccessBanner(null);
      }, 3500);
    } catch (err) {
      alert(`Agentic AI Application Error: ${err.message}`);
    } finally {
      setAgenticLoading(false);
    }
  };

  // HR AI Reason Generator (Gemini Powered)
  const handleSuggestHrReason = async (decision) => {
    if (!selectedReq) return;
    setAiHrLoading(true);
    try {
      const res = await apiFetch(`/leaves/${selectedReq.id}/ai-suggest-hr-reason?decision=${decision}`, {
        method: 'POST'
      });
      setHrReason(res.suggested_reason);
    } catch (err) {
      console.error(err);
      alert(`AI Reason Suggestion Error: ${err.message}`);
    } finally {
      setAiHrLoading(false);
    }
  };

  // HR Review Decision Action (Approve / Reject)
  const handleReviewSubmit = async (statusDecision) => {
    if (!selectedReq || reviewing) return;
    setReviewing(true);
    try {
      await apiFetch(`/leaves/${selectedReq.id}/review`, {
        method: 'PUT',
        body: JSON.stringify({
          status: statusDecision,
          hr_reason: hrReason
        })
      });
      setReviewModalOpen(false);
      setSelectedReq(null);
      setHrReason('');
      loadData();
    } catch (err) {
      alert(`Review submit error: ${err.message}`);
    } finally {
      setReviewing(false);
    }
  };

  const isHR = user?.role === 'HR' || user?.role === 'Admin' || user?.role === 'Manager';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner & Monthly Eligibility Quotas */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-heading)' }}>
              Current Leave Balance
            </h3>
            <div style={{ fontSize: '0.84rem', color: 'var(--color-secondary-text)' }}>
              Logged in as <strong style={{ color: 'var(--color-heading)' }}>{user?.name}</strong> ({user?.role})
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              disabled={loading}
              onClick={loadData}
              style={{ height: '38px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Refresh Leave Requests & Balances"
            >
              <RotateCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>

            <button className="btn btn-primary" onClick={() => { setModalOpen(true); setSuccessBanner(null); }}>
              <Zap size={16} color="#FFFFFF" />
              <span>Apply via Agentic AI</span>
            </button>
          </div>
        </div>

        {/* Balance Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {balances.map((b) => {
            const isEligible = b.remaining_days > 0;
            return (
              <div key={b.leave_type_id} className="card" style={{ padding: '16px 20px', borderLeft: `4px solid ${isEligible ? '#3B82F6' : '#EF4444'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {b.leave_type_code} • {b.leave_type_name}
                  </div>
                  <span className={`tag-chip ${isEligible ? 'tag-success' : 'tag-error'}`} style={{ fontSize: '0.7rem' }}>
                    {isEligible ? 'Eligible' : 'Quota Full'}
                  </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-heading)', marginTop: '6px' }}>
                  {b.remaining_days} <span style={{ fontSize: '0.82rem', fontWeight: 400, color: 'var(--color-secondary-text)' }}>days remaining this year</span>
                </div>
                {(b.leave_type_code === 'GL' || b.leave_type_code === 'SL') && (
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                    • Accrual: 1 leave credited / month (12/year)
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Company Public Holidays & Special Leaves Information Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div 
            className="card" 
            style={{ 
              backgroundColor: '#F8FAFC', 
              border: '1px solid #BFDBFE', 
              padding: '14px 18px', 
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
            onClick={() => setHolidaysModalOpen(true)}
            title="Click to view full Indian Government & Festival Holiday Calendar"
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#3B82F6" />
                <span>Indian Govt & Festival Holidays</span>
                <span className="tag-chip tag-info" style={{ fontSize: '0.7rem', padding: '1px 8px' }}>
                  {holidays.filter(h => h.is_upcoming).length || 15} Upcoming
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-secondary-text)', marginTop: '4px' }}>
                Gazetted, Festival & Mandatory Shutdowns from Sep 2nd onwards. Click to view calendar &rarr;
              </div>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.78rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
              onClick={(e) => { e.stopPropagation(); setHolidaysModalOpen(true); }}
            >
              View Calendar
            </button>
          </div>

          <div className="card" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-heading)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#10B981" />
              <span>Special & Non-Deductible Leaves</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-secondary-text)', marginTop: '4px' }}>
              Maternity Leave (ML: 180d) & Paternity Leave (PL: 15d) are non-deductible from EL/GL/SL quotas.
            </div>
          </div>
        </div>
      </div>

      {/* Main Leave Requests Table / Column */}
      <div className="card">
        <div className="card-header-row">
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#3B82F6" />
              <span>{isHR ? 'HR Portal — Company Leave Requests' : 'Your Applied Leave Requests'}</span>
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-secondary-text)', marginTop: '2px' }}>
              {isHR ? 'Review, approve, or reject employee applications using Gemini AI response suggestions.' : 'All leave applications automatically generated and submitted via Gemini Agentic AI.'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              disabled={loading}
              onClick={loadData}
              style={{ height: '38px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Refresh Applied Leave Requests"
            >
              <RotateCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>

            <select className="form-select" style={{ width: '160px', height: '38px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Leave Type</th>
                <th>Days Requested</th>
                <th>Gemini AI-Generated Reason</th>
                <th>HR Decision & Remark</th>
                <th>Status</th>
                {isHR && <th>HR Action</th>}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isHR ? 7 : 6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-secondary-text)' }}>
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{r.user_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)' }}>{r.user_email}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#3B82F6' }}>{r.leave_type_name}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-heading)' }}>{r.days_requested} day(s)</div>
                      {r.start_date && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="#3B82F6" />
                          <span>{r.start_date}{r.end_date && r.end_date !== r.start_date ? ` to ${r.end_date}` : ''}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: '320px', fontSize: '0.84rem', color: 'var(--color-heading)', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <Sparkles size={14} color="#3B82F6" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span>{r.ai_drafted_reason || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '240px', fontSize: '0.84rem', color: 'var(--color-secondary-text)', lineHeight: '1.4' }}>
                      {r.hr_reason ? (
                        <span style={{ color: 'var(--color-heading)' }}>{r.hr_reason}</span>
                      ) : r.status === 'pending' ? (
                        <span style={{ fontStyle: 'italic', opacity: 0.7 }}>Pending HR Review</span>
                      ) : (
                        <span style={{ color: 'var(--color-heading)' }}>{r.status === 'approved' ? 'Approved as requested.' : 'Rejected by HR.'}</span>
                      )}
                    </td>
                    <td>
                      <StatusChip status={r.status} />
                    </td>
                    {isHR && (
                      <td>
                        {r.status === 'pending' ? (
                          <button
                            className="btn btn-ai"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                            onClick={() => { setSelectedReq(r); setHrReason(''); setReviewModalOpen(true); }}
                          >
                            <Sparkles size={14} />
                            <span>Review & Respond</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', fontWeight: 500 }}>Completed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Agentic AI Leave Application Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={22} color="#3B82F6" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-heading)' }}>
                  Agentic AI Leave Application
                </h3>
              </div>
              <XCircle size={20} style={{ cursor: 'pointer', color: 'var(--color-secondary-text)' }} onClick={() => setModalOpen(false)} />
            </div>

            {successBanner ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-success-tint)', border: '1px solid #A7F3D0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontWeight: 700, fontSize: '0.98rem' }}>
                  <CheckCircle size={22} />
                  <span>{successBanner.message}</span>
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--color-heading)' }}>
                  <strong>Eligibility:</strong> {successBanner.summary}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#065F46', backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #6EE7B7' }}>
                  <strong>Gemini AI Reason Generated:</strong> "{successBanner.aiReason}"
                </div>
              </div>
            ) : (
              <form onSubmit={handleAgenticAutoApply} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. Select Leave Type */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.86rem', fontWeight: 600 }}>1. Select Leave Type</label>
                  <select
                    className="form-select"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    style={{ height: '42px', fontSize: '0.9rem' }}
                  >
                    {leaveTypes.map((lt) => {
                      const bal = balances.find(b => Number(b.leave_type_id) === Number(lt.id));
                      return (
                        <option key={lt.id} value={lt.id}>
                          {lt.name} ({lt.code}) — {bal ? bal.remaining_days : lt.default_annual_quota} days remaining this year
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Start Date & Number of Days */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.86rem', fontWeight: 600 }}>2. Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ height: '42px', fontSize: '0.9rem' }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.86rem', fontWeight: 600 }}>3. How Many Days?</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="180"
                      className="form-input"
                      value={daysRequested}
                      onChange={(e) => setDaysRequested(e.target.value)}
                      style={{ height: '42px', fontSize: '0.9rem' }}
                      required
                    />
                  </div>
                </div>

                {/* Calculated Date Summary Badge */}
                {startDate && (
                  <div style={{ backgroundColor: '#F0F9FF', padding: '10px 14px', borderRadius: '6px', border: '1px solid #BAE6FD', fontSize: '0.82rem', color: '#0369A1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} />
                    <span>
                      <strong>Selected Leave Period:</strong> {startDate} &rarr; <strong>{computeEndDate(startDate, daysRequested)}</strong> ({daysRequested} day{daysRequested > 1 ? 's' : ''})
                    </span>
                  </div>
                )}

                {/* Holiday Fun Detection Banner */}
                {selectedHolidayInfo && (
                  <div style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '0.86rem',
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '1.6rem' }}>🎉</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        Woohoo! {startDate} is already an official holiday ({selectedHolidayInfo.reason})! 🏖️
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '2px' }}>
                        No need to spend your leave quota on a day off — relax and enjoy your day off! 😎✨
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Optional Notes for AI Context */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.84rem', color: 'var(--color-secondary-text)' }}>4. Optional Notes for AI Context</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Family event, personal travel..."
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={agenticLoading || Boolean(selectedHolidayInfo)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: selectedHolidayInfo ? 0.6 : 1,
                      cursor: selectedHolidayInfo ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Zap size={18} />
                    <span>
                      {selectedHolidayInfo
                        ? `🏖️ Date is Already a Holiday (${selectedHolidayInfo.reason})`
                        : agenticLoading
                          ? 'Gemini Agentic AI Applying Automatically...'
                          : 'Apply Automatically via Agentic AI'}
                    </span>
                  </button>
                  <div style={{ textAlign: 'center', fontSize: '0.76rem', color: 'var(--color-secondary-text)', marginTop: '8px' }}>
                    {selectedHolidayInfo
                      ? '✨ Relax! You have the day off automatically without using any leave quota.'
                      : 'Gemini AI will evaluate eligibility, draft official application reason, and submit to HR in 1 step.'}
                  </div>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* HR Review Modal with Gemini AI Response Reason Suggestions */}
      {reviewModalOpen && selectedReq && (
        <div className="modal-overlay" onClick={() => setReviewModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-heading)' }}>
                HR Review Leave Request
              </h3>
              <XCircle size={20} style={{ cursor: 'pointer', color: 'var(--color-secondary-text)' }} onClick={() => setReviewModalOpen(false)} />
            </div>

            {/* Applicant Summary Card */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '0.86rem', marginBottom: '16px', border: '1px solid var(--color-card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span><strong>Applicant:</strong> {selectedReq.user_name} ({selectedReq.user_email})</span>
                <span style={{ fontWeight: 600, color: '#3B82F6' }}>{selectedReq.leave_type_name}</span>
              </div>
              <div style={{ marginBottom: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span><strong>Days Requested:</strong> {selectedReq.days_requested} day(s)</span>
                {selectedReq.start_date && (
                  <span><strong>Dates:</strong> {selectedReq.start_date} {selectedReq.end_date ? `to ${selectedReq.end_date}` : ''}</span>
                )}
              </div>
              <div style={{ color: 'var(--color-heading)' }}>
                <strong>AI-Drafted Reason:</strong> "{selectedReq.ai_drafted_reason}"
              </div>
            </div>

            {/* HR Reason with Gemini AI Suggestions */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: 600, margin: 0 }}>
                  HR Response Remark (Optional)
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-ai"
                    disabled={aiHrLoading}
                    style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                    onClick={() => handleSuggestHrReason('approved')}
                  >
                    <Sparkles size={12} />
                    <span>AI Approve Reason</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={aiHrLoading}
                    style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                    onClick={() => handleSuggestHrReason('rejected')}
                  >
                    <Sparkles size={12} />
                    <span>AI Reject Reason</span>
                  </button>
                </div>
              </div>

              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Optional HR decision remark... Click AI buttons above for automated policy recommendations."
                value={hrReason}
                onChange={(e) => setHrReason(e.target.value)}
              />
            </div>

            {/* HR Decision Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn"
                disabled={reviewing}
                style={{ backgroundColor: 'var(--color-error)', color: '#FFFFFF' }}
                onClick={() => handleReviewSubmit('rejected')}
              >
                Reject Request
              </button>
              <button
                className="btn btn-primary"
                disabled={reviewing}
                onClick={() => handleReviewSubmit('approved')}
              >
                Approve Request
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Official Indian Government & Festival Holidays Calendar Modal */}
      {holidaysModalOpen && (
        <div className="modal-overlay" onClick={() => setHolidaysModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '680px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--color-card-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.18rem', fontWeight: 700, color: 'var(--color-heading)', margin: 0 }}>
                    Official Indian Govt & Festival Holidays
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)' }}>
                    2026 Calendar &bull; Gazetted, Regional Festival & Mandatory Year-End Shutdowns
                  </div>
                </div>
              </div>
              <XCircle size={22} style={{ cursor: 'pointer', color: 'var(--color-secondary-text)' }} onClick={() => setHolidaysModalOpen(false)} />
            </div>

            {/* Filter Tabs & Search Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setHolidayTab('upcoming')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: holidayTab === 'upcoming' ? '#FFFFFF' : 'transparent',
                    color: holidayTab === 'upcoming' ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                    boxShadow: holidayTab === 'upcoming' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Upcoming (From Sep 2nd) ({holidays.filter(h => h.is_upcoming).length})
                </button>
                <button
                  type="button"
                  onClick={() => setHolidayTab('all')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: holidayTab === 'all' ? '#FFFFFF' : 'transparent',
                    color: holidayTab === 'all' ? 'var(--color-primary)' : 'var(--color-secondary-text)',
                    boxShadow: holidayTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  All 2026 ({holidays.length})
                </button>
              </div>

              <input
                type="text"
                className="form-input"
                placeholder="Search holiday name / type..."
                style={{ width: '220px', height: '36px', fontSize: '0.82rem', padding: '0 10px' }}
                value={holidaySearch}
                onChange={(e) => setHolidaySearch(e.target.value)}
              />
            </div>

            {/* Holidays List Scrollable Container */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', maxHeight: '50vh' }}>
              {holidays
                .filter(h => {
                  if (holidayTab === 'upcoming' && !h.is_upcoming) return false;
                  if (holidaySearch) {
                    const q = holidaySearch.toLowerCase();
                    return h.name.toLowerCase().includes(q) || h.holiday_type.toLowerCase().includes(q);
                  }
                  return true;
                })
                .map((h) => {
                  const isUpcoming = h.is_upcoming;
                  const isGazetted = h.holiday_type?.toLowerCase().includes('gazetted') || h.holiday_type?.toLowerCase().includes('national');
                  const isFestival = h.holiday_type?.toLowerCase().includes('festival');
                  const isShutdown = h.holiday_type?.toLowerCase().includes('shutdown');

                  let badgeColor = '#3B82F6';
                  let badgeBg = '#EFF6FF';
                  let badgeLabel = 'Public Holiday';
                  if (isGazetted) {
                    badgeColor = '#D97706';
                    badgeBg = '#FEF3C7';
                    badgeLabel = '🇮🇳 Gazetted';
                  } else if (isFestival) {
                    badgeColor = '#059669';
                    badgeBg = '#D1FAE5';
                    badgeLabel = '🪔 Festival';
                  } else if (isShutdown) {
                    badgeColor = '#7C3AED';
                    badgeBg = '#EDE9FE';
                    badgeLabel = '🏢 Mandatory Shutdown';
                  }

                  return (
                    <div
                      key={h.id || h.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: isUpcoming ? '#FFFFFF' : '#F9FAFB',
                        border: isUpcoming ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
                        borderLeft: `4px solid ${badgeColor}`,
                        boxShadow: isUpcoming ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                        opacity: isUpcoming ? 1 : 0.7
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--color-heading)' }}>
                            {h.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: badgeBg, color: badgeColor, fontWeight: 700 }}>
                            {badgeLabel}
                          </span>
                          {isUpcoming && (
                            <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 600 }}>
                              Upcoming
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', marginTop: '2px' }}>
                          {h.holiday_type}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                          {h.date}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--color-secondary-text)', fontWeight: 500 }}>
                          {h.day_name || ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-card-border)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)' }}>
                💡 Company Public Holidays are non-deductible from EL/GL balances.
              </div>
              <button className="btn btn-primary" onClick={() => setHolidaysModalOpen(false)}>
                Close Calendar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
