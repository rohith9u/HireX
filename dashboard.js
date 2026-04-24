// =============================================
// ✅ DASHBOARD.JS — Updated & Fully Integrated
// =============================================

const BASE_URL = "https://hirex-backend-sio8.onrender.com";

let currentUserEmail = "";
let currentUserId    = "";
let allJobs          = [];
let allApplications  = [];
let savedJobIds      = new Set();
let savedJobs        = [];

// =============================================
// ON LOAD
// =============================================
window.addEventListener("DOMContentLoaded", async () => {

    let sessionUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (!sessionUser) {
        window.location.replace("index.html");
        return;
    }

    currentUserEmail = localStorage.getItem("userEmail") || sessionUser.email || "";

    await loadUserProfile(sessionUser);
    await Promise.all([loadJobs(), loadApplications()]);

    if (currentUserId) {
        await loadSavedJobs();
        loadNotifications();
    }

    const hash = window.location.hash.replace("#", "") || "dashboard";
    showSection(hash);
});

// =============================================
// LOAD USER PROFILE
// =============================================
async function loadUserProfile(sessionUser) {
    let firstName = sessionUser.firstName || sessionUser?.profile?.firstName || "";

    try {
        let res  = await fetch(`${BASE_URL}/profile/${currentUserEmail}`);
        let user = await res.json();

        if (user && !user.error) {
            firstName     = user.profile?.firstName || user.firstName || firstName;
            currentUserId = user._id || "";
            sessionUser.firstName = firstName;
            localStorage.setItem("loggedInUser", JSON.stringify(sessionUser));
        }
    } catch (err) {
        console.error("Profile fetch failed:", err);
    }

    let topbarEl = document.getElementById("topbarName");
    if (topbarEl) topbarEl.textContent = firstName || "User";
    window._welcomeName = firstName || "User";
}

// =============================================
// LOAD JOBS
// =============================================
async function loadJobs() {
    try {
        let res = await fetch(`${BASE_URL}/jobs`);
        allJobs = await res.json();
        if (!Array.isArray(allJobs)) allJobs = [];
    } catch (err) {
        console.error("Jobs fetch failed:", err);
        allJobs = [];
    }
}

// =============================================
// LOAD APPLICATIONS
// =============================================
async function loadApplications() {
    try {
        let res  = await fetch(`${BASE_URL}/applications`);
        let apps = await res.json();
        if (!Array.isArray(apps)) apps = [];
        allApplications = apps.filter(a =>
            (a.email || "").toLowerCase() === currentUserEmail.toLowerCase()
        );
    } catch (err) {
        console.error("Applications fetch failed:", err);
        allApplications = [];
    }
}

// =============================================
// LOAD SAVED JOBS
// =============================================
async function loadSavedJobs() {
    if (!currentUserId) return;
    try {
        let res   = await fetch(`${BASE_URL}/saved-jobs/${currentUserId}`);
        let saved = await res.json();
        if (Array.isArray(saved)) {
            savedJobIds = new Set(saved.map(s => s.jobId?._id || s.jobId));
            savedJobs = saved
                .map(s => s.jobId)
                .filter(job => job && typeof job === "object");
        }
    } catch (err) {
        console.error("Saved jobs fetch failed:", err);
        savedJobs = [];
    }
}

