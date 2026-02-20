import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white/95 p-8 text-center shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-slate-600">
          The page you requested does not exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
