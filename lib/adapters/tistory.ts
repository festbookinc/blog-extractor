import { BlogAdapter } from './base';
import { BlogPost } from '../types';
import { fetchWithRetry } from '../utils/fetcher';
import { extractMainContent } from '../utils/content-cleaner';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

const parser = new Parser({ timeout: 5000 });

export class TistoryAdapter implements BlogAdapter {
  detect(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('tistory.com') ||
             urlObj.hostname.includes('daum.net');
    } catch {
      return false;
    }
  }

  async getFeedUrls(url: string): Promise<string[]> {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      return [
        `${baseUrl}/rss`,
        `${baseUrl}/feed`,
        `${baseUrl}/atom.xml`,
        `${baseUrl}/feed.xml`,
        `${baseUrl}/rss.xml`,
        `${baseUrl}/index.xml`,
      ];
    } catch {
      return [];
    }
  }

  async listPostUrls(url: string, count: number): Promise<string[]> {
    try {
      // RSS 피드 우선 시도
      const feedUrls = await this.getFeedUrls(url);
      console.log(`[TistoryAdapter] RSS 피드 URL 시도:`, feedUrls);

      for (const feedUrl of feedUrls) {
        try {
          console.log(`[TistoryAdapter] RSS 피드 시도: ${feedUrl}`);
          const feed = await parser.parseURL(feedUrl);
          if (feed.items && feed.items.length > 0) {
            const links = feed.items.slice(0, count).map(item => item.link || '').filter(Boolean);
            console.log(`[TistoryAdapter] RSS에서 ${links.length}개 포스트 발견`);
            return links;
          }
        } catch (error) {
          console.log(`[TistoryAdapter] RSS 피드 실패: ${feedUrl}`, error instanceof Error ? error.message : error);
        }
      }

      // RSS 실패 시 페이지네이션 크롤링
      console.log(`[TistoryAdapter] RSS 실패, 페이지네이션 크롤링 사용`);
      return await this.listPostUrlsWithPagination(url, count);
    } catch (error) {
      console.error('[TistoryAdapter] 포스트 목록 가져오기 실패:', error);
      return [];
    }
  }

  private extractPostLinksFromHtml(html: string, baseHost: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      // 상대 경로를 절대 경로로 변환
      let fullUrl: string;
      try {
        fullUrl = new URL(href, `https://${baseHost}`).href;
      } catch {
        return;
      }

      if (seen.has(fullUrl)) return;

      // Tistory 포스트 URL 패턴 확인
      if (
        fullUrl.includes('/entry/') ||
        fullUrl.includes('/post/') ||
        (fullUrl.includes(baseHost) && /\/\d+$/.test(fullUrl))
      ) {
        links.push(fullUrl);
        seen.add(fullUrl);
      }
    });

    return links;
  }

  private async listPostUrlsWithPagination(url: string, count: number): Promise<string[]> {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const baseHost = urlObj.host;

    const allLinks: string[] = [];
    const seen = new Set<string>();
    let page = 1;
    let noProgressCount = 0;

    console.log(`[TistoryAdapter] 페이지네이션 크롤링 시작: ${baseUrl}`);

    while (allLinks.length < count) {
      const pageUrl = `${baseUrl}/?page=${page}`;
      console.log(`[TistoryAdapter] 페이지 ${page} 요청: ${pageUrl}`);

      try {
        const response = await fetchWithRetry(pageUrl);
        const html = await response.text();
        const links = this.extractPostLinksFromHtml(html, baseHost);

        // 새로운 링크만 추가
        let newCount = 0;
        for (const link of links) {
          if (!seen.has(link)) {
            seen.add(link);
            allLinks.push(link);
            newCount++;
            if (allLinks.length >= count) break;
          }
        }

        console.log(`[TistoryAdapter] 페이지 ${page}: ${links.length}개 발견, 신규 ${newCount}개 (누적: ${allLinks.length}개)`);

        if (newCount === 0) {
          noProgressCount++;
          if (noProgressCount >= 2) {
            console.log(`[TistoryAdapter] 더 이상 새 포스트 없음, 중단`);
            break;
          }
        } else {
          noProgressCount = 0;
        }
      } catch (error) {
        console.log(`[TistoryAdapter] 페이지 ${page} 요청 실패:`, error instanceof Error ? error.message : error);
        break;
      }

      page++;
    }

    console.log(`[TistoryAdapter] 최종 ${allLinks.length}개 포스트 URL 반환`);
    return allLinks.slice(0, count);
  }

  async fetchPost(url: string): Promise<BlogPost> {
    try {
      const html = await fetchWithRetry(url).then(r => r.text());
      const $ = cheerio.load(html);

      // 제목 추출
      let title = $('title').text() || '';
      title = title.replace(/\s*:\s*티스토리.*$/, '').trim();

      const titleSelectors = [
        '.entry-title',
        '.post-title',
        'h1.entry-title',
        'h1.post-title',
        'article h1',
        '.title',
      ];

      for (const selector of titleSelectors) {
        const titleEl = $(selector).first();
        if (titleEl.length > 0) {
          const titleText = titleEl.text().trim();
          if (titleText) {
            title = titleText;
            break;
          }
        }
      }

      // 날짜 추출
      let postDate = '';
      const dateSelectors = [
        '.date',
        '.published',
        '.entry-date',
        '.post-date',
        'time',
        '[datetime]',
      ];

      for (const selector of dateSelectors) {
        const dateEl = $(selector).first();
        if (dateEl.length > 0) {
          const dateText = dateEl.attr('datetime') || dateEl.text().trim();
          if (dateText) {
            postDate = dateText;
            break;
          }
        }
      }

      const postContent = extractMainContent(html, url);

      return {
        title: title || '제목 없음',
        url,
        content: postContent,
        date: postDate || undefined,
      };
    } catch (error) {
      console.error('Tistory 포스트 가져오기 실패:', url, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Playwright 제거로 정리할 리소스 없음
  }
}
