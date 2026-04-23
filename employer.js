// =============================================
// ✅ EMPLOYER.JS — Fixed version
// - Shows employer's real name
// - Loads applications with proper status actions
// - Schedule interview, Accept, Reject properly wired
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

    // ✅ Load employer profile for name display
    await loadEmployerProfile(userEmail, sessionUser);

    // ✅ Load all applications for this employer's jobs
    await loadApplications(userEmail);
});

// =============================================
// LOAD EMPLOYER PROFILE
// =============================================
async function loadEmployerProfile(userEmail, sessionUser) {
    let firstName = sessionUser.firstName || "";

    try {
        let res = await fetch(`${BASE_URL}/profile/${userEmail}`);
        let user = await res.json();

        if (user && !user.error) {
            firstName = user.firstName || firstName;
        }
    } catch (err) {
        console.error("Employer profile fetch failed:", err);
    }

    // ✅ Update greeting
    let welcomeEl = document.getElementById("welcomeUser");
    if (welcomeEl) welcomeEl.textContent = `Welcome ${firstName || "Employer"} 👋`;

    let topbarNameEl = document.getElementById("topbarName");
    if (topbarNameEl) topbarNameEl.textContent = firstName || "Employer";
}

// =============================================
// LOAD APPLICATIONS FOR EMPLOYER'S JOBS
// =============================================
async function loadApplications(userEmail) {
    let container = document.getElementById("applicationsContainer");
    if (!container) return;

    container.innerHTML = `<p style="color:#94a3b8;">Loading applications...</p>`;

    try {
        // ✅ Fetch applications for employer
        let res = await fetch(`${BASE_URL}/employer-applications/${userEmail}`);
        let apps = await res.json();

        if (!apps || apps.length === 0) {
            container.innerHTML = `<p style="color:#94a3b8;">No applications received yet.</p>`;
            return;
        }

        container.innerHTML = "";

        apps.forEach(app => {
            let statusColor = app.status === "accepted"  ? "#22c55e"
                            : app.status === "rejected"  ? "#ef4444"
                            : app.status === "interview" ? "#f59e0b"
                            : "#94a3b8";

            let card = document.createElement("div");
            card.className = "job-card-premium";
            card.id = `app-${app._id}`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                    <div>
                        <h3 style="margin:0 0 4px;">${escapeHtml(app.name || "Applicant")}</h3>
                        <p style="margin:2px 0; font-size:13px; color:#94a3b8;">
                            📧 ${escapeHtml(app.email || "")}
                        </p>
                        <p style="margin:2px 0; font-size:13px; color:#94a3b8;">
                            📞 ${escapeHtml(app.phone || "")}
                        </p>
                        <p style="margin:2px 0; font-size:13px; color:#94a3b8;">
                            🎓 ${escapeHtml(app.degree || "")} | 🏙️ ${escapeHtml(app.city || "")}
                        </p>
                        <p style="margin:2px 0; font-size:13px; color:#94a3b8;">
                            🛠️ Skills: ${escapeHtml(app.skills || "")}
                        </p>
                        <p style="margin:2px 0; font-size:13px; color:#94a3b8;">
                            🕒 Experience: ${app.experience || 0} yr(s)
                        </p>
                        <p style="margin:4px 0; font-size:13px;">
                            Match Score:
                            <span style="color:${app.match >= 70 ? '#22c55e' : app.match >= 40 ? '#f59e0b' : '#ef4444'}; font-weight:600;">
                                ${app.match ? parseFloat(app.match).toFixed(1) + "%" : "N/A"}
                            </span>
                        </p>
                        ${app.resumeUrl
                            ? `<a href="${BASE_URL}/${app.resumeUrl}" target="_blank"
                               style="font-size:13px; color:#6366f1; text-decoration:underline;">
                               📄 View Resume</a>`
                            : ""}
                        ${app.interviewDate
                            ? `<p style="font-size:13px; color:#f59e0b; margin:4px 0;">
                               📅 Interview: ${new Date(app.interviewDate).toLocaleString()}</p>`
                            : ""}
                    </div>
                    <span style="background:${statusColor}22; color:${statusColor}; padding:4px 12px;
                                border-radius:20px; font-size:12px; font-weight:600; text-transform:capitalize;
                                border:1px solid ${statusColor}44;">
                        ${escapeHtml(app.status || "pending")}
                    </span>
                </div>

                <!-- ✅ Action buttons — only show when status is pending -->
                ${app.status === "pending" || !app.status ? `
                <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
                    <button class="apply-btn"
                            style="background:linear-gradient(135deg,#22c55e,#16a34a); flex:1; min-width:100px;"
                            onclick="updateStatus('${app._id}', 'accepted')">
                        ✅ Accept
                    </button>
                    <button class="apply-btn"
                            style="background:linear-gradient(135deg,#f59e0b,#d97706); flex:1; min-width:100px;"
                            onclick="scheduleInterview('${app._id}')">
                        📅 Interview
                    </button>
                    <button class="apply-btn"
                            style="background:linear-gradient(135deg,#ef4444,#dc2626); flex:1; min-width:100px;"
                            onclick="updateStatus('${app._id}', 'rejected')">
                        ❌ Reject
                    </button>
                </div>` : ""}
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error("Applications fetch failed:", err);
        container.innerHTML = `<p style="color:#ef4444;">Failed to load applications. Please refresh.</p>`;
    }
}

// =============================================
// UPDATE APPLICATION STATUS (accept / reject)
// =============================================
async function updateStatus(appId, status) {
    try {
        let res = await fetch(`${BASE_URL}/update-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId, status })
        });
        let data = await res.json();

        if (data.success || data.message) {
            showToast(status === "accepted" ? "Application Accepted ✅" : "Application Rejected ❌",
                      status === "accepted" ? "success" : "error");

            // ✅ Re-render just this card's buttons instead of full reload
            let card = document.getElementById(`app-${appId}`);
            if (card) {
                let btnArea = card.querySelector(".action-btns");
                if (btnArea) btnArea.remove();

                // Update status badge
                let badge = card.querySelector("span[style*='text-transform:capitalize']");
                if (badge) {
                    let color = status === "accepted" ? "#22c55e" : "#ef4444";
                    badge.style.cssText = `background:${color}22; color:${color}; padding:4px 12px;
                        border-radius:20px; font-size:12px; font-weight:600; text-transform:capitalize;
                        border:1px solid ${color}44;`;
                    badge.textContent = status;
                }

                // Remove action buttons
                let btnDiv = card.querySelector("div:last-child");
                if (btnDiv && btnDiv.querySelector("button")) btnDiv.remove();
            }
        } else {
            showToast("Update failed ❌", "error");
        }
    } catch (err) {
        console.error("Status update failed:", err);
        showToast("Server error ❌", "error");
    }
}

// =============================================
// SCHEDULE INTERVIEW — navigate to interview page
// =============================================
function scheduleInterview(appId) {
    localStorage.setItem("selectedAppId", appId);
    window.location.href = "interview.html";
}

// =============================================
// LOGOUT
// =============================================
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// =============================================
// TOAST NOTIFICATION
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
