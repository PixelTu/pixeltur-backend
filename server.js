const WebSocket = require("ws");
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

// 100x100 grid
const gridSize = 100;
let board = Array.from({ length: gridSize }, () =>
  Array.from({ length: gridSize }, () => "white")
);

wss.on("connection", ws => {
  ws.send(JSON.stringify({ type: "init", board }));

  ws.on("message", message => {
    const data = JSON.parse(message);
    if (data.type === "place") {
      const { x, y, color } = data;
      board[y][x] = color;

      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "update", x, y, color }));
        }
      });
    }
  });
});

console.log("PixelTur sunucusu çalışıyor, port:", PORT);