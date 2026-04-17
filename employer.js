let currentSection = "dashboard";
// Force history entry (so back button works)
history.pushState({ page: "dashboard" }, "", "");

function loadDashboardApplicants() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {

        let email = (localStorage.getItem("userEmail") || "").toLowerCase();

        let myJobs = jobs.filter(j =>
            (j.postedBy || "").toLowerCase() === email
        );

        let myJobIds = myJobs.map(j => String(j._id));

        let pendingApps = apps.filter(app =>
            myJobIds.includes(String(app.jobId)) &&
            app.status !== "Selected" &&
            app.status !== "Rejected"
        );

        pendingApps.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        let html = `<h3 style="margin-bottom:14px;">Incoming Applications</h3><div class="app-grid">`;

        if (pendingApps.length === 0) {
            html += `<p style="color:#94a3b8;">No new applicants</p>`;
        } else {
            pendingApps.slice(0, 4).forEach(app => {

                let job = jobs.find(j => String(j._id) === String(app.jobId));

                let jobSkills = (job?.skills || "").toLowerCase().split(",");
                let userSkills = (app.skills || []).map(s => s.toLowerCase());

                let matched = jobSkills.filter(skill => userSkills.includes(skill.trim()));
                let missing = jobSkills.filter(skill => !userSkills.includes(skill.trim()));

                let matchPct = Number(app.match || 0);

                html += `
                <div class="app-card-mini" style="
                    background:#0f172a;
                    border:1px solid #1e293b;
                    border-radius:14px;
                    padding:16px;
                    display:flex;
                    flex-direction:column;
                    gap:8px;">

                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="
                            width:40px; height:40px; border-radius:50%;
                            background:linear-gradient(135deg,#6366f1,#8b5cf6);
                            display:flex; align-items:center; justify-content:center;
                            font-size:17px; font-weight:700; color:white; flex-shrink:0;">
                            ${app.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 style="margin:0; font-size:14px;">${app.name}</h4>
                            <p style="margin:0; font-size:11px; color:#94a3b8;">${app.email}</p>
                        </div>
                    </div>

                    <p style="margin:0; font-size:12px;"><b>Job:</b> ${job ? job.title : "N/A"}</p>

                    <div style="background:#1e293b; border-radius:8px; overflow:hidden;">
                        <div style="
                            width:${matchPct}%;
                            background:linear-gradient(90deg,#22c55e,#16a34a);
                            padding:4px 8px; border-radius:8px;
                            text-align:center; color:white;
                            font-size:11px; font-weight:600; min-width:32px;">
                            ${matchPct.toFixed(0)}%
                        </div>
                    </div>

                    <div style="display:flex; flex-wrap:wrap; gap:4px;">
                        ${matched.map(s => `<span style="background:#14532d;color:#86efac;padding:2px 7px;border-radius:20px;font-size:10px;">✔ ${s}</span>`).join("")}
                        ${missing.map(s => `<span style="background:#450a0a;color:#fca5a5;padding:2px 7px;border-radius:20px;font-size:10px;">✘ ${s}</span>`).join("")}
                    </div>

                    <button class="view-btn" style="margin-top:4px;"
                        onclick="goToApplicant('${app.jobId}', '${app._id}')">
                        View
                    </button>
                </div>
                `;
            });
        }

        html += `</div>`;
        document.getElementById("dashboardApplicants").innerHTML = html;
    });
}

function goToApplicant(jobId, appId) {
    localStorage.setItem("highlightApplicantId", appId);
    showSection("applicants");
}

window.addEventListener("popstate", function () {
    if (currentSection !== "dashboard") {
        showSection("dashboard", false);
        history.pushState({ page: "dashboard" }, "", "");
    } else {
        let confirmLogout = confirm("Are you sure you want to logout?");
        if (confirmLogout) {
            localStorage.clear();
            window.location.href = "index.html";
        } else {
            history.pushState({ page: "dashboard" }, "", "");
        }
    }
});

// 🔥 Load last count from storage
let lastAppCount = Number(localStorage.getItem("lastAppCount")) || 0;

