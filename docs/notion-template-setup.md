# Notion 템플릿 구성 가이드

아래 구조를 맞추면 템플릿 저장소를 그대로 사용할 수 있습니다.

![Notion 템플릿 예시](assets/notion-template-overview.png)

## 1) `플랫폼` 데이터소스 준비
필수 조건:
- `백준` 페이지가 반드시 1개 있어야 합니다.
- 이 `백준` 페이지 ID를 `NOTION_BAEKJOON_PAGE_ID`로 사용합니다.

권장 속성 예시:
- `이름` (title)
- `홈페이지` (url 또는 rich_text)

## 2) `Study Schedule` 데이터소스 속성 맞추기
필수 속성:
- `문제` (title)
- `날짜` (date)
- `플랫폼` (relation -> `플랫폼` 데이터소스)

선택 속성:
- `주제` (rich_text/select/multi_select/number 중 하나)
- `링크` (url 또는 rich_text)
- 멤버 체크박스들 (checkbox, 예: `멤버A`, `멤버B`)

멤버 체크박스를 자동 초기화하려면:
- `NOTION_MEMBER_CHECKBOX_PROPERTIES=멤버A,멤버B`

## 3) 환경변수-속성 매핑표
이름이 다르면 변수값만 바꿔서 맞추면 됩니다.

| GitHub Variable | Notion 속성명 예시 | 필수 |
| --- | --- | --- |
| `NOTION_TITLE_PROPERTY` | `문제` | 선택 |
| `NOTION_DATE_PROPERTY` | `날짜` | 선택 |
| `NOTION_PLATFORM_PROPERTY` | `플랫폼` | 선택 |
| `NOTION_LEVEL_PROPERTY` | `주제` | 선택 |
| `NOTION_URL_PROPERTY` | `링크` | 선택 |

기본값은 README 기준으로 이미 설정돼 있어, 기본 속성명을 그대로 쓰면 별도 수정이 필요 없습니다.

## 4) Integration 권한 연결
생성한 Notion Internal Integration을 아래 두 데이터소스에 모두 연결해야 합니다.
- `Study Schedule`
- `플랫폼`

누락 시 자주 나는 오류:
- `object_not_found`
- `Could not find database`

## 5) ID 추출 방법
Notion URL에서 32자리 ID(하이픈 없는 문자열)를 그대로 사용해도 됩니다.
스크립트가 내부에서 하이픈 형태 UUID로 자동 변환합니다.

예시 URL:
- `https://www.notion.so/<32자리ID>?v=...`

사용 위치:
- `NOTION_DATA_SOURCE_ID` 또는 `NOTION_DATABASE_ID`
- `NOTION_BAEKJOON_PAGE_ID`
