// 블로그 포스트 데이터 구조
export interface BlogPost {
  title: string;
  url: string;
  content: string;
  date?: string;
  author?: string;
}

// 작업 상태
export interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fetched: number;
  total: number;
  message: string;
  error?: string;
}

// 작업 결과
export interface JobResult {
  posts: BlogPost[];
  blogUrl: string;
  blogTitle?: string;
}

// RSS 피드 항목
export interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
}
