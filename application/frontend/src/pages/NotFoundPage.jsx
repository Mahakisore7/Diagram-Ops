import { ErrorScreen } from '../components/layout/RouteError';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return <ErrorScreen notFound />;
}
