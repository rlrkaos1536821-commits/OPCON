"use client";

import { useMemo, useState } from "react";
import {
  constructions as initialConstructions,
  operationsAlerts,
  processStages,
  summarizeBy,
  type AlertLevel,
  type Construction,
  type ProcessStage,
} from "@/data/constructions";

type ViewMode = "dashboard" | "detail" | "report" | "dailyPlan";
type RegionFilter = "전체 지역" | Construction["region"];
type ContractorFilter = "전체 협력사" | Construction["contractor"];
type StageFilter = "전체 공정" | ProcessStage;
type SortKey = "dueDate" | "progress" | "lengthMeter" | "region" | "contractor" | "stage";
type SortDirection = "asc" | "desc";
type ScheduleStep =
  | "인허가"
  | "착공준비"
  | "배관공사"
  | "기층포장"
  | "표층포장"
  | "연결공사"
  | "준공도면"
  | "공사완료";
type ScheduleStatus = "예정" | "진행" | "완료" | "지연";
type ScheduleItem = {
  step: ScheduleStep;
  startDate: string;
  endDate: string;
  owner: string;
  status: ScheduleStatus;
  memo: string;
};
type SystemMessage = {
  tone: "success" | "error" | "info";
  title: string;
  description: string;
};
type DailyPlanWork = "배관 공사" | "기층 포장" | "표층 포장";
type DailyPlanRow = {
  localId: string;
  sourceConstructionId?: string;
  region: string;
  constructionId: string;
  constructionName: string;
  supervisor: string;
  siteManager: string;
  todayWork: DailyPlanWork;
  note: string;
};
type DailyPlanRegionFilter = "전체" | Construction["region"];
type DailyPlanKpis = {
  total: number;
  ready: number;
  working: number;
  done: number;
};

const scheduleSteps: ScheduleStep[] = [
  "인허가",
  "착공준비",
  "배관공사",
  "기층포장",
  "표층포장",
  "연결공사",
  "준공도면",
  "공사완료",
];

const scheduleStepTone: Record<ScheduleStep, string> = {
  "인허가": "stepPermit",
  "착공준비": "stepReady",
  "배관공사": "stepPipe",
  "기층포장": "stepBase",
  "표층포장": "stepSurface",
  "연결공사": "stepConnect",
  "준공도면": "stepDrawing",
  "공사완료": "stepDone",
};

const todayText = "2026-07-14";
const dailyPlanWorkOptions: DailyPlanWork[] = ["배관 공사", "기층 포장", "표층 포장"];

