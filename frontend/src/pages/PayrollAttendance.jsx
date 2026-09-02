import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import { Receipt, UserCheck, ShieldCheck, Clock } from 'lucide-react';

export default function PayrollAttendance({ type = 'payroll' }) {
  const { user } = useAuth();
  const [payrollData, setPayrollData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockingOut, setClockingOut] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (type === 'payroll') {
        const res = await apiFetch('/payroll');
        setPayrollData(res || []);
      } else {
        const res = await apiFetch('/attendance');
        setAttendanceData(res || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type]);

  const handleClockOut = async () => {
    setClockingOut(true);
    try {
      await apiFetch('/attendance/clock-out', { method: 'POST' });
      alert('Clock-out logged successfully!');
      loadData();
    } catch (err) {
      alert(`Clock out failed: ${err.message}`);
    } finally {
      setClockingOut(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Isolation Banner */}
      <div className="card" style={{ backgroundColor: 'var(--color-primary-tint)', borderColor: '#BFDBFE' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={24} color="#3B82F6" />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-heading)' }}>
              Strict Row-Level Security Enforced
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--color-secondary-text)' }}>
              {user.role === 'Employee'
                ? 'Your view is strictly isolated to your own authenticated user records at the backend query layer.'
                : `You are logged in as ${user.role} with organization-wide visibility.`}
            </div>
          </div>
        </div>
      </div>

      {type === 'payroll' ? (
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Receipt size={18} color="#3B82F6" />
              <span>Payroll Breakdown & Monthly Payslips</span>
            </h3>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Pay Period</th>
                  <th>Base Salary</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Net Take-Home Pay</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-secondary-text)' }}>
                      No payroll records available.
                    </td>
                  </tr>
                ) : (
                  payrollData.map((p) => (
                    <tr key={p.id}>
                      <td><strong style={{ color: 'var(--color-heading)' }}>{p.user_name}</strong></td>
                      <td>{p.pay_period}</td>
                      <td>₹{p.base_salary.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--color-success)' }}>+₹{p.allowances.toLocaleString('en-IN')}</td>
                      <td style={{ color: 'var(--color-error)' }}>-₹{p.deductions.toLocaleString('en-IN')}</td>
                      <td><strong style={{ color: 'var(--color-primary)', fontSize: '0.96rem' }}>₹{p.net_pay.toLocaleString('en-IN')}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="#3B82F6" />
              <span>Daily Attendance Log</span>
            </h3>
            <button className="btn btn-secondary" disabled={clockingOut} onClick={handleClockOut}>
              <Clock size={16} />
              <span>{clockingOut ? 'Logging...' : 'Clock Out Now'}</span>
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Date</th>
                  <th>Login Time</th>
                  <th>Logout Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-secondary-text)' }}>
                      No attendance logs recorded.
                    </td>
                  </tr>
                ) : (
                  attendanceData.map((a) => (
                    <tr key={a.id}>
                      <td><strong style={{ color: 'var(--color-heading)' }}>{a.user_name}</strong></td>
                      <td>{a.date}</td>
                      <td>{a.login_time ? new Date(a.login_time).toLocaleTimeString() : 'N/A'}</td>
                      <td>{a.logout_time ? new Date(a.logout_time).toLocaleTimeString() : 'Active Session'}</td>
                      <td>
                        <span className={`tag-chip ${a.logout_time ? 'tag-success' : 'tag-warning'}`}>
                          {a.logout_time ? 'Completed Shift' : 'Clocked In'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
