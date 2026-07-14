"use client";

import { useEffect, useMemo, useState } from "react";
import {
  constructions as initialConstructions,
  processStages,
  summarizeBy,
  type AlertLevel,
  type Construction,
  type ProcessStage,
} from "@/data/constructions";

type ViewMode = "dashboard" | "detail" | "edit" | "report";
type RegionFilter = "전체 지역" | Construction["region"];
type ContractorFilter = "전체 협력사" | Construction["contractor"];
type StageFilter = "전체 공정" | ProcessStage;
type SortKey = "dueDate" | "progress" | "lengthMeter" | "region" | "contractor" | "stage";
type SortDirection = "asc" | "desc";
type SystemMessage = { tone: "success" | "error" | "info"; title: string; description: string };

const alertLabel: Record<AlertLevel, string> = { critical: "긴급", warning: "주의", notice: "확인" };
const stageClass: Record<ProcessStage, string> = {
  "발주 완료": "stage stageOrder",
  "착공 예정": "stage stageReady",
  "배관 공사": "stage stagePipe",
  "기층 포장": "stage stageBase",
  "표층 포장": "stage stageTop",
  "공사 완료": "stage stageDone",
  "준공 완료": "stage stageFinal",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function ProgressBar({ value }: { value: number }) {
  return <div className="progressTrack" aria-label={`공정률 ${value}%`}><span style={{ width: `${value}%` }} /></div>;
}

function AlertBadge({ level }: { level: AlertLevel }) {
  return <span className={`alertBadge ${level}`}>{alertLabel[level]}</span>;
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return <p><strong>{label}</strong>{value}</p>;
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildCsv(items: Construction[]) {
  const header = ["관리번호", "공사명", "지역", "협력사", "공정", "공정률", "연장(m)", "착공일", "완료예정", "이슈"];
  const rows = items.map((item) => [item.id, item.name, item.region, item.contractor, item.stage, `${item.progress}%`, String(item.lengthMeter), item.startDate, item.dueDate, item.issue]);
  const escapeCell = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
  return [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
}

function buildReport(items: Construction[]) {
  const delayed = items.filter((item) => item.issueLevel !== "notice");
  const byRegion = summarizeBy(items, (item) => item.region);
  const byContractor = summarizeBy(items, (item) => item.contractor);
  return [
    "TSRM 공사운영현황 보고서",
    `생성일시: ${new Date().toLocaleString("ko-KR")}`,
    "",
    `[요약] 전체 발주 ${items.length}건 / 관리 필요 ${delayed.length}건 / 총 연장 ${formatNumber(items.reduce((sum, item) => sum + item.lengthMeter, 0))}m`,
    "",
    "[지역별 현황]",
    ...Object.entries(byRegion).map(([label, count]) => `${label}: ${count}건`),
    "",
    "[협력사별 현황]",
    ...Object.entries(byContractor).map(([label, count]) => `${label}: ${count}건`),
    "",
    "[상세 목록]",
    ...items.map((item) => `${item.id} | ${item.name} | ${item.stage} | ${item.progress}% | ${item.issue}`),
  ].join("\n");
}

export default function Home() {
  const [items, setItems] = useState<Construction[]>(initialConstructions);
  const [view, setView] = useState<ViewMode>("dashboard");
  const [selectedId, setSelectedId] = useState(initialConstructions[0]?.id ?? "");
  const [region, setRegion] = useState<RegionFilter>("전체 지역");
  const [contractor, setContractor] = useState<ContractorFilter>("전체 협력사");
  const [stage, setStage] = useState<StageFilter>("전체 공정");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<SystemMessage>({ tone: "info", title: "운영 데이터 연결됨", description: "리스트에서 한 건을 선택하면 일정 수정 영역에 표시됩니다." });

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const contractors = useMemo<Construction["contractor"][]>(() => Array.from(new Set(items.map((item) => item.contractor))).sort(), [items]);

  const visibleItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesQuery = !query || [item.id, item.name, item.address, item.issue, item.contractor].some((value) => value.toLowerCase().includes(query));
      return matchesQuery && (region === "전체 지역" || item.region === region) && (contractor === "전체 협력사" || item.contractor === contractor) && (stage === "전체 공정" || item.stage === stage);
    });
    return [...filtered].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "ko-KR");
      return sortDirection === "asc" ? result : -result;
    });
  }, [contractor, items, region, searchTerm, sortDirection, sortKey, stage]);

  const summary = useMemo(() => {
    const totalLength = visibleItems.reduce((sum, item) => sum + item.lengthMeter, 0);
    return {
      total: visibleItems.length,
      totalLength,
      inProgress: visibleItems.filter((item) => !["공사 완료", "준공 완료"].includes(item.stage)).length,
      constructionDone: visibleItems.filter((item) => item.stage === "공사 완료").length,
      closed: visibleItems.filter((item) => item.stage === "준공 완료").length,
      critical: visibleItems.filter((item) => item.issueLevel === "critical").length,
      warning: visibleItems.filter((item) => item.issueLevel === "warning").length,
    };
  }, [visibleItems]);

  const setSystemMessage = (next: SystemMessage) => {
    setMessage(next);
    window.setTimeout(() => setMessage({ tone: "info", title: "운영 데이터 연결됨", description: "리스트에서 선택한 공사를 바로 수정하고 확정할 수 있습니다." }), 3000);
  };

  const saveConstruction = (next: Construction) => {
    if (!Number.isFinite(next.progress) || next.progress < 0 || next.progress > 100) {
      setSystemMessage({ tone: "error", title: "저장할 수 없습니다", description: "공정률은 0부터 100 사이여야 합니다." });
      return;
    }
    if (!Number.isFinite(next.lengthMeter) || next.lengthMeter <= 0) {
      setSystemMessage({ tone: "error", title: "저장할 수 없습니다", description: "시공연장은 1m 이상이어야 합니다." });
      return;
    }
    setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
    setSelectedId(next.id);
    setView("dashboard");
    setSystemMessage({ tone: "success", title: "수정 확정 완료", description: `${next.id} 일정 정보가 리스트에 반영되었습니다.` });
  };

  const handleRefresh = () => {
    setIsLoading(true);
    window.setTimeout(() => {
      setIsLoading(false);
      setSystemMessage({ tone: "success", title: "현황 새로고침 완료", description: "전체 발주 현황과 공정별 KPI를 다시 계산했습니다." });
    }, 650);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const handleDownloadCsv = () => {
    if (!visibleItems.length) return;
    downloadTextFile("tsrm-constructions.csv", `\uFEFF${buildCsv(visibleItems)}`, "text/csv;charset=utf-8");
    setSystemMessage({ tone: "success", title: "엑셀용 CSV 생성 완료", description: "현재 조회 조건의 공사 목록을 내려받았습니다." });
  };

  const handleDownloadReport = () => {
    if (!visibleItems.length) return;
    downloadTextFile("tsrm-report.txt", buildReport(visibleItems), "text/plain;charset=utf-8");
    setSystemMessage({ tone: "success", title: "보고서 파일 생성 완료", description: "보고서 미리보기 내용을 텍스트 파일로 저장했습니다." });
  };

  return (
    <main className="appShell">
      <aside className="sideNav">
        <div className="brand">TSRM</div>
        <p>공사운영현황</p>
        <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>대시보드</button>
        <button className={view === "detail" ? "active" : ""} onClick={() => setView("detail")}>상세현황</button>
        <button className={view === "report" ? "active" : ""} onClick={() => setView("report")}>보고자료</button>
      </aside>

      <section className="workspace">
        <header className="topBar">
          <div><span className="eyebrow">삼천리 도시가스 공사 운영 PoC</span><h1>공사운영현황 통합 모니터링</h1></div>
          <div className="actions"><button onClick={handleRefresh}>새로고침</button><button onClick={() => setView("report")}>보고자료 생성</button><button className="primary" onClick={handleDownloadCsv}>엑셀 다운로드</button></div>
        </header>

        <section className={`systemMessage ${message.tone}`}><strong>{message.title}</strong><span>{message.description}</span></section>

        <section className="filters" aria-label="공사 검색 조건">
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="공사번호, 공사명, 주소, 협력사 검색" />
          <select value={region} onChange={(event) => setRegion(event.target.value as RegionFilter)}><option>전체 지역</option><option>익산시</option><option>정읍시</option></select>
          <select value={contractor} onChange={(event) => setContractor(event.target.value as ContractorFilter)}><option>전체 협력사</option>{contractors.map((name) => <option key={name}>{name}</option>)}</select>
          <select value={stage} onChange={(event) => setStage(event.target.value as StageFilter)}><option>전체 공정</option>{processStages.map((name) => <option key={name}>{name}</option>)}</select>
        </section>

        {view === "dashboard" && (
          <>
            <section className="kpiGrid">
              <article><span>전체 발주 건</span><strong>{summary.total}건</strong><small>총 시공연장 {formatNumber(summary.totalLength)}m</small></article>
              <article><span>진행중 공사</span><strong>{summary.inProgress}건</strong><small>착공 예정부터 표층 포장까지</small></article>
              <article><span>공사 완료</span><strong>{summary.constructionDone}건</strong><small>현장 공정 완료 상태</small></article>
              <article><span>준공 완료</span><strong>{summary.closed}건</strong><small>준공 처리까지 완료</small></article>
            </section>

            {selected ? <ScheduleEditor construction={selected} contractors={contractors} onDetail={() => setView("detail")} onSave={saveConstruction} /> : null}

            <section className="mapArea">
              <div className="mapCanvas">
                {visibleItems.map((item, index) => <button key={item.id} className={`mapPin ${item.issueLevel}`} style={{ left: `${18 + (index % 5) * 16}%`, top: `${22 + Math.floor(index / 5) * 28}%` }} onClick={() => setSelectedId(item.id)}><span>{item.region}</span></button>)}
              </div>
              <aside className="alertPanel"><h2>발주 진행 요약</h2><p><AlertBadge level="warning" /> 진행중 {summary.inProgress}건</p><p><AlertBadge level="notice" /> 공사 완료 {summary.constructionDone}건</p><p><AlertBadge level="notice" /> 준공 완료 {summary.closed}건</p><p><AlertBadge level="critical" /> 관리 필요 {summary.critical + summary.warning}건</p></aside>
            </section>

            <section className="summaryGrid"><Chart title="지역별 현황" rows={summarizeBy(visibleItems, (item) => item.region)} onPick={(label) => setRegion(label as RegionFilter)} /><Chart title="협력사별 현황" rows={summarizeBy(visibleItems, (item) => item.contractor)} onPick={(label) => setContractor(label as ContractorFilter)} /><Chart title="공정별 현황" rows={summarizeBy(visibleItems, (item) => item.stage)} onPick={(label) => setStage(label as StageFilter)} /></section>
          </>
        )}

        {view === "detail" && selected && <Detail item={selected} onBack={() => setView("dashboard")} onEdit={() => setView("edit")} onReport={() => setView("report")} />}
        {view === "edit" && selected && <ScheduleEditor construction={selected} contractors={contractors} onDetail={() => setView("detail")} onSave={saveConstruction} />}
        {view === "report" && <Report items={visibleItems} onDownload={handleDownloadReport} />}

        <ConstructionTable isLoading={isLoading} items={visibleItems} selectedId={selected?.id} onSelect={(item) => setSelectedId(item.id)} onEdit={(item) => { setSelectedId(item.id); setView("edit"); }} onSort={handleSort} />
      </section>
    </main>
  );
}