// ==========================
// 🔍 CHECK NEW APPLICANTS
// ==========================
function checkNewApplicants() {
    fetch("https://hirex-backend-sio8.onrender.com/applications")
    .then(res => res.json())
    .then(apps => {
        let myEmail = (localStorage.getItem("userEmail") || "").toLowerCase();

        fetch("https://hirex-backend-sio8.onrender.com/jobs")
        .then(res => res.json())
        .then(jobs => {

            let myJobs = jobs.filter(j =>
                (j.postedBy || "").toLowerCase() === myEmail
            );

            let myJobIds = myJobs.map(j => String(j._id));

            let myApps = apps.filter(app =>
                myJobIds.includes(String(app.jobId)) &&
                app.status !== "Selected" &&
                app.status !== "Rejected"
            );

            if (myApps.length > lastAppCount) {
                let newCount = myApps.length - lastAppCount;
                showToast(`${newCount} New Applicant(s)! 🎉`);
                updateNotificationUI(myApps.slice(-newCount));
                updateNotificationCount(newCount);
            }

            lastAppCount = myApps.length;
            localStorage.setItem("lastAppCount", lastAppCount);
        });
    })
    .catch(err => console.log("Notification Error:", err));
}

// ==========================
// 🔴 NOTIFICATION COUNT BADGE
// ==========================
function updateNotificationCount(count) {
    let badge = document.getElementById("notifCount");
    if (!badge) return;
    let current = Number(badge.innerText) || 0;
    badge.innerText = current + count;
    badge.style.display = "inline-block";
}

// ==========================
// 🔔 TOGGLE NOTIFICATION PANEL
// ==========================
function toggleNotif() {
    let box = document.getElementById("notifBox");
    let content = document.getElementById("notifContent");
    if (!box || !content) return;
    if (content.innerHTML.trim() === "") {
        content.innerHTML = "<p class='empty-msg'>No notifications yet</p>";
    }
    box.classList.toggle("show");
}

// ==========================
// 🔥 START SYSTEM
// ==========================
checkNewApplicants();
setInterval(checkNewApplicants, 5000);

function updateNotificationUI(newApps) {
    let box = document.getElementById("notifBox");
    newApps.forEach(app => {
        let div = document.createElement("div");
        div.className = "notif-item";
        div.innerHTML = `
            <b>${app.name}</b> applied<br>
            <small>${app.email}</small>
        `;
        box.prepend(div);
    });
}

function addNotification(msg) {
    let content = document.getElementById("notifContent");
    if (content.innerText === "No notifications yet") {
        content.innerHTML = "";
    }
    let p = document.createElement("p");
    p.innerText = msg;
    content.appendChild(p);
}

function showToast(message, type = "success") {
    let toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = "show";
    if (type === "error") {
        toast.classList.add("error");
    }
    setTimeout(() => {
        toast.className = "";
    }, 3000);
}

// 🔐 ACCESS CONTROL
let sessionUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
let role = (sessionUser?.role || "").toLowerCase();
console.log("ROLE DEBUG:", role, sessionUser);

if (!sessionUser) {
    showToast("Access Denied!", "error");
    setTimeout(() => window.location.href = "login.html", 1500);
}

let email = (localStorage.getItem("userEmail") || sessionUser?.email || "").trim().toLowerCase();

// 🔥 DEFAULT LOAD
showSection("dashboard", false);
history.pushState({ section: "dashboard" }, "", "");

