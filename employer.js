// =============================================
// ✅ EMPLOYER.JS — Fixed & Fully Integrated
// - Loads jobs by postedByEmail, then filters applications
// - Status values match server enum: Applied, Screening, Interview, Selected, Rejected
// - Tab-based filtering: All / Applied / Interview / Selected / Rejected
// - Schedule interview, Accept (Selected), Reject wired correctly
// =============================================

const BASE_URL = "https://hirex-backend-sio8.onrender.com";

let employerEmail   = "";
let employerJobs    = [];
let allEmployerApps = [];
let activeSection    = "dashboard";

// =============================================
// ON LOAD
// =============================================
window.addEventListener("DOMContentLoaded", async () => {
    let sessionUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (!sessionUser) { window.location.replace("index.html"); return; }

    employerEmail = localStorage.getItem("userEmail") || sessionUser.email || "";

    await loadEmployerProfile(employerEmail, sessionUser);
    await loadStats();
    const returnSection = localStorage.getItem("employerReturnSection") || "dashboard";
    localStorage.removeItem("employerReturnSection");
    showSection(returnSection);
});

// =============================================
// LOAD EMPLOYER PROFILE
// =============================================
async function loadEmployerProfile(userEmail, sessionUser) {
    let firstName = sessionUser.firstName || "";
    try {
        let res  = await fetch(`${BASE_URL}/profile/${userEmail}`);
        let user = await res.json();
        if (user && !user.error) firstName = user.profile?.firstName || user.firstName || firstName;
    } catch (err) { console.error("Employer profile fetch failed:", err); }

    let welcomeEl    = document.getElementById("welcomeUser");
    if (welcomeEl)   welcomeEl.textContent = `Welcome ${firstName || "Employer"} 👋`;
    let topbarNameEl = document.getElementById("topbarName");
    if (topbarNameEl) topbarNameEl.textContent = firstName || "Employer";
}

// =============================================
// LOAD STATS (for dashboard overview)
// =============================================
async function loadStats() {
    try {
        let res  = await fetch(`${BASE_URL}/my-stats/${employerEmail}`);
        let data = await res.json();
        let jc   = document.getElementById("jobCount");
        let ac   = document.getElementById("appCount");
        if (jc) jc.textContent = data.jobsPosted || 0;
        if (ac) ac.textContent = data.applicants  || 0;
    } catch (err) { console.error("Stats fetch failed:", err); }
}

// =============================================
// SHOW SECTION
// =============================================
function showSection(section) {
    let content = document.getElementById("content");
    if (!content) return;

    activeSection = section;

    document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active"));
    let activeLink = document.querySelector(`.sidebar a[onclick*="'${section}'"]`);
    if (activeLink) activeLink.classList.add("active");

    document.querySelectorAll(".bottom-nav .nav-item").forEach(n => {
        n.classList.toggle("active", n.getAttribute("onclick")?.includes(`'${section}'`));
    });

    switch (section) {
        case "dashboard":   renderDashboard(content);   break;
        case "post":        renderPostJob(content);     break;
        case "jobs":        renderMyJobs(content);      break;
        case "applicants":  renderApplicants(content);  break;
        case "profile":     renderProfile(content);     break;
        default:            renderDashboard(content);
    }
}

function navigateEmp(section, el) {
    document.querySelectorAll(".bottom-nav .nav-item").forEach(n => n.classList.remove("active"));
    if (el) el.classList.add("active");
    showSection(section);
}

async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch (err) {
        throw new Error("Invalid server response");
    }

    if (!res.ok || data.error) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

function setButtonLoading(button, isLoading, loadingText) {
    if (!button) return;
    if (isLoading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = loadingText;
        button.disabled = true;
        button.style.opacity = "0.65";
        button.style.pointerEvents = "none";
    } else {
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        button.disabled = false;
        button.style.opacity = "";
        button.style.pointerEvents = "";
    }
}

function getJobCompany(job) {
    return job?.companyName || job?.company || "";
}

