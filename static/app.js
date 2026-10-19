// Voice Notes AI - Frontend Logic
const STORAGE_KEY = "voice_notes_ai_notes";
const API_KEY_STORAGE = "voice_notes_xai_key";

let notes = [];
let mediaRecorder = null;
let audioChunks = [];
let recognition = null;
let isRecording = false;
let apiKey = localStorage.getItem(API_KEY_STORAGE) || "";

// Elements
const noteInput = document.getElementById("noteInput");
const recordBtn = document.getElementById("recordBtn");
const imageInput = document.getElementById("imageInput");
const saveBtn = document.getElementById("saveBtn");
const notesList = document.getElementById("notesList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const apiKeyInput = document.getElementById("apiKey");
const saveSettings = document.getElementById("saveSettings");
const modeStatus = document.getElementById("modeStatus");
const recordingIndicator = document.getElementById("recordingIndicator");
const processing = document.getElementById("processing");

// Init
document.addEventListener("DOMContentLoaded", () => {
  loadNotes();
  apiKeyInput.value = apiKey;
  updateModeStatus();
  renderNotes();

  settingsBtn.onclick = () => settingsPanel.classList.toggle("hidden");
  saveSettings.onclick = saveApiKey;
  recordBtn.onclick = toggleRecording;
  imageInput.onchange = handleImageUpload;
  saveBtn.onclick = saveCurrentNote;
  searchInput.oninput = renderNotes;
  noteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveCurrentNote();
  });
});

function updateModeStatus() {
  if (apiKey) {
    modeStatus.textContent = "Chế độ: AI Grok (chính xác cao)";
    modeStatus.style.color = "#10b981";
  } else {
    modeStatus.textContent = "Chế độ: Miễn phí (Web Speech + Tesseract)";
    modeStatus.style.color = "#f59e0b";
  }
}

function saveApiKey() {
  apiKey = apiKeyInput.value.trim();
  localStorage.setItem(API_KEY_STORAGE, apiKey);
  updateModeStatus();
  settingsPanel.classList.add("hidden");
  alert(apiKey ? "Đã lưu API Key!" : "Đã xóa API Key, dùng chế độ miễn phí.");
}

function loadNotes() {
  const saved = localStorage.getItem(STORAGE_KEY);
  notes = saved ? JSON.parse(saved) : [];
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function renderNotes() {
  const query = searchInput.value.toLowerCase();
  const filtered = notes.filter(n => 
    n.content.toLowerCase().includes(query) || 
    (n.type && n.type.toLowerCase().includes(query))
  );

  notesList.innerHTML = "";
  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  filtered.slice().reverse().forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card";
    const date = new Date(note.timestamp).toLocaleString("vi-VN");
    const typeLabel = note.type === "voice" ? "🎙️ Giọng nói" : note.type === "image" ? "🖼️ Hình ảnh" : "✍️ Text";

    card.innerHTML = `
      <div class="note-meta">
        <span>${date}</span>
        <span class="note-type">${typeLabel}</span>
      </div>
      <div class="note-content">${escapeHtml(note.content)}</div>
      <div class="note-actions">
        <button onclick="editNote('${note.id}')">Sửa</button>
        <button class="delete" onclick="deleteNote('${note.id}')">Xóa</button>
      </div>
    `;
    notesList.appendChild(card);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function saveCurrentNote() {
  const content = noteInput.value.trim();
  if (!content) return;

  const note = {
    id: Date.now().toString(),
    content,
    type: "text",
    timestamp: Date.now()
  };
  notes.push(note);
  saveNotes();
  noteInput.value = "";
  renderNotes();
}

window.editNote = function(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  noteInput.value = note.content;
  deleteNote(id, false);
  noteInput.focus();
};

window.deleteNote = function(id, confirm = true) {
  if (confirm && !window.confirm("Xóa ghi chú này?")) return;
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  renderNotes();
};

// ===== Voice Recording =====
async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    if (apiKey) {
      // Use MediaRecorder for high quality + Grok STT
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = processAudioWithGrok;
      mediaRecorder.start();
      isRecording = true;
      recordBtn.classList.add("recording");
      recordBtn.querySelector(".label").textContent = "Dừng";
      recordingIndicator.classList.remove("hidden");
    } else {
      // Free mode: Web Speech API
      startWebSpeech();
    }
  } catch (err) {
    alert("Không thể truy cập micro: " + err.message);
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
  }
  if (recognition) {
    recognition.stop();
  }
  isRecording = false;
  recordBtn.classList.remove("recording");
  recordBtn.querySelector(".label").textContent = "Ghi âm";
  recordingIndicator.classList.add("hidden");
}

function startWebSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Trình duyệt không hỗ trợ Web Speech API. Hãy dùng Chrome hoặc nhập API Key.");
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "vi-VN";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    noteInput.value = transcript;
  };

  recognition.onend = () => {
    if (isRecording) recognition.start();
  };

  recognition.start();
  isRecording = true;
  recordBtn.classList.add("recording");
  recordBtn.querySelector(".label").textContent = "Dừng";
  recordingIndicator.classList.remove("hidden");
}

async function processAudioWithGrok() {
  processing.classList.remove("hidden");
  const blob = new Blob(audioChunks, { type: "audio/webm" });
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");
  formData.append("api_key", apiKey);
  formData.append("language", "vi");

  try {
    const res = await fetch("/api/transcribe", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Lỗi transcribe");
    
    const note = {
      id: Date.now().toString(),
      content: data.text || "(Không nhận diện được)",
      type: "voice",
      timestamp: Date.now()
    };
    notes.push(note);
    saveNotes();
    renderNotes();
    noteInput.value = data.text || "";
  } catch (err) {
    alert("Lỗi xử lý giọng nói: " + err.message);
  } finally {
    processing.classList.add("hidden");
  }
}

// ===== Image Recognition =====
async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  processing.classList.remove("hidden");

  try {
    let content = "";
    if (apiKey) {
      // Grok Vision
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("prompt", "Trích xuất toàn bộ văn bản có trong ảnh. Sau đó mô tả ngắn gọn nội dung chính bằng tiếng Việt, rõ ràng và dễ đọc. Nếu có bảng hoặc danh sách thì giữ format.");

      const res = await fetch("/api/vision", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Lỗi vision");
      content = data.text;
    } else {
      // Free Tesseract OCR
      const result = await Tesseract.recognize(file, "vie+eng", {
        logger: m => console.log(m)
      });
      content = result.data.text || "(Không đọc được text)";
    }

    const note = {
      id: Date.now().toString(),
      content: content.trim(),
      type: "image",
      timestamp: Date.now()
    };
    notes.push(note);
    saveNotes();
    renderNotes();
    noteInput.value = content;
  } catch (err) {
    alert("Lỗi xử lý ảnh: " + err.message);
  } finally {
    processing.classList.add("hidden");
    imageInput.value = "";
  }
}
