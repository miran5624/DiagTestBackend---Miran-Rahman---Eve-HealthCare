import { useState } from 'react';
import { Activity } from 'lucide-react';

interface LoginProps {
  setAuth: (val: boolean) => void;
}

export default function Login({ setAuth }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('smoke-test@example.com'); // default for quick demo
  const [password, setPassword] = useState('Password123');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        let errMsg = data.error?.message || 'Authentication failed';
        if (data.error?.details) {
          const firstDetail = Object.values(data.error.details).find((v: any) => v._errors?.length);
          if (firstDetail) errMsg = (firstDetail as any)._errors[0];
        }
        throw new Error(errMsg);
      }

      localStorage.setItem('token', data.token);
      setAuth(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Activity size={48} color="#10B981" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Sign in to manage your bookings' : 'Join EVE Healthcare today'}</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="John Doe"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            {loading ? <div className="spinner"></div> : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontWeight: 600, cursor: 'pointer' }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
