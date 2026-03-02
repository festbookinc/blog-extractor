import robotsParser from 'robots-parser';

/**
 * robots.txt를 확인하여 크롤링이 허용되는지 검사
 */
export async function checkRobotsTxt(url: string, userAgent: string = 'BlogExtractor/1.0'): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
    
    const response = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // robots.txt가 없으면 허용된 것으로 간주
      return true;
    }

    const robotsText = await response.text();
    const robots = robotsParser(robotsUrl, robotsText);
    
    return robots.isAllowed(url, userAgent) ?? true;
  } catch (error) {
    // 에러 발생 시 허용된 것으로 간주 (RSS만 사용)
    console.warn('robots.txt 확인 실패:', error);
    return false;
  }
}
