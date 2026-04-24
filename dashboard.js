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

        let firstName    = user.profile?.firstName || "";
        let lastName     = user.profile?.lastName  || "";
        let phone        = user.profile?.phone     || "";
        let location     = user.profile?.location  || "";
        let gender       = user.gender   || "";
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
            ? `<img src="${profileImage}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                           display:flex;align-items:center;justify-content:center;font-size:26px;color:white;font-weight:700;flex-shrink:0;">
                   ${escapeHtml((firstName.charAt(0) || "U").toUpperCase())}
               </div>`;

        content.innerHTML = `
            <div style="padding:0 4px; max-width:600px;">
                <h2 style="color:#e2e8f0; margin-bottom:20px;">My Profile</h2>

                <div class="job-card-premium" style="margin-bottom:16px;">
                    <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; flex-wrap:wrap;">
                        ${avatarHtml}
                        <div style="flex:1; min-width:160px;">
                            <div style="font-size:20px; font-weight:700; color:#e2e8f0;">${escapeHtml(firstName + " " + lastName)}</div>
                            <div style="font-size:13px; color:#94a3b8; margin-top:2px;">${escapeHtml(user.email || currentUserEmail)}</div>
                            <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
                                <span style="background:#6366f122; color:#818cf8; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; text-transform:capitalize; border:1px solid #6366f144;">
                                    ${role === "recruiter" ? "🏢 Recruiter" : "👤 Job Seeker"}
                                </span>
                                ${gender ? `<span style="background:#0ea5e922; color:#38bdf8; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; border:1px solid #0ea5e944;">${escapeHtml(gender)}</span>` : ""}
                                ${joinDate ? `<span style="background:#10b98122; color:#34d399; padding:3px 10px; border-radius:20px; font-size:11px; border:1px solid #10b98144;">Joined ${joinDate}</span>` : ""}
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; gap:0;">
                        ${profileField("ri-phone-line", "Phone", phone)}
                        ${profileField("ri-map-pin-line", "Location", location)}
                        ${profileField("ri-mail-line", "Email", user.email || currentUserEmail)}
                        ${profileField("ri-user-line", "Gender", gender)}
                    </div>

                    <button class="apply-btn" style="margin-top:18px; width:100%;" onclick="showEditProfile()">
                        ✏️ Edit Profile
                    </button>
                </div>

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

                <div class="job-card-premium" style="margin-bottom:16px;">
                    <h3 style="color:#e2e8f0; margin:0 0 14px; font-size:15px;">📄 Resume</h3>
                    ${resumeFileUrl
                        ? `<a href="${BASE_URL}/${resumeFileUrl}" target="_blank"
                              style="display:inline-flex;align-items:center;gap:8px;color:#6366f1;font-size:13px;text-decoration:underline;margin-bottom:12px;">
                               <i class="ri-file-pdf-line"></i> View Uploaded Resume
                           </a><br>`
                        : `<p style="color:#94a3b8; font-size:13px; margin:0 0 10px;">No resume on file. Upload one when you apply for a job.</p>`}
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

                ${allApplications.length > 0 ? `
                <div class="job-card-premium">
                    <h3 style="color:#e2e8f0; margin:0 0 14px; font-size:15px;">📋 Recent Applications</h3>
                    ${allApplications.slice(0,3).map(app => {
                        let job = allJobs.find(j => j._id === (app.jobId?._id || app.jobId));
                        let sc = app.status==="Selected"?"#22c55e":app.status==="Rejected"?"#ef4444":app.status==="Interview"?"#f59e0b":app.status==="Screening"?"#38bdf8":"#94a3b8";
                        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);flex-wrap:wrap;gap:6px;">
                            <div>
                                <div style="font-size:14px;color:#e2e8f0;font-weight:500;">${escapeHtml(job?.title||"Job Application")}</div>
                                <div style="font-size:12px;color:#94a3b8;">${escapeHtml(job?.companyName||"")} · ${new Date(app.appliedAt||app.createdAt).toLocaleDateString()}</div>
                            </div>
                            <span style="background:${sc}22;color:${sc};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${sc}44;">${escapeHtml(app.status||"Applied")}</span>
                        </div>`;
                    }).join("")}
                    ${allApplications.length > 3 ? `<p style="font-size:13px;color:#6366f1;cursor:pointer;margin-top:10px;margin-bottom:0;" onclick="showSection('applications')">View all ${allApplications.length} applications →</p>` : ""}
                </div>` : ""}
            </div>

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