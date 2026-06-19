import { useEffect, useState } from 'react';
import { SUPABASE_URL } from '~utils/constants';
import { getSupabase } from '~lib/supabase';
import type { SyncStatus } from '~lib/types';
import './style.css';

const TEST_MODE = SUPABASE_URL === 'YOUR_SUPABASE_URL';

function Popup() {
  const [status, setStatus] = useState<SyncStatus>({ lastSyncedAt: null, status: 'idle' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(TEST_MODE);
  const [authLoading, setAuthLoading] = useState(!TEST_MODE);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      if (res) setStatus(res);
    });

    if (!TEST_MODE) {
      const supabase = getSupabase();
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsLoggedIn(!!user);
        setAuthLoading(false);
      });
    }
  }, []);

  const handleSignUp = async () => {
    setAuthError('');
    setAuthLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
    } else {
      setIsLoggedIn(true);
    }
    setAuthLoading(false);
  };

  const handleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
    } else {
      setIsLoggedIn(true);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    if (!TEST_MODE) {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
  };

  const handleSync = () => {
    setStatus({ ...status, status: 'syncing', message: 'Starting sync...' });
    chrome.runtime.sendMessage({ type: 'START_SYNC' }, () => {
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, setStatus);
      }, 2000);
    });
  };

  const handleLoginToUMS = () => {
    setStatus({ ...status, status: 'syncing', message: 'Opening UMS login...' });
    chrome.runtime.sendMessage({ type: 'START_LOGIN' }, () => {
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, setStatus);
      }, 3000);
    });
  };

  if (authLoading) {
    return <div className="popup"><p className="loading">Loading...</p></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="popup">
        <h1>UMS Data Sync</h1>
        <p className="subtitle">Sign in to sync your academic data</p>

        <div className="form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {authError && <p className="error">{authError}</p>}
          <button onClick={handleLogin} className="btn-primary">Log In</button>
          <button onClick={handleSignUp} className="btn-secondary">Sign Up</button>
        </div>
      </div>
    );
  }

  return (
    <div className="popup">
      <h1>UMS Data Sync</h1>
      {TEST_MODE && <p className="test-badge">TEST MODE — check service worker console</p>}

      <div className="status-card">
        <div className={`status-indicator ${status.status}`} />
        <div className="status-text">
          <p className="status-label">
            {status.status === 'idle' && 'Ready to sync'}
            {status.status === 'syncing' && 'Syncing...'}
            {status.status === 'success' && 'Synced'}
            {status.status === 'error' && 'Error'}
            {status.status === 'needs_login' && 'Login required'}
          </p>
          {status.message && <p className="status-message">{status.message}</p>}
          {status.lastSyncedAt && (
            <p className="status-time">
              Last: {new Date(status.lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <div className="actions">
        {status.status === 'needs_login' ? (
          <button onClick={handleLoginToUMS} className="btn-primary">
            Log in to UMS
          </button>
        ) : (
          <button
            onClick={handleSync}
            className="btn-primary"
            disabled={status.status === 'syncing'}
          >
            {status.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
        {TEST_MODE && status.status === 'success' && (
          <button
            onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('tabs/data-viewer.html') })}
            className="btn-secondary"
          >
            View Data
          </button>
        )}
        {!TEST_MODE && <button onClick={handleLogout} className="btn-secondary">Sign Out</button>}
      </div>
    </div>
  );
}

export default Popup;
