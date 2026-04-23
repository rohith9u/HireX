const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ==========================
// 🔥 CONNECT MONGODB
// ==========================
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected");
        app.listen(process.env.PORT || 5000, () => {
            console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
        });
    } catch (err) {
        console.log("❌ MongoDB Error:", err);
        process.exit(1);
    }
};

startServer();

// ==========================
// 🔥 MODELS
// ==========================

// ─── 1. USERS ────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    firstName:    { type: String, default: "" },
    lastName:     { type: String, default: "" },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:     { type: String, default: "" },
    role:         { type: String, enum: ["applicant", "recruiter", "user", "employer"], default: "applicant" },
    skills:       { type: [String], default: [] },
    experience:   { type: Number, default: 0 },
    profile: {
        resumeUrl:  { type: String, default: "" },
        education:  { type: String, default: "" },
        phone:      { type: String, default: "" }
    },
    contact:      { type: String, default: "" },
    city:         { type: String, default: "" },
    gender:       { type: String, default: "" },
    type:         { type: String, default: "" },
    profileImage: { type: String, default: "" },
    resume:       { type: String, default: "" }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

// ─── 2. JOBS ─────────────────────────────────────────────────
const jobSchema = new mongoose.Schema({
    title:          { type: String, required: true },
    company:        { type: String, required: true },
    location:       { type: String, required: true },
    salary:         { type: String, default: "" },
    requiredSkills: { type: [String], default: [] },
    skills:         { type: String, default: "" },
    jobType:        { type: String, enum: ["Full-Time", "Part-Time", "Internship"], default: "Full-Time" },
    domain:         { type: String, required: true },
    experience:     { type: String, default: "0" },
    description:    { type: String, default: "" },
    postedBy:       { type: String, default: "" },
    postedByUser:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status:         { type: String, enum: ["Open", "Closed", "active", "closed"], default: "Open" }
}, { timestamps: true });

const Job = mongoose.model("Job", jobSchema);

// ─── 3. APPLICATIONS ─────────────────────────────────────────
const applicationSchema = new mongoose.Schema({
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    jobId:          { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
        type: String,
        enum: ["Applied", "Interview", "Selected", "Rejected", "Screening"],
        default: "Applied"
    },
    matchScore:     { type: Number, default: 0 },
    match:          { type: Number, default: 0 },
    matchedSkills:  { type: [String], default: [] },
    missingSkills:  { type: [String], default: [] },
    resumeUrl:      { type: String, default: "" },
    resume:         { type: String, default: "" },
    name:           { type: String, default: "" },
    email:          { type: String, default: "" },
    phone:          { type: String, default: "" },
    city:           { type: String, default: "" },
    degree:         { type: String, default: "" },
    experience:     { type: Number, default: 0 },
    skills:         { type: [String], default: [] },
    interviewDate:  { type: String, default: null }
}, { timestamps: true });

const Application = mongoose.model("Application", applicationSchema);

// ─── 4. INTERVIEWS ───────────────────────────────────────────
const interviewSchema = new mongoose.Schema({
    applicationId:  { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    scheduledAt:    { type: Date, required: true },
    mode:           { type: String, enum: ["Online", "Offline"], default: "Online" },
    meetingLink:    { type: String, default: "" },
    status:         { type: String, enum: ["Scheduled", "Completed", "Cancelled"], default: "Scheduled" },
    feedback:       { type: String, default: "" }
}, { timestamps: true });

const Interview = mongoose.model("Interview", interviewSchema);

// ─── 5. NOTIFICATIONS ────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message:        { type: String, required: true },
    type:           { type: String, enum: ["Application", "Interview", "Selection", "Rejection", "General"], default: "General" },
    status:         { type: String, enum: ["Sent", "Pending", "Read"], default: "Pending" },
    relatedId:      { type: mongoose.Schema.Types.ObjectId, default: null }
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);

// ==========================
// 🔥 IN-MEMORY OTP STORE
// ==========================
const otpStore = new Map();

// ==========================
// 🔥 NODEMAILER SETUP
// ==========================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER || "hirex78@gmail.com",
        pass: process.env.MAIL_PASS || "cmanrfycarjwdymh"
    }
});

