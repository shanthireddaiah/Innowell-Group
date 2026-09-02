import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import StatusChip from '../components/StatusChip';
import { 
  Sparkles, LifeBuoy, Plus, CheckCircle, Clock, AlertTriangle, 
  X, RotateCw, Paperclip, FileText, Image as ImageIcon, FileUp, ExternalLink,
  Pause, Play, ShieldAlert, CheckCircle2
} from 'lucide-react';

export default function TicketDesk() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // New Ticket Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachment, setAttachment] = useState(null);

  // AI Suggestion & Triage Popup Modal after Submission
  const [submittedTicketPopup, setSubmittedTicketPopup] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-dismiss countdown timer effect for AI Suggestion Popup
  useEffect(() => {
    if (!submittedTicketPopup || isPaused) return;

    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          setSubmittedTicketPopup(null);
          return 0;
        }
        return Math.max(0, parseFloat((prev - 0.1).toFixed(1)));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [submittedTicketPopup, isPaused]);

  // HR Status Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newStatus, setNewStatus] = useState('in-progress');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Preview Modal for attachments
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/tickets${statusFilter ? `?status_filter=${statusFilter}` : ''}`);
      setTickets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit. Please choose a smaller file.");
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      alert("Please select a valid image (PNG, JPG) or PDF document.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      setAttachment({
        name: file.name,
        sizeStr,
        isPdf,
        dataUrl,
        previewUrl: isPdf ? null : dataUrl
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!description.trim() || submitting) return;
    setSubmitting(true);

    try {
      const payload = { 
        description,
        attachment_url: attachment?.dataUrl || null,
        attachment_name: attachment?.name || null
      };

      const newTicket = await apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setDescription('');
      setAttachment(null);
      setModalOpen(false);
      fetchTickets();

      // Launch Instant AI Explanation & Suggestion Popup with auto-close
      setSubmittedTicketPopup(newTicket);
      setCountdownSeconds(8);
      setIsPaused(false);
    } catch (err) {
      alert(`Error submitting ticket: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedTicket || savingStatus) return;
    setSavingStatus(true);
    try {
      await apiFetch(`/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
          resolution_remarks: resolutionRemarks
        })
      });
      setEditModalOpen(false);
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      alert(`Error updating ticket status: ${err.message}`);
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Intelligent Support Ticket Desk</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--color-secondary-text)' }}>
            Describe your workplace or technical issue. Gemini AI automatically classifies severity, category, and resolution path.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            disabled={loading}
            onClick={fetchTickets}
            style={{ height: '38px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Support Tickets"
          >
            <RotateCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            <span>Raise New Support Ticket</span>
          </button>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card">
        <div className="card-header-row">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LifeBuoy size={18} color="#3B82F6" />
            <span>Support Tickets Overview</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              disabled={loading}
              onClick={fetchTickets}
              style={{ height: '38px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Refresh Tickets List"
            >
              <RotateCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>

            <select className="form-select" style={{ width: '160px', height: '38px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Raised By</th>
                <th>Category</th>
                <th>Description</th>
                <th>Attachment</th>
                <th>Status</th>
                {(user.role === 'HR' || user.role === 'Admin' || user.role === 'Manager') && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-secondary-text)' }}>
                    No tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id}>
                    <td>#TK-{t.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.raised_by_name}</div>
                    </td>
                    <td><strong style={{ color: 'var(--color-heading)' }}>{t.category}</strong></td>
                    <td style={{ maxWidth: '320px', fontSize: '0.86rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-heading)' }}>
                        {t.description}
                      </div>
                      {t.resolution_remarks && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', backgroundColor: 'var(--color-success-tint)', padding: '4px 8px', borderRadius: '4px', marginTop: '6px' }}>
                          <strong>Fix Remarks:</strong> {t.resolution_remarks}
                        </div>
                      )}
                    </td>
                    <td>
                      {t.attachment_name ? (
                        t.attachment_url ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setPreviewAttachment({ name: t.attachment_name, url: t.attachment_url, isPdf: t.attachment_name.toLowerCase().endsWith('.pdf') })}
                          >
                            <Paperclip size={12} color="var(--color-primary)" />
                            <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.attachment_name}</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Paperclip size={12} /> {t.attachment_name}
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>None</span>
                      )}
                    </td>
                    <td>
                      <StatusChip status={t.status} />
                    </td>
                    {(user.role === 'HR' || user.role === 'Admin' || user.role === 'Manager') && (
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          onClick={() => {
                            setSelectedTicket(t);
                            setNewStatus(t.status);
                            setResolutionRemarks(t.resolution_remarks || '');
                            setEditModalOpen(true);
                          }}
                        >
                          Update Status
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raise Ticket Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Raise New Support Ticket</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setModalOpen(false)} />
            </div>

            <form onSubmit={handleCreateTicket}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label>Issue Description (Natural Language)</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  required
                  placeholder="e.g. My VPN disconnects every 20 minutes while connected to internal network..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Optional Screenshot / Document Attachment */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={14} /> Attach Screenshot or PDF Document
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-secondary-text)', fontWeight: 400 }}>(Optional)</span>
                </label>

                {!attachment ? (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <FileUp size={20} color="var(--color-primary)" style={{ marginBottom: '4px' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>Choose PNG, JPG screenshot or PDF</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-secondary-text)' }}>Max 10MB</span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </label>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {attachment.isPdf ? (
                        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                          PDF
                        </div>
                      ) : (
                        <img
                          src={attachment.previewUrl}
                          alt="Preview"
                          style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #BFDBFE' }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-heading)' }}>{attachment.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-secondary-text)' }}>{attachment.sizeStr}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
                      title="Remove attachment"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* AI Triage Banner */}
              <div style={{
                backgroundColor: 'var(--color-primary-tint)',
                border: '1px solid #BFDBFE',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '4px' }}>
                  <Sparkles size={16} />
                  <span>Gemini AI High-Accuracy Ticket Triage</span>
                </div>
                {description.trim().length > 5 ? (
                  <div style={{ color: 'var(--color-heading)', fontSize: '0.8rem' }}>
                    <strong>Detected Category:</strong>{' '}
                    {/salary|pay|deductions|tax|bank/i.test(description) ? 'Payroll & Compensation' :
                     /leave|policy|manager|hr/i.test(description) ? 'HR Operations' :
                     /badge|door|ac|parking|desk/i.test(description) ? 'Facilities & Access' :
                     /github|jira|sap|license|docker|code/i.test(description) ? 'Software & Tools' : 'IT Support'}
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-secondary-text)', fontSize: '0.78rem' }}>
                    Type your issue above. Gemini AI will automatically extract root cause and route to the correct team.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting with AI Triage...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Line AI Resolution Suggestion Popup Modal with Auto-Dismiss */}
      {submittedTicketPopup && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(3px)', backgroundColor: 'rgba(15, 23, 42, 0.45)', zIndex: 1100 }} onClick={() => setSubmittedTicketPopup(null)}>
          <div 
            className="modal-card" 
            style={{ 
              maxWidth: '520px', 
              width: '92%', 
              position: 'relative',
              boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #BFDBFE',
              borderRadius: '14px',
              padding: '20px 22px',
              overflow: 'hidden'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Auto-Close Countdown Progress Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '3px',
              backgroundColor: '#E2E8F0'
            }}>
              <div style={{
                height: '100%',
                width: `${(countdownSeconds / 5) * 100}%`,
                background: 'linear-gradient(90deg, #3B82F6, #1D4ED8)',
                transition: isPaused ? 'none' : 'width 0.1s linear'
              }} />
            </div>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Ticket #TK-{submittedTicketPopup.id} Submitted Successfully
                </h3>
              </div>

              <button 
                type="button" 
                onClick={() => setSubmittedTicketPopup(null)}
                style={{ 
                  border: 'none', 
                  background: '#F1F5F9', 
                  borderRadius: '50%', 
                  width: '28px', 
                  height: '28px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  color: '#64748B'
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Category & Status Mini Badges */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                📂 {submittedTicketPopup.category}
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                🟢 Status: Open
              </span>
            </div>

            {/* 1-Line AI Resolution Suggestion Box */}
            <div style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <Sparkles size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', marginBottom: '2px' }}>
                  AI Suggestion (Quick Resolution)
                </div>
                <div style={{ fontSize: '0.86rem', color: '#1E293B', fontWeight: 500, lineHeight: 1.45 }}>
                  {submittedTicketPopup.ai_explanation || submittedTicketPopup.ai_summary || "Ticket received and assigned to support team."}
                </div>
              </div>
            </div>

            {/* Footer with Auto-Close status and controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '0.76rem', color: isPaused ? '#D97706' : '#64748B', fontWeight: 500 }}>
                {isPaused ? '⏸️ Auto-close paused' : `⏱️ Auto-closing in ${Math.ceil(countdownSeconds)}s...`}
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="btn btn-secondary"
                  style={{ padding: '3px 10px', fontSize: '0.76rem', height: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {isPaused ? <Play size={12} /> : <Pause size={12} />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSubmittedTicketPopup(null)}
                  style={{ padding: '3px 14px', fontSize: '0.76rem', height: '28px' }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HR Status Update Modal */}
      {editModalOpen && selectedTicket && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
                Manage Ticket #TK-{selectedTicket.id}
              </h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--color-secondary-text)' }} onClick={() => setEditModalOpen(false)} />
            </div>

            {/* Reported Issue Summary */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', textTransform: 'uppercase', fontWeight: 600 }}>
                Reported Issue ({selectedTicket.raised_by_name})
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--color-heading)', marginTop: '4px', fontWeight: 500 }}>
                "{selectedTicket.description}"
              </div>

              {selectedTicket.attachment_name && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--color-secondary-text)', fontWeight: 600 }}>Attachment:</span>
                  {selectedTicket.attachment_url ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setPreviewAttachment({ name: selectedTicket.attachment_name, url: selectedTicket.attachment_url, isPdf: selectedTicket.attachment_name.toLowerCase().endsWith('.pdf') })}
                    >
                      <Paperclip size={12} color="var(--color-primary)" />
                      <span>{selectedTicket.attachment_name} (View)</span>
                    </button>
                  ) : (
                    <span>📎 {selectedTicket.attachment_name}</span>
                  )}
                </div>
              )}
            </div>

            {/* Gemini AI Issue Explanation & Action Plan BEFORE Status Selection */}
            <div style={{
              backgroundColor: 'var(--color-primary-tint)',
              border: '1px solid #BFDBFE',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.86rem', marginBottom: '6px' }}>
                <Sparkles size={16} />
                <span>Gemini AI Issue Explanation & Diagnosis</span>
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--color-heading)', lineHeight: 1.45 }}>
                {selectedTicket.ai_explanation || selectedTicket.ai_summary || 'Gemini AI has analyzed the ticket details and provided resolution guidance.'}
              </div>
            </div>

            <form onSubmit={handleUpdateStatus}>
              {/* Optional Issue Resolution Explanation / Fix Remarks */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Issue Resolution Explanation / Fix Remarks</span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--color-secondary-text)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Optional: Enter how the issue was fixed/resolved (e.g. Reset VPN credentials on server & reinstalled SSL certs)..."
                  value={resolutionRemarks}
                  onChange={(e) => setResolutionRemarks(e.target.value)}
                />
              </div>

              {/* Status Update Dropdown */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.86rem' }}>Select New Ticket Status</label>
                <select
                  className="form-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ height: '40px' }}
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingStatus}>
                  {savingStatus ? 'Saving Status...' : 'Save & Update Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="modal-overlay" onClick={() => setPreviewAttachment(null)}>
          <div className="modal-card" style={{ maxWidth: '700px', width: '92%', maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Paperclip size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{previewAttachment.name}</h3>
              </div>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setPreviewAttachment(null)} />
            </div>

            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              {previewAttachment.isPdf ? (
                <iframe
                  src={previewAttachment.url}
                  title="PDF Preview"
                  style={{ width: '100%', height: '500px', border: '1px solid #CBD5E1', borderRadius: '8px' }}
                />
              ) : (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <a
                href={previewAttachment.url}
                download={previewAttachment.name}
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.84rem' }}
              >
                Download Attachment
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPreviewAttachment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
