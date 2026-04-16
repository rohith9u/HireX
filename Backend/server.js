const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// ==========================
// 🔥 CONNECT MONGODB
// ==========================
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected");
        app.listen(process.env.PORT || 5000, () => {
            console.log("🚀 Server running");
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
const User = mongoose.model("User", {
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    contact: String,
    city: String,
    gender: String,
    type: String,
    role: String,
    profileImage: String,
    resume: String
});

const jobSchema = new mongoose.Schema({
    title: String,
    company: String,
    location: String,
    salary: String,
    domain: { type: String, required: true },
    jobType: String,
    experience: String,
    skills: String,
    description: String,
    postedBy: String,
    status: { type: String, default: "active" }
}, { timestamps: true });

const Job = mongoose.model("Job", jobSchema);

const applicationSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    city: String,
    degree: String,
    experience: Number,
    skills: [String],
    jobId: String,
    resume: String,
    match: Number,
    status: { type: String, default: "Applied" },
    interviewDate: { type: String, default: null }
});

const Application = mongoose.model("Application", applicationSchema);

// ==========================
// 🔥 IN-MEMORY OTP STORE
// { email -> { otp, expiresAt, userData } }
// ==========================
const otpStore = new Map();

// ==========================
// 🔥 NODEMAILER SETUP (FIXED)
// ==========================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "hirex78@gmail.com",
        pass: "cmanrfycarjwdymh"   // Google App Password
    }
});

// ✅ FIXED sendMail — old version ignored extra args, causing silent failures
function sendMail(to, subject, text, htmlBody) {
    const mailOptions = {
        from: "HireX <hirex78@gmail.com>",
        to,
        subject,
        text,
        html: htmlBody || undefined
    };
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log("❌ MAIL ERROR:", err.message);
        } else {
            console.log("✅ MAIL SENT:", info.response);
        }
    });
}

// Reusable HTML email template
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
// 🔥 FILE UPLOAD SETUP
// ==========================
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => {
        let ext = path.extname(file.originalname);
        let customName = req.body.fileName
            ? req.body.fileName.replace(/\s+/g, "_")
            : "resume";
        cb(null, customName + "-" + Date.now() + ext);
    }
});

