"""
Test script for Course and Knowledge Point Management

Run this script to verify the course endpoints work correctly
"""

import asyncio
import httpx
import time

BASE_URL = "http://127.0.0.1:8000/api"

# Test data
TEACHER_EMAIL = f"teacher_{int(time.time())}@example.com"
TEACHER_PASSWORD = "password123"
COURSE_NAME = f"Test Course {int(time.time())}"


async def test_courses():
    """Test course endpoints"""
    async with httpx.AsyncClient() as client:
        print("=" * 50)
        print("Testing Course Management System")
        print("=" * 50)

        # 1. Register/Login as Teacher
        print("\n[1] Setting up teacher account...")
        
        # Try login first
        login_response = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD}
        )
        
        if login_response.status_code == 200:
            token = login_response.json()["access_token"]
            print("    [OK] Logged in existing teacher")
        else:
            # Register if not exists
            reg_response = await client.post(
                f"{BASE_URL}/auth/register",
                json={
                    "email": TEACHER_EMAIL,
                    "name": "Test Teacher",
                    "password": TEACHER_PASSWORD,
                    "role": "teacher"
                }
            )
            if reg_response.status_code == 201:
                token = reg_response.json()["access_token"]
                print("    [OK] Registered new teacher")
            else:
                print(f"    [ERROR] Setup failed: {reg_response.text}")
                return

        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Course
        print("\n[2] Testing create course...")
        course_data = {
            "name": COURSE_NAME,
            "description": "A test course for verification"
        }
        
        response = await client.post(
            f"{BASE_URL}/courses/",
            json=course_data,
            headers=headers
        )
        
        if response.status_code == 200:
            course = response.json()
            course_id = course["id"]
            print(f"    [OK] Course created: {course['name']} (ID: {course_id})")
        else:
            print(f"    [ERROR] Create course failed: {response.status_code}")
            print(f"    Response: {response.text}")
            return

        # 3. Add Knowledge Points
        print("\n[3] Testing add knowledge points...")
        
        # Root KP
        kp1_data = {
            "name": "Chapter 1: Basics",
            "description": "Introduction to basics",
            "order": 1
        }
        
        resp1 = await client.post(
            f"{BASE_URL}/courses/{course_id}/knowledge-points",
            json=kp1_data,
            headers=headers
        )
        
        if resp1.status_code == 200:
            kp1 = resp1.json()
            kp1_id = kp1["id"]
            print(f"    [OK] Root KP created: {kp1['name']}")
        else:
            print(f"    [ERROR] Create KP1 failed: {resp1.text}")
            return

        # Child KP
        kp2_data = {
            "name": "Section 1.1: Syntax",
            "description": "Basic syntax",
            "parent_id": kp1_id,
            "order": 1
        }
        
        resp2 = await client.post(
            f"{BASE_URL}/courses/{course_id}/knowledge-points",
            json=kp2_data,
            headers=headers
        )
        
        if resp2.status_code == 200:
            kp2 = resp2.json()
            print(f"    [OK] Child KP created: {kp2['name']} (Parent: {kp1_id})")
        else:
            print(f"    [ERROR] Create KP2 failed: {resp2.text}")
            return

        # 4. Get Course Details (Tree)
        print("\n[4] Testing get course details (tree structure)...")
        
        response = await client.get(
            f"{BASE_URL}/courses/{course_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            details = response.json()
            kps = details["knowledge_points"]
            print(f"    [OK] Got course details")
            print(f"    Root points count: {len(kps)}")
            if len(kps) > 0:
                print(f"    First root point: {kps[0]['name']}")
                print(f"    Children count: {len(kps[0]['children'])}")
                if len(kps[0]['children']) > 0:
                    print(f"    First child: {kps[0]['children'][0]['name']}")
        else:
            print(f"    [ERROR] Get details failed: {response.text}")
            return

        # 5. Update Course
        print("\n[5] Testing update course...")
        update_data = {"description": "Updated description"}
        
        response = await client.put(
            f"{BASE_URL}/courses/{course_id}",
            json=update_data,
            headers=headers
        )
        
        if response.status_code == 200:
            print(f"    [OK] Course updated")
        else:
            print(f"    [ERROR] Update failed: {response.text}")

        # 6. Delete Knowledge Point
        print("\n[6] Testing delete knowledge point...")
        # Delete root KP (should cascade delete child)
        response = await client.delete(
            f"{BASE_URL}/courses/{course_id}/knowledge-points/{kp1_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            print(f"    [OK] Knowledge point deleted")
        else:
            print(f"    [ERROR] Delete KP failed: {response.text}")

        # Verify deletion
        response = await client.get(
            f"{BASE_URL}/courses/{course_id}",
            headers=headers
        )
        kps = response.json()["knowledge_points"]
        if len(kps) == 0:
            print(f"    [OK] Verified deletion (0 points remaining)")
        else:
            print(f"    [ERROR] Deletion verification failed: {len(kps)} points remaining")

        # 7. Delete Course
        print("\n[7] Testing delete course...")
        response = await client.delete(
            f"{BASE_URL}/courses/{course_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            print(f"    [OK] Course deleted")
        else:
            print(f"    [ERROR] Delete course failed: {response.text}")

        print("\n" + "=" * 50)
        print("All course tests passed!")
        print("=" * 50)


if __name__ == "__main__":
    print("\nMake sure the server is running:")
    print("  cd Back-end && .\\venv\\Scripts\\python.exe -m uvicorn app.main:app --reload")
    print("\nPress Enter to start tests...")
    # input() # Commented out for automation
    asyncio.run(test_courses())
