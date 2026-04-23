// ============================================================
// employer.js — HireX Recruiter Dashboard (Fixed)
// ============================================================
 
let currentSection = "dashboard";
history.pushState({ page: "dashboard" }, "", "");
 
// 🔐 ACCESS CONTROL
let sessionUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
if (!sessionUser) {
    showToast("Access Denied!", "error");
    setTimeout(() => window.location.href = "login.html", 1500);
}
 
let email = (localStorage.getItem("userEmail") || sessionUser?.email || "").trim().toLowerCase();
 
// ==========================
// 🔥 START SYSTEM
// ==========================
showSection("dashboard", false);
history.pushState({ section: "dashboard" }, "", "");
 
let lastAppCount = Number(localStorage.getItem("lastAppCount")) || 0;
checkNewApplicants();
setInterval(checkNewApplicants, 8000); // FIX: 8s to reduce API hammering
 
// ==========================
// 🔔 CHECK NEW APPLICANTS
// ==========================
function checkNewApplicants() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(r => r.json()),
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(r => r.json())
    ])
    .then(([apps, jobs]) => {
        const myJobs = jobs.filter(j => (j.postedBy || "").toLowerCase() === email);
        const myJobIds = myJobs.map(j => String(j._id));
        const myApps = apps.filter(app =>
            myJobIds.includes(String(app.jobId)) &&
            app.status !== "Selected" && app.status !== "Rejected"
        );
 
        if (myApps.length > lastAppCount) {
            const newCount = myApps.length - lastAppCount;
            showToast(`${newCount} New Applicant(s)! 🎉`);
            updateNotificationUI(myApps.slice(-newCount));
            updateNotificationCount(newCount);
        }
 
        lastAppCount = myApps.length;
        localStorage.setItem("lastAppCount", lastAppCount);
    })
    .catch(err => console.log("Notification Error:", err));
}
 
// ==========================
// 🔴 NOTIFICATION COUNT
// ==========================
function updateNotificationCount(count) {
    const badge = document.getElementById("notifCount");
    if (!badge) return;
    const current = Number(badge.innerText) || 0;
    badge.innerText = current + count;
    badge.style.display = "inline-block";
}
 
// ==========================
// 🔔 TOGGLE NOTIFICATION PANEL
// ==========================
function toggleNotif() {
    const box = document.getElementById("notifBox");
    if (!box) return;
    box.classList.toggle("show");
}
 
document.addEventListener("click", (e) => {
    const box = document.getElementById("notifBox");
    const icon = e.target.closest(".notif-wrapper");
    if (!icon && box && box.classList.contains("show")) {
        box.classList.remove("show");
    }
});
 
function updateNotificationUI(newApps) {
    const content = document.getElementById("notifContent");
    if (!content) return;
    newApps.forEach(app => {
        const div = document.createElement("div");
        div.className = "notif-item";
        div.innerHTML = `<b>${app.name}</b> applied<br><small>${app.email}</small>`;
        content.prepend(div);
    });
    const emptyMsg = content.querySelector(".empty-msg");
    if (emptyMsg) emptyMsg.remove();
}
 
// ==========================
// 🔥 BACK BUTTON
// ==========================
window.addEventListener("popstate", function () {
    if (currentSection !== "dashboard") {
        showSection("dashboard", false);
        history.pushState({ page: "dashboard" }, "", "");
    } else {
        if (confirm("Are you sure you want to logout?")) {
            localStorage.clear();
            window.location.href = "index.html";
        } else {
            history.pushState({ page: "dashboard" }, "", "");
        }
    }
});
 
