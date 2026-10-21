import { Link } from 'react-router-dom';
import { MapPinned } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center dark:bg-slate-950">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <MapPinned className="mx-auto mb-4 h-10 w-10 text-sky-600" aria-hidden="true" />
        <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">Error 404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">The page you requested does not exist or may have moved.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Go to public map</Link>
          <Link to="/citizen/login" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
