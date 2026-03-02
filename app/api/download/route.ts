import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '@/lib/job-store';
import { generateHTML } from '@/lib/utils/html-generator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const result = jobStore.getResult(jobId);

    if (!result) {
      const status = jobStore.getStatus(jobId);
      if (!status) {
        return NextResponse.json(
          { error: '작업을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      if (status.status !== 'completed') {
        return NextResponse.json(
          { error: '작업이 아직 완료되지 않았습니다.' },
          { status: 202 }
        );
      }

      return NextResponse.json(
        { error: '결과를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // HTML 생성
    const html = generateHTML(result.posts, result.blogUrl, result.blogTitle);

    // 파일로 반환
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="blog-posts-${jobId.slice(0, 8)}.html"`,
      },
    });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
