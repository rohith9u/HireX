const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const bcrypt = require("bcrypt");
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
        process.exit(1); // 🔥 important
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
    resume: String   // ✅ ADD THIS
});
const jobSchema = new mongoose.Schema({
    title: String,
    company: String,
    location: String,
    salary: String,
    domain: {
    type: String,
    required: true
},
    jobType: String,
    experience: String,
    skills: String,
    description: String,
    postedBy: String,

    status: {
        type: String,
        default: "active"   // 🔥 VERY IMPORTANT
    }

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
    interviewDate: { type: String, default: null } // 🔥 NEW
});

const Application = mongoose.model("Application", applicationSchema);
app.get("/profile/:email", async (req, res) => {
    try {
        const email = req.params.email.trim().toLowerCase();

        console.log("Searching:", email);

        const user = await User.findOne({
            email: { $regex: new RegExp(`^${email}$`, "i") }
        }).select("-password");

        console.log("User found:", user);

        if (!user) {
            return res.json({ error: "User not found" });
        }

        res.json(user);
    } catch (err) {
        console.log(err);
        res.json({ error: "Server error" });
    }
});
app.use("/uploads", express.static("uploads"));

// ==========================
// 🔥 REGISTER
// ==========================
app.post("/register", async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            contact,
            city,
            gender,
            type,
            role
        } = req.body;

        // 🔥 REQUIRED FIELD CHECK
        if (!firstName || !lastName || !email || !password || !contact || !city) {
            return res.json({ message: "All fields are required ❌" });
        }

        // 🔥 EMAIL FORMAT CHECK
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.json({ message: "Invalid email format ❌" });
        }

        // 🔥 REQUIRE GENDER
        if (!gender) {
            return res.json({ message: "Please select gender ❌" });
        }

        // 🔥 REQUIRE ROLE
        if (!role) {
            return res.json({ message: "Please select role ❌" });
        }

        // 🔥 CHECK EXISTING USER
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ message: "User already exists" });
        }

        // 🔐 HASH PASSWORD
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword, // ✅ store hashed password
            contact,
            city,
            gender,
            type,
            role
        });

        await newUser.save();

        res.json({ message: "User registered successfully" });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});
app.post("/google-login", async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;

        let user = await User.findOne({ email });

        let isNewUser = false;

        if (!user) {
            isNewUser = true;

            user = new User({
                firstName,
                lastName,
                email,
                role: "",     // 🔥 VERY IMPORTANT
                city: "",
                gender: ""
            });

            await user.save();
        }

        res.json({
            message: "Google login success",
            user,
            isNewUser
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error" });
    }
});
// ==========================
// 🔥 LOGIN
// ==========================
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "hirex78@gmail.com",
        pass: "cmanrfycarjwdymh"
    }
});

function sendMail(to, subject, text) {
    console.log("🚀 sendMail CALLED for:", to);

    transporter.sendMail({
        from: "HireX <hirex78@gmail.com>",
        to,
        subject,
        text
    }, (err, info) => {
        if (err) {
            console.log("❌ MAIL ERROR:", err);
        } else {
            console.log("✅ MAIL SENT:", info.response);
        }
    });
}


app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // ✅ find user by email only
        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ message: "Invalid credentials" });
        }

        // 🔥 compare hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.json({ message: "Invalid credentials" });
        }

        // ✅ success
        res.json({
            message: "Login successful",
            user: user
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});
const multer = require("multer");
const path = require("path");

// ✅ STEP 1: storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
    let ext = path.extname(file.originalname);

    // 🔥 user custom name OR fallback
    let customName = req.body.fileName 
        ? req.body.fileName.replace(/\s+/g, "_") 
        : "resume";

    cb(null, customName + "-" + Date.now() + ext);
}
});

// ✅ STEP 2: upload (THIS WAS MISSING / WRONG PLACE)
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {

        // ✅ allow only PDF
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files allowed ❌"), false);
        }
    }
});


// ✅ STEP 3: NOW use upload
app.post("/update-profile", async (req, res) => {
    try {
        const {
            email,
            firstName,
            lastName,
            contact,
            city,
            gender,
            type,
            role
        } = req.body;

        const updatedUser = await User.findOneAndUpdate(
            { email },
            {
                firstName,
                lastName,
                contact,
                city,
                gender,
                type,
                role
            },
            { new: true }
        );

        res.json({ message: "Updated successfully", user: updatedUser });

    } catch (err) {
        console.log(err);
        res.json({ error: "Update failed" });
    }
});



app.put("/close-job/:id", async (req, res) => {
    try {
        await Job.findByIdAndUpdate(req.params.id, {
            status: "closed"
        });

        res.json({ message: "Job closed" });
    } catch (err) {
        res.json({ error: "Failed to close job" });
    }
});
// ==========================
// 🔥 POST JOB
// ==========================

