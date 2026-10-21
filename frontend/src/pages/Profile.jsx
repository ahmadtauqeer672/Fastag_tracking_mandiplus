import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Api } from '../api/client.js';
import { useAuth } from '../api/AuthContext.jsx';
import { ErrorBanner, Spinner, SuccessBanner } from '../components/Common.jsx';

const PACKAGES = [
  { amount: 100, credits: 100 },
  { amount: 500, credits: 550, bonus: true },
  { amount: 1000, credits: 1200, bonus: true },
];
const METHODS = ['UPI', 'Card', 'Net Banking'];

export default function Profile() {
  const { user, updateCredits } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'credits' ? 'credits' : 'account';

  const [selectedPackage, setSelectedPackage] = useState(500);
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const [paying, setPaying] = useState(false);
  const [payResult, setPayResult] = useState(null);
  const [payError, setPayError] = useState('');

  function setTab(t) {
    setSearchParams(t === 'credits' ? { tab: 'credits' } : {});
  }

  async function onPay() {
    setPaying(true);
    setPayError('');
    setPayResult(null);
    try {
      const result = await Api.buyCredits({ amount: selectedPackage, method: selectedMethod });
      if (result.status === 'success') {
        updateCredits(result.credits_balance);
        setPayResult(`✓ Payment successful. ${result.credits_purchased} credits added. New balance: ${result.credits_balance}.`);
      } else {
        setPayError('Payment failed. Please try again.');
      }
    } catch (err) {
      setPayError(err.message);
    }
    setPaying(false);
  }

  return (
    <>
      <div className="page-header">
        <div><h1>Profile</h1><div className="sub">Manage your account and credits</div></div>
      </div>
      <div className="tab-strip">
        <div className={`tab ${tab === 'account' ? 'active' : ''}`} onClick={() => setTab('account')}>Account</div>
        <div className={`tab ${tab === 'credits' ? 'active' : ''}`} onClick={() => setTab('credits')}>Buy credits</div>
      </div>

      {tab === 'account' ? (
        <div className="card">
          <table className="data-table">
            <tbody>
              <tr><th>Name</th><td>{user.name}</td></tr>
              <tr><th>Role</th><td style={{ textTransform: 'capitalize' }}>{user.role}</td></tr>
              <tr><th>Phone</th><td>{user.phone || '—'}</td></tr>
              <tr><th>Email</th><td>{user.email || '—'}</td></tr>
              <tr><th>Credit balance</th><td>💳 {user.credits}</td></tr>
              <tr><th>Member since</th><td>{user.created_at}</td></tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13.5 }}>Select a package</div>
          <div className="package-grid">
            {PACKAGES.map((p) => (
              <div
                key={p.amount}
                className={`package-card ${selectedPackage === p.amount ? 'selected' : ''}`}
                onClick={() => setSelectedPackage(p.amount)}
              >
                {p.bonus && <div className="bonus">BONUS</div>}
                <div className="amount">₹{p.amount}</div>
                <div className="credits">{p.credits} credits</div>
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13.5 }}>Payment method</div>
          <div className="method-grid">
            {METHODS.map((m) => (
              <div
                key={m}
                className={`method-chip ${selectedMethod === m ? 'active' : ''}`}
                onClick={() => setSelectedMethod(m)}
              >
                {m}
              </div>
            ))}
          </div>
          <SuccessBanner message={payResult} />
          <ErrorBanner message={payError} />
          <button className="btn btn-primary btn-block" onClick={onPay} disabled={paying}>
            {paying ? <Spinner /> : 'Pay Now'}
          </button>
        </div>
      )}
    </>
  );
}