// ==========================
// 🔥 SECTION SWITCHING
// ==========================
function showSection(section, addToHistory = true) {
    if (addToHistory) {
        history.pushState({ section }, "", "");
    }
    currentSection = section;

    document.querySelectorAll(".bottom-nav .nav-item")
        .forEach(item => item.classList.remove("active"));

    let map = { dashboard: 0, post: 2, jobs: 1, applicants: 3, profile: 4 };
    let items = document.querySelectorAll(".bottom-nav .nav-item");
    if (items[map[section]] !== undefined) {
        items[map[section]].classList.add("active");
    }

    let content = document.getElementById("content");

    // 📊 DASHBOARD
    if (section === "dashboard") {
        let user = JSON.parse(localStorage.getItem("loggedInUser"));
        let name = user?.firstName || "Employer";

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
                <input id="salary" type="text" placeholder="Salary (e.g. 50000)"
                    oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                <select id="domain">
                    <option value="">Domain</option>
                    <option>Technology & IT</option>
                    <option>Business & Management</option>
                    <option>Finance</option>
                    <option>Sales & Marketing</option>
                    <option>Engineering & Core Technical</option>
                    <option>Healthcare</option>
                    <option>Other's</option>
                </select>
                <select id="jobType">
                    <option value="">Select Job Type</option>
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Internship</option>
                </select>
                <input id="experience" placeholder="Experience (e.g. 2)">
                <input id="skills" placeholder="Skills (e.g. Java, React)">
            </div>
            <textarea id="description" placeholder="Job Description"></textarea>
            <button class="apply-btn post-btn" onclick="postJob()">Post Job</button>
            <p id="jobMessage"></p>
        </div>
        `;
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
        content.innerHTML = `
            <h2>Profile</h2>
            <div id="profileBox"></div>
        `;
        loadProfile();
    }
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

        // ✅ FIX: Only count active/open jobs (not closed)
        let myJobs = jobs.filter(j =>
            (j.postedBy || "").trim().toLowerCase() === email &&
            j.status !== "closed"
        );

        document.getElementById("jobCount").innerText = myJobs.length;

        let myJobIds = myJobs.map(j => j._id);

        let myApps = apps.filter(app =>
            myJobIds.map(id => String(id)).includes(String(app.jobId))
        );

        let pendingApps = myApps.filter(app =>
            app.status !== "Selected" && app.status !== "Rejected"
        );

        document.getElementById("appCount").innerText = pendingApps.length;
    })
    .catch(err => console.log(err));
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

        let container = document.getElementById("jobList");
        container.innerHTML = "";

        let userEmail = (email || "").trim().toLowerCase();

        let myJobs = jobs.filter(job =>
            (job.postedBy || "").trim().toLowerCase() === userEmail
        );

        if (myJobs.length === 0) {
            container.innerHTML = "<p>No jobs posted yet</p>";
            return;
        }

        myJobs.forEach(job => {

            let jobApplications = apps.filter(app =>
                String(app.jobId) === String(job._id)
            );

            let statusHTML = "";
            if (job.status === "filled") {
                statusHTML = `<span class="status filled">Filled</span>`;
            } else {
                statusHTML = `<span class="status active">Active</span>`;
            }

            let div = document.createElement("div");
            div.className = "job-card-premium";

            // ✅ FIX: Added proper quotes to class attribute
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
                    ${statusHTML}
                </div>

                ${job.status !== "closed"
                    ? `<button class="closed-btn" onclick="closeJob('${job._id}')">Close Job</button>`
                    : `<button disabled style="opacity:0.5;cursor:not-allowed;" span class="status closed">Closed</button>`
                }
            `;

            container.appendChild(div);
        });
    })
    .catch(err => console.log("Error loading jobs:", err));
}