// ==========================
// 🔥 SECTION SWITCHING
// ==========================
function showSection(section, addToHistory = true) {
    if (addToHistory) history.pushState({ section }, "", "");
    currentSection = section;
 
    // Update bottom nav active state
    document.querySelectorAll(".bottom-nav .nav-item").forEach(item => item.classList.remove("active"));
    const map = { dashboard: 0, jobs: 1, post: 2, applicants: 3, profile: 4 };
    const items = document.querySelectorAll(".bottom-nav .nav-item");
    if (items[map[section]] !== undefined) items[map[section]].classList.add("active");
 
    const content = document.getElementById("content");
    if (!content) return;
 
    // 📊 DASHBOARD
    if (section === "dashboard") {
        const user = JSON.parse(localStorage.getItem("loggedInUser"));
        const name = user?.firstName || "Employer";
 
        content.innerHTML = `
            <div class="stats">
                <div class="stat-card" onclick="showSection('jobs')">
                    Open Positions<br><span id="jobCount">0</span>
                </div>
                <div class="stat-card" onclick="showSection('applicants')">
                    Incoming Applications<br><span id="appCount">0</span>
                </div>
            </div>
            <h2>Welcome ${name} 👋</h2>
            <div class="dashboard-grid">
                <div id="dashboardApplicants" class="dashboard-card"></div>
            </div>
        `;
        loadStats();
        loadDashboardApplicants();
    }
 
    // ➕ POST JOB
    if (section === "post") {
        content.innerHTML = `
        <div class="job-card-premium post-card">
            <h2>Post Job</h2>
            <div class="form-grid">
                <input id="title" placeholder="Job Title">
                <input id="company" placeholder="Company">
                <input id="location" placeholder="Location">
                <input id="salary" type="text" placeholder="Salary (numbers only)"
                    oninput="this.value=this.value.replace(/[^0-9]/g,'')">
                <select id="domain">
                    <option value="">Select Domain</option>
                    <option>Technology &amp; IT</option>
                    <option>Business &amp; Management</option>
                    <option>Finance</option>
                    <option>Sales &amp; Marketing</option>
                    <option>Engineering &amp; Core Technical</option>
                    <option>Healthcare</option>
                    <option>Other's</option>
                </select>
                <select id="jobType">
                    <option value="">Select Job Type</option>
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Internship</option>
                </select>
                <input id="experience" placeholder="Experience (e.g. 2)"
                    oninput="this.value=this.value.replace(/[^0-9]/g,'')">
                <input id="skills" placeholder="Skills (e.g. Java, React)">
            </div>
            <textarea id="description" placeholder="Job Description"></textarea>
            <button class="apply-btn post-btn" onclick="postJob()">Post Job</button>
            <p id="jobMessage"></p>
        </div>`;
    }
 
    // 💼 MY JOBS
    if (section === "jobs") {
        content.innerHTML = `<h2>My Jobs</h2><div id="jobList"></div>`;
        loadMyJobs();
    }
 
    // 📄 APPLICANTS
    if (section === "applicants") {
        content.innerHTML = `
            <h2>Applicants</h2>
            <input type="text" id="appSearch" placeholder="Search by job title..."
                class="search-bar" oninput="loadApplicants()">
            <div id="appList"></div>
        `;
        loadApplicants();
    }
 
    // 👤 PROFILE
    if (section === "profile") {
        content.innerHTML = `<h2>Profile</h2><div id="profileBox"></div>`;
        loadProfile();
    }
}
 
