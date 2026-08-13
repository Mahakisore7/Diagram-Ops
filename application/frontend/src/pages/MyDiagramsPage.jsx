import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import DiagramCard from '../components/DiagramCard';

export default function MyDiagramsPage() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    client
      .get(`/api/diagrams?page=${page}&limit=20`)
      .then((res) => {
        setData(res.data.data);
        setPagination(res.data.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">My diagrams</h1>
        <Link to="/" className="text-sm font-medium text-slate-900 underline">
          + New diagram
        </Link>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && data.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          No diagrams yet.{' '}
          <Link to="/" className="underline">
            Generate your first one
          </Link>
          .
        </p>
      )}

      <div className="mt-6 space-y-3">
        {data.map((diagram) => (
          <DiagramCard key={diagram._id} diagram={diagram} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-slate-600 hover:text-slate-900 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-slate-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="text-slate-600 hover:text-slate-900 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
