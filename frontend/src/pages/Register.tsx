import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setFieldErrors({});
    try { await register(form.username, form.email, form.password); nav('/problems', { replace: true }); }
    catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFieldErrors(err.fieldErrors); }
      else setError('Registration failed');
    }
  };
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto p-8 space-y-4">
      <h1 className="text-xl font-semibold">Register</h1>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <input className="border w-full p-2 rounded" placeholder="username"
        value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
      {fieldErrors.username && <p className="text-red-600 text-xs">{fieldErrors.username}</p>}
      <input className="border w-full p-2 rounded" placeholder="email"
        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      {fieldErrors.email && <p className="text-red-600 text-xs">{fieldErrors.email}</p>}
      <input className="border w-full p-2 rounded" type="password" placeholder="password"
        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      {fieldErrors.password && <p className="text-red-600 text-xs">{fieldErrors.password}</p>}
      <button className="bg-blue-600 text-white w-full p-2 rounded">Register</button>
      <p className="text-sm">Have an account? <Link className="text-blue-600" to="/login">Log in</Link></p>
    </form>
  );
}
