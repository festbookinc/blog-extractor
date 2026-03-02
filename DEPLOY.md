# Vercel 배포 가이드

## 배포 방법

### 방법 1: Vercel 웹 대시보드 사용 (권장)

1. **GitHub 저장소 생성**
   - GitHub에 새 저장소 생성: `blog-extractor`
   - 다음 명령어로 푸시:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/blog-extractor.git
   git push -u origin main
   ```

2. **Vercel에 연결**
   - https://vercel.com 접속
   - "Add New Project" 클릭
   - GitHub 저장소 선택
   - 프로젝트 설정:
     - Framework Preset: Next.js
     - Root Directory: `./`
     - Build Command: `npm run build`
     - Output Directory: `.next`
   - "Deploy" 클릭

### 방법 2: Vercel CLI 사용

```bash
npx vercel
```

## 중요 사항

### Playwright 제한사항
- **Vercel 서버리스 환경에서는 Playwright를 사용할 수 없습니다**
- Naver Blog와 Brunch는 RSS 피드가 있을 때만 작동합니다
- Tistory는 페이지네이션 크롤링을 사용하므로 정상 작동합니다

### 환경 변수
현재 프로젝트는 외부 API 키가 필요하지 않습니다.
필요한 경우 Vercel 대시보드에서 환경 변수를 설정할 수 있습니다.

### 함수 타임아웃
- API 라우트는 최대 300초(5분) 타임아웃 설정됨
- `vercel.json`에서 설정 확인 가능

## 배포 후 확인사항

1. 배포된 URL에서 앱 접속
2. Tistory 블로그 URL로 테스트 (RSS 피드 없어도 작동)
3. Naver/Brunch는 RSS 피드가 있는 경우만 작동
