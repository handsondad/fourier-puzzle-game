import { useEffect, useState } from "react";

export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      const saved = JSON.parse(raw) as T;
      // 存的东西坏了（比如成了 null 或别的类型），就当没存过，不然首页会白屏
      return saved !== null && typeof saved === typeof initial ? saved : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 隐私模式下存不了，就只在这一次打开里记着
    }
  }, [key, value]);

  return [value, setValue] as const;
}
