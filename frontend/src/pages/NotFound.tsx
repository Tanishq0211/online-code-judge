import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import Container from '../components/ui/Container';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <Container size="prose" className="py-16" data-testid="page">
      <h1 className="text-2xl">Page not found</h1>
      <p className="mt-3"><Link className="text-accent hover:underline" to="/problems">← Back to problems</Link></p>
    </Container>
  );
}
