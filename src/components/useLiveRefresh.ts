import { useEffect, useRef } from 'react';

const REFRESH_INTERVAL_MS = 15_000;

// Changes made by other players reach an open page within the interval. A page
// nobody is looking at stays quiet and catches up when they come back.
export const useLiveRefresh = (refresh: () => void) => {
  const latest = useRef(refresh);

  latest.current = refresh;

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        latest.current();
      }
    };
    const timer = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, []);
};
