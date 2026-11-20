const FOCUSABLE = "button, input, select, textarea, a[href]";

/**
 * 按到头的「＋」、选完的答案、「看答案」这些按钮，按完就变灰或者不见了，焦点会掉回页面开头，
 * 用键盘玩的接不下去。这里把焦点交给它后面第一个还能按的东西。
 */
export function keepFocus() {
  const onClick = (event: MouseEvent) => {
    const button = (event.target as Element | null)?.closest?.("button");
    if (!button) return;
    const all = [...document.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const after = all.slice(all.indexOf(button) + 1);
    window.setTimeout(() => {
      if (button.isConnected && !button.disabled) return;
      const active = document.activeElement;
      if (active && active !== document.body && active !== button) return;
      after
        .find((el) => el.isConnected && !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0)
        ?.focus();
    });
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
