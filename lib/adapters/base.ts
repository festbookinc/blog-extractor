import { BlogPost } from '../types';

/**
 * 블로그 어댑터 기본 인터페이스
 * 각 블로그 플랫폼별로 이 인터페이스를 구현해야 합니다.
 */
export interface BlogAdapter {
  /**
   * 주어진 URL이 이 어댑터가 처리할 수 있는 블로그인지 확인
   */
  detect(url: string): boolean;

  /**
   * RSS/Atom 피드 URL 목록 반환
   * 여러 피드가 있을 수 있으므로 배열로 반환
   */
  getFeedUrls(url: string): Promise<string[]>;

  /**
   * 블로그에서 최신 포스트 URL 목록을 가져옴
   * @param url 블로그 URL
   * @param count 가져올 포스트 개수
   */
  listPostUrls(url: string, count: number): Promise<string[]>;

  /**
   * 개별 포스트의 내용을 가져옴
   * @param url 포스트 URL
   */
  fetchPost(url: string): Promise<BlogPost>;
}
