const { Server } = require("socket.io");
const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 연결된 클라이언트 저장용
const pcClients = {}; // key: "ip:port" → socket
const appClients = {}; // key: "ip:port" → socket

io.on("connection", (socket) => {
  console.log("🔗 클라이언트 연결됨", socket.id);

  socket.on("register", (data) => {
    const { ip, port, role } = data;
    const key = `${ip}:${port}`;

    if (role === "pc") {
      pcClients[key] = socket;
      console.log(`🖥️ 등록된 PC: ${key}`);
    } else if (role === "app") {
      appClients[key] = socket;
      console.log(`📱 등록된 APP: ${key}`);
    }
  });

  socket.on("command", (data) => {
    const { ip, port, command } = data;
    const key = `${ip}:${port}`;
    const target = pcClients[key];

    if (target) {
      console.log(`📨 명령 전송 → ${key}: ${command}`);
      target.emit("command", command);
    } else {
      console.log(`❌ 대상 PC 없음: ${key}`);
      if (command === "PING") {
        const app = appClients[key];
        if (app) {
          console.log(`↩️ PING 응답 반환 → ${key}`);
          app.emit("response", { message: "PING" });
        }
      }
    }
  });

  socket.on("response", (data) => {
    const { ip, port, message } = data;
    const key = `${ip}:${port}`;
    const target = appClients[key];

    if (target) {
      console.log(`📬 응답 전송 → ${key}: ${message}`);
      target.emit("response", { message });
    } else {
      console.log(`❌ 대상 APP 없음: ${key}`);
    }
  });

  socket.on("disconnect", () => {
    for (const key in pcClients) {
      if (pcClients[key] === socket) {
        delete pcClients[key];
        console.log(`🖥️ PC 연결 해제: ${key}`);
      }
    }
    for (const key in appClients) {
      if (appClients[key] === socket) {
        delete appClients[key];
        console.log(`📱 APP 연결 해제: ${key}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Render 중계 서버 실행 중 (포트 ${PORT})`);
});