function Chart({ title, rows, onPick }: { title: string; rows: Record<string, number>; onPick: (label: string) => void }) {
  const total = Object.values(rows).reduce((sum, count) => sum + count, 0);
  return <article className="chartCard"><h2>{title}</h2>{Object.entries(rows).map(([label, count]) => <button key={label} onClick={() => onPick(label)}><span>{label}</span><strong>{count}건</strong><ProgressBar value={total ? Math.round((count / total) * 100) : 0} /></button>)}</article>;
}

function ScheduleEditor({ construction, contractors, onDetail, onSave }: { construction: Construction; contractors: Construction["contractor"][]; onDetail: () => void; onSave: (construction: Construction) => void }) {
  const [contractor, setContractor] = useState<Construction["contractor"]>(construction.contractor);
  const [stage, setStage] = useState<ProcessStage>(construction.stage);
  const [progress, setProgress] = useState(construction.progress);
  const [lengthMeter, setLengthMeter] = useState(construction.lengthMeter);
  const [startDate, setStartDate] = useState(construction.startDate);
  const [dueDate, setDueDate] = useState(construction.dueDate);
  const [issue, setIssue] = useState(construction.issue);
  const [issueLevel, setIssueLevel] = useState<AlertLevel>(construction.issueLevel);

  useEffect(() => {
    setContractor(construction.contractor); setStage(construction.stage); setProgress(construction.progress); setLengthMeter(construction.lengthMeter); setStartDate(construction.startDate); setDueDate(construction.dueDate); setIssue(construction.issue); setIssueLevel(construction.issueLevel);
  }, [construction]);

  const reset = () => { setContractor(construction.contractor); setStage(construction.stage); setProgress(construction.progress); setLengthMeter(construction.lengthMeter); setStartDate(construction.startDate); setDueDate(construction.dueDate); setIssue(construction.issue); setIssueLevel(construction.issueLevel); };
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave({ ...construction, contractor, stage, progress, lengthMeter, startDate, dueDate, issue, issueLevel, plan: { ...construction.plan, period: `${startDate} ~ ${dueDate}` } }); };

  return <section className="schedulePanel"><div className="sectionTitle"><h2>선택 공사 일정관리</h2><button onClick={onDetail}>상세 보기</button></div><div className="fixedInfoGrid"><InfoRow label="공사번호" value={construction.id} /><InfoRow label="공사명" value={construction.name} /><InfoRow label="지역" value={construction.region} /></div><form className="scheduleForm" onSubmit={submit}><label>협력사<select value={contractor} onChange={(event) => setContractor(event.target.value as Construction["contractor"])}>{contractors.map((item) => <option key={item}>{item}</option>)}</select></label><label>공정단계<select value={stage} onChange={(event) => setStage(event.target.value as ProcessStage)}>{processStages.map((item) => <option key={item}>{item}</option>)}</select></label><label>공정률<input type="number" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} /></label><label>시공연장(m)<input type="number" min="1" value={lengthMeter} onChange={(event) => setLengthMeter(Number(event.target.value))} /></label><label>착공일<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>완료예정일<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label className="wideField">특이사항<input value={issue} onChange={(event) => setIssue(event.target.value)} /></label><label>상태<select value={issueLevel} onChange={(event) => setIssueLevel(event.target.value as AlertLevel)}><option value="critical">긴급</option><option value="warning">주의</option><option value="notice">확인</option></select></label><div className="scheduleActions"><button type="button" onClick={reset}>되돌리기</button><button type="submit">수정 확정</button></div></form></section>;
}

