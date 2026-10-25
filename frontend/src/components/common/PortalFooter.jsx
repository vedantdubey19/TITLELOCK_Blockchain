import { Link } from 'react-router-dom';

export default function PortalFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 dark:border-white/10 px-4 py-5 text-center text-xs text-slate-500 dark:text-slate-400 sm:flex sm:items-center sm:justify-between sm:text-left">
      <p>© {new Date().getFullYear()} TitleLock. Land records assistance.</p>
      <div className="mt-2 flex justify-center gap-4 sm:mt-0">
        <a href="tel:1800111848" className="hover:text-sky-700 dark:hover:text-sky-300">1800-111-848</a>
        <a href="mailto:support@titlelock.in" className="hover:text-sky-700 dark:hover:text-sky-300">Email support</a>
        <Link to="/" className="hover:text-sky-700 dark:hover:text-sky-300">Public map</Link>
      </div>
    </footer>
  );
}
