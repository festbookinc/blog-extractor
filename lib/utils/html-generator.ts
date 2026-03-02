import { BlogPost } from '../types';

/**
 * 추출된 포스트들을 HTML 파일로 생성
 */
export function generateHTML(posts: BlogPost[], blogUrl: string, blogTitle?: string): string {
  const title = blogTitle || '블로그 포스트 모음';
  
  // 목차 생성
  const toc = posts.map((post, index) => 
    `    <li><a href="#post-${index + 1}">${escapeHtml(post.title)}</a></li>`
  ).join('\n');

  // 포스트 섹션 생성
  const postSections = posts.map((post, index) => {
    const dateStr = post.date ? new Date(post.date).toLocaleDateString('ko-KR') : '날짜 없음';
    return `
  <h1 id="post-${index + 1}" style="page-break-before: always; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; margin-top: 40px;">${escapeHtml(post.title)}</h1>
  <div style="color: #888; font-size: 0.9em; margin-bottom: 20px;">${dateStr} | <a href="${escapeHtml(post.url)}" target="_blank">원문 보기</a></div>
  <article>${post.content}</article>
`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">
  <style>
    body {
      font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
      word-break: keep-all;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
      background-color: #fff;
    }
    h1 {
      color: #2c3e50;
      margin-top: 0;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
    }
    article {
      margin-bottom: 40px;
    }
    article img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 20px auto;
    }
    article pre {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    article code {
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    article blockquote {
      border-left: 4px solid #ddd;
      margin: 20px 0;
      padding-left: 20px;
      color: #666;
    }
    ul, ol {
      padding-left: 30px;
    }
    a {
      color: #3498db;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    @media print {
      body {
        padding: 0;
      }
      h1 {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p style="color: #888; font-size: 0.9em;">출처: <a href="${escapeHtml(blogUrl)}" target="_blank">${escapeHtml(blogUrl)}</a></p>
    <p style="color: #888; font-size: 0.9em;">추출 일시: ${new Date().toLocaleString('ko-KR')}</p>
    <p style="color: #888; font-size: 0.9em;">총 ${posts.length}개의 포스트</p>
  </header>

  <nav>
    <h2>목차</h2>
    <ul>
${toc}
    </ul>
  </nav>

${postSections}

  <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #888; font-size: 0.9em; text-align: center;">
    <p>이 문서는 블로그 추출 도구로 자동 생성되었습니다.</p>
  </footer>
</body>
</html>`;
}

/**
 * HTML 특수 문자 이스케이프
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
