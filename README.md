# TSRM 공사운영현황 PoC

삼천리 도시가스 `공사운영현황` 업무를 빠르게 검증하기 위한 Next.js 기반 PoC입니다.

## 가장 쉬운 실행 방법

Windows에서는 GitHub에서 받은 프로젝트 폴더 안의 아래 파일을 더블클릭합니다.

```text
run-tsrm.bat
```

이 파일이 자동으로 아래 일을 처리합니다.

- 현재 프로젝트 폴더로 이동
- 필요한 패키지가 없으면 `npm install` 실행
- 개발 서버 실행
- `http://localhost:3000` 주소 안내

실행 후 브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3000
```

## 명령어로 실행하는 방법

터미널을 쓰는 경우 저장소 루트에서 아래 명령을 실행합니다.

```bash
npm install
npm run dev
```

품질 확인 명령은 아래와 같습니다.

```bash
npm run lint
npm run build
```

## 구현 범위

- 공사운영현황 대시보드
- KPI 카드와 운영 알림
- 익산시/정읍시 공사 목록
- 검색, 지역, 협력사, 공정 필터
- 정렬 가능한 공사 테이블
- VWorld/Kakao 지도 연동을 가정한 mock 지도 화면
- 공사 상세 화면
- 공사 계획, 금일 작업, 현장 사진 mock
- 공사 정보 수정 mock 동작
- 보고자료 미리보기
- 엑셀용 CSV 다운로드
- PDF 대체 텍스트 보고서 다운로드
- 빈 결과, 로딩, 오류/성공 메시지 상태

## 현재 PoC 제약

- 실제 DB, SAP, VWorld, Kakao API에는 연결하지 않았습니다.
- 모든 데이터는 `src/data/constructions.ts`의 샘플 데이터입니다.
- 파일 다운로드는 운영 검증용 mock 기능입니다.
- PRD 범위 밖인 공사비, 기존 배관망, AI 추천, 인증 시스템은 포함하지 않았습니다.

## 기술 스택

- Next.js App Router
- React 19
- TypeScript strict mode
- ESLint
- Plain CSS