const upload = multer({
    storage,
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
// 🔥 STEP 1 — SEND OTP (new registration flow)
// Frontend calls this first. We validate, store userData + OTP, email the OTP.
// ==========================
app.post("/register-otp", async (req, res) => {
    try {
        const { firstName, lastName, email, password, contact, city, gender, type, role } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password || !contact || !city)
            return res.json({ message: "All fields are required ❌" });

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email))
            return res.json({ message: "Invalid email format ❌" });

        if (!gender) return res.json({ message: "Please select gender ❌" });
        if (!role)   return res.json({ message: "Please select role ❌" });
        if (password.length < 6)
            return res.json({ message: "Password must be at least 6 characters ❌" });

        // Duplicate check
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.json({ message: "User already exists ❌" });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

        // Hash password before storing in memory
        const hashedPassword = await bcrypt.hash(password, 10);
        otpStore.set(email.toLowerCase(), {
            otp,
            expiresAt,
            userData: { firstName, lastName, email, password: hashedPassword, contact, city, gender, type, role }
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
// 🔥 STEP 2 — VERIFY OTP & SAVE USER
// ==========================
app.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp)
            return res.json({ message: "Email and OTP are required ❌" });

        const entry = otpStore.get(email.toLowerCase());

        if (!entry)
            return res.json({ message: "OTP not found. Please register again ❌" });

        if (Date.now() > entry.expiresAt) {
            otpStore.delete(email.toLowerCase());
            return res.json({ message: "OTP expired. Please register again ❌" });
        }

        if (entry.otp !== otp.trim())
            return res.json({ message: "Invalid OTP ❌" });

        // OTP valid — save user to DB
        const newUser = new User(entry.userData);
        await newUser.save();
        otpStore.delete(email.toLowerCase());

        // Welcome email
        sendMail(
            email,
            "Welcome to HireX 🎉",
            `Hi ${entry.userData.firstName}, your HireX account is ready. Start exploring jobs now!`,
            buildHtml(
                "Welcome to HireX! 🎉",
                `Hi <b>${entry.userData.firstName}</b>,<br><br>
                Your account has been created successfully. You can now
                <a href="https://hirex-frontend.onrender.com/login.html" style="color:#a78bfa;">log in here</a>
                and start exploring opportunities.`
            )
        );

        res.json({ message: "Registration successful ✅" });

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

        if (!entry)
            return res.json({ message: "Session expired. Please register again ❌" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        entry.otp = otp;
        entry.expiresAt = Date.now() + 10 * 60 * 1000;
        otpStore.set(email.toLowerCase(), entry);

        sendMail(
            email,
            "HireX — New OTP Code",
            `Your new OTP is: ${otp}. Valid for 10 minutes.`,
            buildHtml(
                "New OTP Code",
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
// 🔥 GOOGLE LOGIN
// ==========================
app.post("/google-login", async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;
        let user = await User.findOne({ email });
        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            user = new User({ firstName, lastName, email, role: "user", city: "", gender: "" });
            await user.save();
        }

        res.json({ message: "Google login success", user, isNewUser });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error" });
    }
});

// ==========================
// 🔥 LOGIN
// ==========================
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.json({ message: "Invalid credentials" });

        res.json({ message: "Login successful", user });
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
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${email}$`, "i") }
        }).select("-password");
        if (!user) return res.json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.json({ error: "Server error" });
    }
});

app.post("/update-profile", async (req, res) => {
    try {
        const { email, firstName, lastName, contact, city, gender, type, role } = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { email },
            { firstName, lastName, contact, city, gender, type, role },
            { new: true }
        );
        res.json({ message: "Updated successfully", user: updatedUser });
    } catch (err) {
        res.json({ error: "Update failed" });
    }
});

// ==========================
// 🔥 JOBS — active jobs first, closed jobs last, newest first within each group
// ==========================
app.get("/jobs", async (req, res) => {
    try {
        const jobs = await Job.aggregate([
            {
                $addFields: {
                    sortOrder: { $cond: [{ $eq: ["$status", "active"] }, 0, 1] }
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
            title: new RegExp(`^${title}$`, "i"),
            company: new RegExp(`^${company}$`, "i"),
            postedBy: email
        });
        if (existingJob) return res.json({ error: "Job already posted" });

        const newJob = new Job({
            title, company, location, salary, jobType, domain, experience, skills, description,
            postedBy: email, status: "active"
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
        await Job.findByIdAndUpdate(req.params.id, { status: "closed" });
        res.json({ message: "Job closed" });
    } catch (err) {
        res.json({ error: "Failed to close job" });
    }
});

// ==========================
// 🔥 APPLICATIONS
// ==========================
app.get("/applications", async (req, res) => {
    const applications = await Application.find();
    res.json(applications);
});

app.post("/apply-job", upload.single("resume"), async (req, res) => {
    try {
        const { name, email, phone, city, degree, experience, skills, jobId, match } = req.body;
        const resumePath = req.file ? req.file.path : "";

        const alreadyAccepted = await Application.findOne({ jobId, status: "Selected" });
        if (alreadyAccepted) return res.json({ error: "This job position is already filled" });

        const existing = await Application.findOne({ email, jobId });
        if (existing && existing.status !== "Rejected")
            return res.json({ error: "You have already applied for this job" });

        let parsedSkills = typeof skills === "string"
            ? skills.split(",").map(s => s.trim().toLowerCase())
            : skills;
        let parsedExp = parseInt(experience) || 0;

        const newApp = new Application({
            name, email, phone, city, degree,
            experience: parsedExp,
            skills: parsedSkills,
            jobId, resume: resumePath,
            status: "Applied", interviewDate: null,
            match: Number(match) || 0
        });
        await newApp.save();

        // ✅ FIXED: proper 4-arg call
        sendMail(
            email,
            "Application Received — HireX ✅",
            `Hello ${name}, your application has been received. We will update you soon. — HireX Team`,
            buildHtml(
                "Application Received ✅",
                `Hello <b>${name}</b>,<br><br>
                Your application has been successfully submitted!<br><br>
                We will review your profile and get back to you soon. Keep an eye on your notifications.`
            )
        );

        res.json({ message: "Application submitted successfully!" });
    } catch (err) {
        console.log(err);
        res.json({ error: "DB save failed" });
    }
});

// ==========================
// 🔥 UPDATE STATUS — FIXED email args
// ==========================
app.post("/update-status", async (req, res) => {
    try {
        const { appId, status } = req.body;
        const updatedApp = await Application.findByIdAndUpdate(appId, { status }, { new: true });
        if (!updatedApp) return res.json({ error: "Application not found" });

        if (status === "Selected") {
            sendMail(
                updatedApp.email,
                "Congratulations — You're Selected! 🎉",
                `Congratulations ${updatedApp.name}! You have been selected. — HireX Team`,
                buildHtml(
                    "You're Selected! 🎉",
                    `Congratulations <b>${updatedApp.name}</b>!<br><br>
                    You have been <b style="color:#22d3a5;">selected</b> for the position you applied for.<br><br>
                    Our team will reach out to you with further details. Welcome aboard! 🚀`
                )
            );
        }

        if (status === "Rejected") {
            sendMail(
                updatedApp.email,
                "Application Update — HireX",
                `Hello ${updatedApp.name}, thank you for applying. Unfortunately you were not selected this time. — HireX Team`,
                buildHtml(
                    "Application Status Update",
                    `Hello <b>${updatedApp.name}</b>,<br><br>
                    Thank you for applying through HireX. After careful consideration, your application was not selected at this time.<br><br>
                    Don't be discouraged — there are many more opportunities waiting for you. Keep applying! 💪`
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
// 🔥 SCHEDULE INTERVIEW — FIXED email args
// ==========================
app.post("/schedule-interview", async (req, res) => {
    try {
        const { appId, interviewDate } = req.body;
        const updatedApp = await Application.findByIdAndUpdate(
            appId,
            { status: "Interview", interviewDate },
            { new: true }
        );

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
                <br>Please be prepared and join on time. Good luck! 🎯`
            )
        );

        res.json({ message: "Interview scheduled ✅" });
    } catch (err) {
        console.log(err);
        res.json({ error: "Interview scheduling failed" });
    }
});

// ==========================
// 🔥 STATS
// ==========================
app.get("/my-stats/:email", async (req, res) => {
    try {
        const email = req.params.email;
        const jobCount = await Job.countDocuments({ postedBy: email });
        const jobs = await Job.find({ postedBy: email });
        const jobIds = jobs.map(j => j._id);
        const appCount = await Application.countDocuments({ jobId: { $in: jobIds } });
        res.json({ jobsPosted: jobCount, applicants: appCount });
    } catch (err) {
        res.json({ error: "Failed to fetch stats" });
    }
});
