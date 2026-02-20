# Notion 템플릿 구성 가이드

아래 구조로 만들면 이 자동화 스크립트를 바로 사용할 수 있습니다.

## 1) `플랫폼` 데이터소스
속성 예시:
- `이름` (title)
- `홈페이지` (url 또는 rich_text)

필수 항목:
- `백준` 페이지 1개 생성
  - 이 페이지 ID를 `NOTION_BAEKJOON_PAGE_ID`로 사용

## 2) `Study Schedule` 데이터소스
필수 속성:
- `문제` (title)
- `날짜` (date)
- `플랫폼` (relation -> `플랫폼` 데이터소스)

권장 속성:
- `주제` (rich_text 또는 select 또는 multi_select 또는 number)
- `링크` (url 또는 rich_text)

선택 속성:
- 멤버 체크박스들 (checkbox)
  - 예: `멤버A`, `멤버B`
  - 사용 시 `NOTION_MEMBER_CHECKBOX_PROPERTIES=멤버A,멤버B`

## 3) 통합 권한 연결
생성한 Internal Integration을 다음 두 곳에 공유해야 합니다.
- `Study Schedule`
- `플랫폼`

권한이 누락되면 `object_not_found` 또는 `Could not find database` 오류가 발생합니다.

## 4) ID 추출 팁
- Notion URL의 32자리 ID(하이픈 없음) 사용 가능
- 스크립트가 하이픈 형태로 자동 변환합니다
