import React, { useCallback, useEffect, useState } from 'react';
import http from '../api/http';
import { useAuth } from '../auth/AuthContext';
import './pf-update.css';

const money = x => Number(x || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function PfUpdateManagement() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ search: '', page: 1 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [notice, setNotice] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(filter.page), limit: '20' });
      if (filter.search) q.set('search', filter.search);
      const res = await http.get(`/pf-updates?${q}`);
      setRows(res.data.pfs || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to load pf-updates:', err);
      setNotice(err.response?.data?.error || 'Unable to load PF update records');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditModal = (item) => {
    setEditItem(item);
    setEditForm({ ...item });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setSubmitting(true);
    try {
      await http.patch(`/pf-updates/${editItem.id}`, editForm);
      setNotice(`Updated PF details for ${editItem.name}`);
      setEditItem(null);
      loadData();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      console.error('Failed to update PF record:', err);
      alert(err.response?.data?.error || 'Failed to save PF update details');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const yr = String(dt.getFullYear()).slice(-2);
    return `${day}-${month}-${yr}`;
  };

  return (
    <section className="page pf-container">
      {/* Header Banner */}
      <div className="pf-head">
        <div>
          <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '1.5px', color: '#9b78e7' }}>PF PIPELINE</span>
          <h1>PF Update</h1>
          <p>Manage your Sanction Files & PF Updates</p>
        </div>
      </div>

      {notice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          background: '#ddf8e6',
          color: '#17834b',
          border: '1px solid #b7f0c9',
          marginBottom: '20px',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>{notice}</span>
          <button onClick={() => setNotice('')} style={{ border: 'none', background: 'none', color: '#17834b', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="pf-filters">
        <label>
          ⌕ <input
            type="text"
            placeholder="Search name, phone, email, lender, or city..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </label>
        <button onClick={() => setFilter({ search: '', page: 1 })}>Clear</button>
      </div>

      {/* Count Bar */}
      <div className="pf-count">
        <span><b>{pagination.total}</b> PF records found</span>
        <span>Page {pagination.page} of {pagination.pages}</span>
      </div>

      {/* Table Container */}
      <div className="pf-table-wrapper">
        <table className="pf-table">
          <thead>
            <tr>
              <th>DATE</th>
              <th>NAME</th>
              <th>NUMBER</th>
              <th>EMAIL</th>
              <th>COUNTRY</th>
              <th>UNIVERSITY</th>
              <th>ENTRANCE EXAM</th>
              <th>LOAN AMOUNT</th>
              <th>STUDENT-WE</th>
              <th>CO-APPLICANT</th>
              <th>OCCUPATION</th>
              <th>CITY</th>
              <th>INTERESTED</th>
              <th className="pf-highlight">LENDER</th>
              <th className="pf-highlight">LENDER REMARKS</th>
              <th className="pf-highlight">SANCTION AMOUNT</th>
              <th className="pf-highlight">PF AMOUNT</th>
              <th className="pf-highlight">INTEREST RATE</th>
              <th className="pf-highlight">PF PAID</th>
              <th className="pf-highlight">REMARKS</th>
              <th style={{ textAlign: 'center' }} title="Edit PF Update Details"><EditIcon /></th>
              <th style={{ textAlign: 'center' }} title="WhatsApp Chat"><WhatsAppIcon /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="22" style={{ textAlign: 'center', padding: '40px', color: '#7e8999' }}>
                  Loading PF update records...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="22" style={{ textAlign: 'center', padding: '40px', color: '#7e8999' }}>
                  No PF update records found.
                </td>
              </tr>
            ) : (
              rows.map(item => (
                <tr key={item.id}>
                  <td>{item.date || formatDate(item.created_at)}</td>
                  <td style={{ fontWeight: 700, color: '#28364e' }}>{item.name}</td>
                  <td>
                    <a href={`tel:${item.phone}`} className="pf-phone">{item.phone}</a>
                  </td>
                  <td>{item.email || '—'}</td>
                  <td>{item.country || '—'}</td>
                  <td>{item.university || '—'}</td>
                  <td>{item.entrance_exam || '—'}</td>
                  <td style={{ fontWeight: 600, color: '#28364e' }}>{money(item.loan_amount)}</td>
                  <td>{item.student_we || '—'}</td>
                  <td>{item.co_applicant || '—'}</td>
                  <td>{item.occupation || '—'}</td>
                  <td>{item.city || '—'}</td>
                  <td>{item.interested || 'TATA'}</td>
                  <td style={{ fontWeight: 700, color: '#6012c7' }}>{item.lender || 'AVANSE'}</td>
                  <td>{item.lender_remarks || '—'}</td>
                  <td style={{ fontWeight: 700, color: '#1675b7' }}>{money(item.sanction_amount)}</td>
                  <td style={{ fontWeight: 600 }}>{money(item.pf_amount)}</td>
                  <td style={{ fontWeight: 600 }}>{item.interest_rate ? `${item.interest_rate}%` : '—'}</td>
                  <td style={{ fontWeight: 700, color: '#17834b' }}>{money(item.pf_paid)}</td>
                  <td>
                    <span className={`pf-badge st-${(item.remarks || 'PAID').toLowerCase()}`}>
                      {item.remarks || 'PAID'}
                    </span>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="pf-action-edit"
                      title="Edit PF Details"
                      onClick={() => openEditModal(item)}
                    >
                      <EditIcon />
                    </button>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <a
                      href={`https://wa.me/91${String(item.phone || '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="pf-action-wa"
                      title="Chat on WhatsApp"
                    >
                      <WhatsAppIcon />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="pf-pager">
        <button
          disabled={pagination.page <= 1}
          onClick={() => setFilter(prev => ({ ...prev, page: prev.page - 1 }))}
        >
          ← Previous
        </button>
        <span>{pagination.page} / {pagination.pages}</span>
        <button
          disabled={pagination.page >= pagination.pages}
          onClick={() => setFilter(prev => ({ ...prev, page: prev.page + 1 }))}
        >
          Next →
        </button>
      </div>

      {/* PF Update Edit Modal */}
      {editItem && (
        <div className="overlay">
          <form className="lead-form" onSubmit={handleSave} style={{ width: 'min(780px, 100%)', background: '#ffffff', color: '#35435a' }}>
            <div className="modal-top" style={{ borderBottom: '1px solid #eef0f4' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '1.5px', color: '#9b78e7' }}>PF UPDATE MANAGEMENT</span>
                <h2 style={{ color: '#28364e', margin: '4px 0 0 0' }}>Update PF Details — {editItem.name}</h2>
              </div>
              <button type="button" onClick={() => setEditItem(null)} style={{ background: '#f0f1f5', color: '#333' }}>×</button>
            </div>

            <div className="pf-modal-grid">
              <div>
                <label>Lender / Bank Name</label>
                <input
                  type="text"
                  value={editForm.lender || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, lender: e.target.value }))}
                />
              </div>

              <div>
                <label>Lender Remarks / App Ref</label>
                <input
                  type="text"
                  value={editForm.lender_remarks || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, lender_remarks: e.target.value }))}
                />
              </div>

              <div>
                <label>Sanction Amount (₹)</label>
                <input
                  type="number"
                  value={editForm.sanction_amount || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, sanction_amount: e.target.value }))}
                />
              </div>

              <div>
                <label>PF Amount Total (₹)</label>
                <input
                  type="number"
                  value={editForm.pf_amount || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, pf_amount: e.target.value }))}
                />
              </div>

              <div>
                <label>Interest Rate (%)</label>
                <input
                  type="text"
                  placeholder="e.g. 11.25"
                  value={editForm.interest_rate || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, interest_rate: e.target.value }))}
                />
              </div>

              <div>
                <label>PF Paid Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  value={editForm.pf_paid || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, pf_paid: e.target.value }))}
                />
              </div>

              <div className="full">
                <label>Status / Remarks</label>
                <select
                  value={editForm.remarks || 'PAID'}
                  onChange={e => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                >
                  <option value="PAID">PAID</option>
                  <option value="PARTIALLY PAID">PARTIALLY PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="SANCTIONED">SANCTIONED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #eef0f4' }}>
              <button type="button" className="secondary" onClick={() => setEditItem(null)}>Cancel</button>
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save PF Details'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.764.459 3.487 1.333 5.006L2 22l5.127-1.34c1.464.797 3.116 1.218 4.881 1.218 5.508 0 9.991-4.479 9.991-9.985 0-5.506-4.482-9.993-9.987-9.993zm5.727 14.156c-.24.673-1.402 1.29-1.954 1.344-.51.05-1.162.083-3.691-.941-3.238-1.31-5.321-4.606-5.48-4.819-.16-.213-1.305-1.737-1.305-3.313 0-1.576.825-2.35 1.117-2.67.292-.32.639-.4.853-.4.213 0 .426 0 .613.01.2.01.466-.076.733.56.267.638.907 2.213.987 2.373.08.16.133.346.027.56-.107.213-.16.346-.32.533-.16.187-.336.413-.48.554-.16.16-.326.333-.14.653.187.32.83 1.368 1.782 2.215 1.222 1.089 2.253 1.427 2.573 1.587.32.16.507.133.693-.08.187-.213.799-.933 1.013-1.253.213-.32.426-.267.72-.16.293.107 1.865.879 2.185 1.039.32.16.533.24.613.373.08.133.08.773-.16 1.446z"/>
    </svg>
  );
}
