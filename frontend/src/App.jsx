import React, { useEffect, useMemo, useState } from "react";

const FILES = {
  demand: "/data/demand_history.csv",
  edges: "/data/edges.csv",
  failures: "/data/failure_history.csv",
  nodes: "/data/nodes.csv"
};

function parseCSV(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = lines[0]
    .split(",")
    .map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (char === "," && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());

    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

const number = (value) => Number(value) || 0;

function percentage(value) {
  return `${Number(value).toFixed(1)}%`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1
  }).format(value);
}

function latestDate(rows) {
  if (!rows.length) return "";

  return rows.reduce((latest, row) => {
    return row.date > latest ? row.date : latest;
  }, rows[0].date);
}

function getNode(nodes, id) {
  return nodes.find((node) => node.node_id === id);
}

function nodeName(nodes, id) {
  return getNode(nodes, id)?.name || id;
}


async function loadAllData() {
  const [
    demandResponse,
    edgesResponse,
    failuresResponse,
    nodesResponse
  ] = await Promise.all([
    fetch(FILES.demand),
    fetch(FILES.edges),
    fetch(FILES.failures),
    fetch(FILES.nodes)
  ]);

  if (
    !demandResponse.ok ||
    !edgesResponse.ok ||
    !failuresResponse.ok ||
    !nodesResponse.ok
  ) {
    throw new Error("Unable to load CSV files.");
  }

  const demandText = await demandResponse.text();
  const edgesText = await edgesResponse.text();
  const failuresText = await failuresResponse.text();
  const nodesText = await nodesResponse.text();

  const demand = parseCSV(demandText).map((row) => ({
    ...row,
    demand: number(row.demand),
    fulfilled: number(row.fulfilled)
  }));

  const edges = parseCSV(edgesText).map((row) => ({
    ...row,
    strength: number(row.strength),
    lead_time_days: number(row.lead_time_days)
  }));

  const failures = parseCSV(failuresText).map((row) => ({
    ...row,
    duration_hours: number(row.duration_hours),
    impact_score: number(row.impact_score),
    resolved:
      String(row.resolved).toLowerCase() === "true"
  }));

  const nodes = parseCSV(nodesText).map((row) => ({
    ...row,
    capacity: number(row.capacity),
    reliability: number(row.reliability)
  }));

  return {
    demand,
    edges,
    failures,
    nodes
  };
}



export default function App() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function refreshData() {
    try {
      setLoading(true);
      setError("");

      const freshData = await loadAllData();

      setData(freshData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);

      setError(
        "Could not load the CSV files. Check frontend/public/data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  function showToast(message) {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 2500);
  }

  if (loading && !data) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>

        <h3>Loading Ripplexa</h3>

        <p>
          Reading supply-chain data from the CSV files...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="loading-screen">
        <h3>Unable to load Ripplexa</h3>

        <p>{error}</p>

        <button
          className="primary-button"
          onClick={refreshData}
        >
          Try Again
        </button>
      </div>
    );
  }

  const commonProps = {
    data,
    navigate: setPage,
    showToast
  };

  return (
    <div className="app">

      <Header
        page={page}
        navigate={setPage}
      />

      <main className="main-container">

        {page === "dashboard" && (
          <Dashboard {...commonProps} />
        )}

        {page === "network" && (
          <NetworkAnalysis
            {...commonProps}
            refreshData={refreshData}
            lastRefresh={lastRefresh}
          />
        )}

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
          />
        )}

        {page === "trace" && (
          <TraceNetwork {...commonProps} />
        )}

        {page === "recovery" && (
          <Recovery {...commonProps} />
        )}

      </main>

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

    </div>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header({ page, navigate }) {
  const pageNames = {
    dashboard: "Dashboard",
    network: "Network Analysis",
    risk: "Risk Prediction",
    "risk-detail": "Risk Investigation",
    simulation: "Impact Simulation",
    trace: "Network Trace",
    recovery: "Recovery"
  };

  return (
    <header className="topbar">

      <div className="breadcrumb">

        <button
          onClick={() => navigate("dashboard")}
        >
          Ripplexa
        </button>

        <span>/</span>

        <span>
          {pageNames[page]}
        </span>

      </div>

      <div className="topbar-right">

        <span className="notification">
          ◇
          <i></i>
        </span>

        <span className="avatar">
          U
        </span>

      </div>

    </header>
  );
}

/* =========================================================
   PAGE TITLE
========================================================= */

