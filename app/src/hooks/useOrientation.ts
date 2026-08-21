import { useEffect, useState } from 'react';

export function useOrientation(): 'portrait' | 'landscape' {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);

  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return portrait ? 'portrait' : 'landscape';
}
