import React from 'react';

export default function StatusChip({ status, type = 'status' }) {
  if (!status) return null;
  const val = String(status).toLowerCase();
  
  let chipClass = 'tag-info';
  
  if (['approved', 'resolved', 'full-time', 'low'].includes(val)) {
    chipClass = 'tag-success';
  } else if (['pending', 'in-progress', 'medium', 'part-time'].includes(val)) {
    chipClass = 'tag-warning';
  } else if (['rejected', 'critical', 'high', 'closed', 'freelance'].includes(val)) {
    chipClass = 'tag-error';
  }

  return (
    <span className={`tag-chip ${chipClass}`}>
      {status}
    </span>
  );
}
