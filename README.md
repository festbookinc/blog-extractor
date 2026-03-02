# 블로그 포스트 추출기

한국 블로그 플랫폼(Naver Blog, Tistory, Brunch)에서 최신 공개 포스트를 추출하여 깔끔한 HTML 파일로 다운로드할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- **다중 플랫폼 지원**: Naver Blog, Tistory, Brunch 지원
- **RSS 우선**: RSS/Atom 피드를 우선적으로 사용하여 효율적인 추출
- **Playwright 폴백**: RSS가 없는 경우 브라우저 자동화로 포스트 추출
- **robots.txt 준수**: 크롤링 정책을 존중하며, 제한된 경우 RSS만 사용
- **부분 성공 처리**: 일부 포스트만 추출되어도 결과 제공
- **실시간 진행 상황**: 추출 진행 상황을 실시간으로 확인
- **깔끔한 HTML 출력**: 광고, 네비게이션, 푸터 등을 제거한 깔끔한 콘텐츠

## 기술 스택

- **프레임워크**: Next.js 14 (App Router) + TypeScript
- **스타일링**: Tailwind CSS
- **스크래핑**: Playwright (headless Chromium)
- **파싱**: Cheerio, JSDOM, @mozilla/readability
- **RSS 파싱**: rss-parser
- **robots.txt**: robots-parser

## 설치 및 실행

### 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn

### 설치

```bash
# 의존성 설치
npm install

# Playwright 브라우저 설치 (필수)
npx playwright install chromium
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 사용할 수 있습니다.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 사용 방법

1. 블로그 URL 입력: 지원되는 블로그 플랫폼의 URL을 입력합니다.
   - Naver Blog: `https://blog.naver.com/username`
   - Tistory: `https://username.tistory.com`
   - Brunch: `https://brunch.co.kr/@username`

2. 추출 시작: "추출 시작" 버튼을 클릭합니다.

3. 진행 상황 확인: 실시간으로 추출 진행 상황을 확인할 수 있습니다.

4. 결과 확인: 추출이 완료되면 브라우저에서 바로 결과를 확인할 수 있습니다.

5. HTML 다운로드: "HTML 다운로드" 버튼을 클릭하여 파일로 저장합니다.

## 아키텍처

### Adapter 패턴

각 블로그 플랫폼은 `BlogAdapter` 인터페이스를 구현한 어댑터로 처리됩니다:

- `NaverAdapter`: Naver Blog 전용 처리 (iframe 내부 콘텐츠 추출 포함)
- `TistoryAdapter`: Tistory 및 Daum Blog 처리
- `BrunchAdapter`: Brunch 처리

### API 엔드포인트

- `POST /api/extract`: 추출 작업 시작
- `GET /api/progress?jobId=...`: 작업 진행 상황 조회
- `GET /api/result?jobId=...`: 추출 결과 조회
- `GET /api/download?jobId=...`: HTML 파일 다운로드

### 작업 흐름

1. 사용자가 블로그 URL을 입력하고 추출을 요청합니다.
2. 서버는 적절한 어댑터를 선택합니다.
3. robots.txt를 확인하여 크롤링 허용 여부를 확인합니다.
4. RSS 피드를 우선적으로 시도하고, 실패 시 Playwright를 사용합니다.
5. 포스트 URL 목록을 가져옵니다 (최대 30개).
6. 동시성 제한(3개)을 두고 포스트 내용을 가져옵니다.
7. 각 포스트의 콘텐츠를 정리하고 HTML을 생성합니다.
8. 결과를 브라우저에 표시하고 다운로드할 수 있게 합니다.

## 주요 특징

### Naver Blog 특수 처리

Naver Blog의 경우 실제 포스트 콘텐츠가 `<iframe id="mainFrame">` 내부에 있습니다. 이 어댑터는 iframe의 `src` 속성을 파싱하여 실제 콘텐츠를 가져옵니다.

### 콘텐츠 정리

추출된 HTML에서 다음 요소들이 제거됩니다:
- 스크립트 태그
- 스타일 태그
- 네비게이션, 푸터, 사이드바
- 광고 및 추적 코드

다음 태그만 유지됩니다:
- `<p>`, `<h1>` ~ `<h6>`
- `<ul>`, `<ol>`, `<li>`
- `<blockquote>`
- `<strong>`, `<em>`
- `<pre>`, `<code>`
- `<img>`

### 에러 처리

- 재시도: 일시적인 네트워크 오류는 최대 2회 재시도
- 타임아웃: 각 요청은 15초 타임아웃
- 부분 성공: 일부 포스트만 추출되어도 결과 제공

## 제한사항

- 현재는 인메모리 작업 저장소를 사용합니다. 서버 재시작 시 작업 정보가 사라집니다.
- 동시 작업 수에 제한이 없습니다. 프로덕션 환경에서는 큐 시스템을 고려해야 합니다.
- Playwright는 상당한 메모리를 사용할 수 있습니다.

## 라이선스

MIT

## 기여

이슈 및 풀 리퀘스트를 환영합니다!
