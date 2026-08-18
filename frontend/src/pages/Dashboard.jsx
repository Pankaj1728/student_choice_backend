import React from 'react';
import { useAuth } from '../auth/AuthContext';
import './dashboard.css';

// SVG Helper Functions to calculate pie/donut chart paths
function getCoordinatesForPercent(percent) {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
}

function PieChart({ data }) {
  let cumulativePercent = 0;

  const slices = data.map((slice) => {
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
    cumulativePercent += slice.percent / 100;
    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
    const largeArcFlag = slice.percent / 100 > 0.5 ? 1 : 0;

    const pathData = [
      `M ${startX * 120 + 150} ${startY * 120 + 150}`,
      `A 120 120 0 ${largeArcFlag} 1 ${endX * 120 + 150} ${endY * 120 + 150}`,
      `L 150 150`,
    ].join(' ');

    // Calculate mid angle for text label placement
    const midPercent = cumulativePercent - (slice.percent / 100) / 2;
    const [labelX, labelY] = getCoordinatesForPercent(midPercent);

    return {
      pathData,
      color: slice.color,
      label: slice.label,
      percent: slice.percent,
      textX: labelX * 75 + 150,
      textY: labelY * 75 + 150,
    };
  });

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: '280px' }}>
      <g transform="rotate(-90 150 150)">
        {slices.map((slice, idx) => (
          <path key={idx} d={slice.pathData} fill={slice.color} stroke="#6c00ff" strokeWidth="2" />
        ))}
      </g>
      {slices.map((slice, idx) => (
        <text
          key={idx}
          x={slice.textX}
          y={slice.textY}
          fill="#ffffff"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {slice.label}
          <tspan x={slice.textX} dy="12">{slice.percent}%</tspan>
        </text>
      ))}
    </svg>
  );
}

