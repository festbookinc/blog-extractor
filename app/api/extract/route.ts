import { NextRequest, NextResponse } from 'next/server';
import { extractBlogPosts } from '@/lib/extractor';
import { jobStore } from '@/lib/job-store';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: '블로그 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: '유효하지 않은 URL입니다.' },
        { status: 400 }
      );
    }

    // 작업 ID 생성
    const jobId = uuidv4();

    // 작업 생성
    jobStore.createJob(jobId);

    // 비동기로 추출 시작 (응답을 기다리지 않음)
    extractBlogPosts(url, jobId, 30).catch((error) => {
      console.error('추출 작업 실패:', error);
      jobStore.updateStatus(jobId, {
        status: 'failed',
        message: `오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
