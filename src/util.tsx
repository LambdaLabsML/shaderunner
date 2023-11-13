import { useState } from 'react';

export default function useSessionStorage(key, initialValue) {
  const [item, setInnerValue] = useState(() => {
    try {
      return window.sessionStorage.getItem(key)
        ? JSON.parse(window.sessionStorage.getItem(key))
        : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      setInnerValue(value);
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.log(e);
    }
  };

  return [item, setValue];
}

export { useSessionStorage };