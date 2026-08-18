import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import LoanAdviserCalling from './LoanAdviserCalling';
import CallingWorkflowV10 from './CallingWorkflowV10';
import './calling-workflow-v11.css';

export default function CallingWorkflowV11() {
  const { user } = useAuth();
  const isLoanAdvisor = user?.roleKey === 'loan_advisor' || user?.role === 'Loan Advisor';
  const [viewMode, setViewMode] = useState(isLoanAdvisor ? 'advisor' : 'management');

  // If user is a Loan Advisor, render the one-by-one Calling View directly
  if (isLoanAdvisor) {
    return <LoanAdviserCalling />;
  }

  // For Admin / Managers / Super Admin: Show view switcher tab
  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '16px 32px 0 32px',
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff'
      }}>
        <button
          onClick={() => setViewMode('management')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            fontSize: '14px',
            border: 'none',
            borderBottom: viewMode === 'management' ? '3px solid #4f46e5' : '3px solid transparent',
            background: viewMode === 'management' ? '#f3f4f6' : 'transparent',
            color: viewMode === 'management' ? '#4f46e5' : '#6b7280',
            cursor: 'pointer'
          }}
        >
          📊 Call Management & Bulk Upload
        </button>

        <button
          onClick={() => setViewMode('advisor')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            fontWeight: 600,
            fontSize: '14px',
            border: 'none',
            borderBottom: viewMode === 'advisor' ? '3px solid #4f46e5' : '3px solid transparent',
            background: viewMode === 'advisor' ? '#f3f4f6' : 'transparent',
            color: viewMode === 'advisor' ? '#4f46e5' : '#6b7280',
            cursor: 'pointer'
          }}
        >
          📱 Loan Adviser Call View (One-by-One)
        </button>
      </div>

      {viewMode === 'advisor' ? (
        <LoanAdviserCalling />
      ) : (
        <CallingWorkflowV10 />
      )}
    </div>
  );
}
