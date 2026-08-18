import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Placeholder from './pages/Placeholder';
import RoleManagement from './pages/RoleManagement';
import UserManagement from './pages/UserManagement';
import LeadManagementV3 from './pages/LeadManagementV3';
import CallingWorkflow from './pages/CallingWorkflowV11';
import FollowUpManagement from './pages/FollowUpManagement';
import FilesUpdate from './pages/FilesUpdate';
import SanctionManagement from './pages/SanctionManagement';
import PfUpdateManagement from './pages/PfUpdateManagement';
import DisbursementManagement from './pages/DisbursementManagement';
import CrossSalesManagement from './pages/CrossSalesManagement';
import TeamPerformance from './pages/TeamPerformance';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<LeadManagementV3 />} />
            <Route path="/calling" element={<CallingWorkflow />} />
            <Route path="/follow-ups" element={<FollowUpManagement />} />
            <Route path="/files" element={<FilesUpdate />} />
            <Route path="/sanction" element={<SanctionManagement />} />
            <Route path="/pf-update" element={<PfUpdateManagement />} />
            <Route path="/disbursement" element={<DisbursementManagement />} />
            <Route path="/cross-sales" element={<CrossSalesManagement />} />
            <Route path="/team" element={<TeamPerformance />} />
            <Route path="/roles" element={<RoleManagement />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/:module" element={<Placeholder />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
