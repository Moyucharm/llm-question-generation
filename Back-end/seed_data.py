
import asyncio
import httpx
import time

BASE_URL = "http://127.0.0.1:8000/api"

# Test data
TEACHER_EMAIL = "teacher_verify_final@example.com"
TEACHER_PASSWORD = "password123"
COURSE_NAME = "Final Verification Course"


async def seed_data():
    """Seed course data"""
    async with httpx.AsyncClient() as client:
        print("=" * 50)
        print("Seeding Data for Verification")
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
        print("\n[2] Creating course...")
        course_data = {
            "name": COURSE_NAME,
            "description": "A seeded course for verification"
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
        print("\n[3] Adding knowledge points...")
        
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

        print("\n" + "=" * 50)
        print("Data seeded successfully!")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed_data())
