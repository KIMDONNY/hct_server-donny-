const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const net = require("net");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 앱 소켓 ID ↔ 회사PC 소켓 매핑
const sessionMap = new Map();

io.on("connection", (socket) => {
  console.log("📱 앱 연결됨:", socket.id);

  socket.on("connect_pc", ({ ip, port }) => {
    console.log(`🔌 회사PC(${ip}:${port}) 접속 시도 from ${socket.id}`);

    // 기존 연결 종료
    if (sessionMap.has(socket.id)) {
      const { pcSocket } = sessionMap.get(socket.id);
      pcSocket.end();
      sessionMap.delete(socket.id);
    }

    // 회사PC로 TCP 연결 시도
    const pcSocket = net.createConnection({ host: ip, port: port }, () => {
      console.log("✅ 회사PC 연결 성공:", ip, port);
      socket.emit("connected", { success: true });
      sessionMap.set(socket.id, { pcSocket, ip, port });
    });

    pcSocket.on("data", (data) => {
      const message = data.toString();
      console.log(`📥 회사PC 응답 (${ip}:${port}): ${message}`);

      // 매핑된 앱 소켓에 전달
      socket.emit("response", message);
    });

    pcSocket.on("error", (err) => {
      console.log("❌ 회사PC 연결 실패:", err.message);
      socket.emit("connected", { success: false, error: err.message });
    });

    pcSocket.on("end", () => {
      console.log("📴 회사PC 연결 종료:", ip, port);
      socket.emit("disconnected");
      sessionMap.delete(socket.id);
    });
  });

  socket.on("command", (cmd) => {
    if (!sessionMap.has(socket.id)) {
      socket.emit("error", "회사PC와 연결되지 않음");
      return;
    }
    const { pcSocket } = sessionMap.get(socket.id);
    console.log(`📤 명령 전송 → 회사PC: ${cmd}`);
    pcSocket.write(cmd + "\n");
  });

  socket.on("disconnect", () => {
    console.log("❌ 앱 연결 종료:", socket.id);
    if (sessionMap.has(socket.id)) {
      const { pcSocket } = sessionMap.get(socket.id);
      pcSocket.end();
      sessionMap.delete(socket.id);
    }
  });
});

server.listen(3000, () => {
  console.log("🚀 중계 서버 실행 중 (포트 3000)");
});
