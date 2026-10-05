import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { AlertOctagon, Compass } from 'lucide-react';
import Button from '../ui/Button';

// Router-level error boundary: a crash in any page shows this instead of a
// blank screen, and offers a way back.
export default function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  // A stale lazy chunk after a deploy is the most common real-world crash
  // here; a reload fetches the new build's chunk names.
  const chunkError = /Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    error?.message || '',
  );

  return <ErrorScreen notFound={notFound} chunkError={chunkError} />;
}

export function ErrorScreen({ notFound, chunkError }) {
  const Icon = notFound ? Compass : AlertOctagon;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center dark:bg-zinc-950">
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <Icon className="size-7" />
      </div>
      <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">{notFound ? '404' : 'Error'}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
        {notFound ? 'Page not found' : chunkError ? 'A new version is available' : 'Something went wrong'}
      </h1>
      <p className="mt-3 max-w-md text-zinc-500 dark:text-zinc-400">
        {notFound
          ? "The page you're looking for doesn't exist or has moved."
          : chunkError
            ? 'DiagramForge was updated while this tab was open. Reload to get the latest version.'
            : 'An unexpected error occurred. Reloading usually fixes it.'}
      </p>
      <div className="mt-8 flex gap-3">
        <Button variant="secondary" to="/">
          Go home
        </Button>
        {!notFound && <Button onClick={() => window.location.reload()}>Reload page</Button>}
      </div>
    </div>
  );
}