// =============================================
// TOGGLE SAVE JOB
// =============================================
async function toggleSaveJob(jobId, btn) {
    if (!currentUserId) { showToast("Please log in to save jobs", "error"); return; }
    try {
        let res  = await fetch(`${BASE_URL}/saved-jobs/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, jobId })
        });
        let data = await res.json();
        if (data.saved) {
            savedJobIds.add(jobId);
            let savedJob = allJobs.find(job => job._id === jobId);
            if (savedJob && !savedJobs.some(job => job._id === jobId)) savedJobs.unshift(savedJob);
            btn.innerHTML = `<i class="ri-bookmark-fill"></i>`;
            btn.title = "Unsave Job";
            btn.style.color = "#6366f1";
            showToast("Job saved ✅");
        } else {
            savedJobIds.delete(jobId);
            savedJobs = savedJobs.filter(job => job._id !== jobId);
            btn.innerHTML = `<i class="ri-bookmark-line"></i>`;
            btn.title = "Save Job";
            btn.style.color = "#94a3b8";
            showToast("Job removed from saved");
        }
    } catch (err) {
        showToast("Could not save job", "error");
    }
}

// =============================================
// LOAD NOTIFICATIONS
// =============================================
async function loadNotifications() {
    if (!currentUserId) return;
    try {
        let res    = await fetch(`${BASE_URL}/notifications/${currentUserId}`);
        let notifs = await res.json();
        if (!Array.isArray(notifs)) return;

        let dot = document.getElementById("notifDot");
        if (dot) dot.style.display = notifs.length > 0 ? "block" : "none";

        let list = document.getElementById("notifList");
        if (!list) return;

        if (notifs.length === 0) {
            list.innerHTML = `<p style="color:#94a3b8; font-size:13px;">No new notifications</p>`;
            return;
        }
        list.innerHTML = notifs.map(n => `
            <div onclick="markNotifRead('${n._id}')"
                 style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.07);
                        cursor:pointer; font-size:13px; color:#e2e8f0;">
                ${escapeHtml(n.message)}
                <span style="display:block; font-size:11px; color:#64748b; margin-top:3px;">
                    ${new Date(n.createdAt).toLocaleString()}
                </span>
            </div>
        `).join("");
    } catch (err) {}
}

async function markNotifRead(id) {
    try {
        await fetch(`${BASE_URL}/notifications/read/${id}`, { method: "POST" });
        loadNotifications();
    } catch (err) {}
}

function toggleNotif() {
    let box = document.getElementById("notifBox");
    if (!box) return;
    box.style.display = box.style.display === "block" ? "none" : "block";
}

document.addEventListener("click", (e) => {
    let box  = document.getElementById("notifBox");
    let bell = e.target.closest(".notif-wrapper");
    if (box && !bell && !box.contains(e.target)) box.style.display = "none";
});

// =============================================
// SHOW SECTION
// =============================================
function showSection(section) {
    let content = document.getElementById("content");
    if (!content) return;

    document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active"));
    let activeLink = document.querySelector(`.sidebar a[onclick*="'${section}'"]`);
    if (activeLink) activeLink.classList.add("active");

    document.querySelectorAll(".bottom-nav .nav-item").forEach(el => el.classList.remove("active"));
    let activeNav = document.querySelector(`.bottom-nav .nav-item[onclick*="'${section}'"]`);
    if (activeNav) activeNav.classList.add("active");

    switch (section) {
        case "dashboard":    renderDashboard(content); break;
        case "jobs":         renderJobs(content); break;
        case "applications": renderApplications(content); break;
        case "profile":      renderProfile(content); break;
        default:             renderDashboard(content);
    }
}

function navigate(section) { showSection(section); }

// =============================================
// RENDER: DASHBOARD HOME
// =============================================
function renderDashboard(content) {
    let appliedCount   = allApplications.length;
    let interviewCount = allApplications.filter(a => a.status === "Interview").length;
    let selectedCount  = allApplications.filter(a => a.status === "Selected").length;

    content.innerHTML = `
        <div style="padding: 0 4px;">
            <h2 id="welcomeUser" style="margin-bottom:20px; color:#e2e8f0;">
                Welcome ${escapeHtml(window._welcomeName || "User")} 👋
            </h2>

            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:24px;">
                ${statCard("Applied", appliedCount, "#6366f1")}
                ${statCard("Interviews", interviewCount, "#38bdf8")}
                ${statCard("Selected", selectedCount, "#22c55e")}
            </div>

            <h3 style="color:#e2e8f0; margin-bottom:12px;">Recent Jobs</h3>
            <div id="jobsContainer">
                ${renderJobCards(allJobs.slice(0, 6))}
            </div>
        </div>
    `;
}

function statCard(label, value, color) {
    return `
        <div style="background:#1e293b; border-radius:12px; padding:16px; text-align:center;
                    border-top:3px solid ${color};">
            <div style="font-size:28px; font-weight:700; color:${color};">${value}</div>
            <div style="font-size:13px; color:#94a3b8; margin-top:4px;">${label}</div>
        </div>`;
}

// =============================================
// RENDER: JOBS LIST
// =============================================
function renderJobs(content) {
    content.innerHTML = `
        <div style="padding: 0 4px;">
            <h2 style="color:#e2e8f0; margin-bottom:16px;">Available Jobs</h2>
            <input id="jobSearch" type="text" placeholder="Search by title, company, skills..."
                   oninput="filterJobs(this.value)"
                   style="width:100%; padding:10px 14px; border-radius:8px; border:1px solid #334155;
                          background:#1e293b; color:#e2e8f0; font-size:14px; margin-bottom:16px; box-sizing:border-box;">
            <div id="jobsContainer">
                ${renderJobCards(allJobs)}
            </div>
        </div>
    `;
}

function filterJobs(query) {
    let q = query.toLowerCase();
    let filtered = allJobs.filter(j =>
        (j.title || "").toLowerCase().includes(q) ||
        (j.companyName || "").toLowerCase().includes(q) ||
        (j.location || "").toLowerCase().includes(q) ||
        (Array.isArray(j.skills) ? j.skills.join(" ") : j.skills || "").toLowerCase().includes(q)
    );
    let container = document.getElementById("jobsContainer");
    if (container) container.innerHTML = renderJobCards(filtered);
}

// =============================================
// RENDER JOB CARDS (with View + Save buttons)
// =============================================
function renderJobCards(jobs) {
    if (!jobs || jobs.length === 0) {
        return `<p style="color:#94a3b8;">No jobs available right now.</p>`;
    }
    return jobs.map(job => {
        let skillsDisplay = Array.isArray(job.skills) ? job.skills.join(", ") : (job.skills || "");
        let isClosed = job.status === "closed";
        let isSaved  = savedJobIds.has(job._id);
        let alreadyApplied = allApplications.some(a => (a.jobId?._id || a.jobId) === job._id);

        let statusBadge = isClosed
            ? `<span style="background:#ef444422; color:#ef4444; padding:2px 10px; border-radius:20px; font-size:11px;">Closed</span>`
            : `<span style="background:#22c55e22; color:#22c55e; padding:2px 10px; border-radius:20px; font-size:11px;">Open</span>`;

        return `
            <div class="job-card-premium" style="position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                    <div style="flex:1;">
                        <h3 style="margin:0 0 6px;">${escapeHtml(job.title || "Untitled")}</h3>
                        <p style="margin:3px 0; font-size:13px; color:#94a3b8;">
                            <i class="ri-building-line"></i> ${escapeHtml(job.companyName || "")}
                        </p>
                        <p style="margin:3px 0; font-size:13px; color:#94a3b8;">
                            <i class="ri-map-pin-line"></i> ${escapeHtml(job.location || "")}
                        </p>
                        ${job.salary ? `<p style="margin:3px 0; font-size:13px; color:#94a3b8;"><i class="ri-money-dollar-circle-line"></i> ${escapeHtml(job.salary)}</p>` : ""}
                        ${job.employmentType ? `<p style="margin:3px 0; font-size:13px; color:#94a3b8;"><i class="ri-briefcase-line"></i> ${escapeHtml(job.employmentType)}</p>` : ""}
                        ${skillsDisplay ? `<p style="font-size:12px; color:#64748b; margin-top:6px;">🛠️ ${escapeHtml(skillsDisplay)}</p>` : ""}
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                        ${statusBadge}
                        <button
                            id="save-btn-${job._id}"
                            title="${isSaved ? 'Unsave Job' : 'Save Job'}"
                            onclick="handleSaveJob('${job._id}', this)"
                            style="background:none; border:none; cursor:pointer; font-size:18px;
                                   color:${isSaved ? '#6366f1' : '#94a3b8'}; padding:2px 4px;">
                            <i class="${isSaved ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i>
                        </button>
                    </div>
                </div>
                <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
                    <button class="apply-btn" style="flex:1; min-width:100px;"
                            onclick="viewJobDetails('${job._id}')">
                        <i class="ri-eye-line"></i> View Details
                    </button>
                    ${!isClosed
                        ? (alreadyApplied
                            ? `<button class="apply-btn" style="flex:1; min-width:100px; background:linear-gradient(135deg,#22c55e,#16a34a); cursor:default;" disabled>
                                ✅ Applied
                               </button>`
                            : `<button class="apply-btn" style="flex:1; min-width:100px;"
                                onclick="goApply('${job._id}')">
                                Apply Now
                               </button>`)
                        : `<button class="apply-btn" style="flex:1; min-width:100px; opacity:0.4; cursor:not-allowed;" disabled>Closed</button>`
                    }
                </div>
            </div>`;
    }).join("");
}

function handleSaveJob(jobId, btn) {
    toggleSaveJob(jobId, btn);
}

// =============================================
// VIEW JOB DETAILS MODAL
// =============================================
function viewJobDetails(jobId) {
    let job = allJobs.find(j => j._id === jobId);
    if (!job) return;

    let skillsDisplay = Array.isArray(job.skills) ? job.skills.join(", ") : (job.skills || "None");
    let isClosed       = job.status === "closed";
    let alreadyApplied = allApplications.some(a => (a.jobId?._id || a.jobId) === job._id);
    let isSaved        = savedJobIds.has(job._id);

    // Remove existing modal if any
    let existing = document.getElementById("jobDetailModal");
    if (existing) existing.remove();

    let modal = document.createElement("div");
    modal.id = "jobDetailModal";
    modal.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:9999;
        overflow-y:auto; padding:20px; box-sizing:border-box;
        display:flex; align-items:flex-start; justify-content:center;
    `;

    modal.innerHTML = `
        <div style="max-width:560px; width:100%; margin:40px auto; background:#0f172a;
                    border-radius:20px; padding:28px; border:1px solid rgba(255,255,255,0.1);
                    position:relative;">

            <!-- Close -->
            <button onclick="document.getElementById('jobDetailModal').remove()"
                    style="position:absolute; top:16px; right:16px; background:none; border:none;
                           color:#94a3b8; font-size:22px; cursor:pointer; padding:0;">
                <i class="ri-close-line"></i>
            </button>

            <!-- Status badge -->
            <div style="margin-bottom:12px;">
                ${isClosed
                    ? `<span style="background:#ef444422; color:#ef4444; padding:3px 12px; border-radius:20px; font-size:12px;">Closed</span>`
                    : `<span style="background:#22c55e22; color:#22c55e; padding:3px 12px; border-radius:20px; font-size:12px;">Open</span>`}
            </div>

            <!-- Title & Company -->
            <h2 style="color:#e2e8f0; margin:0 0 6px; font-size:22px;">${escapeHtml(job.title || "Untitled")}</h2>
            <p style="color:#94a3b8; margin:0 0 20px; font-size:14px;">
                <i class="ri-building-line"></i> ${escapeHtml(job.companyName || "—")}
            </p>

            <!-- Details grid -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px;">
                ${detailItem("ri-map-pin-line", "Location", job.location)}
                ${detailItem("ri-briefcase-line", "Type", job.employmentType)}
                ${detailItem("ri-money-dollar-circle-line", "Salary", job.salary)}
                ${detailItem("ri-time-line", "Experience", job.experience ? job.experience + " yr(s)" : "Not specified")}
                ${detailItem("ri-global-line", "Domain", job.domain)}
            </div>

            <!-- Skills -->
            <div style="margin-bottom:20px;">
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Required Skills</div>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${(Array.isArray(job.skills) ? job.skills : (job.skills||"").split(","))
                        .filter(Boolean)
                        .map(s => `<span style="background:#6366f122; color:#818cf8; padding:5px 12px; border-radius:20px; font-size:12px; border:1px solid #6366f133;">${escapeHtml(s.trim())}</span>`)
                        .join("") || `<span style="color:#64748b; font-size:13px;">None specified</span>`}
                </div>
            </div>

            <!-- Description -->
            ${job.description ? `
                <div style="margin-bottom:20px;">
                    <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Description</div>
                    <p style="color:#cbd5e1; font-size:14px; line-height:1.7; margin:0;">${escapeHtml(job.description)}</p>
                </div>
            ` : ""}

            <!-- Action buttons -->
            <div style="display:flex; gap:10px; margin-top:4px; flex-wrap:wrap;">
                <button onclick="handleSaveJobModal('${job._id}')"
                        id="modal-save-btn-${job._id}"
                        style="flex:1; padding:12px; border-radius:10px; font-size:14px; font-weight:600;
                               cursor:pointer; border:1px solid #334155;
                               background:${isSaved ? '#6366f122' : '#1e293b'};
                               color:${isSaved ? '#818cf8' : '#94a3b8'};">
                    <i class="${isSaved ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i>
                    ${isSaved ? 'Saved' : 'Save Job'}
                </button>

                ${!isClosed
                    ? (alreadyApplied
                        ? `<button style="flex:2; padding:12px; border-radius:10px; font-size:14px; font-weight:600;
                                   background:linear-gradient(135deg,#22c55e,#16a34a); color:white; border:none; cursor:default;">
                            ✅ Already Applied
                           </button>`
                        : `<button onclick="closeModalAndApply('${job._id}')"
                                   style="flex:2; padding:12px; border-radius:10px; font-size:14px; font-weight:600;
                                          background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; border:none; cursor:pointer;">
                            Apply Now
                           </button>`)
                    : `<button disabled style="flex:2; padding:12px; border-radius:10px; font-size:14px; font-weight:600;
                                              background:#1e293b; color:#64748b; border:1px solid #334155; cursor:not-allowed;">
                        Job Closed
                       </button>`
                }
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.remove();
    });
}

function detailItem(icon, label, value) {
    if (!value) return "";
    return `
        <div style="background:#1e293b; border-radius:10px; padding:12px;">
            <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">
                <i class="${icon}" style="color:#6366f1;"></i> ${label}
            </div>
            <div style="font-size:14px; color:#e2e8f0; font-weight:500;">${escapeHtml(String(value))}</div>
        </div>`;
}

async function handleSaveJobModal(jobId) {
    let btn = document.getElementById(`modal-save-btn-${jobId}`);
    if (!btn) return;
    await toggleSaveJob(jobId, {
        // proxy object to update modal button UI
        innerHTML: "",
        title: "",
        style: { color: "" },
        set innerHTML(v) { btn.innerHTML = v.includes("fill") ? `<i class="ri-bookmark-fill"></i> Saved` : `<i class="ri-bookmark-line"></i> Save Job`; },
        set title(v) {},
        get style() { return { set color(c) { btn.style.color = c; btn.style.background = c === "#6366f1" ? "#6366f122" : "#1e293b"; } }; }
    });
    // Also update card button if visible
    let cardBtn = document.getElementById(`save-btn-${jobId}`);
    if (cardBtn) {
        let saved = savedJobIds.has(jobId);
        cardBtn.innerHTML = `<i class="${saved ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i>`;
        cardBtn.style.color = saved ? "#6366f1" : "#94a3b8";
    }
}

function closeModalAndApply(jobId) {
    let modal = document.getElementById("jobDetailModal");
    if (modal) modal.remove();
    goApply(jobId);
}

// =============================================
// RENDER: MY APPLICATIONS (with status tabs)
// =============================================
function renderApplications(content, activeTab) {
    activeTab = activeTab || "all";

    let tabs = [
        { key: "all",       label: "All",       count: allApplications.length },
        { key: "Applied",   label: "Applied",   count: allApplications.filter(a => a.status === "Applied" || a.status === "Screening").length },
        { key: "Interview", label: "Interview", count: allApplications.filter(a => a.status === "Interview").length },
        { key: "Selected",  label: "Selected",  count: allApplications.filter(a => a.status === "Selected").length },
        { key: "Rejected",  label: "Rejected",  count: allApplications.filter(a => a.status === "Rejected").length },
    ];

    let filtered = activeTab === "all" ? allApplications
        : activeTab === "Applied"   ? allApplications.filter(a => a.status === "Applied" || a.status === "Screening")
        : allApplications.filter(a => a.status === activeTab);

    content.innerHTML = `
        <div style="padding: 0 4px;">
            <h2 style="color:#e2e8f0; margin-bottom:16px;">My Applications</h2>

            <!-- Tabs -->
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
                ${tabs.map(t => `
                    <button onclick="renderApplications(document.getElementById('content'), '${t.key}')"
                            style="padding:7px 14px; border-radius:20px; font-size:13px; font-weight:600;
                                   cursor:pointer; border:1px solid ${activeTab === t.key ? '#6366f1' : '#334155'};
                                   background:${activeTab === t.key ? '#6366f122' : 'transparent'};
                                   color:${activeTab === t.key ? '#818cf8' : '#94a3b8'};">
                        ${t.label} <span style="font-size:11px; opacity:0.7;">(${t.count})</span>
                    </button>
                `).join("")}
            </div>

            <div id="applicationsContainer">
                ${renderApplicationCards(filtered)}
            </div>
        </div>
    `;
}

function renderApplicationCards(apps) {
    if (!apps || apps.length === 0) {
        return `<p style="color:#94a3b8;">No applications in this category. <a onclick="showSection('jobs')" style="color:#6366f1; cursor:pointer;">Browse jobs →</a></p>`;
    }
    return apps.map(app => {
        let statusColor = app.status === "Selected"  ? "#22c55e"
                        : app.status === "Rejected"  ? "#ef4444"
                        : app.status === "Interview" ? "#f59e0b"
                        : app.status === "Screening" ? "#38bdf8"
                        : "#94a3b8";

        let job      = allJobs.find(j => j._id === (app.jobId?._id || app.jobId));
        let jobTitle = job?.title || app.jobTitle || "Job Application";

        let statusIcon = app.status === "Selected"  ? "🎉"
                       : app.status === "Rejected"  ? "❌"
                       : app.status === "Interview" ? "📅"
                       : app.status === "Screening" ? "🔍"
                       : "📋";

        // Build the resume URL — server stores as "uploads/filename.pdf"
        let resumeHref = app.resumeUrl
            ? (app.resumeUrl.startsWith("http") ? app.resumeUrl : `${BASE_URL}/${app.resumeUrl}`)
            : "";

        return `
            <div class="job-card-premium">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                    <div style="flex:1;">
                        <h3 style="margin:0 0 6px;">${escapeHtml(jobTitle)}</h3>
                        ${job ? `<p style="margin:2px 0; font-size:13px; color:#94a3b8;"><i class="ri-building-line"></i> ${escapeHtml(job.companyName || "")}</p>` : ""}
                        ${job ? `<p style="margin:2px 0; font-size:13px; color:#94a3b8;"><i class="ri-map-pin-line"></i> ${escapeHtml(job.location || "")}</p>` : ""}
                        <p style="margin:4px 0; font-size:13px; color:#94a3b8;">
                            Applied: ${new Date(app.appliedAt || app.createdAt).toLocaleDateString()}
                        </p>
                        ${app.matchScore > 0
                            ? `<p style="font-size:13px; color:#94a3b8; margin:2px 0;">
                               Match: <span style="color:${app.matchScore >= 70 ? '#22c55e' : app.matchScore >= 40 ? '#f59e0b' : '#ef4444'}; font-weight:600;">
                               ${parseFloat(app.matchScore).toFixed(1)}%</span></p>`
                            : ""}
                        ${app.status === "Interview"
                            ? `<p style="font-size:13px; color:#f59e0b; margin-top:6px;">
                                📅 Interview scheduled — check your email for details</p>`
                            : ""}
                        ${app.status === "Selected"
                            ? `<p style="font-size:13px; color:#22c55e; margin-top:6px;">
                                🎉 Congratulations! You have been selected.</p>`
                            : ""}
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                        <span style="background:${statusColor}22; color:${statusColor}; padding:4px 12px;
                                    border-radius:20px; font-size:12px; font-weight:600;
                                    border:1px solid ${statusColor}44; white-space:nowrap;">
                            ${statusIcon} ${escapeHtml(app.status || "Applied")}
                        </span>
                    </div>
                </div>

                <!-- Resume view button -->
                ${resumeHref ? `
                <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);">
                    <a href="${resumeHref}" target="_blank"
                       style="display:inline-flex; align-items:center; gap:7px; padding:8px 16px;
                              border-radius:8px; background:#1e3a5f; color:#38bdf8;
                              font-size:13px; font-weight:600; text-decoration:none;
                              border:1px solid #38bdf844; transition:background 0.2s;">
                        <i class="ri-file-pdf-line" style="font-size:15px;"></i>
                        View Submitted Resume
                    </a>
                </div>` : `
                <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);">
                    <span style="font-size:12px; color:#475569;">
                        <i class="ri-file-unknow-line"></i> No resume attached
                    </span>
                </div>`}
            </div>`;
    }).join("");
}