async function loadEmployerApplications() {
    let allJobs = await fetchJson(`${BASE_URL}/jobs`);
    allJobs = Array.isArray(allJobs) ? allJobs : [];
    employerJobs = allJobs.filter(j => (j.postedByEmail || "").toLowerCase() === employerEmail.toLowerCase());

    let jobIds = employerJobs.map(j => j._id);
    let allApps = await fetchJson(`${BASE_URL}/applications`);
    allEmployerApps = Array.isArray(allApps)
        ? allApps.filter(a => jobIds.includes(a.jobId?._id || a.jobId || ""))
        : [];

    allEmployerApps.sort((a, b) => new Date(b.appliedAt || b.createdAt || 0) - new Date(a.appliedAt || a.createdAt || 0));
}

// =============================================
// RENDER: DASHBOARD
// =============================================
function renderDashboard(content) {
    content.innerHTML = `
        <div style="padding:0 4px; max-width:980px;">
            <h2 id="welcomeUser" style="margin-bottom:20px; color:#e2e8f0;">Welcome Employer 👋</h2>
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-bottom:16px;">
                <div style="background:#1e293b; border-radius:10px; padding:18px; text-align:center; border-top:3px solid #6366f1;">
                    <div style="font-size:26px; font-weight:700; color:#6366f1;" id="jobCount">0</div>
                    <div style="font-size:13px; color:#94a3b8; margin-top:4px;">Jobs Posted</div>
                </div>
                <div style="background:#1e293b; border-radius:10px; padding:18px; text-align:center; border-top:3px solid #22c55e;">
                    <div style="font-size:26px; font-weight:700; color:#22c55e;" id="appCount">0</div>
                    <div style="font-size:13px; color:#94a3b8; margin-top:4px;">Applicants</div>
                </div>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
                <button type="button" class="apply-btn" onclick="showSection('post')" style="flex:1; min-width:180px; padding:12px;">
                    ➕ Post a Job
                </button>
                <button type="button" class="apply-btn" onclick="showSection('applicants')"
                        style="flex:1; min-width:180px; padding:12px; background:linear-gradient(135deg,#0ea5e9,#0284c7);">
                    👥 View Applicants
                </button>
            </div>
            <div id="latestApplicantsPanel" class="job-card-premium" style="padding:18px;">
                <p style="color:#94a3b8; margin:0; font-size:14px;">Loading latest applicants...</p>
            </div>
        </div>`;
    loadStats();
    renderLatestApplicantsPanel();
}

