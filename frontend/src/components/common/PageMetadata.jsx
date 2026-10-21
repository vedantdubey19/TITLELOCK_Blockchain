import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const titles = [
  [/^\/$/, 'TitleLock | Land title verification'],
  [/^\/citizen\/login$/, 'Citizen sign in | TitleLock'],
  [/^\/registrar\/login$/, 'Registrar sign in | TitleLock'],
  [/^\/citizen\/properties$/, 'My properties | TitleLock'],
  [/^\/citizen\/transactions$/, 'Transactions | TitleLock'],
  [/^\/citizen/, 'Citizen portal | TitleLock'],
  [/^\/registrar/, 'Registrar portal | TitleLock'],
];

export default function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = (titles.find(([pattern]) => pattern.test(pathname)) || [null, 'Page not found | TitleLock'])[1];
  }, [pathname]);
  return null;
}
