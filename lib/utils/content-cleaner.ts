import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';

/**
 * HTML 콘텐츠를 정리하여 허용된 태그만 남김
 */
export function cleanContent(html: string): string {
  const $ = cheerio.load(html);

  // 허용된 태그만 유지
  const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'pre', 'code', 'img'];
  
  // 모든 태그를 순회하며 허용되지 않은 태그 제거
  $('*').each((_, element) => {
    const tagName = element.tagName?.toLowerCase();
    if (tagName && !allowedTags.includes(tagName)) {
      // 허용되지 않은 태그는 내용만 유지하고 태그는 제거
      $(element).replaceWith($(element).html() || '');
    }
  });

  // 스크립트, 스타일, 주석 제거
  $('script, style, noscript, iframe, embed, object').remove();
  $('*').each((_, element) => {
    // 인라인 스타일 제거
    $(element).removeAttr('style');
    // 클래스 및 ID 제거 (필요시 유지 가능)
    $(element).removeAttr('class');
    $(element).removeAttr('id');
    // 이벤트 핸들러 제거
    Object.keys(element.attribs || {}).forEach(attr => {
      if (attr.startsWith('on')) {
        $(element).removeAttr(attr);
      }
    });
  });

  // img 태그의 src만 유지 (다른 속성 제거)
  $('img').each((_, img) => {
    const src = $(img).attr('src');
    $(img).removeAttr('alt');
    $(img).removeAttr('title');
    $(img).removeAttr('class');
    $(img).removeAttr('id');
    $(img).removeAttr('style');
    if (src) {
      $(img).attr('src', src);
    }
  });

  return $.html();
}

/**
 * Readability를 사용하여 메인 콘텐츠 추출
 */
export function extractMainContent(html: string, url: string): string {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article) {
      return cleanContent(article.content);
    }
  } catch (error) {
    console.warn('Readability 파싱 실패:', error);
  }

  // Readability 실패 시 기본 정리만 수행
  return cleanContent(html);
}
