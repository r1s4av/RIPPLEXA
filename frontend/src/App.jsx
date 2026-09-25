import React, { useState } from "react";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const navigation = [
    {
      name: "Dashboard",
      icon: "▦",
    },
    {
      name: "Risk Prediction",
      icon: "◉",
    },
    {
      name: "Impact Simulation",
      icon: "◇",
    },
    {
      name: "Network Trace",
      icon: "⌘",
    },
    {
      name: "Recovery",
      icon: "↻",
    },
  ];

  const handleNavigation = (page) => {
    setActivePage(page);
  };

  /* ---------------- DASHBOARD ---------------- */

  const Dashboard = () => {
    return (
      <>
        <div className="welcome-row">
          <div>
            <div className="eyebrow">SUPPLY CHAIN CONTROL CENTER</div>
            <h1>Good afternoon.</h1>
            <p className="page-description">
              See what is happening across your supply network and act before
              disruptions become problems.
            </p>
          </div>

          <button className="primary-button">
            <span>＋</span>
            Run Network Analysis
          </button>
        </div>

        {/* NETWORK STATUS */}

        <section className="status-grid">
          <div className="status-card">
            <div className="status-card-header">
              <span>Network Health</span>
              <span className="indicator green"></span>
            </div>

            <div className="status-value">87%</div>

            <p>Overall network stability</p>

            <div className="progress-bar">
              <div
                className="progress-value"
                style={{ width: "87%" }}
              ></div>
            </div>
          </div>

          <div className="status-card">
            <div className="status-card-header">
              <span>Active Risks</span>
              <span className="indicator orange"></span>
            </div>

            <div className="status-value">08</div>

            <p>Potential disruptions detected</p>

            <button
              className="text-button"
              onClick={() => handleNavigation("Risk Prediction")}
            >
              View risks →
            </button>
          </div>

          <div className="status-card">
            <div className="status-card-header">
              <span>At-Risk Deliveries</span>
              <span className="indicator red"></span>
            </div>

            <div className="status-value">126</div>

            <p>Orders requiring attention</p>

            <button
              className="text-button"
              onClick={() => handleNavigation("Impact Simulation")}
            >
              Check impact →
            </button>
          </div>

          <div className="status-card">
            <div className="status-card-header">
              <span>Recovery Readiness</span>
              <span className="indicator blue"></span>
            </div>

            <div className="status-value">72%</div>

            <p>Network recovery capability</p>

            <button
              className="text-button"
              onClick={() => handleNavigation("Recovery")}
            >
              View recovery →
            </button>
          </div>
        </section>

        {/* MAIN DASHBOARD */}

        <section className="dashboard-layout">
          {/* SUPPLY NETWORK */}

          <div className="panel network-panel">
            <div className="panel-header">
              <div>
                <h2>Your Supply Network</h2>
                <p>
                  A live view of suppliers, warehouses and deliveries.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={() => handleNavigation("Network Trace")}
              >
                View network
              </button>
            </div>

            <div className="network-flow">
              <div className="network-stage">
                <div className="network-icon supplier-icon">S</div>

                <strong>Suppliers</strong>

                <span>32 active</span>

                <small>12 monitored</small>
              </div>

              <div className="flow-arrow">→</div>

              <div className="network-stage">
                <div className="network-icon warehouse-icon">W</div>

                <strong>Warehouses</strong>

                <span>14 active</span>

                <small>2 at risk</small>
              </div>

              <div className="flow-arrow">→</div>

              <div className="network-stage">
                <div className="network-icon delivery-icon">D</div>

                <strong>Deliveries</strong>

                <span>284 today</span>

                <small>18 delayed</small>
              </div>
            </div>

            <div className="network-footer">
              <div>
                <span className="legend-dot normal"></span>
                Normal
              </div>

              <div>
                <span className="legend-dot warning"></span>
                Needs attention
              </div>

              <div>
                <span className="legend-dot danger"></span>
                Critical
              </div>
            </div>
          </div>

          {/* ALERTS */}

          <div className="panel alerts-panel">
            <div className="panel-header">
              <div>
                <h2>Recent Alerts</h2>
                <p>Things that need your attention.</p>
              </div>

              <button
                className="small-link"
                onClick={() => handleNavigation("Risk Prediction")}
              >
                See all
              </button>
            </div>

            <div className="alert-list">
              <div className="alert-item">
                <div className="alert-symbol critical">!</div>

                <div className="alert-content">
                  <strong>Supplier delay detected</strong>
                  <p>Delhi Supplier Hub</p>
                  <span>12 minutes ago</span>
                </div>
              </div>

              <div className="alert-item">
                <div className="alert-symbol warning">!</div>

                <div className="alert-content">
                  <strong>Transport route slowing</strong>
                  <p>North distribution route</p>
                  <span>31 minutes ago</span>
                </div>
              </div>

              <div className="alert-item">
                <div className="alert-symbol success">✓</div>

                <div className="alert-content">
                  <strong>Inventory restored</strong>
                  <p>Central Warehouse</p>
                  <span>1 hour ago</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIONS */}

        <section className="actions-section">
          <div className="section-title">
            <div>
              <h2>What would you like to do?</h2>
              <p>
                Start with the part of your supply chain you want to
                understand.
              </p>
            </div>
          </div>

          <div className="action-grid">
            <button
              className="action-card"
              onClick={() => handleNavigation("Risk Prediction")}
            >
              <div className="action-icon">◉</div>

              <div className="action-text">
                <strong>Predict Risk</strong>

                <span>
                  Find potential disruptions before they happen.
                </span>
              </div>

              <div className="action-arrow">→</div>
            </button>

            <button
              className="action-card"
              onClick={() => handleNavigation("Impact Simulation")}
            >
              <div className="action-icon">◇</div>

              <div className="action-text">
                <strong>Simulate Impact</strong>

                <span>
                  See what happens when something goes wrong.
                </span>
              </div>

              <div className="action-arrow">→</div>
            </button>

            <button
              className="action-card"
              onClick={() => handleNavigation("Network Trace")}
            >
              <div className="action-icon">⌘</div>

              <div className="action-text">
                <strong>Trace Network</strong>

                <span>
                  Follow products and dependencies through the network.
                </span>
              </div>

              <div className="action-arrow">→</div>
            </button>

            <button
              className="action-card"
              onClick={() => handleNavigation("Recovery")}
            >
              <div className="action-icon">↻</div>

              <div className="action-text">
                <strong>Recover Faster</strong>

                <span>
                  Find practical actions to restore operations.
                </span>
              </div>

              <div className="action-arrow">→</div>
            </button>
          </div>
        </section>
      </>
    );
  };

  /* ---------------- RISK PREDICTION ---------------- */

  const RiskPrediction = () => {
    return (
      <>
        <div className="welcome-row">
          <div>
            <div className="eyebrow">EARLY WARNING SYSTEM</div>
            <h1>Risk Prediction</h1>

            <p className="page-description">
              Identify potential supply-chain disruptions before they affect
              deliveries.
            </p>
          </div>

          <button className="primary-button">Refresh analysis</button>
        </div>

        <div className="risk-summary">
          <div className="risk-summary-card">
            <span>Risks detected</span>
            <strong>08</strong>
          </div>

          <div className="risk-summary-card">
            <span>High priority</span>
            <strong className="danger-text">02</strong>
          </div>

          <div className="risk-summary-card">
            <span>Medium priority</span>
            <strong className="warning-text">04</strong>
          </div>

          <div className="risk-summary-card">
            <span>Low priority</span>
            <strong className="success-text">02</strong>
          </div>
        </div>

        <div className="risk-grid">
          <div className="risk-card high-risk">
            <div className="risk-label">HIGH RISK</div>

            <h2>Supplier delivery delay</h2>

            <p>
              Recent supplier performance indicates a high possibility of
              delayed material arrival.
            </p>

            <div className="risk-score">82%</div>

            <span>Estimated probability</span>

            <div className="risk-footer">
              <span>Delhi Supplier Hub</span>
              <button>Investigate →</button>
            </div>
          </div>

          <div className="risk-card medium-risk">
            <div className="risk-label">MEDIUM RISK</div>

            <h2>Transport disruption</h2>

            <p>
              Traffic and route conditions may affect the primary delivery
              corridor.
            </p>

            <div className="risk-score">54%</div>

            <span>Estimated probability</span>

            <div className="risk-footer">
              <span>North Route</span>
              <button>Investigate →</button>
            </div>
          </div>

          <div className="risk-card low-risk">
            <div className="risk-label">LOW RISK</div>

            <h2>Inventory shortage</h2>

            <p>
              Current inventory levels remain within an acceptable operating
              range.
            </p>

            <div className="risk-score">21%</div>

            <span>Estimated probability</span>

            <div className="risk-footer">
              <span>Central Warehouse</span>
              <button>Investigate →</button>
            </div>
          </div>
        </div>
      </>
    );
  };

  /* ---------------- IMPACT SIMULATION ---------------- */

  const ImpactSimulation = () => {
    return (
      <>
        <div className="welcome-row">
          <div>
            <div className="eyebrow">SCENARIO ANALYSIS</div>

            <h1>Impact Simulation</h1>

            <p className="page-description">
              Test a disruption and see how it could affect your network.
            </p>
          </div>

          <button className="primary-button">＋ New simulation</button>
        </div>

        <div className="simulation-main panel">
          <h2>What happens if something goes wrong?</h2>

          <p>
            Select a scenario to understand which suppliers, warehouses and
            deliveries could be affected.
          </p>

          <div className="scenario-grid">
            <button className="scenario-button">
              <span>⚠</span>
              <strong>Supplier Failure</strong>
              <small>Supplier becomes unavailable</small>
            </button>

            <button className="scenario-button">
              <span>▣</span>
              <strong>Warehouse Shutdown</strong>
              <small>Warehouse temporarily closes</small>
            </button>

            <button className="scenario-button">
              <span>⇢</span>
              <strong>Transport Delay</strong>
              <small>Delivery route is disrupted</small>
            </button>

            <button className="scenario-button">
              <span>↗</span>
              <strong>Demand Spike</strong>
              <small>Unexpected increase in demand</small>
            </button>
          </div>
        </div>

        <div className="simulation-results">
          <div className="result-card">
            <span>Nodes affected</span>
            <strong>24</strong>
          </div>

          <div className="result-card">
            <span>Deliveries impacted</span>
            <strong>186</strong>
          </div>

          <div className="result-card">
            <span>Expected delay</span>
            <strong>2.4 days</strong>
          </div>

          <div className="result-card">
            <span>Recovery options</span>
            <strong>07</strong>
          </div>
        </div>
      </>
    );
  };

  /* ---------------- NETWORK TRACE ---------------- */

  const NetworkTrace = () => {
    return (
      <>
        <div className="welcome-row">
          <div>
            <div className="eyebrow">NETWORK VISIBILITY</div>

            <h1>Trace Your Network</h1>

            <p className="page-description">
              Follow a product from supplier to warehouse and finally to the
              customer.
            </p>
          </div>
        </div>

        <div className="trace-panel panel">
          <div className="trace-header">
            <div>
              <h2>Delivery route</h2>
              <p>Order #RPX-2841</p>
            </div>

            <span className="route-status">IN TRANSIT</span>
          </div>

          <div className="trace-flow">
            <div className="trace-stage">
              <div className="trace-circle">S</div>

              <strong>Supplier</strong>

              <span>Delhi Supplier Hub</span>

              <small>Completed</small>
            </div>

            <div className="trace-connector">
              <div></div>
              <span>✓</span>
            </div>

            <div className="trace-stage">
              <div className="trace-circle">W</div>

              <strong>Warehouse</strong>

              <span>North Distribution Center</span>

              <small>Processing</small>
            </div>

            <div className="trace-connector active">
              <div></div>
              <span>→</span>
            </div>

            <div className="trace-stage">
              <div className="trace-circle">D</div>

              <strong>Delivery</strong>

              <span>Chandigarh Network</span>

              <small>Awaiting dispatch</small>
            </div>
          </div>
        </div>

        <div className="trace-details">
          <div className="panel detail-card">
            <span>Product</span>
            <strong>Electronics Component</strong>
          </div>

          <div className="panel detail-card">
            <span>Current location</span>
            <strong>North Distribution Center</strong>
          </div>

          <div className="panel detail-card">
            <span>Expected delivery</span>
            <strong>26 September</strong>
          </div>
        </div>
      </>
    );
  };

  /* ---------------- RECOVERY ---------------- */

  const Recovery = () => {
    return (
      <>
        <div className="welcome-row">
          <div>
            <div className="eyebrow">RESILIENCE ACTION CENTER</div>

            <h1>Recover Faster</h1>

            <p className="page-description">
              Choose practical recovery actions when a disruption occurs.
            </p>
          </div>
        </div>

        <div className="recovery-banner">
          <div>
            <span>ACTIVE DISRUPTION</span>

            <h2>Delhi Supplier Hub is experiencing delays.</h2>

            <p>
              Ripplexa has identified alternative actions that could reduce
              delivery impact.
            </p>
          </div>

          <div className="banner-score">
            <strong>82%</strong>
            <span>risk level</span>
          </div>
        </div>

        <div className="recovery-grid">
          <div className="recovery-card">
            <div className="recovery-icon">↗</div>

            <h3>Switch Supplier</h3>

            <p>
              Move affected orders to an alternative supplier with available
              capacity.
            </p>

            <button>View alternatives →</button>
          </div>

          <div className="recovery-card">
            <div className="recovery-icon">⇄</div>

            <h3>Reroute Transport</h3>

            <p>
              Find an alternative route to reduce the expected transportation
              delay.
            </p>

            <button>Find route →</button>
          </div>

          <div className="recovery-card">
            <div className="recovery-icon">▣</div>

            <h3>Reallocate Inventory</h3>

            <p>
              Move available inventory to locations where demand is highest.
            </p>

            <button>Optimize inventory →</button>
          </div>
        </div>
      </>
    );
  };

  /* ---------------- CONTENT SWITCH ---------------- */

  const renderPage = () => {
    switch (activePage) {
      case "Risk Prediction":
        return <RiskPrediction />;

      case "Impact Simulation":
        return <ImpactSimulation />;

      case "Network Trace":
        return <NetworkTrace />;

      case "Recovery":
        return <Recovery />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-mark">
            R
          </div>

          <div>
            <h2>RIPPLEXA</h2>
            <span>RESILIENCE INTELLIGENCE</span>
          </div>
        </div>

        <div className="workspace">
          <span>WORKSPACE</span>
          <strong>Supply Network</strong>
        </div>

        <nav className="navigation">

          {navigation.map((item) => (
            <button
              key={item.name}
              className={
                activePage === item.name
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => handleNavigation(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>

              <span>{item.name}</span>
            </button>
          ))}

        </nav>

        <div className="sidebar-bottom">

          <button className="nav-item">
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </button>

          <div className="user-profile">

            <div className="avatar">U</div>

            <div className="user-info">
              <strong>Network Manager</strong>
              <span>Operations</span>
            </div>

            <span className="profile-menu">⋮</span>

          </div>

        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">

        <header className="topbar">

          <div className="breadcrumb">
            Ripplexa
            <span>/</span>
            {activePage}
          </div>

          <div className="topbar-right">

            <button className="notification-button">
              ♢
              <span className="notification-dot"></span>
            </button>

            <div className="top-avatar">U</div>

          </div>

        </header>

        <div className="content-wrapper">
          {renderPage()}
        </div>

      </main>

    </div>
  );
}

export default App;