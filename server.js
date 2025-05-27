const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ⬇️ 클라이언트 소켓 저장소
const pcClients = new Map();      // PC: key = "ip:port"
const appClients = new Map();     // 모바일 앱: key = "ip:port"

io.on("connection", (socket) => {
  console.log("🔌 클라이언트 연결:", socket.id);

  // ✅ 등록 요청: 앱 또는 PC 모두 사용
  socket.on("register", ({ ip, port, role }) => {
    const key = `${ip}:${port}`;
    if (role === "pc") {
      pcClients.set(key, socket);
      console.log(`🖥 회사 PC 등록됨: ${key}`);
    } else if (role === "app") {
      appClients.set(key, socket);
      console.log(`📱 앱 등록됨: ${key}`);
    } else {
      console.warn("❓ 알 수 없는 역할:", role);
    }
  });

  // ✅ 앱 → 서버: 명령 전송 요청
  socket.on("command", ({ ip, port, command }) => {
    const key = `${ip}:${port}`;
    const pcSocket = pcClients.get(key);
    if (pcSocket) {
      console.log(`📤 명령 '${command}' 전달 → 회사PC ${key}`);
      pcSocket.emit("command", command);
    } else {
      console.log(`❌ 회사PC 연결 안 됨: ${key}`);
      socket.emit("error", `회사 PC (${key})와 연결되지 않았습니다.`);
    }
  });

  // ✅ PC → 서버: 응답 전송
  socket.on("response", ({ ip, port, message }) => {
    const key = `${ip}:${port}`;
    const appSocket = appClients.get(key);
    if (appSocket) {
      console.log(`📥 회사PC 응답 수신 → 앱 전달 (${key}): ${message}`);
      appSocket.emit("response", { message });
    } else {
      console.log(`⚠️ 앱 연결 없음, 응답 미전달 (${key})`);
    }
  });

  // ✅ 연결 종료 시 정리
  socket.on("disconnect", () => {
    for (const [key, s] of pcClients.entries()) {
      if (s.id === socket.id) {
        pcClients.delete(key);
        console.log(`🖥 연결 해제: ${key}`);
        break;
      }
    }

    for (const [key, s] of appClients.entries()) {
      if (s.id === socket.id) {
        appClients.delete(key);
        console.log(`📱 연결 해제: ${key}`);
        break;
      }
    }
  });
});

server.listen(3000, () => {
  console.log("🚀 Render 중계 서버 실행 중 (포트 3000)");
});
