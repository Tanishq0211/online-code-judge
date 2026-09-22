import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';
import { formErrorMessage } from '../components/ErrorState';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Container from '../components/ui/Container';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const labelCls = 'block text-sm font-medium text-fg-secondary';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  useDocumentTitle('Register');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setFieldErrors({});
    try { await register(form.username, form.email, form.password); nav('/problems', { replace: true }); }
    catch (err) {
      setError(formErrorMessage(err));
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors);
    }
  };
  const field = (
    id: string, label: string, autoComplete: string,
    value: string, onChange: (v: string) => void,
    fieldError?: string,
  ) => (
    <div className="space-y-1">
      <label htmlFor={id} className={labelCls}>{label}</label>
      <Input id={id} type={id === 'register-password' ? 'password' : 'text'} autoComplete={autoComplete}
        placeholder={label.toLowerCase()}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? `${id}-error` : undefined}
        value={value} onChange={e => onChange(e.target.value)} />
      {fieldError && <p id={`${id}-error`} role="alert" className="text-xs text-error-fg">{fieldError}</p>}
    </div>
  );
  return (
    <Container size="narrow" className="py-12">
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <h1 className="text-xl">Register</h1>
          {error && <p role="alert" id="register-error" className="text-sm text-error-fg">{error}</p>}
          {field('register-username', 'Username', 'username',
            form.username, v => setForm({ ...form, username: v }), fieldErrors.username)}
          {field('register-email', 'Email', 'email',
            form.email, v => setForm({ ...form, email: v }), fieldErrors.email)}
          {field('register-password', 'Password', 'new-password',
            form.password, v => setForm({ ...form, password: v }), fieldErrors.password)}
          <Button type="submit" className="w-full">Register</Button>
        </form>
        <p className="mt-4 text-sm text-fg-secondary">Have an account? <Link className="text-accent hover:underline" to="/login">Log in</Link></p>
      </Card>
    </Container>
  );
}
