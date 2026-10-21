import { useCallback, useEffect, useState } from 'react';
import { activityApi } from '../services/saleService';

export function useApiResource(path) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    activityApi(path).then((data) => {
      if (active) setState({ path, revision, data, loading: false, error: '' });
    }).catch((error) => {
      if (active) setState({ path, revision, data: null, loading: false, error: error.message });
    });
    return () => { active = false; };
  }, [path, revision]);
  return state.path === path && state.revision === revision
    ? { ...state, refresh } : { data: null, loading: true, error: '', refresh };
}
