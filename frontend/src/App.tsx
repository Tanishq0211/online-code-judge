import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import { RequireAuth } from './auth/RequireAuth';

const Stub = ({ name }: { name: string }) => <div data-testid="page">{name}</div>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/problems" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/problems" element={<Stub name="problems" />} />
      <Route path="/problems/:slug" element={<Stub name="problem" />} />
      <Route path="/submissions" element={<RequireAuth><Stub name="submissions" /></RequireAuth>} />
      <Route path="/submissions/:id" element={<RequireAuth><Stub name="submission" /></RequireAuth>} />
      <Route path="*" element={<Stub name="notfound" />} />
    </Routes>
  );
}
