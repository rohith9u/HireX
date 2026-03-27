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

        // ✅ my jobs
        let myJobs = jobs.filter(j => 
            (j.postedBy || "").toLowerCase() === email
        );

        let myJobIds = myJobs.map(j => String(j._id));

        // ✅ pending only
        let pendingApps = apps.filter(app => 
            myJobIds.includes(String(app.jobId)) &&
            app.status !== "Selected" &&
            app.status !== "Rejected"
        );

        // ✅ sort latest first
        pendingApps.sort((a,b)=> 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        // ✅ UI
html = `<h3>Incoming Applications</h3><div class="app-grid">`;

if (pendingApps.length === 0) {
    html += `<p>No new applicants</p>`;
} else {
   pendingApps.slice(0, 4).forEach(app => {

    let job = jobs.find(j => String(j._id) === String(app.jobId));

    let jobSkills = (job?.skills || "").toLowerCase().split(",");
    let userSkills = (app.skills || []).map(s => s.toLowerCase());

    let matched = jobSkills.filter(skill => 
        userSkills.includes(skill.trim())
    );

    let missing = jobSkills.filter(skill => 
        !userSkills.includes(skill.trim())
    );

    html += `
    <div class="app-card-mini">
        <h4>${app.name}</h4>

        <p><b>Email:</b> ${app.email}</p>
        <p><b>Job:</b> ${job ? job.title : "N/A"}</p>

        <p><b>Skills:</b> ${Array.isArray(app.skills) ? app.skills.join(", ") : app.skills}</p>

        <!-- PROGRESS BAR -->
        <div style="background:#1e293b; border-radius:8px; margin:10px 0;">
            <div style="
                width:${Number(app.match || 0)}%;
                background:#22c55e;
                padding:6px;
                border-radius:8px;
                text-align:center;
                color:white;">
                ${Number(app.match || 0).toFixed(0)}%
            </div>
        </div>

        <p style="color:#22c55e;">✔ ${matched.join(", ") || "None"}</p>
        <p style="color:#ef4444;">❌ ${missing.join(", ") || "None"}</p>

        <button class="view-btn"
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
window.onpopstate = function () {

    if (currentSection !== "dashboard") {
        showSection("dashboard", false);

        // keep user inside app
        history.pushState({ section: "dashboard" }, "", "");
    }

    else {
        let confirmLogout = confirm("Are you sure you want to logout?");

        if (confirmLogout) {
            localStorage.removeItem("loggedInUser");

            // 🔥 EMPLOYER goes to login
            window.location.href = "login.html";
        } else {
            // stay on dashboard
            history.pushState({ section: "dashboard" }, "", "");
        }
    }
};
window.addEventListener("popstate", function () {

    console.log("BACK PRESSED"); // debug

    if (currentSection !== "dashboard") {
        showSection("dashboard", false);

        // push again so user stays inside app
        history.pushState({ page: "dashboard" }, "", "");
    }

    else {
        let confirmLogout = confirm("Are you sure you want to logout?");

        if (confirmLogout) {
            localStorage.clear();
            window.location.href = "employee.html";
        } else {
            // keep user on page
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

            // ✅ Get my jobs
            let myJobs = jobs.filter(j => 
                (j.postedBy || "").toLowerCase() === myEmail
            );

            let myJobIds = myJobs.map(j => String(j._id));

            // ✅ Filter my applicants
            let myApps = apps.filter(app => 
                myJobIds.includes(String(app.jobId)) &&
                app.status !== "Selected" &&
                app.status !== "Rejected"
            );

            // 🔥 NEW APPLICANTS DETECTED
            if (myApps.length > lastAppCount) {

                let newCount = myApps.length - lastAppCount;

                // 🔔 Toast popup
                showToast(`${newCount} New Applicant(s)! 🎉`);

                // 🔔 Add to notification UI
                updateNotificationUI(myApps.slice(-newCount));

                // 🔴 Update badge count (optional)
                updateNotificationCount(newCount);
            }

            // 🔥 SAVE latest count
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

    // If empty → show placeholder
    if (content.innerHTML.trim() === "") {
        content.innerHTML = "<p class='empty-msg'>No notifications yet</p>";
    }

    box.classList.toggle("show");
}


// ==========================
// 🔔 TOAST MESSAGE
// ==========================


// ==========================
// 🔥 START SYSTEM
// ==========================

// Run immediately
checkNewApplicants();

// Run every 5 sec
setInterval(checkNewApplicants, 5000);function updateNotificationUI(newApps) {

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

    // remove placeholder if exists
    if (content.innerText === "No notifications yet") {
        content.innerHTML = "";
    }

    let p = document.createElement("p");
    p.innerText = msg;

    content.appendChild(p);
}
function showToast(message, type="success") {
    let toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = "show";

    if(type === "error") {
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

// 🔥 push initial state (NOT replace)
history.pushState({ section: "dashboard" }, "", "");

// ==========================
// 🔥 SECTION SWITCHING
// ==========================
function showSection(section, addToHistory = true) {
    if (addToHistory) {
    history.pushState({ section }, "", "");
}
    currentSection = section;
    // 🔥 sync bottom nav active state
// 🔥 sync bottom nav active state
document.querySelectorAll(".bottom-nav .nav-item")
    .forEach(item => item.classList.remove("active"));

let map = {
    dashboard: 0,
    post: 2,
    jobs: 1,
    applicants: 3,
    profile: 4
};

let items = document.querySelectorAll(".bottom-nav .nav-item");

if (items[map[section]] !== undefined) {
    items[map[section]].classList.add("active");
}
    if (addToHistory) {
        history.pushState({ section }, "", "");
    }

    let content = document.getElementById("content");

    // 📊 DASHBOARD
    if(section === "dashboard") {

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
    if(section === "post") {
    content.innerHTML = `
    <div class="job-card-premium post-card">

        <h2>Post Job</h2>

        <div class="form-grid">

            <input id="title" placeholder="Job Title">
            <input id="company" placeholder="Company">

            <input id="location" placeholder="Location">
           <input 
  id="salary" 
  type="text" 
  placeholder="Salary (e.g. 50000)" 
  oninput="this.value = this.value.replace(/[^0-9]/g, '')">
            <select id="domain">
                <option value="">Domain</option>
                <option>Technology & IT</option>
                <option>Business & Management</option>
                <option>Finance & Accounts</option>
                <option>Sales & Marketing</option>
                <option>Engineering & Core Technical</option>
                <option>Healthcare Jobs</option>
                <option>Other's</option>
            </select>
            <select id="jobType">
                <option value="">Select Job Type</option>
                <option>Full-Time</option>
                <option>Part-Time</option>
                <option>Internship</option>
            </select>
            <input id="experience" placeholder="Experience (e.g. 2 years)">
            <input id="skills" placeholder="Skills (e.g. Java, React)">

        </div>

        <textarea id="description" placeholder="Job Description"></textarea>

        <button class="apply-btn post-btn" onclick="postJob()">
            Post Job
        </button>

        <p id="jobMessage"></p>

    </div>
`;
}

    // 💼 MY JOBS
    if(section === "jobs") {
        content.innerHTML = `<h2>My Jobs</h2><div id="jobList"></div>`;
        loadMyJobs();
    }

    // 📄 APPLICANTS
    if(section === "applicants") {
        content.innerHTML = `
    <h2>Applicants</h2>

    <input 
        type="text" 
        id="appSearch" 
        placeholder="Search by job title..."
        class="search-bar"
        oninput="loadApplicants()"
    >

    <div id="appList"></div>
`;
        loadApplicants();
    }
    if(section === "profile") {
        content.innerHTML = `
        <h2>Profile</h2>
        <div id="profileBox"></div>`;   
    loadProfile(); }
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

        // ✅ filter my jobs
        let myJobs = jobs.filter(j => 
            (j.postedBy || "").trim().toLowerCase() === email
        );

        // ✅ job count
        document.getElementById("jobCount").innerText = myJobs.length;

        // ✅ get my job IDs
        let myJobIds = myJobs.map(j => j._id);

        // ✅ filter applications for my jobs only
        let myApps = apps.filter(app => 
            myJobIds.map(id => String(id)).includes(String(app.jobId))
        );

        // ✅ applicant count
        let pendingApps = myApps.filter(app => 
    app.status !== "Selected" && app.status !== "Rejected"
);

document.getElementById("appCount").innerText = pendingApps.length;
    })
    .catch(err => {
        console.log(err);
    });
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
}// ==========================
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

    // ✅ validation
    if (!title || !company || !location || !salary || !jobType || !experience || !skills || !description) {
        message.style.color = "red";
        message.innerText = "Please fill all fields!";
        return;
    }

    if (!email) {
        message.style.color = "red";
        message.innerText = "Session expired. Please login again.";
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
        return;
    }
    // 🔥 SALARY VALIDATION
if (!/^[0-9]+$/.test(salary)) {
    message.style.color = "red";
    message.innerText = "Salary must be numbers only ❌";
    return;
}

// 🔥 EXPERIENCE VALIDATION
if (!/^[0-9]+$/.test(experience)) {
    message.style.color = "red";
    message.innerText = "Experience must be a number ❌";
    return;
}

// 🔥 SKILLS FORMAT CLEAN
skills = skills.split(",").map(s => s.trim().toLowerCase()).join(",");
    // 🔥 send all fields to backend
    fetch("https://hirex-backend-sio8.onrender.com/post-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
    title,
    company,
    location,
    salary,
    domain,
    jobType,
    experience,
    skills,
    description,
    email,
    status: "active"   // ✅ ADD THIS
})
    })
    .then(res => res.json())
    .then(data => {

        // ❌ error from backend
        if (data.error) {
            message.style.color = "red";
            message.innerText = data.error;
            return;
        }

        // ✅ success
        message.style.color = "green";
        message.innerText = data.message || "Job posted successfully!";

        // 🔥 clear fields
        document.getElementById("title").value = "";
        document.getElementById("company").value = "";
        document.getElementById("location").value = "";
        document.getElementById("salary").value = "";
        document.getElementById("domain").value = "";
        document.getElementById("jobType").value = "";
        document.getElementById("experience").value = "";
        document.getElementById("skills").value = "";
        document.getElementById("description").value = "";

        // 🔥 refresh jobs section (no redirect)
        setTimeout(() => {
            showSection("jobs");
        }, 800);
    })
    .catch(() => {
        message.style.color = "red";
        message.innerText = "Error posting job. Try again.";
    });
}
window.updateStatus = function(appId, status) {


    fetch("https://hirex-backend-sio8.onrender.com/update-status", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ appId, status })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
        loadApplicants();
    });
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

            // ✅ FIXED ID MATCH
            let jobApplications = apps.filter(app => 
                String(app.jobId) === String(job._id)
            );

           let statusHTML = "";

if (job.status === "closed") {
    statusHTML = `<span class="status closed">Closed</span>`;
}
else if (job.status === "filled") {
    statusHTML = `<span class="status filled">Filled</span>`;
}
else {
    statusHTML = `<span class="status active">Active</span>`;
}

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
                <p><b>Domain:</b> ${job.domain || "N/A"}</p>
                <p><b>Skills:</b> ${job.skills || "N/A"}</p>

                <div class="job-footer">
    ${statusHTML}
</div>

${job.status !== "closed" ? 
    `<button class =closed-btn onclick="closeJob('${job._id}')">Close</button>` 
    : `<button disabled>Closed</button>`
}
            `;

            container.appendChild(div);
        });
    })
    .catch(err => {
        console.log("Error loading jobs:", err);
    });
}