async function renderLatestApplicantsPanel() {
    let panel = document.getElementById("latestApplicantsPanel");
    if (!panel) return;

    try {
        await loadEmployerApplications();
        let latest = allEmployerApps.slice(0, 4);

        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:14px;">
                <h3 style="margin:0; color:#e2e8f0; font-size:16px;">Latest Applicants</h3>
                <button type="button" onclick="showSection('applicants')"
                        style="background:transparent; border:1px solid #334155; color:#94a3b8; border-radius:8px; padding:7px 12px; cursor:pointer; font-size:13px;">
                    View All
                </button>
            </div>
            ${latest.length === 0 ? `
                <p style="color:#94a3b8; margin:0; font-size:14px;">No applicants yet.</p>
            ` : `
                <div style="display:grid; gap:10px;">
                    ${latest.map(app => {
                        let job = employerJobs.find(j => j._id === (app.jobId?._id || app.jobId));
                        let status = app.status || "Applied";
                        let statusColor = status === "Selected" ? "#22c55e"
                            : status === "Rejected" ? "#ef4444"
                            : status === "Interview" ? "#f59e0b"
                            : status === "Screening" ? "#38bdf8"
                            : "#94a3b8";

                        return `
                            <div style="display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; align-items:center; background:#1e293b; border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:12px;">
                                <div style="min-width:0;">
                                    <div style="font-size:14px; color:#e2e8f0; font-weight:700; line-height:1.3;">${escapeHtml(app.name || "Applicant")}</div>
                                    <div style="font-size:12px; color:#94a3b8; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                        ${escapeHtml(job?.title || "Job")} ${job ? "at " + escapeHtml(getJobCompany(job)) : ""}
                                    </div>
                                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:7px;">
                                        <span style="background:${statusColor}22; color:${statusColor}; border:1px solid ${statusColor}44; border-radius:20px; padding:2px 8px; font-size:11px; font-weight:600;">${escapeHtml(status)}</span>
                                        <span style="color:#64748b; font-size:11px;">${new Date(app.appliedAt || app.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <button type="button" onclick="viewApplicantFromDashboard('${app._id}')"
                                        style="background:#0f172a; border:1px solid #334155; color:#cbd5e1; border-radius:8px; padding:8px 13px; cursor:pointer; font-size:13px; font-weight:600;">
                                    View
                                </button>
                            </div>`;
                    }).join("")}
                </div>
            `}
        `;
    } catch (err) {
        console.error("Latest applicants fetch failed:", err);
        panel.innerHTML = `<p style="color:#ef4444; margin:0; font-size:14px;">Failed to load latest applicants.</p>`;
    }
}

function viewApplicantFromDashboard(appId) {
    window._highlightApplicantId = appId;
    window._currentApplicantTab = "All";
    showSection("applicants");
}

// =============================================
// RENDER: POST JOB
// =============================================
function renderPostJob(content) {
    content.innerHTML = `
        <div style="padding:0 4px; max-width:560px;">
            <h2 style="color:#e2e8f0; margin-bottom:20px;">Post a New Job</h2>
            <div class="job-card-premium" style="display:grid; gap:12px;">
                <input id="pj_title"       type="text"   placeholder="Job Title *"                   style="${inputStyle}">
                <input id="pj_company"     type="text"   placeholder="Company Name *"                style="${inputStyle}">
                <input id="pj_location"    type="text"   placeholder="Location *"                    style="${inputStyle}">
                <input id="pj_salary"      type="text"   placeholder="Salary (e.g. ₹5-8 LPA) *"     style="${inputStyle}">
                <select id="pj_jobType"                                                               style="${inputStyle}">
                    <option value="">Select Job Type *</option>
                    <option>Full-Time</option><option>Part-Time</option>
                    <option>Contract</option><option>Internship</option>
                </select>
                <input id="pj_domain"      type="text"   placeholder="Domain (e.g. IT, Finance) *"   style="${inputStyle}">
                <input id="pj_experience"  type="number" placeholder="Min Experience (years) *" min="0" style="${inputStyle}">
                <input id="pj_skills"      type="text"   placeholder="Required Skills (comma-sep) *" style="${inputStyle}">
                <textarea id="pj_desc"     rows="4"      placeholder="Job Description *"
                          style="${inputStyle} resize:vertical;"></textarea>
                <button type="button" class="apply-btn" style="width:100%;" onclick="submitJob(this)">🚀 Post Job</button>
                <p id="postJobMsg" style="margin:0; font-size:13px; text-align:center;"></p>
            </div>
        </div>`;
}

const inputStyle = "padding:10px 14px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:14px;width:100%;box-sizing:border-box;";

async function submitJob(button) {
    let title      = document.getElementById("pj_title").value.trim();
    let company    = document.getElementById("pj_company").value.trim();
    let location   = document.getElementById("pj_location").value.trim();
    let salary     = document.getElementById("pj_salary").value.trim();
    let jobType    = document.getElementById("pj_jobType").value;
    let domain     = document.getElementById("pj_domain").value.trim();
    let experience = document.getElementById("pj_experience").value.trim();
    let skills     = document.getElementById("pj_skills").value.trim();
    let description= document.getElementById("pj_desc").value.trim();
    let msg        = document.getElementById("postJobMsg");

    if (!title||!company||!location||!salary||!jobType||!domain||!experience||!skills||!description) {
        msg.style.color = "#ef4444"; msg.textContent = "Please fill all required fields ❌"; return;
    }

    msg.style.color = "#94a3b8"; msg.textContent = "Posting...";
    setButtonLoading(button, true, "Posting...");

    try {
        let data = await fetchJson(`${BASE_URL}/post-job`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, company, location, salary, jobType, domain, experience, skills, description, email: employerEmail })
        });
        if (data.error) { msg.style.color = "#ef4444"; msg.textContent = data.error; return; }
        msg.style.color = "#22c55e"; msg.textContent = "Job posted successfully ✅";
        showToast("Job posted ✅", "success");
        loadStats();
        setTimeout(() => showSection("jobs"), 1200);
    } catch (err) {
        msg.style.color = "#ef4444"; msg.textContent = err.message || "Server error. Please try again.";
        setButtonLoading(button, false);
    }
}

// =============================================
// RENDER: MY JOBS
// =============================================
async function renderMyJobs(content) {
    content.innerHTML = `<div style="padding:0 4px;"><p style="color:#94a3b8;">Loading jobs...</p></div>`;
    try {
        let jobs = await fetchJson(`${BASE_URL}/jobs`);
        jobs = Array.isArray(jobs) ? jobs : [];
        employerJobs = jobs.filter(j => (j.postedByEmail||"").toLowerCase() === employerEmail.toLowerCase());

        if (employerJobs.length === 0) {
            content.innerHTML = `<div style="padding:0 4px;"><h2 style="color:#e2e8f0;">My Jobs</h2>
                <p style="color:#94a3b8;">No jobs posted yet. <span style="color:#6366f1; cursor:pointer;" onclick="showSection('post')">Post one now →</span></p></div>`;
            return;
        }

        content.innerHTML = `<div style="padding:0 4px;">
            <h2 style="color:#e2e8f0; margin-bottom:16px;">My Jobs (${employerJobs.length})</h2>
            <div id="myJobsList">
                ${employerJobs.map(job => {
                    let sc = job.status === "open" ? "#22c55e" : "#ef4444";
                    return `<div class="job-card-premium" style="margin-bottom:12px;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                            <div style="flex:1;">
                                <h3 style="margin:0 0 6px;">${escapeHtml(job.title)}</h3>
                                <p style="margin:2px 0;font-size:13px;color:#94a3b8;"><i class="ri-building-line"></i> ${escapeHtml(getJobCompany(job))}</p>
                                <p style="margin:2px 0;font-size:13px;color:#94a3b8;"><i class="ri-map-pin-line"></i> ${escapeHtml(job.location)}</p>
                                <p style="margin:2px 0;font-size:12px;color:#64748b;">🛠️ ${Array.isArray(job.skills) ? job.skills.join(", ") : job.skills}</p>
                                <p style="margin:2px 0;font-size:12px;color:#64748b;">📅 Posted: ${new Date(job.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span style="background:${sc}22;color:${sc};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid ${sc}44;text-transform:capitalize;">
                                ${job.status}
                            </span>
                        </div>
                        ${job.status === "open" ? `
                        <button type="button" class="apply-btn" onclick="closeJob('${job._id}', this)"
                                style="margin-top:12px; width:100%; background:linear-gradient(135deg,#ef4444,#dc2626);">
                            🔒 Close Job
                        </button>` : ""}
                    </div>`;
                }).join("")}
            </div>
        </div>`;
    } catch (err) {
        content.innerHTML = `<div style="padding:0 4px;"><p style="color:#ef4444;">Failed to load jobs. Please refresh.</p></div>`;
    }
}

async function closeJob(jobId, button) {
    setButtonLoading(button, true, "Closing...");
    try {
        let data = await fetchJson(`${BASE_URL}/close-job/${jobId}`, { method: "PUT" });
        if (data.error) { showToast(data.error, "error"); return; }
        showToast("Job closed ✅", "success");
        renderMyJobs(document.getElementById("content"));
        loadStats();
    } catch (err) {
        showToast((err.message || "Server error") + " ❌", "error");
        setButtonLoading(button, false);
    }
}

// =============================================
// RENDER: APPLICANTS (with tab filtering)
// =============================================
async function renderApplicants(content) {
    content.innerHTML = `<div style="padding:0 4px;"><p style="color:#94a3b8;">Loading applicants...</p></div>`;

    try {
        await loadEmployerApplications();
        renderApplicantTabs(content, window._currentApplicantTab || "All");

    } catch (err) {
        console.error("Applicants fetch failed:", err);
        content.innerHTML = `<div style="padding:0 4px;"><p style="color:#ef4444;">Failed to load applicants. Please refresh.</p></div>`;
    }
}

function renderApplicantTabs(content, activeTab) {
    const tabs = ["All", "Applied", "Screening", "Interview", "Selected", "Rejected"];
    const tabColors = {
        All:       "#6366f1", Applied:   "#94a3b8", Screening: "#38bdf8",
        Interview: "#f59e0b", Selected:  "#22c55e", Rejected:  "#ef4444"
    };

    let filtered = activeTab === "All"
        ? allEmployerApps
        : allEmployerApps.filter(a => a.status === activeTab);

    // Count per tab
    let counts = {};
    tabs.forEach(t => counts[t] = t === "All" ? allEmployerApps.length : allEmployerApps.filter(a => a.status === t).length);

    content.innerHTML = `
        <div style="padding:0 4px;">
            <h2 style="color:#e2e8f0; margin-bottom:16px;">Applicants (${allEmployerApps.length})</h2>

            <!-- Tab bar -->
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px;">
                ${tabs.map(tab => {
                    let isActive = tab === activeTab;
                    let col = tabColors[tab];
                    return `<button type="button" onclick="filterApplicantTab('${tab}')"
                        style="padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer;
                               border:1px solid ${col}44;
                               background:${isActive ? col+"33" : "transparent"};
                               color:${isActive ? col : "#94a3b8"};">
                        ${tab} <span style="opacity:0.7;">(${counts[tab]})</span>
                    </button>`;
                }).join("")}
            </div>

            <div id="applicantsContainer">
                ${renderApplicantCards(filtered)}
            </div>
        </div>`;

    highlightApplicantCard();
}

window._currentApplicantTab = "All";

function filterApplicantTab(tab) {
    window._currentApplicantTab = tab;
    renderApplicantTabs(document.getElementById("content"), tab);
}

function highlightApplicantCard() {
    let appId = window._highlightApplicantId;
    if (!appId) return;

    setTimeout(() => {
        let card = document.getElementById(`app-${appId}`);
        if (!card) return;

        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.style.outline = "2px solid #f59e0b";
        card.style.boxShadow = "0 0 0 5px rgba(245,158,11,0.18)";
        card.style.transition = "box-shadow 0.25s ease, outline-color 0.25s ease";

        setTimeout(() => {
            card.style.outline = "";
            card.style.boxShadow = "";
        }, 2600);

        window._highlightApplicantId = "";
    }, 100);
}

function renderApplicantCards(apps) {
    if (!apps || apps.length === 0) {
        return `<p style="color:#94a3b8; font-size:14px; margin-top:8px;">No applicants in this category.</p>`;
    }

    return apps.map(app => {
        let statusColor = app.status === "Selected"  ? "#22c55e"
                        : app.status === "Rejected"  ? "#ef4444"
                        : app.status === "Interview" ? "#f59e0b"
                        : app.status === "Screening" ? "#38bdf8"
                        : "#94a3b8";

        // Find job title
        let job = employerJobs.find(j => j._id === (app.jobId?._id || app.jobId));

        let canDecide = ["Applied", "Screening", "Interview"].includes(app.status) || !app.status;
        let canScheduleInterview = app.status === "Applied" || app.status === "Screening" || !app.status;

        return `
            <div class="job-card-premium" style="margin-bottom:12px;" id="app-${app._id}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                    <div style="flex:1;">
                        <h3 style="margin:0 0 4px;">${escapeHtml(app.name || "Applicant")}</h3>
                        ${job ? `<p style="margin:2px 0;font-size:12px;color:#6366f1;font-weight:500;">
                            📌 ${escapeHtml(job.title)} @ ${escapeHtml(getJobCompany(job))}</p>` : ""}
                        <p style="margin:2px 0; font-size:13px; color:#94a3b8;">📧 ${escapeHtml(app.email||"")}</p>
                        <p style="margin:2px 0; font-size:13px; color:#94a3b8;">📞 ${escapeHtml(app.phone||"")}</p>
                        <p style="margin:2px 0; font-size:13px; color:#94a3b8;">🎓 ${escapeHtml(app.degree||"")}${app.city ? " | 🏙️ " + escapeHtml(app.city) : ""}</p>
                        ${app.resumeSnapshot?.skills?.length
                            ? `<p style="margin:2px 0; font-size:13px; color:#94a3b8;">🛠️ ${escapeHtml(app.resumeSnapshot.skills.join(", "))}</p>`
                            : ""}
                        <p style="margin:4px 0; font-size:13px;">
                            Match Score:
                            <span style="color:${app.matchScore >= 70 ? "#22c55e" : app.matchScore >= 40 ? "#f59e0b" : "#ef4444"}; font-weight:600;">
                                ${app.matchScore ? parseFloat(app.matchScore).toFixed(1) + "%" : "N/A"}
                            </span>
                        </p>
                        <p style="margin:2px 0; font-size:12px; color:#64748b;">
                            Applied: ${new Date(app.appliedAt || app.createdAt).toLocaleDateString()}
                        </p>
                        ${app.resumeUrl
                            ? `<a href="${BASE_URL}/${app.resumeUrl}" target="_blank"
                                  style="font-size:13px; color:#6366f1; text-decoration:underline; display:inline-block; margin-top:4px;">
                                   📄 View Resume</a>`
                            : ""}
                    </div>
                    <span style="background:${statusColor}22; color:${statusColor}; padding:4px 12px;
                                border-radius:20px; font-size:12px; font-weight:600; text-transform:capitalize;
                                border:1px solid ${statusColor}44; white-space:nowrap;">
                        ${escapeHtml(app.status || "Applied")}
                    </span>
                </div>

                ${canDecide ? `
                <div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;">
                    <button type="button" class="apply-btn"
                            style="background:linear-gradient(135deg,#22c55e,#16a34a); flex:1; min-width:90px; font-size:13px;"
                            onclick="updateStatus('${app._id}', 'Selected', this)">
                        ✅ Select
                    </button>
                    ${canScheduleInterview ? `
                    <button type="button" class="apply-btn"
                            style="background:linear-gradient(135deg,#f59e0b,#d97706); flex:1; min-width:90px; font-size:13px;"
                            onclick="scheduleInterview('${app._id}')">
                        📅 Interview
                    </button>` : ""}
                    <button type="button" class="apply-btn"
                            style="background:linear-gradient(135deg,#ef4444,#dc2626); flex:1; min-width:90px; font-size:13px;"
                            onclick="updateStatus('${app._id}', 'Rejected', this)">
                        ❌ Reject
                    </button>
                </div>` : ""}
            </div>`;
    }).join("");
}

// =============================================
// UPDATE APPLICATION STATUS
// =============================================
async function updateStatus(appId, status, button) {
    // status must be: Applied | Screening | Interview | Selected | Rejected
    setButtonLoading(button, true, status === "Selected" ? "Selecting..." : "Rejecting...");
    try {
        let data = await fetchJson(`${BASE_URL}/update-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId, status })
        });

        if (data.error) { showToast(data.error + " ❌", "error"); return; }

        showToast(status === "Selected" ? "Applicant Selected ✅" : "Application Rejected ❌",
                  status === "Selected" ? "success" : "error");

        // Update in-memory
        let appIdx = allEmployerApps.findIndex(a => a._id === appId);
        if (appIdx !== -1) allEmployerApps[appIdx].status = status;

        // Re-render tabs
        renderApplicantTabs(document.getElementById("content"), window._currentApplicantTab || "All");

    } catch (err) {
        console.error("Status update failed:", err);
        showToast((err.message || "Server error") + " ❌", "error");
        setButtonLoading(button, false);
    }
}

