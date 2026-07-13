# TSRM 공사운영현황 PoC

기존 TSRM에 추가될 `공사운영현황` 메뉴를 제안하기 위한 1단계 PoC입니다. 실제 DB, API, TSRM 연동 없이 현실적인 더미데이터만으로 5분 시연이 가능하도록 구성했습니다.

## 1단계 구현 범위

- 공통 Layout
- 공사운영현황 Dashboard
- 현실적인 도시가스 공사 더미데이터
- KPI 카드 3개
- 운영 알림
- Quick Action
- 지역별 현황
- 협력사별 현황
- 공정단계별 현황
- 오늘 공사 리스트
- 기본 디자인 시스템

## 폴더 구조

```text
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  data/
    constructions.ts
```

- `src/app/page.tsx`: 공사운영현황 메인 Dashboard 화면입니다.
- `src/app/globals.css`: TSRM 업무시스템 느낌의 기본 스타일입니다.
- `src/data/constructions.ts`: 화면에 표시되는 더미데이터와 공정단계 타입입니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속하면 됩니다.

## 확인 방법

```bash
npm run lint
npm run build
```

두 명령이 오류 없이 끝나면 1단계 화면을 실행 가능한 상태로 볼 수 있습니다.

## 다음 단계

2단계는 공사 리스트를 클릭했을 때 볼 수 있는 공사 상세 화면, 지도 Mock, 공사계획, 오늘 작업내용, 현장사진, 공사 수정 화면입니다. 사용자가 "다음 단계 진행"이라고 요청하면 그때 구현합니다.
