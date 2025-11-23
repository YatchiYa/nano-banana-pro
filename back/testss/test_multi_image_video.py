#!/usr/bin/env python3
"""
Test script for multi-image video generation API
"""
import requests
import time
import json
from pathlib import Path

BASE_URL = "http://localhost:8000"

def create_test_image():
    """Create a simple test image for testing"""
    from PIL import Image, ImageDraw
    import io
    
    # Create a simple colored image
    img = Image.new('RGB', (512, 512), color='blue')
    draw = ImageDraw.Draw(img)
    draw.rectangle([100, 100, 400, 400], fill='red')
    draw.text((200, 250), "TEST IMAGE", fill='white')
    
    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()

def test_reference_images():
    """Test reference images generation (up to 3 images)"""
    print("🎬 Testing reference images generation...")
    
    # Create test images
    image1 = create_test_image()
    image2 = create_test_image()
    
    # Prepare form data
    files = [
        ('image_files', ('test1.png', image1, 'image/png')),
        ('image_files', ('test2.png', image2, 'image/png'))
    ]
    
    data = {
        'prompt': 'A cinematic video featuring the elements from the reference images, smooth camera movement, professional lighting',
        'aspect_ratio': '16:9',
        'resolution': '720p',
        'duration': '8',
        'generation_type': 'reference'
    }
    
    response = requests.post(f"{BASE_URL}/api/video_chat/generate_with_images", files=files, data=data)
    
    if response.status_code != 200:
        print(f"❌ Reference generation failed: {response.text}")
        return None
    
    data = response.json()
    operation_id = data["operation_id"]
    print(f"✅ Reference generation started: {operation_id}")
    
    return operation_id

def test_first_frame():
    """Test first frame generation (1 image)"""
    print("🎬 Testing first frame generation...")
    
    # Create test image
    image1 = create_test_image()
    
    # Prepare form data
    files = [
        ('image_files', ('test1.png', image1, 'image/png'))
    ]
    
    data = {
        'prompt': 'Animate this image with smooth motion, cinematic style',
        'aspect_ratio': '16:9',
        'resolution': '720p',
        'duration': '8',
        'generation_type': 'first_frame'
    }
    
    response = requests.post(f"{BASE_URL}/api/video_chat/generate_with_images", files=files, data=data)
    
    if response.status_code != 200:
        print(f"❌ First frame generation failed: {response.text}")
        return None
    
    data = response.json()
    operation_id = data["operation_id"]
    print(f"✅ First frame generation started: {operation_id}")
    
    return operation_id

def test_interpolation():
    """Test interpolation generation (2 images)"""
    print("🎬 Testing interpolation generation...")
    
    # Create test images
    image1 = create_test_image()
    image2 = create_test_image()
    
    # Prepare form data
    files = [
        ('image_files', ('first.png', image1, 'image/png')),
        ('image_files', ('last.png', image2, 'image/png'))
    ]
    
    data = {
        'prompt': 'Smooth transition between the first and last frame, cinematic interpolation',
        'aspect_ratio': '16:9',
        'resolution': '720p',
        'duration': '8',
        'generation_type': 'interpolation'
    }
    
    response = requests.post(f"{BASE_URL}/api/video_chat/generate_with_images", files=files, data=data)
    
    if response.status_code != 200:
        print(f"❌ Interpolation generation failed: {response.text}")
        return None
    
    data = response.json()
    operation_id = data["operation_id"]
    print(f"✅ Interpolation generation started: {operation_id}")
    
    return operation_id

def poll_operation(operation_id, max_polls=60):
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
    print("🚀 Starting multi-image video generation tests...\n")
    
    # Test basic connectivity
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print("❌ Backend not accessible")
            return
        print("✅ Backend is running\n")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on localhost:8000")
        return
    
    # Test different generation types
    operations = []
    
    # Test reference images
    op_id = test_reference_images()
    if op_id:
        operations.append(("reference", op_id))
    
    # Test first frame
    op_id = test_first_frame()
    if op_id:
        operations.append(("first_frame", op_id))
    
    # Test interpolation
    op_id = test_interpolation()
    if op_id:
        operations.append(("interpolation", op_id))
    
    # Poll all operations
    print(f"\n📊 Polling {len(operations)} operations...")
    results = []
    
    for gen_type, op_id in operations:
        print(f"\n--- Polling {gen_type} ---")
        result = poll_operation(op_id, max_polls=20)  # Shorter timeout for testing
        if result:
            results.append((gen_type, result))
    
    # Summary
    print(f"\n🎉 Test Summary:")
    print(f"✅ Successful: {len(results)}/{len(operations)}")
    
    for gen_type, result in results:
        print(f"  - {gen_type}: {result['video_url']}")

if __name__ == "__main__":
    main()
