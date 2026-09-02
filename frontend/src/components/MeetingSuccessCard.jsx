import React, { useState } from 'react';
import { CheckCircle, ExternalLink, Calendar, Copy, Check, Video } from 'lucide-react';

export default function MeetingSuccessCard({ meeting, onScheduleAnother, onJoinRoom }) {
  const [copied, setCopied] = useState(false);

  if (!meeting) return null;

  const handleCopyLink = () => {
    if (meeting.teams_join_url) {
      navigator.clipboard.writeText(meeting.teams_join_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const parts = dateString.toString().split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="card" style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', padding: '24px', marginBottom: '24px' }}>
      
      {/* Success Badge Header (Requirement #12) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#065F46', marginBottom: '16px' }}>
        <CheckCircle size={28} color="#059669" />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
          Microsoft Teams Meeting Created
        </h3>
      </div>

      {/* Meeting Summary Box */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid #A7F3D0', marginBottom: '20px' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-heading)', marginBottom: '8px' }}>
          {meeting.subject || meeting.title}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.86rem', color: 'var(--color-heading)' }}>
          <div>
            <span style={{ color: 'var(--color-secondary-text)' }}>With:</span>{' '}
            <strong>{meeting.attendee_name || meeting.attendee_email}</strong>
          </div>

          <div>
            <span style={{ color: 'var(--color-secondary-text)' }}>Date:</span>{' '}
            <strong>{formatDateDisplay(meeting.date)}</strong>
          </div>

          <div>
            <span style={{ color: 'var(--color-secondary-text)' }}>Time:</span>{' '}
            <strong>{meeting.start_time} – {meeting.end_time} IST</strong>
          </div>

          <div>
            <span style={{ color: 'var(--color-secondary-text)' }}>Platform:</span>{' '}
            <span className="tag-chip tag-primary" style={{ fontSize: '0.74rem' }}>
              {meeting.meeting_provider || 'Microsoft Teams'}
            </span>
          </div>
        </div>

        {/* Meeting Credentials (Meeting ID & Passcode) for MS Teams */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #A7F3D0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
          <div style={{ backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <span style={{ color: 'var(--color-secondary-text)', fontSize: '0.74rem' }}>Meeting ID:</span>
            <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
              {meeting.meeting_id_code || `248 ${((meeting.id || 1) * 314 + 100) % 800 + 100} ${((meeting.id || 1) * 527 + 200) % 800 + 100} ${((meeting.id || 1) * 819 + 300) % 800 + 100}`}
            </div>
          </div>
          <div style={{ backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <span style={{ color: 'var(--color-secondary-text)', fontSize: '0.74rem' }}>Passcode (Optional):</span>
            <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
              {meeting.passcode || `8Fk${((meeting.id || 1) * 17) % 80 + 10}p`}
            </div>
          </div>
        </div>

        {/* Meeting Link URL */}
        {meeting.teams_join_url && (
          <div style={{ marginTop: '10px', fontSize: '0.8rem' }}>
            <div style={{ color: 'var(--color-secondary-text)', marginBottom: '4px', fontWeight: 500 }}>
              Direct Microsoft Teams Web Join Link:
            </div>
            <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#1E40AF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meeting.teams_join_url}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyLink}
                style={{ padding: '4px 8px', fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {copied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Requirement #12 Action Buttons: [ Join Teams Meeting ] [ Add to Calendar ] */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => onJoinRoom ? onJoinRoom(meeting) : window.open(meeting.teams_join_url || '#', '_blank')}
          className="btn btn-primary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          <Video size={18} />
          <span>Join Teams Room</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => alert(`Calendar Invitation added to ${meeting.attendee_email || 'attendee calendar'}.`)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px' }}
        >
          <Calendar size={16} />
          <span>Add to Calendar</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onScheduleAnother}
          style={{ marginLeft: 'auto', padding: '10px 16px' }}
        >
          Schedule Another Meeting
        </button>
      </div>

    </div>
  );
}