// ==========================
// 🔥 LOAD APPLICANTS (IMPROVED UI)
// ==========================
function loadApplicants() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {

        let highlightId = localStorage.getItem("highlightApplicantId");
        let container = document.getElementById("appList");
        container.innerHTML = "";

        let emailLocal = (localStorage.getItem("userEmail") || "").trim().toLowerCase();

        let myJobs = jobs.filter(job =>
            (job.postedBy || "").trim().toLowerCase() === emailLocal
        );

        let myJobIds = myJobs.map(job => job._id);

        let searchInput = (document.getElementById("appSearch")?.value || "").toLowerCase().trim();

        if (searchInput) {
            container.innerHTML = `<p style="color:#94a3b8; margin-bottom:10px;">Showing results for: "<b>${searchInput}</b>"</p>`;
        }

        let myApplicants = apps.filter(app => {
            let job = jobs.find(j => String(j._id) === String(app.jobId));
            if (!myJobIds.map(id => String(id)).includes(String(app.jobId))) return false;
            if (!searchInput) return true;
            return job && job.title.toLowerCase().includes(searchInput);
        });

        myApplicants.sort((a, b) => {
            const getPriority = (status) => {
                if (status === "Applied" || status === "Screening" || status === "Interview") return 1;
                if (status === "Selected") return 2;
                if (status === "Rejected") return 3;
                return 4;
            };
            let pa = getPriority(a.status);
            let pb = getPriority(b.status);
            if (pa !== pb) return pa - pb;
            return Number(b.match || 0) - Number(a.match || 0);
        });

        if (myApplicants.length === 0) {
            container.innerHTML += `
                <div style="text-align:center; padding:40px; color:#94a3b8;">
                    <div style="font-size:40px;">📭</div>
                    <p>No applicants yet</p>
                </div>`;
            return;
        }

        // ✅ Wrap in responsive grid
        let grid = document.createElement("div");
        grid.style.cssText = "display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:16px; margin-top:12px;";
        container.appendChild(grid);

        myApplicants.forEach(app => {

            let job = jobs.find(j => String(j._id) === String(app.jobId));

            let div = document.createElement("div");
            div.className = "app-card";
            div.style.cssText = `
                background:#0f172a;
                border:1px solid #1e293b;
                border-radius:16px;
                padding:18px;
                display:flex;
                flex-direction:column;
                gap:10px;
                transition: transform 0.2s, box-shadow 0.2s;
            `;
            div.onmouseenter = () => {
                div.style.transform = "translateY(-2px)";
                div.style.boxShadow = "0 8px 24px rgba(99,102,241,0.15)";
            };
            div.onmouseleave = () => {
                div.style.transform = "translateY(0)";
                div.style.boxShadow = "none";
            };

            if (highlightId && app._id === highlightId) {
                div.classList.add("highlight-app");
                div.style.border = "1px solid #6366f1";
            }

            let jobSkills = (job?.skills || "").toLowerCase().split(",");
            let userSkills = Array.isArray(app.skills)
                ? app.skills.map(s => s.toLowerCase())
                : (app.skills || "").toLowerCase().split(",");

            let matched = jobSkills.filter(skill => userSkills.includes(skill.trim()));
            let missing = jobSkills.filter(skill => !userSkills.includes(skill.trim()));

            let matchPct = Number(app.match || 0);

            // Status color map
            let statusColors = {
                applied:   { bg: "#1e3a5f", color: "#60a5fa" },
                screening: { bg: "#1e3a2f", color: "#34d399" },
                interview: { bg: "#2d1b69", color: "#a78bfa" },
                selected:  { bg: "#14532d", color: "#86efac" },
                rejected:  { bg: "#450a0a", color: "#fca5a5" }
            };
            let sc = statusColors[(app.status || "").toLowerCase()] || { bg: "#1e293b", color: "#94a3b8" };

            // Action buttons
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

            // ✅ FIX: Correct resume URL (handles both "uploads/file" and "file" cases)
            let resumeURL = "";
            if (app.resume) {
                let path = app.resume.startsWith("uploads/") || app.resume.startsWith("resumes/")
                    ? app.resume
                    : `uploads/${app.resume}`;
                resumeURL = `https://hirex-backend-sio8.onrender.com/${path}`;
            }

            div.innerHTML = `
                <!-- Header: Avatar + Name + Status -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="
                            width:44px; height:44px; border-radius:50%;
                            background:linear-gradient(135deg,#6366f1,#8b5cf6);
                            display:flex; align-items:center; justify-content:center;
                            font-size:19px; font-weight:700; color:white; flex-shrink:0;">
                            ${app.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style="margin:0; font-size:15px; color:#f1f5f9;">${app.name}</h3>
                            <p style="margin:0; font-size:11px; color:#64748b;">${app.email}</p>
                        </div>
                    </div>
                    <span style="
                        background:${sc.bg}; color:${sc.color};
                        padding:3px 10px; border-radius:20px;
                        font-size:11px; font-weight:600; white-space:nowrap;">
                        ${app.status}
                    </span>
                </div>

                <!-- Info Grid -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; font-size:12px; color:#cbd5e1;">
                    <p style="margin:0;"><span style="color:#94a3b8;">Job</span><br><b>${job ? job.title : "N/A"}</b></p>
                    <p style="margin:0;"><span style="color:#94a3b8;">Experience</span><br><b>${app.experience || 0} yrs</b></p>
                    <p style="margin:0;"><span style="color:#94a3b8;">Degree</span><br><b>${app.degree || "N/A"}</b></p>
                    <p style="margin:0;"><span style="color:#94a3b8;">Match Score</span><br><b style="color:#facc15;">${matchPct.toFixed(1)}%</b></p>
                </div>

                <!-- Match Bar -->
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:11px; color:#64748b; margin-bottom:4px;">
                        <span>Skill Match</span><span>${matchPct.toFixed(0)}%</span>
                    </div>
                    <div style="background:#1e293b; border-radius:99px; height:8px; overflow:hidden;">
                        <div style="
                            width:${matchPct}%;
                            height:100%;
                            background:${matchPct >= 70 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : matchPct >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#b91c1c)'};
                            border-radius:99px;
                            transition: width 0.5s ease;">
                        </div>
                    </div>
                </div>

                <!-- Skill Pills -->
                <div style="display:flex; flex-wrap:wrap; gap:5px;">
                    ${matched.map(s => `<span style="background:#14532d;color:#86efac;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500;">✔ ${s.trim()}</span>`).join("")}
                    ${missing.map(s => `<span style="background:#450a0a;color:#fca5a5;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:500;">✘ ${s.trim()}</span>`).join("")}
                </div>

                <!-- Interview Date -->
                ${app.interviewDate ? `
                <div style="background:#0c1a2e; border:1px solid #1e3a5f; border-radius:8px; padding:8px 10px;">
                    <p style="margin:0; color:#38bdf8; font-size:12px;">
                        🗓 Interview scheduled: <b>${new Date(app.interviewDate).toLocaleString()}</b>
                    </p>
                </div>` : ""}

                <!-- Action Buttons -->
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; align-items:center;">
                    ${buttons}
                    ${app.resume ? `
                    <a href="${resumeURL}" target="_blank" 
                        style="
                            display:inline-flex; align-items:center; gap:5px;
                            background:#1e293b; color:#60a5fa;
                            border:1px solid #334155;
                            padding:6px 12px; border-radius:8px;
                            font-size:12px; font-weight:500;
                            text-decoration:none;
                            transition: background 0.2s;">
                        📄 Resume
                    </a>` : ""}
                </div>
            `;

            grid.appendChild(div);
        });

        // Scroll to highlighted applicant
        setTimeout(() => {
            let el = document.querySelector(".highlight-app");
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                localStorage.removeItem("highlightApplicantId");
            }
        }, 200);

    })
    .catch(err => console.log(err));
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
        console.log(data);
        loadApplicants();
    });
}

