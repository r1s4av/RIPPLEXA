import React, { useEffect, useMemo, useState } from "react";

const FILES = {
  demand: "/data/demand_history.csv",
  edges: "/data/edges.csv",
  failures: "/data/failure_history.csv",
  nodes: "/data/nodes.csv"
};

const API_URL = "http://127.0.0.1:8000";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = [];
    let current = "";
    let quoted = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());

    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

const number = (value) => Number(value) || 0;

function percentage(value) {
  return `${Number(value).toFixed(1)}%`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1
  }).format(Number(value) || 0);
}

function latestDate(rows) {
  if (!rows.length) return "";
  return rows.reduce(
    (latest, row) => (row.date > latest ? row.date : latest),
    rows[0].date
  );
}

function getNode(nodes, id) {
  return nodes.find((node) => node.node_id === id);
}

function nodeName(nodes, id) {
  return getNode(nodes, id)?.name || id;
}

async function loadAllData() {
  const responses = await Promise.all(
    Object.values(FILES).map((file) => fetch(file))
  );

  if (responses.some((response) => !response.ok)) {
    throw new Error("Unable to load CSV files.");
  }

  const [demandText, edgesText, failuresText, nodesText] =
    await Promise.all(responses.map((response) => response.text()));

  return {
    demand: parseCSV(demandText).map((row) => ({
      ...row,
      demand: number(row.demand),
      fulfilled: number(row.fulfilled)
    })),
    edges: parseCSV(edgesText).map((row) => ({
      ...row,
      strength: number(row.strength),
      lead_time_days: number(row.lead_time_days)
    })),
    failures: parseCSV(failuresText).map((row) => ({
      ...row,
      duration_hours: number(row.duration_hours),
      impact_score: number(row.impact_score),
      resolved: String(row.resolved).toLowerCase() === "true"
    })),
    nodes: parseCSV(nodesText).map((row) => ({
      ...row,
      capacity: number(row.capacity),
      reliability: number(row.reliability)
    }))
  };
}

