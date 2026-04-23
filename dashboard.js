// ============================================================
// dashboard.js — HireX Applicant Dashboard (Fixed)
// ============================================================

let currentSection = "dashboard";
let sessionUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");

// ✅ FIX: If no session, go back to login
if (!sessionUser) {
    window.location.replace("login.html");
}

let email = (localStorage.getItem("userEmail") || sessionUser?.email || "").trim().toLowerCase();

// ✅ FIX: If email is missing, save it from user object
if (!email && sessionUser?.email) {
    email = sessionUser.email.trim().toLowerCase();
    localStorage.setItem("userEmail", email);
}

// ✅ FIX: Google users with incomplete profile → send to complete-profile.html
// Only runs for Google accounts (no password stored locally)
(function checkProfileComplete() {
    if (!sessionUser) return;
    const isGoogleAccount  = !sessionUser.password || sessionUser.password === "";
    const isProfileMissing = !sessionUser.city || !sessionUser.gender;
    if (isGoogleAccount && isProfileMissing) {
        window.location.replace("complete-profile.html");
    }
})();

// Clean up after apply redirect
let justApplied = localStorage.getItem("justApplied");
if (justApplied === "true") {
    localStorage.removeItem("justApplied");
    localStorage.removeItem("selectedJobId");
}

// DEFAULT LOAD
window.onload = () => {
    showSection("dashboard", false);
    history.pushState({ section: "dashboard" }, "", "");
    loadNotifications();
};

// ==========================
// SECTION ROUTER
// ==========================
function showSection(section, addToHistory = true) {
    if (addToHistory) {
        history.pushState({ section }, "", `#${section}`);
    }
    currentSection = section;

    const content = document.getElementById("content");

    if (section === "dashboard") {
        const user = JSON.parse(localStorage.getItem("loggedInUser"));
        const name = user?.firstName || "User";

        content.innerHTML = `
            <div class="stats">
                <div class="stat-card" onclick="showSection('applications')">
                    Applied<br><span id="appliedCount">0</span>
                </div>
                <div class="stat-card interview-card" onclick="showSection('applications')">
                    Interview<br><span id="interviewCount">0</span>
                </div>
                <div class="stat-card" onclick="showSection('applications')">
                    Selected<br><span id="selectedCount">0</span>
                </div>
                <div class="stat-card" onclick="showSection('applications')">
                    Rejected<br><span id="rejectedCount">0</span>
                </div>
            </div>
            <h2>Welcome ${name} 👋</h2>
            <h3 style="margin-top:20px;">Latest Jobs</h3>
            <div id="latestJobs" class="jobs-container"></div>
        `;
        loadStats();
        loadLatestJobs();
    }

    if (section === "jobs") {
        content.innerHTML = `
        <div class="jobs-page">
            <div class="filters">
                <h3>Filters</h3>
                <label>Domain</label>
                <select id="filterDomain">
                    <option value="">All</option>
                    <option>Technology &amp; IT</option>
                    <option>Business &amp; Management</option>
                    <option>Finance</option>
                    <option>Sales &amp; Marketing</option>
                    <option>Engineering &amp; Core Technical</option>
                    <option>Healthcare</option>
                    <option>Other's</option>
                </select>
                <label>Job Type</label>
                <select id="filterType">
                    <option value="">All</option>
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Internship">Internship</option>
                </select>
                <label>Min Salary</label>
                <input type="number" id="filterSalary" placeholder="e.g. 20000">
                <label>Company</label>
                <input type="text" id="filterCompany" placeholder="Search company">
                <label>Sort By</label>
                <select id="sortBy">
                    <option value="latest">Latest</option>
                    <option value="salaryHigh">Salary High → Low</option>
                    <option value="salaryLow">Salary Low → High</option>
                </select>
                <button onclick="applyFilters()" class="filter-btn">Apply</button>
            </div>
            <div class="jobs-content">
                <h2>Available Jobs</h2>
                <div id="jobList"></div>
            </div>
        </div>`;
        loadJobs();
    }

    if (section === "applications") {
        content.innerHTML = `
        <div class="apps-page-header">
            <h2>My Applications</h2>
            <div class="apps-filter-tabs">
                <button class="filter-tab active" onclick="filterApps('all', this)">All</button>
                <button class="filter-tab" onclick="filterApps('Applied', this)">Applied</button>
                <button class="filter-tab" onclick="filterApps('Interview', this)">Interview</button>
                <button class="filter-tab" onclick="filterApps('Selected', this)">Selected</button>
                <button class="filter-tab" onclick="filterApps('Rejected', this)">Rejected</button>
            </div>
        </div>
        <div id="appList"></div>`;
        loadApplications();
    }

    if (section === "profile") {
        content.innerHTML = `<h2>Profile</h2><div id="profileBox"></div>`;
        loadProfile();
    }
}

