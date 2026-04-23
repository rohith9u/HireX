// =============================================
// ✅ DASHBOARD.JS — Fixed version
// - Shows real user name in "Welcome" greeting
// - Proper session guard
// - Loads jobs and applications from backend
// =============================================

const BASE_URL = "https://hirex-backend-sio8.onrender.com";

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

    let userEmail = localStorage.getItem("userEmail") || sessionUser.email || "";

    // ✅ Fetch real profile from backend and update UI
    await loadUserProfile(userEmail, sessionUser);

    // ✅ Load jobs list
    await loadJobs();

    // ✅ Load user's applications
    await loadApplications(userEmail);
});

// =============================================
// LOAD USER PROFILE → update greeting + topbar
// =============================================
async function loadUserProfile(userEmail, sessionUser) {
    let firstName = sessionUser.firstName || "";

    try {
        let res = await fetch(`${BASE_URL}/profile/${userEmail}`);
        let user = await res.json();

        if (user && !user.error) {
            firstName = user.firstName || firstName;

            // ✅ Update topbar name
            let topbarNameEl = document.getElementById("topbarName");
            if (topbarNameEl) topbarNameEl.textContent = firstName || "User";

            // ✅ Update welcome greeting
            let welcomeEl = document.getElementById("welcomeUser");
            if (welcomeEl) {
                welcomeEl.textContent = `Welcome ${firstName} 👋`;
            }

            // ✅ Cache updated name in localStorage
            sessionUser.firstName = firstName;
            localStorage.setItem("loggedInUser", JSON.stringify(sessionUser));

        } else {
            setWelcomeFallback(firstName);
        }
    } catch (err) {
        console.error("Profile fetch failed:", err);
        setWelcomeFallback(firstName);
    }
}

function setWelcomeFallback(firstName) {
    let welcomeEl = document.getElementById("welcomeUser");
    if (welcomeEl) welcomeEl.textContent = `Welcome ${firstName || "User"} 👋`;

    let topbarNameEl = document.getElementById("topbarName");
    if (topbarNameEl) topbarNameEl.textContent = firstName || "User";
}

// =============================================
// LOAD JOBS
// =============================================
async function loadJobs() {
    let jobsContainer = document.getElementById("jobsContainer");
    if (!jobsContainer) return;

    jobsContainer.innerHTML = `<p style="color:#94a3b8;">Loading jobs...</p>`;

    try {
        let res = await fetch(`${BASE_URL}/jobs`);
        let jobs = await res.json();

        if (!jobs || jobs.length === 0) {
            jobsContainer.innerHTML = `<p style="color:#94a3b8;">No jobs available right now.</p>`;
            return;
        }

        jobsContainer.innerHTML = "";

        jobs.forEach(job => {
            let card = document.createElement("div");
            card.className = "job-card-premium";
            card.innerHTML = `
                <h3>${escapeHtml(job.title || "Untitled")}</h3>
                <p><i class="ri-building-line"></i> ${escapeHtml(job.company || "")}</p>
                <p><i class="ri-map-pin-line"></i> ${escapeHtml(job.location || "")}</p>
                <p><i class="ri-money-dollar-circle-line"></i> ${escapeHtml(job.salary || "")}</p>
                <p style="font-size:13px; color:#94a3b8; margin-top:6px;">
                    Skills: ${escapeHtml(job.skills || "")}
                </p>
                <button class="apply-btn" onclick="goApply('${job._id}')">Apply Now</button>
            `;
            jobsContainer.appendChild(card);
        });

    } catch (err) {
        console.error("Jobs fetch failed:", err);
        jobsContainer.innerHTML = `<p style="color:#ef4444;">Failed to load jobs. Please refresh.</p>`;
    }
}

// =============================================
// LOAD APPLICATIONS
// =============================================
async function loadApplications(userEmail) {
    let appsContainer = document.getElementById("applicationsContainer");
    if (!appsContainer) return;

    appsContainer.innerHTML = `<p style="color:#94a3b8;">Loading applications...</p>`;

    try {
        let res = await fetch(`${BASE_URL}/my-applications/${userEmail}`);
        let apps = await res.json();

        if (!apps || apps.length === 0) {
            appsContainer.innerHTML = `<p style="color:#94a3b8;">No applications yet.</p>`;
            return;
        }

        appsContainer.innerHTML = "";

        apps.forEach(app => {
            let statusColor = app.status === "accepted" ? "#22c55e"
                            : app.status === "rejected" ? "#ef4444"
                            : app.status === "interview" ? "#f59e0b"
                            : "#94a3b8";

            let card = document.createElement("div");
            card.className = "job-card-premium";
            card.innerHTML = `
                <h3>${escapeHtml(app.jobTitle || "Job")}</h3>
                <p style="color:${statusColor}; font-weight:600; text-transform:capitalize;">
                    ${escapeHtml(app.status || "Pending")}
                </p>
                <p style="font-size:13px; color:#94a3b8;">
                    Match: ${app.match ? app.match.toFixed(1) + "%" : "N/A"}
                </p>
                ${app.interviewDate ? `<p style="font-size:13px; color:#f59e0b;">📅 Interview: ${new Date(app.interviewDate).toLocaleString()}</p>` : ""}
            `;
            appsContainer.appendChild(card);
        });

    } catch (err) {
        console.error("Applications fetch failed:", err);
        appsContainer.innerHTML = `<p style="color:#ef4444;">Failed to load applications.</p>`;
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
// HELPER: escape HTML to prevent XSS
// =============================================
function escapeHtml(str) {
    let div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
}
