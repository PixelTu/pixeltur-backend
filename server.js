const WebSocket = require("ws");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const wss = new WebSocket.Server({ port: process.env.PORT || 3000 });

async function loadBoard(){
  const res = await pool.query("SELECT x,y,color FROM pixels");
  return res.rows;
}

wss.on("connection", async (ws) => {
  const board = await loadBoard();
  ws.send(JSON.stringify({ type: "init", board }));

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg);
    if(data.type === "place"){
      await pool.query(
        "INSERT INTO pixels (x,y,color) VALUES ($1,$2,$3) ON CONFLICT (x,y) DO UPDATE SET color=$3",
        [data.x, data.y, data.color]
      );
      wss.clients.forEach(client => {
        if(client.readyState === WebSocket.OPEN){
          client.send(JSON.stringify({ type:"update", x:data.x, y:data.y, color:data.color }));
        }
      });
    }
  });
});