// ==========================
// 🔥 UPDATE STATUS
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

        // ✅ get my jobs
        let email = (localStorage.getItem("userEmail") || "").trim().toLowerCase();

let myJobs = jobs.filter(job => 
    (job.postedBy || "").trim().toLowerCase() === email
);
    
        let myJobIds = myJobs.map(job => job._id);

        // ✅ filter applications for my jobs
        let searchInput = (document.getElementById("appSearch")?.value || "")
    .toLowerCase()
    .trim();

// ✅ show search text
if (searchInput) {
    container.innerHTML = `<p>Showing applicants for: "<b>${searchInput}</b>"</p>`;
}

let myApplicants = apps.filter(app => {

    let job = jobs.find(j => String(j._id) === String(app.jobId));

    // ✅ FIXED ID comparison
    if (!myJobIds.map(id => String(id)).includes(String(app.jobId))) return false;

    // ✅ no search → show all
    if (!searchInput) return true;

    // ✅ filter by job title
    return job && job.title.toLowerCase().includes(searchInput);
});
        myApplicants.sort((a, b) => {

    // ✅ Priority based on status
    const getPriority = (status) => {
        if (status === "Applied" || status === "Screening" || status === "Interview") return 1;
        if (status === "Selected") return 2;
        if (status === "Rejected") return 3;
        return 4;
    };

    let priorityA = getPriority(a.status);
    let priorityB = getPriority(b.status);

    // ✅ First sort by status priority
    if (priorityA !== priorityB) {
        return priorityA - priorityB;
    }

    // ✅ Then sort by match %
    return Number(b.match || 0) - Number(a.match || 0);
});
        if (myApplicants.length === 0) {
            container.innerHTML = "<p>No applicants yet</p>";
            return;
        }

        myApplicants.forEach(app => {

    let job = jobs.find(j => String(j._id) === String(app.jobId));

    let div = document.createElement("div");
div.className = "app-card";

if (highlightId && app._id === highlightId) {
    div.classList.add("highlight-app");
}

    let buttons = "";
if (app.status === "Applied") {
   // only show Screening + Reject
}
// ✅ FINAL STATES
if (app.status === "Selected") {
    buttons = `<button disabled class="accepted-btn">Selected ✔</button>`;
}
else if (app.status === "Rejected") {
    buttons = `<button disabled class="rejected-btn">Rejected ❌</button>`;
}

// 🟢 APPLIED STAGE
else if (app.status === "Applied") {
    buttons = `

        <button class="view-btn" onclick="goToInterview('${app._id}')">
            Interview
        </button>

        <button class="reject-btn" onclick="updateStatus('${app._id}','Rejected')">
            Reject
        </button>
    `;
}

// 🔵 SCREENING / INTERVIEW STAGE
else if (app.status === "Screening" || app.status === "Interview") {
    buttons = `
        <button class="accept-btn" onclick="updateStatus('${app._id}','Selected')">
            Select
        </button>

        <button class="reject-btn" onclick="updateStatus('${app._id}','Rejected')">
            Reject
        </button>
    `;
setTimeout(() => {
    let el = document.querySelector(".highlight-app");
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        localStorage.removeItem("highlightApplicantId");
    }
}, 200);

    }
    let jobSkills = (job?.skills || "").toLowerCase().split(",");
let userSkills = Array.isArray(app.skills)
    ? app.skills.map(s => s.toLowerCase())
    : (app.skills || "").toLowerCase().split(",");

let matched = jobSkills.filter(skill => 
    userSkills.includes(skill.trim())
);

let missing = jobSkills.filter(skill => 
    !userSkills.includes(skill.trim())
);
    // 🔥 USE buttons HERE
    div.innerHTML = `
    <div class="app-header">
        <h3>${app.name}</h3>
        <span class="status ${app.status.toLowerCase()}">
    ${
        app.status === "Interview" 
        ? `Interview ` 
        : app.status
    }
</span>
    </div>

    <p><b>Email:</b> ${app.email}</p>
    <p><b>Job:</b> ${job ? job.title : "N/A"}</p>
    <p><b>Highest Qualification:</b> ${app.degree}</p>

    <p><b>Experience:</b> ${app.experience || 0} years</p>

    <!-- 🔥 MATCH -->
    <p><b>Match(“Match score is calculated based on the candidate’s skills and experience.”):</b> ${Number(app.match || 0).toFixed(1)}%</p>
    ${app.interviewDate ? `
<p style="color:#38bdf8;">
    Interview: ${new Date(app.interviewDate).toLocaleString()}
</p>
` : ""}
    <!-- 🔥 PROGRESS BAR -->
    <div style="background:#1e293b; border-radius:8px; margin:10px 0;">
        <div style="
            width:${Number(app.match || 0)}%;
            background:#22c55e;
            padding:6px;
            border-radius:8px;
            text-align:center;
            color:white;">
            ${Number(app.match || 0).toFixed(0)}%
        </div>
    </div>

    <!-- 🔥 SKILLS -->
    <p><b>Skills:</b> ${Array.isArray(app.skills) ? app.skills.join(", ") : app.skills}</p>

    <p style="color:#22c55e;">✔ ${matched.join(", ") || "None"}</p>
    <p style="color:#ef4444;">❌ ${missing.join(", ") || "None"}</p>

    <div class="actions">
        ${buttons}
    </div>

    ${
        app.resume
        ? `<a href="https://hirex-backend-sio8.onrender.com/${app.resume}" target="_blank" class="resume-btn">
    View Resume
</a>`
        : ""
    }
`;

    container.appendChild(div);
});
    })
    .catch(err => {
        console.log(err);
    });
}
function closeJob(jobId) {

    console.log("Clicked Close:", jobId); // 🔥 MUST SHOW

    if (!confirm("Close this job?")) return;

    fetch(`https://hirex-backend-sio8.onrender.com/close-job/${jobId}`, {
        method: "PUT"
    })
    .then(res => {
        console.log("Response received");
        return res.json();
    })
    .then(data => {
        console.log("DATA:", data);

        showToast("Job closed!");

        loadMyJobs();
    })
    .catch(err => {
        console.log("ERROR:", err);
        showToast("Failed to close job");
    });
}
// 🔓 LOGOUT
function logout() {
    localStorage.clear();
    window.location.replace("employee.html"); // ✅ FIXED
}

    let user = JSON.parse(localStorage.getItem("loggedInUser"));

    if (!user) {
        // redirect if not logged in
        window.location.href = "login.html";
    } else {
        let name = user.firstName || "Employer";

        document.getElementById("welcomeText").innerText =
            `Welcome ${name} 👋`;
    }
function goToInterview(appId) {
    localStorage.setItem("selectedAppId", appId);
    window.location.href = "interview.html";
}
function navigateEmp(section, el) {

    showSection(section);

    // update active tab
    document.querySelectorAll(".bottom-nav .nav-item")
        .forEach(item => item.classList.remove("active"));

    el.classList.add("active");
}