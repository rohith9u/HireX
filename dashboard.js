// =============================================
// ✅ DASHBOARD.JS — Fixed & Fully Integrated
// =============================================
 
const BASE_URL = "https://hirex-backend-sio8.onrender.com";
 
let currentUserEmail = "";
let currentUserId    = "";
let allJobs          = [];
let allApplications  = [];
 
// =============================================
// ON LOAD
// =============================================
window.addEventListener("DOMContentLoaded", async () => {
 
    // ✅ Session guard
    let sessionUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (!sessionUser) {
        window.location.replace("index.html");
        return;
    }
 
    currentUserEmail = localStorage.getItem("userEmail") || sessionUser.email || "";
 
    // ✅ Fetch real profile from backend
    await loadUserProfile(sessionUser);
 
    // ✅ Pre-load data
    await Promise.all([loadJobs(), loadApplications()]);
 
    // ✅ Show default section
    const hash = window.location.hash.replace("#", "") || "dashboard";
    showSection(hash);
 
    // ✅ Load notifications (requires userId)
    if (currentUserId) loadNotifications();
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
            // ✅ Server stores name in user.profile.firstName
            firstName = user.profile?.firstName || user.firstName || firstName;
            currentUserId = user._id || "";
 
            // Cache back
            sessionUser.firstName = firstName;
            localStorage.setItem("loggedInUser", JSON.stringify(sessionUser));
        }
    } catch (err) {
        console.error("Profile fetch failed:", err);
    }
 
    // ✅ Update topbar name
    let topbarEl = document.getElementById("topbarName");
    if (topbarEl) topbarEl.textContent = firstName || "User";
 
    // ✅ Update welcome (set later when section renders)
    window._welcomeName = firstName || "User";
}
 
// =============================================
// LOAD JOBS
// =============================================
async function loadJobs() {
    try {
        let res  = await fetch(`${BASE_URL}/jobs`);
        allJobs  = await res.json();
        if (!Array.isArray(allJobs)) allJobs = [];
    } catch (err) {
        console.error("Jobs fetch failed:", err);
        allJobs = [];
    }
}
 
// =============================================
// LOAD APPLICATIONS (filter client-side by email)
// =============================================
async function loadApplications() {
    try {
        let res  = await fetch(`${BASE_URL}/applications`);
        let apps = await res.json();
        if (!Array.isArray(apps)) apps = [];
        // ✅ Filter to only this user's applications
        allApplications = apps.filter(a =>
            (a.email || "").toLowerCase() === currentUserEmail.toLowerCase()
        );
    } catch (err) {
        console.error("Applications fetch failed:", err);
        allApplications = [];
    }
}
 
