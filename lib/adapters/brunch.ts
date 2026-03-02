import { BlogAdapter } from './base';
import { BlogPost } from '../types';
import { fetchWithRetry } from '../utils/fetcher';
import { extractMainContent } from '../utils/content-cleaner';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { chromium, Browser } from 'playwright';

const parser = new Parser();

export class BrunchAdapter implements BlogAdapter {
  private browser: Browser | null = null;

  detect(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('brunch.co.kr');
    } catch {
      return false;
    }
  }

  async getFeedUrls(url: string): Promise<string[]> {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      
      // Brunch RSS 피드 URL 패턴
      const feedUrls = [
        `${baseUrl}/rss`,
        `${baseUrl}/feed`,
        `${baseUrl}/atom.xml`,
      ];

      // 사용자별 피드 URL 추출 시도
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        const username = pathParts[0];
        feedUrls.push(`${baseUrl}/@${username}/rss`);
        feedUrls.push(`${baseUrl}/@${username}/feed`);
      }

      return feedUrls;
    } catch {
      return [];
    }
  }

  async listPostUrls(url: string, count: number): Promise<string[]> {
    try {
      // RSS 피드 우선 시도
      const feedUrls = await this.getFeedUrls(url);
      for (const feedUrl of feedUrls) {
        try {
          const feed = await parser.parseURL(feedUrl);
          if (feed.items && feed.items.length > 0) {
            return feed.items.slice(0, count).map(item => item.link || '').filter(Boolean);
          }
        } catch {
          // RSS 실패 시 다음 방법 시도
        }
      }

      // RSS 실패 시 Playwright 사용 (Vercel 환경에서는 사용 불가)
      if (process.env.VERCEL === '1') {
        console.log('[BrunchAdapter] Vercel 환경에서는 Playwright를 사용할 수 없습니다. RSS 피드만 사용 가능합니다.');
        return [];
      }
      return await this.listPostUrlsWithPlaywright(url, count);
    } catch (error) {
      console.error('Brunch 포스트 목록 가져오기 실패:', error);
      return [];
    }
  }

  private async listPostUrlsWithPlaywright(url: string, count: number): Promise<string[]> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }

    const page = await this.browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      
      // 포스트 링크 추출
      const postLinks = await page.evaluate((maxCount) => {
        const links: string[] = [];
        const selectors = [
          'a[href*="/@"]',
          '.article-item a',
          '.post-item a',
          'article a',
          '.listArticle a',
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of Array.from(elements)) {
            const href = (el as HTMLAnchorElement).href;
            if (href && href.includes('/@') && href.match(/\/@[\w]+\/\d+$/) && !links.includes(href)) {
              links.push(href);
              if (links.length >= maxCount) break;
            }
          }
          if (links.length >= maxCount) break;
        }

        return links.slice(0, maxCount);
      }, count);

      return postLinks;
    } finally {
      await page.close();
    }
  }

  async fetchPost(url: string): Promise<BlogPost> {
    try {
      const html = await fetchWithRetry(url).then(r => r.text());
      const $ = cheerio.load(html);

      // 제목 추출
      let title = $('title').text() || '';
      title = title.replace(/\s*:\s*브런치.*$/, '').trim();

      // Brunch 특정 선택자
      const titleSelectors = [
        '.wrapArticleTitle',
        '.articleTitle',
        'h1.articleTitle',
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
        'time',
        '[datetime]',
        '.articleDate',
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

      // 본문 추출 - Readability 우선 사용
      const postContent = extractMainContent(html, url);

      return {
        title: title || '제목 없음',
        url,
        content: postContent,
        date: postDate || undefined,
      };
    } catch (error) {
      console.error('Brunch 포스트 가져오기 실패:', url, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
