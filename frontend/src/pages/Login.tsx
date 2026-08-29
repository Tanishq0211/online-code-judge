import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await login(form.usernameOrEmail, form.password); nav(sp.get('from') || '/problems', { replace: true }); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Login failed'); }
  };
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">Log in</h1>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <input className="border w-full p-2 rounded" placeholder="username or email"
        value={form.usernameOrEmail} onChange={e => setForm({ ...form, usernameOrEmail: e.target.value })} />
      <input className="border w-full p-2 rounded" type="password" placeholder="password"
        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <button className="bg-blue-600 text-white w-full p-2 rounded">Log in</button>
      <p className="text-sm">No account? <Link className="text-blue-600" to="/register">Register</Link></p>
    </form>
  );
}