// =============================================
// RENDER: PROFILE (styled like the screenshot)
// =============================================
async function renderProfile(content) {
    content.innerHTML = `<div style="padding:0 4px;"><p style="color:#94a3b8;">Loading profile...</p></div>`;

    try {
        let res  = await fetch(`${BASE_URL}/profile/${currentUserEmail}`);
        let user = await res.json();

        if (!user || user.error) throw new Error("Profile not found");

        let firstName    = user.profile?.firstName || "";
        let lastName     = user.profile?.lastName  || "";
        let phone        = user.profile?.phone     || "";
        let location     = user.profile?.location  || "";
        let gender       = user.gender   || "";
        let type         = user.type     || "";
        let role         = user.role     || "job_seeker";
        let joinDate     = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { year:"numeric", month:"long" }) : "";
        let resumeSkills = user.resume?.parsedData?.skills || [];
        let resumeFileUrl= user.resume?.fileUrl || "";
        let resumeExp    = user.resume?.parsedData?.experience || [];
        let resumeEdu    = user.resume?.parsedData?.education  || [];
        let profileImage = user.profileImage || "";

        let myApps      = allApplications.length;
        let interviews  = allApplications.filter(a => a.status === "Interview").length;
        let selected    = allApplications.filter(a => a.status === "Selected").length;

        let avatarHtml = profileImage
            ? `<img src="${profileImage}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #6366f1;">`
            : `<div style="width:80px;height:80px;border-radius:50%;
                           background:linear-gradient(135deg,#6366f1,#8b5cf6);
                           display:flex;align-items:center;justify-content:center;
                           font-size:30px;color:white;font-weight:700;flex-shrink:0;
                           border:3px solid #6366f144;">
                   ${escapeHtml((firstName.charAt(0) || "U").toUpperCase())}
               </div>`;

        content.innerHTML = `
            <div style="padding:0 4px; max-width:640px;">

                <!-- ── Profile Card ── -->
                <div class="job-card-premium" style="margin-bottom:16px; padding:24px;">

                    <!-- Gradient accent bar -->
                    <div style="height:3px; background:linear-gradient(90deg,#6366f1,#22c55e);
                                border-radius:2px; margin-bottom:20px;"></div>

                    <!-- Avatar + Email row -->
                    <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
                        ${avatarHtml}
                        <div>
                            <div style="font-size:18px; font-weight:700; color:#e2e8f0;">
                                ${escapeHtml((firstName + " " + lastName).trim() || "No Name Set")}
                            </div>
                            <div style="font-size:13px; color:#94a3b8; margin-top:3px;">
                                ${escapeHtml(user.email || currentUserEmail)}
                            </div>
                        </div>
                        <button onclick="showEditProfile()"
                                style="margin-left:auto; padding:8px 18px; border-radius:8px; font-size:13px;
                                       font-weight:600; background:linear-gradient(135deg,#0ea5e9,#6366f1);
                                       color:white; border:none; cursor:pointer;">
                            Edit
                        </button>
                    </div>

                    <!-- Fields grid (like screenshot) -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                        ${profileInputField("First Name", firstName)}
                        ${profileInputField("Last Name", lastName)}
                        ${profileInputField("Phone", phone)}
                        ${profileInputField("City", location)}
                        ${profileInputField("Gender", gender)}
                        ${profileInputField("Type", type)}
                    </div>

                    <div style="margin-top:14px;">
                        ${profileInputField("Role", role)}
                    </div>
                </div>

                <!-- ── Stats ── -->
                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px;">
                    <div style="background:#1e293b; border-radius:12px; padding:14px; text-align:center; border-top:3px solid #6366f1;">
                        <div style="font-size:24px; font-weight:700; color:#6366f1;">${myApps}</div>
                        <div style="font-size:12px; color:#94a3b8; margin-top:4px;">Applied</div>
                    </div>
                    <div style="background:#1e293b; border-radius:12px; padding:14px; text-align:center; border-top:3px solid #f59e0b;">
                        <div style="font-size:24px; font-weight:700; color:#f59e0b;">${interviews}</div>
                        <div style="font-size:12px; color:#94a3b8; margin-top:4px;">Interviews</div>
                    </div>
                    <div style="background:#1e293b; border-radius:12px; padding:14px; text-align:center; border-top:3px solid #22c55e;">
                        <div style="font-size:24px; font-weight:700; color:#22c55e;">${selected}</div>
                        <div style="font-size:12px; color:#94a3b8; margin-top:4px;">Selected</div>
                    </div>
                </div>

                <!-- ── Resume ── -->
                <div class="job-card-premium" style="margin-bottom:16px;">
                    <h3 style="color:#e2e8f0; margin:0 0 14px; font-size:15px;">📄 Resume</h3>
                    ${(() => {
                        let displayUrl = resumeFileUrl ? (resumeFileUrl.startsWith("http") ? resumeFileUrl : BASE_URL + "/" + resumeFileUrl) : "";
                        if (!displayUrl && allApplications.length > 0) {
                            let sorted = [...allApplications].sort((a, b) => new Date(b.appliedAt || b.createdAt) - new Date(a.appliedAt || a.createdAt));
                            let latest = sorted.find(a => a.resumeUrl);
                            if (latest && latest.resumeUrl) {
                                displayUrl = latest.resumeUrl.startsWith("http") ? latest.resumeUrl : BASE_URL + "/" + latest.resumeUrl;
                            }
                        }
                        return displayUrl
                            ? '<a href="' + displayUrl + '" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:9px;background:#1e3a5f;color:#38bdf8;font-size:13px;font-weight:600;text-decoration:none;border:1px solid #38bdf844;margin-bottom:14px;"><i class="ri-file-pdf-line" style="font-size:16px;"></i> View Resume PDF</a><br>'
                            : '<p style="color:#94a3b8;font-size:13px;margin:0 0 10px;">No resume on file. Upload one when you apply for a job.</p>';
                    })()}






                    ${resumeSkills.length > 0 ? `
                        <div style="margin-bottom:10px;">
                            <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Skills from Resume</div>
                            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                                ${resumeSkills.map(s => `<span style="background:#6366f122;color:#818cf8;padding:4px 10px;border-radius:20px;font-size:12px;border:1px solid #6366f133;">${escapeHtml(s)}</span>`).join("")}
                            </div>
                        </div>` : ""}
                    ${resumeExp.length > 0 ? `
                        <div style="margin-bottom:10px;">
                            <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Experience</div>
                            ${resumeExp.map(e => `<div style="font-size:13px;color:#cbd5e1;padding:4px 0;">${escapeHtml(typeof e==="object"?(e.title||e.company||JSON.stringify(e)):String(e))}</div>`).join("")}
                        </div>` : ""}
                    ${resumeEdu.length > 0 ? `
                        <div>
                            <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Education</div>
                            ${resumeEdu.map(e => `<div style="font-size:13px;color:#cbd5e1;padding:4px 0;">${escapeHtml(typeof e==="object"?(e.degree||e.institution||JSON.stringify(e)):String(e))}</div>`).join("")}
                        </div>` : ""}
                </div>

                <!-- ── Recent Applications ── -->
                ${allApplications.length > 0 ? `
                <div class="job-card-premium">
                    <h3 style="color:#e2e8f0; margin:0 0 14px; font-size:15px;">📋 Recent Applications</h3>
                    ${allApplications.slice(0,3).map(app => {
                        let j = allJobs.find(j2 => j2._id === (app.jobId?._id || app.jobId));
                        let sc = app.status==="Selected"?"#22c55e":app.status==="Rejected"?"#ef4444":app.status==="Interview"?"#f59e0b":app.status==="Screening"?"#38bdf8":"#94a3b8";
                        let rUrl = app.resumeUrl ? (app.resumeUrl.startsWith("http") ? app.resumeUrl : BASE_URL + "/" + app.resumeUrl) : "";
                        return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
                                <div>
                                    <div style="font-size:14px;color:#e2e8f0;font-weight:500;">${escapeHtml(j?.title||"Job Application")}</div>
                                    <div style="font-size:12px;color:#94a3b8;">${escapeHtml(j?.companyName||"")} · ${new Date(app.appliedAt||app.createdAt).toLocaleDateString()}</div>
                                </div>
                                <span style="background:${sc}22;color:${sc};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${sc}44;">${escapeHtml(app.status||"Applied")}</span>
                            </div>
                            ${rUrl ? `<a href="${rUrl}" target="_blank" style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:7px;background:#1e3a5f;color:#38bdf8;font-size:12px;font-weight:600;text-decoration:none;border:1px solid #38bdf844;"><i class="ri-file-pdf-line"></i> View Resume</a>` : ""}
                        </div>`;
                    }).join("")}
                    ${allApplications.length > 3 ? `<p style="font-size:13px;color:#6366f1;cursor:pointer;margin-top:10px;margin-bottom:0;" onclick="showSection('applications')">View all ${allApplications.length} applications →</p>` : ""}
                </div>` : ""}

            </div>

            <!-- ── Edit Profile Modal ── -->
            <div id="editProfileModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7);
                 z-index:9999; overflow-y:auto; padding:20px; box-sizing:border-box;">
                <div style="max-width:480px; margin:40px auto; background:#0f172a; border-radius:16px;
                            padding:28px; border:1px solid rgba(255,255,255,0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 style="color:#e2e8f0; margin:0;">✏️ Edit Profile</h3>
                        <i class="ri-close-line" onclick="closeEditProfile()"
                           style="color:#94a3b8; font-size:22px; cursor:pointer;"></i>
                    </div>
                    <div style="display:grid; gap:12px;">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <input id="ep_firstName" type="text" placeholder="First Name" value="${escapeHtml(firstName)}"
                                   style="padding:10px 14px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:14px;">
                            <input id="ep_lastName" type="text" placeholder="Last Name" value="${escapeHtml(lastName)}"
                                   style="padding:10px 14px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:14px;">
                        </div>
                        <input id="ep_phone" type="tel" placeholder="Phone Number" value="${escapeHtml(phone)}"
                               style="padding:10px 14px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:14px;">
                        <input id="ep_location" type="text" placeholder="City / Location" value="${escapeHtml(location)}"
                               style="padding:10px 14px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:14px;">
                        <select id="ep_gender" style="padding:10px 14px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:14px;">
                            <option value="">Select Gender</option>
                            <option value="Male" ${gender==="Male"?"selected":""}>Male</option>
                            <option value="Female" ${gender==="Female"?"selected":""}>Female</option>
                            <option value="Other" ${gender==="Other"?"selected":""}>Other</option>
                        </select>
                        <input type="text" placeholder="Email (cannot be changed)" value="${escapeHtml(user.email||currentUserEmail)}" readonly
                               style="padding:10px 14px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#64748b;font-size:14px;cursor:not-allowed;">
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px;">
                        <button onclick="closeEditProfile()"
                                style="padding:10px;border-radius:8px;background:#1e293b;color:#94a3b8;border:1px solid #334155;cursor:pointer;font-size:14px;">
                            Cancel
                        </button>
                        <button onclick="saveProfile()"
                                style="padding:10px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;cursor:pointer;font-size:14px;font-weight:600;">
                            Save Changes
                        </button>
                    </div>
                    <p id="editProfileMsg" style="margin-top:10px; font-size:13px; text-align:center;"></p>
                </div>
            </div>`;

        let profileWrap = content.firstElementChild;
        if (profileWrap) profileWrap.insertAdjacentHTML("beforeend", renderSavedJobsProfile());

    } catch (err) {
        content.innerHTML = `<div style="padding:0 4px;">
            <h2 style="color:#e2e8f0;">My Profile</h2>
            <p style="color:#ef4444;">Failed to load profile. Please refresh.</p>
        </div>`;
    }
}

function renderSavedJobsProfile() {
    let jobs = savedJobs.length
        ? savedJobs
        : allJobs.filter(job => savedJobIds.has(job._id));

    return `
        <div class="job-card-premium" style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
                <h3 style="color:#e2e8f0; margin:0; font-size:15px;">Saved Jobs</h3>
                <span style="background:#6366f122;color:#818cf8;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid #6366f144;">
                    ${jobs.length}
                </span>
            </div>
            ${jobs.length === 0 ? `
                <p style="color:#94a3b8;font-size:13px;margin:0;">No saved jobs yet.</p>
            ` : `
                <div style="display:grid;gap:10px;">
                    ${jobs.slice(0, 5).map(job => {
                        let isClosed = job.status === "closed";
                        let alreadyApplied = allApplications.some(a => (a.jobId?._id || a.jobId) === job._id);
                        return `
                            <div style="background:#1e293b;border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px;">
                                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
                                    <div style="min-width:0;">
                                        <div style="font-size:14px;color:#e2e8f0;font-weight:600;line-height:1.35;">${escapeHtml(job.title || "Untitled Job")}</div>
                                        <div style="font-size:12px;color:#94a3b8;margin-top:3px;">
                                            ${escapeHtml(job.companyName || "")}${job.location ? " · " + escapeHtml(job.location) : ""}
                                        </div>
                                    </div>
                                    <span style="background:${isClosed ? "#ef444422" : "#22c55e22"};color:${isClosed ? "#ef4444" : "#22c55e"};padding:3px 9px;border-radius:20px;font-size:11px;white-space:nowrap;">
                                        ${isClosed ? "Closed" : "Open"}
                                    </span>
                                </div>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                    <button type="button" onclick="viewJobDetails('${job._id}')"
                                            style="flex:1;min-width:110px;padding:8px 10px;border-radius:8px;background:#0f172a;color:#cbd5e1;border:1px solid #334155;font-size:13px;cursor:pointer;">
                                        <i class="ri-eye-line"></i> View
                                    </button>
                                    ${!isClosed && !alreadyApplied ? `
                                        <button type="button" onclick="goApply('${job._id}')"
                                                style="flex:1;min-width:110px;padding:8px 10px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;font-size:13px;font-weight:600;cursor:pointer;">
                                            Apply
                                        </button>
                                    ` : `
                                        <button type="button" disabled
                                                style="flex:1;min-width:110px;padding:8px 10px;border-radius:8px;background:#0f172a;color:#64748b;border:1px solid #334155;font-size:13px;cursor:not-allowed;">
                                            ${alreadyApplied ? "Applied" : "Closed"}
                                        </button>
                                    `}
                                </div>
                            </div>`;
                    }).join("")}
                </div>
                ${jobs.length > 5 ? `<p style="font-size:12px;color:#94a3b8;margin:10px 0 0;">Showing 5 of ${jobs.length} saved jobs.</p>` : ""}
            `}
        </div>`;
}

// Profile field styled like the screenshot (readonly input box)
function profileInputField(label, value) {
    return `
        <div>
            <div style="font-size:12px; color:#94a3b8; margin-bottom:6px;">${label}</div>
            <div style="padding:10px 14px; border-radius:8px; border:1px solid #1e293b;
                        background:#1e293b; color:${value ? '#e2e8f0' : '#334155'};
                        font-size:14px; min-height:40px;">
                ${escapeHtml(value || "")}
            </div>
        </div>`;
}

function showEditProfile() {
    let modal = document.getElementById("editProfileModal");
    if (modal) modal.style.display = "block";
}

function closeEditProfile() {
    let modal = document.getElementById("editProfileModal");
    if (modal) modal.style.display = "none";
}

async function saveProfile() {
    let firstName = document.getElementById("ep_firstName").value.trim();
    let lastName  = document.getElementById("ep_lastName").value.trim();
    let contact   = document.getElementById("ep_phone").value.trim();
    let city      = document.getElementById("ep_location").value.trim();
    let gender    = document.getElementById("ep_gender").value;
    let msg       = document.getElementById("editProfileMsg");

    if (!firstName) { msg.style.color = "#ef4444"; msg.textContent = "First name is required."; return; }

    msg.style.color = "#94a3b8"; msg.textContent = "Saving...";

    try {
        let res = await fetch(`${BASE_URL}/update-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: currentUserEmail, firstName, lastName, contact, city, gender })
        });
        let data = await res.json();

        if (data.error) { msg.style.color = "#ef4444"; msg.textContent = data.error; return; }

        msg.style.color = "#22c55e"; msg.textContent = "Profile updated ✅";

        let sessionUser = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
        sessionUser.firstName = firstName; sessionUser.lastName = lastName;
        localStorage.setItem("loggedInUser", JSON.stringify(sessionUser));
        window._welcomeName = firstName;

        setTimeout(() => {
            closeEditProfile();
            renderProfile(document.getElementById("content"));
        }, 900);
    } catch (err) {
        msg.style.color = "#ef4444"; msg.textContent = "Save failed. Please try again.";
    }
}

// =============================================
// NAVIGATE TO APPLY
// =============================================
function goApply(jobId) {
    localStorage.setItem("selectedJobId", jobId);
    window.location.href = "apply.html";
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
    setTimeout(() => { toast.className = ""; }, 3000);
}

// =============================================
// HELPER
// =============================================
function escapeHtml(str) {
    let div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
}