// ==========================
// 🔥 CLOSE JOB
// ==========================
function closeJob(jobId) {
    console.log("Clicked Close:", jobId);
    if (!confirm("Close this job? Applicants will no longer be able to apply.")) return;

    fetch(`https://hirex-backend-sio8.onrender.com/close-job/${jobId}`, {
        method: "PUT"
    })
    .then(res => res.json())
    .then(data => {
        console.log("DATA:", data);
        showToast("Job closed successfully!");
        loadMyJobs();
    })
    .catch(err => {
        console.log("ERROR:", err);
        showToast("Failed to close job", "error");
    });
}

// ==========================
// 🔥 POST JOB
// ==========================
function postJob() {
    let title = document.getElementById("title").value.trim();
    let company = document.getElementById("company").value.trim();
    let location = document.getElementById("location").value.trim();
    let salary = document.getElementById("salary").value.trim();
    let domain = document.getElementById("domain").value;
    let jobType = document.getElementById("jobType").value;
    let experience = document.getElementById("experience").value.trim();
    let skills = document.getElementById("skills").value.trim();
    let description = document.getElementById("description").value.trim();
    let message = document.getElementById("jobMessage");

    if (!title || !company || !location || !salary || !jobType || !experience || !skills || !description) {
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

    if (!/^[0-9]+$/.test(salary)) {
        message.style.color = "red";
        message.innerText = "Salary must be numbers only ❌";
        return;
    }

    if (!/^[0-9]+$/.test(experience)) {
        message.style.color = "red";
        message.innerText = "Experience must be a number ❌";
        return;
    }

    skills = skills.split(",").map(s => s.trim().toLowerCase()).join(",");

    fetch("https://hirex-backend-sio8.onrender.com/post-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, company, location, salary, domain, jobType, experience, skills, description, email, status: "active" })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            message.style.color = "red";
            message.innerText = data.error;
            return;
        }
        message.style.color = "green";
        message.innerText = data.message || "Job posted successfully!";

        ["title","company","location","salary","domain","jobType","experience","skills","description"]
            .forEach(id => document.getElementById(id).value = "");

        setTimeout(() => showSection("jobs"), 800);
    })
    .catch(() => {
        message.style.color = "red";
        message.innerText = "Error posting job. Try again.";
    });
}