// =============================================
// SCHEDULE INTERVIEW
// =============================================
function scheduleInterview(appId) {
    if (!appId) {
        showToast("Application not found âŒ", "error");
        return;
    }
    localStorage.setItem("selectedAppId", appId);
    localStorage.setItem("employerReturnSection", activeSection || "applicants");
    window.location.href = "interview.html";
}

// =============================================
// RENDER: PROFILE (employer)
// =============================================
async function renderProfile(content) {
    content.innerHTML = `<div style="padding:0 4px;"><p style="color:#94a3b8;">Loading profile...</p></div>`;
    try {
        let res  = await fetch(`${BASE_URL}/profile/${employerEmail}`);
        let user = await res.json();
        if (!user || user.error) throw new Error("Profile not found");

        let firstName = user.profile?.firstName || "";
        let lastName  = user.profile?.lastName  || "";
        let phone     = user.profile?.phone     || "";
        let location  = user.profile?.location  || "";
        let gender    = user.gender  || "";
        let joinDate  = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { year:"numeric", month:"long" }) : "";

        // Stats
        let statsRes  = await fetch(`${BASE_URL}/my-stats/${employerEmail}`);
        let stats     = await statsRes.json();

        content.innerHTML = `
            <div style="padding:0 4px; max-width:560px;">
                <h2 style="color:#e2e8f0; margin-bottom:20px;">My Profile</h2>

                <div class="job-card-premium" style="margin-bottom:16px;">
                    <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; flex-wrap:wrap;">
                        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                                    display:flex;align-items:center;justify-content:center;font-size:26px;color:white;font-weight:700;flex-shrink:0;">
                            ${escapeHtml((firstName.charAt(0)||"E").toUpperCase())}
                        </div>
                        <div style="flex:1; min-width:160px;">
                            <div style="font-size:20px;font-weight:700;color:#e2e8f0;">${escapeHtml(firstName + " " + lastName)}</div>
                            <div style="font-size:13px;color:#94a3b8;">${escapeHtml(user.email||employerEmail)}</div>
                            <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
                                <span style="background:#6366f122;color:#818cf8;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #6366f144;">
                                    🏢 Recruiter
                                </span>
                                ${gender ? `<span style="background:#0ea5e922;color:#38bdf8;padding:3px 10px;border-radius:20px;font-size:11px;border:1px solid #0ea5e944;">${escapeHtml(gender)}</span>` : ""}
                                ${joinDate ? `<span style="background:#10b98122;color:#34d399;padding:3px 10px;border-radius:20px;font-size:11px;border:1px solid #10b98144;">Joined ${joinDate}</span>` : ""}
                            </div>
                        </div>
                    </div>

                    <div style="display:grid;gap:0;">
                        ${empProfileField("ri-phone-line", "Phone", phone)}
                        ${empProfileField("ri-map-pin-line", "Location", location)}
                        ${empProfileField("ri-mail-line", "Email", user.email||employerEmail)}
                        ${empProfileField("ri-user-line", "Gender", gender)}
                    </div>

                    <button class="apply-btn" style="margin-top:18px; width:100%;" onclick="showEmpEditProfile()">
                        ✏️ Edit Profile
                    </button>
                </div>

                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px;">
                    <div style="background:#1e293b;border-radius:12px;padding:14px;text-align:center;border-top:3px solid #6366f1;">
                        <div style="font-size:24px;font-weight:700;color:#6366f1;">${stats.jobsPosted||0}</div>
                        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Jobs Posted</div>
                    </div>
                    <div style="background:#1e293b;border-radius:12px;padding:14px;text-align:center;border-top:3px solid #22c55e;">
                        <div style="font-size:24px;font-weight:700;color:#22c55e;">${stats.applicants||0}</div>
                        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Total Applicants</div>
                    </div>
                </div>
            </div>

            <!-- Edit Profile Modal -->
            <div id="empEditModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;overflow-y:auto;padding:20px;box-sizing:border-box;">
                <div style="max-width:480px;margin:40px auto;background:#0f172a;border-radius:16px;padding:28px;border:1px solid rgba(255,255,255,0.1);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                        <h3 style="color:#e2e8f0;margin:0;">✏️ Edit Profile</h3>
                        <i class="ri-close-line" onclick="closeEmpEdit()" style="color:#94a3b8;font-size:22px;cursor:pointer;"></i>
                    </div>
                    <div style="display:grid;gap:12px;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            <input id="ep2_firstName" type="text" placeholder="First Name" value="${escapeHtml(firstName)}"
                                   style="${inputStyle2}">
                            <input id="ep2_lastName"  type="text" placeholder="Last Name"  value="${escapeHtml(lastName)}"
                                   style="${inputStyle2}">
                        </div>
                        <input id="ep2_phone"    type="tel"  placeholder="Phone"    value="${escapeHtml(phone)}"    style="${inputStyle2}">
                        <input id="ep2_location" type="text" placeholder="Location" value="${escapeHtml(location)}" style="${inputStyle2}">
                        <select id="ep2_gender" style="${inputStyle2}">
                            <option value="">Select Gender</option>
                            <option value="Male"   ${gender==="Male"  ?"selected":""}>Male</option>
                            <option value="Female" ${gender==="Female"?"selected":""}>Female</option>
                            <option value="Other"  ${gender==="Other" ?"selected":""}>Other</option>
                        </select>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;">
                        <button type="button" onclick="closeEmpEdit()" style="padding:10px;border-radius:8px;background:#1e293b;color:#94a3b8;border:1px solid #334155;cursor:pointer;">Cancel</button>
                        <button type="button" onclick="saveEmpProfile(this)" style="padding:10px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;cursor:pointer;font-weight:600;">Save</button>
                    </div>
                    <p id="empEditMsg" style="margin-top:10px;font-size:13px;text-align:center;"></p>
                </div>
            </div>`;

    } catch (err) {
        content.innerHTML = `<div style="padding:0 4px;"><p style="color:#ef4444;">Failed to load profile. Please refresh.</p></div>`;
    }
}

