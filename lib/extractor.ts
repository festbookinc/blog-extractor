import { getAdapter, cleanupAdapters } from './adapters';
import { checkRobotsTxt } from './utils/robots';
import { fetchConcurrent } from './utils/fetcher';
import { BlogPost, JobStatus } from './types';
import { jobStore } from './job-store';

/**
 * 블로그에서 포스트를 추출하는 메인 함수
 */
export async function extractBlogPosts(
  blogUrl: string,
  jobId: string,
  targetCount: number = 30
): Promise<void> {
  try {
    console.log(`[${jobId}] 추출 작업 시작: ${blogUrl}`);
    
    // 어댑터 찾기
    const adapter = getAdapter(blogUrl);
    if (!adapter) {
      console.log(`[${jobId}] 지원하지 않는 플랫폼`);
      jobStore.updateStatus(jobId, {
        status: 'failed',
        message: '지원하지 않는 블로그 플랫폼입니다. (Naver Blog, Tistory, Brunch만 지원)',
        error: 'Unsupported platform',
      });
      return;
    }

    console.log(`[${jobId}] 어댑터 찾음: ${adapter.constructor.name}`);

    // robots.txt 확인
    console.log(`[${jobId}] robots.txt 확인 중...`);
    const isAllowed = await checkRobotsTxt(blogUrl);
    if (!isAllowed) {
      console.log(`[${jobId}] robots.txt 제한됨, RSS만 사용`);
      jobStore.updateStatus(jobId, {
        status: 'processing',
        message: 'robots.txt에 의해 크롤링이 제한되어 RSS 피드만 사용합니다.',
      });
    }

    // 작업 시작
    jobStore.updateStatus(jobId, {
      status: 'processing',
      message: '포스트 목록을 가져오는 중...',
    });
    console.log(`[${jobId}] 포스트 목록 가져오기 시작...`);

    // 포스트 URL 목록 가져오기 (타임아웃 추가)
    const postUrlsPromise = adapter.listPostUrls(blogUrl, targetCount);
    const timeoutPromise = new Promise<string[]>((_, reject) => 
      setTimeout(() => reject(new Error('포스트 목록 가져오기 타임아웃 (300초)')), 300000)
    );
    
    const postUrls = await Promise.race([postUrlsPromise, timeoutPromise]) as string[];
    
    console.log(`[${jobId}] 포스트 URL ${postUrls.length}개 발견`);
    
    if (postUrls.length === 0) {
      console.log(`[${jobId}] 포스트를 찾을 수 없음`);
      jobStore.updateStatus(jobId, {
        status: 'failed',
        message: '포스트를 찾을 수 없습니다.',
        error: 'No posts found',
      });
      await cleanupAdapters(adapter);
      return;
    }

    jobStore.updateStatus(jobId, {
      status: 'processing',
      total: postUrls.length,
      fetched: 0,
      message: `총 ${postUrls.length}개의 포스트를 발견했습니다. 내용을 가져오는 중...`,
    });
    console.log(`[${jobId}] 포스트 내용 가져오기 시작 (${postUrls.length}개)`);

    // 포스트 내용 가져오기 (동시성 제한: 3-5개)
    const posts: BlogPost[] = [];
    let successCount = 0;
    let failCount = 0;

    await fetchConcurrent(
      postUrls,
      async (postUrl, index) => {
        try {
          console.log(`[${jobId}] 포스트 ${index + 1}/${postUrls.length} 가져오는 중: ${postUrl}`);
          
          // 각 포스트 가져오기에 타임아웃 추가 (30초)
          const postPromise = adapter.fetchPost(postUrl);
          const timeoutPromise = new Promise<BlogPost>((_, reject) =>
            setTimeout(() => reject(new Error('포스트 가져오기 타임아웃 (30초)')), 30000)
          );
          
          const post = await Promise.race([postPromise, timeoutPromise]);
          posts.push(post);
          successCount++;
          
          const currentFetched = successCount + failCount;
          console.log(`[${jobId}] 포스트 ${currentFetched}/${postUrls.length} 완료 (성공: ${successCount}, 실패: ${failCount})`);
          
          jobStore.updateStatus(jobId, {
            status: 'processing',
            fetched: currentFetched,
            total: postUrls.length,
            message: `가져오는 중... ${currentFetched}/${postUrls.length} (성공: ${successCount}, 실패: ${failCount})`,
          });
        } catch (error) {
          failCount++;
          const currentFetched = successCount + failCount;
          console.error(`[${jobId}] 포스트 가져오기 실패 (${index + 1}/${postUrls.length}): ${postUrl}`, error);
          
          jobStore.updateStatus(jobId, {
            status: 'processing',
            fetched: currentFetched,
            total: postUrls.length,
            message: `가져오는 중... ${currentFetched}/${postUrls.length} (성공: ${successCount}, 실패: ${failCount})`,
          });
        }
      },
      3 // 동시성: 3개
    );
    
    console.log(`[${jobId}] 모든 포스트 가져오기 완료 (성공: ${successCount}, 실패: ${failCount})`);

    // 어댑터 정리
    await cleanupAdapters(adapter);

    // 결과 저장
    if (posts.length > 0) {
      // 블로그 제목 추출 시도
      let blogTitle: string | undefined;
      try {
        const response = await fetch(blogUrl);
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          blogTitle = titleMatch[1].trim();
        }
      } catch {
        // 제목 추출 실패는 무시
      }

      jobStore.setResult(jobId, {
        posts,
        blogUrl,
        blogTitle,
      });

      jobStore.updateStatus(jobId, {
        status: 'completed',
        fetched: posts.length,
        total: postUrls.length,
        message: `성공적으로 ${posts.length}개의 포스트를 추출했습니다.`,
      });
    } else {
      jobStore.updateStatus(jobId, {
        status: 'failed',
        fetched: 0,
        total: postUrls.length,
        message: '포스트 내용을 가져올 수 없었습니다.',
        error: 'Failed to fetch post content',
      });
    }
  } catch (error) {
    console.error(`[${jobId}] 블로그 추출 실패:`, error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error(`[${jobId}] 에러 상세:`, error);
    jobStore.updateStatus(jobId, {
      status: 'failed',
      message: `오류 발생: ${errorMessage}`,
      error: errorMessage,
    });
  }
}
