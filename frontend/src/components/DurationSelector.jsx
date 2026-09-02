import React from 'react';
import { Minus, Plus, Clock } from 'lucide-react';

export default function DurationSelector({ duration, onChangeDuration }) {
  const PRESET_DURATIONS = [20, 30, 40, 50, 60, 90, 120];

  const handleDecrease = () => {
    if (duration > 20) {
      const prev = PRESET_DURATIONS.filter(d => d < duration).pop() || (duration - 10);
      onChangeDuration(Math.max(20, prev));
    }
  };

  const handleIncrease = () => {
    if (duration < 120) {
      const next = PRESET_DURATIONS.find(d => d > duration) || (duration + 10);
      onChangeDuration(Math.min(120, next));
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: '16px' }}>
      <label style={{ fontSize: '0.86rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Clock size={16} color="#3B82F6" />
        <span>Meeting Duration (20 min - 120 min)</span>
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Stepper: [-] [ 30 min ] [+] */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid #CBD5E1' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDecrease}
            disabled={duration <= 20}
            style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
          >
            <Minus size={16} />
          </button>
          
          <div style={{ padding: '0 16px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-heading)', minWidth: '90px', textAlign: 'center' }}>
            {duration} min
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleIncrease}
            disabled={duration >= 120}
            style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Quick Presets Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PRESET_DURATIONS.map((preset) => {
            const isSelected = duration === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onChangeDuration(preset)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 500,
                  backgroundColor: isSelected ? '#3B82F6' : '#F8FAFC',
                  color: isSelected ? '#FFFFFF' : 'var(--color-heading)',
                  border: `1px solid ${isSelected ? '#3B82F6' : '#E2E8F0'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {preset}m
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