function ConstructionTable({ isLoading, items, selectedId, onSelect, onEdit, onSort }: { isLoading: boolean; items: Construction[]; selectedId?: string; onSelect: (item: Construction) => void; onEdit: (item: Construction) => void; onSort: (key: SortKey) => void }) {
  return <section className="tableSection"><div className="sectionTitle"><h2>공사 목록</h2><span>{items.length}건</span></div>{isLoading ? <div className="emptyState">데이터를 새로 불러오는 중입니다.</div> : items.length ? <div className="tableWrap"><table><thead><tr><th>공사번호</th><th>공사명</th><th><button onClick={() => onSort("region")}>지역</button></th><th><button onClick={() => onSort("contractor")}>협력사</button></th><th><button onClick={() => onSort("stage")}>공정</button></th><th><button onClick={() => onSort("progress")}>공정률</button></th><th>착공일</th><th><button onClick={() => onSort("dueDate")}>완료예정</button></th><th>이슈</th><th>수정</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className={selectedId === item.id ? "selectedRow" : ""} onClick={() => onSelect(item)}><td>{item.id}</td><td><strong>{item.name}</strong><small>{item.address}</small></td><td>{item.region}</td><td>{item.contractor}</td><td><span className={stageClass[item.stage]}>{item.stage}</span></td><td><ProgressBar value={item.progress} /> {item.progress}%</td><td>{item.startDate}</td><td>{item.dueDate}</td><td><AlertBadge level={item.issueLevel} /> {item.issue}</td><td><button className="rowActionButton" onClick={(event) => { event.stopPropagation(); onEdit(item); }}>수정</button></td></tr>)}</tbody></table></div> : <div className="emptyState">조건에 맞는 공사가 없습니다.</div>}</section>;
}