// ==========================
// 🔥 DASHBOARD APPLICANTS
// ==========================
function loadDashboardApplicants() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {
        const myJobs = jobs.filter(j => (j.postedBy || "").toLowerCase() === email);
        const myJobIds = myJobs.map(j => String(j._id));
 
        const pendingApps = apps
            .filter(app => myJobIds.includes(String(app.jobId)) && app.status !== "Selected" && app.status !== "Rejected")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
 
        const container = document.getElementById("dashboardApplicants");
        if (!container) return;
 
        let html = `<h3 style="margin-bottom:14px;">Incoming Applications</h3><div class="app-grid">`;
 
        if (pendingApps.length === 0) {
            html += `<p style="color:#94a3b8;">No new applicants</p>`;
        } else {
            pendingApps.slice(0, 4).forEach(app => {
                const job = jobs.find(j => String(j._id) === String(app.jobId));
                const jobSkills = (job?.skills || "").toLowerCase().split(",").map(s => s.trim());
                const userSkills = (app.skills || []).map(s => s.toLowerCase());
                const matched = jobSkills.filter(s => userSkills.includes(s));
                const missing = jobSkills.filter(s => !userSkills.includes(s));
                const matchPct = Number(app.match || 0);
 
                html += `
                <div class="app-card-mini" style="background:#0f172a;border:1px solid #1e293b;
                    border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:40px;height:40px;border-radius:50%;
                            background:linear-gradient(135deg,#6366f1,#8b5cf6);
                            display:flex;align-items:center;justify-content:center;
                            font-size:17px;font-weight:700;color:white;flex-shrink:0;">
                            ${(app.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 style="margin:0;font-size:14px;">${app.name || "Unknown"}</h4>
                            <p style="margin:0;font-size:11px;color:#94a3b8;">${app.email}</p>
                        </div>
                    </div>
                    <p style="margin:0;font-size:12px;"><b>Job:</b> ${job ? job.title : "N/A"}</p>
                    <div style="background:#1e293b;border-radius:8px;overflow:hidden;">
                        <div style="width:${matchPct}%;background:linear-gradient(90deg,#22c55e,#16a34a);
                            padding:4px 8px;border-radius:8px;text-align:center;
                            color:white;font-size:11px;font-weight:600;min-width:32px;">
                            ${matchPct.toFixed(0)}%
                        </div>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;">
                        ${matched.filter(Boolean).map(s => `<span style="background:#14532d;color:#86efac;padding:2px 7px;border-radius:20px;font-size:10px;">✔ ${s}</span>`).join("")}
                        ${missing.filter(Boolean).map(s => `<span style="background:#450a0a;color:#fca5a5;padding:2px 7px;border-radius:20px;font-size:10px;">✘ ${s}</span>`).join("")}
                    </div>
                    <button class="view-btn" style="margin-top:4px;" onclick="goToApplicant('${app.jobId}','${app._id}')">View</button>
                </div>`;
            });
        }
 
        html += `</div>`;
        container.innerHTML = html;
    })
    .catch(err => console.log("Dashboard applicants error:", err));
}
 
function goToApplicant(jobId, appId) {
    localStorage.setItem("highlightApplicantId", appId);
    showSection("applicants");
}
 
// ==========================
// 🔥 LOAD STATS
// ==========================
function loadStats() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {
        const myJobs = jobs.filter(j =>
            (j.postedBy || "").toLowerCase() === email && (j.status || "").toLowerCase() !== "closed"
        );
        const myJobIds = myJobs.map(j => String(j._id));
        const myApps = apps.filter(app => myJobIds.includes(String(app.jobId)));
        const pendingApps = myApps.filter(app => app.status !== "Selected" && app.status !== "Rejected");
 
        const jobCountEl = document.getElementById("jobCount");
        const appCountEl = document.getElementById("appCount");
        if (jobCountEl) jobCountEl.innerText = myJobs.length;
        if (appCountEl) appCountEl.innerText = pendingApps.length;
    })
    .catch(err => console.log("Stats error:", err));
}
 
// ==========================
// 🔥 LOAD MY JOBS
// ==========================
function loadMyJobs() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {
        const container = document.getElementById("jobList");
        if (!container) return;
        container.innerHTML = "";
 
        const myJobs = jobs.filter(j => (j.postedBy || "").toLowerCase() === email);
 
        if (myJobs.length === 0) {
            container.innerHTML = `<p style="color:#94a3b8;">No jobs posted yet. <a onclick="showSection('post')" style="color:#a78bfa;cursor:pointer;">Post one now!</a></p>`;
            return;
        }
 
        myJobs.forEach(job => {
            const jobApplications = apps.filter(app => String(app.jobId) === String(job._id));
            const isClosed = (job.status || "").toLowerCase() === "closed";
 
            const div = document.createElement("div");
            div.className = "job-card-premium";
            div.innerHTML = `
                <div class="job-header">
                    <h3>${job.title}</h3>
                    <span class="badge">${job.jobType || "N/A"}</span>
                </div>
                <p><b>Company:</b> ${job.company}</p>
                <p><b>Location:</b> ${job.location}</p>
                <p><b>Salary:</b> ₹${Number(job.salary || 0).toLocaleString("en-IN")}</p>
                <p><b>Domain:</b> ${job.domain || "N/A"}</p>
                <p><b>Skills:</b> ${job.skills || "N/A"}</p>
                <p><b>Applicants:</b> ${jobApplications.length}</p>
                <div class="job-footer">
                    ${isClosed
                        ? `<span class="status closed">Closed</span>`
                        : `<span class="status active">Active</span>`
                    }
                </div>
                ${isClosed
                    ? `<button disabled style="opacity:0.5;cursor:not-allowed;" class="closed-btn">Already Closed</button>`
                    : `<button class="closed-btn" onclick="closeJob('${job._id}')">Close Job</button>`
                }
            `;
            container.appendChild(div);
        });
    })
    .catch(err => console.log("Error loading jobs:", err));
}
 
