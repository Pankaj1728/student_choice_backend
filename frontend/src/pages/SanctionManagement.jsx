import React, { useCallback, useEffect, useState } from 'react';
import http from '../api/http';
import { useAuth } from '../auth/AuthContext';
import './sanction.css';

const money = x => Number(x || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function SanctionManagement() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ search: '', page: 1 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [notice, setNotice] = useState('');
  
  // Edit Modal State for Lead
  const [editLead, setEditLead] = useState(null);
  const [editSanctions, setEditSanctions] = useState([]);
  const [loadingSanctions, setLoadingSanctions] = useState(false);

  // Add New Bank Sanction Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    lead_id: '',
    lender: 'AVANSE',
    lender_remarks: '',
    sanction_amount: '',
    pf_amount: '',
    disbursement_amount: '',
    interest_rate: '',
    remarks: 'SANCTIONED'
  });
  const [leadsList, setLeadsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(filter.page), limit: '20' });
      if (filter.search) q.set('search', filter.search);
      const res = await http.get(`/sanctions?${q}`);
      setRows(res.data.sanctions || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to load sanctions:', err);
      setNotice(err.response?.data?.error || 'Unable to load sanction files');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = async () => {
    try {
      const res = await http.get('/leads?limit=100');
      setLeadsList(res.data.leads || []);
      setAddForm({
        lead_id: res.data.leads?.[0]?.id || '',
        lender: 'AVANSE',
        lender_remarks: '',
        sanction_amount: '',
        pf_amount: '',
        disbursement_amount: '',
        interest_rate: '',
        remarks: 'SANCTIONED'
      });
      setShowAddModal(true);
    } catch (err) {
      console.error('Failed to fetch leads for sanction modal:', err);
      alert('Failed to load leads list');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addForm.lead_id) {
      alert('Please select a student lead');
      return;
    }
    setSubmitting(true);
    try {
      await http.post('/sanctions', addForm);
      setNotice('New bank sanction added successfully!');
      setShowAddModal(false);
      loadData();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      console.error('Failed to add bank sanction:', err);
      alert(err.response?.data?.error || 'Failed to add bank sanction');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = async (item) => {
    setEditLead(item);
    setLoadingSanctions(true);
    try {
      const res = await http.get(`/sanctions/lead/${item.lead_id}`);
      setEditSanctions(res.data.sanctions || []);
    } catch (err) {
      console.error('Failed to load lead sanctions:', err);
      alert('Failed to load bank sanctions for this student');
      setEditLead(null);
    } finally {
      setLoadingSanctions(false);
    }
  };

  const handleSanctionChange = (index, field, value) => {
    setEditSanctions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editLead) return;
    setSubmitting(true);
    try {
      await http.patch(`/sanctions/lead/${editLead.lead_id}`, { sanctions: editSanctions });
      setNotice(`Updated bank sanctions for ${editLead.name}`);
      setEditLead(null);
      loadData();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      console.error('Failed to update sanction files:', err);
      alert(err.response?.data?.error || 'Failed to save sanction details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAllLeadSanctions = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ALL bank sanctions for ${item.name}?`)) return;
    try {
      await http.delete(`/sanctions/${item.id}`);
      setNotice(`Sanction record deleted for ${item.name}`);
      loadData();
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      console.error('Failed to delete sanction record:', err);
      alert(err.response?.data?.error || 'Failed to delete sanction record');
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
    <section className="page sanction-container">
      {/* Header Banner */}
      <div className="sanc-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '1.5px', color: '#9b78e7' }}>SANCTION PIPELINE</span>
          <h1>Sanction Management</h1>
          <p>Manage bank loan sanctions (1 row per student)</p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>+</span> Add Bank Sanction
        </button>
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
      <div className="sanc-filters">
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
      <div className="sanc-count">
        <span><b>{pagination.total}</b> students with sanctions found</span>
        <span>Page {pagination.page} of {pagination.pages}</span>
      </div>

      {/* Table Container */}
      <div className="sanc-table-wrapper">
        <table className="sanc-table">
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
              <th className="sanc-highlight">SANCTIONED LENDERS</th>
              <th className="sanc-highlight">LENDER REMARKS</th>
              <th className="sanc-highlight">TOTAL SANCTION AMOUNT</th>
              <th className="sanc-highlight">TOTAL PF AMOUNT</th>
              <th className="sanc-highlight">TOTAL DISBURSEMENT</th>
              <th className="sanc-highlight">INTEREST RATE</th>
              <th className="sanc-highlight">REMARKS</th>
              <th style={{ textAlign: 'center' }} title="Edit All Bank Sanctions"><EditIcon /></th>
              <th style={{ textAlign: 'center' }} title="Delete Record"><DeleteIcon /></th>
              <th style={{ textAlign: 'center' }} title="WhatsApp Chat"><WhatsAppIcon /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="23" style={{ textAlign: 'center', padding: '40px', color: '#7e8999' }}>
                  Loading sanction files...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="23" style={{ textAlign: 'center', padding: '40px', color: '#7e8999' }}>
                  No sanction records found.
                </td>
              </tr>
            ) : (
              rows.map(item => (
                <tr key={item.lead_id}>
                  <td>{formatDate(item.created_at)}</td>
                  <td style={{ fontWeight: 700, color: '#28364e' }}>{item.name}</td>
                  <td>
                    <a href={`tel:${item.phone}`} className="sanc-phone">{item.phone}</a>
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
                  <td>{item.interested || 'SANCTION'}</td>
                  
                  {/* Sanctioned Lenders Badges */}
                  <td style={{ fontWeight: 700, color: '#6012c7' }}>
                    {String(item.lender || 'AVANSE').split(', ').map((lnd, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-block',
                          background: '#f3e8ff',
                          color: '#6012c7',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          marginRight: '4px',
                          marginBottom: '2px'
                        }}
                      >
                        {lnd}
                      </span>
                    ))}
                  </td>

                  <td>{item.lender_remarks || '—'}</td>
                  <td style={{ fontWeight: 700, color: '#1675b7' }}>{money(item.sanction_amount)}</td>
                  <td style={{ fontWeight: 600 }}>{money(item.pf_amount)}</td>
                  <td style={{ fontWeight: 600, color: '#10b981' }}>{money(item.disbursement_amount)}</td>
                  <td style={{ fontWeight: 600 }}>{item.interest_rate || '—'}</td>
                  <td>
                    <span className={`sanc-badge st-${(item.remarks || 'SANCTIONED').toLowerCase()}`}>
                      {item.remarks || 'SANCTIONED'}
                    </span>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="sanc-action-edit"
                      title="Edit All Bank Sanctions for Student"
                      onClick={() => openEditModal(item)}
                    >
                      <EditIcon />
                    </button>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="sanc-action-edit"
                      style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                      title="Delete Sanction Record"
                      onClick={() => handleDeleteAllLeadSanctions(item)}
                    >
                      <DeleteIcon />
                    </button>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <a
                      href={`https://wa.me/91${String(item.phone || '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="sanc-action-wa"
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
      <div className="sanc-pager">
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

      {/* Add New Bank Sanction Modal */}
      {showAddModal && (
        <div className="overlay">
          <form className="lead-form" onSubmit={handleCreate} style={{ width: 'min(750px, 100%)', background: '#ffffff', color: '#35435a' }}>
            <div className="modal-top" style={{ borderBottom: '1px solid #eef0f4' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '1.5px', color: '#9b78e7' }}>NEW BANK SANCTION</span>
                <h2 style={{ color: '#28364e', margin: '4px 0 0 0' }}>Add Bank Sanction for Student</h2>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: '#f0f1f5', color: '#333' }}>×</button>
            </div>

            <div className="sanc-modal-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label>Select Student Lead *</label>
                <select
                  required
                  value={addForm.lead_id}
                  onChange={e => setAddForm(prev => ({ ...prev, lead_id: e.target.value }))}
                >
                  <option value="">-- Select Student --</option>
                  {leadsList.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.phone} ({l.university || 'No Univ'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Lender / Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AVANSE, HDFC CREDILA, ICICI, INCRED"
                  value={addForm.lender}
                  onChange={e => setAddForm(prev => ({ ...prev, lender: e.target.value }))}
                />
              </div>

              <div>
                <label>Lender Remarks / App Ref</label>
                <input
                  type="text"
                  placeholder="e.g. APP-847291"
                  value={addForm.lender_remarks}
                  onChange={e => setAddForm(prev => ({ ...prev, lender_remarks: e.target.value }))}
                />
              </div>

              <div>
                <label>Sanction Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.sanction_amount}
                  onChange={e => setAddForm(prev => ({ ...prev, sanction_amount: e.target.value }))}
                />
              </div>

              <div>
                <label>PF Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.pf_amount}
                  onChange={e => setAddForm(prev => ({ ...prev, pf_amount: e.target.value }))}
                />
              </div>

              <div>
                <label>Disbursement Amount (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.disbursement_amount}
                  onChange={e => setAddForm(prev => ({ ...prev, disbursement_amount: e.target.value }))}
                />
              </div>

              <div>
                <label>Interest Rate (%)</label>
                <input
                  type="text"
                  placeholder="e.g. 11.25"
                  value={addForm.interest_rate}
                  onChange={e => setAddForm(prev => ({ ...prev, interest_rate: e.target.value }))}
                />
              </div>

              <div>
                <label>Status / Remarks</label>
                <select
                  value={addForm.remarks}
                  onChange={e => setAddForm(prev => ({ ...prev, remarks: e.target.value }))}
                >
                  <option value="SANCTIONED">SANCTIONED</option>
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #eef0f4' }}>
              <button type="button" className="secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Sanction Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Multi-Bank Sanction Edit Modal for Student */}
      {editLead && (
        <div className="overlay">
          <form className="lead-form" onSubmit={handleSave} style={{ width: 'min(920px, 100%)', background: '#ffffff', color: '#35435a', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-top" style={{ borderBottom: '1px solid #eef0f4', sticky: 'top', background: '#fff', zIndex: 10 }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '1.5px', color: '#9b78e7' }}>SANCTION MANAGEMENT</span>
                <h2 style={{ color: '#28364e', margin: '4px 0 0 0' }}>Update Bank Sanctions — {editLead.name} ({editLead.phone})</h2>
              </div>
              <button type="button" onClick={() => setEditLead(null)} style={{ background: '#f0f1f5', color: '#333' }}>×</button>
            </div>

            {loadingSanctions ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#7e8999' }}>
                Loading bank sanctions...
              </div>
            ) : (
              <div style={{ padding: '16px 24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontWeight: 700, color: '#28364e' }}>
                    Sanctioned Banks for Student ({editSanctions.length})
                  </span>
                </div>

                {editSanctions.map((sanc, index) => {
                  return (
                    <div
                      key={sanc.id || `bank-${index}`}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '16px',
                        marginBottom: '16px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ marginBottom: '12px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#6012c7', fontSize: '14px' }}>
                          BANK #{index + 1}: {sanc.lender || 'LENDER'}
                        </span>
                      </div>

                      <div className="sanc-modal-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700 }}>Lender / Bank Name *</label>
                          <input
                            type="text"
                            required
                            value={sanc.lender || ''}
                            onChange={e => handleSanctionChange(index, 'lender', e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700 }}>App Ref / Lender Remarks</label>
                          <input
                            type="text"
                            value={sanc.lender_remarks || ''}
                            onChange={e => handleSanctionChange(index, 'lender_remarks', e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700 }}>Sanction Amount (₹)</label>
                          <input
                            type="number"
                            value={sanc.sanction_amount ?? ''}
                            onChange={e => handleSanctionChange(index, 'sanction_amount', e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700 }}>PF Amount (₹)</label>
                          <input
                            type="number"
                            value={sanc.pf_amount ?? ''}
                            onChange={e => handleSanctionChange(index, 'pf_amount', e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700 }}>Interest Rate (%)</label>
                          <input
                            type="text"
                            placeholder="e.g. 11.25"
                            value={sanc.interest_rate || ''}
                            onChange={e => handleSanctionChange(index, 'interest_rate', e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700 }}>Disbursement Amount (₹)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={sanc.disbursement_amount ?? ''}
                            onChange={e => handleSanctionChange(index, 'disbursement_amount', e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', fontWeight: 700 }}>Status / Remarks</label>
                          <select
                            value={sanc.remarks || 'SANCTIONED'}
                            onChange={e => handleSanctionChange(index, 'remarks', e.target.value)}
                          >
                            <option value="SANCTIONED">SANCTIONED</option>
                            <option value="PAID">PAID</option>
                            <option value="PENDING">PENDING</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="modal-footer" style={{ borderTop: '1px solid #eef0f4' }}>
              <button type="button" className="secondary" onClick={() => setEditLead(null)}>Cancel</button>
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? 'Saving All...' : 'Save All Sanction Details'}
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

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
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