function Detail({ item, onBack, onEdit, onReport }: { item: Construction; onBack: () => void; onEdit: () => void; onReport: () => void }) {
  return <section className="detailGrid"><article className="detailMain"><div className="sectionTitle"><h2>{item.name}</h2><button onClick={onBack}>목록으로</button></div><p className="muted">{item.address}</p><div className="mockMap"><span>{item.mapLabel}</span><b>{item.region}</b></div><div className="infoGrid"><InfoRow label="공사번호" value={item.id} /><InfoRow label="협력사" value={item.contractor} /><InfoRow label="공정단계" value={item.stage} /><InfoRow label="공정률" value={`${item.progress}%`} /><InfoRow label="착공일" value={item.startDate} /><InfoRow label="완료예정일" value={item.dueDate} /></div></article><aside className="rightPanel"><h2>공사 진행 메모</h2><p><strong>{item.todayWork.work}</strong></p><p>{item.todayWork.status}</p><p className="muted">{item.todayWork.note}</p><div className="buttonRow"><button onClick={onEdit}>공사 수정</button><button onClick={onReport}>보고자료</button></div></aside></section>;
}

function Report({ items, onDownload }: { items: Construction[]; onDownload: () => void }) {
  return <section className="reportPanel"><div className="sectionTitle"><h2>보고자료 미리보기</h2><button className="primary" onClick={onDownload}>PDF 텍스트 저장</button></div><pre>{buildReport(items)}</pre></section>;
}
