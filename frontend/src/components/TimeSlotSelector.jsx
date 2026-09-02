import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { Clock, Sun, Sunset, Moon, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function TimeSlotSelector({ date, duration, period, attendeeId, selectedSlot, onSelectSlot }) {
  const [activePeriod, setActivePeriod] = useState(period || 'afternoon');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (period) {
      setActivePeriod(period);
    }
  }, [period]);

  const loadSlots = async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const url = `/meetings/availability?date_str=${date}&duration_minutes=${duration}&period=${activePeriod}${attendeeId ? `&attendee_id=${attendeeId}` : ''}`;
      const data = await apiFetch(url);
      setSlots(data.slots || []);
    } catch (err) {
      console.error("Failed to load availability slots:", err);
      setError(err.message || "Could not check calendar availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [date, duration, activePeriod, attendeeId]);

  return (
    <div className="form-group" style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <label style={{ fontSize: '0.86rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={16} color="#3B82F6" />
          <span>Select Time Slot & Check Availability</span>
        </label>

        {/* Time Period Filter Tabs (Requirement #6) */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
          <button
            type="button"
            onClick={() => setActivePeriod('morning')}
            style={{
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: activePeriod === 'morning' ? 700 : 500,
              backgroundColor: activePeriod === 'morning' ? '#FFFFFF' : 'transparent',
              color: activePeriod === 'morning' ? '#3B82F6' : 'var(--color-secondary-text)',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sun size={12} />
            <span>Morning</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePeriod('afternoon')}
            style={{
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: activePeriod === 'afternoon' ? 700 : 500,
              backgroundColor: activePeriod === 'afternoon' ? '#FFFFFF' : 'transparent',
              color: activePeriod === 'afternoon' ? '#3B82F6' : 'var(--color-secondary-text)',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sunset size={12} />
            <span>Afternoon</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePeriod('evening')}
            style={{
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: activePeriod === 'evening' ? 700 : 500,
              backgroundColor: activePeriod === 'evening' ? '#FFFFFF' : 'transparent',
              color: activePeriod === 'evening' ? '#3B82F6' : 'var(--color-secondary-text)',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Moon size={12} />
            <span>Evening</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePeriod('all')}
            style={{
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: activePeriod === 'all' ? 700 : 500,
              backgroundColor: activePeriod === 'all' ? '#FFFFFF' : 'transparent',
              color: activePeriod === 'all' ? '#3B82F6' : 'var(--color-secondary-text)',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Custom (Full Day)
          </button>
        </div>
      </div>

      {/* Period Description Badge */}
      <div style={{ fontSize: '0.78rem', color: 'var(--color-secondary-text)', marginBottom: '12px' }}>
        {activePeriod === 'morning' && 'Showing Morning slots (8:00 AM – 12:00 PM IST)'}
        {activePeriod === 'afternoon' && 'Showing Afternoon slots (12:00 PM – 4:00 PM IST)'}
        {activePeriod === 'evening' && 'Showing Evening slots (4:00 PM – 7:00 PM IST)'}
        {activePeriod === 'all' && 'Showing all working hours (8:00 AM – 7:00 PM IST)'}
      </div>

      {/* Loading & Slot Grid */}
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--color-secondary-text)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
          Checking employee calendar availability...
        </div>
      ) : error ? (
        <div style={{ padding: '12px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      ) : slots.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--color-secondary-text)', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-md)' }}>
          No time slots found for the selected period. Try choosing another period or date.
        </div>
      ) : (
        /* Requirement #7: Available vs Busy Slots Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {slots.map((slot) => {
            const isSelected = selectedSlot && selectedSlot.slot_id === slot.slot_id;
            const isAvailable = slot.is_available;

            return (
              <button
                key={slot.slot_id}
                type="button"
                disabled={!isAvailable}
                onClick={() => onSelectSlot(slot)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  border: isSelected
                    ? '2px solid #3B82F6'
                    : isAvailable
                    ? '1px solid #CBD5E1'
                    : '1px solid #FECACA',
                  backgroundColor: isSelected
                    ? '#EFF6FF'
                    : isAvailable
                    ? '#FFFFFF'
                    : '#FEF2F2',
                  cursor: isAvailable ? 'pointer' : 'not-allowed',
                  opacity: isAvailable ? 1 : 0.75,
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: isAvailable ? 'var(--color-heading)' : '#991B1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isAvailable ? (
                      <CheckCircle2 size={14} color="#10B981" />
                    ) : (
                      <XCircle size={14} color="#EF4444" />
                    )}
                    <span>{slot.start_time} – {slot.end_time}</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: isAvailable ? '#059669' : '#DC2626', marginTop: '2px', fontWeight: 500 }}>
                    {isAvailable ? 'Available' : 'Busy (Conflict)'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
