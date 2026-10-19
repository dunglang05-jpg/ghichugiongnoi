from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
import base64
import os
from pathlib import Path

app = FastAPI(title="Voice Notes AI Proxy")

# Serve static files
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def root():
    return FileResponse(static_dir / "index.html")

@app.post("/api/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    api_key: str = Form(...),
    language: str = Form("vi")
):
    """Proxy speech-to-text to xAI Grok"""
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    try:
        content = await file.read()
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {
                "file": (file.filename or "audio.webm", content, file.content_type or "audio/webm")
            }
            data = {
                "model": "grok-voice-transcribe-2.0",
                "language": language,
                "format": "true"
            }
            headers = {"Authorization": f"Bearer {api_key}"}

            response = await client.post(
                "https://api.x.ai/v1/stt",
                headers=headers,
                files=files,
                data=data
            )
            response.raise_for_status()
            result = response.json()
            return {"text": result.get("text", ""), "language": result.get("language", language)}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"xAI API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vision")
async def vision(
    file: UploadFile = File(...),
    api_key: str = Form(...),
    prompt: str = Form("Trích xuất toàn bộ text trong ảnh và mô tả ngắn gọn nội dung chính bằng tiếng Việt. Format đẹp, dễ đọc.")
):
    """Proxy image understanding to xAI Grok"""
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    try:
        content = await file.read()
        # Convert to base64 data URL
        b64 = base64.b64encode(content).decode("utf-8")
        mime = file.content_type or "image/jpeg"
        data_url = f"data:{mime};base64,{b64}"

        payload = {
            "model": "grok-4.7",
            "input": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_image",
                            "image_url": data_url,
                            "detail": "high"
                        },
                        {
                            "type": "input_text",
                            "text": prompt
                        }
                    ]
                }
            ]
        }

        async with httpx.AsyncClient(timeout=90.0) as client:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            response = await client.post(
                "https://api.x.ai/v1/responses",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            # Extract text from response (structure may vary slightly)
            text = ""
            if "output" in result:
                for item in result.get("output", []):
                    if item.get("type") == "message":
                        for c in item.get("content", []):
                            if c.get("type") == "output_text":
                                text += c.get("text", "")
            elif "choices" in result:
                text = result["choices"][0]["message"]["content"]
            else:
                text = str(result)

            return {"text": text.strip()}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"xAI API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