// Bottom nav navigation
function navigate(section) {
    showSection(section);
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    event.currentTarget.classList.add("active");
}

// Swipe navigation
let startX = 0, endX = 0;
document.addEventListener("touchstart", (e) => { startX = e.changedTouches[0].screenX; });
document.addEventListener("touchend", (e) => { endX = e.changedTouches[0].screenX; handleSwipe(); });

function handleSwipe() {
    const diff = startX - endX;
    if (Math.abs(diff) < 50) return;

    const sections = ["dashboard", "jobs", "applications", "profile"];
    const activeSpan = document.querySelector(".nav-item.active span");
    if (!activeSpan) return;

    const currentIndex = sections.findIndex(s => activeSpan.innerText.toLowerCase().includes(s === "applications" ? "app" : s));
    if (diff > 0 && currentIndex < sections.length - 1) navigate(sections[currentIndex + 1]);
    else if (diff < 0 && currentIndex > 0) navigate(sections[currentIndex - 1]);
}

// Back button
window.onpopstate = function () {
    if (currentSection !== "dashboard") {
        showSection("dashboard", false);
        history.pushState({ section: "dashboard" }, "", "");
    } else {
        if (confirm("Are you sure you want to logout?")) {
            localStorage.clear();
            window.location.href = "index.html";
        } else {
            history.pushState({ section: "dashboard" }, "", "");
        }
    }
};

