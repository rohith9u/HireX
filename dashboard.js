    async function loadLatestJobs() {
    try {
        const res = await fetch("https://hirex-backend-sio8.onrender.com/jobs");
        const jobs = await res.json();

        const container = document.getElementById("latestJobs");
        container.innerHTML = "";

        // ✅ sort latest first (important)
        const latestJobs = jobs
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

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
                    <button class="view-btn" onclick="openJobFromDashboard('${job._id}')">
                        View
                    
                </div>
            `;

            container.appendChild(div);
        });

    } catch (err) {
        console.log("Error loading jobs:", err);
    }
}

// 🔥 CALL FUNCTION

// 🔐 ACCESS CONTROL
let sessionUser = JSON.parse(localStorage.getItem("loggedInUser") || "null");
// ✅ FIX: prevent returning to apply page
let justApplied = localStorage.getItem("justApplied");

if (justApplied === "true") {
    localStorage.removeItem("justApplied");
    localStorage.removeItem("selectedJobId"); // 🔥 THIS FIXES ISSUE
}
let role = (sessionUser?.role || "").toLowerCase();

console.log("ROLE DEBUG:", role, sessionUser);

if (!sessionUser || role !== "user") {
    showToast("Access Denied!", "error");
    setTimeout(() => window.location.href = "login.html", 1500);
}

let email = localStorage.getItem("userEmail") || sessionUser?.email || "";

// DEFAULT
window.onload = () => {
    showSection("dashboard");
};

function showSection(section) {
    let content = document.getElementById("content");

    if(section === "dashboard") {

        // ✅ GET USER FROM localStorage
        let user = JSON.parse(localStorage.getItem("loggedInUser"));

        let name = user?.firstName || "User";

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
            <h3 style="margin-top: 20px;">Latest Jobs</h3>

<div id="latestJobs" class="jobs-container"></div>
        `;

        loadStats();
        loadLatestJobs();
    }
    if(section === "jobs") {
      content.innerHTML = `
<div class="jobs-page">

    <!-- FILTER PANEL -->
    <div class="filters">

        <h3>Filters</h3>

        <!-- DOMAIN -->
        <label>Domain</label>
        <select id="filterDomain">
            <option value="">All</option>
            <option >Technology & IT</option>
            <option>Business & Management</option>
            <option>Finance</option>
            <option>Sales & Marketing</option>
            <option>Engineering</option>
            <option>Healthcare</option>
            <option>Other's</option>
        </select>

        <!-- JOB TYPE -->
        <label>Job Type</label>
        <select id="filterType">
            <option value="">All</option>
            <option value="Full-Time">Full-Time</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Internship">Internship</option>
        </select>

        <!-- SALARY -->
        <label>Min Salary</label>
        <input type="number" id="filterSalary" placeholder="e.g. 20000">

        <!-- COMPANY -->
        <label>Company</label>
        <input type="text" id="filterCompany" placeholder="Search company">

        <!-- SORT -->
        <label>Sort By</label>
        <select id="sortBy">
            <option value="latest">Latest</option>
            <option value="salaryHigh">Salary High → Low</option>
            <option value="salaryLow">Salary Low → High</option>
        </select>

        <button onclick="applyFilters()" class="filter-btn">Apply</button>
    </div>

    <!-- JOB LIST -->
    <div class="jobs-content">
        <h2>Available Jobs</h2>
        <div id="jobList"></div>
    </div>

</div>
`;

loadJobs();
    }

    if(section === "applications") {
        content.innerHTML = `<h2>My Applications</h2><div id="appList"></div>`;
        loadApplications();
    }

    if(section === "profile") {
        content.innerHTML = `
        <h2>Profile</h2>
        <div id="profileBox"></div>`;   
    loadProfile(); }
    }
