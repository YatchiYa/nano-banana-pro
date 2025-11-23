#!/usr/bin/env python3
"""
Test script for video generation API
"""
import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_text_to_video():
    """Test text-to-video generation"""
    print("🎬 Testing text-to-video generation...")
    
    # Generate video
    response = requests.post(f"{BASE_URL}/api/video_chat/generate", json={
        "prompt": "A majestic lion walking through the African savanna at sunset, cinematic camera movement",
        "aspect_ratio": "16:9",
        "resolution": "720p",
        "duration": "8"
    })
    
    if response.status_code != 200:
        print(f"❌ Generation failed: {response.text}")
        return None
    
    data = response.json()
    operation_id = data["operation_id"]
    print(f"✅ Generation started: {operation_id}")
    
    # Poll for status
    print("⏳ Polling for completion...")
    max_polls = 60  # 5 minutes max
    poll_count = 0
    
    while poll_count < max_polls:
        status_response = requests.post(f"{BASE_URL}/api/video_chat/status", json={
            "operation_id": operation_id
        })
        
        if status_response.status_code != 200:
            print(f"❌ Status check failed: {status_response.text}")
            return None
        
        status_data = status_response.json()
        status = status_data["status"]
        
        if status == "completed":
            print(f"✅ Video completed: {status_data['video_url']}")
            return status_data
        elif status == "error":
            print(f"❌ Video generation failed: {status_data.get('message', 'Unknown error')}")
            return None
        else:
            elapsed = status_data.get("elapsed_seconds", 0)
            print(f"⏳ Status: {status} (elapsed: {elapsed:.1f}s)")
        
        time.sleep(5)
        poll_count += 1
    
    print("❌ Timeout waiting for video completion")
    return None

def test_operations_list():
    """Test operations listing"""
    print("\n📋 Testing operations list...")
    
    response = requests.get(f"{BASE_URL}/api/video_chat/operations")
    
    if response.status_code != 200:
        print(f"❌ Operations list failed: {response.text}")
        return
    
    data = response.json()
    print(f"✅ Total operations: {data['total_operations']}")
    
    for op in data['operations']:
        print(f"  - {op['operation_id'][:8]}... | {op['status']} | {op['elapsed_seconds']:.1f}s")

def main():
    print("🚀 Starting video generation tests...\n")
    
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
    
    # Test video generation
    result = test_text_to_video()
    
    # Test operations list
    test_operations_list()
    
    if result:
        print(f"\n🎉 Test completed successfully!")
        print(f"Video URL: {result['video_url']}")
        print(f"Full URL: {BASE_URL}{result['video_url']}")
    else:
        print(f"\n❌ Test failed")

if __name__ == "__main__":
    main()
