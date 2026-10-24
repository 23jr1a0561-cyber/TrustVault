import { useEffect, useMemo, useState } from "react";
import "./App.css";


const API = "https://trustvault-backend-vlbg.onrender.com/api";


const navigation = [
  { label: "Overview", icon: "◈" },
  { label: "My Documents", icon: "▤" },
  { label: "Shared with me", icon: "⇄" },
  { label: "Audit Logs", icon: "◷" },
];

async function apiRequest(path, { token, ...options } = {}) {
  const headers = { ...(options.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }

  return data;
}

function App() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");

  const [token, setToken] = useState(
    () => localStorage.getItem("trustvault_token") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trustvault_user") || "null");
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [documents, setDocuments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [verifyingAudit, setVerifyingAudit] = useState(false);
  const [auditVerification, setAuditVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [sharingDoc, setSharingDoc] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareAccess, setShareAccess] = useState("read");
  const [sharing, setSharing] = useState(false);

  const [docPermissions, setDocPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [revokingUserId, setRevokingUserId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 5000);

    return () => clearTimeout(timer);
  }, [message]);

  const pageContent = {
    Overview: {
      title: "Documents, under control.",
      description:
        "One secure place for your files, access decisions and activity.",
      heading: "Recent documents",
      message: "Your collection is empty for now.",
    },
    "My Documents": {
      title: "My Documents",
      description: "Manage the documents in your private vault.",
      heading: "Your documents",
      message: "Upload your first document to get started.",
    },
    "Shared with me": {
      title: "Shared with me",
      description: "Documents other users have shared with you.",
      heading: "Shared documents",
      message: "No documents have been shared with you yet.",
    },
    "Audit Logs": {
      title: "Audit Logs",
      description: "Review activity recorded in your secure vault.",
      heading: "Recent activity",
      message: "No audit events available.",
    },
  };

  useEffect(() => {
    if (token) {
      loadDocuments(token);
      loadAuditLogs(token);
    }
  }, [token]);

  async function loadDocuments(authToken = token) {
    setLoading(true);
    try {
      const data = await apiRequest("/documents", { token: authToken });
      setDocuments(
        Array.isArray(data) ? data : data.documents || data.data || []
      );
    } catch (err) {
      setError(err.message || "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLogs(authToken = token) {
    try {
      const data = await apiRequest("/audit", { token: authToken });
      setAuditLogs(
        Array.isArray(data) ? data : data.logs || data.auditLogs || []
      );
    } catch {
      setAuditLogs([]);
    }
  }

  async function handleVerifyAuditChain() {
    setVerifyingAudit(true);
    setAuditVerification(null);
    setError("");
    setMessage("");

    try {
      const result = await apiRequest("/audit/verify", { token });
      setAuditVerification(result);
      if (result.valid) {
        setMessage(`Audit chain verified: ${result.entriesChecked} entries checked.`);
      } else {
        setError(`Audit chain verification failed: ${result.reason || "Integrity mismatch"}.`);
      }
    } catch (err) {
      setError(err.message || "Audit-chain verification failed.");
    } finally {
      setVerifyingAudit(false);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const endpoint =
        authMode === "login" ? "/auth/login" : "/auth/register";

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(authForm),
      });

      const authToken = data.token || data.accessToken;
      const currentUser = data.user || data.data?.user || null;

      if (!authToken) {
        throw new Error("Authentication token was not returned by the server.");
      }

      localStorage.setItem("trustvault_token", authToken);
      if (currentUser) {
        localStorage.setItem("trustvault_user", JSON.stringify(currentUser));
      }

      setToken(authToken);
      setUser(currentUser);
      setMessage("Successfully signed in.");
    } catch (err) {
      setError(err.message || "Authentication failed.");
    }
  }

  function logout() {
    localStorage.removeItem("trustvault_token");
    localStorage.removeItem("trustvault_user");
    setToken("");
    setUser(null);
    setDocuments([]);
    setAuditLogs([]);
    setSharingDoc(null);
    setDocPermissions([]);
    setActiveTab("Overview");
    setMessage("");
    setError("");
  }

  async function handleUpload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file");
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("Please select a document.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const name = form.elements.namedItem("name")?.value?.trim();
    const description =
      form.elements.namedItem("description")?.value?.trim();

    if (name) formData.append("name", name);
    if (description) formData.append("description", description);

    setUploading(true);
    setError("");
    setMessage("");

    try {
      await apiRequest("/documents/upload", {
        method: "POST",
        token,
        body: formData,
      });

      setMessage("Document uploaded successfully.");
      form.reset();
      await loadDocuments(token);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API}/documents/${doc._id || doc.id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Download failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = doc.originalName || doc.name || "document";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessage("Download started.");
    } catch (err) {
      setError(err.message || "Download failed.");
    }
  }

  async function loadPermissions(doc) {
    if (!doc) return;

    setLoadingPermissions(true);
    setError("");

    try {
      const data = await apiRequest(
        `/documents/${doc._id || doc.id}/permissions`,
        { token }
      );

      setDocPermissions(data.permissions || []);
    } catch (err) {
      setDocPermissions([]);
      setError(err.message || "Unable to load shared users.");
    } finally {
      setLoadingPermissions(false);
    }
  }

  function openShareForm(doc) {
    setSharingDoc(doc);
    setShareEmail("");
    setShareAccess("read");
    setDocPermissions([]);
    setError("");
    setMessage("");
    loadPermissions(doc);
  }

  async function handleShare(event) {
    event.preventDefault();

    if (!sharingDoc || !shareEmail.trim()) {
      setError("Enter the registered user's email.");
      return;
    }

    setSharing(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest(
        `/documents/${sharingDoc._id || sharingDoc.id}/permissions`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            email: shareEmail.trim(),
            accessLevel: shareAccess,
          }),
        }
      );

      setMessage(data?.message || "Document shared successfully.");
      setShareEmail("");

      await loadPermissions(sharingDoc);
      await loadDocuments(token);
    } catch (err) {
      setError(err.message || "Unable to share document.");
    } finally {
      setSharing(false);
    }
  }

  async function handleRevoke(doc, userId) {
    if (!window.confirm("Revoke this user's access to the document?")) {
      return;
    }

    setRevokingUserId(userId);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest(
        `/documents/${doc._id || doc.id}/permissions/${userId}`,
        {
          method: "DELETE",
          token,
        }
      );

      setMessage(data?.message || "Access revoked successfully.");
      await loadPermissions(doc);
      await loadDocuments(token);
    } catch (err) {
      setError(err.message || "Unable to revoke access.");
    } finally {
      setRevokingUserId("");
    }
  }

  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents.filter((doc) => {
      const owned = doc.accessLevel === "owner";

      if (activeTab === "My Documents" && !owned) return false;
      if (activeTab === "Shared with me" && owned) return false;
      if (activeTab === "Audit Logs") return false;
      if (activeTab === "Overview" && !owned) return false;

      const values = [
        doc.name,
        doc.originalName,
        doc.category,
        doc.description,
      ];

      return (
        !query ||
        values.some((value) =>
          String(value || "").toLowerCase().includes(query)
        )
      );
    });
  }, [documents, search, activeTab]);

  if (!token) {
    return (
      <div className="vault-app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <span>V</span>
              <i />
            </div>
            <div className="brand-copy">
              <h2>
                trustvault<span>.</span>
              </h2>
              <p>PRIVATE BY DESIGN</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-card-top">
              <span className="trust-icon">✳</span>
              <span className="live-dot" />
              <span className="live-label">SECURE ACCESS</span>
            </div>
            <h3>Your data. Your rules.</h3>
            <p>
              A workspace designed around privacy, controlled access and
              accountability.
            </p>
            <div className="trust-divider" />
            <div className="trust-footer">
              <span>SECURITY FIRST</span>
              <span>↗</span>
            </div>
          </div>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <div className="breadcrumb">
              <span>TrustVault</span>
              <span className="crumb-slash">/</span>
              <strong>{authMode === "login" ? "Sign in" : "Register"}</strong>
            </div>
            <div className="privacy-indicator">
              <span className="green-dot" /> Private workspace
            </div>
          </header>

          <div className="page-content">
            <section className="page-intro">
              <div>
                <div className="section-kicker">
                  <span className="kicker-line" />
                  YOUR DIGITAL SAFEHOUSE
                </div>
                <h1>
                  {authMode === "login"
                    ? "Welcome back."
                    : "Create your vault."}
                </h1>
                <p>
                  {authMode === "login"
                    ? "Sign in to securely access your documents."
                    : "Register to create your secure document workspace."}
                </p>
              </div>
            </section>

            <section className="auth-card">
              <h2>{authMode === "login" ? "Sign in" : "Create account"}</h2>
              <p className="muted">
                {authMode === "login"
                  ? "Enter your credentials to continue."
                  : "Fill in your details to get started."}
              </p>

              <form onSubmit={handleAuth} className="auth-form">
                {authMode === "register" && (
                  <label>
                    Full name
                    <input
                      type="text"
                      value={authForm.name}
                      onChange={(e) =>
                        setAuthForm({ ...authForm, name: e.target.value })
                      }
                      placeholder="Your name"
                      required
                    />
                  </label>
                )}

                <label>
                  Email address
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, email: e.target.value })
                    }
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, password: e.target.value })
                    }
                    placeholder="Enter password"
                    required
                  />
                </label>

                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}

                <button className="primary-button" type="submit">
                  {authMode === "login" ? "Sign in securely" : "Create account"}
                </button>
              </form>

              <p className="auth-switch">
                {authMode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}{" "}
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setError("");
                    setMessage("");
                  }}
                >
                  {authMode === "login" ? "Register" : "Sign in"}
                </button>
              </p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const ownedDocuments = documents.filter(
    (doc) => doc.accessLevel === "owner"
  );
  const sharedDocuments = documents.filter(
    (doc) => doc.accessLevel !== "owner"
  );

  return (
    <div className="vault-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <span>V</span>
            <i />
          </div>
          <div className="brand-copy">
            <h2>
              trustvault<span>.</span>
            </h2>
            <p>PRIVATE BY DESIGN</p>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.label}
              className={`nav-item ${activeTab === item.label ? "active" : ""}`}
              onClick={() => {
                setActiveTab(item.label);
                setSharingDoc(null);
                setError("");
                setMessage("");
                if (item.label === "Audit Logs") loadAuditLogs(token);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="trust-card sidebar-trust">
          <div className="trust-card-top">
            <span className="trust-icon">✳</span>
            <span className="live-dot" />
            <span className="live-label">PROTECTED</span>
          </div>
          <h3>Your data. Your rules.</h3>
          <p>Secure document sharing with an auditable access trail.</p>
        </div>

        <button className="logout-button" type="button" onClick={logout}>
          ↪ Sign out
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>TrustVault</span>
            <span className="crumb-slash">/</span>
            <strong>{activeTab}</strong>
          </div>

          <div className="topbar-right">
            <div className="privacy-indicator">
              <span className="green-dot" /> Private workspace
            </div>
            <div className="user-avatar" title="Profile" aria-label="Profile">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
              </svg>
            </div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-intro">
            <div>
              <div className="section-kicker">
                <span className="kicker-line" />
                SECURE DOCUMENT WORKSPACE
              </div>
              <h1>{pageContent[activeTab]?.title || activeTab}</h1>
              <p>{pageContent[activeTab]?.description}</p>
            </div>
          </section>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")}>×</button>
            </div>
          )}

          {message && (
            <div className="alert alert-success">
              <span>{message}</span>
              <button type="button" onClick={() => setMessage("")}>×</button>
            </div>
          )}

          {activeTab !== "Audit Logs" && (
            <section className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">MY DOCUMENTS</span>
                <strong>{ownedDocuments.length}</strong>
                <span className="stat-caption">Documents you own</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">SHARED WITH ME</span>
                <strong>{sharedDocuments.length}</strong>
                <span className="stat-caption">Documents shared with you</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">TOTAL DOCUMENTS</span>
                <strong>{documents.length}</strong>
                <span className="stat-caption">Available in your workspace</span>
              </div>
            </section>
          )}

          {activeTab === "My Documents" && (
            <section className="content-card upload-card">
              <div className="card-heading">
                <div>
                  <h2>Upload a document</h2>
                  <p>Add a file to your secure vault.</p>
                </div>
              </div>

              <form className="upload-form" onSubmit={handleUpload}>
                <label>
                  Document name
                  <input name="name" type="text" placeholder="Optional document name" />
                </label>
                <label>
                  Description
                  <input name="description" type="text" placeholder="Optional description" />
                </label>
                <label>
                  Select file
                  <input name="file" type="file" required />
                </label>
                <button className="primary-button" type="submit" disabled={uploading}>
                  {uploading ? "Uploading..." : "+ Upload document"}
                </button>
              </form>
            </section>
          )}

          {activeTab === "Audit Logs" ? (
            <section className="content-card">
              <div className="card-heading">
                <div>
                  <h2>Activity history</h2>
                  <p>Recorded events in your workspace.</p>
                </div>
                <div className="action-buttons">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => loadAuditLogs(token)}
                  >
                    Refresh
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={handleVerifyAuditChain}
                    disabled={verifyingAudit}
                  >
                    {verifyingAudit ? "Verifying..." : "Verify Audit Chain"}
                  </button>
                </div>
              </div>

              {auditLogs.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">◷</span>
                  <h3>No audit events available</h3>
                  <p>Activity will appear here when records are available.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="documents-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Details</th>
                        <th>Outcome</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, index) => (
                        <tr key={log._id || log.id || index}>
                          <td>{log.action || "Activity"}</td>
                          <td>{log.details || log.description || "—"}</td>
                          <td>{log.outcome || "—"}</td>
                          <td>
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <section className="content-card">
              <div className="card-heading documents-heading">
                <div>
                  <h2>{pageContent[activeTab]?.heading}</h2>
                  <p>Search and manage your documents.</p>
                </div>

                <div className="search-box">
                  <span>⌕</span>
                  <input
                    type="search"
                    placeholder="Search documents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="empty-state">
                  <p>Loading documents...</p>
                </div>
              ) : visibleDocuments.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">▤</span>
                  <h3>{pageContent[activeTab]?.message}</h3>
                  {activeTab === "My Documents" && (
                    <p>Upload a document using the form above.</p>
                  )}
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="documents-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Type</th>
                        <th>Access</th>
                        <th>Uploaded</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDocuments.map((doc) => {
                        const docId = doc._id || doc.id;
                        const isOwner = doc.accessLevel === "owner";

                        return (
                          <tr key={docId}>
                            <td>
                              <div className="document-name">
                                <span className="file-icon">▤</span>
                                <div>
                                  <strong>
                                    {doc.name || doc.originalName || "Untitled document"}
                                  </strong>
                                  <small>
                                    {doc.description || doc.originalName || "Secure file"}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>{doc.category || doc.mimeType || "Document"}</td>
                            <td>
                              <span className={`access-badge ${isOwner ? "owner" : "shared"}`}>
                                {isOwner ? "Owner" : doc.accessLevel || "Shared"}
                              </span>
                            </td>
                            <td>
                              {doc.createdAt
                                ? new Date(doc.createdAt).toLocaleDateString()
                                : "—"}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="secondary-button small-button"
                                  type="button"
                                  onClick={() => handleDownload(doc)}
                                >
                                  Download
                                </button>

                                {isOwner && (
                                  <button
                                    className="primary-button small-button"
                                    type="button"
                                    onClick={() => openShareForm(doc)}
                                  >
                                    Manage access
                                  </button>
                                )}
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
          )}

          {sharingDoc && (
            <section className="content-card share-card">
              <div className="card-heading">
                <div>
                  <h2>Manage document access</h2>
                  <p>
                    {sharingDoc.name ||
                      sharingDoc.originalName ||
                      "Selected document"}
                  </p>
                </div>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setSharingDoc(null);
                    setDocPermissions([]);
                    setError("");
                    setMessage("");
                  }}
                >
                  Close
                </button>
              </div>

              <form className="share-form" onSubmit={handleShare}>
                <label>
                  Registered user's email
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                  />
                </label>

                <label>
                  Permission level
                  <select
                    value={shareAccess}
                    onChange={(e) => setShareAccess(e.target.value)}
                  >
                    <option value="read">Read only</option>
                    <option value="write">Read and write</option>
                  </select>
                </label>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={sharing}
                >
                  {sharing ? "Sharing..." : "Grant access"}
                </button>
              </form>

              <div className="permissions-section">
                <div className="permissions-heading">
                  <div>
                    <h3>People with access</h3>
                    <p>Revoke access whenever it is no longer needed.</p>
                  </div>

                  <button
                    className="secondary-button small-button"
                    type="button"
                    onClick={() => loadPermissions(sharingDoc)}
                    disabled={loadingPermissions}
                  >
                    {loadingPermissions ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {loadingPermissions ? (
                  <p className="muted">Loading permissions...</p>
                ) : docPermissions.length === 0 ? (
                  <div className="empty-permissions">
                    No active shared users found.
                  </div>
                ) : (
                  <div className="permissions-list">
                    {docPermissions.map((permission, index) => {
                      const targetUser =
                        permission.user ||
                        permission.grantedTo ||
                        permission.sharedWith ||
                        {};

                      const userId =
                        permission.userId ||
                        targetUser._id ||
                        targetUser.id ||
                        permission.grantedToId;

                      const email =
                        permission.email ||
                        targetUser.email ||
                        permission.userEmail ||
                        "Unknown email";

                      const displayName =
                        permission.name ||
                        targetUser.name ||
                        email;

                      return (
                        <div
                          className="permission-row"
                          key={userId || permission._id || index}
                        >
                          <div className="permission-user">
                            <div className="permission-avatar">
                              {String(displayName).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong>{displayName}</strong>
                              <small>{email}</small>
                            </div>
                          </div>

                          <span className="access-badge shared">
                            {permission.accessLevel || permission.permission || "read"}
                          </span>

                          <button
                            className="danger-button"
                            type="button"
                            disabled={!userId || revokingUserId === userId}
                            onClick={() => handleRevoke(sharingDoc, userId)}
                          >
                            {revokingUserId === userId
                              ? "Revoking..."
                              : "Revoke access"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          <footer className="page-footer">
            <span>TrustVault · Private by design</span>
            <span>Secure document sharing and audit trail</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