// ==========================
// LATEST JOBS (Dashboard)
// ==========================
async function loadLatestJobs() {
    try {
        const res  = await fetch("https://hirex-backend-sio8.onrender.com/jobs");
        const jobs = await res.json();
        const container = document.getElementById("latestJobs");
        if (!container) return;
        container.innerHTML = "";

        const latestJobs = jobs
            .filter(j => (j.status || "").toLowerCase() !== "closed")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 4);

        latestJobs.forEach(job => {
            const div = document.createElement("div");
            div.className = "job-card-premium";
            div.innerHTML = `
                <div class="job-header">
                    <h3>${job.title}</h3>
                    <span class="badge">${job.jobType || "N/A"}</span>
                </div>
                <p><b>Company:</b> ${job.company}</p>
                <p><b>Location:</b> ${job.location}</p>
                <div class="job-footer">
                    <button class="view-btn" onclick="openJobFromDashboard('${job._id}')">View</button>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.log("Error loading jobs:", err);
    }
}

// ==========================
// STATS
// ==========================
function loadStats() {
    fetch("https://hirex-backend-sio8.onrender.com/applications")
    .then(res => res.json())
    .then(data => {
        let applied = 0, interview = 0, selected = 0, rejected = 0;
        data.filter(app => app.email === email).forEach(app => {
            if (app.status === "Applied")   applied++;
            if (app.status === "Interview") interview++;
            if (app.status === "Selected")  selected++;
            if (app.status === "Rejected")  rejected++;
        });
        const elA = document.getElementById("appliedCount");
        const elI = document.getElementById("interviewCount");
        const elS = document.getElementById("selectedCount");
        const elR = document.getElementById("rejectedCount");
        if (elA) elA.innerText = applied;
        if (elI) elI.innerText = interview;
        if (elS) elS.innerText = selected;
        if (elR) elR.innerText = rejected;
    })
    .catch(err => console.log("Stats error:", err));
}

// ==========================
// JOBS
// ==========================
function extractSalary(value) {
    if (!value) return 0;
    return Number(value.toString().replace(/[^\d]/g, ""));
}

function loadJobs() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {
        const container = document.getElementById("jobList");
        if (!container) return;
        container.innerHTML = "";

        let filteredJobs = jobs;

        if (window.activeFilters) {
            const f = window.activeFilters;
            filteredJobs = jobs.filter(job => {
                if (f.domain && (job.domain || "").toLowerCase().trim() !== f.domain.toLowerCase().trim()) return false;
                if (f.type && job.jobType !== f.type) return false;
                if (f.salary && extractSalary(job.salary) < Number(f.salary)) return false;
                if (f.company && !(job.company || "").toLowerCase().includes(f.company.toLowerCase())) return false;
                return true;
            });

            if (f.sort === "latest") filteredJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            else if (f.sort === "salaryHigh") filteredJobs.sort((a, b) => extractSalary(b.salary) - extractSalary(a.salary));
            else if (f.sort === "salaryLow")  filteredJobs.sort((a, b) => extractSalary(a.salary) - extractSalary(b.salary));
        }

        if (filteredJobs.length === 0) {
            container.innerHTML = `<p style="color:#94a3b8; padding:20px 0;">No jobs found matching your filters.</p>`;
            return;
        }

        filteredJobs.forEach(job => {
            const userApps     = apps.filter(app => String(app.jobId) === String(job._id) && app.email === email);
            const alreadyApplied = userApps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

            const currentStatus = (job.status || "").toLowerCase().trim();
            let applyBtn = "";

            if (currentStatus === "closed") {
                applyBtn = `<button disabled class="closed-btn">Closed</button>`;
            } else if (alreadyApplied && alreadyApplied.status && alreadyApplied.status.toLowerCase() !== "rejected") {
                applyBtn = `<button disabled class="applied-btn">Applied ✔</button>`;
            } else if (alreadyApplied && alreadyApplied.status && alreadyApplied.status.toLowerCase() === "rejected") {
                applyBtn = `<button class="apply-btn small-apply" onclick="goToApply('${job._id}')">Apply Again</button>`;
            } else {
                applyBtn = `<button class="apply-btn small-apply" onclick="goToApply('${job._id}')">Apply Now</button>`;
            }

            const div = document.createElement("div");
            div.className = "job-card-premium";
            div.innerHTML = `
                <div class="job-header">
                    <h3>${job.title}</h3>
                    <span class="badge">${job.jobType || "N/A"}</span>
                </div>
                <p><b>Company:</b> ${job.company}</p>
                <p><b>Location:</b> ${job.location}</p>
                <p><b>Salary:</b> ${job.salary ? "₹" + Number(job.salary).toLocaleString("en-IN") : "Not disclosed"}</p>
                <div class="job-footer">
                    <button class="view-btn" onclick="viewJob('${job._id}')">View</button>
                    <div class="job-actions">${applyBtn}</div>
                </div>
            `;
            container.appendChild(div);
        });
    })
    .catch(err => console.log("Error loading jobs:", err));
}

function viewJob(jobId) {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {
        const job = jobs.find(j => String(j._id) === String(jobId));
        if (!job) return;
        const container = document.getElementById("jobList");
        if (!container) return;

        const alreadyApplied = apps.find(app => String(app.jobId) === String(jobId) && app.email === email);
        const currentStatus  = (job.status || "").toLowerCase();

        let applyBtn = "";
        if (currentStatus === "closed") {
            applyBtn = `<button disabled class="closed-btn">Closed</button>`;
        } else if (alreadyApplied && alreadyApplied.status && alreadyApplied.status.toLowerCase() !== "rejected") {
            applyBtn = `<button disabled class="applied-btn">Already Applied ✔</button>`;
        } else if (alreadyApplied && alreadyApplied.status && alreadyApplied.status.toLowerCase() === "rejected") {
            applyBtn = `<button class="apply-btn small-apply" onclick="goToApply('${job._id}')">Apply Again</button>`;
        } else {
            applyBtn = `<button class="apply-btn small-apply" onclick="goToApply('${job._id}')">Apply Now</button>`;
        }

        container.innerHTML = `
        <div style="max-width:700px;margin:30px auto;background:linear-gradient(145deg,#1e293b,#0f172a);
            padding:25px;border-radius:14px;border:1px solid #1e293b;
            box-shadow:0 10px 30px rgba(0,0,0,0.6);color:#e2e8f0;">
            <h2>${job.title}</h2>
            <p><b>Company:</b> ${job.company}</p>
            <p><b>Location:</b> ${job.location}</p>
            <p><b>Salary:</b> ${job.salary ? "₹" + Number(job.salary).toLocaleString("en-IN") : "Not disclosed"}</p>
            <p><b>Job Type:</b> ${job.jobType || "N/A"}</p>
            <p><b>Experience:</b> ${job.experience || "0"} years</p>
            <p><b>Skills:</b> ${job.skills || "N/A"}</p>
            <p><b>Domain:</b> ${job.domain || "N/A"}</p>
            <h3 style="margin-top:16px;">Description</h3>
            <p style="color:#94a3b8;line-height:1.7;">${job.description || "No description provided."}</p>
            <br>
            ${applyBtn}
            <br><br>
            <button class="back-btn-premium" onclick="loadJobs()">← Back</button>
        </div>`;
    })
    .catch(err => console.log("Error:", err));
}

function goToApply(jobId) {
    localStorage.setItem("selectedJobId", jobId);
    window.location.href = "apply.html";
}

function applyFilters() {
    window.activeFilters = {
        domain:  document.getElementById("filterDomain").value,
        type:    document.getElementById("filterType").value,
        salary:  document.getElementById("filterSalary").value,
        company: document.getElementById("filterCompany").value,
        sort:    document.getElementById("sortBy").value
    };
    loadJobs();
}

// ==========================
// APPLICATIONS — History View
// ==========================
let allMyApps   = [];
let allJobsData = [];

function filterApps(status, btn) {
    document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderApplications(status === "all" ? allMyApps : allMyApps.filter(a => a.status === status));
}

function loadApplications() {
    const container = document.getElementById("appList");
    if (!container) return;
    container.innerHTML = `<div class="loading-apps"><div class="spinner"></div><p>Loading your applications…</p></div>`;

    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {
        allJobsData = jobs;
        allMyApps   = apps.filter(app => app.email === email);

        // Priority: active statuses first
        const priority = { "Interview": 1, "Applied": 2, "Screening": 3, "Selected": 4, "Rejected": 5 };
        allMyApps.sort((a, b) => (priority[a.status] || 9) - (priority[b.status] || 9));

        renderApplications(allMyApps);
    })
    .catch(err => {
        console.log("Error loading applications:", err);
        const c = document.getElementById("appList");
        if (c) c.innerHTML = `<p style="color:#f87171;padding:20px;">Failed to load applications. Please try again.</p>`;
    });
}

function renderApplications(appList) {
    const container = document.getElementById("appList");
    if (!container) return;
    container.innerHTML = "";

    if (appList.length === 0) {
        container.innerHTML = `
        <div class="empty-apps">
            <div class="empty-icon">📂</div>
            <h3>No applications here yet</h3>
            <p>Start exploring jobs and apply to begin your journey!</p>
            <button class="apply-btn" onclick="showSection('jobs')" style="margin-top:16px;">Browse Jobs</button>
        </div>`;
        return;
    }

    const highlightId = localStorage.getItem("highlightJobId");

    appList.forEach(app => {
        const job     = allJobsData.find(j => String(j._id) === String(app.jobId));
        const status  = app.status || "Applied";
        const isActive = status === "Interview" || status === "Applied" || status === "Screening";
        const isHighlight = highlightId && String(app.jobId) === highlightId;

        const statusMeta = {
            "Applied":   { icon: "📤", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "Applied" },
            "Screening": { icon: "🔍", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Screening" },
            "Interview": { icon: "📅", color: "#a855f7", bg: "rgba(168,85,247,0.15)", label: "Interview" },
            "Selected":  { icon: "🎉", color: "#22c55e", bg: "rgba(34,197,94,0.12)",  label: "Selected"  },
            "Rejected":  { icon: "❌", color: "#ef4444", bg: "rgba(239,68,68,0.10)",  label: "Rejected"  }
        };
        const meta = statusMeta[status] || statusMeta["Applied"];

        // Build the timeline steps
        const steps = ["Applied", "Screening", "Interview", "Selected"];
        const currentStepIndex = steps.indexOf(status);
        const isRejected = status === "Rejected";

        let timelineHTML = "";
        if (!isRejected) {
            timelineHTML = `<div class="app-timeline">` +
                steps.map((step, i) => {
                    const done    = i < currentStepIndex;
                    const current = i === currentStepIndex;
                    const cls     = done ? "step done" : current ? "step current" : "step pending";
                    return `<div class="${cls}">
                        <div class="step-dot"></div>
                        <span>${step}</span>
                    </div>` + (i < steps.length - 1 ? `<div class="step-line ${done ? 'done' : ''}"></div>` : "");
                }).join("") +
            `</div>`;
        } else {
            timelineHTML = `<div class="app-timeline rejected-line">
                <div class="step done"><div class="step-dot"></div><span>Applied</span></div>
                <div class="step-line done"></div>
                <div class="step rejected"><div class="step-dot"></div><span>Rejected</span></div>
            </div>`;
        }

        const resumeURL = app.resumeUrl
            ? `https://hirex-backend-sio8.onrender.com/${app.resumeUrl.startsWith("uploads/") ? app.resumeUrl : "uploads/" + app.resumeUrl}`
            : "";

        const appliedDate = app.appliedAt || app.createdAt
            ? new Date(app.appliedAt || app.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })
            : "Unknown";

        const matchScore = app.matchScore != null ? Math.round(app.matchScore) : null;

        const div = document.createElement("div");
        div.className = "app-history-card" + (isActive ? " active-app" : "") + (isHighlight ? " highlight-job" : "");
        div.setAttribute("data-id", String(app.jobId));
        div.setAttribute("data-status", status);

        div.innerHTML = `
        <div class="ahc-glow" style="background:${meta.color};"></div>

        <div class="ahc-top">
            <div class="ahc-title-block">
                <h3 class="ahc-job-title">${job ? (job.title || "Unknown Position") : "Job no longer available"}</h3>
                <p class="ahc-company">${job ? (job.companyName || job.company || "N/A") : "N/A"} &nbsp;•&nbsp; ${job ? (job.location || "N/A") : "N/A"}</p>
            </div>
            <div class="ahc-badge" style="background:${meta.bg}; color:${meta.color}; border:1px solid ${meta.color}40;">
                ${meta.icon}&nbsp;${meta.label}
            </div>
        </div>

        <div class="ahc-meta">
            <span class="ahc-meta-item">📆 Applied on ${appliedDate}</span>
            ${matchScore !== null ? `<span class="ahc-meta-item">🎯 Match: <b style="color:${matchScore >= 60 ? '#22c55e' : matchScore >= 30 ? '#f59e0b' : '#ef4444'}">${matchScore}%</b></span>` : ""}
            ${job && job.salary ? `<span class="ahc-meta-item">💰 ₹${Number(job.salary).toLocaleString("en-IN")}</span>` : ""}
        </div>

        ${isActive ? `<div class="active-pulse-bar" style="background:linear-gradient(90deg,${meta.color}55,${meta.color},${meta.color}55);"></div>` : ""}

        ${status === "Interview" && app.interviewDate ? `
        <div class="interview-banner">
            <span>📅</span>
            <div>
                <b>Interview Scheduled</b>
                <p>${new Date(app.interviewDate).toLocaleString("en-IN", {weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
            </div>
        </div>` : ""}

        ${status === "Selected" ? `
        <div class="selected-banner">
            🎉 Congratulations! You've been selected for this position.
        </div>` : ""}

        ${timelineHTML}

        <div class="ahc-footer">
            ${resumeURL ? `<a href="${resumeURL}" target="_blank" class="ahc-resume-btn">📄 Resume</a>` : ""}
            <button class="ahc-details-btn" onclick="toggleAppDetails(this, '${app._id}')">Details ▾</button>
        </div>

        <div class="ahc-details" id="details-${app._id}" style="display:none;">
            <div class="ahc-detail-grid">
                <div><label>Degree</label><span>${app.degree || "N/A"}</span></div>
                <div><label>City</label><span>${app.city || "N/A"}</span></div>
                <div><label>Phone</label><span>${app.phone || "N/A"}</span></div>
                <div><label>Job Type</label><span>${job ? (job.employmentType || job.jobType || "N/A") : "N/A"}</span></div>
            </div>
            ${app.matchedSkills && app.matchedSkills.length > 0 ? `
            <div class="skill-chips-row">
                <label>✅ Matched Skills</label>
                <div class="skill-chips">${(Array.isArray(app.matchedSkills) ? app.matchedSkills : []).map(s => `<span class="chip matched">${s}</span>`).join("")}</div>
            </div>` : ""}
            ${app.missingSkills && app.missingSkills.length > 0 ? `
            <div class="skill-chips-row" style="margin-top:8px;">
                <label>⚠️ Skills to Improve</label>
                <div class="skill-chips">${(Array.isArray(app.missingSkills) ? app.missingSkills : []).map(s => `<span class="chip missing">${s}</span>`).join("")}</div>
            </div>` : ""}
        </div>
        `;

        container.appendChild(div);
    });

    // Scroll to highlighted card
    setTimeout(() => {
        if (!highlightId) return;
        document.querySelectorAll(".app-history-card").forEach(card => {
            if (card.getAttribute("data-id") === highlightId) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                localStorage.removeItem("highlightJobId");
            }
        });
    }, 120);
}

function toggleAppDetails(btn, appId) {
    const panel = document.getElementById("details-" + appId);
    if (!panel) return;
    const open = panel.style.display !== "none";
    panel.style.display = open ? "none" : "block";
    btn.textContent = open ? "Details ▾" : "Details ▴";
}

// ==========================
// PROFILE
// ==========================
function loadProfile() {
    // ✅ FIX: Use email from both sources
    const profileEmail = localStorage.getItem("userEmail") || sessionUser?.email;
    if (!profileEmail) {
        const box = document.getElementById("profileBox");
        if (box) box.innerHTML = "No user logged in";
        return;
    }

    fetch(`https://hirex-backend-sio8.onrender.com/profile/${profileEmail}`)
    .then(res => res.json())
    .then(user => {
        const container = document.getElementById("profileBox");
        if (!container) return;
        if (user.error) { container.innerHTML = "User not found"; return; }

        const imgSrc = user.profileImage
            ? `https://hirex-backend-sio8.onrender.com/images/${user.profileImage}`
            : "images/profile.png";

        container.innerHTML = `
        <div class="profile-wrapper">
            <div class="profile-header">
                <div class="profile-info">
                    <img src="${imgSrc}" class="profile-img" onerror="this.src='images/profile.png'">
                    <div>
                        <h2>${user.firstName || ""} ${user.lastName || ""}</h2>
                        <p>${user.email || "N/A"}</p>
                    </div>
                </div>
                <button class="edit-btn" onclick="toggleEdit()">Edit</button>
            </div>
            <div class="profile-form">
                <div class="form-group"><label>First Name</label><input id="firstName" value="${user.firstName || ""}" disabled></div>
                <div class="form-group"><label>Last Name</label><input id="lastName" value="${user.lastName || ""}" disabled></div>
                <div class="form-group">
                    <label>Phone</label>
                    <input id="contact" type="text" value="${user.contact || ""}"
                        minlength="10" maxlength="10"
                        oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,10)" disabled>
                </div>
                <div class="form-group"><label>City</label><input id="city" value="${user.city || ""}" disabled></div>
                <div class="form-group"><label>Gender</label><input id="gender" value="${user.gender || ""}" disabled></div>
                <div class="form-group"><label>Type</label><input id="type" value="${user.type || ""}" disabled></div>
                <div class="form-group"><label>Role</label><input id="role" value="${user.role || ""}" disabled class="locked-field"></div>
            </div>
            <button id="saveBtn" class="save-btn" onclick="saveProfile()" style="display:none;">Save Changes</button>
        </div>`;
    })
    .catch(() => {
        const box = document.getElementById("profileBox");
        if (box) box.innerHTML = "Error loading profile";
    });
}

function toggleEdit() {
    document.querySelectorAll(".profile-form input:not(#role)").forEach(input => input.disabled = false);
    convertToSelect("type", [
        { value: "Fresher",         text: "Fresher" },
        { value: "School Student",  text: "School Student" },
        { value: "Professional",    text: "Professional" },
        { value: "College Student", text: "College Student" }
    ]);
    convertToSelect("gender", [
        { value: "Male",   text: "Male" },
        { value: "Female", text: "Female" },
        { value: "Other",  text: "Other" }
    ]);
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) saveBtn.style.display = "block";
}

