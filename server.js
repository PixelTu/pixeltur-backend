const express = require("express");
const { Server } = require("ws");
const { Pool } = require("pg");

const app = express();
const server = app.listen(process.env.PORT || 3000);
const wss = new Server({ server });

// PostgreSQL bağlantısı
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Tabloyu hazırla (ilk çalıştırmada yoksa oluşturur)
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pixels (
      x INT,
      y INT,
      color TEXT,
      PRIMARY KEY (x, y)
    )
  `);
}
initDB();

// Piksel ekleme
async function setPixel(x, y, color) {
  await pool.query(
    `INSERT INTO pixels (x, y, color)
     VALUES ($1, $2, $3)
     ON CONFLICT (x, y) DO UPDATE SET color = $3`,
    [x, y, color]
  );
}

// Board’u yükleme
async function getBoard() {
  const result = await pool.query("SELECT x, y, color FROM pixels");
  return result.rows;
}

// WebSocket bağlantısı
wss.on("connection", async (ws) => {
  console.log("Yeni kullanıcı bağlandı");

  // Kullanıcı bağlanınca board’u gönder
  const board = await getBoard();
  ws.send(JSON.stringify({ type: "init", board }));

  // Mesajları dinle
  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "pixel") {
        await setPixel(data.x, data.y, data.color);

        // Tüm kullanıcılara gönder
        const update = JSON.stringify({ type: "pixel", x: data.x, y: data.y, color: data.color });
        wss.clients.forEach(client => {
          if (client.readyState === 1) client.send(update);
        });
      }
    } catch (err) {
      console.error("Mesaj hatası:", err);
    }
  });
});