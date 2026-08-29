import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Problems from './pages/Problems';
import Problem from './pages/Problem';
import Submission from './pages/Submission';
import Submissions from './pages/Submissions';
import { RequireAuth } from './auth/RequireAuth';

const Stub = ({ name }: { name: string }) => <div data-testid="page">{name}</div>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/problems" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/problems" element={<Problems />} />
      <Route path="/problems/:slug" element={<Problem />} />
      <Route path="/submissions" element={<RequireAuth><Submissions /></RequireAuth>} />
      <Route path="/submissions/:id" element={<RequireAuth><Submission /></RequireAuth>} />
      <Route path="*" element={<Stub name="notfound" />} />
    </Routes>
  );
}
