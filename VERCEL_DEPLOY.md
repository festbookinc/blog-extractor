# ✅ Vercel 배포 준비 완료!

## 완료된 작업
- ✅ Git 저장소 초기화 및 커밋
- ✅ GitHub 저장소 생성: https://github.com/festbookinc/blog-extractor
- ✅ 코드 푸시 완료
- ✅ Vercel 설정 파일 생성 (`vercel.json`)
- ✅ Playwright Vercel 환경 조건부 처리

## 다음 단계: Vercel에 배포

### 방법 1: Vercel 웹 대시보드 (권장)

1. **Vercel 접속**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **프로젝트 추가**
   - "Add New Project" 클릭
   - "Import Git Repository"에서 `festbookinc/blog-extractor` 선택
   - "Import" 클릭

3. **프로젝트 설정**
   - Framework Preset: **Next.js** (자동 감지됨)
   - Root Directory: `./` (기본값)
   - Build Command: `npm run build` (기본값)
   - Output Directory: `.next` (기본값)
   - Install Command: `npm install` (기본값)

4. **환경 변수**
   - 현재 프로젝트는 외부 API 키가 필요하지 않습니다
   - 필요시 나중에 추가 가능

5. **배포**
   - "Deploy" 버튼 클릭
   - 배포 완료까지 2-3분 소요

### 방법 2: Vercel CLI

```bash
cd /Users/writerma/blog-extractor
npx vercel login
npx vercel --prod
```

## 배포 후 확인

배포가 완료되면:
- Vercel이 배포 URL을 제공합니다 (예: `blog-extractor.vercel.app`)
- 해당 URL로 접속하여 앱 테스트

## 중요 사항

⚠️ **Playwright 제한사항**
- Vercel 서버리스 환경에서는 Playwright를 사용할 수 없습니다
- **Naver Blog**: RSS 피드가 있을 때만 작동
- **Brunch**: RSS 피드가 있을 때만 작동  
- **Tistory**: 페이지네이션 크롤링 사용 → 정상 작동 ✅

## GitHub 저장소
https://github.com/festbookinc/blog-extractor
