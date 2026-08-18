import React, { useState, useEffect, useCallback } from 'react';
import http from '../api/http';
import { useAuth } from '../auth/AuthContext';
import './loan-adviser-calling.css';
import './leads-v3.css';

const statusOptions = [
  { value: 'not_answered', label: 'Not Answer' },
  { value: 'interested', label: 'Interested' },
  { value: 'connected', label: 'Connected' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'completed', label: 'Completed' }
];

export default function LoanAdviserCalling() {
  const { user } = useAuth();
  const [pendingCalls, setPendingCalls] = useState([]);
  const [completedCalls, setCompletedCalls] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState('not_answered');
  const [followUpAt, setFollowUpAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [users, setUsers] = useState([]);
  const [leadModal, setLeadModal] = useState(null);

  const isLoanAdvisor = user?.roleKey === 'loan_advisor' || user?.role === 'Loan Advisor';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, completedRes, metaRes] = await Promise.all([
        http.get('/calls?assignedTo=me&status=pending&limit=100'),
        http.get('/calls?assignedTo=me&status=completed_all&limit=50'),
        http.get('/calls/meta')
      ]);

      setPendingCalls(pendingRes.data.calls || []);
      setCompletedCalls(completedRes.data.calls || []);
      setUsers(metaRes.data.users || []);
      setCurrentIndex(0);
      setSelectedStatus('not_answered');
      setFollowUpAt('');
      setNotes('');
    } catch (err) {
      console.error('Failed to load calling queue:', err);
      setNotice(err.response?.data?.error || 'Unable to load assigned calls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCall = pendingCalls[currentIndex];

  const handleStatusSubmit = async (e) => {
    e?.preventDefault();
    if (!activeCall) return;

    if (selectedStatus === 'follow_up' && !followUpAt) {
      setNotice('Please select a follow-up date and time.');
      return;
    }

    if (selectedStatus === 'interested') {
      const defaultAssignee = isLoanAdvisor ? String(user?.id || '') : (activeCall.assigned_to ? String(activeCall.assigned_to) : String(user?.id || ''));
      const custName = activeCall.customer_name && !activeCall.customer_name.startsWith('Lead ') ? activeCall.customer_name : '';

      setLeadModal({
        call: activeCall,
        data: {
          name: custName,
          phone: activeCall.phone || '',
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
      return;
    }

    setSubmitting(true);
    setNotice('');

    try {
      const res = await http.patch(`/calls/${activeCall.id}`, {
        phone: activeCall.phone,
        customerName: activeCall.customer_name || `Lead ${activeCall.phone}`,
        assignedTo: activeCall.assigned_to,
        leadId: activeCall.lead_id,
        status: selectedStatus,
        followUpAt: selectedStatus === 'follow_up' ? followUpAt : null,
        notes: notes.trim(),
        markCalled: true
      });

      const updatedCall = res.data.call || {
        ...activeCall,
        status: selectedStatus,
        follow_up_at: selectedStatus === 'follow_up' ? followUpAt : null,
        notes: notes.trim(),
        updated_at: new Date().toISOString()
      };

      setCompletedCalls(prev => [updatedCall, ...prev]);
      setPendingCalls(prev => prev.filter(c => c.id !== activeCall.id));
      setSelectedStatus('not_answered');
      setFollowUpAt('');
      setNotes('');
      setNotice(`Status updated for ${activeCall.phone}`);
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      console.error('Failed to submit status update:', err);
      setNotice(err.response?.data?.error || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLeadFromModal = async (e) => {
    e?.preventDefault();
    if (!leadModal?.call) return;
    setSubmitting(true);
    setNotice('');
    try {
      await http.post(`/calls/${leadModal.call.id}/convert-to-lead`, leadModal.data);

      const updatedCall = {
        ...leadModal.call,
        status: 'interested',
        notes: leadModal.data.remarks,
        updated_at: new Date().toISOString()
      };

      setCompletedCalls(prev => [updatedCall, ...prev]);
      setPendingCalls(prev => prev.filter(c => c.id !== leadModal.call.id));
      setSelectedStatus('not_answered');
      setFollowUpAt('');
      setNotes('');
      setLeadModal(null);
      setNotice(`Lead created successfully for ${leadModal.call.phone}`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      console.error('Failed to create lead:', err);
      setNotice(err.response?.data?.error || 'Failed to create lead');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const isSuccessStatus = (st) => {
    return ['interested', 'connected', 'completed', 'follow_up'].includes(st);
  };

  const getStatusLabel = (st) => {
    const found = statusOptions.find(o => o.value === st);
    if (found) return found.label;
    return (st || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="lac-container">
      {/* Header */}
      <div className="lac-header">
        <h1>Call Management</h1>
        <p>Manage your assigned phone numbers</p>
      </div>

      {notice && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '8px',
          background: '#EEF2FF',
          color: '#3730A3',
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{notice}</span>
          <button onClick={() => setNotice('')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* Main Container Card */}
      <div className="lac-card-box">
        {/* Left Section - Active Call Controller */}
        <div className="lac-left-panel">
          {loading ? (
            <div style={{ color: '#ffffff', fontSize: '16px' }}>Loading assigned calls...</div>
          ) : activeCall ? (
            <>
              <div className="lac-counter-badge">
                Assigned Number ({currentIndex + 1} of {pendingCalls.length})
              </div>

              <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div className="lac-call-controls">
                  {/* Number Box */}
                  <div className="lac-field-group">
                    <label>Number</label>
                    <div className="lac-number-pill">
                      <a href={`tel:${activeCall.phone}`} title="Click to call">
                        {activeCall.phone}
                      </a>
                    </div>
                  </div>

                  {/* Status Dropdown Box */}
                  <div className="lac-field-group">
                    <label>Status</label>
                    <select
                      className="lac-status-select"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Follow-Up Date & Time Input (Shown when status === follow_up) */}
                  {selectedStatus === 'follow_up' && (
                    <div className="lac-field-group">
                      <label>Follow-up Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="lac-datetime-pill"
                        required
                        value={followUpAt}
                        onChange={(e) => setFollowUpAt(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="lac-field-group">
                    <label style={{ visibility: 'hidden' }}>Action</label>
                    <button
                      type="submit"
                      className="lac-submit-btn"
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : 'Submit & Next →'}
                    </button>
                  </div>
                </div>

                {/* Optional Call Note */}
                <div className="lac-notes-area">
                  <textarea
                    className="lac-notes-input"
                    rows="2"
                    placeholder="Add call notes (optional)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </form>
            </>
          ) : (
            <div className="lac-empty-state">
              <h3>All Assigned Calls Completed! 🎉</h3>
              <p>You have processed all pending calls in your queue.</p>
              <button className="lac-reload-btn" onClick={loadData}>
                ↻ Refresh Call Queue
              </button>
            </div>
          )}
        </div>

        {/* Right Section - Completed Calls List */}
        <div className="lac-right-panel">
          <h2>Completed Calls</h2>

          <div className="lac-completed-list">
            {completedCalls.length === 0 ? (
              <div className="lac-no-completed">No completed calls yet</div>
            ) : (
              completedCalls.map((call) => {
                const isSuccess = isSuccessStatus(call.status);
                return (
                  <div className="lac-completed-item" key={call.id}>
                    <div className={`lac-icon-wrapper ${isSuccess ? 'lac-icon-success' : 'lac-icon-danger'}`}>
                      {isSuccess ? '✓' : '✕'}
                    </div>
                    <div className="lac-item-details">
                      <div className="lac-item-phone">{call.phone}</div>
                      <div className="lac-item-status">
                        {getStatusLabel(call.status)}
                        {call.follow_up_at && (
                          <div style={{ fontSize: '11px', color: '#a5b4fc', marginTop: '2px' }}>
                            📅 {formatTime(call.follow_up_at)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="lac-item-time">
                      {formatTime(call.updated_at || call.last_called_at || call.created_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

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