// =============================================
// LOAD NOTIFICATIONS
// =============================================
async function loadNotifications() {
    if (!currentUserId) return;
    try {
        let res   = await fetch(`${BASE_URL}/notifications/${currentUserId}`);
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
    } catch (err) {
        console.error("Notifications fetch failed:", err);
    }
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
 
// close notif box when clicking elsewhere
document.addEventListener("click", (e) => {
    let box    = document.getElementById("notifBox");
    let bell   = e.target.closest(".notif-wrapper");
    if (box && !bell && !box.contains(e.target)) box.style.display = "none";
});
 
// =============================================
// SHOW SECTION — renders content into #content
// =============================================
function showSection(section) {
    let content = document.getElementById("content");
    if (!content) return;
 
    // ✅ Highlight active sidebar item
    document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active"));
    let activeLink = document.querySelector(`.sidebar a[onclick*="'${section}'"]`);
    if (activeLink) activeLink.classList.add("active");
 
    // ✅ Highlight active bottom nav item
    document.querySelectorAll(".bottom-nav .nav-item").forEach(el => el.classList.remove("active"));
    let activeNav = document.querySelector(`.bottom-nav .nav-item[onclick*="'${section}'"]`);
    if (activeNav) activeNav.classList.add("active");
 
    switch (section) {
        case "dashboard":
            renderDashboard(content);
            break;
        case "jobs":
            renderJobs(content);
            break;
        case "applications":
            renderApplications(content);
            break;
        case "profile":
            renderProfile(content);
            break;
        default:
            renderDashboard(content);
    }
}
 
// alias for bottom nav
function navigate(section) { showSection(section); }
 
// =============================================
// RENDER: DASHBOARD HOME
// =============================================
function renderDashboard(content) {
    let appliedCount  = allApplications.length;
    let pendingCount  = allApplications.filter(a => a.status === "Applied" || a.status === "Screening").length;
    let interviewCount = allApplications.filter(a => a.status === "Interview").length;
    let selectedCount  = allApplications.filter(a => a.status === "Selected").length;
 
    content.innerHTML = `
        <div style="padding: 0 4px;">
            <h2 id="welcomeUser" style="margin-bottom:20px; color:#e2e8f0;">
                Welcome ${escapeHtml(window._welcomeName || "User")} 👋
            </h2>
 
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:24px;">
                ${statCard("Applied", appliedCount, "#6366f1")}
                ${statCard("Pending", pendingCount, "#f59e0b")}
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
 
function renderJobCards(jobs) {
    if (!jobs || jobs.length === 0) {
        return `<p style="color:#94a3b8;">No jobs available right now.</p>`;
    }
    return jobs.map(job => {
        let skillsDisplay = Array.isArray(job.skills) ? job.skills.join(", ") : (job.skills || "");
        let statusBadge = job.status === "closed"
            ? `<span style="background:#ef444422; color:#ef4444; padding:2px 10px; border-radius:20px; font-size:11px;">Closed</span>`
            : `<span style="background:#22c55e22; color:#22c55e; padding:2px 10px; border-radius:20px; font-size:11px;">Open</span>`;
        return `
            <div class="job-card-premium">
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
                    ${statusBadge}
                </div>
                ${job.status !== "closed"
                    ? `<button class="apply-btn" style="margin-top:12px;" onclick="goApply('${job._id}')">Apply Now</button>`
                    : `<button class="apply-btn" style="margin-top:12px; opacity:0.4; cursor:not-allowed;" disabled>Closed</button>`
                }
            </div>`;
    }).join("");
}
 
// =============================================
// RENDER: MY APPLICATIONS
// =============================================
function renderApplications(content) {
    content.innerHTML = `
        <div style="padding: 0 4px;">
            <h2 style="color:#e2e8f0; margin-bottom:16px;">My Applications</h2>
            <div id="applicationsContainer">
                ${renderApplicationCards(allApplications)}
            </div>
        </div>
    `;
}
 
function renderApplicationCards(apps) {
    if (!apps || apps.length === 0) {
        return `<p style="color:#94a3b8;">No applications yet. <a onclick="showSection('jobs')" style="color:#6366f1; cursor:pointer;">Browse jobs →</a></p>`;
    }
    return apps.map(app => {
        // ✅ Server uses: Applied, Screening, Interview, Selected, Rejected
        let statusColor = app.status === "Selected"  ? "#22c55e"
                        : app.status === "Rejected"  ? "#ef4444"
                        : app.status === "Interview" ? "#f59e0b"
                        : app.status === "Screening" ? "#38bdf8"
                        : "#94a3b8";
 
        // find job title from loaded jobs list
        let job = allJobs.find(j => j._id === (app.jobId?._id || app.jobId));
        let jobTitle = job?.title || app.jobTitle || "Job Application";
 
        return `
            <div class="job-card-premium">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                    <div>
                        <h3 style="margin:0 0 6px;">${escapeHtml(jobTitle)}</h3>
                        ${job ? `<p style="margin:2px 0; font-size:13px; color:#94a3b8;"><i class="ri-building-line"></i> ${escapeHtml(job.companyName || "")}</p>` : ""}
                        <p style="margin:4px 0; font-size:13px; color:#94a3b8;">
                            Applied: ${new Date(app.appliedAt || app.createdAt).toLocaleDateString()}
                        </p>
                        ${app.matchScore > 0
                            ? `<p style="font-size:13px; color:#94a3b8;">
                               Match: <span style="color:${app.matchScore >= 70 ? '#22c55e' : app.matchScore >= 40 ? '#f59e0b' : '#ef4444'}; font-weight:600;">
                               ${parseFloat(app.matchScore).toFixed(1)}%</span></p>`
                            : ""}
                        ${app.status === "Interview"
                            ? `<p style="font-size:13px; color:#f59e0b; margin-top:4px;">
                                📅 Interview scheduled — check email for details</p>`
                            : ""}
                    </div>
                    <span style="background:${statusColor}22; color:${statusColor}; padding:4px 12px;
                                border-radius:20px; font-size:12px; font-weight:600;
                                border:1px solid ${statusColor}44;">
                        ${escapeHtml(app.status || "Applied")}
                    </span>
                </div>
            </div>`;
    }).join("");
}
 
// =============================================
// RENDER: PROFILE
// =============================================
async function renderProfile(content) {
    content.innerHTML = `<div style="padding:0 4px;"><p style="color:#94a3b8;">Loading profile...</p></div>`;
 
    try {
        let res  = await fetch(`${BASE_URL}/profile/${currentUserEmail}`);
        let user = await res.json();
 
        if (!user || user.error) throw new Error("Profile not found");
 
        let firstName = user.profile?.firstName || "";
        let lastName  = user.profile?.lastName  || "";
        let phone     = user.profile?.phone     || "";
        let location  = user.profile?.location  || "";
 
        content.innerHTML = `
            <div style="padding: 0 4px;">
                <h2 style="color:#e2e8f0; margin-bottom:20px;">My Profile</h2>
                <div class="job-card-premium" style="max-width:520px;">
                    <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px;">
                        <div style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,#6366f1,#8b5cf6);
                                    display:flex; align-items:center; justify-content:center; font-size:22px; color:white; font-weight:700; flex-shrink:0;">
                            ${escapeHtml(firstName.charAt(0).toUpperCase() || "U")}
                        </div>
                        <div>
                            <div style="font-size:18px; font-weight:600; color:#e2e8f0;">${escapeHtml(firstName + " " + lastName)}</div>
                            <div style="font-size:13px; color:#94a3b8;">${escapeHtml(user.email || currentUserEmail)}</div>
                            <div style="font-size:12px; color:#6366f1; margin-top:2px; text-transform:capitalize;">${escapeHtml(user.role || "Job Seeker")}</div>
                        </div>
                    </div>
 
                    <div style="display:grid; gap:12px;">
                        ${profileField("ri-phone-line", "Phone", phone)}
                        ${profileField("ri-map-pin-line", "Location", location)}
                        ${profileField("ri-user-line", "Gender", user.gender || "")}
                    </div>
 
                    <button class="apply-btn" style="margin-top:18px; width:100%;" onclick="showEditProfile()">
                        ✏️ Edit Profile
                    </button>
                </div>
            </div>`;
    } catch (err) {
        content.innerHTML = `<div style="padding:0 4px;">
            <h2 style="color:#e2e8f0;">My Profile</h2>
            <p style="color:#ef4444;">Failed to load profile. Please refresh.</p>
        </div>`;
    }
}
 
function profileField(icon, label, value) {
    return `
        <div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <i class="${icon}" style="color:#6366f1; font-size:16px; width:18px;"></i>
            <div>
                <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">${label}</div>
                <div style="font-size:14px; color:#e2e8f0; margin-top:2px;">${escapeHtml(value || "Not set")}</div>
            </div>
        </div>`;
}
 
function showEditProfile() {
    showToast("Profile editing coming soon!", "success");
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