import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import { 
  Bot, Send, X, Sparkles, CalendarDays, LifeBuoy, 
  UserCheck, Receipt, Clock, CheckCircle2, AlertTriangle, ShieldCheck,
  Paperclip, Upload, FileText, Image as ImageIcon, FileUp, ExternalLink, Key
} from 'lucide-react';

export default function InnowellChatbot({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${user?.name || 'there'}! I am your Innowell HR Assistant. How can I help you today?`
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentState, setCurrentState] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const quickActions = [
    { label: "Apply Leave", text: "I want to apply leave" },
    { label: "Leave Balance", text: "How many leaves do I have?" },
    { label: "Raise IT Ticket", text: "I want to raise a support ticket" },
    { label: "My Tickets", text: "Show my tickets" },
    { label: "Schedule Meeting", text: "Schedule a meeting" },
    { label: "Attendance", text: "Show my attendance" },
    { label: "Payslip", text: "Show my payslip" },
    { label: "Holidays", text: "What are the holidays this month?" }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, loading, selectedFile]);

  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={pIdx} style={{ backgroundColor: 'rgba(0,0,0,0.06)', padding: '2px 5px', borderRadius: '4px', fontSize: '0.88em' }}>{part.slice(1, -1)}</code>;
        }
        return part;
      });

      return (
        <React.Fragment key={lIdx}>
          {lIdx > 0 && <br />}
          {formattedLine}
        </React.Fragment>
      );
    });
  };

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

      setSelectedFile({
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

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  if (!isOpen) return null;

  const handleSend = async (overrideText, actionConfirmed = false, customState = null, attachmentData = null) => {
    const textToSend = overrideText !== undefined ? overrideText : inputMsg;
    const filePayload = attachmentData || (selectedFile ? {
      attachment_url: selectedFile.dataUrl,
      attachment_name: selectedFile.name
    } : null);

    if (!textToSend.trim() && !actionConfirmed && !filePayload) return;

    let userDisplayMsg = actionConfirmed ? (overrideText || "Confirmed") : (textToSend || "Attached File");
    if (filePayload && !textToSend.toLowerCase().includes("skip")) {
      userDisplayMsg = `${userDisplayMsg} [📎 ${filePayload.attachment_name}]`;
    }

    const newMsgs = [...messages, { 
      role: 'user', 
      text: userDisplayMsg,
      attachment_preview: filePayload ? {
        name: filePayload.attachment_name,
        url: filePayload.attachment_url,
        isPdf: filePayload.attachment_name.toLowerCase().endsWith('.pdf')
      } : null
    }];
    
    setMessages(newMsgs);
    setInputMsg('');
    setSelectedFile(null);
    setLoading(true);

    try {
      const historyFormatted = newMsgs.map(m => ({ role: m.role, text: m.text }));
      const stateToPass = customState || currentState;

      const requestBody = {
        message: textToSend || "Attached document",
        conversation_history: historyFormatted,
        state: stateToPass,
        action_confirmed: actionConfirmed
      };

      if (filePayload) {
        requestBody.attachment_url = filePayload.attachment_url;
        requestBody.attachment_name = filePayload.attachment_name;
      }

      const res = await apiFetch('/chatbot/message', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      setCurrentState(res.state || {});

      setMessages([
        ...newMsgs,
        {
          role: 'assistant',
          text: res.response,
          options: res.options,
          options_type: res.options_type,
          attachment_request: res.attachment_request,
          confirmation_card: res.confirmation_card,
          success_card: res.success_card,
          error_card: res.error_card,
          data_type: res.data_type,
          data: res.data
        }
      ]);

      if (res.logout || res.intent === 'logout') {
        setTimeout(() => {
          localStorage.removeItem('innowell_jwt_token');
          window.location.href = '/login';
        }, 1000);
      }
    } catch (err) {
      setMessages([
        ...newMsgs,
        { role: 'assistant', text: `Sorry, I encountered an issue: ${err.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAndProceed = () => {
    if (!selectedFile) return;
    handleSend(`Attached ${selectedFile.name}`, false, null, {
      attachment_url: selectedFile.dataUrl,
      attachment_name: selectedFile.name
    });
  };

  return (
    <div className="chatbot-panel">
      {/* Header */}
      <div className="chatbot-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Innowell HR Assistant</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.88 }}>Enterprise AI Copilot (Gemini Flash)</div>
          </div>
        </div>
        <button
          type="button"
          className="chatbot-close-btn"
          onClick={onClose}
          title="Close AI Assistant"
        >
          <X size={18} />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="chatbot-messages">
        {messages.map((m, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className={`chat-bubble ${m.role}`}>
              {renderFormattedText(m.text)}

              {/* User Attachment Bubble Preview */}
              {m.attachment_preview && (
                <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                  {m.attachment_preview.isPdf ? (
                    <FileText size={16} />
                  ) : (
                    <img src={m.attachment_preview.url} alt="Attachment" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />
                  )}
                  <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{m.attachment_preview.name}</span>
                </div>
              )}
            </div>

            {/* Optional Attachment Upload Card */}
            {m.attachment_request && idx === messages.length - 1 && (
              <div className="card" style={{ padding: '14px 16px', backgroundColor: '#F8FAFC', border: '1px dashed #3B82F6', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip size={16} />
                  <span>Attach Screenshot or Document (Optional)</span>
                </div>
                
                <p style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', marginBottom: '10px' }}>
                  Format: <strong>PDF, PNG, or JPG</strong> (Max 10MB). Useful for error messages, logs, or system issues.
                </p>

                {!selectedFile ? (
                  <div>
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '14px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: '10px'
                    }}>
                      <FileUp size={24} color="var(--color-primary)" style={{ marginBottom: '6px' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)' }}>Click to Select Screenshot / PDF</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-secondary-text)' }}>Supports PNG, JPG, or PDF</span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #93C5FD',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      {selectedFile.isPdf ? (
                        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '4px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                          PDF
                        </div>
                      ) : (
                        <img
                          src={selectedFile.previewUrl}
                          alt="Preview"
                          style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #E2E8F0' }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-heading)' }}>{selectedFile.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-secondary-text)' }}>{selectedFile.sizeStr}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedFile ? (
                    <button
                      className="btn btn-primary"
                      onClick={handleUploadAndProceed}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Upload size={14} />
                      <span>Upload & Proceed</span>
                    </button>
                  ) : null}
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleSend("Skip Attachment", false, { ...currentState, slots: { ...(currentState.slots || {}), attachment_prompted: true, attachment_url: null, attachment_name: null } })}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem' }}
                  >
                    Skip Attachment
                  </button>
                </div>
              </div>
            )}

            {/* Quick Option Buttons (e.g. Leave Types) */}
            {m.options && !m.attachment_request && idx === messages.length - 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                {m.options.map((opt, optIdx) => (
                  <button
                    key={optIdx}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 12px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleSend(opt.value)}
                  >
                    <span>{opt.label}</span>
                    {opt.balance && <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>({opt.balance})</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Confirmation Card */}
            {m.confirmation_card && idx === messages.length - 1 && (
              <div className="card" style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-heading)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={18} color="var(--color-primary)" />
                  <span>{m.confirmation_card.title}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', marginBottom: '16px' }}>
                  {m.confirmation_card.fields.map((f, fIdx) => (
                    <div key={fIdx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px' }}>
                      <span style={{ color: 'var(--color-secondary-text)' }}>{f.label}:</span>
                      <strong style={{ color: 'var(--color-heading)', textAlign: 'right' }}>{f.value}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', fontWeight: 600 }}
                    onClick={() => handleSend(m.confirmation_card.confirm_button, true)}
                  >
                    {m.confirmation_card.confirm_button}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                    onClick={() => handleSend("Change Details", false, { ...currentState, slots: {} })}
                  >
                    {m.confirmation_card.cancel_button || "Change"}
                  </button>
                </div>
              </div>
            )}

            {/* Success Card */}
            {m.success_card && (
              <div className="card" style={{ padding: '16px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={18} color="#16A34A" />
                  <span>{m.success_card.title}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                  {m.success_card.ticket_code && (
                    <div><strong>Ticket ID:</strong> <code>{m.success_card.ticket_code}</code></div>
                  )}
                  {m.success_card.request_code && (
                    <div><strong>Request ID:</strong> <code>{m.success_card.request_code}</code></div>
                  )}
                  {m.success_card.leave_type && (
                    <div><strong>Type:</strong> {m.success_card.leave_type} ({m.success_card.days})</div>
                  )}
                  {m.success_card.dates && (
                    <div><strong>Dates:</strong> {m.success_card.dates}</div>
                  )}
                  {m.success_card.meeting_title && (
                    <div><strong>Meeting:</strong> {m.success_card.meeting_title} with {m.success_card.attendee}</div>
                  )}
                  {m.success_card.time && (
                    <div><strong>Time:</strong> {m.success_card.time} on {m.success_card.date}</div>
                  )}
                  {m.success_card.meeting_id_code && (
                    <div style={{ marginTop: '4px', padding: '6px 8px', backgroundColor: '#FFFFFF', borderRadius: '4px', border: '1px solid #DCFCE7' }}>
                      <div><strong>Teams Meeting ID:</strong> <code>{m.success_card.meeting_id_code}</code></div>
                      <div><strong>Passcode:</strong> <code>{m.success_card.passcode}</code></div>
                    </div>
                  )}
                  {m.success_card.teams_url && (
                    <a
                      href={m.success_card.teams_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '4px', fontSize: '0.8rem' }}
                    >
                      <ExternalLink size={14} />
                      <span>Join Microsoft Teams Room</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Error Card */}
            {m.error_card && (
              <div className="card" style={{ padding: '14px 16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#B45309', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={18} color="#D97706" />
                  <span>{m.error_card.title}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#92400E' }}>
                  {m.error_card.details}
                </div>
              </div>
            )}

            {/* Leave Balance Data */}
            {m.data_type === 'leave_balance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {m.data.map((lb, lbIdx) => (
                    <div key={lbIdx} style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-card-border)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-secondary-text)', fontWeight: 600 }}>{lb.name} ({lb.code})</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}>{lb.remaining_days} <span style={{ fontSize: '0.74rem', fontWeight: 400 }}>days</span></div>
                      {(lb.code === 'GL' || lb.code === 'SL') && (
                        <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                          • Accrual: 1 leave / month
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-secondary-text)', backgroundColor: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  💡 <strong>Accrual Policy:</strong> 12 days annual quota (credited at 1 leave per month for General & Sick leaves).
                </div>
              </div>
            )}

            {/* Tickets List Data */}
            {m.data_type === 'tickets_list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                {m.data.map((t, tIdx) => (
                  <div key={tIdx} style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-card-border)', padding: '8px 10px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <code style={{ fontWeight: 700 }}>{t.ticket_code}</code>
                      <span className={`tag-chip tag-${t.status.toLowerCase() === 'resolved' ? 'success' : 'warning'}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>{t.status}</span>
                    </div>
                    <div style={{ color: 'var(--color-heading)', fontSize: '0.78rem' }}>{t.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Attendance Data */}
            {m.data_type === 'attendance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                {m.data.map((att, aIdx) => (
                  <div key={aIdx} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#FFFFFF', border: '1px solid var(--color-card-border)', padding: '6px 10px', borderRadius: '6px' }}>
                    <span>{att.date}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{att.working_hours}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Payslip Data */}
            {m.data_type === 'payslip' && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-card-border)', padding: '12px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Base Salary:</span>
                  <strong>₹{m.data.base_salary.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                  <span>Allowances:</span>
                  <strong>+₹{m.data.allowances.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#DC2626' }}>
                  <span>Deductions:</span>
                  <strong>-₹{m.data.deductions.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-card-border)', paddingTop: '6px', fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                  <strong>Net Salary Disbursed:</strong>
                  <strong>₹{m.data.net_pay.toLocaleString()}</strong>
                </div>
              </div>
            )}

            {/* Holidays Data */}
            {m.data_type === 'holidays' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', marginTop: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-secondary-text)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🇮🇳 Indian Govt & Festival Calendar</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Upcoming from Sep 2nd</span>
                </div>
                {m.data.map((h, hIdx) => {
                  const isUpcoming = h.is_upcoming !== false;
                  const isGazetted = h.type?.toLowerCase().includes('gazetted') || h.type?.toLowerCase().includes('national');
                  const isFestival = h.type?.toLowerCase().includes('festival');
                  const isShutdown = h.type?.toLowerCase().includes('shutdown');

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
                    badgeLabel = '🏢 Shutdown';
                  }

                  return (
                    <div 
                      key={hIdx} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        backgroundColor: isUpcoming ? '#FFFFFF' : '#F9FAFB', 
                        border: isUpcoming ? '1px solid #BFDBFE' : '1px solid #E5E7EB', 
                        borderLeft: isUpcoming ? `4px solid ${badgeColor}` : '3px solid #9CA3AF',
                        padding: '8px 12px', 
                        borderRadius: '8px',
                        boxShadow: isUpcoming ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                        opacity: isUpcoming ? 1 : 0.65
                      }}
                    >
                      <div style={{ maxWidth: '65%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ color: isUpcoming ? 'var(--color-heading)' : '#6B7280', fontSize: '0.82rem' }}>{h.name}</strong>
                          <span style={{ fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: badgeBg, color: badgeColor, fontWeight: 700 }}>
                            {badgeLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-secondary-text)', marginTop: '2px' }}>{h.type}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: isUpcoming ? 'var(--color-primary)' : '#6B7280', fontSize: '0.82rem' }}>
                          {h.date}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-secondary-text)', fontWeight: 500 }}>{h.day}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        ))}

        {loading && (
          <div className="chat-bubble assistant" style={{ color: 'var(--color-secondary-text)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <Sparkles size={16} className="animate-spin" color="var(--color-primary)" />
            <span>Innowell AI is processing...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Suggestion Pills (Above Typing Area) */}
      <div style={{ 
        padding: '8px 12px', 
        display: 'flex', 
        gap: '6px', 
        overflowX: 'auto', 
        backgroundColor: '#F8FAFC', 
        borderTop: '1px solid var(--color-card-border)', 
        borderBottom: '1px solid var(--color-card-border)', 
        flexShrink: 0 
      }}>
        {quickActions.map((qa, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qa.text)}
            style={{
              whiteSpace: 'nowrap',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: '16px',
              border: '1px solid #BFDBFE',
              backgroundColor: '#EFF6FF',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Selected File Floating Banner above input */}
      {selectedFile && (
        <div style={{
          padding: '6px 12px',
          backgroundColor: '#EFF6FF',
          borderTop: '1px solid #BFDBFE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Paperclip size={14} color="var(--color-primary)" />
            <span style={{ fontWeight: 600, color: 'var(--color-heading)' }}>{selectedFile.name}</span>
            <span style={{ color: 'var(--color-secondary-text)' }}>({selectedFile.sizeStr})</span>
          </div>
          <button
            type="button"
            onClick={clearSelectedFile}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Chat Input */}
      <div className="chat-input-area" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="file"
          ref={fileInputRef}
          accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '8px 10px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => fileInputRef.current?.click()}
          title="Attach Screenshot (PNG/JPG) or PDF Document"
        >
          <Paperclip size={16} />
        </button>
        <input
          type="text"
          className="chat-input"
          placeholder="Ask Innowell AI anything (e.g. 'I need leave tomorrow', 'Midfit credentials', or 'Raise IT ticket')..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" style={{ padding: '8px 12px', height: '38px' }} onClick={() => handleSend()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
