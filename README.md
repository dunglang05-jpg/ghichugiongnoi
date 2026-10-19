# Voice Notes AI - Phần mềm ghi chú bằng giọng nói + nhận diện hình ảnh

Ứng dụng web hiện đại để ghi chú bằng giọng nói (Speech-to-Text) và nhận diện nội dung từ hình ảnh (OCR + AI Vision), tích hợp **xAI Grok API**.

## Tính năng chính

- **Ghi chú bằng giọng nói**:
  - Chế độ miễn phí: Web Speech API (hỗ trợ tiếng Việt `vi-VN`)
  - Chế độ AI: Grok Speech-to-Text (`grok-voice-transcribe-2.0`) – chính xác hơn, hỗ trợ nhiều ngôn ngữ
- **Nhận diện hình ảnh**:
  - Chế độ miễn phí: Tesseract.js (OCR client-side)
  - Chế độ AI: Grok Vision (`grok-4.7`) – trích xuất text + mô tả nội dung thông minh
- Lưu trữ ghi chú local (localStorage) – không mất dữ liệu
- Giao diện đẹp, dark mode, responsive
- Tìm kiếm, xóa, chỉnh sửa ghi chú
- Hỗ trợ tiếng Việt đầy đủ

## Cài đặt & Chạy

### Yêu cầu
- Python 3.10+
- API Key từ [console.x.ai](https://console.x.ai) (để dùng tính năng AI cao cấp)

### Các bước

```bash
# 1. Clone hoặc tải source
cd ghichugiongnoi

# 2. Tạo virtual environment (khuyến nghị)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Cài dependencies
pip install -r requirements.txt

# 4. Chạy server
python server.py
```

Mở trình duyệt: **http://localhost:8000**

### Sử dụng
1. Nhập **xAI API Key** vào ô Settings (lưu local, không gửi đi đâu khác).
2. **Ghi chú giọng nói**: Nhấn nút mic → nói → dừng → AI sẽ chuyển thành text.
3. **Nhận diện ảnh**: Kéo thả hoặc chọn ảnh → AI sẽ trích xuất nội dung.
4. Ghi chú được lưu tự động.

## Cấu trúc

```
ghichugiongnoi/
├── server.py          # Backend proxy (FastAPI) để tránh CORS
├── static/
│   ├── index.html     # Giao diện chính
│   ├── styles.css
│   └── app.js         # Logic frontend
├── requirements.txt
└── README.md
```

## Lưu ý bảo mật
- API Key chỉ được gửi đến server local của bạn, sau đó proxy sang xAI.
- Không lưu key trên server.
- Dữ liệu ghi chú chỉ lưu trên trình duyệt của bạn.

## API xAI sử dụng
- Speech-to-Text: `POST https://api.x.ai/v1/stt`
- Image Understanding: `POST https://api.x.ai/v1/responses` (model grok-4.7)

Chúc bạn ghi chú hiệu quả!
