import React from 'react';
import { Calendar } from 'lucide-react';

export default function DateSelector({ date, onChangeDate }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getNextTuesdayStr = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (2 - day + 7) % 7 || 7; // 2 is Tuesday
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

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
    <div className="form-group" style={{ marginBottom: '16px' }}>
      <label style={{ fontSize: '0.86rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Calendar size={16} color="#3B82F6" />
        <span>Meeting Date</span>
      </label>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="date"
          className="form-input"
          min={todayStr}
          value={date}
          onChange={(e) => onChangeDate(e.target.value)}
          style={{ width: '220px', height: '40px', fontSize: '0.9rem' }}
          required
        />

        {/* Quick Date Presets */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onChangeDate(todayStr)}
            style={{ padding: '6px 12px', fontSize: '0.78rem', backgroundColor: date === todayStr ? '#EFF6FF' : undefined, color: date === todayStr ? '#1D4ED8' : undefined }}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onChangeDate(getTomorrowStr())}
            style={{ padding: '6px 12px', fontSize: '0.78rem', backgroundColor: date === getTomorrowStr() ? '#EFF6FF' : undefined, color: date === getTomorrowStr() ? '#1D4ED8' : undefined }}
          >
            Tomorrow
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onChangeDate(getNextTuesdayStr())}
            style={{ padding: '6px 12px', fontSize: '0.78rem', backgroundColor: date === getNextTuesdayStr() ? '#EFF6FF' : undefined, color: date === getNextTuesdayStr() ? '#1D4ED8' : undefined }}
          >
            Next Tuesday
          </button>
        </div>
      </div>

      {date && (
        <div style={{ fontSize: '0.82rem', color: '#0369A1', marginTop: '6px', fontWeight: 500 }}>
          Selected Date: <strong>{formatDateDisplay(date)}</strong>
        </div>
      )}
    </div>
  );
}