function DonutChart({ data }) {
  let cumulativePercent = 0;

  const slices = data.map((slice) => {
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
    cumulativePercent += slice.percent / 100;
    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
    const largeArcFlag = slice.percent / 100 > 0.5 ? 1 : 0;

    const pathData = [
      `M ${startX * 120 + 150} ${startY * 120 + 150}`,
      `A 120 120 0 ${largeArcFlag} 1 ${endX * 120 + 150} ${endY * 120 + 150}`,
      `L 150 150`,
    ].join(' ');

    const midPercent = cumulativePercent - (slice.percent / 100) / 2;
    const [labelX, labelY] = getCoordinatesForPercent(midPercent);

    return {
      pathData,
      color: slice.color,
      label: slice.label,
      percent: slice.percent,
      textX: labelX * 85 + 150,
      textY: labelY * 85 + 150,
    };
  });

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: '280px' }}>
      <g transform="rotate(-90 150 150)">
        {slices.map((slice, idx) => (
          <path key={idx} d={slice.pathData} fill={slice.color} stroke="#7b12ff" strokeWidth="2" />
        ))}
        {/* Inner Circle for Donut Cutout */}
        <circle cx="150" cy="150" r="50" fill="#7b12ff" />
      </g>
      {slices.map((slice, idx) => (
        <text
          key={idx}
          x={slice.textX}
          y={slice.textY}
          fill="#ffffff"
          fontSize="9"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {slice.label}
          <tspan x={slice.textX} dy="11">{slice.percent}%</tspan>
        </text>
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdvisor = user?.roleKey === 'loan_advisor' || user?.role === 'Loan Advisor';

  // Dummy Data tailored by Role
  const kpiData = isAdvisor
    ? [
        { icon: '👥', label: 'Total Leads', val: '148' },
        { icon: '🎯', label: 'Interested Leads', val: '82' },
        { icon: '📁', label: 'Total Login', val: '64' },
        { icon: '🛡️', label: 'Total Sanction', val: '28' },
        { icon: '💼', label: 'Total PF', val: '9' },
      ]
    : [
        { icon: '👥', label: 'Total Leads', val: '1232' },
        { icon: '🎯', label: 'Interested Leads', val: '875' },
        { icon: '📁', label: 'Total Login', val: '930' },
        { icon: '🛡️', label: 'Total Sanction', val: '360' },
        { icon: '💼', label: 'Total PF', val: '80' },
      ];

  const dailyReport = isAdvisor
    ? [
        { icon: '👤', label: 'Leads', val: 2 },
        { icon: '📁', label: 'Files Update', val: 1 },
        { icon: '👤', label: 'Login', val: 1 },
        { icon: '🛡️', label: 'Sanction', val: 0 },
        { icon: '💼', label: 'PF Paid', val: 0 },
      ]
    : [
        { icon: '👤', label: 'Leads', val: 4 },
        { icon: '📁', label: 'Files Update', val: 2 },
        { icon: '👤', label: 'Login', val: 1 },
        { icon: '🛡️', label: 'Sanction', val: 1 },
        { icon: '💼', label: 'PF Paid', val: 1 },
      ];

  const monthlyReport = isAdvisor
    ? [
        { icon: '👤', label: 'Leads', val: 14 },
        { icon: '📁', label: 'Files Update', val: 8 },
        { icon: '👤', label: 'Login', val: 6 },
        { icon: '🛡️', label: 'Sanction', val: 4 },
        { icon: '💼', label: 'PF Paid', val: 2 },
        { icon: '🛒', label: 'Cross Sales', val: 1 },
        { icon: '💼', label: 'Disbursement', val: 1 },
      ]
    : [
        { icon: '👤', label: 'Leads', val: 43 },
        { icon: '📁', label: 'Files Update', val: 23 },
        { icon: '👤', label: 'Login', val: 17 },
        { icon: '🛡️', label: 'Sanction', val: 12 },
        { icon: '💼', label: 'PF Paid', val: 5 },
        { icon: '🛒', label: 'Cross Sales', val: 2 },
        { icon: '💼', label: 'Disbursement', val: 3 },
      ];

  const leadPipelineData = [
    { label: 'Leads', percent: 27.8, color: '#3B82F6' },
    { label: 'Files', percent: 22.2, color: '#A855F7' },
    { label: 'Login', percent: 18.9, color: '#F97316' },
    { label: 'Sanction', percent: 13.3, color: '#FACC15' },
    { label: 'PF Paid', percent: 7.8, color: '#EC4899' },
    { label: 'Disbursement', percent: 5.6, color: '#06B6D4' },
  ];

  const sourceLeadsData = [
    { label: 'Direct SCC', percent: 30.8, color: '#3B82F6' },
    { label: 'Consultant', percent: 30.8, color: '#A855F7' },
    { label: 'Social Media', percent: 7.7, color: '#EC4899' },
    { label: 'Reference', percent: 7.7, color: '#F59E0B' },
    { label: 'Green Data', percent: 7.7, color: '#EF4444' },
    { label: 'Orange Data', percent: 15.4, color: '#F472B6' },
  ];

  return (
    <div className="dash-container">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-header-text">
          <h1>Welcome Back, {user?.name || 'User'}! 👋</h1>
          <p>Here's what's happening with your CRM today.</p>
        </div>

        <div className={`dash-role-badge ${isAdvisor ? 'advisor' : 'admin'}`}>
          {isAdvisor ? '👤 Loan Adviser View (Own Data)' : '🌐 Admin View (All Team Data)'}
        </div>
      </div>

      {/* Main Grid */}
      <div className="dash-grid">
        {/* Main Column */}
        <div className="dash-main-col">
          {/* Top KPI Cards Row */}
          <div className="dash-kpi-row">
            {kpiData.map((item, idx) => (
              <div className="dash-kpi-card" key={idx}>
                <div className="dash-kpi-icon">{item.icon}</div>
                <div className="dash-kpi-label">{item.label}</div>
                <div className="dash-kpi-value">{item.val}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="dash-charts-row">
            {/* Lead Pipeline Pie Chart */}
            <div className="dash-chart-card">
              <div className="dash-chart-title">Lead Pipeline</div>
              <div className="dash-chart-body">
                <PieChart data={leadPipelineData} />
              </div>
            </div>

            {/* Source wise Leads Donut Chart */}
            <div className="dash-chart-card">
              <div className="dash-chart-title">Source wise Leads</div>
              <div className="dash-chart-body">
                <DonutChart data={sourceLeadsData} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Reports Column */}
        <div className="dash-reports-col">
          {/* Daily Work Reports */}
          <div className="dash-report-card">
            <div className="dash-report-title">Daily Work Reports</div>
            <div className="dash-report-list">
              {dailyReport.map((item, idx) => (
                <div className="dash-report-item" key={idx}>
                  <div className="dash-report-item-left">
                    <span className="dash-report-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <div className="dash-report-val">{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Work Reports */}
          <div className="dash-report-card">
            <div className="dash-report-title">Monthly Work Reports</div>
            <div className="dash-report-list">
              {monthlyReport.map((item, idx) => (
                <div className="dash-report-item" key={idx}>
                  <div className="dash-report-item-left">
                    <span className="dash-report-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <div className="dash-report-val">{item.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