app.get("/jobs", async (req, res) => {
    try {
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.json(jobs);
    } catch (err) {
        res.json({ error: "Failed to fetch jobs" });
    }
});
app.post("/post-job", async (req, res) => {
    try {
        console.log("REQ BODY:", req.body); // 🔥 debug

        const {
            title,
            company,
            location,
            salary,
            jobType,
            domain,
            experience,
            skills,
            description,
            email,
            status
        } = req.body;

        // ✅ validation (FIXED)
        if (!title || !company || !location || !salary || !jobType || !domain || !experience || !skills || !description || !email) {
            return res.json({ error: "All fields are required" });
        }

        const existingJob = await Job.findOne({
    title: new RegExp(`^${title}$`, "i"),
    company: new RegExp(`^${company}$`, "i"), // 🔥 ADD THIS
    postedBy: email
});

        if (existingJob) {
            return res.json({ error: "Job already posted" });
        }

        const newJob = new Job({
            title,
            company,
            location,
            salary,
            jobType,
            domain,
            experience,
            skills,
            description,
            postedBy: email,
            status: "active"
        });

        await newJob.save();

        res.json({ message: "Job posted successfully" });

    } catch (err) {
        console.log("ERROR:", err); // 🔥 check terminal
        res.json({ error: "Server error" });
    }
});
// ==========================
// 🔥 GET APPLICATIONS
// ==========================
app.get("/applications", async (req, res) => {
    const applications = await Application.find();
    res.json(applications);
});

app.post("/update-status", async (req, res) => {
    try {
        const { appId, status } = req.body;

        const updatedApp = await Application.findByIdAndUpdate(
            appId,
            { status },
            { new: true }
        );

        // ✅ FIX: check null
        if (!updatedApp) {
            return res.json({ error: "Application not found" });
        }

        // ✅ MAIL
        if (status === "Selected") {
            sendMail(
                updatedApp.email,
                "Congratulations 🎉",
                "You have been selected!",
                "For more details visit our website......",
                "- HireX Team`"
            );
        }

        if (status === "Rejected") {
            sendMail(
                updatedApp.email,
                "Application Update",
                "Sorry, you were not selected.",
                "For more details visist our website......",
                "- HireX Team`"
            );
        }

        res.json({ message: "Status updated" });

    } catch (err) {
        console.log(err);
        res.json({ error: "Update failed" });
    }
});


app.post("/schedule-interview", async (req, res) => {
    try {
        const { appId, interviewDate } = req.body;

        const updatedApp = await Application.findByIdAndUpdate(
            appId,
            {
                status: "Interview",
                interviewDate
            },
            { new: true }
        );

        // ✅ MAIL
        sendMail(
    updatedApp.email,
    "Interview Scheduled",
    `Your interview is scheduled on: ${interviewDate}`
);

        res.json({ message: "Interview scheduled ✅" });

    } catch (err) {
        console.log(err);
        res.json({ error: "Interview scheduling failed" });
    }
});
app.post("/apply-job", upload.single("resume"), async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            city,
            degree,
            experience,
            skills,
            jobId,
            match
        } = req.body;

        const resumePath = req.file ? req.file.path : "";

        const alreadyAccepted = await Application.findOne({
            jobId,
            status: "Selected"
        });

        if (alreadyAccepted) {
            return res.json({ error: "This job position is already filled" });
        }

        const existing = await Application.findOne({ email, jobId });

        if (existing && existing.status !== "Rejected") {
            return res.json({ error: "You have already applied for this job" });
        }

        let parsedSkills = typeof skills === "string"
            ? skills.split(",").map(s => s.trim().toLowerCase())
            : skills;

        let parsedExp = parseInt(experience) || 0;

        const newApp = new Application({
            name,
            email,
            phone,
            city,
            degree,
            experience: parsedExp,
            skills: parsedSkills,
            jobId,
            resume: resumePath,
            status: "Applied",
            interviewDate: null,
            match: Number(match) || 0
        });

        await newApp.save();

        // ✅ SEND MAIL
        sendMail(
            email,
            "Application Received - HireX",
            `Hello ${name},

Your application has been successfully submitted 

We will update you soon.

- HireX Team`
        );

        res.json({ message: "Application submitted successfully!" });

    } catch (err) {
        console.log(err);
        res.json({ error: "DB save failed" });
    }
});



// ==========================
// 🔥 UPDATE STATUS
// ==========================


// ==========================
// 🔥 TEST ROUTE
// ==========================
app.get("/", (req, res) => {
    res.send("Backend running 🚀");
});

// ==========================
// 🔥 START SERVER
// ==========================

app.get("/my-stats/:email", async (req, res) => {
    try {
        const email = req.params.email;

        const jobCount = await Job.countDocuments({ postedBy: email });

        const jobs = await Job.find({ postedBy: email });
        const jobIds = jobs.map(j => j._id);

        const appCount = await Application.countDocuments({
            jobId: { $in: jobIds }
        });

        res.json({
            jobsPosted: jobCount,
            applicants: appCount
        });

    } catch (err) {
        console.log(err);
        res.json({ error: "Failed to fetch stats" });
    }
});