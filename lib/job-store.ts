import { JobStatus, JobResult } from './types';

/**
 * 작업 데이터 구조
 */
interface JobData {
  status: JobStatus;
  result?: JobResult;
}

/**
 * 인메모리 작업 저장소
 * 프로덕션에서는 Redis나 DB를 사용해야 함
 * 
 * Next.js 개발 모드의 HMR(Hot Module Replacement)로 인해
 * 메모리가 초기화되는 것을 방지하기 위해 globalThis를 사용합니다.
 */
class JobStore {
  private jobs: Map<string, JobData>;

  constructor() {
    // globalThis를 사용하여 HMR 시에도 데이터 유지
    const globalForStore = globalThis as unknown as {
      __blogExtractorJobStore: Map<string, JobData> | undefined;
    };

    this.jobs = globalForStore.__blogExtractorJobStore ?? new Map<string, JobData>();

    // 개발 모드에서만 globalThis에 저장 (프로덕션에서는 불필요)
    if (process.env.NODE_ENV !== 'production') {
      globalForStore.__blogExtractorJobStore = this.jobs;
    }
  }

  /**
   * 작업 생성
   */
  createJob(jobId: string): void {
    this.jobs.set(jobId, {
      status: {
        status: 'pending',
        fetched: 0,
        total: 30,
        message: '작업 대기 중...',
      },
    });
  }

  /**
   * 작업 상태 업데이트
   */
  updateStatus(jobId: string, status: Partial<JobStatus>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = { ...job.status, ...status };
    }
  }

  /**
   * 작업 상태 가져오기
   */
  getStatus(jobId: string): JobStatus | null {
    return this.jobs.get(jobId)?.status || null;
  }

  /**
   * 작업 결과 저장
   */
  setResult(jobId: string, result: JobResult): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.result = result;
      job.status.status = 'completed';
      job.status.fetched = result.posts.length;
      job.status.message = `${result.posts.length}개의 포스트를 성공적으로 추출했습니다.`;
    }
  }

  /**
   * 작업 결과 가져오기
   */
  getResult(jobId: string): JobResult | null {
    return this.jobs.get(jobId)?.result || null;
  }

  /**
   * 작업 삭제 (선택적 - 메모리 관리용)
   */
  deleteJob(jobId: string): void {
    this.jobs.delete(jobId);
  }

  /**
   * 모든 작업 목록 (디버깅용)
   */
  getAllJobs(): string[] {
    return Array.from(this.jobs.keys());
  }
}

// 싱글톤 인스턴스 (globalThis를 통해 HMR 시에도 유지됨)
export const jobStore = new JobStore();
