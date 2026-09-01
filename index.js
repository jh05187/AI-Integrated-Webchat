var express = require("express");
var socket = require("socket.io");
var cors = require("cors");
var fs = require("fs");
var path = require("path");

function loadEnvFile() {
  var envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) return;

  var lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    var trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    var separator = trimmed.indexOf("=");
    if (separator === -1) return;

    var key = trimmed.slice(0, separator).trim();
    var value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

var app = express();
var PORT = 4000;
var OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
var OLLAMA_MODEL = process.env.OLLAMA_MODEL;

app.use(cors());
app.use(express.static(__dirname));

app.get("/config.js", (req, res) => {
  res.type("application/javascript");
  res.send(
    `window.APP_CONFIG = ${JSON.stringify({
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      },
    })};`
  );
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

var io = socket(server);

async function askOllama(prompt, handle) {
  if (!OLLAMA_BASE_URL || !OLLAMA_MODEL) {
    throw new Error("Ollama is not configured");
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        {
          role: "system",
          content:
            "You are a concise, helpful assistant inside a real-time web chat. Keep replies friendly and useful.",
        },
        {
          role: "user",
          content: `${handle || "A chat user"} asks: ${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || data.response || "I did not receive a response from Ollama.";
}

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("chat", (data) => {
    io.sockets.emit("chat", data);
  });

  socket.on("ollama", async (data) => {
    const prompt = data?.message?.trim();
    const handle = data?.handle?.trim() || "Anonymous";

    if (!prompt) return;

    io.sockets.emit("chat", { message: prompt, handle });
    io.sockets.emit("typing", `Ollama (${OLLAMA_MODEL})`);

    try {
      const reply = await askOllama(prompt, handle);
      io.sockets.emit("chat", {
        message: reply,
        handle: `Ollama (${OLLAMA_MODEL})`,
        ai: true,
      });
    } catch (error) {
      console.error("Ollama request failed:", error.message);
      socket.emit("ollama-error", {
        message:
          "Ollama is not responding. Make sure Ollama is running locally and the selected model is installed.",
      });
    }
  });

  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
