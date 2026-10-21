import React from 'react';
import { useAuth } from '../api/AuthContext.jsx';
import { roleLabel } from '../utils.js';

// Credits and the "Buy credits" tab are hidden for now.
export default function Profile() {
  const { user } = useAuth();

  return (
    <>
      <div className="page-header">
        <div><h1>Profile</h1><div className="sub">Manage your account</div></div>
      </div>
      <div className="card">
        <table className="data-table">
          <tbody>
            <tr><th>Name</th><td>{user.name}</td></tr>
            <tr><th>Role</th><td>{roleLabel(user.role)}</td></tr>
            <tr><th>Phone</th><td>{user.phone || '—'}</td></tr>
            <tr><th>Email</th><td>{user.email || '—'}</td></tr>
            <tr><th>Member since</th><td>{user.created_at}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
