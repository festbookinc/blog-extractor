'use client';

import { useState, useEffect } from 'react';
import { BlogPost } from '@/lib/types';

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fetched: number;
  total: number;
  message: string;
  error?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [blogTitle, setBlogTitle] = useState<string>('');
  const [blogUrl, setBlogUrl] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);

  // 진행 상황 폴링
  useEffect(() => {
    if (!jobId || !isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/progress?jobId=${jobId}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);

          if (data.status === 'completed' || data.status === 'failed') {
            setIsPolling(false);
            clearInterval(pollInterval);

            if (data.status === 'completed') {
              const resultResponse = await fetch(`/api/result?jobId=${jobId}`);
              if (resultResponse.ok) {
                const result = await resultResponse.json();
                setPosts(result.posts);
                setBlogTitle(result.blogTitle || '');
                setBlogUrl(result.blogUrl);
              }
              // 결과 API 실패 시에도 서버에 job이 있으면 다운로드는 될 수 있음 — 미리보기만 비움
            }
          }
        }
      } catch (error) {
        console.error('상태 확인 실패:', error);
        setIsPolling(false);
        clearInterval(pollInterval);
      }
    }, 1000); // 1초마다 폴링

    return () => clearInterval(pollInterval);
  }, [jobId, isPolling]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setJobId(data.jobId);
        setIsPolling(true);
        setPosts([]);
        setStatus({
          status: 'pending',
          fetched: 0,
          total: 30,
          message: '작업 시작 중...',
        });
      } else {
        const error = await response.json();
        alert(`오류: ${error.error}`);
      }
    } catch (error) {
      console.error('요청 실패:', error);
      alert('요청을 보내는 중 오류가 발생했습니다.');
    }
  };

  const handleDownload = () => {
    if (jobId) {
      window.open(`/api/download?jobId=${jobId}`, '_blank');
    }
  };

  const handleReset = () => {
    setUrl('');
    setJobId(null);
    setStatus(null);
    setPosts([]);
    setBlogTitle('');
    setBlogUrl('');
    setIsPolling(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            블로그 포스트 추출기
          </h1>
          <p className="text-gray-600">
            Naver Blog, Tistory, Brunch에서 최신 30개 포스트를 추출합니다
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                블로그 URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://blog.naver.com/example"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isPolling}
                />
                <button
                  type="submit"
                  disabled={isPolling || !url.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isPolling ? '처리 중...' : '추출 시작'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {status && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">진행 상황</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">{status.message}</span>
                <span className="text-sm text-gray-500">
                  {status.fetched}/{status.total}
                </span>
              </div>
              {status.status === 'processing' && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(status.fetched / status.total) * 100}%`,
                    }}
                  ></div>
                </div>
              )}
              {status.status === 'failed' && status.error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  오류: {status.error}
                </div>
              )}
            </div>
          </div>
        )}

        {status?.status === 'completed' && jobId && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {posts.length > 0
                  ? `추출된 포스트 (${posts.length}개)`
                  : '추출 완료'}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  HTML 다운로드
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  새로 시작
                </button>
              </div>
            </div>

            {posts.length > 0 ? (
              <div className="border-t pt-4">
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: generatePreviewHTML(posts, blogTitle, blogUrl),
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-600 border-t pt-4">
                미리보기를 불러오지 못했습니다. 위의 HTML 다운로드로 파일을 받을 수 있습니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 미리보기용 HTML 생성 (실제 다운로드 파일과 동일한 스타일)
function generatePreviewHTML(
  posts: BlogPost[],
  blogTitle: string,
  blogUrl: string
): string {
  const toc = posts
    .map(
      (post, index) =>
        `<li><a href="#post-${index + 1}">${escapeHtml(post.title)}</a></li>`
    )
    .join('\n');

  const postSections = posts
    .map((post, index) => {
      const dateStr = post.date
        ? new Date(post.date).toLocaleDateString('ko-KR')
        : '날짜 없음';
      return `
    <h1 id="post-${index + 1}" style="page-break-before: always; border-bottom: 2px solid #eaeaea; padding-bottom: 10px; margin-top: 40px;">${escapeHtml(post.title)}</h1>
    <div style="color: #888; font-size: 0.9em; margin-bottom: 20px;">${dateStr} | <a href="${escapeHtml(post.url)}" target="_blank">원문 보기</a></div>
    <article>${post.content}</article>
  `;
    })
    .join('\n');

  return `
    <style>
      .preview-container {
        font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
        word-break: keep-all;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        color: #333;
      }
      .preview-container h1 {
        color: #2c3e50;
        margin-top: 0;
      }
      .preview-container article img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 20px auto;
      }
      .preview-container article pre {
        background-color: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
      }
      .preview-container article code {
        background-color: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
      }
      .preview-container article blockquote {
        border-left: 4px solid #ddd;
        margin: 20px 0;
        padding-left: 20px;
        color: #666;
      }
      .preview-container ul, .preview-container ol {
        padding-left: 30px;
      }
      .preview-container a {
        color: #3498db;
        text-decoration: none;
      }
      .preview-container a:hover {
        text-decoration: underline;
      }
    </style>
    <div class="preview-container">
      <header>
        <h1>${escapeHtml(blogTitle || '블로그 포스트 모음')}</h1>
        <p style="color: #888; font-size: 0.9em;">출처: <a href="${escapeHtml(blogUrl)}" target="_blank">${escapeHtml(blogUrl)}</a></p>
        <p style="color: #888; font-size: 0.9em;">총 ${posts.length}개의 포스트</p>
      </header>
      <nav>
        <h2>목차</h2>
        <ul>
${toc}
        </ul>
      </nav>
${postSections}
    </div>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