function toggleEdit() {

    // enable all inputs EXCEPT role
    document.querySelectorAll(".profile-form input:not(#role)")
        .forEach(input => input.disabled = false);

    // only convert TYPE
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
function loadProfile() {
    let email = localStorage.getItem("userEmail");

    console.log("Email:", email);

    // ✅ Safety check
    if (!email) {
        document.getElementById("profileBox").innerHTML = "No user logged in";
        return;
    }

    fetch(`https://hirex-backend-sio8.onrender.com/profile/${email}`)
    .then(res => res.json())
    .then(user => {

        console.log("User Data:", user);

        let container = document.getElementById("profileBox");

        if (!container) {
            console.log("profileBox not found");
            return;
        }

        if (user.error) {
            container.innerHTML = "User not found";
            return;
        }

        // ✅ Default image fallback
        let imgSrc = user.profileImage
            ? `https://hirex-backend-sio8.onrender.com/images/${user.profileImage}`
            :  "images/default-user.png";

        // ✅ Render UI safely
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
                    <input 
  id="contact"
  type="text"
  value="${user.contact || ""}"
  minlength="10"
  maxlength="10"
  oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0,10)"
  disabled
>
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
        console.log("Error loading profile:", err);
        document.getElementById("profileBox").innerHTML = "Error loading profile";
    });
}


// ==========================
// STATS
// ==========================
function saveProfile() {

    let user = JSON.parse(localStorage.getItem("loggedInUser"));

    let contact = document.getElementById("contact").value.trim();

    // 🔥 PHONE VALIDATION
    if (!/^[0-9]{10}$/.test(contact)) {
        showToast("Enter valid 10-digit phone number ❌", "error");
        return;
    }

    let data = {
        userId: user._id,
        firstName: document.getElementById("firstName").value,
        lastName: document.getElementById("lastName").value,
        contact: contact,
        city: document.getElementById("city").value,
        gender: document.getElementById("gender").value,
        type: document.getElementById("type").value
    };

    fetch("https://hirex-backend-sio8.onrender.com/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        showToast("Profile updated!");
        showSection("profile");
    });
}
function loadStats() {
    fetch("hhttps://hirex-backend-sio8.onrender.com/applications")
    .then(res => res.json())
    .then(data => {

        let applied = 0;
        let interview = 0;
        let selected = 0;
        let rejected = 0;

        data.filter(app => app.email === email).forEach(app => {

            if (app.status === "Applied") applied++;
            if (app.status === "Interview") interview++;
            if (app.status === "Selected") selected++;
            if (app.status === "Rejected") rejected++;

        });

        document.getElementById("appliedCount").innerText = applied;
        document.getElementById("interviewCount").innerText = interview;
        document.getElementById("selectedCount").innerText = selected;
        document.getElementById("rejectedCount").innerText = rejected;

    });
}

