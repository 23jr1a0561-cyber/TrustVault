
import { useState } from "react";
import "./App.css";

const navigation = [
  { label: "Overview", icon: "◈" },
  { label: "My Documents", icon: "▤" },
  { label: "Shared with me", icon: "⇄" },
  { label: "Audit Logs", icon: "◷" },
];

function App() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");

  return (
    <div className="vault-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span>V</span><i /></div>
          <div className="brand-copy">
            <h2>trustvault<span>.</span></h2>
            <p>PRIVATE BY DESIGN</p>
          </div>
        </div>

        <div className="workspace-switch">
          <div className="workspace-avatar">S</div>
          <div className="workspace-copy">
            <span>WORKSPACE</span>
            <strong>Personal vault</strong>
          </div>
          <span className="switch-arrow">⌄</span>
        </div>

        <p className="side-label">YOUR WORKSPACE</p>

        <nav className="navigation">
          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                activeTab === item.label ? "active" : ""
              }`}
              onClick={() => setActiveTab(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {activeTab === item.label && (
                <span className="active-indicator">›</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="trust-card">
          <div className="trust-card-top">
            <span className="trust-icon">✳</span>
            <span className="live-dot" />
            <span className="live-label">LOCAL PREVIEW</span>
          </div>
          <h3>Your data. Your rules.</h3>
          <p>
            A workspace designed around privacy, controlled access and
            accountability.
          </p>
          <div className="trust-divider" />
          <div className="trust-footer">
            <span>SECURITY FIRST</span><span>↗</span>
          </div>
        </div>

        <div className="profile">
          <div className="profile-avatar">S</div>
          <div className="profile-copy">
            <strong>Workspace User</strong>
            <span>Document Owner</span>
          </div>
          <button className="profile-menu" aria-label="Profile menu">···</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span><span className="crumb-slash">/</span>
            <strong>{activeTab}</strong>
          </div>
          <div className="topbar-actions">
            <div className="privacy-indicator">
              <span className="green-dot" /> Private workspace
            </div>
            <div className="topbar-avatar">S</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-intro">
            <div>
              <div className="section-kicker">
                <span className="kicker-line" /> YOUR DIGITAL SAFEHOUSE
              </div>
              <h1>Documents, <span>under control.</span></h1>
              <p>
                One secure place for your files, access decisions and activity.
              </p>
            </div>
            <div className="intro-date">
              <span className="intro-date-icon">✳</span>
              <div>
                <strong>Privacy comes first</strong>
                <span>Built for intentional sharing</span>
              </div>
            </div>
          </section>

          <section className="hero-banner">
            <div className="hero-copy">
              <div className="hero-tag">
                <span className="hero-tag-dot" /> THE TRUSTVAULT STANDARD
              </div>
              <h2>
                Keep what matters.
                <br />
                <span>Share only what you choose.</span>
              </h2>
              <p>
                Organize your documents and manage access from one clear
                workspace.
              </p>
              <button
                className="hero-button"
                onClick={() => setActiveTab("My Documents")}
              >
                Explore your vault <span>↗</span>
              </button>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="art-square">
                <div className="art-document">
                  <div className="art-doc-fold" />
                  <span className="art-doc-line line-one" />
                  <span className="art-doc-line line-two" />
                  <span className="art-doc-line line-three" />
                  <span className="art-doc-line line-four" />
                </div>
                <div className="art-shield"><span>✓</span></div>
              </div>
              <span className="floating-dot dot-one" />
              <span className="floating-dot dot-two" />
              <span className="floating-dot dot-three" />
              <div className="art-caption">
                <span className="art-caption-icon">◇</span>
                <div>
                  <strong>Access with intention</strong>
                  <span>Control starts with you</span>
                </div>
              </div>
            </div>
            <div className="hero-index">01 / PRIVATE DOCUMENTS</div>
          </section>

          <section className="overview-heading">
            <div>
              <h2>Your vault at a glance</h2>
              <p>A simple overview of your document workspace.</p>
            </div>
            <span className="overview-label">WORKSPACE OVERVIEW</span>
          </section>

          <section className="stats-grid">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-icon icon-blue">▤</span>
                <span className="stat-arrow">↗</span>
              </div>
              <p>Total documents</p>
              <div className="stat-value-row">
                <h3>0</h3><span className="stat-unit">FILES</span>
              </div>
              <div className="stat-bottom">
                <span className="stat-bottom-mark">—</span>
                <span>Your private collection</span>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-icon icon-violet">⇄</span>
                <span className="stat-arrow">↗</span>
              </div>
              <p>Shared documents</p>
              <div className="stat-value-row">
                <h3>0</h3><span className="stat-unit">SHARES</span>
              </div>
              <div className="stat-bottom">
                <span className="stat-bottom-mark violet-mark">—</span>
                <span>Access granted by you</span>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-icon icon-green">◇</span>
                <span className="stat-status"><span />PREVIEW</span>
              </div>
              <p>Workspace status</p>
              <div className="stat-value-row">
                <h3 className="protected-value">Ready</h3>
              </div>
              <div className="stat-bottom">
                <span className="stat-bottom-mark green-mark">—</span>
                <span>Interface preview only</span>
              </div>
            </article>
          </section>

          <section className="documents-panel">
            <div className="documents-heading">
              <div>
                <div className="section-kicker panel-kicker">
                  <span className="kicker-line" /> YOUR COLLECTION
                </div>
                <h2>
                  {activeTab === "Overview" ? "Recent documents" : activeTab}
                </h2>
                <p>
                  {activeTab === "Audit Logs"
                    ? "Activity records will appear here once audit logging is connected."
                    : "Your files and their access details will appear here."}
                </p>
              </div>
              <label className="search-box">
                <span>⌕</span>
                <input
                  type="search"
                  placeholder="Search your vault"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <span className="search-shortcut">⌘ K</span>
              </label>
            </div>

            <div className="table-header">
              <span>DOCUMENT</span>
              <span>CATEGORY</span>
              <span>LAST UPDATED</span>
              <span>ACCESS</span>
            </div>

            <div className="empty-state">
              <div className="empty-visual">
                <div className="empty-visual-back" />
                <div className="empty-file">
                  <span className="empty-file-fold" />
                  <i /><i /><i />
                  <div className="empty-file-seal">◇</div>
                </div>
                <span className="empty-spark spark-one">✳</span>
                <span className="empty-spark spark-two">✦</span>
              </div>
              <h3>{search ? "No matching documents" : "Your vault starts here"}</h3>
              <p>
                {search
                  ? "No documents match your search in this preview."
                  : "Your collection is empty for now. The next step is connecting secure uploads to your backend."}
              </p>
              <button
                className="empty-action"
                onClick={() => setActiveTab("My Documents")}
              >
                View document workspace <span>→</span>
              </button>
            </div>

            <div className="panel-bottom">
              <span><span className="bottom-dot" /> PRIVATE WORKSPACE</span>
              <span>TRUSTVAULT / 001</span>
            </div>
          </section>

          <footer className="page-footer">
            <span>© TrustVault · Secure document sharing</span>
            <span><span className="footer-star">✳</span> Privacy is a practice.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