const inputStyle2 = "padding:10px 14px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:14px;width:100%;box-sizing:border-box;";

function empProfileField(icon, label, value) {
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <i class="${icon}" style="color:#6366f1;font-size:16px;width:18px;"></i>
        <div>
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
            <div style="font-size:14px;color:#e2e8f0;margin-top:2px;">${escapeHtml(value || "Not set")}</div>
        </div>
    </div>`;
}

function showEmpEditProfile() {
    let m = document.getElementById("empEditModal");
    if (m) m.style.display = "block";
}

function closeEmpEdit() {
    let m = document.getElementById("empEditModal");
    if (m) m.style.display = "none";
}

async function saveEmpProfile(button) {
    let firstName = document.getElementById("ep2_firstName").value.trim();
    let lastName  = document.getElementById("ep2_lastName").value.trim();
    let contact   = document.getElementById("ep2_phone").value.trim();
    let city      = document.getElementById("ep2_location").value.trim();
    let gender    = document.getElementById("ep2_gender").value;
    let msg       = document.getElementById("empEditMsg");

    if (!firstName) { msg.style.color = "#ef4444"; msg.textContent = "First name required."; return; }
    msg.style.color = "#94a3b8"; msg.textContent = "Saving...";
    setButtonLoading(button, true, "Saving...");

    try {
        let data = await fetchJson(`${BASE_URL}/update-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: employerEmail, firstName, lastName, contact, city, gender })
        });
        if (data.error) { msg.style.color = "#ef4444"; msg.textContent = data.error; return; }
        msg.style.color = "#22c55e"; msg.textContent = "Profile updated ✅";
        let su = JSON.parse(localStorage.getItem("loggedInUser")||"{}");
        su.firstName = firstName; su.lastName = lastName;
        localStorage.setItem("loggedInUser", JSON.stringify(su));
        setTimeout(() => { closeEmpEdit(); renderProfile(document.getElementById("content")); }, 900);
    } catch (err) {
        msg.style.color = "#ef4444"; msg.textContent = err.message || "Save failed.";
        setButtonLoading(button, false);
    }
}

// =============================================
// TOGGLE NOTIFICATIONS
// =============================================
function toggleNotif() {
    let box = document.getElementById("notifBox");
    if (!box) return;
    box.style.display = box.style.display === "block" ? "none" : "block";
}

// =============================================
// LOGOUT
// =============================================
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// =============================================
// TOAST
// =============================================
function showToast(message, type = "success") {
    let toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    toast.className = "show";
    if (type === "error") toast.classList.add("error");
    setTimeout(() => toast.className = "", 3000);
}

// =============================================
// HELPER
// =============================================
function escapeHtml(str) {
    let div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
}

Object.assign(window, {
    showSection,
    navigateEmp,
    submitJob,
    closeJob,
    filterApplicantTab,
    viewApplicantFromDashboard,
    updateStatus,
    scheduleInterview,
    showEmpEditProfile,
    closeEmpEdit,
    saveEmpProfile,
    toggleNotif,
    logout
});
