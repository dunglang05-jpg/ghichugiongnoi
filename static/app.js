// Voice Notes AI + Receipt Extractor
const STORAGE_KEY = "voice_notes_ai_notes";
const API_KEY_STORAGE = "voice_notes_xai_key";
const SHEET_WEBHOOK_KEY = "voice_notes_sheet_webhook";

let notes = [];
let apiKey = localStorage.getItem(API_KEY_STORAGE) || "";
let sheetWebhook = localStorage.getItem(SHEET_WEBHOOK_KEY) || "";
let lastReceiptData = null;

document.addEventListener("DOMContentLoaded", () => {
  loadNotes();
  renderNotes();
  const apiInput = document.getElementById("apiKey");
  const webhookInput = document.getElementById("sheetWebhook");
  if (apiInput) apiInput.value = apiKey;
  if (webhookInput) webhookInput.value = sheetWebhook;

  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    document.getElementById("settingsPanel")?.classList.toggle("hidden");
  });
  document.getElementById("saveSettings")?.addEventListener("click", () => {
    apiKey = apiInput?.value.trim() || "";
    localStorage.setItem(API_KEY_STORAGE, apiKey);
    alert("Đã lưu API Key");
  });
  document.getElementById("saveWebhook")?.addEventListener("click", () => {
    sheetWebhook = webhookInput?.value.trim() || "";
    localStorage.setItem(SHEET_WEBHOOK_KEY, sheetWebhook);
    alert(sheetWebhook ? "Đã lưu Webhook" : "Đã xóa Webhook");
  });

  document.querySelectorAll(".mode-tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".mode-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.mode;
      document.getElementById("notesMode")?.classList.toggle("hidden", mode !== "notes");
      document.getElementById("receiptMode")?.classList.toggle("hidden", mode !== "receipt");
    };
  });

  document.getElementById("receiptImage")?.addEventListener("change", handleReceipt);
});

function loadNotes() {
  notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}
function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
function renderNotes() {
  const list = document.getElementById("notesList");
  const empty = document.getElementById("emptyState");
  if (!list) return;
  list.innerHTML = "";
  if (notes.length === 0) { empty?.classList.remove("hidden"); return; }
  empty?.classList.add("hidden");
  [...notes].reverse().forEach(n => {
    const div = document.createElement("div");
    div.className = "note-card";
    div.innerHTML = `<div class="note-meta"><span>${new Date(n.timestamp).toLocaleString("vi-VN")}</span><span class="note-type">${n.type}</span></div><div class="note-content">${n.content.replace(/\n/g,"<br>")}</div>`;
    list.appendChild(div);
  });
}

async function handleReceipt(e) {
  const file = e.target.files[0];
  if (!file || !apiKey) return alert("Cần API Key");
  const proc = document.getElementById("receiptProcessing");
  const result = document.getElementById("receiptResult");
  proc?.classList.remove("hidden");
  result?.classList.add("hidden");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", apiKey);
  try {
    const res = await fetch("/api/extract-receipt", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Lỗi");
    lastReceiptData = data.data || {};
    displayReceipt(lastReceiptData);
    result?.classList.remove("hidden");
    notes.push({ id: Date.now().toString(), content: "🧾 " + JSON.stringify(lastReceiptData), type: "receipt", timestamp: Date.now() });
    saveNotes(); renderNotes();
  } catch (err) {
    alert("Lỗi: " + err.message);
  } finally {
    proc?.classList.add("hidden");
    e.target.value = "";
  }
}

function displayReceipt(data) {
  const el = document.getElementById("receiptResult");
  if (!el) return;
  const fields = [["ma_trong_o","Mã ô vuông"],["han_su_dung","Hạn sử dụng"],["nha_cung_cap","Nhà cung cấp"],["khach_hang","Khách hàng"],["ma_phieu","Mã phiếu"]];
  el.innerHTML = "<h3>Kết quả</h3>" + fields.map(([k,l]) => `<div class="result-item"><span class="result-label">${l}:</span> <strong>${data[k]||"—"}</strong></div>`).join("");
  if (!document.getElementById("sendToSheetBtn")) {
    const btn = document.createElement("button");
    btn.id = "sendToSheetBtn";
    btn.className = "btn primary";
    btn.style.marginTop = "12px";
    btn.textContent = "📤 Ghi vào Google Sheet";
    btn.onclick = async () => {
      if (!sheetWebhook) return alert("Chưa có Webhook URL");
      btn.disabled = true;
      try {
        const r = await fetch(sheetWebhook, { method: "POST", headers: {"Content-Type":"text/plain"}, body: JSON.stringify(lastReceiptData) });
        const j = await r.json();
        btn.textContent = j.success ? "✅ Đã ghi" : "❌ Lỗi";
      } catch { btn.textContent = "❌ Lỗi kết nối"; }
      setTimeout(() => { btn.disabled = false; btn.textContent = "📤 Ghi vào Google Sheet"; }, 2500);
    };
    el.appendChild(btn);
  }
}