function PageTitle({
  eyebrow,
  title,
  description,
  button,
  onClick
}) {
  return (
    <div className="page-title">

      <div>

        <div className="eyebrow">
          {eyebrow}
        </div>

        <h1>{title}</h1>

        <p>{description}</p>

      </div>

      {button && (
        <button
          className="primary-button"
          onClick={onClick}
        >
          {button}
        </button>
      )}

    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  data,
  navigate
}) {
  const {
    nodes,
    edges,
    failures,
    demand
  } = data;

  const operationalNodes = nodes.filter(
    (node) => node.type !== "customer"
  );

  const networkHealth =
    operationalNodes.length
      ? operationalNodes.reduce(
          (sum, node) =>
            sum + node.reliability,
          0
        ) /
          operationalNodes.length *
          100
      : 0;

  const unresolvedFailures =
    failures.filter(
      (failure) => !failure.resolved
    );

  const currentDate = latestDate(demand);

  const currentDemand =
    demand.filter(
      (row) =>
        row.date === currentDate
    );

  const totalDemand =
    currentDemand.reduce(
      (sum, row) =>
        sum + row.demand,
      0
    );

  const totalFulfilled =
    currentDemand.reduce(
      (sum, row) =>
        sum + row.fulfilled,
      0
    );

  const atRiskDemand =
    totalDemand - totalFulfilled;

  const recoveryReadiness =
    Math.max(
      0,
      100 -
        unresolvedFailures.reduce(
          (sum, failure) =>
            sum +
            failure.impact_score,
          0
        ) /
          Math.max(
            1,
            failures.length
          ) *
          100
    );

  const suppliers =
    nodes.filter(
      (node) =>
        node.type === "supplier"
    );

  const warehouses =
    nodes.filter(
      (node) =>
        node.type === "warehouse"
    );

  const recentAlerts =
    [...failures]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(0, 4);

  return (
    <>

      <PageTitle
        eyebrow="SUPPLY CHAIN CONTROL CENTER"
        title="Good afternoon."
        description={`Live view based on spreadsheet data through ${currentDate}. Act before disruptions become problems.`}
        button="+ Run Network Analysis"
        onClick={() =>
          navigate("network")
        }
      />

      <div className="metrics-grid">

        <MetricCard
          title="Network Health"
          value={percentage(
            networkHealth
          )}
          description="Average operational node reliability"
          color="green"
          progress={networkHealth}
        />

        <MetricCard
          title="Active Risks"
          value={String(
            unresolvedFailures.length
          ).padStart(2, "0")}
          description="Unresolved failures in history"
          color="amber"
          link="View risks →"
          onClick={() =>
            navigate("risk")
          }
        />

        <MetricCard
          title="At-Risk Demand"
          value={formatNumber(
            atRiskDemand
          )}
          description={`Unfulfilled units on ${currentDate}`}
          color="red"
          link="Check impact →"
          onClick={() =>
            navigate("simulation")
          }
        />

        <MetricCard
          title="Recovery Readiness"
          value={percentage(
            recoveryReadiness
          )}
          description="Based on current failure exposure"
          color="blue"
          link="View recovery →"
          onClick={() =>
            navigate("recovery")
          }
        />

      </div>

      <div className="two-column">

        <section className="card">

          <div className="section-header">

            <div>

              <h2>
                Your Supply Network
              </h2>

              <p>
                A live view of suppliers,
                warehouses and downstream
                demand.
              </p>

            </div>

            <button
              className="secondary-button"
              onClick={() =>
                navigate("trace")
              }
            >
              View network
            </button>

          </div>

          <div className="network-flow">

            <NetworkBubble
              letter="S"
              title="Suppliers"
              value={suppliers.length}
              note={`${suppliers.filter(
                (s) =>
                  s.reliability < 0.9
              ).length} need attention`}
              color="teal"
            />

            <span className="flow-arrow">
              →
            </span>

            <NetworkBubble
              letter="W"
              title="Warehouses"
              value={warehouses.length}
              note={`${warehouses.filter(
                (w) =>
                  w.reliability < 0.9
              ).length} need attention`}
              color="purple"
            />

            <span className="flow-arrow">
              →
            </span>

            <NetworkBubble
              letter="D"
              title="Demand"
              value={formatNumber(
                totalDemand
              )}
              note={`${currentDemand.length} monitored nodes`}
              color="orange"
            />

          </div>

        </section>

        <section className="card">

          <div className="section-header">

            <div>

              <h2>
                Recent Alerts
              </h2>

              <p>
                Things that need your
                attention.
              </p>

            </div>

            <button
              className="text-button"
              onClick={() =>
                navigate("risk")
              }
            >
              See all
            </button>

          </div>

          {recentAlerts.map(
            (failure) => (

              <div
                className="alert-row"
                key={failure.failure_id}
              >

                <span
                  className={
                    "alert-icon " +
                    (
                      failure.resolved
                        ? "success"
                        : failure.impact_score >= 0.7
                        ? "critical"
                        : "warning"
                    )
                  }
                >
                  {failure.resolved
                    ? "✓"
                    : "!"}
                </span>

                <div>

                  <strong>
                    {failure.failure_type.replace(
                      "_",
                      " "
                    )}
                  </strong>

                  <small>
                    {nodeName(
                      nodes,
                      failure.node_id
                    )}
                  </small>

                  <small>
                    {failure.date}
                    {" · impact "}
                    {percentage(
                      failure.impact_score *
                        100
                    )}
                  </small>

                </div>

              </div>

            )
          )}

        </section>

      </div>

      <h2 className="action-heading">
        What would you like to do?
      </h2>

      <p className="action-description">
        Start with the part of your supply
        chain you want to understand.
      </p>

      <div className="action-grid">

        <ActionCard
          icon="◎"
          title="Predict Risk"
          description="Find potential disruptions before they happen."
          onClick={() =>
            navigate("risk")
          }
        />

        <ActionCard
          icon="◇"
          title="Simulate Impact"
          description="See what happens when something goes wrong."
          onClick={() =>
            navigate("simulation")
          }
        />

        <ActionCard
          icon="⌘"
          title="Trace Network"
          description="Follow products and dependencies through the network."
          onClick={() =>
            navigate("trace")
          }
        />

        <ActionCard
          icon="↻"
          title="Recover Faster"
          description="Find practical actions to restore operations."
          onClick={() =>
            navigate("recovery")
          }
        />

      </div>

    </>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  title,
  value,
  description,
  color,
  progress,
  link,
  onClick
}) {
  return (
    <div className="card metric-card">

      <div className="metric-header">

        <span>{title}</span>

        <i
          className={`status-dot ${color}`}
        ></i>

      </div>

      <strong>
        {value}
      </strong>

      <small>
        {description}
      </small>

      {progress !== undefined && (
        <div className="progress-bar">

          <span
            style={{
              width: `${Math.min(
                100,
                Math.max(
                  0,
                  progress
                )
              )}%`
            }}
          />

        </div>
      )}

      {link && (
        <button
          className="text-button"
          onClick={onClick}
        >
          {link}
        </button>
      )}

    </div>
  );
}

/* =========================================================
   NETWORK BUBBLE
========================================================= */

function NetworkBubble({
  letter,
  title,
  value,
  note,
  color
}) {
  return (
    <div className="network-bubble">

      <div
        className={`bubble ${color}`}
      >
        {letter}
      </div>

      <strong>
        {title}
      </strong>

      <b>
        {value}
      </b>

      <small>
        {note}
      </small>

    </div>
  );
}

/* =========================================================
   ACTION CARD
========================================================= */

function ActionCard({
  icon,
  title,
  description,
  onClick
}) {
  return (
    <button
      className="action-card"
      onClick={onClick}
    >

      <span className="action-icon">
        {icon}
      </span>

      <span className="action-content">

        <strong>
          {title}
        </strong>

        <small>
          {description}
        </small>

      </span>

      <span className="action-arrow">
        →
      </span>

    </button>
  );
}

/* =========================================================
   NETWORK ANALYSIS
========================================================= */