function toggleNotif() {
    let box = document.getElementById("notifBox");
    let dot = document.getElementById("notifDot");

    if (box.style.display === "block") {
        box.style.display = "none";
    } else {
        box.style.display = "block";
    }

    // hide dot when opened
    dot.style.display = "none";
}
// ==========================
// JOBS
// ==========================
function loadJobs() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {

        
        let container = document.getElementById("jobList");
        container.innerHTML = "";

        let email = localStorage.getItem("userEmail");

        let filteredJobs = jobs;

// 🔥 APPLY FILTERS IF EXIST
if(window.activeFilters) {

    let f = window.activeFilters;

    filteredJobs = jobs.filter(job => {

        // DOMAIN
        if (f.domain && job.domain?.toLowerCase().trim() !== f.domain.toLowerCase().trim()) {
    return false;
}

        // JOB TYPE
        if(f.type && job.jobType !== f.type) return false;

        // SALARY
if (f.salary && extractSalary(job.salary) < Number(f.salary)) {
    return false;
}

        // COMPANY SEARCH
        if(f.company && !job.company.toLowerCase().includes(f.company.toLowerCase())) return false;

        return true;
    });

    // 🔥 SORTING
    if(f.sort === "latest") {
        filteredJobs.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
    }
    else if(f.sort === "salaryHigh") {
    filteredJobs.sort((a,b)=> extractSalary(b.salary) - extractSalary(a.salary));
}
else if(f.sort === "salaryLow") {
    filteredJobs.sort((a,b)=> extractSalary(a.salary) - extractSalary(b.salary));
}
}
function extractSalary(value) {
    if (!value) return 0;
    return Number(value.toString().replace(/[^\d]/g, ""));
}
// 🔥 RENDER
filteredJobs.forEach(job => {

            // 🔥 YOUR LOGIC (PASTE HERE)
            let jobApplications = apps.filter(app => 
                String(app.jobId) === String(job._id)
            );

            let isFilled = jobApplications.some(app => app.status === "Selected");

            let userApps = apps.filter(app => 
    String(app.jobId) === String(job._id) && app.email === email
);

// get latest application
let alreadyApplied = userApps.sort((a,b)=> 
    new Date(b.createdAt) - new Date(a.createdAt)
)[0];
let applyBtn = "";

// ✅ FIXED STATUS HANDLING
let currentStatus = (job.status || "").toLowerCase().trim();

// ✅ CLOSED (HIGHEST PRIORITY)
if (currentStatus === "closed") {
    applyBtn = `<button disabled class="closed-btn">Closed</button>`;
}

// ✅ ALREADY APPLIED (NOT REJECTED)
else if (alreadyApplied && alreadyApplied.status && alreadyApplied.status.toLowerCase() !== "rejected") {
    applyBtn = `<button disabled class="applied-btn">Applied ✔</button>`;
}

// 🔁 REJECTED → ALLOW REAPPLY
else if (alreadyApplied && alreadyApplied.status && alreadyApplied.status.toLowerCase() === "rejected") {
    applyBtn = `<button 
        class="apply-btn small-apply" 
        onclick="goToApply('${job._id}')">
        Apply Again
    </button>`;
}

// ✅ NORMAL APPLY
else {
    applyBtn = `<button 
        class="apply-btn small-apply" 
        onclick="goToApply('${job._id}')">
        Apply Now
    </button>`;
}

            // 🔥 CARD UI
            let div = document.createElement("div");
            div.className = "job-card-premium";

            div.innerHTML = `
    <div class="job-header">
        <h3>${job.title}</h3>
        <span class="badge">${job.jobType || "N/A"}</span>
    </div>

    <p><b>Company:</b> ${job.company}</p>
    <p><b>Location:</b> ${job.location}</p>
    <p><b>Salary:</b> ${job.salary || "Not disclosed"}</p>

    <div class="job-footer">
        <button class="view-btn" onclick="viewJob('${job._id}')">
            View
        </button>

       <div class="job-actions">
    ${applyBtn}
</div>
    </div>
`;

            container.appendChild(div);
        });
    });
}
function viewJob(jobId) {
    console.log("View clicked:", jobId);

    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {

    let job = jobs.find(j => String(j._id) === String(jobId));
let container = document.getElementById("jobList");

let email = localStorage.getItem("userEmail");

// ✅ ONLY ONE DECLARATION
let alreadyApplied = apps.find(app => 
    String(app.jobId) === String(jobId) && app.email === email
);

let jobApplications = apps.filter(app => 
    String(app.jobId) === String(jobId)
);

// optional (you can use later)
let isFilled = jobApplications.some(app => app.status === "Selected");

let applyBtn = "";

let currentStatus = job?.status ? job.status.toLowerCase() : "active";

// ❌ CLOSED
if (currentStatus === "closed") {
    applyBtn = `<button disabled class="closed-btn">Closed</button>`;
}


// ❌ ALREADY APPLIED
else if (alreadyApplied && alreadyApplied.status && alreadyApplied.status.toLowerCase() !== "rejected") {
    applyBtn = `<button disabled class="applied-btn">Already Applied ✔</button>`;
}

// 🔁 REJECTED → REAPPLY
else if (alreadyApplied && alreadyApplied.status && alreadyApplied.status.toLowerCase() === "rejected") {
    applyBtn = `<button class="apply-btn small-apply" onclick="goToApply('${job._id}')">
        Apply Again
    </button>`;
}

// ✅ NORMAL APPLY
else {
    applyBtn = `<button class="apply-btn small-apply" onclick="goToApply('${job._id}')">
        Apply Now
    </button>`;
}

  container.innerHTML = `
<div style="
    max-width: 700px;
    margin: 30px auto;
    background: linear-gradient(145deg, #1e293b, #0f172a);
    padding: 25px;
    border-radius: 14px;
    border: 1px solid #1e293b;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    color: #e2e8f0;
">

    <h2>${job.title}</h2>

    <p><b>Company:</b> ${job.company}</p>
    <p><b>Location:</b> ${job.location}</p>
    <p><b>Salary:</b> ${job.salary}</p>
    <p><b>Job Type:</b> ${job.jobType}</p>
    <p><b>Experience:</b> ${job.experience}</p>
    <p><b>Skills:</b> ${job.skills}</p>
    <p><b>Domain:</b> ${job.domain}</p>
    <h3>Description</h3>

    <br>

    ${applyBtn}

    <br><br>

    <button class="back-btn-premium" onclick="loadJobs()">← Back</button>

</div>
`;
    })
    .catch(err => {
        console.log("Error:", err);
    });
}
function goToApply(jobId) {
    localStorage.setItem("selectedJobId", jobId);
    window.location.href = "apply.html";
}
// ==========================
// APPLY
// ==========================
function applyJob(jobId) {
    fetch("https://hirex-backend-sio8.onrender.com/apply-job", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ name:"User", email, jobId })
    })
    .then(res => res.json())
    .then(data => {
        showToast(data.message);
        viewJob(jobId); // 🔥 refresh view
    });
}
// ==========================
// APPLICATIONS
// ==========================
function loadApplications() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {

        let email = localStorage.getItem("userEmail");
        let container = document.getElementById("appList");
        container.innerHTML = "";

        // ✅ filter only MY applications
        let myApps = apps.filter(app => app.email === email);

// 🔥 ADD SORT HERE
const priority = {
    "Interview": 1,
    "Applied": 2,
    "Selected": 3,
    "Rejected": 4
};

myApps.sort((a, b) => priority[a.status] - priority[b.status]);

// THEN LOOP

        if (myApps.length === 0) {
            container.innerHTML = "<p>No applications yet</p>";
            return;
        }

        myApps.forEach(app => {

            // ✅ FIXED ID MATCH
            let job = jobs.find(j => String(j._id) === String(app.jobId));

            let statusClass = app.status.toLowerCase(); // ✅ IMPORTANT
            let highlightId = localStorage.getItem("highlightJobId");
let isHighlight = highlightId && app.jobId == highlightId;

            let div = document.createElement("div");
div.className = "app-card";
div.setAttribute("data-id", String(app.jobId?._id || app.jobId));
if (isHighlight) {
    div.classList.add("highlight-job");
}

           let viewBtn = "";

// ❌ DO NOT SHOW for CLOSED
let currentStatus = job?.status ? job.status.toLowerCase() : "active";

if (currentStatus !== "closed") {
    
}

div.innerHTML = `
    <div class="app-header">
        <h3>${job ? job.title : "Job not found"}</h3>
       <span class="status-badge ${statusClass}">
    ${app.status === "Interview" ? "Interview" : app.status}
</span>

    </div>

    <p><b>Company:</b> ${job ? job.company : "N/A"}</p>
    <p><b>Location:</b> ${job ? job.location : "N/A"}</p>
    ${app.interviewDate ? `
<p style="color:#38bdf8; font-weight:500;">
    Interview: ${new Date(app.interviewDate).toLocaleString()}
</p>
` : ""}
    <div class="job-footer">
        ${viewBtn}
    </div>

    ${
        app.resume 
        ? `<a href="https://hirex-backend-sio8.onrender.com/${app.resume}" target="_blank" class="resume-btn">View Resume</a>`
        : ""
    }
`;
            container.appendChild(div);
        });
       setTimeout(() => {
    let highlightId = localStorage.getItem("highlightJobId");

    if (!highlightId) return;

    let cards = document.querySelectorAll(".app-card");

    cards.forEach(card => {
        let jobId = card.getAttribute("data-id");

        if (jobId === highlightId) {
            card.classList.add("highlight-job");

            card.scrollIntoView({ behavior: "smooth", block: "center" });

            // ✅ REMOVE AFTER USE
            localStorage.removeItem("highlightJobId");
        }
    });

}, 100);

    })
    .catch(err => {
        console.log("Error loading applications:", err);
    });
    setTimeout(() => {
    let el = document.querySelector(".highlight-job");
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}, 200);
}
// ==========================
// TOAST
// ==========================
function showToast(message, type="success") {
    let toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = "show";

    if(type==="error") toast.classList.add("error");

    setTimeout(()=>toast.className="",3000);
}

