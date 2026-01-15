// redeploy test
const express = require("express");
const fs = require("fs-extra");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const QRCode = require("qrcode");

// BASE_URL sadece 1 kez tanımlanır
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/upload", express.static(path.join(__dirname, "upload")));

const DATA_PATH = path.join(__dirname, "data", "shipRecords.json");
const upload = multer({ dest: path.join(__dirname, "upload") });

/* -----------------------------------------
   LOGIN ENDPOINT
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
   KAYIT EKLE + QR ÜRET
----------------------------------------- */
app.post("/api/saveRecord", async (req, res) => {
  console.log("SAVE RECORD ENDPOINT ÇALIŞTI, BODY:", req.body); // ← EKLE
  try {
    const { company, record } = req.body;
    const data = await fs.readJson(DATA_PATH);

    if (!data[company]) data[company] = [];

    // 1) Benzersiz ID üret
    const newId = "REC-" + Date.now();

    // 2) Kısa URL oluştur
    const shortUrl = `${BASE_URL}/t/${newId}`;

    // 3) QR dosya adı
    const qrFilename = `qr-${newId}.png`;
    const qrFilePath = path.join(__dirname, "upload", qrFilename);

    // 4) QR üret
    await QRCode.toFile(qrFilePath, shortUrl, { width: 300 });

    // 5) Kaydı zenginleştir
    const finalRecord = {
      ...record,
      id: newId,
      qrFilename,
      qrUrl: `/upload/${qrFilename}`,
      shortUrl
    };

    data[company].push(finalRecord);

    await fs.writeJson(DATA_PATH, data, { spaces: 2 });

    console.log("DÖNEN finalRecord:", finalRecord); // ← EKLE
    res.json({ success: true, record: finalRecord });
  } catch (err) {
    console.error(err);
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
   QR → PDF YÖNLENDİRME (TEK VERSİYON)
----------------------------------------- */
app.get("/t/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readJson(DATA_PATH);

    let foundRecord = null;

    for (const company of Object.keys(data)) {
      const rec = data[company].find(r => r.id === id);
      if (rec) {
        foundRecord = rec;
        break;
      }
    }

    if (!foundRecord) {
      return res.status(404).send("Kayıt bulunamadı");
    }

    const pdfFilename = foundRecord.pdfFilename;
    if (!pdfFilename) {
      return res.status(404).send("Bu kayda bağlı PDF bulunamadı");
    }

    const pdfPath = path.join(__dirname, "upload", pdfFilename);

    const exists = await fs.pathExists(pdfPath);
    if (!exists) {
      return res.status(404).send("PDF dosyası bulunamadı");
    }

    res.sendFile(pdfPath);
  } catch (err) {
    console.error(err);
    res.status(500).send("Bir hata oluştu");
  }
});

/* -----------------------------------------
   PDF UPLOAD
----------------------------------------- */
app.post("/api/uploadCert", upload.single("pdf"), (req, res) => {
  console.log("UPLOAD ENDPOINT ÇALIŞTI");
  console.log("FILE:", req.file);

  if (!req.file) {
    return res.status(400).json({ error: "Dosya bulunamadı" });
  }

  const newName = req.file.originalname;
  const newPath = path.join(__dirname, "upload", newName);

  fs.rename(req.file.path, newPath, (err) => {
    if (err) {
      console.error("PDF taşınamadı:", err);
      return res.status(500).json({ error: "PDF taşınamadı" });
    }

    res.json({ success: true, filename: newName });
  });
});

/* -----------------------------------------
   QR ETİKET GÖRÜNÜMÜ
----------------------------------------- */
app.get("/label/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readJson(DATA_PATH);

    let foundRecord = null;

    for (const company of Object.keys(data)) {
      const rec = data[company].find(r => r.id === id);
      if (rec) {
        foundRecord = rec;
        break;
      }
    }

    if (!foundRecord) {
      return res.status(404).send("Kayıt bulunamadı");
    }

   const qrUrl = `${BASE_URL}/report.html?id=${foundRecord.id}`;
const qrImage = await QRCode.toDataURL(qrUrl);


  const html = `
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background: #f5f7fa;
    }

    .label {
      width: 220px; /* 58mm termal yazıcı uyumu */
      border: 1px solid #1a3d7c;
      border-radius: 10px;
      background: white;
      overflow: hidden;
      position: relative;
    }

    /* WATERMARK */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 28px;
      color: #1a3d7c;
      opacity: 0.06;
      font-weight: bold;
      pointer-events: none;
      white-space: nowrap;
    }

    /* ÜST BANT */
    .topBar {
      background: #1a3d7c;
      color: white;
      padding: 10px 0 6px 0;
      text-align: center;
    }

    .topBar img {
      height: 26px;
      filter: brightness(0) invert(1);
      vertical-align: middle;
      margin-right: 6px;
    }

    .brandLine {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 0.4px;
    }

    .scanText {
      font-size: 10px;
      margin-top: 2px;
      opacity: 0.9;
      letter-spacing: 0.5px;
    }

    /* QR ALANI */
    .qrArea {
      background: white;
      text-align: center;
      padding: 10px 0 4px 0;
      position: relative;
    }

    .qrArea img {
      width: 140px;
      height: 140px;
      z-index: 2;
      position: relative;
    }

    /* MÜHÜR */
    .seal {
      font-size: 10px;
      color: #1a3d7c;
      font-weight: bold;
      margin-top: 4px;
      opacity: 0.9;
      letter-spacing: 0.5px;
    }

    /* ALT BANT */
    .bottomBar {
      background: #1a3d7c;
      color: white;
      text-align: center;
      padding: 6px 0;
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    @media print {
      body { margin: 0; padding: 0; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .label { box-shadow: none; }
    }
  </style>

  <script>
    window.onload = () => {
      window.print();
    };
  </script>
</head>

<body>
  <div class="label">

    <div class="watermark">LMT</div>

    <div class="topBar">
      <div class="brandLine">
        <img src="https://www.leventmarinetech.com/assets/logo.png" />
        leventmarinetech.com
      </div>
      <div class="scanText">SCAN THE CODE FOR CERTIFICATE</div>
    </div>

    <div class="qrArea">
     <img src="${qrImage}" />
      <div class="seal">VERIFIED TEST RECORD</div>
    </div>

    <div class="bottomBar">
      SN: ${foundRecord.serial}
    </div>

  </div>
</body>
</html>
`;




    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Etiket oluşturulamadı");
  }
});

/* -----------------------------------------
   PORT AYARI
----------------------------------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Backend çalışıyor: " + PORT);
});