const stageTone: Record<Construction["stage"], string> = {
  "발주 완료": "stageOrdered",
  "착공 예정": "stageReady",
  "배관 공사": "stagePipe",
  "기층 포장": "stageBase",
  "표층 포장": "stageSurface",
  "공사 완료": "stageDone",
  "준공 완료": "stageClosed",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatMonthTitle(dateText: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", year: "numeric" }).format(new Date(`${dateText}T00:00:00`));
}

function getDaysInMonth(dateText: string) {
  const base = new Date(`${dateText}T00:00:00`);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const blanks = Array.from({ length: firstDay.getDay() }, () => null);
  const days = Array.from({ length: lastDay.getDate() }, (_, index) => {
    const date = new Date(year, month, index + 1);
    return date.toISOString().slice(0, 10);
  });

  return [...blanks, ...days];
}

function isDateInRange(dateText: string, startDate: string, endDate: string) {
  return dateText >= startDate && dateText <= endDate;
}

function getScheduleBarClass(item: ScheduleItem, dateText: string) {
  const isStart = item.startDate === dateText;
  const isEnd = item.endDate === dateText;

  if (isStart && isEnd) return "single";
  if (isStart) return "start";
  if (isEnd) return "end";
  return "middle";
}

function getMonthDaysFromItems(items: Construction[]) {
  const firstItem = items[0];
  return getDaysInMonth(firstItem?.startDate ?? todayText);
}

function getItemsOnDate(items: Construction[], dateText: string) {
  return items.filter((item) => isDateInRange(dateText, item.startDate, item.dueDate));
}

function getDailyWorkFromStage(stage: Construction["stage"]): DailyPlanWork {
  if (stage === "배관 공사") return "배관 공사";
  if (stage === "기층 포장") return "기층 포장";
  if (stage === "표층 포장") return "표층 포장";
  return "배관 공사";
}

function getDailyPlanKpis(items: Construction[], regionFilter: DailyPlanRegionFilter): DailyPlanKpis {
  const scopedItems = regionFilter === "전체" ? items : items.filter((item) => item.region === regionFilter);

  return {
    total: scopedItems.length,
    ready: scopedItems.filter((item) => item.stage === "착공 예정").length,
    working: scopedItems.filter((item) => ["배관 공사", "기층 포장", "표층 포장"].includes(item.stage)).length,
    done: scopedItems.filter((item) => ["공사 완료", "준공 완료"].includes(item.stage)).length,
  };
}

function buildDailyPlanRow(item: Construction, index: number): DailyPlanRow {
  const supervisors = ["김도윤", "박민재", "이서준", "정하린"];

  return {
    localId: `daily-${item.id}`,
    sourceConstructionId: item.id,
    region: item.region,
    constructionId: item.id,
    constructionName: item.name,
    supervisor: supervisors[index % supervisors.length],
    siteManager: `${item.contractor} 현장소장`,
    todayWork: getDailyWorkFromStage(item.stage),
    note: item.todayWork.note,
  };
}

function createEmptyDailyPlanRow(): DailyPlanRow {
  return {
    localId: `daily-empty-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    region: "",
    constructionId: "",
    constructionName: "",
    supervisor: "",
    siteManager: "",
    todayWork: "배관 공사",
    note: "",
  };
}

function summarizeRegionCounts(items: Construction[]) {
  return {
    익산시: items.filter((item) => item.region === "익산시").length,
    정읍시: items.filter((item) => item.region === "정읍시").length,
  };
}

function buildDefaultSchedule(construction: Construction): ScheduleItem[] {
  const owners = ["담당자", construction.contractor, construction.contractor, construction.contractor, construction.contractor, "공무", "공무", "담당자"];
  const currentIndex = Math.max(0, processStages.indexOf(construction.stage));
  const statuses: ScheduleStatus[] = scheduleSteps.map((_, index) => {
    if (construction.progress === 100 || index < currentIndex) return "완료";
    if (index === currentIndex || (construction.stage === "착공 예정" && index === 1)) return "진행";
    return "예정";
  });

  return scheduleSteps.map((step, index) => ({
    step,
    startDate: addDays(construction.startDate, index),
    endDate: index === scheduleSteps.length - 1 ? construction.dueDate : addDays(construction.startDate, index + 1),
    owner: owners[index],
    status: statuses[index],
    memo: `${step} 일정 확인`,
  }));
}

function StatusBadge({ stage }: { stage: Construction["stage"] }) {
  return <span className={`stageBadge ${stageTone[stage]}`}>{stage}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progressWrap" aria-label={`공정률 ${value}%`}>
      <span className="progressTrack">
        <span className="progressFill" style={{ width: `${value}%` }} />
      </span>
      <strong>{value}%</strong>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <section className="metricCard">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </section>
  );
}

function SummaryBar({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="summaryBar">
      <div>
        <span>{label}</span>
        <strong>{value}건</strong>
      </div>
      <span className="summaryTrack">
        <span style={{ width: `${percent}%` }} />
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="infoRow">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SystemBanner({ message, onClose }: { message: SystemMessage; onClose: () => void }) {
  return (
    <section className={`systemBanner ${message.tone}`} aria-live="polite">
      <div>
        <strong>{message.title}</strong>
        <span>{message.description}</span>
      </div>
      <button type="button" onClick={onClose}>
        닫기
      </button>
    </section>
  );
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function buildDailyPlanExcel(rows: DailyPlanRow[]) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #b42318; color: #fff; }
    th, td { border: 1px solid #999; padding: 7px; mso-number-format:"\\@"; vertical-align: top; }
    caption { font-size: 18px; font-weight: 700; margin-bottom: 12px; text-align: left; }
  </style>
</head>
<body>
  <table>
    <caption>TSRM 일일공사계획 (${todayText})</caption>
    <thead>
      <tr>
        <th>지역</th>
        <th>공사번호</th>
        <th>공사명</th>
        <th>공사감독</th>
        <th>시공관리자</th>
        <th>오늘 작업</th>
        <th>비고</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `<tr>
        <td>${escapeHtml(row.region)}</td>
        <td>${escapeHtml(row.constructionId)}</td>
        <td>${escapeHtml(row.constructionName)}</td>
        <td>${escapeHtml(row.supervisor)}</td>
        <td>${escapeHtml(row.siteManager)}</td>
        <td>${escapeHtml(row.todayWork)}</td>
        <td>${escapeHtml(row.note)}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;
}

function buildDailyPlanPrintHtml(rows: DailyPlanRow[], kpis: DailyPlanKpis, regionFilter: DailyPlanRegionFilter) {
  const maxKpi = Math.max(kpis.total, kpis.ready, kpis.working, kpis.done, 1);
  const chartItems = [
    { label: "전체 발주공사", value: kpis.total },
    { label: "착공 준비 공사", value: kpis.ready },
    { label: "공사 중인 공사", value: kpis.working },
    { label: "공사 완료 공사", value: kpis.done },
  ];

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>TSRM 일일공사계획 ${todayText}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1f2937; font-family: "Malgun Gothic", Arial, sans-serif; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; margin-bottom: 18px; }
    h1 { margin: 0; color: #9f1c14; font-size: 24px; }
    p { margin: 4px 0 0; color: #667085; font-size: 12px; }
    .meta { text-align: right; font-size: 12px; color: #475467; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .kpi { border: 1px solid #d0d5dd; border-radius: 6px; padding: 10px; }
    .kpi span { display: block; color: #667085; font-size: 11px; font-weight: 700; }
    .kpi strong { display: block; margin-top: 4px; color: #9f1c14; font-size: 20px; }
    .track { height: 7px; margin-top: 8px; border-radius: 999px; background: #f2f4f7; overflow: hidden; }
    .bar { display: block; height: 100%; background: #b42318; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5px; }
    th, td { border: 1px solid #d0d5dd; padding: 6px; vertical-align: top; word-break: keep-all; overflow-wrap: anywhere; }
    th { background: #b42318; color: #fff; }
    tbody tr:nth-child(even) { background: #fff7f6; }
    .empty { border: 1px dashed #d0d5dd; padding: 28px; text-align: center; color: #667085; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>TSRM 일일공사계획</h1>
      <p>오늘 계획된 공사만 집계한 출력 자료입니다.</p>
    </div>
    <div class="meta">
      <strong>기준일 ${todayText}</strong><br />
      권역 ${escapeHtml(regionFilter)}<br />
      전체 ${rows.length}건
    </div>
  </header>
  <section class="kpis">
    ${chartItems
      .map(
        (item) => `<div class="kpi">
      <span>${escapeHtml(item.label)}</span>
      <strong>${item.value}건</strong>
      <div class="track"><i class="bar" style="width: ${Math.round((item.value / maxKpi) * 100)}%;"></i></div>
    </div>`,
      )
      .join("")}
  </section>
  ${
    rows.length === 0
      ? `<div class="empty">오늘 계획된 공사가 없습니다.</div>`
      : `<table>
    <thead>
      <tr>
        <th style="width: 70px;">지역</th>
        <th style="width: 86px;">공사번호</th>
        <th>공사명</th>
        <th style="width: 78px;">공사감독</th>
        <th style="width: 110px;">시공관리자</th>
        <th style="width: 86px;">오늘 작업</th>
        <th>비고</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `<tr>
        <td>${escapeHtml(row.region)}</td>
        <td>${escapeHtml(row.constructionId)}</td>
        <td>${escapeHtml(row.constructionName)}</td>
        <td>${escapeHtml(row.supervisor)}</td>
        <td>${escapeHtml(row.siteManager)}</td>
        <td>${escapeHtml(row.todayWork)}</td>
        <td>${escapeHtml(row.note)}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>`
  }
  <script>
    window.addEventListener("load", () => {
      window.focus();
      window.print();
    });
  </script>
</body>
</html>`;
}

function buildExcelMock(items: Construction[]) {
  const headers = [
    "공사번호",
    "공사명",
    "지역",
    "시공연장(m)",
    "협력사",
    "공정단계",
    "공정률",
    "착공일",
    "완료예정일",
    "특이사항",
  ];
  const rows = items.map((item) => [
    item.id,
    item.name,
    item.region,
    String(item.lengthMeter),
    item.contractor,
    item.stage,
    `${item.progress}%`,
    item.startDate,
    item.dueDate,
    item.issue,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
}

function buildPdfMock(items: Construction[]) {
  const totalLength = items.reduce((sum, item) => sum + item.lengthMeter, 0);
  const delayed = items.filter((item) => item.issueLevel !== "notice");

  return [
    "TSRM 공사운영현황 보고자료",
    "생성일: 2026-07-13",
    "",
    `전체 발주 공사: ${items.length}건`,
    `총 시공연장: ${formatNumber(totalLength)}m`,
    `우선 확인 필요: ${delayed.length}건`,
    "",
    "주요 공사 목록",
    ...items.map(
      (item) =>
        `- ${item.id} / ${item.name} / ${item.region} / ${item.contractor} / ${item.stage} / ${item.progress}%`,
    ),
    "",
    "이 파일은 PoC용 PDF 다운로드 Mock입니다.",
  ].join("\n");
}

function AppShell({
  mode,
  children,
}: {
  mode: ViewMode;
  children: React.ReactNode;
}) {
  return (
    <main className="appShell">
      <aside className="sideNav" aria-label="TSRM 메뉴">
        <div className="brandBlock">
          <strong>TSRM</strong>
          <span>공사관리</span>
        </div>
        <nav>
          <span>종합현황</span>
          <strong>공사운영현황</strong>
          <span>협력사 일정</span>
          <span>보고자료</span>
        </nav>
      </aside>
      <section className="workspace" data-view={mode}>
        {children}
      </section>
    </main>
  );
}

export default function Home() {
  const [items, setItems] = useState<Construction[]>(initialConstructions);
  const [selectedId, setSelectedId] = useState(initialConstructions[0].id);
  const [schedulesById, setSchedulesById] = useState<Record<string, ScheduleItem[]>>(() =>
    Object.fromEntries(initialConstructions.map((construction) => [construction.id, buildDefaultSchedule(construction)])),
  );
  const [dailyPlanRows, setDailyPlanRows] = useState<DailyPlanRow[]>(() =>
    getItemsOnDate(initialConstructions, todayText).map((item, index) => buildDailyPlanRow(item, index)),
  );
  const [dailyPlanRegionFilter, setDailyPlanRegionFilter] = useState<DailyPlanRegionFilter>("전체");
  const [mode, setMode] = useState<ViewMode>("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState<SystemMessage | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState("2026-07-13 08:30");
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("전체 지역");
  const [contractorFilter, setContractorFilter] = useState<ContractorFilter>("전체 협력사");
  const [stageFilter, setStageFilter] = useState<StageFilter>("전체 공정");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const selectedSchedule = schedulesById[selected.id] ?? buildDefaultSchedule(selected);
  const contractors = useMemo(
    () => Array.from(new Set(items.map((item) => item.contractor))).sort(),
    [items],
  );

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [item.id, item.name, item.region, item.contractor, item.stage, item.issue]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesRegion = regionFilter === "전체 지역" || item.region === regionFilter;
      const matchesContractor = contractorFilter === "전체 협력사" || item.contractor === contractorFilter;
      const matchesStage = stageFilter === "전체 공정" || item.stage === stageFilter;

      return matchesSearch && matchesRegion && matchesContractor && matchesStage;
    });

    return [...filtered].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const left = a[sortKey];
      const right = b[sortKey];

      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }

      return String(left).localeCompare(String(right), "ko-KR") * direction;
    });
  }, [contractorFilter, items, regionFilter, searchTerm, sortDirection, sortKey, stageFilter]);

  const dailyPlanKpis = useMemo(() => getDailyPlanKpis(items, dailyPlanRegionFilter), [dailyPlanRegionFilter, items]);

  const summaries = useMemo(() => {
    const totalLength = visibleItems.reduce((sum, item) => sum + item.lengthMeter, 0);
    const inProgress = visibleItems.filter((item) => !["공사 완료", "준공 완료"].includes(item.stage)).length;
    const constructionDone = visibleItems.filter((item) => item.stage === "공사 완료").length;
    const closed = visibleItems.filter((item) => item.stage === "준공 완료").length;
    const byRegion = summarizeBy(visibleItems, (item) => item.region);
    const byContractor = summarizeBy(visibleItems, (item) => item.contractor);
    const byStage = summarizeBy(visibleItems, (item) => item.stage);
    const topContractors = Object.entries(byContractor).sort((a, b) => b[1] - a[1]);

    return { totalLength, inProgress, constructionDone, closed, byRegion, byStage, topContractors };
  }, [visibleItems]);

  function saveConstruction(next: Construction) {
    if (!Number.isFinite(next.progress) || next.progress < 0 || next.progress > 100) {
      setSystemMessage({
        tone: "error",
        title: "저장할 수 없습니다",
        description: "공정률은 0부터 100 사이로 입력해야 합니다.",
      });
      return;
    }

    if (!Number.isFinite(next.lengthMeter) || next.lengthMeter <= 0) {
      setSystemMessage({
        tone: "error",
        title: "저장할 수 없습니다",
        description: "시공연장은 1m 이상으로 입력해야 합니다.",
      });
      return;
    }

    setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
    setSelectedId(next.id);
    setSystemMessage({
      tone: "success",
      title: "공사 상태가 저장되었습니다",
      description: `${next.id}의 공정단계와 특이사항이 화면에 반영되었습니다.`,
    });
    setMode("dashboard");
  }

  function saveSchedule(constructionId: string, nextSchedule: ScheduleItem[], issueNote?: string) {
    setSchedulesById((current) => ({ ...current, [constructionId]: nextSchedule }));
    setItems((current) =>
      current.map((item) => {
        if (item.id !== constructionId) return item;
        const firstSchedule = nextSchedule[0];
        const lastSchedule = nextSchedule[nextSchedule.length - 1];
        const completed = nextSchedule.filter((schedule) => schedule.status === "완료").length;
        const progress = Math.round((completed / nextSchedule.length) * 100);

        return {
          ...item,
          progress,
          startDate: firstSchedule?.startDate || item.startDate,
          dueDate: lastSchedule?.endDate || item.dueDate,
          issue: issueNote?.trim() || (nextSchedule.some((schedule) => schedule.status === "지연") ? "상세 일정 지연 단계 확인" : item.issue),
          issueLevel: nextSchedule.some((schedule) => schedule.status === "지연") ? "warning" : item.issueLevel,
          plan: {
            ...item.plan,
            period: `${firstSchedule?.startDate || item.startDate} ~ ${lastSchedule?.endDate || item.dueDate}`,
            content: nextSchedule.map((schedule) => `${schedule.step}(${schedule.status})`).join(", "),
          },
        };
      }),
    );
    setSystemMessage({
      tone: "success",
      title: "상세 일정이 저장되었습니다",
      description: `${constructionId} 단계별 일정이 캘린더와 리스트에 반영되었습니다.`,
    });
  }

  function downloadExcelMock() {
    if (visibleItems.length === 0) {
      setSystemMessage({
        tone: "error",
        title: "다운로드할 공사가 없습니다",
        description: "검색 또는 필터 조건을 초기화한 뒤 다시 시도해 주세요.",
      });
      return;
    }

    try {
      downloadTextFile(
        "TSRM_공사운영현황_2026-07-13.csv",
        buildExcelMock(visibleItems),
        "text/csv;charset=utf-8",
      );
      setSystemMessage({
        tone: "success",
        title: "Excel 다운로드 Mock을 생성했습니다",
        description: "현재 조회 조건에 맞는 공사 리스트가 CSV 파일로 내려받아집니다.",
      });
    } catch {
      setSystemMessage({
        tone: "error",
        title: "다운로드 중 오류가 발생했습니다",
        description: "브라우저 다운로드 권한을 확인한 뒤 다시 시도해 주세요.",
      });
    }
  }

  function downloadPdfMock() {
    if (visibleItems.length === 0) {
      setSystemMessage({
        tone: "error",
        title: "보고서에 포함할 공사가 없습니다",
        description: "현재 조회 결과가 비어 있어 PDF Mock을 만들 수 없습니다.",
      });
      return;
    }

    try {
      downloadTextFile(
        "TSRM_공사운영현황_2026-07-13.pdf.txt",
        buildPdfMock(visibleItems),
        "text/plain;charset=utf-8",
      );
      setSystemMessage({
        tone: "success",
        title: "PDF 다운로드 Mock을 생성했습니다",
        description: "실제 PDF 엔진 대신 시연용 텍스트 보고서가 내려받아집니다.",
      });
    } catch {
      setSystemMessage({
        tone: "error",
        title: "보고서 생성 중 오류가 발생했습니다",
        description: "잠시 후 다시 시도해 주세요.",
      });
    }
  }

  function downloadDailyPlanExcel() {
    if (dailyPlanRows.length === 0) {
      setSystemMessage({
        tone: "error",
        title: "일일공사계획에 포함할 공사가 없습니다",
        description: `${todayText} 기준으로 계획된 공사가 없어 Excel 파일을 만들 수 없습니다.`,
      });
      return;
    }

    try {
      downloadTextFile(
        `TSRM_일일공사계획_${todayText}.xls`,
        buildDailyPlanExcel(dailyPlanRows),
        "application/vnd.ms-excel;charset=utf-8",
      );
      setSystemMessage({
        tone: "success",
        title: "일일공사계획 Excel을 생성했습니다",
        description: `${todayText} 기준 오늘 계획 공사 ${dailyPlanRows.length}건이 포함되었습니다.`,
      });
    } catch {
      setSystemMessage({
        tone: "error",
        title: "Excel 생성 중 오류가 발생했습니다",
        description: "브라우저 다운로드 권한을 확인한 뒤 다시 시도해 주세요.",
      });
    }
  }

  function printDailyPlanPdf() {
    if (dailyPlanRows.length === 0) {
      setSystemMessage({
        tone: "error",
        title: "PDF로 출력할 공사가 없습니다",
        description: `${todayText} 기준으로 계획된 공사가 없습니다.`,
      });
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      setSystemMessage({
        tone: "error",
        title: "PDF 출력창을 열 수 없습니다",
        description: "브라우저 팝업 차단을 해제한 뒤 다시 눌러 주세요.",
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildDailyPlanPrintHtml(dailyPlanRows, dailyPlanKpis, dailyPlanRegionFilter));
    printWindow.document.close();
    setSystemMessage({
      tone: "success",
      title: "일일공사계획 PDF 출력창을 열었습니다",
      description: "인쇄창에서 대상 프린터를 PDF 저장으로 선택하면 PDF 파일로 저장됩니다.",
    });
  }

  function resetFilters() {
    setSearchTerm("");
    setRegionFilter("전체 지역");
    setContractorFilter("전체 협력사");
    setStageFilter("전체 공정");
    setSortKey("dueDate");
    setSortDirection("asc");
    setSystemMessage({
      tone: "info",
      title: "조회 조건을 초기화했습니다",
      description: "전체 공사 기준으로 대시보드를 다시 표시합니다.",
    });
  }

  function refreshDashboard() {
    setIsLoading(true);
    setSystemMessage({
      tone: "info",
      title: "공사현황을 갱신하는 중입니다",
      description: "PoC에서는 더미데이터를 기준으로 최신 조회 시간을 갱신합니다.",
    });

    window.setTimeout(() => {
      setLastSyncedAt("2026-07-13 09:00");
      setIsLoading(false);
      setSystemMessage({
        tone: "success",
        title: "공사현황 갱신 완료",
        description: "전체 발주 현황과 공정별 KPI를 다시 계산했습니다.",
      });
    }, 650);
  }

  if (mode === "detail") {
    return (
      <AppShell mode={mode}>
        <DetailScreen
          construction={selected}
          schedule={selectedSchedule}
          onBack={() => setMode("dashboard")}
          onSaveSchedule={saveSchedule}
        />
      </AppShell>
    );
  }

  if (mode === "report") {
    return (
      <AppShell mode={mode}>
        <ReportScreen
          items={visibleItems}
          onBack={() => setMode("dashboard")}
          onDownloadExcel={downloadExcelMock}
          onDownloadPdf={downloadPdfMock}
        />
      </AppShell>
    );
  }

  if (mode === "dailyPlan") {
    return (
      <AppShell mode={mode}>
        <DailyPlanScreenV2
          rows={dailyPlanRows}
          sourceItems={items}
          kpis={dailyPlanKpis}
          regionFilter={dailyPlanRegionFilter}
          onChangeRegionFilter={setDailyPlanRegionFilter}
          onChangeRows={setDailyPlanRows}
          onBack={() => setMode("dashboard")}
          onDownloadExcel={downloadDailyPlanExcel}
          onPrintPdf={printDailyPlanPdf}
        />
      </AppShell>
    );
  }

  return (
    <AppShell mode={mode}>
      <header className="topBar">
        <div>
          <p>공사관리담당자 업무화면</p>
          <h1>TSRM 공사운영현황</h1>
          <small>최종 갱신 {lastSyncedAt}</small>
        </div>
        <button className="resetButton" type="button" onClick={refreshDashboard} disabled={isLoading}>
          {isLoading ? "갱신 중" : "새로고침"}
        </button>
      </header>

      {systemMessage ? <SystemBanner message={systemMessage} onClose={() => setSystemMessage(null)} /> : null}

      <section className="metricGrid" aria-label="전체 발주 핵심 지표">
        <MetricCard
          label="전체 발주 건"
          value={`${visibleItems.length}건`}
          note={`총 시공연장 ${formatNumber(summaries.totalLength)}m`}
        />
        <MetricCard label="진행중 공사" value={`${summaries.inProgress}건`} note="착공 예정부터 표층 포장까지" />
        <MetricCard label="공사 완료" value={`${summaries.constructionDone}건`} note="현장 공정 완료 상태" />
        <MetricCard label="준공 완료" value={`${summaries.closed}건`} note="준공 처리까지 완료" />
      </section>

      <section className="quickActions quickActionsTop" aria-label="Quick Action">
        <button type="button" onClick={() => setMode("report")}>
          보고자료 생성
        </button>
        <button type="button" onClick={() => setMode("dailyPlan")}>
          일일공사계획 생성
        </button>
        <button type="button" onClick={downloadExcelMock}>
          엑셀 다운로드
        </button>
        <button type="button" onClick={() => setSystemMessage({
          tone: "info",
          title: "리스트에서 바로 수정합니다",
          description: "아래 공사 리스트의 수정 버튼을 누르면 해당 행에서 바로 수정할 수 있습니다.",
        })}>
          수정 안내
        </button>
      </section>

      <section className="dashboardGrid" aria-label="현황 분석">
        <article className="panelCard">
          <div className="sectionTitle compact">
            <h2>지역별 현황</h2>
            <span>익산시 / 정읍시</span>
          </div>
          {Object.entries(summaries.byRegion).map(([region, count]) => (
            <button
              className={`drillButton ${regionFilter === region ? "active" : ""}`}
              key={region}
              type="button"
              onClick={() => setRegionFilter(region as RegionFilter)}
            >
              <SummaryBar label={region} value={count} total={visibleItems.length} />
            </button>
          ))}
        </article>

        <article className="panelCard">
          <div className="sectionTitle compact">
            <h2>협력사별 현황</h2>
            <span>시공사 기준</span>
          </div>
          <div className="contractorGrid">
            {summaries.topContractors.map(([contractor, count]) => (
              <button
                className={contractorFilter === contractor ? "active" : ""}
                key={contractor}
                type="button"
                onClick={() => setContractorFilter(contractor as ContractorFilter)}
              >
                <span>{contractor}</span>
                <strong>{count}</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="panelCard stagePanel">
          <div className="sectionTitle compact">
            <h2>공정단계별 현황</h2>
            <span>표준 공정 순서</span>
          </div>
          <div className="stageFlow">
            {processStages.map((stage) => (
              <button className={stageFilter === stage ? "active" : ""} key={stage} type="button" onClick={() => setStageFilter(stage)}>
                <span>{stage}</span>
                <strong>{summaries.byStage[stage] ?? 0}건</strong>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="quickActions quickActionsMain panelCard" aria-label="보고 및 계획 생성">
        <div>
          <p>보고 및 계획</p>
          <h2>자료 생성</h2>
          <span>공정 현황을 확인한 뒤 필요한 자료를 생성합니다.</span>
        </div>
        <button type="button" onClick={() => setMode("report")}>
          보고자료 생성
        </button>
        <button type="button" onClick={() => setMode("dailyPlan")}>
          일일공사계획 생성
        </button>
      </section>

      <ConstructionTable
        contractorFilter={contractorFilter}
        contractors={contractors}
        isLoading={isLoading}
        items={visibleItems}
        onContractorFilterChange={setContractorFilter}
        onOpen={(item) => {
          setSelectedId(item.id);
          setMode("detail");
        }}
        onSelect={(item) => setSelectedId(item.id)}
        onRegionFilterChange={setRegionFilter}
        onResetFilters={resetFilters}
        onSave={saveConstruction}
        onSearchTermChange={setSearchTerm}
        onSort={(nextKey) => {
          if (sortKey === nextKey) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
            return;
          }
          setSortKey(nextKey);
          setSortDirection(nextKey === "progress" || nextKey === "lengthMeter" ? "desc" : "asc");
        }}
        onStageFilterChange={setStageFilter}
        regionFilter={regionFilter}
        searchTerm={searchTerm}
        selectedId={selected?.id}
        stageFilter={stageFilter}
        sortDirection={sortDirection}
        sortKey={sortKey}
      />

      <OperationsBottomBoard
        items={visibleItems}
        onOpen={(item) => {
          setSelectedId(item.id);
          setMode("detail");
        }}
      />
    </AppShell>
  );
}

function OperationsBottomBoard({
  items,
  onOpen,
}: {
  items: Construction[];
  onOpen: (item: Construction) => void;
}) {
  const [focusedDate, setFocusedDate] = useState(todayText);
  const [popup, setPopup] = useState<{ date: string; x: number; y: number } | null>(null);
  const [mapPopup, setMapPopup] = useState<{ item: Construction; x: number; y: number } | null>(null);
  const monthDays = getMonthDaysFromItems(items);
  const todayItems = getItemsOnDate(items, todayText);
  const popupItems = popup ? getItemsOnDate(items, popup.date) : [];

  return (
    <section className="bottomOpsGrid" aria-label="하단 일정 및 지도">
      <article className="panelCard opsCalendarPanel">
        <div className="sectionTitle compact">
          <div>
            <p>월간 공사 일정</p>
            <h2>{formatMonthTitle(items[0]?.startDate ?? todayText)}</h2>
          </div>
          <span>익산 / 정읍 건수</span>
        </div>
        <div className="miniWeekdays" aria-hidden="true">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="opsCalendarGrid">
          {monthDays.map((day, index) => {
            const dayItems = day ? getItemsOnDate(items, day) : [];
            const counts = summarizeRegionCounts(dayItems);

            return (
              <button
                className={`opsCalendarCell ${day ? "" : "blank"} ${day === todayText ? "today" : ""} ${day === focusedDate ? "focused" : ""}`}
                disabled={!day}
                key={`${day ?? "blank"}-${index}`}
                onClick={() => {
                  if (day) setFocusedDate(day);
                }}
                onFocus={() => {
                  if (day) setFocusedDate(day);
                }}
                onMouseEnter={(event) => {
                  if (!day) return;
                  setFocusedDate(day);
                  setPopup({ date: day, x: event.clientX + 14, y: event.clientY + 14 });
                }}
                onMouseLeave={() => {
                  setPopup(null);
                }}
                type="button"
              >
                {day ? <strong>{Number(day.slice(-2))}</strong> : null}
                {dayItems.length > 0 ? (
                  <div>
                    <span>익산 {counts.익산시}건</span>
                    <span>정읍 {counts.정읍시}건</span>
                  </div>
                ) : day ? <small>일정 없음</small> : null}
              </button>
            );
          })}
        </div>
        {popup ? (
          <div
            className="opsDatePopup"
            style={{ left: popup.x, top: popup.y }}
            onMouseEnter={() => setPopup(popup)}
            onMouseLeave={() => setPopup(null)}
          >
            <div className="opsDatePopupHeader">
              <strong>{popup.date}</strong>
              <span>{popupItems.length}건</span>
            </div>
            {popupItems.length > 0 ? (
              <div className="opsDatePopupList">
                {popupItems.slice(0, 5).map((item) => (
                  <button key={item.id} type="button" onClick={() => onOpen(item)}>
                    <strong>{item.name}</strong>
                    <span>{item.region} · {item.contractor} · {item.stage}</span>
                    <small>{item.startDate} ~ {item.dueDate}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p>등록된 일정이 없습니다.</p>
            )}
          </div>
        ) : null}
      </article>

      <article className="panelCard todayMapPanel">
        <div className="sectionTitle compact">
          <div>
            <p>오늘 공사 지도</p>
            <h2>{todayText} 진행 공사</h2>
          </div>
          <span>{todayItems.length}건</span>
        </div>
        <div className="todayMapCanvas" aria-label="오늘 공사 위치 지도 Mock">
          <div className="mapGrid" />
          <div className="routeLine" />
          {todayItems.map((item, index) => (
            <button
              className={`todayMapMarker ${item.issueLevel}`}
              aria-label={`${item.name} 지도 마커`}
              key={item.id}
              onClick={() => onOpen(item)}
              onFocus={(event) => setMapPopup({ item, x: event.currentTarget.getBoundingClientRect().left + 18, y: event.currentTarget.getBoundingClientRect().top + 18 })}
              onMouseEnter={(event) => setMapPopup({ item, x: event.clientX + 14, y: event.clientY + 14 })}
              onMouseLeave={() => setMapPopup(null)}
              style={{
                left: `${18 + (index % 4) * 20}%`,
                top: `${22 + Math.floor(index / 4) * 26}%`,
              }}
              type="button"
            />
          ))}
          {todayItems.length === 0 ? (
            <div className="todayMapEmpty">오늘 진행 중인 공사가 없습니다</div>
          ) : null}
        </div>
        {mapPopup ? (
          <div
            className="opsDatePopup mapMarkerPopup"
            style={{ left: mapPopup.x, top: mapPopup.y }}
            onMouseEnter={() => setMapPopup(mapPopup)}
            onMouseLeave={() => setMapPopup(null)}
          >
            <div className="opsDatePopupHeader">
              <strong>{mapPopup.item.id}</strong>
              <span>{mapPopup.item.region}</span>
            </div>
            <div className="opsDatePopupList">
              <button type="button" onClick={() => onOpen(mapPopup.item)}>
                <strong>{mapPopup.item.name}</strong>
                <span>{mapPopup.item.contractor} · {mapPopup.item.stage}</span>
                <small>{mapPopup.item.startDate} ~ {mapPopup.item.dueDate}</small>
              </button>
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function ConstructionTable({
  contractorFilter,
  contractors,
  isLoading,
  items,
  onContractorFilterChange,
  onRegionFilterChange,
  onResetFilters,
  onOpen,
  onSelect,
  onSave,
  onSearchTermChange,
  selectedId,
  onStageFilterChange,
  onSort,
  regionFilter,
  searchTerm,
  stageFilter,
  sortDirection,
  sortKey,
}: {
  contractorFilter: ContractorFilter;
  contractors: Construction["contractor"][];
  isLoading: boolean;
  items: Construction[];
  onContractorFilterChange: (value: ContractorFilter) => void;
  onRegionFilterChange: (value: RegionFilter) => void;
  onResetFilters: () => void;
  onOpen: (item: Construction) => void;
  onSelect: (item: Construction) => void;
  onSave: (construction: Construction) => void;
  onSearchTermChange: (value: string) => void;
  selectedId?: string;
  onStageFilterChange: (value: StageFilter) => void;
  onSort: (key: SortKey) => void;
  regionFilter: RegionFilter;
  searchTerm: string;
  stageFilter: StageFilter;
  sortDirection: SortDirection;
  sortKey: SortKey;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Construction | null>(null);
  const sortMark = (key: SortKey) => (sortKey === key ? (sortDirection === "asc" ? " ▲" : " ▼") : "");

  function startEdit(item: Construction) {
    setEditingId(item.id);
    setDraft(item);
    onSelect(item);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function updateDraft(next: Partial<Construction>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
  }

  function confirmEdit() {
    if (!draft) return;
    onSave({
      ...draft,
      plan: {
        ...draft.plan,
        period: `${draft.startDate} ~ ${draft.dueDate}`,
      },
    });
    cancelEdit();
  }

  return (
    <section className="tablePanel" aria-label="공사 리스트">
      <div className="sectionTitle">
        <div>
          <p>공사 리스트</p>
          <h2>공사별 진행 현황</h2>
        </div>
        <span>{items.length}건</span>
      </div>
      <div className="listFilterBar" aria-label="공사 리스트 검색 및 필터">
        <input
          aria-label="공사 검색"
          placeholder="공사번호, 공사명, 협력사, 특이사항 검색"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
        />
        <select
          aria-label="지역 필터"
          value={regionFilter}
          onChange={(event) => onRegionFilterChange(event.target.value as RegionFilter)}
        >
          <option>전체 지역</option>
          <option>익산시</option>
          <option>정읍시</option>
        </select>
        <select
          aria-label="협력사 필터"
          value={contractorFilter}
          onChange={(event) => onContractorFilterChange(event.target.value as ContractorFilter)}
        >
          <option>전체 협력사</option>
          {contractors.map((contractor) => (
            <option key={contractor}>{contractor}</option>
          ))}
        </select>
        <select
          aria-label="공정 필터"
          value={stageFilter}
          onChange={(event) => onStageFilterChange(event.target.value as StageFilter)}
        >
          <option>전체 공정</option>
          {processStages.map((stage) => (
            <option key={stage}>{stage}</option>
          ))}
        </select>
        <button className="resetButton" type="button" onClick={onResetFilters}>
          초기화
        </button>
      </div>
      <div className="listFilterSummary" aria-label="현재 조회 조건">
        <span>조회 {items.length}건</span>
        <span>{regionFilter}</span>
        <span>{contractorFilter}</span>
        <span>{stageFilter}</span>
        {searchTerm.trim() ? <span>검색: {searchTerm.trim()}</span> : null}
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>공사번호</th>
              <th>공사명</th>
              <th>
                <button type="button" onClick={() => onSort("region")}>
                  지역{sortMark("region")}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => onSort("lengthMeter")}>
                  시공연장(m){sortMark("lengthMeter")}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => onSort("contractor")}>
                  협력사{sortMark("contractor")}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => onSort("stage")}>
                  공정단계{sortMark("stage")}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => onSort("progress")}>
                  공정률{sortMark("progress")}
                </button>
              </th>
              <th>착공일</th>
              <th>
                <button type="button" onClick={() => onSort("dueDate")}>
                  완료예정일{sortMark("dueDate")}
                </button>
              </th>
              <th>특이사항</th>
              <th>수정</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr className="skeletonRow" key={index}>
                  <td colSpan={11}>
                    <span />
                  </td>
                </tr>
              ))
            ) : null}
            {!isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <div className="emptyState">
                    <strong>조회된 공사가 없습니다</strong>
                    <span>검색어 또는 필터 조건을 조정하면 공사 리스트가 다시 표시됩니다.</span>
                  </div>
                </td>
              </tr>
            ) : null}
            {!isLoading && items.map((item) => {
              const isEditing = editingId === item.id && draft;

              if (isEditing) {
                return (
                  <tr key={item.id} className="clickableRow editingRow selectedRow">
                    <td data-label="공사번호">{draft.id}</td>
                    <td className="nameCell" data-label="공사명">{draft.name}</td>
                    <td data-label="지역">{draft.region}</td>
                    <td data-label="시공연장(m)">
                      <input
                        min="1"
                        type="number"
                        value={draft.lengthMeter}
                        onChange={(event) => updateDraft({ lengthMeter: Number(event.target.value) })}
                      />
                    </td>
                    <td data-label="협력사">
                      <select
                        value={draft.contractor}
                        onChange={(event) => updateDraft({ contractor: event.target.value as Construction["contractor"] })}
                      >
                        {contractors.map((contractor) => (
                          <option key={contractor}>{contractor}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="공정단계">
                      <select value={draft.stage} onChange={(event) => updateDraft({ stage: event.target.value as ProcessStage })}>
                        {processStages.map((stage) => (
                          <option key={stage}>{stage}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="공정률">
                      <input
                        max="100"
                        min="0"
                        type="number"
                        value={draft.progress}
                        onChange={(event) => updateDraft({ progress: Number(event.target.value) })}
                      />
                    </td>
                    <td data-label="착공일">
                      <input type="date" value={draft.startDate} onChange={(event) => updateDraft({ startDate: event.target.value })} />
                    </td>
                    <td data-label="완료예정일">
                      <input type="date" value={draft.dueDate} onChange={(event) => updateDraft({ dueDate: event.target.value })} />
                    </td>
                    <td data-label="특이사항">
                      <div className="inlineIssueEdit">
                        <input value={draft.issue} onChange={(event) => updateDraft({ issue: event.target.value })} />
                        <select value={draft.issueLevel} onChange={(event) => updateDraft({ issueLevel: event.target.value as AlertLevel })}>
                          <option value="critical">긴급</option>
                          <option value="warning">주의</option>
                          <option value="notice">확인</option>
                        </select>
                      </div>
                    </td>
                    <td data-label="수정">
                      <div className="rowActionGroup">
                        <button className="rowActionButton primaryRowAction" type="button" onClick={confirmEdit}>
                          확정
                        </button>
                        <button className="rowActionButton" type="button" onClick={cancelEdit}>
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={item.id}
                  className={`clickableRow ${selectedId === item.id ? "selectedRow" : ""}`}
                  onClick={() => onOpen(item)}
                >
                  <td data-label="공사번호">{item.id}</td>
                  <td className="nameCell" data-label="공사명">{item.name}</td>
                  <td data-label="지역">{item.region}</td>
                  <td data-label="시공연장(m)">{formatNumber(item.lengthMeter)}</td>
                  <td data-label="협력사">{item.contractor}</td>
                  <td data-label="공정단계">
                    <StatusBadge stage={item.stage} />
                  </td>
                  <td data-label="공정률">
                    <ProgressBar value={item.progress} />
                  </td>
                  <td data-label="착공일">{item.startDate}</td>
                  <td data-label="완료예정일">{item.dueDate}</td>
                  <td data-label="특이사항">
                    <span className={`issueBadge ${item.issueLevel}`}>{item.issue}</span>
                  </td>
                  <td data-label="수정">
                    <button
                      className="rowActionButton"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        startEdit(item);
                      }}
                    >
                      수정
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DetailScreen({
  construction,
  onBack,
  onSaveSchedule,
  schedule,
}: {
  construction: Construction;
  onBack: () => void;
  onSaveSchedule: (constructionId: string, schedule: ScheduleItem[], issueNote?: string) => void;
  schedule: ScheduleItem[];
}) {
  const [draftSchedule, setDraftSchedule] = useState<ScheduleItem[]>(schedule);
  const [selectedStep, setSelectedStep] = useState<ScheduleStep>(schedule[0]?.step ?? "인허가");
  const [selectedDate, setSelectedDate] = useState(schedule[0]?.startDate ?? construction.startDate);
  const [calendarAction, setCalendarAction] = useState<{ step: ScheduleStep; date: string } | null>(null);
  const [issueNote, setIssueNote] = useState(construction.issue);
  const selectedSchedule = draftSchedule.find((item) => item.step === selectedStep) ?? draftSchedule[0];
  const calendarDays = getDaysInMonth(construction.startDate);
  const completedCount = draftSchedule.filter((item) => item.status === "완료").length;

  function updateSchedule(step: ScheduleStep, next: Partial<ScheduleItem>) {
    setDraftSchedule((current) =>
      current.map((item) => (item.step === step ? { ...item, ...next } : item)),
    );
  }

  function save() {
    onSaveSchedule(construction.id, draftSchedule, issueNote);
  }

  function selectCalendarDate(dateText: string, schedules: ScheduleItem[]) {
    setSelectedDate(dateText);
    setCalendarAction(null);
    if (schedules[0]) {
      setSelectedStep(schedules[0].step);
    }
  }

  function assignStepToDate(step: ScheduleStep, dateText: string) {
    const current = draftSchedule.find((item) => item.step === step);
    const startDate = current?.startDate ? [current.startDate, dateText].sort()[0] : dateText;
    const endDate = current?.endDate ? [current.endDate, dateText].sort().at(-1) ?? dateText : dateText;

    setSelectedStep(step);
    setSelectedDate(dateText);
    setCalendarAction({ step, date: dateText });
    updateSchedule(step, { startDate, endDate });
  }

  function extendScheduleStep(step: ScheduleStep, dateText: string) {
    const current = draftSchedule.find((item) => item.step === step);
    const startDate = current?.startDate || dateText;
    const endDate = [startDate, dateText].sort().at(-1) ?? dateText;

    setSelectedStep(step);
    setSelectedDate(dateText);
    setCalendarAction({ step, date: dateText });
    updateSchedule(step, { startDate, endDate });
  }

  function clearScheduleStep(step: ScheduleStep) {
    updateSchedule(step, { startDate: "", endDate: "", status: "예정" });
    setCalendarAction(null);
    if (selectedStep === step) {
      setSelectedStep(scheduleSteps[0]);
    }
  }

  function clearAllScheduleSteps() {
    setDraftSchedule((current) =>
      current.map((item) => ({ ...item, startDate: "", endDate: "", status: "예정" })),
    );
    setCalendarAction(null);
    setSelectedStep(scheduleSteps[0]);
  }

  return (
    <>
      <header className="detailHeader">
        <div>
          <button className="textButton" type="button" onClick={onBack}>
            리스트로 돌아가기
          </button>
          <p>상세 일정관리</p>
          <h1>{construction.name}</h1>
        </div>
        <div className="detailActions">
          <StatusBadge stage={construction.stage} />
          <button type="button" onClick={save}>
            일정 저장
          </button>
        </div>
      </header>

      <section className="scheduleSummary">
        <InfoRow label="공사번호" value={construction.id} />
        <InfoRow label="지역" value={construction.region} />
        <InfoRow label="협력사" value={construction.contractor} />
        <InfoRow label="시공연장" value={`${formatNumber(construction.lengthMeter)}m`} />
        <InfoRow label="단계 완료" value={`${completedCount}/${draftSchedule.length}`} />
        <InfoRow label="전체 기간" value={`${draftSchedule[0]?.startDate} ~ ${draftSchedule.at(-1)?.endDate}`} />
      </section>

      <section className="scheduleWorkspace">
        <article className="panelCard scheduleCalendarPanel">
          <div className="sectionTitle compact">
            <div>
              <p>캘린더</p>
              <h2>{formatMonthTitle(construction.startDate)}</h2>
            </div>
            <span>오른쪽 단계 버튼을 날짜로 끌어 배치</span>
          </div>
          <div className="calendarWeekdays" aria-hidden="true">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendarGrid" aria-label="상세 일정 캘린더">
            {calendarDays.map((day, index) => {
              const daySchedules = day
                ? draftSchedule
                    .filter((item) => item.startDate && item.endDate && isDateInRange(day, item.startDate, item.endDate))
                    .sort((a, b) => scheduleSteps.indexOf(a.step) - scheduleSteps.indexOf(b.step))
                : [];

              return (
                <div
                  className={`calendarCell ${day ? "" : "blank"} ${day === selectedDate ? "selectedDate" : ""}`}
                  key={`${day ?? "blank"}-${index}`}
                  onClick={() => {
                    if (day) selectCalendarDate(day, daySchedules);
                  }}
                  onKeyDown={(event) => {
                    if (day && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      selectCalendarDate(day, daySchedules);
                    }
                  }}
                  role={day ? "button" : undefined}
                  tabIndex={day ? 0 : undefined}
                  onDragOver={(event) => {
                    if (day) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (!day) return;
                    event.preventDefault();
                    const payload = event.dataTransfer.getData("text/plain");
                    const [action, rawStep] = payload.includes(":") ? payload.split(":") : ["assign", payload];
                    const step = rawStep as ScheduleStep;
                    if (scheduleSteps.includes(step)) {
                      if (action === "resize") {
                        extendScheduleStep(step, day);
                      } else {
                        assignStepToDate(step, day);
                      }
                    }
                  }}
                >
                  {day ? <strong>{Number(day.slice(-2))}</strong> : null}
                  <div>
                    {daySchedules.map((item) => {
                      const isActionOpen = calendarAction?.step === item.step && calendarAction.date === day;

                      return (
                        <div
                          className="calendarChipSlot"
                          key={item.step}
                          style={{ gridRow: scheduleSteps.indexOf(item.step) + 1 }}
                        >
                          <button
                            className={`calendarChip ${scheduleStepTone[item.step]} ${getScheduleBarClass(item, day ?? "")}`}
                            draggable
                            type="button"
                            title="이 막대를 다른 날짜로 드래그하면 일정 기간이 늘어납니다"
                            onDragStart={(event) => {
                              event.stopPropagation();
                              event.dataTransfer.setData("text/plain", `resize:${item.step}`);
                              event.dataTransfer.effectAllowed = "move";
                              setSelectedStep(item.step);
                              setSelectedDate(day ?? selectedDate);
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedDate(day ?? selectedDate);
                              setSelectedStep(item.step);
                              setCalendarAction(isActionOpen ? null : { step: item.step, date: day ?? selectedDate });
                            }}
                          >
                            {item.step}
                          </button>
                          {isActionOpen ? (
                            <button
                              className="calendarDeleteButton"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                clearScheduleStep(item.step);
                              }}
                            >
                              삭제
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <aside className="panelCard scheduleEditorPanel stagePalettePanel">
          <div className="sectionTitle compact">
            <div>
              <p>단계 배치</p>
              <h2>일정 단계</h2>
            </div>
            <span>2열 x 4행</span>
          </div>
          <button className="clearAllScheduleButton" type="button" onClick={clearAllScheduleSteps}>
            전부 삭제
          </button>
          <div className="stageButtonGrid" aria-label="드래그 가능한 일정 단계">
            {draftSchedule.map((item) => (
              <div
                className={`stageDragButton ${scheduleStepTone[item.step]} ${selectedStep === item.step ? "active" : ""}`}
                draggable
                key={item.step}
                onClick={() => setSelectedStep(item.step)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", `assign:${item.step}`);
                  event.dataTransfer.effectAllowed = "move";
                  setSelectedStep(item.step);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedStep(item.step);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <strong>{item.step}</strong>
                <span>{item.startDate || "미배정"}</span>
                <em className={`scheduleStatus status${item.status}`}>{item.status}</em>
                <button
                  className="deleteStageButton"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    clearScheduleStep(item.step);
                  }}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
          <div className="stageDropHint">
            <strong>{selectedSchedule.step}</strong>
            <span>{selectedSchedule.startDate} ~ {selectedSchedule.endDate}</span>
          </div>
        </aside>
      </section>

      <section className="detailMemoPanel panelCard">
        <div className="sectionTitle compact">
          <div>
            <p>메모</p>
            <h2>특이사항</h2>
          </div>
          <span>메인화면 특이사항과 연동</span>
        </div>
        <textarea
          aria-label="특이사항 메모"
          value={issueNote}
          onChange={(event) => setIssueNote(event.target.value)}
          placeholder="현장 특이사항, 지연 사유, 협의 필요 내용을 작성하세요."
        />
        <div className="memoActions">
          <span>저장하면 공사 리스트의 특이사항에 반영됩니다.</span>
          <button className="saveScheduleButton" type="button" onClick={save}>
            메모 및 일정 저장
          </button>
        </div>
      </section>
    </>
  );
}

function DailyPlanScreenV2({
  rows,
  sourceItems,
  kpis,
  regionFilter,
  onChangeRegionFilter,
  onChangeRows,
  onBack,
  onDownloadExcel,
  onPrintPdf,
}: {
  rows: DailyPlanRow[];
  sourceItems: Construction[];
  kpis: DailyPlanKpis;
  regionFilter: DailyPlanRegionFilter;
  onChangeRegionFilter: React.Dispatch<React.SetStateAction<DailyPlanRegionFilter>>;
  onChangeRows: React.Dispatch<React.SetStateAction<DailyPlanRow[]>>;
  onBack: () => void;
  onDownloadExcel: () => void;
  onPrintPdf: () => void;
}) {
  const [selectedRowId, setSelectedRowId] = useState(rows[0]?.localId ?? "");
  const [editingRowId, setEditingRowId] = useState("");
  const [checkedRowIds, setCheckedRowIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"list" | "manual">("list");
  const [sourceSearch, setSourceSearch] = useState("");
  const [manualDraft, setManualDraft] = useState<DailyPlanRow>(() => createEmptyDailyPlanRow());
  const selectedRow = rows.find((row) => row.localId === selectedRowId) ?? rows[0];
  const regions: DailyPlanRegionFilter[] = ["전체", ...Array.from(new Set(sourceItems.map((item) => item.region)))];
  const maxKpi = Math.max(kpis.total, kpis.ready, kpis.working, kpis.done, 1);
  const kpiCards = [
    { label: "전체 발주공사", value: kpis.total },
    { label: "착공 준비 공사", value: kpis.ready },
    { label: "공사 중인 공사", value: kpis.working },
    { label: "공사 완료 공사", value: kpis.done },
  ];
  const normalizedSearch = sourceSearch.trim().toLowerCase();
  const filteredSourceItems = sourceItems.filter((item) =>
    normalizedSearch.length === 0 ||
    [item.id, item.name, item.region, item.contractor, item.stage].join(" ").toLowerCase().includes(normalizedSearch),
  );

  function updateRow(localId: string, patch: Partial<DailyPlanRow>) {
    onChangeRows((current) => current.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  }

  function startEdit(localId: string) {
    setSelectedRowId(localId);
    setEditingRowId(localId);
  }

  function confirmEdit() {
    setEditingRowId("");
  }

  function deleteRow(localId: string) {
    onChangeRows((current) => {
      const nextRows = current.filter((row) => row.localId !== localId);
      if (selectedRowId === localId) {
        setSelectedRowId(nextRows[0]?.localId ?? "");
      }
      if (editingRowId === localId) {
        setEditingRowId("");
      }
      setCheckedRowIds((checked) => checked.filter((id) => id !== localId));
      return nextRows;
    });
  }

  function toggleCheckedRow(localId: string) {
    setCheckedRowIds((current) =>
      current.includes(localId) ? current.filter((id) => id !== localId) : [...current, localId],
    );
    setSelectedRowId(localId);
  }

  function deleteCheckedOrSelectedRows() {
    if (checkedRowIds.length > 0) {
      onChangeRows((current) => {
        const checkedSet = new Set(checkedRowIds);
        const nextRows = current.filter((row) => !checkedSet.has(row.localId));
        setSelectedRowId(nextRows[0]?.localId ?? "");
        setEditingRowId("");
        setCheckedRowIds([]);
        return nextRows;
      });
      return;
    }

    if (selectedRow) {
      deleteRow(selectedRow.localId);
    }
  }

  function openAddModal(mode: "list" | "manual" = "list") {
    setAddMode(mode);
    setManualDraft(createEmptyDailyPlanRow());
    setSourceSearch("");
    setIsAddModalOpen(true);
  }

  function addSourceItem(item: Construction) {
    const nextRow = {
      ...buildDailyPlanRow(item, rows.length),
      localId: `daily-${item.id}-${Date.now()}`,
    };

    onChangeRows((current) => [...current, nextRow]);
    setSelectedRowId(nextRow.localId);
    setEditingRowId(nextRow.localId);
    setIsAddModalOpen(false);
  }

  function addManualRow() {
    const nextRow = {
      ...manualDraft,
      localId: `daily-manual-${Date.now()}`,
    };

    onChangeRows((current) => [...current, nextRow]);
    setSelectedRowId(nextRow.localId);
    setEditingRowId(nextRow.localId);
    setIsAddModalOpen(false);
  }

  return (
    <>
      <header className="detailHeader dailyPlanHeader">
        <div>
          <button className="textButton" type="button" onClick={onBack}>
            대시보드로 돌아가기
          </button>
          <p>일일공사계획 생성</p>
          <h1>{todayText} 일일공사계획</h1>
        </div>
        <div className="detailActions">
          <button type="button" onClick={onDownloadExcel}>
            Excel 다운로드
          </button>
          <button type="button" onClick={onPrintPdf}>
            PDF 출력
          </button>
        </div>
      </header>

      <section className="panelCard dailyPlanKpiPanel">
        <div className="dailyPlanKpiTop">
          <div>
            <p>권역별 공사 요약</p>
            <h2>{regionFilter} 현황</h2>
          </div>
          <div className="dailyRegionTabs" aria-label="권역 선택">
            {regions.map((region) => (
              <button
                className={regionFilter === region ? "active" : ""}
                key={region}
                type="button"
                onClick={() => onChangeRegionFilter(region)}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
        <div className="dailyPlanKpiGrid">
          {kpiCards.map((card) => (
            <article className="dailyPlanKpiCard" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}건</strong>
              <i>
                <b style={{ width: `${Math.round((card.value / maxKpi) * 100)}%` }} />
              </i>
            </article>
          ))}
        </div>
      </section>

      <section className="panelCard dailyListPanel" aria-label="일일공사계획 리스트">
        <div className="dailyListTop">
          <div>
            <p>계획 리스트</p>
            <h2>오늘 공사계획 {rows.length}건</h2>
          </div>
          <div className="dailyPlanIconActions">
            <button className="dailyIconButton add" type="button" onClick={() => openAddModal("list")} aria-label="공사 추가">
              +
            </button>
            <button className="dailyIconButton danger" type="button" onClick={deleteCheckedOrSelectedRows} disabled={!selectedRow && checkedRowIds.length === 0}>
              {checkedRowIds.length > 0 ? `${checkedRowIds.length}건 삭제` : "선택 삭제"}
            </button>
          </div>
        </div>

        <div className="dailyPlanMetaStrip">
          <span>수정 버튼을 누르면 해당 줄만 편집됩니다.</span>
          <span>변경 후 확정을 눌러 계획을 잠그세요.</span>
        </div>

        {rows.length === 0 ? (
          <div className="emptyTableState dailyEmptyState">
            <strong>일일공사계획 행이 없습니다</strong>
            <span>+ 버튼에서 전체 공사 리스트를 검색해 가져오거나 수기로 입력하세요.</span>
          </div>
        ) : (
          <div className="dailyPlanTableShell">
            <table>
              <thead>
                <tr>
                  <th className="dailyCheckColumn">선택</th>
                  <th>지역</th>
                  <th>공사번호</th>
                  <th>공사명</th>
                  <th>공사감독</th>
                  <th>시공관리자</th>
                  <th>오늘작업</th>
                  <th>비고</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelected = row.localId === selectedRow?.localId;
                  const isEditing = row.localId === editingRowId;
                  const isChecked = checkedRowIds.includes(row.localId);

                  return (
                    <tr
                      className={isSelected ? "selectedDailyRow" : ""}
                      key={row.localId}
                      onClick={() => setSelectedRowId(row.localId)}
                    >
                      <td className="dailyCheckColumn">
                        <label className="dailyRowCheck" onClick={(event) => event.stopPropagation()}>
                          <input
                            aria-label={`${row.constructionId || row.constructionName || "공사"} 선택`}
                            checked={isChecked}
                            type="checkbox"
                            onChange={() => toggleCheckedRow(row.localId)}
                          />
                          <span />
                        </label>
                      </td>
                      <td>
                        {isEditing ? (
                          <input value={row.region} onChange={(event) => updateRow(row.localId, { region: event.target.value })} />
                        ) : (
                          row.region
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input value={row.constructionId} onChange={(event) => updateRow(row.localId, { constructionId: event.target.value })} />
                        ) : (
                          row.constructionId
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input value={row.constructionName} onChange={(event) => updateRow(row.localId, { constructionName: event.target.value })} />
                        ) : (
                          row.constructionName
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input value={row.supervisor} onChange={(event) => updateRow(row.localId, { supervisor: event.target.value })} />
                        ) : (
                          row.supervisor
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input value={row.siteManager} onChange={(event) => updateRow(row.localId, { siteManager: event.target.value })} />
                        ) : (
                          row.siteManager
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select value={row.todayWork} onChange={(event) => updateRow(row.localId, { todayWork: event.target.value as DailyPlanWork })}>
                            {dailyPlanWorkOptions.map((work) => (
                              <option key={work}>{work}</option>
                            ))}
                          </select>
                        ) : (
                          row.todayWork
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <textarea value={row.note} onChange={(event) => updateRow(row.localId, { note: event.target.value })} />
                        ) : (
                          row.note || "-"
                        )}
                      </td>
                      <td>
                        <div className="dailyRowActions">
                          {isEditing ? (
                            <button type="button" onClick={confirmEdit}>
                              확정
                            </button>
                          ) : (
                            <button type="button" onClick={() => startEdit(row.localId)}>
                              수정
                            </button>
                          )}
                          <button type="button" onClick={() => deleteRow(row.localId)}>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAddModalOpen ? (
        <div className="dailyModalBackdrop" role="presentation" onMouseDown={() => setIsAddModalOpen(false)}>
          <section className="dailyAddModal dailyAddModalWide" role="dialog" aria-modal="true" aria-label="공사 추가" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dailyAddModalTop">
              <div>
                <p>공사 추가</p>
                <h2>{addMode === "list" ? "전체 공사 리스트에서 가져오기" : "수기 입력"}</h2>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>

            <div className="dailyAddModeTabs">
              <button className={addMode === "list" ? "active" : ""} type="button" onClick={() => setAddMode("list")}>
                공사 리스트
              </button>
              <button className={addMode === "manual" ? "active" : ""} type="button" onClick={() => setAddMode("manual")}>
                수기 입력
              </button>
            </div>

            {addMode === "list" ? (
              <div className="dailySourcePicker">
                <input
                  aria-label="공사 검색"
                  placeholder="공사번호, 공사명, 지역, 협력사 검색"
                  value={sourceSearch}
                  onChange={(event) => setSourceSearch(event.target.value)}
                />
                <div className="dailySourcePickerList">
                  {filteredSourceItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => addSourceItem(item)}>
                      <span>
                        <strong>{item.id}</strong>
                        <em>{item.region} · {item.contractor} · {item.stage}</em>
                      </span>
                      <small>{item.name}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="dailyAddForm">
                <label>
                  <span>지역</span>
                  <input value={manualDraft.region} onChange={(event) => setManualDraft((current) => ({ ...current, region: event.target.value }))} />
                </label>
                <label>
                  <span>공사번호</span>
                  <input value={manualDraft.constructionId} onChange={(event) => setManualDraft((current) => ({ ...current, constructionId: event.target.value }))} />
                </label>
                <label className="wide">
                  <span>공사명</span>
                  <input value={manualDraft.constructionName} onChange={(event) => setManualDraft((current) => ({ ...current, constructionName: event.target.value }))} />
                </label>
                <label>
                  <span>공사감독</span>
                  <input value={manualDraft.supervisor} onChange={(event) => setManualDraft((current) => ({ ...current, supervisor: event.target.value }))} />
                </label>
                <label>
                  <span>시공관리자</span>
                  <input value={manualDraft.siteManager} onChange={(event) => setManualDraft((current) => ({ ...current, siteManager: event.target.value }))} />
                </label>
                <label>
                  <span>오늘작업</span>
                  <select value={manualDraft.todayWork} onChange={(event) => setManualDraft((current) => ({ ...current, todayWork: event.target.value as DailyPlanWork }))}>
                    {dailyPlanWorkOptions.map((work) => (
                      <option key={work}>{work}</option>
                    ))}
                  </select>
                </label>
                <label className="wide">
                  <span>비고</span>
                  <textarea value={manualDraft.note} onChange={(event) => setManualDraft((current) => ({ ...current, note: event.target.value }))} />
                </label>
              </div>
            )}

            <div className="dailyAddModalActions">
              <button type="button" onClick={() => setIsAddModalOpen(false)}>
                취소
              </button>
              {addMode === "manual" ? (
                <button type="button" onClick={addManualRow}>
                  추가
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DailyPlanScreen({
  rows,
  sourceItems,
  onChangeRows,
  onBack,
  onDownloadExcel,
  onPrintPdf,
}: {
  rows: DailyPlanRow[];
  sourceItems: Construction[];
  onChangeRows: React.Dispatch<React.SetStateAction<DailyPlanRow[]>>;
  onBack: () => void;
  onDownloadExcel: () => void;
  onPrintPdf: () => void;
}) {
  const [selectedRowId, setSelectedRowId] = useState(rows[0]?.localId ?? "");
  const [checkedSourceIds, setCheckedSourceIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState<DailyPlanRow>(() => createEmptyDailyPlanRow());
  const selectedRow = rows.find((row) => row.localId === selectedRowId) ?? rows[0];
  const byRegion = rows.reduce<Record<string, number>>((summary, row) => {
    const region = row.region || "미지정";
    summary[region] = (summary[region] ?? 0) + 1;
    return summary;
  }, {});
  const addedSourceIds = new Set(rows.map((row) => row.sourceConstructionId).filter(Boolean));

  function updateRow(localId: string, patch: Partial<DailyPlanRow>) {
    onChangeRows((current) => current.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  }

  function deleteSelectedRow() {
    if (!selectedRow) return;

    onChangeRows((current) => {
      const nextRows = current.filter((row) => row.localId !== selectedRow.localId);
      setSelectedRowId(nextRows[0]?.localId ?? "");
      return nextRows;
    });
  }

  function toggleSource(sourceId: string) {
    setCheckedSourceIds((current) =>
      current.includes(sourceId) ? current.filter((id) => id !== sourceId) : [...current, sourceId],
    );
  }

  function addCheckedSources() {
    const checkedItems = sourceItems.filter((item) => checkedSourceIds.includes(item.id));
    if (checkedItems.length === 0) return;

    const nextRows = checkedItems.map((item, index) => ({
      ...buildDailyPlanRow(item, rows.length + index),
      localId: `daily-${item.id}-${Date.now()}-${index}`,
    }));

    onChangeRows((current) => [...current, ...nextRows]);
    setSelectedRowId(nextRows[0]?.localId ?? selectedRowId);
    setCheckedSourceIds([]);
  }

  function openManualAdd() {
    setManualDraft(createEmptyDailyPlanRow());
    setIsAddModalOpen(true);
  }

  function addManualRow() {
    const nextRow = {
      ...manualDraft,
      localId: `daily-manual-${Date.now()}`,
    };

    onChangeRows((current) => [...current, nextRow]);
    setSelectedRowId(nextRow.localId);
    setIsAddModalOpen(false);
  }

  return (
    <>
      <header className="detailHeader dailyPlanHeader">
        <div>
          <button className="textButton" type="button" onClick={onBack}>
            대시보드로 돌아가기
          </button>
          <p>일일공사계획 생성</p>
          <h1>{todayText} 일일공사계획</h1>
        </div>
        <div className="detailActions">
          <button type="button" onClick={onDownloadExcel}>
            Excel 다운로드
          </button>
          <button type="button" onClick={onPrintPdf}>
            PDF 출력
          </button>
        </div>
      </header>

      <section className="dailyPlanSummary">
        <InfoRow label="계획 공사" value={`${rows.length}건`} />
        <InfoRow label="선택 후보" value={`${checkedSourceIds.length}건`} />
        <InfoRow label="오늘 작업" value={dailyPlanWorkOptions.join(" / ")} />
        {Object.entries(byRegion).map(([region, count]) => (
          <InfoRow key={region} label={`${region} 계획`} value={`${count}건`} />
        ))}
      </section>

      <section className="dailyPlanWorkspace" aria-label="일일공사계획 편집">
        <aside className="panelCard dailySourcePanel">
          <div className="sectionTitle compact">
            <div>
              <p>공사 리스트</p>
              <h2>오늘 대상 공사</h2>
            </div>
            <span>{sourceItems.length}건</span>
          </div>
          <div className="dailySourceList">
            {sourceItems.map((item) => {
              const isChecked = checkedSourceIds.includes(item.id);
              const isAdded = addedSourceIds.has(item.id);

              return (
                <label className={`dailySourceItem ${isChecked ? "checked" : ""} ${isAdded ? "added" : ""}`} key={item.id}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSource(item.id)}
                    disabled={isAdded}
                  />
                  <span>
                    <strong>{item.id}</strong>
                    <em>{item.region} · {item.stage}</em>
                  </span>
                  <small>{item.name}</small>
                </label>
              );
            })}
          </div>
          <button className="sourceAddButton" type="button" onClick={addCheckedSources} disabled={checkedSourceIds.length === 0}>
            체크한 공사 넣기
          </button>
        </aside>

        <section className="panelCard dailyPlanEditorPanel">
          <div className="dailyPlanEditorTop">
            <div>
              <p>TSRM Daily Construction Plan</p>
              <h2>일일공사계획 편집</h2>
            </div>
            <div className="dailyPlanIconActions">
              <button className="dailyIconButton add" type="button" onClick={openManualAdd} aria-label="공사 직접 추가">
                +
              </button>
              <button className="dailyIconButton danger" type="button" onClick={deleteSelectedRow} disabled={!selectedRow}>
                삭제
              </button>
            </div>
          </div>

          <div className="dailyPlanMetaStrip">
            <span>기준일 {todayText}</span>
            <span>선택 행을 클릭하면 표 안에서 바로 수정됩니다.</span>
          </div>

          {rows.length === 0 ? (
            <div className="emptyTableState dailyEmptyState">
              <strong>일일공사계획 행이 없습니다</strong>
              <span>왼쪽 공사 리스트를 체크해서 넣거나 + 버튼으로 직접 추가하세요.</span>
            </div>
          ) : (
            <div className="dailyPlanTableShell">
              <table>
                <thead>
                  <tr>
                    <th>지역</th>
                    <th>공사번호</th>
                    <th>공사명</th>
                    <th>공사감독</th>
                    <th>시공관리자</th>
                    <th>오늘작업</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isSelected = row.localId === selectedRow?.localId;

                    return (
                      <tr
                        className={isSelected ? "selectedDailyRow" : ""}
                        key={row.localId}
                        onClick={() => setSelectedRowId(row.localId)}
                      >
                        <td>
                          {isSelected ? (
                            <input
                              aria-label="지역"
                              value={row.region}
                              onChange={(event) => updateRow(row.localId, { region: event.target.value })}
                            />
                          ) : (
                            row.region
                          )}
                        </td>
                        <td>
                          {isSelected ? (
                            <input
                              aria-label="공사번호"
                              value={row.constructionId}
                              onChange={(event) => updateRow(row.localId, { constructionId: event.target.value })}
                            />
                          ) : (
                            row.constructionId
                          )}
                        </td>
                        <td>
                          {isSelected ? (
                            <input
                              aria-label="공사명"
                              value={row.constructionName}
                              onChange={(event) => updateRow(row.localId, { constructionName: event.target.value })}
                            />
                          ) : (
                            row.constructionName
                          )}
                        </td>
                        <td>
                          {isSelected ? (
                            <input
                              aria-label="공사감독"
                              value={row.supervisor}
                              onChange={(event) => updateRow(row.localId, { supervisor: event.target.value })}
                            />
                          ) : (
                            row.supervisor
                          )}
                        </td>
                        <td>
                          {isSelected ? (
                            <input
                              aria-label="시공관리자"
                              value={row.siteManager}
                              onChange={(event) => updateRow(row.localId, { siteManager: event.target.value })}
                            />
                          ) : (
                            row.siteManager
                          )}
                        </td>
                        <td>
                          {isSelected ? (
                            <select
                              aria-label="오늘작업"
                              value={row.todayWork}
                              onChange={(event) => updateRow(row.localId, { todayWork: event.target.value as DailyPlanWork })}
                            >
                              {dailyPlanWorkOptions.map((work) => (
                                <option key={work}>{work}</option>
                              ))}
                            </select>
                          ) : (
                            row.todayWork
                          )}
                        </td>
                        <td>
                          {isSelected ? (
                            <textarea
                              aria-label="비고"
                              value={row.note}
                              onChange={(event) => updateRow(row.localId, { note: event.target.value })}
                            />
                          ) : (
                            row.note || "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {isAddModalOpen ? (
        <div className="dailyModalBackdrop" role="presentation" onMouseDown={() => setIsAddModalOpen(false)}>
          <section className="dailyAddModal" role="dialog" aria-modal="true" aria-label="공사 직접 추가" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dailyAddModalTop">
              <div>
                <p>직접 입력</p>
                <h2>공사 추가</h2>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="dailyAddForm">
              <label>
                <span>지역</span>
                <input value={manualDraft.region} onChange={(event) => setManualDraft((current) => ({ ...current, region: event.target.value }))} />
              </label>
              <label>
                <span>공사번호</span>
                <input value={manualDraft.constructionId} onChange={(event) => setManualDraft((current) => ({ ...current, constructionId: event.target.value }))} />
              </label>
              <label className="wide">
                <span>공사명</span>
                <input value={manualDraft.constructionName} onChange={(event) => setManualDraft((current) => ({ ...current, constructionName: event.target.value }))} />
              </label>
              <label>
                <span>공사감독</span>
                <input value={manualDraft.supervisor} onChange={(event) => setManualDraft((current) => ({ ...current, supervisor: event.target.value }))} />
              </label>
              <label>
                <span>시공관리자</span>
                <input value={manualDraft.siteManager} onChange={(event) => setManualDraft((current) => ({ ...current, siteManager: event.target.value }))} />
              </label>
              <label>
                <span>오늘작업</span>
                <select value={manualDraft.todayWork} onChange={(event) => setManualDraft((current) => ({ ...current, todayWork: event.target.value as DailyPlanWork }))}>
                  {dailyPlanWorkOptions.map((work) => (
                    <option key={work}>{work}</option>
                  ))}
                </select>
              </label>
              <label className="wide">
                <span>비고</span>
                <textarea value={manualDraft.note} onChange={(event) => setManualDraft((current) => ({ ...current, note: event.target.value }))} />
              </label>
            </div>
            <div className="dailyAddModalActions">
              <button type="button" onClick={() => setIsAddModalOpen(false)}>
                취소
              </button>
              <button type="button" onClick={addManualRow}>
                추가
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ReportScreen({
  items,
  onBack,
  onDownloadExcel,
  onDownloadPdf,
}: {
  items: Construction[];
  onBack: () => void;
  onDownloadExcel: () => void;
  onDownloadPdf: () => void;
}) {
  const totalLength = items.reduce((sum, item) => sum + item.lengthMeter, 0);
  const urgentItems = items.filter((item) => item.issueLevel !== "notice");
  const byRegion = summarizeBy(items, (item) => item.region);
  const byStage = summarizeBy(items, (item) => item.stage);

  return (
    <>
      <header className="detailHeader">
        <div>
          <button className="textButton" type="button" onClick={onBack}>
            대시보드로 돌아가기
          </button>
          <p>보고자료 생성 화면(Mock)</p>
          <h1>TSRM 공사운영현황 보고자료</h1>
        </div>
        <div className="detailActions">
          <button type="button" onClick={onDownloadExcel}>
            Excel 다운로드(Mock)
          </button>
          <button type="button" onClick={onDownloadPdf}>
            PDF 다운로드(Mock)
          </button>
        </div>
      </header>

      <section className="reportPreview panelCard" aria-label="보고서 미리보기">
        <div className="reportPaper">
          <div className="reportTop">
            <div>
              <span>TSRM Construction Operations</span>
              <h2>공사운영현황 전체 보고</h2>
            </div>
            <dl>
              <div>
                <dt>작성일</dt>
                <dd>2026-07-13</dd>
              </div>
              <div>
                <dt>대상지역</dt>
                <dd>익산시 / 정읍시</dd>
              </div>
            </dl>
          </div>

          <div className="reportKpis">
            <InfoRow label="전체 발주 공사" value={`${items.length}건`} />
            <InfoRow label="총 시공연장" value={`${formatNumber(totalLength)}m`} />
            <InfoRow label="우선 확인 필요" value={`${urgentItems.length}건`} />
          </div>

          <section className="reportBlock">
            <h3>1. 운영 알림 요약</h3>
            <div className="reportAlertList">
              {operationsAlerts.map((alert) => (
                <article className={`reportAlert ${alert.level}`} key={alert.title}>
                  <strong>{alert.title}</strong>
                  <span>{alert.count}건</span>
                  <p>{alert.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="reportBlock reportSplit">
            <div>
              <h3>2. 지역별 현황</h3>
              {Object.entries(byRegion).map(([region, count]) => (
                <SummaryBar key={region} label={region} value={count} total={items.length} />
              ))}
            </div>
            <div>
              <h3>3. 공정단계별 현황</h3>
              <div className="reportStageList">
                {processStages.map((stage) => (
                  <div key={stage}>
                    <span>{stage}</span>
                    <strong>{byStage[stage] ?? 0}건</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="reportBlock">
            <h3>4. 공사 리스트</h3>
            <div className="reportTableWrap">
              <table>
                <thead>
                  <tr>
                    <th>공사번호</th>
                    <th>공사명</th>
                    <th>지역</th>
                    <th>협력사</th>
                    <th>공정단계</th>
                    <th>공정률</th>
                    <th>특이사항</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.name}</td>
                      <td>{item.region}</td>
                      <td>{item.contractor}</td>
                      <td>{item.stage}</td>
                      <td>{item.progress}%</td>
                      <td>{item.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