// ==========================
// 🔥 PROFILE
// ==========================
function loadProfile() {
    let emailLocal = localStorage.getItem("userEmail");

    if (!emailLocal) {
        document.getElementById("profileBox").innerHTML = "No user logged in";
        return;
    }

    fetch(`https://hirex-backend-sio8.onrender.com/profile/${emailLocal}`)
    .then(res => res.json())
    .then(user => {
        let container = document.getElementById("profileBox");
        if (!container) return;
        if (user.error) { container.innerHTML = "User not found"; return; }

        let imgSrc = user.profileImage
            ? `https://hirex-backend-sio8.onrender.com/images/${user.profileImage}`
            : "images/profile.png";

        container.innerHTML = `
        <div class="profile-wrapper">
            <div class="profile-header">
                <div class="profile-info">
                    <img src="${imgSrc}" class="profile-img">
                    <div>
                        <h2>${user.firstName || ""} ${user.lastName || ""}</h2>
                        <p>${user.email || "N/A"}</p>
                    </div>
                </div>
                <button class="edit-btn" onclick="toggleEdit()">Edit</button>
            </div>

            <div class="profile-form">
                <div class="form-group">
                    <label>First Name</label>
                    <input id="firstName" value="${user.firstName || ""}" disabled>
                </div>
                <div class="form-group">
                    <label>Last Name</label>
                    <input id="lastName" value="${user.lastName || ""}" disabled>
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input id="contact" type="text" value="${user.contact || ""}"
                        minlength="10" maxlength="10"
                        oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0,10)"
                        disabled>
                </div>
                <div class="form-group">
                    <label>City</label>
                    <input id="city" value="${user.city || ""}" disabled>
                </div>
                <div class="form-group">
                    <label>Gender</label>
                    <input id="gender" value="${user.gender || ""}" disabled>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <input id="type" value="${user.type || ""}" disabled>
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input id="role" value="${user.role}" disabled class="locked-field">
                </div>
            </div>

            <button id="saveBtn" class="save-btn" onclick="saveProfile()" style="display:none;">
                Save Changes
            </button>
        </div>
        `;
    })
    .catch(err => {
        document.getElementById("profileBox").innerHTML = "Error loading profile";
    });
}

function toggleEdit() {
    document.querySelectorAll(".profile-form input:not(#role)")
        .forEach(input => input.disabled = false);

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

    document.getElementById("saveBtn").style.display = "block";
}

function convertToSelect(id, options) {
    let input = document.getElementById(id);
    if (!input) return;
    let currentValue = input.value;
    let select = document.createElement("select");
    select.id = id;
    select.className = "premium-select";
    options.forEach(opt => {
        let option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
    select.value = currentValue;
    input.parentNode.replaceChild(select, input);
}

function saveProfile() {
    let user = JSON.parse(localStorage.getItem("loggedInUser"));

    if (!user || !user._id) {
        showToast("Session expired. Please login again.", "error");
        setTimeout(() => window.location.href = "index.html", 1500);
        return;
    }

    let contact = document.getElementById("contact").value.trim();
    if (!/^[0-9]{10}$/.test(contact)) {
        showToast("Enter valid 10-digit phone number ❌", "error");
        return;
    }

    let data = {
        email: user.email,
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        contact: contact,
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
        if (result.error) {
            showToast("Update failed: " + result.error, "error");
            return;
        }
        let updated = { ...user, ...data };
        localStorage.setItem("loggedInUser", JSON.stringify(updated));
        showToast("Profile updated successfully! ✅");
        showSection("profile");
    })
    .catch(err => showToast("Failed to update profile. Try again.", "error"));
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
    document.querySelectorAll(".bottom-nav .nav-item")
        .forEach(item => item.classList.remove("active"));
    el.classList.add("active");
}

// Welcome text
let _user = JSON.parse(localStorage.getItem("loggedInUser"));
if (!_user) {
    window.location.href = "login.html";
} else {
    let welcomeEl = document.getElementById("welcomeText");
    if (welcomeEl) {
        welcomeEl.innerText = `Welcome ${_user.firstName || "Employer"} 👋`;
    }
}
