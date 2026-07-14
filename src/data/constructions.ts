export type ProcessStage =
  | "발주 완료"
  | "착공 예정"
  | "배관 공사"
  | "기층 포장"
  | "표층 포장"
  | "공사 완료"
  | "준공 완료";

export type AlertLevel = "critical" | "warning" | "notice";

export type SitePhoto = {
  label: "Before" | "Progress" | "After";
  caption: string;
  tone: "before" | "progress" | "after";
};

export type Construction = {
  id: string;
  name: string;
  region: "익산시" | "정읍시";
  lengthMeter: number;
  contractor: "한마음" | "동부" | "일진" | "서경" | "푸른" | "대한" | "나노" | "현창";
  stage: ProcessStage;
  progress: number;
  startDate: string;
  dueDate: string;
  issue: string;
  issueLevel: AlertLevel;
  address: string;
  mapLabel: string;
  plan: { period: string; content: string; workers: string; equipment: string };
  todayWork: { work: string; status: string; note: string };
  photos: SitePhoto[];
};

export const processStages: ProcessStage[] = [
  "발주 완료",
  "착공 예정",
  "배관 공사",
  "기층 포장",
  "표층 포장",
  "공사 완료",
  "준공 완료",
];

const photos: SitePhoto[] = [
  { label: "Before", caption: "착공 전 도로 및 매설 예정 구간", tone: "before" },
  { label: "Progress", caption: "배관 부설 및 되메우기 진행 현장", tone: "progress" },
  { label: "After", caption: "포장 복구 및 현장 정리 상태", tone: "after" },
];

function detail(address: string, mapLabel: string, content: string): Pick<Construction, "address" | "mapLabel" | "plan" | "todayWork" | "photos"> {
  return {
    address,
    mapLabel,
    plan: {
      period: "2026-07-13 ~ 2026-07-18",
      content,
      workers: "현장대리인 1명, 배관공 4명, 신호수 2명",
      equipment: "백호우 1대, 융착기 1대, 안전펜스 60m",
    },
    todayWork: {
      work: "작업구간 확인, 안전조치, 공정 진행상황 점검",
      status: "협력사 제출자료와 현장 진행상황 대조 중",
      note: "완료 전 현장사진 및 공정률 확인 필요",
    },
    photos,
  };
}

