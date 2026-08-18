import React, { useState, useEffect, useCallback } from 'react';
import http from '../api/http';
import { useAuth } from '../auth/AuthContext';
import './follow-up.css';
import './leads-v3.css';

const statusOptions = [
  { value: 'connected', label: 'Connected' },
  { value: 'interested', label: 'Interested' },
  { value: 'follow_up', label: 'Reschedule Follow Up' },
  { value: 'not_answered', label: 'Not Answered' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'completed', label: 'Completed' }
];

export default function FollowUpManagement() {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'admin', 'manager'].includes(user?.roleKey) || user?.permissions?.includes('calling.manage');
  const isLoanAdvisor = user?.roleKey === 'loan_advisor' || user?.role === 'Loan Advisor';

  const [calls, setCalls] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterUser, setFilterUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const [newStatus, setNewStatus] = useState('connected');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leadModal, setLeadModal] = useState(null);

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/calls?status=follow_up&limit=500';
      if (!isAdmin) {
        url = '/calls?assignedTo=me&status=follow_up&limit=200';
      } else if (filterUser) {
        url += `&assignedTo=${filterUser}`;
      }

      const reqs = [http.get(url)];
      if (users.length === 0) {
        reqs.push(http.get('/calls/meta'));
      }

      const [res, metaRes] = await Promise.all(reqs);
      setCalls(res.data.calls || []);
      if (metaRes?.data?.users) {
        setUsers(metaRes.data.users);
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
      setNotice(err.response?.data?.error || 'Unable to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filterUser, users.length]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const openLogModal = (call) => {
    setSelectedCall(call);
    setNewStatus('connected');
    setRescheduleDate(call.follow_up_at ? call.follow_up_at.slice(0, 16) : '');
    setNotes(call.notes || '');
  };

  const handleUpdateOutcome = async (e) => {
    e?.preventDefault();
    if (!selectedCall) return;

    if (newStatus === 'follow_up' && !rescheduleDate) {
      alert('Please select a reschedule date and time.');
      return;
    }

    if (newStatus === 'interested') {
      const defaultAssignee = isLoanAdvisor ? String(user?.id || '') : (selectedCall.assigned_to ? String(selectedCall.assigned_to) : String(user?.id || ''));
      const custName = selectedCall.customer_name && !selectedCall.customer_name.startsWith('Lead ') ? selectedCall.customer_name : '';

      setLeadModal({
        call: selectedCall,
        data: {
          name: custName,
          phone: selectedCall.phone || '',
          email: '',
          studentName: '',
          country: '',
          university: '',
          loanAmount: '',
          creditScore: '',
          entranceExam: '',
          coApplicant: '',
          occupation: '',
          source: 'Direct',
          status: 'new',
          loginCity: '',
          sanctionCity: '',
          assignedTo: defaultAssignee,
          remarks: notes.trim()
        }
      });
      setSelectedCall(null);
      return;
    }

    setSubmitting(true);
    try {
      await http.patch(`/calls/${selectedCall.id}`, {
        phone: selectedCall.phone,
        customerName: selectedCall.customer_name || `Lead ${selectedCall.phone}`,
        assignedTo: selectedCall.assigned_to,
        status: newStatus,
        followUpAt: newStatus === 'follow_up' ? rescheduleDate : null,
        notes: notes.trim(),
        markCalled: true
      });

      setNotice(`Updated follow-up status for ${selectedCall.phone}`);
      setSelectedCall(null);
      loadFollowUps();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update follow-up call');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLeadFromModal = async (e) => {
    e?.preventDefault();
    if (!leadModal?.call) return;
    setSubmitting(true);
    try {
      await http.post(`/calls/${leadModal.call.id}/convert-to-lead`, leadModal.data);

      setNotice(`Lead created successfully for ${leadModal.call.phone}`);
      setLeadModal(null);
      loadFollowUps();
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper stats calculation
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < now && dateStr.slice(0, 10) !== todayStr;
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    return dateStr.slice(0, 10) === todayStr;
  };

  const overdueCount = calls.filter(c => isOverdue(c.follow_up_at)).length;
  const todayCount = calls.filter(c => isToday(c.follow_up_at)).length;
  const upcomingCount = calls.length - overdueCount - todayCount;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fum-container">
      <div className="fum-header">
        <div>
          <h1>🎧 Follow-ups {isAdmin ? '(All Advisors & Team)' : ''}</h1>
          <p>
            {isAdmin
              ? 'Viewing all follow-up calls across all team members and loan advisors'
              : 'Manage and log your scheduled follow-up calls'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isAdmin && (
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                background: '#ffffff',
                fontWeight: 500,
                outline: 'none'
              }}
            >
              <option value="">All Team Members / Advisors</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}

          <button className="fum-action-btn" onClick={loadFollowUps}>
            ↻ Refresh List
          </button>
        </div>
      </div>

      {notice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          background: '#ECFDF5',
          color: '#065F46',
          marginBottom: '20px',
          fontWeight: 600
        }}>
          {notice}
        </div>
      )}

      {/* Stats Cards */}
      <div className="fum-stats">
        <div className="fum-stat-card">
          <small>Total Scheduled</small>
          <b>{calls.length}</b>
        </div>
        <div className="fum-stat-card overdue">
          <small>Overdue Follow-ups</small>
          <b>{overdueCount}</b>
        </div>
        <div className="fum-stat-card today">
          <small>Due Today</small>
          <b>{todayCount}</b>
        </div>
        <div className="fum-stat-card upcoming">
          <small>Upcoming</small>
          <b>{upcomingCount}</b>
        </div>
      </div>

      {/* Table */}
      <div className="fum-table-wrapper">
        <table className="fum-table">
          <thead>
            <tr>
              <th>S.NO</th>
              <th>CUSTOMER / NUMBER</th>
              {isAdmin && <th>ASSIGNED ADVISOR</th>}
              <th>SCHEDULED DATE & TIME</th>
              <th>STATUS BADGE</th>
              <th>LAST NOTES</th>
              <th>ATTEMPTS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '30px' }}>
                  Loading follow-up calls...
                </td>
              </tr>
            ) : calls.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  🎉 No scheduled follow-up calls found!
                </td>
              </tr>
            ) : (
              calls.map((call, idx) => {
                const overdue = isOverdue(call.follow_up_at);
                const today = isToday(call.follow_up_at);

                return (
                  <tr key={call.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <div className="fum-phone">
                        <a href={`tel:${call.phone}`}>📞 {call.phone}</a>
                      </div>
                      <small style={{ color: '#6b7280' }}>{call.customer_name}</small>
                    </td>
                    {isAdmin && (
                      <td>
                        <span style={{ fontWeight: 600, color: '#374151' }}>
                          {call.assigned_to_name || <i>Unassigned</i>}
                        </span>
                      </td>
                    )}
                    <td>
                      <b>{formatDate(call.follow_up_at)}</b>
                    </td>
                    <td>
                      {overdue ? (
                        <span className="fum-badge overdue">⚠️ Overdue</span>
                      ) : today ? (
                        <span className="fum-badge today">⏰ Due Today</span>
                      ) : (
                        <span className="fum-badge upcoming">📅 Upcoming</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#4b5563' }}>
                        {call.notes || '—'}
                      </span>
                    </td>
                    <td>
                      <b>{call.call_count}</b>
                    </td>
                    <td>
                      <button className="fum-action-btn" onClick={() => openLogModal(call)}>
                        ☎ Log Call Outcome
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Log Outcome Modal */}
      {selectedCall && (
        <div className="fum-overlay">
          <div className="fum-dialog">
            <form onSubmit={handleUpdateOutcome}>
              <header>
                <h3>Log Call Outcome — {selectedCall.phone}</h3>
                <button type="button" onClick={() => setSelectedCall(null)}>×</button>
              </header>

              <div className="fum-dialog-body">
                <label>
                  Call Outcome Status
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                {newStatus === 'follow_up' && (
                  <label>
                    Reschedule Date & Time *
                    <input
                      type="datetime-local"
                      required
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                    />
                  </label>
                )}

                <label>
                  Call Notes / Remarks
                  <textarea
                    rows="3"
                    placeholder="Enter call details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              </div>

              <div className="fum-dialog-footer">
                <button
                  type="button"
                  className="fum-btn-cancel"
                  onClick={() => setSelectedCall(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="fum-btn-save"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Call Outcome'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Lead Modal Popup */}
      {leadModal && (
        <div className="overlay">
          <form className="lead-form" onSubmit={handleCreateLeadFromModal}>
            <div className="modal-top">
              <div>
                <span>NEW LEAD</span>
                <h2>Create new lead</h2>
              </div>
              <button type="button" onClick={() => setLeadModal(null)}>×</button>
            </div>

            <div className="fields">
              <label>
                Lead name *
                <input
                  required
                  value={leadModal.data.name}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, name: e.target.value }
                  }))}
                  placeholder="Enter lead name"
                />
              </label>

              <label>
                Phone number *
                <input
                  required
                  value={leadModal.data.phone}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, phone: e.target.value }
                  }))}
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={leadModal.data.email}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, email: e.target.value }
                  }))}
                />
              </label>

              <label>
                Student name
                <input
                  value={leadModal.data.studentName}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, studentName: e.target.value }
                  }))}
                />
              </label>

              <label>
                Country
                <input
                  value={leadModal.data.country}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, country: e.target.value }
                  }))}
                />
              </label>

              <label>
                University
                <input
                  value={leadModal.data.university}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, university: e.target.value }
                  }))}
                />
              </label>

              <label>
                Loan amount
                <input
                  type="number"
                  value={leadModal.data.loanAmount}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, loanAmount: e.target.value }
                  }))}
                />
              </label>

              <label>
                Credit score
                <input
                  type="number"
                  value={leadModal.data.creditScore}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, creditScore: e.target.value }
                  }))}
                />
              </label>

              <label>
                Entrance exam
                <input
                  value={leadModal.data.entranceExam}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, entranceExam: e.target.value }
                  }))}
                />
              </label>

              <label>
                Co-applicant
                <input
                  value={leadModal.data.coApplicant}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, coApplicant: e.target.value }
                  }))}
                />
              </label>

              <label>
                Occupation
                <input
                  value={leadModal.data.occupation}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, occupation: e.target.value }
                  }))}
                />
              </label>

              <label>
                Source
                <input
                  value={leadModal.data.source}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, source: e.target.value }
                  }))}
                />
              </label>

              <label>
                Status
                <select
                  value={leadModal.data.status}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, status: e.target.value }
                  }))}
                >
                  {['new','interested','file_update','login','sanction','pf_paid','disbursed','rejected'].map(st => (
                    <option key={st} value={st}>{st.replace('_',' ')}</option>
                  ))}
                </select>
              </label>

              <label>
                Login city
                <input
                  value={leadModal.data.loginCity}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, loginCity: e.target.value }
                  }))}
                />
              </label>

              <label>
                Sanction city
                <input
                  value={leadModal.data.sanctionCity}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, sanctionCity: e.target.value }
                  }))}
                />
              </label>

              <label>
                Assign to
                <select
                  value={leadModal.data.assignedTo}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, assignedTo: e.target.value }
                  }))}
                >
                  {isLoanAdvisor ? (
                    <option value={user.id}>{user.name || user.email || 'Loan Adviser'}</option>
                  ) : (
                    <>
                      <option value="">Unassigned</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </label>

              <label className="full">
                Remarks
                <textarea
                  rows="3"
                  value={leadModal.data.remarks}
                  onChange={e => setLeadModal(prev => ({
                    ...prev,
                    data: { ...prev.data, remarks: e.target.value }
                  }))}
                />
              </label>
            </div>

            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setLeadModal(null)}>Cancel</button>
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create lead'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