function applyFilters() {

    window.activeFilters = {
        domain: document.getElementById("filterDomain").value,
        type: document.getElementById("filterType").value,
        salary: document.getElementById("filterSalary").value,
        company: document.getElementById("filterCompany").value,
        sort: document.getElementById("sortBy").value
    };

    loadJobs();
}

// ==========================
// LOGOUT
// ==========================
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}
function loadNotifications() {
    Promise.all([
        fetch("https://hirex-backend-sio8.onrender.com/jobs").then(res => res.json()),
        fetch("https://hirex-backend-sio8.onrender.com/applications").then(res => res.json())
    ])
    .then(([jobs, apps]) => {

        let email = localStorage.getItem("userEmail");
        let notifDot = document.getElementById("notifDot");
        let notifBox = document.getElementById("notifBox");

        // 🔥 INCLUDE INTERVIEW + SELECTED
        let myUpdates = apps.filter(app => 
            app.email === email && 
            (app.status === "Selected" || app.status === "Interview")
        );
        myUpdates.sort((a, b) => 
    new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
);
        notifDot.style.display = myUpdates.length > 0 ? "block" : "none";

        notifBox.innerHTML = "";

        if (myUpdates.length === 0) {
            notifBox.innerHTML = "<p>No notifications</p>";
            return;
        }

        myUpdates.forEach(app => {
            let job = jobs.find(j => j._id === app.jobId);

            let div = document.createElement("div");
            div.className = "notif-item";

            // 🔥 DIFFERENT MESSAGE
            if (app.status === "Interview") {
                div.innerHTML = `
                    🗓️ Interview scheduled for <b>${job ? job.title : "a job"}</b><br>
                    <small>${new Date(app.interviewDate).toLocaleString()}</small>
                `;
            } else {
                div.innerHTML = `
                    🎉 You are selected for <b>${job ? job.title : "a job"}</b>
                `;
            }

            div.onclick = () => {
                localStorage.setItem("highlightJobId", String(app.jobId));
                notifBox.style.display = "none";
                showSection("applications");
            };

            notifBox.appendChild(div);
        });

    })
    .catch(err => console.log("Notification error:", err));
}
function showPopup(message) {
    let popup = document.createElement("div");
    popup.className = "popup-notif";

    popup.innerHTML = message;

    document.body.appendChild(popup);

    // remove after 4 sec
    setTimeout(() => {
        popup.remove();
    }, 4000);
}
function openJobFromDashboard(jobId) {
    showSection("jobs");

    // wait until jobList is ready (NO DELAY)
    let observer = new MutationObserver(() => {
        let container = document.getElementById("jobList");

        if (container && container.children.length > 0) {
            observer.disconnect(); // stop watching
            viewJob(jobId);
        }
    });

    observer.observe(document.getElementById("content"), {
        childList: true,
        subtree: true
    });
}

loadNotifications();