export const constructions: Construction[] = [
  {
    id: "TSRM-IKS-2026-0713-01",
    name: "익산 모현동 공동주택 도시가스 인입공사",
    region: "익산시",
    lengthMeter: 420,
    contractor: "한마음",
    stage: "착공 예정",
    progress: 0,
    startDate: "2026-07-13",
    dueDate: "2026-07-18",
    issue: "공사계획 미등록",
    issueLevel: "critical",
    ...detail("전북 익산시 모현동1가 812 일원", "모현동 공동주택 인입 예정 구간", "공동주택 인입관 신설, 도로 굴착, 안전 가시설 설치"),
  },
  {
    id: "TSRM-JEP-2026-0713-02",
    name: "정읍 상동 근린생활시설 공급관 공사",
    region: "정읍시",
    lengthMeter: 285,
    contractor: "동부",
    stage: "배관 공사",
    progress: 42,
    startDate: "2026-07-11",
    dueDate: "2026-07-13",
    issue: "완료예정 대비 공정 지연",
    issueLevel: "warning",
    ...detail("전북 정읍시 상동 261-4 일원", "상동 근린생활시설 공급관 부설 구간", "저압 공급관 285m 부설 및 수요처 인입 연결"),
  },
  {
    id: "TSRM-IKS-2026-0713-03",
    name: "익산 영등동 상가 밀집구간 본관 연장공사",
    region: "익산시",
    lengthMeter: 610,
    contractor: "일진",
    stage: "기층 포장",
    progress: 71,
    startDate: "2026-07-08",
    dueDate: "2026-07-15",
    issue: "현장사진 미취합",
    issueLevel: "notice",
    ...detail("전북 익산시 영등동 766 상가밀집구간", "영등동 본관 연장 및 포장 복구 구간", "본관 연장 610m, 차도부 굴착 복구, 공급압 점검"),
  },
  {
    id: "TSRM-JEP-2026-0713-04",
    name: "정읍 수성동 단독주택 공급관 신설공사",
    region: "정읍시",
    lengthMeter: 190,
    contractor: "서경",
    stage: "표층 포장",
    progress: 88,
    startDate: "2026-07-09",
    dueDate: "2026-07-14",
    issue: "포장복구 확인 필요",
    issueLevel: "notice",
    ...detail("전북 정읍시 수성동 932-8", "수성동 단독주택 공급관 신설 구간", "단독주택 공급관 신설, 표층 포장, 안전시설 철거"),
  },
  {
    id: "TSRM-IKS-2026-0713-05",
    name: "익산 부송동 업무시설 인입배관 공사",
    region: "익산시",
    lengthMeter: 155,
    contractor: "푸른",
    stage: "공사 완료",
    progress: 100,
    startDate: "2026-07-10",
    dueDate: "2026-07-13",
    issue: "준공서류 검토 대기",
    issueLevel: "notice",
    ...detail("전북 익산시 부송동 1101-2", "부송동 업무시설 인입배관 완료 구간", "업무시설 인입배관 연결 및 사용 전 점검"),
  },
  {
    id: "TSRM-JEP-2026-0713-06",
    name: "정읍 연지동 노후관 교체 연계공사",
    region: "정읍시",
    lengthMeter: 735,
    contractor: "대한",
    stage: "배관 공사",
    progress: 53,
    startDate: "2026-07-07",
    dueDate: "2026-07-16",
    issue: "교통통제 협의 필요",
    issueLevel: "warning",
    ...detail("전북 정읍시 연지동 44-3", "연지동 노후관 교체 연계 구간", "노후관 교체, 임시공급 전환, 교통통제 구간 관리"),
  },
  {
    id: "TSRM-IKS-2026-0713-07",
    name: "익산 어양동 교육시설 공급관 이설공사",
    region: "익산시",
    lengthMeter: 360,
    contractor: "나노",
    stage: "발주 완료",
    progress: 0,
    startDate: "2026-07-15",
    dueDate: "2026-07-22",
    issue: "협력사 착공자료 요청",
    issueLevel: "notice",
    ...detail("전북 익산시 어양동 652 교육시설 주변", "어양동 교육시설 공급관 이설 예정 구간", "교육시설 진입로 공급관 이설 및 보행 안전 확보"),
  },
  {
    id: "TSRM-JEP-2026-0713-08",
    name: "정읍 시기동 복합건물 인입공사",
    region: "정읍시",
    lengthMeter: 245,
    contractor: "현창",
    stage: "준공 완료",
    progress: 100,
    startDate: "2026-07-04",
    dueDate: "2026-07-12",
    issue: "보고 반영 완료",
    issueLevel: "notice",
    ...detail("전북 정읍시 시기동 321-6", "시기동 복합건물 인입 완료 구간", "복합건물 인입공사, 사용 전 검사, 준공 보고"),
  },
  {
    id: "TSRM-IKS-2026-0713-09",
    name: "익산 신동 대학로 상업시설 공급관 보강공사",
    region: "익산시",
    lengthMeter: 315,
    contractor: "현창",
    stage: "배관 공사",
    progress: 64,
    startDate: "2026-07-12",
    dueDate: "2026-07-17",
    issue: "야간작업 민원 대응 필요",
    issueLevel: "warning",
    ...detail("전북 익산시 신동 789 대학로 일원", "신동 대학로 공급관 보강 구간", "상업시설 밀집구간 공급관 보강 및 야간 굴착 복구"),
  },
  {
    id: "TSRM-JEP-2026-0713-10",
    name: "정읍 농소동 산업단지 인입관 확장공사",
    region: "정읍시",
    lengthMeter: 520,
    contractor: "한마음",
    stage: "착공 예정",
    progress: 5,
    startDate: "2026-07-14",
    dueDate: "2026-07-21",
    issue: "장비 반입 일정 확인",
    issueLevel: "notice",
    ...detail("전북 정읍시 농소동 산업단지 진입로", "농소동 산업단지 인입관 확장 예정 구간", "산업단지 수요 증가 대응 인입관 확장 및 밸브 설치"),
  },
];

export const operationsAlerts = [
  {
    level: "critical" as const,
    title: "착공 예정인데 공사계획이 없는 공사",
    count: 1,
    description: "익산 모현동 현장은 착공일이 오늘이지만 공사계획이 비어 있습니다.",
  },
  {
    level: "warning" as const,
    title: "오늘 완료 예정인데 공정률이 부족한 공사",
    count: 1,
    description: "정읍 상동 현장은 완료예정일이 오늘이며 현재 공정률은 42%입니다.",
  },
  {
    level: "notice" as const,
    title: "협력사 자료 미취합 공사",
    count: 2,
    description: "현장사진 또는 착공자료가 아직 취합되지 않은 공사가 있습니다.",
  },
];

export function summarizeBy<T extends string>(items: Construction[], key: (item: Construction) => T) {
  return items.reduce<Record<T, number>>((summary, item) => {
    const value = key(item);
    summary[value] = (summary[value] ?? 0) + 1;
    return summary;
  }, {} as Record<T, number>);
}
