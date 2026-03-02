/**
 * 재시도 로직이 포함된 fetch 래퍼
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2,
  timeout: number = 15000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // 4xx 에러는 재시도하지 않음
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // 지수 백오프: 1초, 2초, 4초...
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error('알 수 없는 오류가 발생했습니다.');
}

/**
 * 동시성 제한이 있는 병렬 fetch
 */
export async function fetchConcurrent<T, R>(
  items: T[],
  fetchFn: (item: T, index: number) => Promise<R>,
  concurrency: number = 3
): Promise<R[]> {
  const results: R[] = [];
  const executing: Set<Promise<void>> = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const index = i;
    
    const promise = fetchFn(item, index)
      .then(result => {
        results.push(result);
      })
      .catch(error => {
        console.error(`항목 ${index + 1}/${items.length} 처리 실패:`, error);
        // 에러가 발생해도 계속 진행
      })
      .finally(() => {
        // 완료되면 Set에서 제거
        executing.delete(promise);
      });

    executing.add(promise);

    // 동시성 제한에 도달하면 하나가 완료될 때까지 대기
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  // 남은 모든 작업이 완료될 때까지 대기
  await Promise.all(executing);
  return results;
}
