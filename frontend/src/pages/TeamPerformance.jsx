import React, { useEffect, useState } from 'react';
import http from '../api/http';
import { useAuth } from '../auth/AuthContext';
import './team-performance.css';

const money = x => Number(x || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function TeamPerformance() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPerformance() {
      setLoading(true);
      try {
        const res = await http.get('/reports/team-performance');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load team performance:', err);
        setError(err.response?.data?.error || 'Unable to load team performance metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, []);

  if (loading) {
    return (
      <section className="page tp-container">
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          Loading team performance metrics...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page tp-container">
        <div style={{ padding: '20px', background: '#fee2e2', color: '#b91c1c', borderRadius: '10px' }}>
          {error}
        </div>
      </section>
    );
  }

  const { summary, conversionFunnel, advisorPerformance, lenderBreakdown } = data || {};

  return (
    <section className="page tp-container">
      {/* Header */}
      <div className="tp-head">
        <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '1.5px', color: '#6366f1' }}>ANALYTICS & LEADERBOARD</span>
        <h1>Team Performance</h1>
        <p>Monitor advisor call volume, conversion ratios, and pipeline performance</p>
      </div>

      {/* Top Overview KPI Cards */}
      <div className="tp-stats-grid">
        <div className="tp-stat-card" style={{ borderLeft: '4px solid #6366f1' }}>
          <span className="label">Total Leads</span>
          <div className="value">{summary?.totalLeads || 0}</div>
          <span className="sub">{summary?.totalFiles || 0} Login Files Moved</span>
        </div>

        <div className="tp-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <span className="label">Sanctions Approved</span>
          <div className="value">{summary?.totalSanctions || 0}</div>
          <span className="sub">Value: {money(summary?.totalSanctionAmount)}</span>
        </div>

        <div className="tp-stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
          <span className="label">Disbursements Done</span>
          <div className="value">{summary?.totalDisbursements || 0}</div>
          <span className="sub">Value: {money(summary?.totalDisbursedAmount)}</span>
        </div>

        <div className="tp-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span className="label">Conversion Rate</span>
          <div className="value">{conversionFunnel?.leadToSanctionRate || 0}%</div>
          <span className="sub">Lead ➔ Sanction Conversion</span>
        </div>
      </div>

      {/* Advisor Call Performance Leaderboard */}
      <h2 className="tp-section-title">
        <span>📞</span> Loan Advisor Call Activity Leaderboard
      </h2>

      <div className="tp-card-wrapper">
        <table className="tp-table">
          <thead>
            <tr>
              <th>ADVISOR NAME</th>
              <th>EMAIL</th>
              <th>TOTAL CALLS</th>
              <th>CONNECTED</th>
              <th>MISSED / BUSY</th>
              <th>TALK TIME (MINS)</th>
              <th>ACTIVITY STATUS</th>
            </tr>
          </thead>
          <tbody>
            {advisorPerformance?.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No advisor calling activity recorded yet.
                </td>
              </tr>
            ) : (
              advisorPerformance?.map(adv => (
                <tr key={adv.user_id}>
                  <td className="tp-advisor-name">{adv.advisor_name}</td>
                  <td>{adv.advisor_email}</td>
                  <td>
                    <span className="tp-badge-call">{adv.total_calls} calls</span>
                  </td>
                  <td style={{ color: '#16a34a', fontWeight: 700 }}>{adv.connected_calls}</td>
                  <td style={{ color: '#dc2626', fontWeight: 600 }}>{adv.missed_calls}</td>
                  <td style={{ fontWeight: 700 }}>{adv.total_duration_minutes} mins</td>
                  <td>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {adv.connected_calls > 0 ? (
                        <span>Connected Ratio: {Math.round((adv.connected_calls / Math.max(adv.total_calls, 1)) * 100)}%</span>
                      ) : 'No calls connected'}
                    </div>
                    <div className="tp-progress-bg">
                      <div
                        className="tp-progress-bar"
                        style={{ width: `${Math.min(Math.round((adv.connected_calls / Math.max(adv.total_calls, 1)) * 100), 100)}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Funnel & Lender Breakdown Grid */}
      <div className="tp-funnel-grid">
        {/* Conversion Funnel */}
        <div className="tp-funnel-card">
          <h3>📊 Pipeline Conversion Funnel</h3>
          <div className="tp-funnel-step">
            <span>1. Total Generated Leads</span>
            <span style={{ color: '#6366f1' }}>{conversionFunnel?.totalLeads}</span>
          </div>
          <div className="tp-funnel-step">
            <span>2. Multi-Lender Logins</span>
            <span style={{ color: '#0284c7' }}>{conversionFunnel?.totalFiles}</span>
          </div>
          <div className="tp-funnel-step">
            <span>3. Approved Sanctions</span>
            <span style={{ color: '#16a34a' }}>{conversionFunnel?.totalSanctions}</span>
          </div>
          <div className="tp-funnel-step">
            <span>4. Disbursed Loans</span>
            <span style={{ color: '#d97706' }}>{conversionFunnel?.totalDisbursed}</span>
          </div>
        </div>

        {/* Lender Distribution Breakdown */}
        <div className="tp-funnel-card">
          <h3>🏦 Lender Sanction Distribution</h3>
          {lenderBreakdown?.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>No sanction data by lender available.</p>
          ) : (
            lenderBreakdown?.map((l, idx) => (
              <div key={idx} className="tp-funnel-step">
                <span>{l.lender_name}</span>
                <span style={{ fontWeight: 800, color: '#334155' }}>
                  {l.sanction_count} sanctions ({money(l.total_amount)})
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
