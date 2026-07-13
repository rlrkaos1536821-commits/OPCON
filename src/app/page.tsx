import { constructions, operationsAlerts, processStages, summarizeBy, type AlertLevel, type Construction } from "@/data/constructions";

const levelLabel: Record<AlertLevel, string> = {
  critical: "긴급",
  warning: "주의",
  notice: "확인",
};

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

export default function Home() {
  const todayStarts = constructions.filter((item) => item.startDate === "2026-07-13").length;
  const todayDue = constructions.filter((item) => item.dueDate === "2026-07-13").length;
  const totalLength = constructions.reduce((sum, item) => sum + item.lengthMeter, 0);
  const byRegion = summarizeBy(constructions, (item) => item.region);
  const byContractor = summarizeBy(constructions, (item) => item.contractor);
  const byStage = summarizeBy(constructions, (item) => item.stage);
  const topContractors = Object.entries(byContractor).sort((a, b) => b[1] - a[1]);

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

      <section className="workspace">
        <header className="topBar">
          <div>
            <p>공사관리담당자 업무화면</p>
            <h1>공사운영현황</h1>
          </div>
          <div className="filterArea" aria-label="검색 및 필터">
            <input aria-label="공사 검색" placeholder="공사번호, 공사명, 협력사 검색" />
            <select aria-label="지역 필터" defaultValue="전체 지역">
              <option>전체 지역</option>
              <option>익산시</option>
              <option>정읍시</option>
            </select>
            <select aria-label="공정 필터" defaultValue="전체 공정">
              <option>전체 공정</option>
              {processStages.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
          </div>
        </header>

        <section className="metricGrid" aria-label="오늘 핵심 지표">
          <MetricCard label="오늘 예정 공사" value={`${constructions.length}건`} note={`총 시공연장 ${formatNumber(totalLength)}m`} />
          <MetricCard label="오늘 착공 예정" value={`${todayStarts}건`} note="착공 전 계획 확인 필요" />
          <MetricCard label="오늘 완료 예정" value={`${todayDue}건`} note="완료 전 공정률 점검" />
        </section>

        <section className="alertSection" aria-label="운영 알림">
          <div className="sectionTitle">
            <div>
              <p>운영 알림</p>
              <h2>오늘 먼저 확인할 업무</h2>
            </div>
            <span>우선순위 기준</span>
          </div>
          <div className="alertGrid">
            {operationsAlerts.map((alert) => (
              <article className={`alertCard ${alert.level}`} key={alert.title}>
                <div>
                  <span>{levelLabel[alert.level]}</span>
                  <strong>{alert.title}</strong>
                </div>
                <b>{alert.count}건</b>
                <p>{alert.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="quickActions" aria-label="Quick Action">
          <button type="button">보고자료 생성</button>
          <button type="button">엑셀 다운로드</button>
          <button type="button">공사 수정</button>
        </section>

        <section className="dashboardGrid" aria-label="현황 분석">
          <article className="panelCard">
            <div className="sectionTitle compact">
              <h2>지역별 현황</h2>
              <span>익산시 / 정읍시</span>
            </div>
            {Object.entries(byRegion).map(([region, count]) => (
              <SummaryBar key={region} label={region} value={count} total={constructions.length} />
            ))}
          </article>

          <article className="panelCard">
            <div className="sectionTitle compact">
              <h2>협력사별 현황</h2>
              <span>시공사 기준</span>
            </div>
            <div className="contractorGrid">
              {topContractors.map(([contractor, count]) => (
                <div key={contractor}>
                  <span>{contractor}</span>
                  <strong>{count}</strong>
                </div>
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
                <div key={stage}>
                  <span>{stage}</span>
                  <strong>{byStage[stage] ?? 0}건</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="tablePanel" aria-label="오늘 공사 리스트">
          <div className="sectionTitle">
            <div>
              <p>오늘 공사 리스트</p>
              <h2>공사별 진행 현황</h2>
            </div>
            <span>{constructions.length}건</span>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>공사번호</th>
                  <th>공사명</th>
                  <th>지역</th>
                  <th>시공연장(m)</th>
                  <th>협력사</th>
                  <th>공정단계</th>
                  <th>공정률</th>
                  <th>착공일</th>
                  <th>완료예정일</th>
                  <th>특이사항</th>
                </tr>
              </thead>
              <tbody>
                {constructions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td className="nameCell">{item.name}</td>
                    <td>{item.region}</td>
                    <td>{formatNumber(item.lengthMeter)}</td>
                    <td>{item.contractor}</td>
                    <td><StatusBadge stage={item.stage} /></td>
                    <td><ProgressBar value={item.progress} /></td>
                    <td>{item.startDate}</td>
                    <td>{item.dueDate}</td>
                    <td><span className={`issueBadge ${item.issueLevel}`}>{item.issue}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
