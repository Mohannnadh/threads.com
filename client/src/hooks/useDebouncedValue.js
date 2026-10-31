import { useEffect, useState } from 'react';

// Returns `value` once it has stopped changing for `delay` ms.
// Used so search boxes don't fire a request on every keystroke.
const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebouncedValue;
