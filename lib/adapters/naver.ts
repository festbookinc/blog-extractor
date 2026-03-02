import { BlogAdapter } from './base';
import { BlogPost, FeedItem } from '../types';
import { fetchWithRetry, fetchConcurrent } from '../utils/fetcher';
import { extractMainContent } from '../utils/content-cleaner';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { chromium, Browser } from 'playwright';

const parser = new Parser();

export class NaverAdapter implements BlogAdapter {
  private browser: Browser | null = null;

  detect(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('blog.naver.com') || urlObj.hostname.includes('m.blog.naver.com');
    } catch {
      return false;
    }
  }

  async getFeedUrls(url: string): Promise<string[]> {
    try {
      const urlObj = new URL(url);
      const blogId = this.extractBlogId(url);
      if (!blogId) return [];

      // Naver Blog RSS 피드 URL 패턴
      const feedUrls = [
        `https://rss.blog.naver.com/${blogId}.xml`,
        `https://blog.naver.com/${blogId}.do?Redirect=Log&logNo=`,
      ];

      return feedUrls;
    } catch {
      return [];
    }
  }

  async listPostUrls(url: string, count: number): Promise<string[]> {
    try {
      // m.blog.naver.com으로 변환 시도 (더 간단한 DOM 구조)
      let targetUrl = url;
      try {
        const urlObj = new URL(url);
        if (!urlObj.hostname.includes('m.blog.naver.com')) {
          targetUrl = url.replace('blog.naver.com', 'm.blog.naver.com');
        }
      } catch {
        // URL 변환 실패 시 원본 사용
      }

      // RSS 피드 우선 시도
      const feedUrls = await this.getFeedUrls(targetUrl);
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
        console.log('[NaverAdapter] Vercel 환경에서는 Playwright를 사용할 수 없습니다. RSS 피드만 사용 가능합니다.');
        return [];
      }
      return await this.listPostUrlsWithPlaywright(targetUrl, count);
    } catch (error) {
      console.error('Naver 포스트 목록 가져오기 실패:', error);
      return [];
    }
  }

  private async listPostUrlsWithPlaywright(url: string, count: number): Promise<string[]> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }

    const page = await this.browser.newPage();
    try {
      // 이미 m.blog.naver.com으로 변환되어 있을 수 있음
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      
      // 포스트 링크 추출
      const postLinks = await page.evaluate((maxCount) => {
        const links: string[] = [];
        const selectors = [
          'a[href*="/PostView.naver"]',
          'a[href*="/PostList.naver"]',
          '.post-item a',
          '.post-list a',
          'article a',
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of Array.from(elements)) {
            const href = (el as HTMLAnchorElement).href;
            if (href && href.includes('/PostView.naver') && !links.includes(href)) {
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
      // Naver Blog는 iframe 내부에 실제 콘텐츠가 있음
      const html = await fetchWithRetry(url).then(r => r.text());
      const $ = cheerio.load(html);

      // 제목 추출
      let title = $('title').text() || '';
      title = title.replace(/\s*:\s*네이버 블로그.*$/, '').trim();

      // iframe 찾기
      const iframe = $('#mainFrame');
      let postContent = '';
      let postDate = '';

      if (iframe.length > 0) {
        const iframeSrc = iframe.attr('src');
        if (iframeSrc) {
          // iframe URL 해석
          let iframeUrl = iframeSrc;
          try {
            // 절대 URL인 경우 그대로 사용
            if (iframeUrl.startsWith('http://') || iframeUrl.startsWith('https://')) {
              // 이미 절대 URL
            } else if (iframeUrl.startsWith('//')) {
              // 프로토콜 상대 URL
              iframeUrl = 'https:' + iframeUrl;
            } else if (iframeUrl.startsWith('/')) {
              // 루트 상대 URL
              const urlObj = new URL(url);
              iframeUrl = `${urlObj.protocol}//${urlObj.host}${iframeUrl}`;
            } else {
              // 상대 URL
              const urlObj = new URL(url);
              const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
              const base = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
              iframeUrl = new URL(iframeUrl, base).href;
            }
          } catch (error) {
            console.warn('iframe URL 해석 실패:', iframeSrc, error);
            // URL 해석 실패 시 원본 URL 사용
          }

          // iframe 내용 가져오기
          const iframeHtml = await fetchWithRetry(iframeUrl).then(r => r.text());
          const $iframe = cheerio.load(iframeHtml);

          // iframe 내부에서 제목 재확인
          const iframeTitle = $iframe('#SE_Title, .se-title-text, .se-title').first().text().trim();
          if (iframeTitle) title = iframeTitle;

          // 날짜 추출
          const dateText = $iframe('.se_publishDate, .publishDate, .date').first().text().trim();
          if (dateText) postDate = dateText;

          // 본문 추출
          const contentSelectors = [
            '#postViewArea',
            '#postView',
            '.se-main-container',
            '.se-component-content',
            '.post-view',
            '#content',
          ];

          let contentHtml = '';
          for (const selector of contentSelectors) {
            const content = $iframe(selector).first();
            if (content.length > 0) {
              contentHtml = content.html() || '';
              break;
            }
          }

          if (!contentHtml) {
            // Readability 사용
            postContent = extractMainContent(iframeHtml, iframeUrl);
          } else {
            postContent = extractMainContent(contentHtml, iframeUrl);
          }
        }
      }

      // iframe이 없거나 실패한 경우 직접 파싱
      if (!postContent) {
        postContent = extractMainContent(html, url);
      }

      return {
        title: title || '제목 없음',
        url,
        content: postContent,
        date: postDate || undefined,
      };
    } catch (error) {
      console.error('Naver 포스트 가져오기 실패:', url, error);
      throw error;
    }
  }

  private extractBlogId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // blog.naver.com/{blogId} 패턴
      if (pathParts.length > 0) {
        return pathParts[0];
      }

      // URL 파라미터에서 추출
      const blogId = urlObj.searchParams.get('blogId');
      if (blogId) return blogId;

      return null;
    } catch {
      return null;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
