import { useEffect, useState } from 'react';

const DETAIL_PAGE_SHELL_EXIT_DURATION_MS = 300;

export function useDetailPageShellController(visible: boolean) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
      return;
    }

    setIsAnimating(false);
    const timer = setTimeout(() => setShouldRender(false), DETAIL_PAGE_SHELL_EXIT_DURATION_MS);

    return () => clearTimeout(timer);
  }, [visible]);

  return {
    shouldRender,
    isAnimating,
  };
}