function convertToSelect(id, options) {
    const input = document.getElementById(id);
    if (!input || input.tagName === "SELECT") return;
    const currentValue = input.value;
    const select = document.createElement("select");
    select.id = id;
    select.className = "premium-select";
    options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    select.value = currentValue;
    input.parentNode.replaceChild(select, input);
}

function saveProfile() {
    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    if (!user || !user.email) {
        showToast("Session expired. Please login again.", "error");
        setTimeout(() => window.location.href = "index.html", 1500);
        return;
    }

    const contact = document.getElementById("contact").value.trim();
    if (!/^[0-9]{10}$/.test(contact)) {
        showToast("Enter valid 10-digit phone number ❌", "error");
        return;
    }

    const data = {
        email:     user.email,
        firstName: document.getElementById("firstName").value.trim(),
        lastName:  document.getElementById("lastName").value.trim(),
        contact,
        city:      document.getElementById("city").value.trim(),
        gender:    document.getElementById("gender").value,
        type:      document.getElementById("type").value
    };

    fetch("https://hirex-backend-sio8.onrender.com/update-profile", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
        if (result.error) { showToast("Update failed: " + result.error, "error"); return; }
        const updated = { ...user, ...data };
        localStorage.setItem("loggedInUser", JSON.stringify(updated));
        showToast("Profile updated successfully! ✅");
        showSection("profile");
    })
    .catch(() => showToast("Failed to update profile. Try again.", "error"));
}

