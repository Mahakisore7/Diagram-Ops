import { Link } from 'react-router-dom';

export default function DiagramCard({ diagram }) {
  const created = new Date(diagram.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      to={`/diagrams/${diagram._id}`}
      className="block rounded-md border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">{diagram.title}</h3>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{diagram.diagramType}</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">{created}</p>
    </Link>
  );
}
