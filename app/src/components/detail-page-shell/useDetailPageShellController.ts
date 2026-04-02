import { useEffect, useState } from 'react';

export function useDetailPageShellController(visible: boolean) {
  const [shouldRender, setShouldRender] = useState(visible);
  const [isAnimating, setIsAnimating] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      setIsAnimating(true);
      return;
    }

    setShouldRender(false);
    setIsAnimating(false);
  }, [visible]);

  return {
    shouldRender,
    isAnimating,
  };
}
