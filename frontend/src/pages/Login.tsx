import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { formErrorMessage } from '../components/ErrorState';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Container from '../components/ui/Container';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const labelCls = 'block text-sm font-medium text-fg-secondary';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [form, setForm] = useState({ usernameOrEmail: '', password: '' });
  const [error, setError] = useState('');
  const from = sp.get('from');
  useDocumentTitle('Log in');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await login(form.usernameOrEmail, form.password); nav(from || '/problems', { replace: true }); }
    catch (err) { setError(formErrorMessage(err)); }
  };
  return (
    <Container size="narrow" className="py-12">
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <h1 className="text-xl">Log in</h1>
          {from && !error && (
            <p className="rounded-md border border-info/40 bg-info-subtle p-3 text-sm text-info-fg">
              Please log in to continue — your session isn’t active.
            </p>
          )}
          {error && <p role="alert" id="login-error" className="text-sm text-error-fg">{error}</p>}
          <div className="space-y-1">
            <label htmlFor="login-username" className={labelCls}>Username or email</label>
            <Input id="login-username" type="text" autoComplete="username" placeholder="username or email"
              aria-describedby={error ? 'login-error' : undefined} aria-invalid={error ? true : undefined}
              value={form.usernameOrEmail} onChange={e => setForm({ ...form, usernameOrEmail: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label htmlFor="login-password" className={labelCls}>Password</label>
            <Input id="login-password" type="password" autoComplete="current-password" placeholder="password"
              aria-describedby={error ? 'login-error' : undefined} aria-invalid={error ? true : undefined}
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <Button type="submit" className="w-full">Log in</Button>
        </form>
        <p className="mt-4 text-sm text-fg-secondary">No account? <Link className="text-accent hover:underline" to="/register">Register</Link></p>
      </Card>
    </Container>
  );
}
