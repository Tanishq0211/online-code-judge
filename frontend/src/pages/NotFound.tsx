import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto p-6" data-testid="page">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2"><Link className="text-blue-600" to="/problems">← Back to problems</Link></p>
    </div>
  );
}
