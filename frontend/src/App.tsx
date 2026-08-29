import { Routes, Route, Navigate } from 'react-router-dom';

const Stub = ({ name }: { name: string }) => <div data-testid="page">{name}</div>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/problems" replace />} />
      <Route path="/login" element={<Stub name="login" />} />
      <Route path="/register" element={<Stub name="register" />} />
      <Route path="/problems" element={<Stub name="problems" />} />
      <Route path="/problems/:slug" element={<Stub name="problem" />} />
      <Route path="/submissions" element={<Stub name="submissions" />} />
      <Route path="/submissions/:id" element={<Stub name="submission" />} />
      <Route path="*" element={<Stub name="notfound" />} />
    </Routes>
  );
}