function sendMail(to, subject, text, htmlBody) {
    const mailOptions = {
        from: `HireX <${process.env.MAIL_USER || "hirex78@gmail.com"}>`,
        to, subject, text,
        html: htmlBody || undefined
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.log("❌ MAIL ERROR:", err.message);
        else console.log("✅ MAIL SENT:", info.response);
    });
}

function buildHtml(heading, body) {
    return `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0f1520;color:#f0eeff;padding:32px;border-radius:12px;">
        <h2 style="color:#a78bfa;margin-bottom:8px;">HireX</h2>
        <h3 style="color:#f0eeff;margin-top:0;">${heading}</h3>
        <p style="color:#b0aec8;line-height:1.7;">${body}</p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0;">
        <p style="color:#7c7a9a;font-size:12px;">— HireX Team | hirex78@gmail.com</p>
    </div>`;
}

// ==========================
// 🔥 NOTIFICATION HELPER
// ==========================
async function createNotification(userId, message, type = "General", relatedId = null) {
    try {
        if (!userId) return;
        await Notification.create({ userId, message, type, status: "Pending", relatedId });
    } catch (err) {
        console.log("Notification create error:", err.message);
    }
}

// ==========================
// 🔥 FILE UPLOAD SETUP
// ==========================
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        let ext = path.extname(file.originalname);
        let baseName = (req.body.name || "resume")
            .replace(/[^a-zA-Z0-9_\-]/g, "_")
            .substring(0, 40);
        cb(null, baseName + "-" + Date.now() + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") cb(null, true);
        else cb(new Error("Only PDF files allowed ❌"), false);
    }
});

app.use("/uploads", express.static("uploads"));

// ==========================
// 🔥 HEALTH CHECK
// ==========================
app.get("/", (req, res) => res.send("HireX Backend running ✅"));

