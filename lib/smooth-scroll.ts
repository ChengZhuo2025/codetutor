/** 固定导航栏高度，与 LandingNav 的 NAV_HEIGHT 保持一致 */
const NAV_OFFSET = 60;

/**
 * 平滑滚动到目标元素的指定偏移位置，时长约 600ms，缓入缓出。
 * 兼容 Chrome / Safari / Edge / Firefox。
 */
export function smoothScrollTo(
  targetElement: HTMLElement,
  duration = 600,
  offset = NAV_OFFSET,
): void {
  const startPosition = window.scrollY || document.documentElement.scrollTop;
  const targetPosition =
    targetElement.getBoundingClientRect().top + window.scrollY - offset;
  const distance = targetPosition - startPosition;

  if (Math.abs(distance) < 1) return;

  let startTime: number | null = null;

  function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function step(currentTime: number) {
    if (startTime === null) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutQuad(progress);

    window.scrollTo(0, startPosition + distance * eased);

    if (elapsed < duration) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

/**
 * 根据 hash 选择器（如 "#how"）平滑滚动到对应元素，自动扣除导航栏偏移。
 * 若元素不存在则静默跳过。
 */
export function smoothScrollToHash(
  hash: string,
  duration?: number,
  offset?: number,
): void {
  if (!hash.startsWith("#")) return;
  const el = document.querySelector(hash) as HTMLElement | null;
  if (el) smoothScrollTo(el, duration, offset);
}
