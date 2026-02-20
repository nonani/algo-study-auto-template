# algo-study-auto-template

Notion `Study Schedule` 데이터소스에 백준 문제를 주간 자동 등록하는 템플릿 저장소입니다.

## 이 템플릿이 해주는 일
- solved.ac에서 조건에 맞는 문제를 랜덤 추출
- Notion에 주간 문제 10개 자동 등록
- 같은 문제 번호 중복 등록 방지
- 매주 일요일 00:00(KST) GitHub Actions 자동 실행

## 빠른 시작 (10분)
1. GitHub에서 이 저장소를 `Use this template`으로 복제합니다.
2. Notion에서 내부 통합(Internal Integration)을 생성합니다.
3. Notion 템플릿 구조를 본인 워크스페이스에 만듭니다.
   - 스키마 가이드: `docs/notion-template-setup.md`
4. 통합을 아래 두 데이터소스에 공유합니다.
   - `Study Schedule`
   - `플랫폼` (백준/프로그래머스 등이 있는 데이터소스)
5. GitHub 저장소 `Settings > Secrets and variables > Actions` 설정:
   - Secret: `NOTION_TOKEN`
   - Variables: `.env.example` 참고
6. `Actions > Weekly Baekjoon To Notion > Run workflow`로 1회 수동 실행

## 필수 설정값
### Secrets
- `NOTION_TOKEN`

### Variables
- `NOTION_DATABASE_ID` 또는 `NOTION_DATA_SOURCE_ID` (둘 중 하나 필수)
- `NOTION_BAEKJOON_PAGE_ID` (필수)
- `NOTION_TITLE_PROPERTY` (기본: `문제`)
- `NOTION_DATE_PROPERTY` (기본: `날짜`)
- `NOTION_PLATFORM_PROPERTY` (기본: `플랫폼`)
- `NOTION_LEVEL_PROPERTY` (기본: `주제`)
- `NOTION_URL_PROPERTY` (기본: `링크`)
- `NOTION_MEMBER_CHECKBOX_PROPERTIES` (선택, 예: `멤버A,멤버B`)
- `SOLVEDAC_QUERY` (기본: `*g5..g2 s#1000..`)
- `PROBLEM_COUNT` (기본: `10`)

## 실행
```bash
npm run run
```

## 테스트
```bash
npm test
```

## 스케줄
- 워크플로: `.github/workflows/notion-weekly-baekjoon.yml`
- cron: `0 15 * * 6` (UTC) = 매주 일요일 00:00 (KST)

## 라이선스
MIT (`LICENSE`)