// ==========================
// 🔥 REGISTER — STEP 1: SEND OTP
// ==========================
app.post("/register-otp", async (req, res) => {
    try {
        const { firstName, lastName, email, password, contact, city, gender, type, role } = req.body;

        if (!firstName || !lastName || !email || !password || !contact || !city)
            return res.json({ message: "All fields are required ❌" });

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email))
            return res.json({ message: "Invalid email format ❌" });

        if (!gender) return res.json({ message: "Please select gender ❌" });
        if (!role)   return res.json({ message: "Please select role ❌" });
        if (password.length < 6)
            return res.json({ message: "Password must be at least 6 characters ❌" });

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) return res.json({ message: "User already exists ❌" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000;
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ FIX: Normalise role — employer → recruiter, else → applicant
        const normalisedRole = (role === "employer" || role === "recruiter") ? "recruiter" : "applicant";

        otpStore.set(email.toLowerCase(), {
            otp, expiresAt,
            userData: {
                firstName, lastName,
                email: email.toLowerCase(),
                password: hashedPassword,
                contact, city, gender, type,
                role: normalisedRole
            }
        });

        sendMail(
            email,
            "HireX — Verify Your Email (OTP)",
            `Your OTP is: ${otp}. It expires in 10 minutes. Do not share it.`,
            buildHtml(
                "Verify Your Email",
                `Welcome to <b>HireX</b>! Use this OTP to complete registration:<br><br>
                <div style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#a78bfa;
                    text-align:center;padding:20px;background:rgba(108,99,255,0.1);
                    border-radius:8px;margin:16px 0;">${otp}</div>
                <br>Valid for <b>10 minutes</b>. Never share this code with anyone.`
            )
        );

        res.json({ message: "OTP sent to your email ✅" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================
// 🔥 REGISTER — STEP 2: VERIFY OTP
// ==========================
app.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.json({ message: "Email and OTP are required ❌" });

        const entry = otpStore.get(email.toLowerCase());
        if (!entry) return res.json({ message: "OTP not found. Please register again ❌" });

        if (Date.now() > entry.expiresAt) {
            otpStore.delete(email.toLowerCase());
            return res.json({ message: "OTP expired. Please register again ❌" });
        }

        if (entry.otp !== otp.trim()) return res.json({ message: "Invalid OTP ❌" });

        const newUser = new User({
            ...entry.userData,
            profile: { phone: entry.userData.contact || "" }
        });
        await newUser.save();
        otpStore.delete(email.toLowerCase());

        sendMail(
            email,
            "Welcome to HireX 🎉",
            `Hi ${entry.userData.firstName}, your HireX account is ready. Start exploring jobs now!`,
            buildHtml(
                "Welcome to HireX! 🎉",
                `Hi <b>${entry.userData.firstName}</b>,<br><br>
                Your account has been created successfully. You can now log in and start exploring opportunities.`
            )
        );

        // ✅ FIX: Return the role so frontend can redirect correctly after registration
        res.json({ message: "Registration successful ✅", role: entry.userData.role });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================
// 🔥 RESEND OTP
// ==========================
app.post("/resend-otp", async (req, res) => {
    try {
        const { email } = req.body;
        const entry = otpStore.get(email.toLowerCase());
        if (!entry) return res.json({ message: "Session expired. Please register again ❌" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        entry.otp = otp;
        entry.expiresAt = Date.now() + 10 * 60 * 1000;
        otpStore.set(email.toLowerCase(), entry);

        sendMail(email, "HireX — New OTP Code",
            `Your new OTP is: ${otp}. Valid for 10 minutes.`,
            buildHtml("New OTP Code",
                `Your new OTP:<br><br>
                <div style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#a78bfa;
                    text-align:center;padding:20px;background:rgba(108,99,255,0.1);
                    border-radius:8px;margin:16px 0;">${otp}</div>
                <br>Valid for <b>10 minutes</b>.`
            )
        );

        res.json({ message: "OTP resent ✅" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================
// 🔥 GOOGLE LOGIN  ← FIXED
// ==========================
app.post("/google-login", async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });

        let user = await User.findOne({ email: email.toLowerCase() });
        let isNewUser = false;

        if (!user) {
            // Brand-new user — create account
            isNewUser = true;
            user = new User({
                firstName: firstName || "",
                lastName:  lastName  || "",
                email:     email.toLowerCase(),
                role:      "applicant",
                city:      "",
                gender:    ""
            });
            await user.save();
        } else {
            // ✅ FIX: Existing Google-only users who never completed their profile
            // are treated as "new" so they are sent to complete-profile.html
            const isGoogleAccount  = !user.password || user.password === "";
            const isProfileMissing = !user.city || !user.gender;
            if (isGoogleAccount && isProfileMissing) {
                isNewUser = true;
            }
        }

        // Never expose password hash to frontend
        const userObj = user.toObject();
        delete userObj.password;

        res.json({ message: "Google login success", user: userObj, isNewUser });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================
// 🔥 LOGIN  ← FIXED
// ==========================
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.json({ message: "Email and password required" });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.json({ message: "Invalid credentials" });

        // Google-only accounts have no password
        if (!user.password) return res.json({ message: "Please use Google login for this account" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.json({ message: "Invalid credentials" });

        // ✅ FIX: Never expose password hash to frontend
        const userObj = user.toObject();
        delete userObj.password;

        res.json({ message: "Login successful", user: userObj });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================
// 🔥 PROFILE
// ==========================
app.get("/profile/:email", async (req, res) => {
    try {
        const email = req.params.email.trim().toLowerCase();
        const user = await User.findOne({ email }).select("-password");
        if (!user) return res.json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.json({ error: "Server error" });
    }
});

app.post("/update-profile", async (req, res) => {
    try {
        const { email, firstName, lastName, contact, city, gender, type, role } = req.body;
        if (!email) return res.json({ error: "Email required" });

        const updatedUser = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            {
                ...(firstName !== undefined && { firstName }),
                ...(lastName  !== undefined && { lastName }),
                ...(contact   !== undefined && { contact, "profile.phone": contact }),
                ...(city      !== undefined && { city }),
                ...(gender    !== undefined && { gender }),
                ...(type      !== undefined && { type }),
                ...(role      !== undefined && { role })
            },
            { new: true }
        ).select("-password");

        if (!updatedUser) return res.json({ error: "User not found" });
        res.json({ message: "Updated successfully", user: updatedUser });
    } catch (err) {
        console.log(err);
        res.json({ error: "Update failed" });
    }
});

// ==========================
// 🔥 COMPLETE PROFILE (after Google login / first login)
// ==========================
app.post("/complete-profile", async (req, res) => {
    try {
        const { email, contact, city, gender, type, role } = req.body;
        if (!email) return res.json({ error: "Email required" });

        // ✅ FIX: Properly normalise role so routing works on the frontend
        let normalisedRole = "applicant";
        if (role === "employer" || role === "recruiter") normalisedRole = "recruiter";
        else if (role === "applicant" || role === "user") normalisedRole = "applicant";

        const updatedUser = await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { contact, city, gender, type, role: normalisedRole, "profile.phone": contact || "" },
            { new: true }
        ).select("-password");

        if (!updatedUser) return res.json({ error: "User not found" });
        res.json({ message: "Profile saved", user: updatedUser });
    } catch (err) {
        console.log(err);
        res.json({ error: "Server error" });
    }
});

// ==========================
// 🔥 JOBS
// ==========================
app.get("/jobs", async (req, res) => {
    try {
        const jobs = await Job.aggregate([
            {
                $addFields: {
                    sortOrder: {
                        $cond: [{ $in: ["$status", ["active", "Open"]] }, 0, 1]
                    }
                }
            },
            { $sort: { sortOrder: 1, createdAt: -1 } },
            { $project: { sortOrder: 0 } }
        ]);
        res.json(jobs);
    } catch (err) {
        res.json({ error: "Failed to fetch jobs" });
    }
});

app.post("/post-job", async (req, res) => {
    try {
        const { title, company, location, salary, jobType, domain, experience, skills, description, email } = req.body;

        if (!title || !company || !location || !salary || !jobType || !domain || !experience || !skills || !description || !email)
            return res.json({ error: "All fields are required" });

        const existingJob = await Job.findOne({
            title:    { $regex: new RegExp(`^${title.trim()}$`, "i") },
            company:  { $regex: new RegExp(`^${company.trim()}$`, "i") },
            postedBy: email.toLowerCase(),
            status:   { $in: ["Open", "active"] }
        });
        if (existingJob) return res.json({ error: "Job already posted (active)" });

        const skillsArray = skills.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
        const recruiter   = await User.findOne({ email: email.toLowerCase() }).select("_id");

        const newJob = new Job({
            title, company, location, salary, jobType, domain, experience,
            skills, requiredSkills: skillsArray, description,
            postedBy: email.toLowerCase(),
            postedByUser: recruiter?._id || null,
            status: "Open"
        });
        await newJob.save();
        res.json({ message: "Job posted successfully" });
    } catch (err) {
        console.log("ERROR:", err);
        res.json({ error: "Server error" });
    }
});

app.put("/close-job/:id", async (req, res) => {
    try {
        const job = await Job.findByIdAndUpdate(req.params.id, { status: "Closed" }, { new: true });
        if (!job) return res.json({ error: "Job not found" });
        res.json({ message: "Job closed" });
    } catch (err) {
        res.json({ error: "Failed to close job" });
    }
});

// ==========================
// 🔥 APPLICATIONS
// ==========================
app.get("/applications", async (req, res) => {
    try {
        const applications = await Application.find().sort({ createdAt: -1 });
        res.json(applications);
    } catch (err) {
        res.json({ error: "Failed to fetch applications" });
    }
});

app.post("/apply-job", upload.single("resume"), async (req, res) => {
    try {
        const { name, email, phone, city, degree, experience, skills, jobId, match } = req.body;

        if (!name || !email || !jobId)
            return res.json({ error: "Required fields missing" });

        const resumePath = req.file ? req.file.path : "";

        const job = await Job.findById(jobId);
        if (!job) return res.json({ error: "Job not found" });
        if (job.status === "Closed" || job.status === "closed")
            return res.json({ error: "This job is closed" });

        const alreadyAccepted = await Application.findOne({ jobId, status: "Selected" });
        if (alreadyAccepted) return res.json({ error: "This job position is already filled" });

        const existing = await Application.findOne({ email: email.toLowerCase(), jobId });
        if (existing && existing.status !== "Rejected")
            return res.json({ error: "You have already applied for this job" });

        let parsedSkills = typeof skills === "string"
            ? skills.replace(/[\[\]"']/g, "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
            : (Array.isArray(skills) ? skills : []);
        let parsedExp   = parseInt(experience) || 0;
        let parsedMatch = parseFloat(match) || 0;

        const applicant = await User.findOne({ email: email.toLowerCase() }).select("_id");

        const newApp = new Application({
            userId: applicant?._id || null,
            name, email: email.toLowerCase(), phone, city, degree,
            experience: parsedExp,
            skills: parsedSkills,
            jobId,
            resume: resumePath,
            resumeUrl: resumePath,
            status: "Applied",
            interviewDate: null,
            match: parsedMatch,
            matchScore: parsedMatch
        });
        await newApp.save();

        if (applicant?._id) {
            await createNotification(
                applicant._id,
                `Your application for "${job.title}" at ${job.company} has been received.`,
                "Application",
                newApp._id
            );
        }

        sendMail(
            email,
            "Application Received — HireX ✅",
            `Hello ${name}, your application has been received. We will update you soon. — HireX Team`,
            buildHtml(
                "Application Received ✅",
                `Hello <b>${name}</b>,<br><br>
                Your application for <b>${job.title}</b> at <b>${job.company}</b> has been successfully submitted!<br><br>
                We will review your profile and get back to you soon.`
            )
        );

        res.json({ message: "Application submitted successfully!" });
    } catch (err) {
        console.log(err);
        if (err.code === "LIMIT_FILE_SIZE") return res.json({ error: "Resume file too large (max 5MB)" });
        res.json({ error: "Application submission failed" });
    }
});

// ==========================
// 🔥 UPDATE APPLICATION STATUS
// ==========================
app.post("/update-status", async (req, res) => {
    try {
        const { appId, status } = req.body;
        if (!appId || !status) return res.json({ error: "appId and status required" });

        const validStatuses = ["Applied", "Interview", "Selected", "Rejected", "Screening"];
        if (!validStatuses.includes(status)) return res.json({ error: "Invalid status" });

        const updatedApp = await Application.findByIdAndUpdate(appId, { status }, { new: true });
        if (!updatedApp) return res.json({ error: "Application not found" });

        const notifType = status === "Selected" ? "Selection"
                        : status === "Interview" ? "Interview"
                        : status === "Rejected"  ? "Rejection"
                        : "Application";

        if (updatedApp.userId) {
            const messages = {
                Selected:  `🎉 Congratulations! You have been selected for a position.`,
                Rejected:  `Your application status has been updated to Rejected.`,
                Interview: `📅 An interview has been scheduled for you.`
            };
            await createNotification(
                updatedApp.userId,
                messages[status] || `Your application status changed to ${status}.`,
                notifType,
                updatedApp._id
            );
        }

        if (status === "Selected") {
            sendMail(
                updatedApp.email,
                "Congratulations — You're Selected! 🎉",
                `Congratulations ${updatedApp.name}! You have been selected. — HireX Team`,
                buildHtml(
                    "You're Selected! 🎉",
                    `Congratulations <b>${updatedApp.name}</b>!<br><br>
                    You have been <b style="color:#22d3a5;">selected</b> for the position.<br><br>
                    Our team will reach out to you with further details. Welcome aboard! 🚀`
                )
            );
        }

        if (status === "Rejected") {
            sendMail(
                updatedApp.email,
                "Application Update — HireX",
                `Hello ${updatedApp.name}, thank you for applying. — HireX Team`,
                buildHtml(
                    "Application Status Update",
                    `Hello <b>${updatedApp.name}</b>,<br><br>
                    Thank you for applying through HireX. After careful consideration, your application was not selected at this time.<br><br>
                    Don't be discouraged — keep applying! 💪`
                )
            );
        }

        res.json({ message: "Status updated" });
    } catch (err) {
        console.log(err);
        res.json({ error: "Update failed" });
    }
});

// ==========================
// 🔥 SCHEDULE INTERVIEW
// ==========================
app.post("/schedule-interview", async (req, res) => {
    try {
        const { appId, interviewDate, mode = "Online", meetingLink = "" } = req.body;
        if (!appId || !interviewDate) return res.json({ error: "appId and interviewDate required" });

        const updatedApp = await Application.findByIdAndUpdate(
            appId,
            { status: "Interview", interviewDate },
            { new: true }
        );
        if (!updatedApp) return res.json({ error: "Application not found" });

        const interview = await Interview.create({
            applicationId: updatedApp._id,
            scheduledAt:   new Date(interviewDate),
            mode, meetingLink,
            status: "Scheduled"
        });

        if (updatedApp.userId) {
            await createNotification(
                updatedApp.userId,
                `📅 Interview scheduled for ${new Date(interviewDate).toLocaleString()}.`,
                "Interview",
                updatedApp._id
            );
        }

        sendMail(
            updatedApp.email,
            "Interview Scheduled — HireX 📅",
            `Hello ${updatedApp.name}, your interview is scheduled on: ${interviewDate}. — HireX Team`,
            buildHtml(
                "Interview Scheduled 📅",
                `Hello <b>${updatedApp.name}</b>,<br><br>
                Your interview has been scheduled for:<br><br>
                <div style="font-size:20px;font-weight:bold;color:#38bdf8;
                    padding:14px;background:rgba(56,189,248,0.1);border-radius:8px;margin:12px 0;">
                    📅 ${interviewDate}
                </div>
                ${meetingLink ? `<br>Meeting Link: <a href="${meetingLink}" style="color:#a78bfa;">${meetingLink}</a>` : ""}
                <br><br>Please be prepared and join on time. Good luck! 🎯`
            )
        );

        res.json({ message: "Interview scheduled ✅", interview });
    } catch (err) {
        console.log(err);
        res.json({ error: "Interview scheduling failed" });
    }
});

// ==========================
// 🔥 INTERVIEWS
// ==========================
app.post("/update-interview", async (req, res) => {
    try {
        const { interviewId, status, feedback } = req.body;
        const updated = await Interview.findByIdAndUpdate(
            interviewId,
            { ...(status && { status }), ...(feedback && { feedback }) },
            { new: true }
        );
        if (!updated) return res.json({ error: "Interview not found" });
        res.json({ message: "Interview updated", interview: updated });
    } catch (err) {
        res.json({ error: "Update failed" });
    }
});

app.get("/interviews/:appId", async (req, res) => {
    try {
        const interviews = await Interview.find({ applicationId: req.params.appId });
        res.json(interviews);
    } catch (err) {
        res.json({ error: "Failed to fetch interviews" });
    }
});

// ==========================
// 🔥 NOTIFICATIONS
// ==========================
app.get("/notifications/:userId", async (req, res) => {
    try {
        const notifications = await Notification.find({
            userId: req.params.userId,
            status: { $in: ["Pending", "Sent"] }
        }).sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (err) {
        res.json({ error: "Failed to fetch notifications" });
    }
});

app.post("/notifications/read/:id", async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { status: "Read" });
        res.json({ message: "Marked as read" });
    } catch (err) {
        res.json({ error: "Failed to update notification" });
    }
});

app.post("/notifications/read-all/:userId", async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.params.userId, status: { $ne: "Read" } },
            { status: "Read" }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        res.json({ error: "Failed to update notifications" });
    }
});

// ==========================
// 🔥 STATS (employer)
// ==========================
app.get("/my-stats/:email", async (req, res) => {
    try {
        const email = req.params.email.toLowerCase();
        const jobs  = await Job.find({ postedBy: email });
        const jobIds = jobs.map(j => j._id);
        const appCount = await Application.countDocuments({ jobId: { $in: jobIds } });
        res.json({ jobsPosted: jobs.length, applicants: appCount });
    } catch (err) {
        res.json({ error: "Failed to fetch stats" });
    }
});
