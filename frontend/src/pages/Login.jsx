import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './login.css';

export default function Login() {
  const { user, login } = useAuth();
  const [values, setValues] = useState({ email: 'admin@studentschoice.in', password: 'admin123' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await login(values); }
    catch (err) { setError(err.response?.data?.error || 'Unable to sign in. Please check your credentials.'); }
    finally { setBusy(false); }
  };

  return <main className="login-page">
    <section className="login-showcase">
      <div className="showcase-brand"><span>&#10022;</span><div>student's choice<small>CONSULTANCY</small></div></div>
      <div className="showcase-copy"><span className="eyebrow">STUDENT LOAN CRM</span><h1>Everything your<br />team needs, <em>together.</em></h1><p>Manage leads, calls, documents and every loan journey from one secure workspace.</p></div>
      <div className="showcase-stats"><div><b>1,200+</b><span>Active leads</span></div><div><b>98%</b><span>Team visibility</span></div><div><b>24/7</b><span>Secure access</span></div></div>
      <div className="orb orb-one" /><div className="orb orb-two" />
    </section>
    <section className="login-panel"><form onSubmit={submit} className="login-form">
      <div className="mobile-brand">&#10022; <span>student's choice<small>CONSULTANCY</small></span></div>
      <span className="form-kicker">WELCOME BACK</span><h2>Sign in to CRM</h2><p>Enter your account details to continue.</p>
      <label>Email address<input type="email" autoComplete="email" value={values.email} onChange={e => setValues({ ...values, email: e.target.value })} required /></label>
      <label>Password<div className="password-input"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={values.password} onChange={e => setValues({ ...values, password: e.target.value })} required /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
      {error && <div className="error">{error}</div>}<button className="login-submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in securely ->'}</button>
      <div className="secure-note">&#10547; Your session is protected with secure access controls.</div>
    </form></section>
  </main>;
}
