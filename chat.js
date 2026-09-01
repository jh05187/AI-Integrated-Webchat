const socket = io();
const message = document.getElementById("message");
const handle = document.getElementById("handle");
const sendBtn = document.getElementById("send");
const askOllamaBtn = document.getElementById("ask-ollama");
const output = document.getElementById("messages");
const feedback = document.getElementById("feedback");
let toxicityModel;
let db;

if (window.APP_CONFIG?.firebase?.apiKey) {
  const app = firebase.initializeApp(window.APP_CONFIG.firebase);
  db = firebase.firestore(app);
}

toxicity.load(0.8).then(model => {
  toxicityModel = model;
  loadRecentMessages();
});

async function filterMessage(text) {
  if (!toxicityModel) return text;
  const predictions = await toxicityModel.classify([text]);
  const toxic = predictions.some(p => p.results[0].match);
  return toxic ? "*****" : text;
}

async function loadRecentMessages() {
  if (!db) return;
  const snapshot = await db.collection("messages").orderBy("timestamp", "desc").limit(10).get();
  const messages = snapshot.docs.reverse().map(doc => doc.data());
  messages.forEach(msg => displayMessage(msg.handle, msg.message));
}

sendBtn.addEventListener("click", async () => {
  const msg = message.value.trim();
  const user = handle.value.trim();
  if (!msg || !user) return;
  const cleanMsg = await filterMessage(msg);
  socket.emit("chat", { message: cleanMsg, handle: user });
  if (db) {
    db.collection("messages").add({
    handle: user,
    message: cleanMsg,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
  message.value = "";
});

askOllamaBtn.addEventListener("click", async () => {
  const msg = message.value.trim();
  const user = handle.value.trim();
  if (!msg || !user) return;
  const cleanMsg = await filterMessage(msg);
  socket.emit("ollama", { message: cleanMsg, handle: user });
  message.value = "";
});

message.addEventListener("keypress", () => {
  socket.emit("typing", handle.value);
});

function displayMessage(sender, text) {
  feedback.innerHTML = "";
  const li = document.createElement("li");
  li.textContent = `${sender}: ${text}`;
  const isAi = sender.startsWith("Ollama");
  li.classList.add(isAi ? "ai" : sender === handle.value ? "you" : "other");
  output.appendChild(li);
  output.scrollTop = output.scrollHeight;
}

socket.on("chat", data => displayMessage(data.handle, data.message));
socket.on("typing", data => {
  feedback.innerHTML = `<em>${data} is typing...</em>`;
});
socket.on("ollama-error", data => {
  feedback.textContent = data.message;
});