// ==========================
// 🔥 LOAD APPLICANTS
// ==========================
function loadApplicants() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {
        const highlightId = localStorage.getItem("highlightApplicantId");
        const container = document.getElementById("appList");
        if (!container) return;
        container.innerHTML = "";
 
        const myJobs = jobs.filter(j => (j.postedBy || "").toLowerCase() === email);
        const myJobIds = myJobs.map(j => String(j._id));
 
        const searchInput = (document.getElementById("appSearch")?.value || "").toLowerCase().trim();
 
        let myApplicants = apps.filter(app => {
            if (!myJobIds.includes(String(app.jobId))) return false;
            if (!searchInput) return true;
            const job = jobs.find(j => String(j._id) === String(app.jobId));
            return job && (job.title || "").toLowerCase().includes(searchInput);
        });
 
        myApplicants.sort((a, b) => {
            const getPriority = (s) => s === "Applied" || s === "Screening" || s === "Interview" ? 1 : s === "Selected" ? 2 : 3;
            const diff = getPriority(a.status) - getPriority(b.status);
            if (diff !== 0) return diff;
            return Number(b.match || 0) - Number(a.match || 0);
        });
 
        if (myApplicants.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#94a3b8;">
                    <div style="font-size:40px;">📭</div>
                    <p>No applicants yet</p>
                </div>`;
            return;
        }
 
        const grid = document.createElement("div");
        grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-top:12px;";
        container.appendChild(grid);
 
        myApplicants.forEach(app => {
            const job = jobs.find(j => String(j._id) === String(app.jobId));
            const div = document.createElement("div");
            div.className = "app-card";
            div.style.cssText = `background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:18px;
                display:flex;flex-direction:column;gap:10px;transition:transform 0.2s,box-shadow 0.2s;`;
 
            div.onmouseenter = () => { div.style.transform = "translateY(-2px)"; div.style.boxShadow = "0 8px 24px rgba(99,102,241,0.15)"; };
            div.onmouseleave = () => { div.style.transform = ""; div.style.boxShadow = ""; };
 
            if (highlightId && String(app._id) === highlightId) {
                div.style.border = "1px solid #6366f1";
                div.classList.add("highlight-app");
            }
 
            const jobSkills = (job?.skills || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
            const userSkills = Array.isArray(app.skills) ? app.skills.map(s => s.toLowerCase()) : [];
            const matched = jobSkills.filter(s => userSkills.includes(s));
            const missing = jobSkills.filter(s => !userSkills.includes(s));
            const matchPct = Number(app.match || 0);
 
            const statusColors = {
                applied:   { bg: "#1e3a5f", color: "#60a5fa" },
                screening: { bg: "#1e3a2f", color: "#34d399" },
                interview: { bg: "#2d1b69", color: "#a78bfa" },
                selected:  { bg: "#14532d", color: "#86efac" },
                rejected:  { bg: "#450a0a", color: "#fca5a5" }
            };
            const sc = statusColors[(app.status || "").toLowerCase()] || { bg: "#1e293b", color: "#94a3b8" };
 
            let buttons = "";
            if (app.status === "Selected") {
                buttons = `<button disabled class="accepted-btn" style="opacity:0.8;">✔ Selected</button>`;
            } else if (app.status === "Rejected") {
                buttons = `<button disabled class="rejected-btn" style="opacity:0.8;">✘ Rejected</button>`;
            } else if (app.status === "Applied") {
                buttons = `
                    <button class="view-btn" onclick="goToInterview('${app._id}')">🗓 Interview</button>
                    <button class="reject-btn" onclick="updateStatus('${app._id}','Rejected')">✘ Reject</button>
                `;
            } else if (app.status === "Screening" || app.status === "Interview") {
                buttons = `
                    <button class="accept-btn" onclick="updateStatus('${app._id}','Selected')">✔ Select</button>
                    <button class="reject-btn" onclick="updateStatus('${app._id}','Rejected')">✘ Reject</button>
                `;
            }
 
            // FIX: correct resume URL handling
            let resumeURL = "";
            if (app.resume) {
                const p = app.resume.startsWith("uploads/") ? app.resume : `uploads/${app.resume}`;
                resumeURL = `https://hirex-backend-sio8.onrender.com/${p}`;
            }
 
            div.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                            display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:700;color:white;flex-shrink:0;">
                            ${(app.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style="margin:0;font-size:15px;color:#f1f5f9;">${app.name || "Unknown"}</h3>
                            <p style="margin:0;font-size:11px;color:#64748b;">${app.email}</p>
                        </div>
                    </div>
                    <span style="background:${sc.bg};color:${sc.color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap;">
                        ${app.status}
                    </span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;font-size:12px;color:#cbd5e1;">
                    <p style="margin:0;"><span style="color:#94a3b8;">Job</span><br><b>${job ? job.title : "N/A"}</b></p>
                    <p style="margin:0;"><span style="color:#94a3b8;">Experience</span><br><b>${app.experience || 0} yrs</b></p>
                    <p style="margin:0;"><span style="color:#94a3b8;">Degree</span><br><b>${app.degree || "N/A"}</b></p>
                    <p style="margin:0;"><span style="color:#94a3b8;">Match Score</span><br><b style="color:#facc15;">${matchPct.toFixed(1)}%</b></p>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px;">
                        <span>Skill Match</span><span>${matchPct.toFixed(0)}%</span>
                    </div>
                    <div style="background:#1e293b;border-radius:99px;height:8px;overflow:hidden;">
                        <div style="width:${matchPct}%;height:100%;border-radius:99px;transition:width 0.5s ease;
                            background:${matchPct >= 70 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : matchPct >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#b91c1c)'};">
                        </div>
                    </div>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:5px;">
                    ${matched.map(s => `<span style="background:#14532d;color:#86efac;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500;">✔ ${s}</span>`).join("")}
                    ${missing.map(s => `<span style="background:#450a0a;color:#fca5a5;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500;">✘ ${s}</span>`).join("")}
                </div>
                ${app.interviewDate ? `
                <div style="background:#0c1a2e;border:1px solid #1e3a5f;border-radius:8px;padding:8px 10px;">
                    <p style="margin:0;color:#38bdf8;font-size:12px;">
                        🗓 Interview: <b>${new Date(app.interviewDate).toLocaleString()}</b>
                    </p>
                </div>` : ""}
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;align-items:center;">
                    ${buttons}
                    ${resumeURL ? `
                    <a href="${resumeURL}" target="_blank"
                        style="display:inline-flex;align-items:center;gap:5px;background:#1e293b;color:#60a5fa;
                            border:1px solid #334155;padding:6px 12px;border-radius:8px;
                            font-size:12px;font-weight:500;text-decoration:none;transition:background 0.2s;">
                        📄 Resume
                    </a>` : ""}
                </div>
            `;
            grid.appendChild(div);
        });
 
        // Scroll to highlighted applicant
        setTimeout(() => {
            const el = document.querySelector(".highlight-app");
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                localStorage.removeItem("highlightApplicantId");
            }
        }, 200);
    })
    .catch(err => console.log("Applicants error:", err));
}
 
// ==========================
// 🔥 UPDATE STATUS
// ==========================
window.updateStatus = function (appId, status) {
    fetch("https://hirex-backend-sio8.onrender.com/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, status })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) { showToast(data.error, "error"); return; }
        showToast(`Status updated to ${status}`);
        loadApplicants();
    })
    .catch(() => showToast("Failed to update status", "error"));
};
 
// ==========================
// 🔥 CLOSE JOB
// ==========================
function closeJob(jobId) {
    if (!confirm("Close this job? Applicants will no longer be able to apply.")) return;
    fetch(`https://hirex-backend-sio8.onrender.com/close-job/${jobId}`, { method: "PUT" })
    .then(res => res.json())
    .then(data => {
        if (data.error) { showToast(data.error, "error"); return; }
        showToast("Job closed successfully!");
        loadMyJobs();
    })
    .catch(() => showToast("Failed to close job", "error"));
}
 
// ==========================
// 🔥 POST JOB
// ==========================
function postJob() {
    const title = document.getElementById("title").value.trim();
    const company = document.getElementById("company").value.trim();
    const location = document.getElementById("location").value.trim();
    const salary = document.getElementById("salary").value.trim();
    const domain = document.getElementById("domain").value;
    const jobType = document.getElementById("jobType").value;
    const experience = document.getElementById("experience").value.trim();
    const skills = document.getElementById("skills").value.trim();
    const description = document.getElementById("description").value.trim();
    const message = document.getElementById("jobMessage");
 
    if (!title || !company || !location || !salary || !jobType || !domain || !experience || !skills || !description) {
        message.style.color = "red";
        message.innerText = "Please fill all fields!";
        return;
    }
 
    if (!email) {
        message.style.color = "red";
        message.innerText = "Session expired. Please login again.";
        setTimeout(() => window.location.href = "login.html", 1500);
        return;
    }
 
    const normalizedSkills = skills.split(",").map(s => s.trim().toLowerCase()).join(",");
 
    fetch("https://hirex-backend-sio8.onrender.com/post-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, company, location, salary, domain, jobType, experience, skills: normalizedSkills, description, email, status: "active" })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) { message.style.color = "red"; message.innerText = data.error; return; }
        message.style.color = "green";
        message.innerText = data.message || "Job posted successfully!";
        ["title","company","location","salary","experience","skills","description"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        document.getElementById("domain").value = "";
        document.getElementById("jobType").value = "";
        setTimeout(() => showSection("jobs"), 1000);
    })
    .catch(() => { message.style.color = "red"; message.innerText = "Error posting job. Try again."; });
}
 
// ==========================
// 🔥 PROFILE
// ==========================
function loadProfile() {
    const profileEmail = localStorage.getItem("userEmail");
    if (!profileEmail) { document.getElementById("profileBox").innerHTML = "No user logged in"; return; }
 
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
                    <input id="contact" type="text" value="${user.contact || ""}" minlength="10" maxlength="10"
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
    .catch(() => { document.getElementById("profileBox").innerHTML = "Error loading profile"; });
}
 
function toggleEdit() {
    document.querySelectorAll(".profile-form input:not(#role)").forEach(input => input.disabled = false);
    convertToSelect("type", [
        { value: "Fresher", text: "Fresher" },
        { value: "School Student", text: "School Student" },
        { value: "Professional", text: "Professional" },
        { value: "College Student", text: "College Student" }
    ]);
    convertToSelect("gender", [
        { value: "Male", text: "Male" },
        { value: "Female", text: "Female" },
        { value: "Other", text: "Other" }
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
    if (!/^[0-9]{10}$/.test(contact)) { showToast("Enter valid 10-digit phone number ❌", "error"); return; }
 
    const data = {
        email: user.email,
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        contact,
        city: document.getElementById("city").value.trim(),
        gender: document.getElementById("gender").value,
        type: document.getElementById("type").value
    };
 
    fetch("https://hirex-backend-sio8.onrender.com/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
        if (result.error) { showToast("Update failed: " + result.error, "error"); return; }
        localStorage.setItem("loggedInUser", JSON.stringify({ ...user, ...data }));
        showToast("Profile updated successfully! ✅");
        showSection("profile");
    })
    .catch(() => showToast("Failed to update profile. Try again.", "error"));
}
 
// ==========================
// 🔓 LOGOUT
// ==========================
function logout() {
    localStorage.clear();
    window.location.replace("index.html");
}
 
function goToInterview(appId) {
    localStorage.setItem("selectedAppId", appId);
    window.location.href = "interview.html";
}
 
function navigateEmp(section, el) {
    showSection(section);
    document.querySelectorAll(".bottom-nav .nav-item").forEach(item => item.classList.remove("active"));
    el.classList.add("active");
}
 
// ==========================
// 🔥 TOAST
// ==========================
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    toast.className = "show";
    if (type === "error") toast.classList.add("error");
    setTimeout(() => toast.className = "", 3000);
}
 