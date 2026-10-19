from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
import base64
from pathlib import Path

app = FastAPI(title="Voice Notes AI Proxy")
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def root():
    return FileResponse(static_dir / "index.html")

@app.post("/api/extract-receipt")
async def extract_receipt(file: UploadFile = File(...), api_key: str = Form(...)):
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    prompt = """Bạn là chuyên gia trích xuất dữ liệu từ biên nhận thanh toán Việt Nam. Trả về JSON:
{"ma_trong_o": "mã ô vuông", "han_su_dung": "DD/MM/YYYY", "nha_cung_cap": "nhà cung cấp", "khach_hang": "", "ma_phieu": "", "thoi_gian_xuat": "", "serial": "", "ghi_chu": ""}
Chỉ JSON."""
    try:
        content = await file.read()
        b64 = base64.b64encode(content).decode("utf-8")
        data_url = f"data:{file.content_type or 'image/jpeg'};base64,{b64}"
        payload = {"model": "grok-4.7", "input": [{"role": "user", "content": [{"type": "input_image", "image_url": data_url, "detail": "high"}, {"type": "input_text", "text": prompt}]}]} 
        async with httpx.AsyncClient(timeout=90.0) as client:
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            r = await client.post("https://api.x.ai/v1/responses", headers=headers, json=payload)
            r.raise_for_status()
            result = r.json()
            text = ""
            for item in result.get("output", []):
                if item.get("type") == "message":
                    for c in item.get("content", []):
                        if c.get("type") == "output_text": text += c.get("text", "")
            import json, re
            m = re.search(r'\{.*\}', text, re.DOTALL)
            if m:
                try: return {"success": True, "data": json.loads(m.group()), "raw": text}
                except: pass
            return {"success": False, "raw": text, "data": {}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