function NetworkAnalysis({
  data,
  navigate,
  refreshData,
  lastRefresh
}) {
  const {
    nodes,
    edges,
    failures,
    demand
  } = data;

  const operationalNodes =
    nodes.filter(
      (node) =>
        node.type !== "customer"
    );

  const averageReliability =
    operationalNodes.length
      ? operationalNodes.reduce(
          (sum, node) =>
            sum + node.reliability,
          0
        ) /
          operationalNodes.length *
          100
      : 0;

  const averageDependency =
    edges.length
      ? edges.reduce(
          (sum, edge) =>
            sum + edge.strength,
          0
        ) /
          edges.length *
          100
      : 0;

  const unresolvedFailures =
    failures.filter(
      (failure) =>
        !failure.resolved
    );

  const currentDate =
    latestDate(demand);

  const latestDemand =
    demand.filter(
      (row) =>
        row.date === currentDate
    );

  const totalDemand =
    latestDemand.reduce(
      (sum, row) =>
        sum + row.demand,
      0
    );

  const totalFulfilled =
    latestDemand.reduce(
      (sum, row) =>
        sum + row.fulfilled,
      0
    );

  const fillRate =
    totalDemand > 0
      ? totalFulfilled /
        totalDemand *
        100
      : 0;

  const criticalNodes =
    [...operationalNodes]
      .sort(
        (a, b) =>
          a.reliability -
          b.reliability
      )
      .slice(0, 6);

  const dependencyTypes = [
    "supply",
    "inventory",
    "distribution",
    "retail"
  ];

  return (
    <>

      <PageTitle
        eyebrow="NETWORK ANALYTICS"
        title="Network Analysis"
        description={`Computed from ${nodes.length} nodes, ${edges.length} dependencies and ${failures.length} recorded failures.`}
        button="↻ Refresh analysis"
        onClick={refreshData}
      />

      <div className="metrics-grid">

        <MetricCard
          title="Operational Reliability"
          value={percentage(
            averageReliability
          )}
          description="Average operational node reliability"
          color="green"
          progress={averageReliability}
        />

        <MetricCard
          title="Dependency Strength"
          value={percentage(
            averageDependency
          )}
          description="Average strength across all dependencies"
          color="blue"
        />

        <MetricCard
          title="Open Failures"
          value={String(
            unresolvedFailures.length
          ).padStart(2, "0")}
          description="Historical failures still unresolved"
          color="red"
        />

        <MetricCard
          title="Latest Fill Rate"
          value={percentage(
            fillRate
          )}
          description={`Demand fulfillment on ${currentDate}`}
          color="amber"
        />

      </div>

      <div className="two-column">

        <section className="card">

          <div className="section-header">

            <div>

              <h2>
                Network Structure
              </h2>

              <p>
                Nodes and dependencies
                read directly from the
                CSV files.
              </p>

            </div>

            <span className="data-chip">
              Updated{" "}
              {lastRefresh.toLocaleTimeString()}
            </span>

          </div>

          <div className="network-layers">

            {[
              "supplier",
              "warehouse",
              "production",
              "store",
              "customer"
            ].map((type) => {

              const layerNodes =
                nodes.filter(
                  (node) =>
                    node.type === type
                );

              return (
                <div
                  className="network-layer"
                  key={type}
                >

                  <div className="layer-label">
                    {type}
                  </div>

                  <div className="layer-items">

                    {layerNodes.map(
                      (node) => (

                        <div
                          className="mini-node"
                          key={node.node_id}
                        >

                          <strong>
                            {node.node_id}
                          </strong>

                          <small>
                            Reliability{" "}
                            {percentage(
                              node.reliability *
                                100
                            )}
                          </small>

                        </div>

                      )
                    )}

                  </div>

                </div>
              );
            })}

          </div>

        </section>

        <section className="card">

          <div className="section-header">

            <div>

              <h2>
                Critical Nodes
              </h2>

              <p>
                Lowest reliability among
                operational nodes.
              </p>

            </div>

          </div>

          {criticalNodes.map(
            (node) => (

              <div
                className="ranking-row"
                key={node.node_id}
              >

                <div>

                  <strong>
                    {node.name}
                  </strong>

                  <small>
                    {node.node_id}
                    {" · "}
                    {node.location}
                  </small>

                </div>

                <b
                  className={
                    node.reliability < 0.9
                      ? "red-text"
                      : "amber-text"
                  }
                >
                  {percentage(
                    node.reliability *
                      100
                  )}
                </b>

              </div>

            )
          )}

        </section>

      </div>

      <section className="card">

        <div className="section-header">

          <div>

            <h2>
              Dependency Overview
            </h2>

            <p>
              Relationship information
              from edges.csv.
            </p>

          </div>

        </div>

        <div className="table-wrapper">

          <table>

            <thead>

              <tr>
                <th>Dependency</th>
                <th>Connections</th>
                <th>Avg. Strength</th>
                <th>Avg. Lead Time</th>
              </tr>

            </thead>

            <tbody>

              {dependencyTypes.map(
                (type) => {

                  const typeEdges =
                    edges.filter(
                      (edge) =>
                        edge.dependency_type ===
                        type
                    );

                  if (
                    !typeEdges.length
                  ) {
                    return null;
                  }

                  const avgStrength =
                    typeEdges.reduce(
                      (sum, edge) =>
                        sum +
                        edge.strength,
                      0
                    ) /
                    typeEdges.length;

                  const avgLead =
                    typeEdges.reduce(
                      (sum, edge) =>
                        sum +
                        edge.lead_time_days,
                      0
                    ) /
                    typeEdges.length;

                  return (
                    <tr key={type}>

                      <td>
                        {type}
                      </td>

                      <td>
                        {typeEdges.length}
                      </td>

                      <td>
                        {avgStrength.toFixed(
                          2
                        )}
                      </td>

                      <td>
                        {avgLead.toFixed(
                          1
                        )}{" "}
                        days
                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>

      </section>

    </>
  );
}

/* =========================================================
   RISK PREDICTION
========================================================= */

function RiskPrediction({
  data,
  navigate,
  setSelectedRisk
}) {
  const {
    nodes,
    failures,
    edges
  } = data;

  const risks = useMemo(() => {

    const supplierRisks =
      nodes
        .filter(
          (node) =>
            node.type ===
            "supplier"
        )
        .map((node) => {

          const nodeFailures =
            failures.filter(
              (failure) =>
                failure.node_id ===
                node.node_id
            );

          const openFailures =
            nodeFailures.filter(
              (failure) =>
                !failure.resolved
            ).length;

          const historicalImpact =
            nodeFailures.length
              ? nodeFailures.reduce(
                  (sum, failure) =>
                    sum +
                    failure.impact_score,
                  0
                ) /
                nodeFailures.length
              : 0;

          const probability =
            Math.min(
              99,
              Math.round(
                (1 -
                  node.reliability) *
                  100 +
                  openFailures * 20 +
                  historicalImpact * 15
              )
            );

          return {
            id: node.node_id,
            title:
              `${node.name} delivery delay`,
            location:
              node.location,
            probability,
            type: "supplier"
          };
        });

    const warehouseRisks =
      nodes
        .filter(
          (node) =>
            node.type ===
            "warehouse"
        )
        .map((node) => {

          const nodeFailures =
            failures.filter(
              (failure) =>
                failure.node_id ===
                node.node_id
            );

          const openFailures =
            nodeFailures.filter(
              (failure) =>
                !failure.resolved
            ).length;

          const probability =
            Math.min(
              99,
              Math.round(
                (1 -
                  node.reliability) *
                  100 +
                  openFailures * 18
              )
            );

          return {
            id: node.node_id,
            title:
              `${node.name} inventory shortage`,
            location:
              node.location,
            probability,
            type: "warehouse"
          };
        });

    const supplyEdges =
      edges.filter(
        (edge) =>
          edge.dependency_type ===
          "supply"
      );

    const averageSupplyStrength =
      supplyEdges.length
        ? supplyEdges.reduce(
            (sum, edge) =>
              sum + edge.strength,
            0
          ) /
          supplyEdges.length
        : 1;

    const transportRisk = {
      id: "TRANSPORT",
      title:
        "Transport disruption",
      location:
        "Supply corridors",
      probability: Math.min(
        99,
        Math.max(
          1,
          Math.round(
            (1 -
              averageSupplyStrength) *
              100 +
              15
          )
        )
      ),
      type: "transport"
    };

    return [
      ...supplierRisks,
      ...warehouseRisks,
      transportRisk
    ].sort(
      (a, b) =>
        b.probability -
        a.probability
    );

  }, [
    nodes,
    failures,
    edges
  ]);

  const high =
    risks.filter(
      (risk) =>
        risk.probability >= 70
    ).length;

  const medium =
    risks.filter(
      (risk) =>
        risk.probability >= 40 &&
        risk.probability < 70
    ).length;

  const low =
    risks.filter(
      (risk) =>
        risk.probability < 40
    ).length;

  return (
    <>

      <PageTitle
        eyebrow="EARLY WARNING SYSTEM"
        title="Risk Prediction"
        description="Identify potential supply-chain disruptions using current network reliability and failure history."
        button="↻ Refresh analysis"
        onClick={() =>
          navigate("risk")
        }
      />

      <div className="metrics-grid">

        <MetricCard
          title="Risks Detected"
          value={String(
            risks.length
          ).padStart(2, "0")}
          description="Generated from actual network data"
          color="blue"
        />

        <MetricCard
          title="High Priority"
          value={String(
            high
          ).padStart(2, "0")}
          description="Estimated probability ≥ 70%"
          color="red"
        />

        <MetricCard
          title="Medium Priority"
          value={String(
            medium
          ).padStart(2, "0")}
          description="Estimated probability 40–69%"
          color="amber"
        />

        <MetricCard
          title="Low Priority"
          value={String(
            low
          ).padStart(2, "0")}
          description="Estimated probability < 40%"
          color="green"
        />

      </div>

      <div className="risk-grid">

        {risks.map(
          (risk) => (

            <RiskCard
              key={risk.id}
              risk={risk}
              onInvestigate={() => {
                setSelectedRisk(
                  risk.id
                );

                navigate(
                  "risk-detail"
                );
              }}
            />

          )
        )}

      </div>

    </>
  );
}

/* =========================================================
   RISK CARD
========================================================= */

function RiskCard({
  risk,
  onInvestigate
}) {
  const level =
    risk.probability >= 70
      ? "high"
      : risk.probability >= 40
      ? "medium"
      : "low";

  return (
    <section
      className={`card risk-card ${level}`}
    >

      <span className="risk-label">
        {level.toUpperCase()} RISK
      </span>

      <h2>
        {risk.title}
      </h2>

      <p>
        Based on current node
        reliability and recorded
        failure history.
      </p>

      <strong>
        {risk.probability}%
      </strong>

      <small>
        Estimated probability
      </small>

      <div className="risk-footer">

        <span>
          {risk.location}
        </span>

        <button
          className="text-button"
          onClick={onInvestigate}
        >
          Investigate →
        </button>

      </div>

    </section>
  );
}

/* =========================================================
   RISK INVESTIGATION
========================================================= */

function RiskInvestigation({
  data,
  navigate,
  selectedRisk
}) {
  if (
    selectedRisk ===
    "TRANSPORT"
  ) {
    return (
      <TransportInvestigation
        data={data}
        navigate={navigate}
      />
    );
  }

  const {
    nodes,
    failures,
    edges
  } = data;

  const node =
    getNode(
      nodes,
      selectedRisk
    ) ||
    nodes.find(
      (n) =>
        n.type ===
        "supplier"
    );

  if (!node) {
    return (
      <div className="empty-state">
        No risk information available.
      </div>
    );
  }

  const nodeFailures =
    failures.filter(
      (failure) =>
        failure.node_id ===
        node.node_id
    );

  const incoming =
    edges.filter(
      (edge) =>
        edge.to_node ===
        node.node_id
    );

  const outgoing =
    edges.filter(
      (edge) =>
        edge.from_node ===
        node.node_id
    );

  const unresolved =
    nodeFailures.filter(
      (failure) =>
        !failure.resolved
    ).length;

  const highestImpact =
    nodeFailures.length
      ? Math.max(
          ...nodeFailures.map(
            (failure) =>
              failure.impact_score
          )
        )
      : 0;

  return (
    <>

      <PageTitle
        eyebrow="RISK INVESTIGATION"
        title={`${node.name} — Investigation`}
        description={`Detailed analysis of ${node.node_id} using the actual uploaded data.`}
        button="← Back to risks"
        onClick={() =>
          navigate("risk")
        }
      />

      <div className="metrics-grid">

        <MetricCard
          title="Reliability"
          value={percentage(
            node.reliability *
              100
          )}
          description={`${node.location} · capacity ${node.capacity}`}
          color={
            node.reliability <
            0.9
              ? "red"
              : "green"
          }
        />

        <MetricCard
          title="Recorded Failures"
          value={String(
            nodeFailures.length
          ).padStart(2, "0")}
          description={`${unresolved} unresolved`}
          color={
            unresolved
              ? "red"
              : "green"
          }
        />

        <MetricCard
          title="Dependencies"
          value={String(
            incoming.length +
              outgoing.length
          ).padStart(2, "0")}
          description={`${incoming.length} incoming · ${outgoing.length} outgoing`}
          color="blue"
        />

        <MetricCard
          title="Historical Impact"
          value={percentage(
            highestImpact *
              100
          )}
          description="Highest recorded impact"
          color="amber"
        />

      </div>

      <div className="two-column">

        <section className="card">

          <div className="section-header">

            <div>

              <h2>
                Failure History
              </h2>

              <p>
                Historical events for
                this node.
              </p>

            </div>

          </div>

          {nodeFailures.length ===
          0 ? (

            <div className="empty-state">
              No recorded failures
              for this node.
            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Impact</th>
                    <th>Status</th>
                  </tr>

                </thead>

                <tbody>

                  {[
                    ...nodeFailures
                  ]
                    .sort(
                      (a, b) =>
                        new Date(
                          b.date
                        ) -
                        new Date(
                          a.date
                        )
                    )
                    .map(
                      (failure) => (

                        <tr
                          key={
                            failure.failure_id
                          }
                        >

                          <td>
                            {failure.date}
                          </td>

                          <td>
                            {
                              failure.failure_type
                            }
                          </td>

                          <td>
                            {
                              failure.duration_hours
                            }
                            h
                          </td>

                          <td>
                            {percentage(
                              failure.impact_score *
                                100
                            )}
                          </td>

                          <td>

                            <span
                              className={
                                failure.resolved
                                  ? "status-pill success"
                                  : "status-pill danger"
                              }
                            >
                              {failure.resolved
                                ? "Resolved"
                                : "Open"}
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        <section className="card">

          <h2>
            Recommended Investigation
          </h2>

          <div className="recommendation-box">

            <strong>
              {unresolved
                ? "Simulate this node failure"
                : "Run a scenario test"}
            </strong>

            <p>
              {unresolved
                ? "An unresolved failure exists for this node. Run a simulation to understand its downstream effect."
                : "This node has no unresolved failure, but you can still test how a disruption would affect the network."}
            </p>

            <button
              className="primary-button"
              onClick={() =>
                navigate(
                  "simulation"
                )
              }
            >
              Open Impact Simulation →
            </button>

          </div>

        </section>

      </div>

    </>
  );
}

/* =========================================================
   TRANSPORT INVESTIGATION
========================================================= */

function TransportInvestigation({
  data,
  navigate
}) {
  const supplyEdges =
    data.edges.filter(
      (edge) =>
        edge.dependency_type ===
        "supply"
    );

  const averageStrength =
    supplyEdges.reduce(
      (sum, edge) =>
        sum + edge.strength,
      0
    ) /
    Math.max(
      1,
      supplyEdges.length
    );

  const risk = Math.min(
    99,
    Math.max(
      1,
      Math.round(
        (1 -
          averageStrength) *
          100 +
          15
      )
    )
  );

  return (
    <>

      <PageTitle
        eyebrow="RISK INVESTIGATION"
        title="Transport Disruption"
        description="Investigation of the supply routes recorded in edges.csv."
        button="← Back to risks"
        onClick={() =>
          navigate("risk")
        }
      />

      <div className="metrics-grid">

        <MetricCard
          title="Risk Signal"
          value={`${risk}%`}
          description="Calculated from supply-edge strength"
          color="amber"
        />

        <MetricCard
          title="Supply Routes"
          value={
            supplyEdges.length
          }
          description="Recorded supply relationships"
          color="blue"
        />

        <MetricCard
          title="Average Strength"
          value={averageStrength.toFixed(
            2
          )}
          description="Average supply dependency strength"
          color="green"
        />

        <MetricCard
          title="Avg. Lead Time"
          value={`${(
            supplyEdges.reduce(
              (sum, edge) =>
                sum +
                edge.lead_time_days,
              0
            ) /
            Math.max(
              1,
              supplyEdges.length
            )
          ).toFixed(1)} days`}
          description="Across supply routes"
          color="amber"
        />

      </div>

      <section className="card">

        <h2>
          Supply Routes
        </h2>

        <div className="table-wrapper">

          <table>

            <thead>

              <tr>
                <th>From</th>
                <th>To</th>
                <th>Strength</th>
                <th>Lead Time</th>
              </tr>

            </thead>

            <tbody>

              {supplyEdges.map(
                (edge, index) => (

                  <tr key={index}>

                    <td>
                      {nodeName(
                        data.nodes,
                        edge.from_node
                      )}
                    </td>

                    <td>
                      {nodeName(
                        data.nodes,
                        edge.to_node
                      )}
                    </td>

                    <td>
                      {edge.strength.toFixed(
                        2
                      )}
                    </td>

                    <td>
                      {
                        edge.lead_time_days
                      }{" "}
                      days
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>

    </>
  );
}

/* =========================================================
   IMPACT SIMULATION
========================================================= */

function ImpactSimulation({
  data,
  navigate,
  simulationResult,
  setSimulationResult
}) {
  const [scenario, setScenario] =
    useState("supplier");

  const [targetNode, setTargetNode] =
    useState("");

  const targetNodes =
    data.nodes.filter(
      (node) =>
        node.type !==
        "customer"
    );

  useEffect(() => {
    if (
      !targetNode &&
      targetNodes.length
    ) {
      setTargetNode(
        targetNodes[0].node_id
      );
    }
  }, [
    targetNode,
    targetNodes
  ]);

  function runSimulation() {
    const node =
      getNode(
        data.nodes,
        targetNode
      );

    if (!node) return;

    const relatedEdges =
      data.edges.filter(
        (edge) =>
          edge.from_node ===
            targetNode ||
          edge.to_node ===
            targetNode
      );

    const affectedDemand =
      data.demand
        .filter(
          (row) =>
            row.node_id ===
            targetNode
        )
        .reduce(
          (sum, row) =>
            sum +
            Math.max(
              0,
              row.demand -
                row.fulfilled
            ),
          0
        );

    const failureImpact =
      data.failures
        .filter(
          (failure) =>
            failure.node_id ===
            targetNode
        )
        .reduce(
          (sum, failure) =>
            sum +
            failure.impact_score,
          0
        );

    const impact =
      Math.min(
        99,
        Math.round(
          node.reliability *
            35 +
            relatedEdges.length *
              8 +
            failureImpact *
              25 +
            affectedDemand /
              Math.max(
                1,
                node.capacity
              ) *
              20
        )
      );

    const affectedNodes =
      data.edges.filter(
        (edge) =>
          edge.from_node ===
          targetNode
      );

    setSimulationResult({
      scenario,
      targetNode,
      nodeName: node.name,
      impact,
      affectedDemand,
      affectedNodes,
      relatedEdges,
      timestamp:
        new Date()
    });
  }

  if (simulationResult) {
    return (
      <SimulationResult
        result={
          simulationResult
        }
        navigate={navigate}
        onNewSimulation={() =>
          setSimulationResult(
            null
          )
        }
      />
    );
  }

  return (
    <>

      <PageTitle
        eyebrow="WHAT-IF ANALYSIS"
        title="Impact Simulation"
        description="Test a disruption scenario against the current supply-chain data."
        button="← Back to dashboard"
        onClick={() =>
          navigate("dashboard")
        }
      />

      <section className="card simulation-panel">

        <h2>
          Choose a scenario
        </h2>

        <p>
          Select the disruption you
          want to simulate.
        </p>

        <div className="scenario-grid">

          <button
            className={
              scenario === "supplier"
                ? "scenario-card selected"
                : "scenario-card"
            }
            onClick={() =>
              setScenario(
                "supplier"
              )
            }
          >

            <span>
              ↗
            </span>

            <strong>
              Supplier Failure
            </strong>

            <small>
              Simulate a supplier
              disruption.
            </small>

          </button>

          <button
            className={
              scenario === "warehouse"
                ? "scenario-card selected"
                : "scenario-card"
            }
            onClick={() =>
              setScenario(
                "warehouse"
              )
            }
          >

            <span>
              ▣
            </span>

            <strong>
              Warehouse Failure
            </strong>

            <small>
              Simulate warehouse
              disruption.
            </small>

          </button>

          <button
            className={
              scenario === "transport"
                ? "scenario-card selected"
                : "scenario-card"
            }
            onClick={() =>
              setScenario(
                "transport"
              )
            }
          >

            <span>
              ⇄
            </span>

            <strong>
              Transport Disruption
            </strong>

            <small>
              Simulate a route
              disruption.
            </small>

          </button>

          <button
            className={
              scenario === "demand"
                ? "scenario-card selected"
                : "scenario-card"
            }
            onClick={() =>
              setScenario(
                "demand"
              )
            }
          >

            <span>
              ◇
            </span>

            <strong>
              Demand Shock
            </strong>

            <small>
              Simulate additional
              demand pressure.
            </small>

          </button>

        </div>

        <div className="simulation-form">

          <label>

            Target node

            <select
              value={targetNode}
              onChange={(event) =>
                setTargetNode(
                  event.target.value
                )
              }
            >

              {targetNodes.map(
                (node) => (

                  <option
                    key={
                      node.node_id
                    }
                    value={
                      node.node_id
                    }
                  >
                    {node.name} (
                    {node.node_id})
                  </option>

                )
              )}

            </select>

          </label>

        </div>

        <button
          className="primary-button simulation-button"
          onClick={
            runSimulation
          }
        >
          Run Simulation →
        </button>

      </section>

    </>
  );
}

/* =========================================================
   SIMULATION RESULT
========================================================= */

function SimulationResult({
  result,
  navigate,
  onNewSimulation
}) {
  return (
    <>

      <PageTitle
        eyebrow="SIMULATION RESULT"
        title="Impact Analysis"
        description={`Simulation for ${result.nodeName}.`}
        button="New simulation"
        onClick={
          onNewSimulation
        }
      />

      <section className="card">

        <div className="result-header">

          <span className="eyebrow">
            SCENARIO
          </span>

          <h2>
            {result.scenario}
          </h2>

          <p>
            Target:
            {" "}
            {result.nodeName}
            {" "}
            ({result.targetNode})
          </p>

        </div>

        <div className="metrics-grid inner-metrics">

          <MetricCard
            title="Estimated Impact"
            value={`${result.impact}%`}
            description="Estimated network impact"
            color="red"
            progress={
              result.impact
            }
          />

          <MetricCard
            title="Affected Demand"
            value={formatNumber(
              result.affectedDemand
            )}
            description="Current unfulfilled demand"
            color="amber"
          />

          <MetricCard
            title="Connected Routes"
            value={
              result.relatedEdges.length
            }
            description="Dependencies involving target"
            color="blue"
          />

          <MetricCard
            title="Downstream Nodes"
            value={
              result.affectedNodes.length
            }
            description="Directly affected nodes"
            color="green"
          />

        </div>

      </section>

      <section className="card">

        <h2>
          What happens next?
        </h2>

        <p>
          The selected node has
          {result.affectedNodes.length}
          {" "}
          direct downstream
          dependencies. A disruption
          can therefore propagate
          through those relationships.
        </p>

        <button
          className="primary-button"
          onClick={() =>
            navigate("recovery")
          }
        >
          View Recovery Actions →
        </button>

      </section>

    </>
  );
}

/* =========================================================
   TRACE NETWORK
========================================================= */

function TraceNetwork({
  data,
  navigate
}) {
  const traceableNodes =
    data.nodes.filter(
      (node) =>
        node.type !==
        "customer"
    );

  const [
    startNode,
    setStartNode
  ] = useState(
    traceableNodes[0]
      ?.node_id || ""
  );

  const [
    targetNode,
    setTargetNode
  ] = useState("");

  const route =
    targetNode
      ? findPath(
          data.edges,
          startNode,
          targetNode
        )
      : [];

  const directEdges =
    data.edges.filter(
      (edge) =>
        edge.from_node ===
        startNode
    );

  return (
    <>

      <PageTitle
        eyebrow="NETWORK TRACE"
        title="Trace Network"
        description="Follow dependencies from one node to another."
        button="← Dashboard"
        onClick={() =>
          navigate("dashboard")
        }
      />

      <section className="card">

        <div className="simulation-form">

          <label>

            Start from

            <select
              value={startNode}
              onChange={(event) => {

                setStartNode(
                  event.target.value
                );

                setTargetNode("");

              }}
            >

              {traceableNodes.map(
                (node) => (

                  <option
                    key={
                      node.node_id
                    }
                    value={
                      node.node_id
                    }
                  >
                    {node.name} (
                    {node.node_id})
                  </option>

                )
              )}

            </select>

          </label>

          <label>

            Trace to

            <select
              value={targetNode}
              onChange={(event) =>
                setTargetNode(
                  event.target.value
                )
              }
            >

              <option value="">
                Select destination
              </option>

              {traceableNodes
                .filter(
                  (node) =>
                    node.node_id !==
                    startNode
                )
                .map(
                  (node) => (

                    <option
                      key={
                        node.node_id
                      }
                      value={
                        node.node_id
                      }
                    >
                      {node.name} (
                      {node.node_id})
                    </option>

                  )
                )}

            </select>

          </label>

        </div>

        {targetNode ? (

          route.length ? (

            <div className="trace-result">

              <div className="route-line">

                {[
                  startNode,
                  ...route.map(
                    (edge) =>
                      edge.to_node
                  )
                ].map(
                  (
                    id,
                    index,
                    list
                  ) => {

                    const node =
                      getNode(
                        data.nodes,
                        id
                      );

                    return (
                      <React.Fragment
                        key={id}
                      >

                        <div className="route-node">

                          <span>
                            {node?.type
                              ?.charAt(
                                0
                              )
                              .toUpperCase() ||
                              "N"}
                          </span>

                          <strong>
                            {node?.name ||
                              id}
                          </strong>

                          <small>
                            {node?.location ||
                              ""}
                          </small>

                        </div>

                        {index <
                          list.length -
                            1 && (

                          <div className="route-arrow">

                            →

                            <small>
                              {
                                route[
                                  index
                                ]
                                  ?.lead_time_days
                              }{" "}
                              days
                            </small>

                          </div>

                        )}

                      </React.Fragment>
                    );
                  }
                )}

              </div>

              <div className="trace-summary">

                <strong>
                  {route.length}
                  {" "}
                  dependencies
                </strong>

                <span>
                  Combined lead time:
                  {" "}
                  {route.reduce(
                    (sum, edge) =>
                      sum +
                      edge.lead_time_days,
                    0
                  )}
                  {" "}
                  days
                </span>

                <span>
                  Weakest link:
                  {" "}
                  {Math.min(
                    ...route.map(
                      (edge) =>
                        edge.strength
                    )
                  ).toFixed(2)}
                </span>

              </div>

            </div>

          ) : (

            <div className="empty-state">
              No directed path was
              found between these
              nodes.
            </div>

          )

        ) : (

          <div className="empty-state">
            Choose a destination to
            trace the network.
          </div>

        )}

      </section>

      <section className="card">

        <div className="section-header">

          <div>

            <h2>
              Direct Dependencies
            </h2>

            <p>
              Connections directly
              leaving{" "}
              {nodeName(
                data.nodes,
                startNode
              )}
              .
            </p>

          </div>

        </div>

        <div className="table-wrapper">

          <table>

            <thead>

              <tr>
                <th>Destination</th>
                <th>Type</th>
                <th>Strength</th>
                <th>Lead Time</th>
              </tr>

            </thead>

            <tbody>

              {directEdges.map(
                (edge, index) => (

                  <tr key={index}>

                    <td>
                      {nodeName(
                        data.nodes,
                        edge.to_node
                      )}
                    </td>

                    <td>
                      {
                        edge.dependency_type
                      }
                    </td>

                    <td>
                      {edge.strength.toFixed(
                        2
                      )}
                    </td>

                    <td>
                      {
                        edge.lead_time_days
                      }
                      {" "}
                      days
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>

    </>
  );
}

/* =========================================================
   FIND PATH
========================================================= */

function findPath(
  edges,
  start,
  target
) {
  const queue = [
    {
      node: start,
      path: []
    }
  ];

  const visited =
    new Set([start]);

  while (queue.length) {

    const current =
      queue.shift();

    const outgoing =
      edges.filter(
        (edge) =>
          edge.from_node ===
          current.node
      );

    for (
      const edge of outgoing
    ) {

      if (
        edge.to_node ===
        target
      ) {
        return [
          ...current.path,
          edge
        ];
      }

      if (
        !visited.has(
          edge.to_node
        )
      ) {

        visited.add(
          edge.to_node
        );

        queue.push({
          node: edge.to_node,
          path: [
            ...current.path,
            edge
          ]
        });

      }

    }
  }

  return [];
}

/* =========================================================
   RECOVERY
========================================================= */

function Recovery({
  data,
  showToast
}) {
  const [
    action,
    setAction
  ] = useState(
    "supplier"
  );

  const unresolved =
    data.failures.filter(
      (failure) =>
        !failure.resolved
    );

  const activeFailure =
    [...unresolved].sort(
      (a, b) =>
        b.impact_score -
        a.impact_score
    )[0];

  return (
    <>

      <PageTitle
        eyebrow="RESILIENCE ACTION CENTER"
        title="Recover Faster"
        description="Choose practical recovery actions using the actual network, failure and demand data."
      />

      <div className="active-disruption">

        <div>

          <span>
            ACTIVE DATA SIGNAL
          </span>

          <h2>

            {activeFailure
              ? `${nodeName(
                  data.nodes,
                  activeFailure.node_id
                )} has an unresolved ${activeFailure.failure_type.replace(
                  "_",
                  " "
                )}.`
              : "No unresolved failures found."}

          </h2>

          <p>

            {activeFailure
              ? `Historical impact ${percentage(
                  activeFailure.impact_score *
                    100
                )} · recorded ${activeFailure.date}.`
              : "Recommendations are based on the latest network and demand data."}

          </p>

        </div>

        <strong>

          {activeFailure
            ? percentage(
                activeFailure.impact_score *
                  100
              )
            : "0%"}

          <small>
            impact signal
          </small>

        </strong>

      </div>

      <div className="recovery-tabs">

        <button
          className={
            action === "supplier"
              ? "recovery-tab active"
              : "recovery-tab"
          }
          onClick={() =>
            setAction(
              "supplier"
            )
          }
        >

          <span>
            ↗
          </span>

          <strong>
            Switch Supplier
          </strong>

          <small>
            Find another supplier
            with available capacity.
          </small>

        </button>

        <button
          className={
            action === "transport"
              ? "recovery-tab active"
              : "recovery-tab"
          }
          onClick={() =>
            setAction(
              "transport"
            )
          }
        >

          <span>
            ⇄
          </span>

          <strong>
            Reroute Transport
          </strong>

          <small>
            Review alternative
            supply routes.
          </small>

        </button>

        <button
          className={
            action === "inventory"
              ? "recovery-tab active"
              : "recovery-tab"
          }
          onClick={() =>
            setAction(
              "inventory"
            )
          }
        >

          <span>
            ▣
          </span>

          <strong>
            Reallocate Inventory
          </strong>

          <small>
            Prioritize locations with
            the largest demand gaps.
          </small>

        </button>

      </div>

      {action ===
        "supplier" && (
        <SwitchSupplier
          data={data}
          showToast={showToast}
        />
      )}

      {action ===
        "transport" && (
        <RerouteTransport
          data={data}
          showToast={showToast}
        />
      )}

      {action ===
        "inventory" && (
        <ReallocateInventory
          data={data}
          showToast={showToast}
        />
      )}

    </>
  );
}

/* =========================================================
   SWITCH SUPPLIER
========================================================= */

function SwitchSupplier({
  data,
  showToast
}) {
  const suppliers =
    data.nodes.filter(
      (node) =>
        node.type ===
        "supplier"
    );

  const affectedSupplier =
    suppliers.find(
      (supplier) =>
        data.failures.some(
          (failure) =>
            failure.node_id ===
              supplier.node_id &&
            !failure.resolved
        )
    ) ||
    [...suppliers].sort(
      (a, b) =>
        a.reliability -
        b.reliability
    )[0];

  const alternatives =
    suppliers
      .filter(
        (supplier) =>
          supplier.node_id !==
          affectedSupplier?.node_id
      )
      .map((supplier) => {

        const connection =
          data.edges.filter(
            (edge) =>
              edge.from_node ===
                supplier.node_id &&
              data.edges.some(
                (other) =>
                  other.from_node ===
                    affectedSupplier?.node_id &&
                  other.to_node ===
                    edge.to_node
              )
          );

        return {
          ...supplier,
          connectionCount:
            connection.length,
          score:
            supplier.reliability *
              100 +
            connection.length *
              5
        };
      })
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  return (
    <section className="card">

      <div className="section-header">

        <div>

          <h2>
            Switch Supplier
          </h2>

          <p>

            Current supplier:
            {" "}
            <strong>
              {affectedSupplier?.name ||
                "None"}
            </strong>

            {" · "}

            reliability{" "}

            {affectedSupplier
              ? percentage(
                  affectedSupplier.reliability *
                    100
                )
              : "—"}

          </p>

        </div>

      </div>

      <div className="recommend-grid">

        {alternatives.map(
          (supplier) => (

            <div
              className="recommend-card"
              key={
                supplier.node_id
              }
            >

              <div className="recommend-top">

                <strong>
                  {supplier.name}
                </strong>

                <b>
                  {percentage(
                    supplier.reliability *
                      100
                  )}
                </b>

              </div>

              <p>
                {supplier.location}
              </p>

              <small>
                Capacity:
                {" "}
                {supplier.capacity}
              </small>

              <small>
                Shared downstream
                connections:
                {" "}
                {supplier.connectionCount}
              </small>

              <button
                className="secondary-button"
                onClick={() =>
                  showToast(
                    `${supplier.name} selected as alternative supplier.`
                  )
                }
              >
                Select Supplier
              </button>

            </div>

          )
        )}

      </div>

    </section>
  );
}

/* =========================================================
   REROUTE TRANSPORT
========================================================= */

function RerouteTransport({
  data,
  showToast
}) {
  const routes =
    data.edges
      .filter(
        (edge) =>
          edge.dependency_type ===
          "supply"
      )
      .map((edge) => ({
        ...edge,
        routeScore:
          edge.strength /
          Math.max(
            1,
            edge.lead_time_days
          )
      }))
      .sort(
        (a, b) =>
          b.routeScore -
          a.routeScore
      );

  return (
    <section className="card">

      <div className="section-header">

        <div>

          <h2>
            Transport Route Options
          </h2>

          <p>
            Routes are calculated
            from the actual supply
            dependencies.
          </p>

        </div>

      </div>

      <div className="table-wrapper">

        <table>

          <thead>

            <tr>
              <th>From</th>
              <th>To</th>
              <th>Strength</th>
              <th>Lead Time</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            {routes.map(
              (route, index) => (

                <tr key={index}>

                  <td>
                    {nodeName(
                      data.nodes,
                      route.from_node
                    )}
                  </td>

                  <td>
                    {nodeName(
                      data.nodes,
                      route.to_node
                    )}
                  </td>

                  <td>
                    {route.strength.toFixed(
                      2
                    )}
                  </td>

                  <td>
                    {
                      route.lead_time_days
                    }
                    {" "}
                    days
                  </td>

                  <td>

                    <button
                      className="text-button"
                      onClick={() =>
                        showToast(
                          `Route selected: ${route.from_node} → ${route.to_node}`
                        )
                      }
                    >
                      Use Route →
                    </button>

                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}

/* =========================================================
   REALLOCATE INVENTORY
========================================================= */

function ReallocateInventory({
  data,
  showToast
}) {
  const currentDate =
    latestDate(
      data.demand
    );

  const rows =
    data.demand
      .filter(
        (row) =>
          row.date ===
          currentDate
      )
      .map((row) => ({
        ...row,
        gap:
          row.demand -
          row.fulfilled,
        fillRate:
          row.demand > 0
            ? row.fulfilled /
              row.demand
            : 0
      }))
      .sort(
        (a, b) =>
          b.gap -
          a.gap
      )
      .slice(0, 10);

  return (
    <section className="card">

      <div className="section-header">

        <div>

          <h2>
            Inventory Reallocation Targets
          </h2>

          <p>
            Latest demand snapshot:
            {" "}
            {currentDate}.
          </p>

        </div>

      </div>

      <div className="table-wrapper">

        <table>

          <thead>

            <tr>
              <th>Node</th>
              <th>Demand</th>
              <th>Fulfilled</th>
              <th>Gap</th>
              <th>Fill Rate</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            {rows.map(
              (row) => (

                <tr
                  key={row.node_id}
                >

                  <td>
                    {nodeName(
                      data.nodes,
                      row.node_id
                    )}
                  </td>

                  <td>
                    {row.demand.toFixed(
                      2
                    )}
                  </td>

                  <td>
                    {row.fulfilled.toFixed(
                      2
                    )}
                  </td>

                  <td className="red-text">
                    {row.gap.toFixed(
                      2
                    )}
                  </td>

                  <td>
                    {percentage(
                      row.fillRate *
                        100
                    )}
                  </td>

                  <td>

                    <button
                      className="text-button"
                      onClick={() =>
                        showToast(
                          `Inventory priority set for ${row.node_id}.`
                        )
                      }
                    >
                      Prioritize →
                    </button>

                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}