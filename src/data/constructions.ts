export type ProcessStage =
  | "발주 완료"
  | "착공 예정"
  | "배관 공사"
  | "기층 포장"
  | "표층 포장"
  | "공사 완료"
  | "준공 완료";

export type AlertLevel = "critical" | "warning" | "notice";

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
