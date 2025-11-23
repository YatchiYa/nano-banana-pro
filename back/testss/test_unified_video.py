#!/usr/bin/env python3
"""
Test script for unified video generation API
"""
import requests
import time
import json
from PIL import Image, ImageDraw
import io

BASE_URL = "http://localhost:8000"

def create_test_image():
    """Create a simple test image"""
    img = Image.new('RGB', (512, 512), color='blue')
    draw = ImageDraw.Draw(img)
    draw.rectangle([100, 100, 400, 400], fill='red')
    draw.text((200, 250), "TEST", fill='white')
    
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()

def test_text_only():
    """Test text-only generation"""
    print("🎬 Testing text-only generation...")
    
    data = {
        'prompt': 'A majestic lion walking through the African savanna at sunset, cinematic camera movement',
        'aspect_ratio': '16:9',
        'resolution': '720p',
        'duration': '8'
    }
    
    response = requests.post(f"{BASE_URL}/api/video_chat/generate_unified", data=data)
    
    if response.status_code != 200:
        print(f"❌ Text-only generation failed: {response.text}")
        return None
    
    result = response.json()
    operation_id = result["operation_id"]
    print(f"✅ Text-only generation started: {operation_id}")
    
    return operation_id

def test_with_images():
    """Test generation with images"""
    print("🎬 Testing generation with images...")
    
    # Create test images
    image1 = create_test_image()
    image2 = create_test_image()
    
    files = [
        ('image_files', ('test1.png', image1, 'image/png')),
        ('image_files', ('test2.png', image2, 'image/png'))
    ]
    
    data = {
        'prompt': 'A cinematic video featuring the elements from the reference images',
        'aspect_ratio': '16:9',
        'resolution': '720p',
        'duration': '8',
        'generation_type': 'reference'
    }
    
    response = requests.post(f"{BASE_URL}/api/video_chat/generate_unified", files=files, data=data)
    
    if response.status_code != 200:
        print(f"❌ Image generation failed: {response.text}")
        return None
    
    result = response.json()
    operation_id = result["operation_id"]
    print(f"✅ Image generation started: {operation_id}")
    
    return operation_id

def poll_operation(operation_id, max_polls=20):
    """Poll operation status"""
    print(f"⏳ Polling operation {operation_id[:8]}...")
    
    for i in range(max_polls):
        response = requests.post(f"{BASE_URL}/api/video_chat/status", json={
            "operation_id": operation_id
        })
        
        if response.status_code != 200:
            print(f"❌ Status check failed: {response.text}")
            return None
        
        data = response.json()
        status = data["status"]
        
        if status == "completed":
            print(f"✅ Video completed: {data['video_url']}")
            return data
        elif status == "error":
            print(f"❌ Video generation failed: {data.get('message', 'Unknown error')}")
            return None
        else:
            elapsed = data.get("elapsed_seconds", 0)
            print(f"⏳ Status: {status} (elapsed: {elapsed:.1f}s)")
        
        time.sleep(5)
    
    print("❌ Timeout waiting for video completion")
    return None

def main():
    print("🚀 Starting unified video generation tests...\n")
    
    # Test connectivity
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print("❌ Backend not accessible")
            return
        print("✅ Backend is running\n")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on localhost:8000")
        return
    
    # Test both modes
    operations = []
    
    # Test text-only
    op_id = test_text_only()
    if op_id:
        operations.append(("text-only", op_id))
    
    # Test with images
    op_id = test_with_images()
    if op_id:
        operations.append(("with-images", op_id))
    
    # Poll operations
    print(f"\n📊 Polling {len(operations)} operations...")
    results = []
    
    for mode, op_id in operations:
        print(f"\n--- Polling {mode} ---")
        result = poll_operation(op_id)
        if result:
            results.append((mode, result))
    
    # Summary
    print(f"\n🎉 Test Summary:")
    print(f"✅ Successful: {len(results)}/{len(operations)}")
    
    for mode, result in results:
        print(f"  - {mode}: {result['video_url']}")

if __name__ == "__main__":
    main()
