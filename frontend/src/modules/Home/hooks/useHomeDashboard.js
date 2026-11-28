import { useCallback, useEffect, useState } from 'react';
import { fetchHomeDashboard } from '../api';

/** Loads the home dashboard; reload() fetches it again. */
export default function useHomeDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true; // ignore a response that arrives after a newer request or after leaving the page
    fetchHomeDashboard()
      .then((res) => {
        if (!current) return;
        setData(res.data);
        setError(null);
      })
      .catch((err) => {
        if (current) setError(err?.response?.data?.message || 'The data entry status could not be loaded.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { data, loading, error, reload };
}
