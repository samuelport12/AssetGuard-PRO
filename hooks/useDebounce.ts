import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value by a given delay.
 * The returned value only updates after the caller stops changing `value`
 * for at least `delay` milliseconds.
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