async function runBackendSimulation(nodeId) {
  const response = await fetch(`${API_URL}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ failed_node: nodeId })
  });

  if (!response.ok) throw new Error("Backend simulation failed.");
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result;
}

export default function App() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationTarget, setSimulationTarget] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);

  async function refreshData(showMessage = false) {
    try {
      setRefreshing(true);
      setError("");
      const freshData = await loadAllData();
      setData(freshData);
      setLastRefresh(new Date());

      if (showMessage) showToast("Analysis refreshed successfully.");
    } catch (err) {
      console.error(err);
      setError("Could not load the CSV files. Check frontend/public/data.");
      if (showMessage) showToast("Refresh failed. Check the data files.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function openSimulation(nodeId = "") {
    setSimulationTarget(nodeId);
    setSimulationResult(null);
    setPage("simulation");
  }

  if (loading && !data) {
    return (
      <div className="loading-screen">
        <div className="brand-mark large">R</div>
        <div className="loader" />
        <h3>Loading Ripplexa</h3>
        <p>Reading the supply-chain network and preparing analysis...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="loading-screen">
        <div className="brand-mark large">R</div>
        <h3>Unable to load Ripplexa</h3>
        <p>{error}</p>
        <button className="primary-button" onClick={() => refreshData()}>
          Try Again
        </button>
      </div>
    );
  }

  const commonProps = {
    data,
    navigate: setPage,
    showToast,
    refreshData,
    refreshing,
    lastRefresh,
    openSimulation
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} navigate={setPage} />
      <div className="app-content">
        <Header
          page={page}
          navigate={setPage}
          refreshData={refreshData}
          refreshing={refreshing}
          lastRefresh={lastRefresh}
        />

        <main className="main-container">
          {page === "dashboard" && <Dashboard {...commonProps} />}
          {page === "network" && <NetworkAnalysis {...commonProps} />}
          {page === "risk" && (
            <RiskPrediction
              {...commonProps}
              setSelectedRisk={setSelectedRisk}
            />
          )}
          {page === "risk-detail" && (
            <RiskInvestigation
              {...commonProps}
              selectedRisk={selectedRisk}
            />
          )}
          {page === "simulation" && (
            <ImpactSimulation
              {...commonProps}
              simulationResult={simulationResult}
              setSimulationResult={setSimulationResult}
              simulationTarget={simulationTarget}
            />
          )}
          {page === "trace" && <TraceNetwork {...commonProps} />}
          {page === "recovery" && <Recovery {...commonProps} />}
          {page === "recommendations" && <Recommendations {...commonProps} />}
          {page === "reports" && <Reports {...commonProps} />}
        </main>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Sidebar({ page, navigate }) {
  const items = [
    ["dashboard", "⌂", "Dashboard"],
    ["network", "⌁", "Network Graph"],
    ["simulation", "◈", "Disruption Analysis"],
    ["risk", "◉", "AI Risk & Impact"],
    ["recovery", "↻", "Recovery & Optimization"],
    ["recommendations", "✦", "Recommendations"],
    ["reports", "▤", "Reports"]
  ];

  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate("dashboard")}>
        <span className="brand-mark">R</span>
        <span>
          <strong>RIPPLEXA</strong>
          <small>Resilience Intelligence</small>
        </span>
      </button>

      <div className="sidebar-label">CONTROL CENTER</div>

      <nav className="sidebar-nav">
        {items.map(([id, icon, label]) => (
          <button
            key={id}
            className={page === id || (page === "risk-detail" && id === "risk") ? "nav-item active" : "nav-item"}
            onClick={() => navigate(id)}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
            {page === id && <i />}
          </button>
        ))}
      </nav>

      <div className="sidebar-network">
        <span className="pulse-dot" />
        <div>
          <strong>Network monitored</strong>
          <small>Live prototype data</small>
        </div>
      </div>

      <div className="sidebar-footer">
        <span>Smarter Decisions.</span>
        <strong>Stronger Networks.</strong>
      </div>
    </aside>
  );
}

function Header({ page, navigate, refreshData, refreshing, lastRefresh }) {
  const names = {
    dashboard: "Dashboard",
    network: "Network Graph",
    simulation: "Disruption Analysis",
    risk: "AI Risk & Impact",
    "risk-detail": "Risk Investigation",
    trace: "Network Trace",
    recovery: "Recovery & Optimization",
    recommendations: "Recommendations",
    reports: "Reports"
  };

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button onClick={() => navigate("dashboard")}>Ripplexa</button>
        <span>/</span>
        <strong>{names[page] || "Dashboard"}</strong>
      </div>

      <div className="topbar-actions">
        <span className="last-updated">
          {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Preparing analysis"}
        </span>

        <button
          className={`icon-button ${refreshing ? "spinning" : ""}`}
          onClick={() => refreshData(true)}
          disabled={refreshing}
          title="Refresh analysis"
        >
          ↻
        </button>

        <button className="notification-button" onClick={() => navigate("risk")}>
          ◇<i />
        </button>

        <div className="user-chip">
          <span className="avatar">R</span>
          <span>
            <strong>Team Ripplexa</strong>
            <small>Operations</small>
          </span>
        </div>
      </div>
    </header>
  );
}

function PageHero({ eyebrow, title, description, icon = "◈", children }) {
  return (
    <section className="page-hero">
      <div className="hero-copy">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="hero-art" aria-hidden="true">
        <span className="hero-ring ring-one" />
        <span className="hero-ring ring-two" />
        <span className="hero-orb">{icon}</span>
      </div>
      {children}
    </section>
  );
}

function PageTitle({ eyebrow, title, description, button, onClick, disabled }) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {button && (
        <button className="primary-button" onClick={onClick} disabled={disabled}>
          {button}
        </button>
      )}
    </div>
  );
}

function MetricCard({ title, value, description, color = "blue", progress, link, onClick }) {
  return (
    <div className={`card metric-card ${color}`}>
      <div className="metric-header">
        <span>{title}</span>
        <i className={`status-dot ${color}`} />
      </div>
      <strong>{value}</strong>
      <small>{description}</small>
      {progress !== undefined && (
        <div className="progress-bar">
          <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      {link && (
        <button className="text-button" onClick={onClick}>
          {link}
        </button>
      )}
    </div>
  );
}

function Dashboard({ data, navigate, openSimulation, refreshData, refreshing }) {
  const { nodes, edges, failures, demand } = data;
  const operationalNodes = nodes.filter((node) => node.type !== "customer");
  const health = operationalNodes.length
    ? (operationalNodes.reduce((sum, n) => sum + n.reliability, 0) / operationalNodes.length) * 100
    : 0;
  const unresolved = failures.filter((f) => !f.resolved);
  const currentDate = latestDate(demand);
  const currentDemand = demand.filter((row) => row.date === currentDate);
  const totalDemand = currentDemand.reduce((sum, row) => sum + row.demand, 0);
  const totalFulfilled = currentDemand.reduce((sum, row) => sum + row.fulfilled, 0);
  const gap = Math.max(0, totalDemand - totalFulfilled);
  const suppliers = nodes.filter((n) => n.type === "supplier");
  const warehouses = nodes.filter((n) => n.type === "warehouse");
  const recentFailures = [...failures].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const topFailure = [...failures].sort((a, b) => b.impact_score - a.impact_score)[0];

  return (
    <>
      <PageHero
        eyebrow="SUPPLY CHAIN CONTROL CENTER"
        title="Predict the ripple. Prevent the collapse."
        description={`Live operational view across ${nodes.length} nodes and ${edges.length} dependencies. Latest demand snapshot: ${currentDate}.`}
        icon="◎"
      >
        <button className="hero-button" onClick={() => openSimulation(topFailure?.node_id || "")}>
          Run What-If Analysis <span>→</span>
        </button>
      </PageHero>

      <div className="metrics-grid">
        <MetricCard title="Network Health" value={percentage(health)} description="Average operational reliability" color="green" progress={health} />
        <MetricCard title="Active Risks" value={String(unresolved.length).padStart(2, "0")} description="Unresolved historical signals" color="amber" link="Investigate →" onClick={() => navigate("risk")} />
        <MetricCard title="At-Risk Demand" value={formatNumber(gap)} description={`Unfulfilled units on ${currentDate}`} color="red" link="Simulate impact →" onClick={() => openSimulation()} />
        <MetricCard title="Dependencies" value={String(edges.length)} description="Directed relationships mapped" color="blue" link="Open network →" onClick={() => navigate("network")} />
      </div>

      <div className="dashboard-grid">
        <section className="card chart-card large-card">
          <SectionHeader title="Network topology" description="Operational dependency structure at a glance." action="Explore graph" onClick={() => navigate("network")} />
          <MiniNetworkGraph nodes={nodes} edges={edges} />
        </section>

        <section className="card chart-card">
          <SectionHeader title="Impact exposure" description="Recorded failure impact distribution." action="View risks" onClick={() => navigate("risk")} />
          <ImpactBarChart failures={failures} />
        </section>

        <section className="card">
          <SectionHeader title="Network pulse" description="Current structure of the operating network." />
          <div className="pulse-grid">
            <PulseItem label="Suppliers" value={suppliers.length} note={`${suppliers.filter((n) => n.reliability < 0.9).length} below 90% reliability`} />
            <PulseItem label="Warehouses" value={warehouses.length} note={`${edges.filter((e) => e.dependency_type === "inventory").length} inventory links`} />
            <PulseItem label="Demand" value={formatNumber(totalDemand)} note={`${formatNumber(totalFulfilled)} fulfilled`} />
            <PulseItem label="Open failures" value={unresolved.length} note="Historical unresolved signals" />
          </div>
        </section>

        <section className="card">
          <SectionHeader title="Recent alerts" description="Latest recorded disruption events." action="See all" onClick={() => navigate("risk")} />
          <div className="alert-list">
            {recentFailures.map((failure) => (
              <button key={failure.failure_id} className="alert-row" onClick={() => openSimulation(failure.node_id)}>
                <span className={`alert-icon ${failure.resolved ? "success" : failure.impact_score >= 0.7 ? "critical" : "warning"}`}>
                  {failure.resolved ? "✓" : "!"}
                </span>
                <span className="alert-copy">
                  <strong>{nodeName(nodes, failure.node_id)}</strong>
                  <small>{failure.failure_type.replaceAll("_", " ")} · {failure.date}</small>
                </span>
                <b>{percentage(failure.impact_score * 100)}</b>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="section-heading-row">
        <div>
          <div className="eyebrow">RIPPLE WORKFLOW</div>
          <h2>Move from signal to action</h2>
        </div>
        <button className="secondary-button" onClick={() => refreshData(true)} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh analysis"}
        </button>
      </div>

      <div className="action-grid">
        <ActionCard icon="◉" title="Predict Risk" description="Identify nodes with elevated disruption signals." onClick={() => navigate("risk")} />
        <ActionCard icon="◎" title="Simulate Impact" description="See how one failure propagates through the graph." onClick={() => openSimulation()} />
        <ActionCard icon="⌁" title="Trace Network" description="Follow dependencies between any two nodes." onClick={() => navigate("trace")} />
        <ActionCard icon="↻" title="Recover Faster" description="Compare recovery options and constraints." onClick={() => navigate("recovery")} />
      </div>
    </>
  );
}

function SectionHeader({ title, description, action, onClick }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && <button className="text-button" onClick={onClick}>{action} →</button>}
    </div>
  );
}

function PulseItem({ label, value, note }) {
  return (
    <div className="pulse-item">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function ActionCard({ icon, title, description, onClick }) {
  return (
    <button className="action-card" onClick={onClick}>
      <span className="action-icon">{icon}</span>
      <span className="action-content">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="action-arrow">→</span>
    </button>
  );
}

function MiniNetworkGraph({ nodes, edges, highlight = [] }) {
  const types = ["supplier", "warehouse", "production", "store"];
  const visible = nodes.filter((n) => types.includes(n.type));
  const grouped = types.map((type) => visible.filter((n) => n.type === type));
  const positions = {};

  grouped.forEach((group, layer) => {
    group.forEach((node, index) => {
      positions[node.node_id] = {
        x: 95 + layer * 240,
        y: 55 + (index + 1) * (250 / (group.length + 1))
      };
    });
  });

  return (
    <div className="network-graph-wrap">
      <svg className="network-graph" viewBox="0 0 1040 360" role="img" aria-label="Supply chain dependency graph">
        {edges.filter((e) => positions[e.from_node] && positions[e.to_node]).map((edge, index) => {
          const a = positions[edge.from_node];
          const b = positions[edge.to_node];
          return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="graph-edge" />;
        })}
        {Object.entries(positions).map(([id, pos]) => {
          const node = getNode(nodes, id);
          const active = highlight.includes(id);
          return (
            <g key={id} className={active ? "graph-node active" : "graph-node"}>
              <circle cx={pos.x} cy={pos.y} r="23" />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle">{id.replace(/[^A-Z0-9]/g, "").slice(-3)}</text>
              <title>{node?.name || id}</title>
            </g>
          );
        })}
        {types.map((type, index) => (
          <text key={type} x={95 + index * 240} y="340" textAnchor="middle" className="graph-label">
            {type}
          </text>
        ))}
      </svg>
    </div>
  );
}

function ImpactBarChart({ failures }) {
  const grouped = ["supplier", "warehouse", "production", "store"].map((type) => {
    const rows = failures.filter((f) => {
      const id = String(f.node_id || "").toUpperCase();
      if (type === "supplier") return id.startsWith("SUP");
      if (type === "warehouse") return id.startsWith("WH");
      if (type === "production") return id.startsWith("PROD");
      return id.startsWith("STORE");
    });
    const avg = rows.length ? rows.reduce((sum, f) => sum + f.impact_score, 0) / rows.length : 0;
    return { type, value: avg * 100 };
  });

  return (
    <div className="bar-chart">
      {grouped.map((item) => (
        <div className="bar-row" key={item.type}>
          <span>{item.type}</span>
          <div className="bar-track"><i style={{ width: `${Math.min(100, item.value)}%` }} /></div>
          <strong>{item.value.toFixed(0)}%</strong>
        </div>
      ))}
    </div>
  );
}

function NetworkAnalysis({ data, navigate, refreshData, refreshing, lastRefresh }) {
  const { nodes, edges, failures, demand } = data;
  const operational = nodes.filter((n) => n.type !== "customer");
  const reliability = operational.length ? operational.reduce((s, n) => s + n.reliability, 0) / operational.length * 100 : 0;
  const dependency = edges.length ? edges.reduce((s, e) => s + e.strength, 0) / edges.length * 100 : 0;
  const open = failures.filter((f) => !f.resolved);
  const date = latestDate(demand);
  const latest = demand.filter((r) => r.date === date);
  const totalDemand = latest.reduce((s, r) => s + r.demand, 0);
  const fulfilled = latest.reduce((s, r) => s + r.fulfilled, 0);
  const fill = totalDemand ? fulfilled / totalDemand * 100 : 0;
  const critical = [...operational].sort((a, b) => a.reliability - b.reliability).slice(0, 6);

  return (
    <>
      <PageTitle eyebrow="NETWORK INTELLIGENCE" title="Network Graph" description={`Live dependency map across ${nodes.length} nodes and ${edges.length} directed links.`} button={refreshing ? "Refreshing..." : "↻ Refresh analysis"} onClick={() => refreshData(true)} disabled={refreshing} />

      <div className="metrics-grid">
        <MetricCard title="Operational Reliability" value={percentage(reliability)} description="Average operational node reliability" color="green" progress={reliability} />
        <MetricCard title="Dependency Strength" value={percentage(dependency)} description="Average relationship strength" color="blue" progress={dependency} />
        <MetricCard title="Open Failures" value={String(open.length).padStart(2, "0")} description="Historical unresolved events" color="red" />
        <MetricCard title="Latest Fill Rate" value={percentage(fill)} description={`Demand fulfillment on ${date}`} color="amber" progress={fill} />
      </div>

      <section className="card chart-card network-main-card">
        <SectionHeader title="Dependency graph" description="The graph is generated from the actual nodes.csv and edges.csv files." />
        <MiniNetworkGraph nodes={nodes} edges={edges} />
        <div className="graph-legend">
          {["supplier", "warehouse", "production", "store"].map((type) => <span key={type}><i className={`legend-dot ${type}`} />{type}</span>)}
        </div>
      </section>

      <div className="two-column">
        <section className="card">
          <SectionHeader title="Critical nodes" description="Lowest reliability among operational nodes." />
          {critical.map((node, index) => (
            <div className="ranking-row" key={node.node_id}>
              <div className="rank-number">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <strong>{node.name}</strong>
                <small>{node.node_id} · {node.location}</small>
              </div>
              <b className={node.reliability < 0.9 ? "red-text" : "amber-text"}>{percentage(node.reliability * 100)}</b>
            </div>
          ))}
        </section>

        <section className="card">
          <SectionHeader title="Dependency mix" description="How relationships are distributed across the graph." />
          <DependencyDonut edges={edges} />
        </section>
      </div>

      <section className="card">
        <SectionHeader title="Dependency details" description={`Last refreshed ${lastRefresh?.toLocaleTimeString() || "—"}.`} />
        <div className="table-wrapper">
          <table>
            <thead><tr><th>From</th><th>To</th><th>Type</th><th>Strength</th><th>Lead time</th></tr></thead>
            <tbody>
              {edges.map((edge, index) => (
                <tr key={`${edge.from_node}-${edge.to_node}-${index}`}>
                  <td>{nodeName(nodes, edge.from_node)}</td>
                  <td>{nodeName(nodes, edge.to_node)}</td>
                  <td><span className="status-pill neutral">{edge.dependency_type}</span></td>
                  <td>{edge.strength.toFixed(2)}</td>
                  <td>{edge.lead_time_days} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function DependencyDonut({ edges }) {
  const types = ["supply", "inventory", "distribution", "retail"];
  const total = edges.length || 1;
  const values = types.map((type) => ({ type, count: edges.filter((e) => e.dependency_type === type).length }));
  let offset = 0;

  return (
    <div className="donut-layout">
      <svg viewBox="0 0 120 120" className="donut">
        <circle cx="60" cy="60" r="45" className="donut-base" />
        {values.map((item) => {
          const dash = item.count / total * 282.7;
          const currentOffset = offset;
          offset += dash;
          return <circle key={item.type} cx="60" cy="60" r="45" className="donut-segment" strokeDasharray={`${dash} ${282.7 - dash}`} strokeDashoffset={-currentOffset} />;
        })}
        <text x="60" y="58" textAnchor="middle">{edges.length}</text>
        <text x="60" y="72" textAnchor="middle" className="donut-label">links</text>
      </svg>
      <div className="donut-legend">
        {values.map((item) => <div key={item.type}><span>{item.type}</span><strong>{item.count}</strong></div>)}
      </div>
    </div>
  );
}

function RiskPrediction({ data, navigate, setSelectedRisk, openSimulation, refreshData, refreshing }) {
  const risks = useMemo(() => {
    const nodeRisks = data.nodes
      .filter((node) => node.type !== "customer")
      .map((node) => {
        const failures = data.failures.filter((f) => f.node_id === node.node_id);
        const open = failures.filter((f) => !f.resolved).length;
        const historical = failures.length ? failures.reduce((s, f) => s + f.impact_score, 0) / failures.length : 0;
        const probability = Math.min(99, Math.round((1 - node.reliability) * 100 + open * 20 + historical * 15));
        return { id: node.node_id, title: `${node.name} disruption`, location: node.location, probability, type: node.type };
      });

    return nodeRisks.sort((a, b) => b.probability - a.probability);
  }, [data]);

  const high = risks.filter((r) => r.probability >= 70).length;
  const medium = risks.filter((r) => r.probability >= 40 && r.probability < 70).length;
  const low = risks.filter((r) => r.probability < 40).length;

  return (
    <>
      <PageTitle eyebrow="EARLY WARNING SYSTEM" title="AI Risk & Impact" description="Risk signals combine node reliability, failure history and network exposure." button={refreshing ? "Refreshing..." : "↻ Refresh analysis"} onClick={() => refreshData(true)} disabled={refreshing} />
      <div className="metrics-grid">
        <MetricCard title="Signals detected" value={risks.length} description="Operational nodes analysed" color="blue" />
        <MetricCard title="High priority" value={high} description="Estimated probability ≥ 70%" color="red" />
        <MetricCard title="Medium priority" value={medium} description="Estimated probability 40–69%" color="amber" />
        <MetricCard title="Low priority" value={low} description="Estimated probability < 40%" color="green" />
      </div>

      <section className="card chart-card">
        <SectionHeader title="Risk landscape" description="Higher bars indicate stronger disruption signals." />
        <RiskDistributionChart risks={risks.slice(0, 10)} />
      </section>

      <div className="risk-grid">
        {risks.map((risk) => (
          <RiskCard
            key={risk.id}
            risk={risk}
            onInvestigate={() => {
              setSelectedRisk(risk.id);
              navigate("risk-detail");
            }}
            onSimulate={() => openSimulation(risk.id)}
          />
        ))}
      </div>
    </>
  );
}

function RiskDistributionChart({ risks }) {
  return (
    <div className="risk-chart">
      {risks.map((risk) => (
        <div className="risk-chart-row" key={risk.id}>
          <span>{risk.id}</span>
          <div className="risk-track"><i style={{ width: `${risk.probability}%` }} /></div>
          <strong>{risk.probability}%</strong>
        </div>
      ))}
    </div>
  );
}

function RiskCard({ risk, onInvestigate, onSimulate }) {
  const level = risk.probability >= 70 ? "high" : risk.probability >= 40 ? "medium" : "low";

  return (
    <section className={`card risk-card ${level}`}>
      <div className="risk-card-top">
        <span className="risk-label">{level.toUpperCase()} RISK</span>
        <b>{risk.probability}%</b>
      </div>
      <h2>{risk.title}</h2>
      <p>{risk.location} · signal generated from current network data.</p>
      <div className="risk-meter"><i style={{ width: `${risk.probability}%` }} /></div>
      <div className="risk-footer">
        <button className="text-button" onClick={onInvestigate}>Investigate →</button>
        <button className="secondary-button small" onClick={onSimulate}>Simulate</button>
      </div>
    </section>
  );
}

function RiskInvestigation({ data, navigate, selectedRisk, openSimulation }) {
  const node = getNode(data.nodes, selectedRisk) || data.nodes.find((n) => n.type !== "customer");

  if (!node) return <div className="empty-state">No risk information available.</div>;

  const nodeFailures = data.failures.filter((f) => f.node_id === node.node_id);
  const incoming = data.edges.filter((e) => e.to_node === node.node_id);
  const outgoing = data.edges.filter((e) => e.from_node === node.node_id);
  const unresolved = nodeFailures.filter((f) => !f.resolved).length;
  const highestImpact = nodeFailures.length ? Math.max(...nodeFailures.map((f) => f.impact_score)) : 0;

  return (
    <>
      <PageTitle eyebrow="RISK INVESTIGATION" title={`${node.name} — Investigation`} description={`Detailed analysis of ${node.node_id}.`} button="← Back to risks" onClick={() => navigate("risk")} />
      <div className="metrics-grid">
        <MetricCard title="Reliability" value={percentage(node.reliability * 100)} description={`${node.location} · capacity ${node.capacity}`} color={node.reliability < 0.9 ? "red" : "green"} progress={node.reliability * 100} />
        <MetricCard title="Recorded failures" value={nodeFailures.length} description={`${unresolved} unresolved`} color={unresolved ? "red" : "green"} />
        <MetricCard title="Dependencies" value={incoming.length + outgoing.length} description={`${incoming.length} incoming · ${outgoing.length} outgoing`} color="blue" />
        <MetricCard title="Historical impact" value={percentage(highestImpact * 100)} description="Highest recorded impact" color="amber" progress={highestImpact * 100} />
      </div>

      <div className="two-column">
        <section className="card">
          <SectionHeader title="Failure history" description="Recorded events for this node." />
          {nodeFailures.length ? (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Date</th><th>Type</th><th>Duration</th><th>Impact</th><th>Status</th></tr></thead>
                <tbody>
                  {nodeFailures.sort((a, b) => new Date(b.date) - new Date(a.date)).map((failure) => (
                    <tr key={failure.failure_id}>
                      <td>{failure.date}</td>
                      <td>{failure.failure_type}</td>
                      <td>{failure.duration_hours}h</td>
                      <td>{percentage(failure.impact_score * 100)}</td>
                      <td><span className={`status-pill ${failure.resolved ? "success" : "danger"}`}>{failure.resolved ? "Resolved" : "Open"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state compact">No recorded failures for this node.</div>}
        </section>

        <section className="card investigation-card">
          <div className="investigation-icon">◎</div>
          <div className="eyebrow">NEXT BEST ANALYSIS</div>
          <h2>Test the ripple effect</h2>
          <p>Run the actual graph + ML pipeline against this node and inspect downstream impact, risk, demand and recovery feasibility.</p>
          <button className="primary-button" onClick={() => openSimulation(node.node_id)}>Run simulation →</button>
        </section>
      </div>
    </>
  );
}

function ImpactSimulation({ data, navigate, simulationResult, setSimulationResult, simulationTarget }) {
  const [scenario, setScenario] = useState("supplier");
  const [targetNode, setTargetNode] = useState(simulationTarget || "");

  const targetNodes = data.nodes.filter((node) => node.type !== "customer");

  useEffect(() => {
    if (simulationTarget) setTargetNode(simulationTarget);
    else if (!targetNode && targetNodes.length) setTargetNode(targetNodes[0].node_id);
  }, [simulationTarget, targetNodes.length]);

  async function runSimulation() {
    if (!targetNode) return;

    try {
      const node = getNode(data.nodes, targetNode);
      const backend = await runBackendSimulation(targetNode);

      setSimulationResult({
        backend,
        scenario,
        targetNode,
        nodeName: node?.name || targetNode,
        timestamp: new Date()
      });
    } catch (error) {
      console.error(error);
      alert("Could not connect to the Ripplexa backend. Start FastAPI on port 8000.");
    }
  }

  if (simulationResult) {
    return <SimulationResult result={simulationResult} navigate={navigate} onNewSimulation={() => setSimulationResult(null)} />;
  }

  return (
    <>
      <PageHero eyebrow="WHAT-IF ENGINE" title="Disruption Analysis" description="Create a failure scenario and send it through Ripplexa's real graph, ML and recovery pipeline." icon="⚡" />
      <section className="card simulation-panel">
        <SectionHeader title="Build a scenario" description="Choose the disruption category and node to test." />
        <div className="scenario-grid">
          {[
            ["supplier", "↗", "Supplier failure", "Test upstream supply loss."],
            ["warehouse", "▣", "Warehouse failure", "Test inventory disruption."],
            ["transport", "⇄", "Transport disruption", "Test route pressure."],
            ["demand", "◇", "Demand shock", "Test demand pressure."]
          ].map(([id, icon, title, description]) => (
            <button key={id} className={`scenario-card ${scenario === id ? "selected" : ""}`} onClick={() => setScenario(id)}>
              <span>{icon}</span><strong>{title}</strong><small>{description}</small>
            </button>
          ))}
        </div>

        <label className="field">
          <span>Failure node</span>
          <select value={targetNode} onChange={(e) => setTargetNode(e.target.value)}>
            {targetNodes.map((node) => <option key={node.node_id} value={node.node_id}>{node.name} ({node.node_id})</option>)}
          </select>
        </label>

        <button className="primary-button simulation-button" onClick={runSimulation}>Run Ripplexa simulation →</button>
        <p className="helper-text">The selected node is sent to <code>POST /simulate</code>.</p>
      </section>
    </>
  );
}

function SimulationResult({ result, navigate, onNewSimulation }) {
  const backend = result.backend || {};
  const cascade = backend.cascade || {};
  const ml = backend.ml || {};
  const recovery = backend.recovery || {};
  const impact = ml.impact || {};
  const risk = ml.risk || {};
  const demand = ml.demand || {};
  const affected = cascade.affected_nodes || [];
  const paths = cascade.cascade_paths || [];
  const recommended = recovery.recommended_strategy;

  return (
    <>
      <PageHero eyebrow="SIMULATION RESULT" title="Ripple analysis complete" description={`${result.nodeName} (${result.targetNode}) was propagated through the actual dependency graph.`} icon="◉">
        <button className="hero-button" onClick={onNewSimulation}>+ New simulation</button>
      </PageHero>

      <div className="metrics-grid">
        <MetricCard title="Predicted Impact" value={`${impact.disruption_percentage ?? 0}%`} description={`${impact.severity || "ML"} disruption`} color="red" progress={impact.disruption_percentage ?? 0} />
        <MetricCard title="Risk Score" value={`${Math.round((risk.risk_score ?? 0) * 100)}%`} description={`${risk.risk_level || "Unknown"} risk`} color="amber" progress={(risk.risk_score ?? 0) * 100} />
        <MetricCard title="Affected Nodes" value={affected.length} description="Downstream nodes in cascade" color="blue" />
        <MetricCard title="Peak Demand" value={formatNumber(demand.predicted_peak_demand ?? 0)} description={(demand.status || "NORMAL").replaceAll("_", " ")} color="green" progress={(demand.utilization_rate ?? 0) * 100} />
      </div>

      <div className="dashboard-grid">
        <section className="card chart-card large-card">
          <SectionHeader title="Cascade propagation" description={`${paths.length} graph paths detected from ${backend.failed_node}.`} />
          <CascadeGraph data={backend} />
        </section>

        <section className="card chart-card">
          <SectionHeader title="Impact profile" description="ML impact and risk output." />
          <ImpactGauge value={Number(impact.disruption_percentage) || 0} label="disruption" />
          <div className="mini-stat-grid">
            <MiniStat label="Risk" value={`${Math.round((risk.risk_score || 0) * 100)}%`} />
            <MiniStat label="Demand" value={formatNumber(demand.predicted_peak_demand || 0)} />
            <MiniStat label="Paths" value={paths.length} />
            <MiniStat label="Nodes" value={affected.length} />
          </div>
        </section>
      </div>

      <section className="card">
        <SectionHeader title="Affected nodes" description="Nodes reached by the cascade simulation." />
        <div className="tag-cloud">
          {affected.slice(0, 30).map((id) => <span key={id} className="node-tag danger">{id}</span>)}
        </div>
      </section>

      <div className="two-column">
        <section className="card">
          <SectionHeader title="AI / ML predictions" description="Outputs from the trained prototype models." />
          <div className="prediction-list">
            <PredictionRow label="Impact model" value={`${impact.disruption_percentage ?? 0}%`} detail={impact.model || "RandomForestRegressor"} />
            <PredictionRow label="Risk model" value={`${Math.round((risk.risk_score || 0) * 100)}%`} detail={risk.model || "LogisticRegression"} />
            <PredictionRow label="Demand model" value={formatNumber(demand.predicted_peak_demand || 0)} detail={demand.model || "RandomForestRegressor"} />
          </div>
        </section>

        <section className="card recovery-result-card">
          <SectionHeader title="Recovery decision" description="Optimizer result for this exact scenario." />
          {recommended ? (
            <div className="recommendation-box success-box">
              <span className="recommendation-icon">✓</span>
              <div><strong>{recommended.name || recommended.strategy || "Recommended strategy"}</strong><p>Optimizer returned a feasible recovery strategy.</p></div>
            </div>
          ) : (
            <div className="recommendation-box warning-box">
              <span className="recommendation-icon">!</span>
              <div><strong>No feasible recovery strategy</strong><p>The current capacity and demand constraints prevent a feasible plan for this scenario.</p></div>
            </div>
          )}
          <button className="primary-button" onClick={() => navigate("recovery")}>Open recovery center →</button>
        </section>
      </div>
    </>
  );
}

function CascadeGraph({ data }) {
  const ids = [data.failed_node, ...(data.cascade?.affected_nodes || [])].filter(Boolean).slice(0, 15);
  return (
    <div className="cascade-visual">
      {ids.map((id, index) => (
        <React.Fragment key={`${id}-${index}`}>
          <div className={`cascade-node ${index === 0 ? "failed" : "affected"}`} style={{ animationDelay: `${index * 80}ms` }}>
            <span>{index === 0 ? "!" : "•"}</span>
            <strong>{id}</strong>
            <small>{index === 0 ? "Failure" : "Affected"}</small>
          </div>
          {index < ids.length - 1 && <div className="cascade-link">→</div>}
        </React.Fragment>
      ))}
    </div>
  );
}

function ImpactGauge({ value, label }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.min(100, Math.max(0, value)) / 100;

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 140 140" className="gauge">
        <circle cx="70" cy="70" r={radius} className="gauge-bg" />
        <circle cx="70" cy="70" r={radius} className="gauge-value" strokeDasharray={`${dash} ${circumference - dash}`} />
        <text x="70" y="67" textAnchor="middle">{value.toFixed(0)}%</text>
        <text x="70" y="84" textAnchor="middle" className="gauge-label">{label}</text>
      </svg>
    </div>
  );
}

function MiniStat({ label, value }) {
  return <div className="mini-stat"><small>{label}</small><strong>{value}</strong></div>;
}

function PredictionRow({ label, value, detail }) {
  return <div className="prediction-row"><div><strong>{label}</strong><small>{detail}</small></div><b>{value}</b></div>;
}

function TraceNetwork({ data, navigate }) {
  const traceable = data.nodes.filter((n) => n.type !== "customer");
  const [start, setStart] = useState(traceable[0]?.node_id || "");
  const [target, setTarget] = useState("");
  const route = target ? findPath(data.edges, start, target) : [];
  const direct = data.edges.filter((e) => e.from_node === start);

  return (
    <>
      <PageTitle eyebrow="NETWORK TRACE" title="Trace dependencies" description="Follow a dependency chain from one node to another." button="← Dashboard" onClick={() => navigate("dashboard")} />
      <section className="card">
        <div className="form-grid">
          <label className="field"><span>Start node</span><select value={start} onChange={(e) => { setStart(e.target.value); setTarget(""); }}>{traceable.map((n) => <option key={n.node_id} value={n.node_id}>{n.name} ({n.node_id})</option>)}</select></label>
          <label className="field"><span>Destination</span><select value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Select destination</option>{traceable.filter((n) => n.node_id !== start).map((n) => <option key={n.node_id} value={n.node_id}>{n.name} ({n.node_id})</option>)}</select></label>
        </div>

        {target && route.length ? (
          <div className="trace-result">
            <div className="route-line">
              {[start, ...route.map((e) => e.to_node)].map((id, index, list) => (
                <React.Fragment key={id}>
                  <div className="route-node"><span>{getNode(data.nodes, id)?.type?.charAt(0).toUpperCase() || "N"}</span><strong>{nodeName(data.nodes, id)}</strong><small>{id}</small></div>
                  {index < list.length - 1 && <div className="route-arrow">→<small>{route[index].lead_time_days}d</small></div>}
                </React.Fragment>
              ))}
            </div>
            <div className="trace-summary"><strong>{route.length} dependencies</strong><span>Lead time: {route.reduce((s, e) => s + e.lead_time_days, 0)} days</span><span>Weakest link: {Math.min(...route.map((e) => e.strength)).toFixed(2)}</span></div>
          </div>
        ) : <div className="empty-state compact">{target ? "No directed path was found." : "Choose a destination to trace the network."}</div>}
      </section>

      <section className="card">
        <SectionHeader title="Direct dependencies" description={`Connections leaving ${nodeName(data.nodes, start)}.`} />
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Destination</th><th>Type</th><th>Strength</th><th>Lead time</th></tr></thead>
            <tbody>{direct.map((edge, index) => <tr key={index}><td>{nodeName(data.nodes, edge.to_node)}</td><td>{edge.dependency_type}</td><td>{edge.strength.toFixed(2)}</td><td>{edge.lead_time_days} days</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function findPath(edges, start, target) {
  const queue = [{ node: start, path: [] }];
  const visited = new Set([start]);

  while (queue.length) {
    const current = queue.shift();
    const outgoing = edges.filter((edge) => edge.from_node === current.node);

    for (const edge of outgoing) {
      const nextPath = [...current.path, edge];
      if (edge.to_node === target) return nextPath;

      if (!visited.has(edge.to_node)) {
        visited.add(edge.to_node);
        queue.push({ node: edge.to_node, path: nextPath });
      }
    }
  }

  return [];
}

function Recovery({ data, navigate, showToast, openSimulation }) {
  const [activeFailure, setActiveFailure] = useState(null);
  const [backendRecovery, setBackendRecovery] = useState(null);
  const [loading, setLoading] = useState(false);

  const unresolved = [...data.failures].filter((f) => !f.resolved).sort((a, b) => b.impact_score - a.impact_score);

  useEffect(() => {
    if (!activeFailure && unresolved[0]) setActiveFailure(unresolved[0]);
  }, [unresolved.length]);

  async function analyzeRecovery() {
    if (!activeFailure) return;
    setLoading(true);
    try {
      const result = await runBackendSimulation(activeFailure.node_id);
      setBackendRecovery(result.recovery);
      showToast("Recovery analysis updated.");
    } catch (error) {
      console.error(error);
      showToast("Could not reach the recovery engine.");
    } finally {
      setLoading(false);
    }
  }

  const strategies = backendRecovery?.strategies || [];
  const recommended = backendRecovery?.recommended_strategy;

  return (
    <>
      <PageHero eyebrow="RESILIENCE ACTION CENTER" title="Recovery & Optimization" description="Compare recovery strategies against the actual disruption constraints in the backend." icon="🛡">
        <button className="hero-button" onClick={analyzeRecovery} disabled={loading || !activeFailure}>{loading ? "Analysing..." : "Analyze recovery →"}</button>
      </PageHero>

      <section className="failure-banner">
        <div>
          <span>ACTIVE DISRUPTION SIGNAL</span>
          <h2>{activeFailure ? `${nodeName(data.nodes, activeFailure.node_id)} · ${activeFailure.failure_type}` : "No unresolved failures"}</h2>
          <p>{activeFailure ? `Recorded ${activeFailure.date} · impact ${percentage(activeFailure.impact_score * 100)} · ${activeFailure.duration_hours}h duration.` : "No unresolved historical failure is currently available."}</p>
        </div>
        <strong>{activeFailure ? percentage(activeFailure.impact_score * 100) : "0%"}<small>impact</small></strong>
      </section>

      <section className="card">
        <SectionHeader title="Choose disruption" description="Recovery analysis uses a failure record that exists in failure_history.csv." />
        <div className="failure-selector">
          {unresolved.map((failure) => (
            <button key={failure.failure_id} className={activeFailure?.failure_id === failure.failure_id ? "failure-chip active" : "failure-chip"} onClick={() => { setActiveFailure(failure); setBackendRecovery(null); }}>
              <span>{failure.node_id}</span>
              <small>{percentage(failure.impact_score * 100)} impact</small>
            </button>
          ))}
        </div>
      </section>

      {backendRecovery ? (
        <>
          <div className="two-column">
            <section className="card">
              <SectionHeader title="Recovery strategies" description={`${strategies.length} strategies returned by the optimizer.`} />
              <div className="strategy-list">
                {strategies.map((strategy, index) => (
                  <div className={`strategy-row ${strategy.feasible ? "feasible" : "blocked"}`} key={index}>
                    <div><strong>{strategy.name || strategy.strategy || `Strategy ${index + 1}`}</strong><small>{strategy.feasible ? "Feasible" : "Blocked by constraints"}</small></div>
                    <span>{strategy.cost ?? "—"}</span>
                    <span>{strategy.delay ?? "—"}</span>
                    <span>{strategy.disruption ?? "—"}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="card recommended-card">
              <div className="recommendation-icon">✦</div>
              <div className="eyebrow">OPTIMIZER DECISION</div>
              {recommended ? (
                <>
                  <h2>{recommended.name || recommended.strategy || "Recommended strategy"}</h2>
                  <p>The optimizer selected a feasible option for the active failure.</p>
                  <button className="primary-button" onClick={() => showToast("Recovery plan marked for review.")}>Review recovery plan</button>
                </>
              ) : (
                <>
                  <h2>No feasible strategy</h2>
                  <p>All available strategies are blocked under the current capacity and demand constraints.</p>
                  <button className="secondary-button" onClick={() => openSimulation(activeFailure?.node_id || "")}>Inspect disruption →</button>
                </>
              )}
            </section>
          </div>

          <section className="card chart-card">
            <SectionHeader title="Strategy comparison" description="Relative cost, delay and disruption returned by the optimizer." />
            <StrategyChart strategies={strategies} />
          </section>
        </>
      ) : (
        <section className="card empty-analysis">
          <div className="recommendation-icon">↻</div>
          <h2>Run recovery analysis</h2>
          <p>Select a failure above and analyze it against the real recovery optimizer.</p>
        </section>
      )}
    </>
  );
}

function StrategyChart({ strategies }) {
  if (!strategies.length) return <div className="empty-state compact">No strategy data returned.</div>;
  const getValue = (strategy, keys) => {
    for (const key of keys) {
      if (strategy[key] !== undefined && Number.isFinite(Number(strategy[key]))) return Number(strategy[key]);
    }
    return 0;
  };
  return (
    <div className="strategy-chart">
      {strategies.map((strategy, index) => {
        const cost = getValue(strategy, ["cost", "estimated_cost"]);
        const delay = getValue(strategy, ["delay", "delay_hours", "delay_days"]);
        const disruption = getValue(strategy, ["disruption", "disruption_pct", "impact"]);
        const max = Math.max(1, cost, delay, disruption);
        return (
          <div className="strategy-chart-row" key={index}>
            <span>{strategy.name || strategy.strategy || `Strategy ${index + 1}`}</span>
            <div className="strategy-bars">
              <i style={{ width: `${cost / max * 100}%` }} title={`Cost ${cost}`} />
              <i style={{ width: `${delay / max * 100}%` }} title={`Delay ${delay}`} />
              <i style={{ width: `${disruption / max * 100}%` }} title={`Disruption ${disruption}`} />
            </div>
            <b>{strategy.feasible ? "Feasible" : "Blocked"}</b>
          </div>
        );
      })}
      <div className="chart-key"><span><i />Cost</span><span><i />Delay</span><span><i />Disruption</span></div>
    </div>
  );
}

function Recommendations({ data, navigate, openSimulation }) {
  const recommendations = useMemo(() => {
    const unresolved = data.failures.filter((f) => !f.resolved);
    const topFailures = [...unresolved].sort((a, b) => b.impact_score - a.impact_score).slice(0, 5);

    return topFailures.map((failure, index) => ({
      id: failure.failure_id,
      priority: index + 1,
      node: failure.node_id,
      title: `Investigate ${nodeName(data.nodes, failure.node_id)}`,
      reason: `${failure.failure_type.replaceAll("_", " ")} with ${percentage(failure.impact_score * 100)} historical impact.`,
      impact: failure.impact_score * 100
    }));
  }, [data]);

  return (
    <>
      <PageHero eyebrow="DECISION SUPPORT" title="Recommendations" description="Turn the strongest available risk signals into concrete next analysis steps." icon="✦" />
      <div className="recommendation-grid">
        {recommendations.map((item) => (
          <section className="card recommendation-card" key={item.id}>
            <div className="priority-badge">P{item.priority}</div>
            <div className="eyebrow">ACTION RECOMMENDED</div>
            <h2>{item.title}</h2>
            <p>{item.reason}</p>
            <div className="recommend-metric"><span>Impact signal</span><strong>{item.impact.toFixed(1)}%</strong></div>
            <button className="primary-button" onClick={() => openSimulation(item.node)}>Simulate ripple →</button>
          </section>
        ))}
      </div>
      {!recommendations.length && <div className="card empty-state">No unresolved signals currently require action.</div>}
      <section className="card recommendation-footer">
        <div><div className="eyebrow">WORKFLOW</div><h2>Recommendations are starting points, not automatic decisions.</h2><p>Use simulation and recovery analysis to validate the operational consequence before acting.</p></div>
        <button className="secondary-button" onClick={() => navigate("recovery")}>Open recovery center →</button>
      </section>
    </>
  );
}

function Reports({ data, navigate }) {
  const { nodes, edges, failures, demand } = data;
  const date = latestDate(demand);
  const latest = demand.filter((r) => r.date === date);
  const totalDemand = latest.reduce((s, r) => s + r.demand, 0);
  const fulfilled = latest.reduce((s, r) => s + r.fulfilled, 0);
  const unresolved = failures.filter((f) => !f.resolved);
  const avgReliability = nodes.filter((n) => n.type !== "customer").reduce((s, n) => s + n.reliability, 0) / Math.max(1, nodes.filter((n) => n.type !== "customer").length);

  return (
    <>
      <PageHero eyebrow="REPORTING" title="Operational Report" description="A clean summary of the current Ripplexa prototype state." icon="▤">
        <button className="hero-button" onClick={() => window.print()}>Print report</button>
      </PageHero>

      <section className="report-sheet">
        <div className="report-header"><div><div className="eyebrow">RIPPLEXA · RESILIENCE INTELLIGENCE</div><h2>Supply Network Health Report</h2><p>Generated from the current prototype dataset.</p></div><span>{new Date().toLocaleDateString()}</span></div>

        <div className="report-kpis">
          <MiniStat label="Nodes" value={nodes.length} />
          <MiniStat label="Dependencies" value={edges.length} />
          <MiniStat label="Open failures" value={unresolved.length} />
          <MiniStat label="Reliability" value={percentage(avgReliability * 100)} />
          <MiniStat label="Latest demand" value={formatNumber(totalDemand)} />
          <MiniStat label="Fulfilled" value={formatNumber(fulfilled)} />
        </div>

        <div className="report-section">
          <h3>Latest failure exposure</h3>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Failure</th><th>Node</th><th>Date</th><th>Impact</th><th>Status</th></tr></thead>
              <tbody>{[...failures].sort((a, b) => b.impact_score - a.impact_score).slice(0, 10).map((f) => <tr key={f.failure_id}><td>{f.failure_type}</td><td>{nodeName(nodes, f.node_id)}</td><td>{f.date}</td><td>{percentage(f.impact_score * 100)}</td><td>{f.resolved ? "Resolved" : "Open"}</td></tr>)}</tbody>
            </table>
          </div>
        </div>

        <div className="report-section report-note">
          <strong>Prototype note</strong>
          <p>ML outputs in this prototype are generated from the current training/data pipeline. They should be presented as prototype predictions, not validated production forecasts.</p>
        </div>
      </section>

      <div className="section-heading-row"><div><div className="eyebrow">NEXT STEP</div><h2>Continue analysis</h2></div><button className="secondary-button" onClick={() => navigate("simulation")}>Run simulation →</button></div>
    </>
  );
}
