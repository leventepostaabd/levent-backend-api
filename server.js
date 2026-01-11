const express = require("express");
const fs = require("fs-extra");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_PATH = path.join(__dirname, "data", "shipRecords.json");
const upload = multer({ dest: path.join(__dirname, "uploads") });

/* -----------------------------------------
   LOGIN ENDPOINT (EKLENDİ – diğer kodlara dokunulmadı)
----------------------------------------- */
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  const validUsers = {
    // CLASS users
    "TL": "tl123",
    "BV": "bv222",
    "DNV": "dnv333",
    "ABS": "abs444",
    "LR": "lr555",
    "RINA": "rina666",
    "ClassNK": "nk111",

    // COMPANY users
    "TP Offshore": "company2025",
    "MEDLOG": "company2025",
    "Reederei NORD": "company2025",
    "Polaris": "company2025",
    "Levent Marine": "company2025",

    // ADMIN
    "ADMIN": "admin2025"
  };

  if (validUsers[username] && validUsers[username] === password) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false });
});

/* -----------------------------------------
   KAYITLARI GETİR
----------------------------------------- */
app.get("/api/getRecords", async (req, res) => {
  try {
    const data = await fs.readJson(DATA_PATH);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Kayıtlar okunamadı" });
  }
});

/* -----------------------------------------
   KAYIT EKLE
----------------------------------------- */
app.post("/api/saveRecord", async (req, res) => {
  try {
    const { company, record } = req.body;
    const data = await fs.readJson(DATA_PATH);

    if (!data[company]) data[company] = [];
    data[company].push(record);

    await fs.writeJson(DATA_PATH, data, { spaces: 2 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Kayıt eklenemedi" });
  }
});

/* -----------------------------------------
   KAYIT SİL
----------------------------------------- */
app.post("/api/deleteRecord", async (req, res) => {
  try {
    const { company, id } = req.body;
    const data = await fs.readJson(DATA_PATH);

    data[company] = data[company].filter(r => r.id !== id);

    await fs.writeJson(DATA_PATH, data, { spaces: 2 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Kayıt silinemedi" });
  }
});

/* -----------------------------------------
   PDF UPLOAD
----------------------------------------- */
app.post("/api/uploadCert", upload.single("pdf"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "PDF yüklenmedi" });

  const newName = req.file.originalname;
  const newPath = path.join(__dirname, "uploads", newName);

  fs.rename(req.file.path, newPath);
  res.json({ success: true, filename: newName });
});

/* -----------------------------------------
   PORT AYARI (RENDER UYUMLU)
----------------------------------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Backend çalışıyor: " + PORT);
});
