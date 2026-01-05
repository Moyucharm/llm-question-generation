"""
Quick diagnostic script to check if courses exist in database
"""
import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000/api"

async def check_courses():
    async with httpx.AsyncClient() as client:
        # Login as any user
        login_response = await client.post(
            f"{BASE_URL}/auth/login",
            json={"email": "teacher@example.com", "password": "password123"}
        )
        
        if login_response.status_code != 200:
            # Try teacher_verify_final
            login_response = await client.post(
                f"{BASE_URL}/auth/login",
                json={"email": "teacher_verify_final@example.com", "password": "password123"}
            )
        
        if login_response.status_code != 200:
            print(f"登录失败: {login_response.status_code}")
            print(login_response.text)
            return
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get courses
        response = await client.get(f"{BASE_URL}/courses/", headers=headers)
        
        print(f"课程列表 API 状态码: {response.status_code}")
        print(f"返回数据: {response.text}")

if __name__ == "__main__":
    asyncio.run(check_courses())
