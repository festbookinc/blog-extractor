# Vercel 배포 완료 가이드

## 현재 상태
✅ 배포 설정 파일 생성 완료 (`vercel.json`)
✅ Playwright Vercel 환경 조건부 처리 완료
✅ Git 저장소 초기화 및 커밋 완료

## 배포를 완료하려면

### 옵션 1: Vercel 웹 대시보드 사용 (가장 쉬움)

1. **GitHub 저장소 생성**
   ```bash
   # GitHub에서 새 저장소 생성 후:
   git remote add origin https://github.com/YOUR_USERNAME/blog-extractor.git
   git push -u origin main
   ```

2. **Vercel에 배포**
   - https://vercel.com 접속
   - 로그인 (GitHub 계정으로)
   - "Add New Project" 클릭
   - GitHub 저장소 선택
   - 자동으로 설정 감지됨 (Next.js)
   - "Deploy" 클릭

### 옵션 2: Vercel CLI 사용

```bash
# Vercel 로그인
npx vercel login

# 배포
npx vercel --prod
```

## 제공하신 정보 확인

제공해주신 정보:
- ✅ OpenAI API 키 (이 프로젝트에서는 사용하지 않음)
- ✅ Supabase 정보 (이 프로젝트에서는 사용하지 않음)
- ✅ GitHub 토큰 (저장소 푸시용)

**이 프로젝트는 외부 API 키가 필요하지 않습니다.** 
현재 설정으로 바로 배포 가능합니다.

## 주의사항

⚠️ **Playwright 제한사항**
- Vercel 서버리스 환경에서는 Playwright를 사용할 수 없습니다
- Naver Blog와 Brunch는 RSS 피드가 있을 때만 작동합니다
- Tistory는 페이지네이션 크롤링을 사용하므로 정상 작동합니다

## 다음 단계

1. GitHub 저장소 생성 및 푸시
2. Vercel 웹 대시보드에서 배포
3. 배포 완료 후 URL 확인

배포가 완료되면 제공된 URL로 앱에 접속할 수 있습니다!
