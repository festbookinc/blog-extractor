import { BlogAdapter } from './base';
import { NaverAdapter } from './naver';
import { TistoryAdapter } from './tistory';
import { BrunchAdapter } from './brunch';

/**
 * URL에 맞는 어댑터를 찾아 반환
 */
export function getAdapter(url: string): BlogAdapter | null {
  const adapters: BlogAdapter[] = [
    new NaverAdapter(),
    new TistoryAdapter(),
    new BrunchAdapter(),
  ];

  for (const adapter of adapters) {
    if (adapter.detect(url)) {
      return adapter;
    }
  }

  return null;
}

/**
 * 모든 어댑터 정리 (브라우저 인스턴스 종료 등)
 */
export async function cleanupAdapters(adapter: BlogAdapter | null): Promise<void> {
  if (!adapter) return;

  // 각 어댑터가 close 메서드를 가지고 있으면 호출
  if ('close' in adapter && typeof (adapter as any).close === 'function') {
    await (adapter as any).close();
  }
}