// ==========================
// NOTIFICATIONS
// ==========================
function loadNotifications() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {
        const notifDot  = document.getElementById("notifDot");
        const notifList = document.getElementById("notifList");
        if (!notifDot || !notifList) return;

        const myUpdates = apps
            .filter(app => app.email === email && (app.status === "Selected" || app.status === "Interview"))
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        notifDot.style.display = myUpdates.length > 0 ? "block" : "none";
        notifList.innerHTML = "";

        if (myUpdates.length === 0) {
            notifList.innerHTML = `<p style="color:#94a3b8;font-size:13px;">No notifications</p>`;
            return;
        }

        myUpdates.forEach(app => {
            const job = jobs.find(j => String(j._id) === String(app.jobId));
            const div = document.createElement("div");
            div.className = "notif-item";

            if (app.status === "Interview") {
                div.innerHTML = `🗓️ Interview scheduled for <b>${job ? job.title : "a job"}</b><br>
                    <small>${app.interviewDate ? new Date(app.interviewDate).toLocaleString() : "Time TBD"}</small>`;
            } else {
                div.innerHTML = `🎉 You are selected for <b>${job ? job.title : "a job"}</b>`;
            }

            div.onclick = () => {
                localStorage.setItem("highlightJobId", String(app.jobId));
                document.getElementById("notifBox").style.display = "none";
                showSection("applications");
            };
            notifList.appendChild(div);
        });
    })
    .catch(err => console.log("Notification error:", err));
}

function toggleNotif() {
    const box = document.getElementById("notifBox");
    const dot = document.getElementById("notifDot");
    if (!box) return;
    box.style.display = box.style.display === "block" ? "none" : "block";
    if (dot) dot.style.display = "none";
}

// Close notif box when clicking outside
document.addEventListener("click", (e) => {
    const box  = document.getElementById("notifBox");
    const icon = e.target.closest(".notif-wrapper");
    if (!icon && box && box.style.display === "block") {
        box.style.display = "none";
    }
});

// ==========================
// OPEN JOB FROM DASHBOARD
// ==========================
function openJobFromDashboard(jobId) {
    showSection("jobs");
    const observer = new MutationObserver(() => {
        const container = document.getElementById("jobList");
        if (container && container.children.length > 0) {
            observer.disconnect();
            viewJob(jobId);
        }
    });
    observer.observe(document.getElementById("content"), { childList: true, subtree: true });
}

// ==========================
// TOAST
// ==========================
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    toast.className = "show";
    if (type === "error") toast.classList.add("error");
    setTimeout(() => toast.className = "", 3000);
}

// ==========================
// LOGOUT
// ==========================
function logout() {
    localStorage.clear();
    window.location.replace("index.html");
}
