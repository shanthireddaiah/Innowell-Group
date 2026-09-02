import React from 'react';
import { Video, Calendar, Clock, User, Mail, Sparkles, CheckCircle, XCircle } from 'lucide-react';

export default function MeetingConfirmationModal({ meetingDetails, onConfirm, onBack, submitting }) {
  if (!meetingDetails) return null;

  const { employee, date, slot, duration, subject, meetingProvider } = meetingDetails;

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const parts = dateString.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="modal-overlay" onClick={onBack}>
      <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={22} color="#2563EB" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-heading)' }}>
              Confirm Meeting Details
            </h3>
          </div>
          <XCircle size={20} style={{ cursor: 'pointer', color: 'var(--color-secondary-text)' }} onClick={onBack} />
        </div>

        {/* Microsoft Teams Banner */}
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Video size={20} color="#2563EB" />
          <div style={{ fontSize: '0.84rem', color: '#1E40AF' }}>
            An actual <strong>Microsoft Teams Online Meeting</strong> will be created via Microsoft Graph API and added to calendar.
          </div>
        </div>

        {/* Structured Details Card (Requirement #11) */}
        <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-card-border)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', marginBottom: '24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--color-secondary-text)', fontWeight: 500 }}>Subject:</span>
            <strong style={{ color: 'var(--color-heading)' }}>{subject || 'AI Project Discussion'}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--color-secondary-text)', fontWeight: 500 }}>Employee:</span>
            <strong style={{ color: 'var(--color-heading)' }}>{employee ? employee.name : 'Selected Employee'}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--color-secondary-text)', fontWeight: 500 }}>Email:</span>
            <strong style={{ color: '#0369A1' }}>{employee ? employee.email : 'shanthireddaiah@example.com'}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--color-secondary-text)', fontWeight: 500 }}>Date:</span>
            <strong style={{ color: 'var(--color-heading)' }}>{formatDateDisplay(date)}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--color-secondary-text)', fontWeight: 500 }}>Time Slot:</span>
            <strong style={{ color: '#059669' }}>{slot ? `${slot.start_time} – ${slot.end_time} IST` : '2:00 PM – 2:30 PM IST'}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--color-secondary-text)', fontWeight: 500 }}>Duration:</span>
            <strong style={{ color: 'var(--color-heading)' }}>{duration} minutes</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-secondary-text)', fontWeight: 500 }}>Meeting Type:</span>
            <span className="tag-chip tag-primary" style={{ fontSize: '0.76rem', fontWeight: 600 }}>
              {meetingProvider || 'Microsoft Teams'}
            </span>
          </div>

        </div>

        {/* Buttons: [ Back ] [ Create Teams Meeting ] */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack} disabled={submitting}>
            Back
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={submitting}
            style={{ padding: '10px 20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Video size={18} />
            <span>{submitting ? 'Creating Teams Meeting...' : 'Create Teams Meeting'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
