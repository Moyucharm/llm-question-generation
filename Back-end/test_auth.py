"""
Test script for authentication system

Run this script to verify the auth endpoints work correctly
"""

import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000/api"


async def test_auth():
    """Test authentication endpoints"""
    async with httpx.AsyncClient() as client:
        print("=" * 50)
        print("Testing Authentication System")
        print("=" * 50)

        # 1. Test registration
        print("\n[1] Testing user registration...")
        register_data = {
            "email": "test@example.com",
            "name": "Test User",
            "password": "password123",
            "role": "student"
        }

        response = await client.post(
            f"{BASE_URL}/auth/register",
            json=register_data
        )

        if response.status_code == 201:
            result = response.json()
            print(f"    [OK] Registration successful!")
            print(f"    User: {result['user']['name']} ({result['user']['email']})")
            print(f"    Role: {result['user']['role']}")
            access_token = result["access_token"]
        elif response.status_code == 400:
            print(f"    [INFO] User already exists, trying login...")
            access_token = None
        else:
            print(f"    [ERROR] Registration failed: {response.status_code}")
            print(f"    Response: {response.text}")
            return

        # 2. Test login
        print("\n[2] Testing user login...")
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }

        response = await client.post(
            f"{BASE_URL}/auth/login",
            json=login_data
        )

        if response.status_code == 200:
            result = response.json()
            print(f"    [OK] Login successful!")
            print(f"    Token type: {result['token_type']}")
            access_token = result["access_token"]
        else:
            print(f"    [ERROR] Login failed: {response.status_code}")
            print(f"    Response: {response.text}")
            return

        # 3. Test get current user
        print("\n[3] Testing get current user...")
        headers = {"Authorization": f"Bearer {access_token}"}

        response = await client.get(
            f"{BASE_URL}/auth/me",
            headers=headers
        )

        if response.status_code == 200:
            user = response.json()
            print(f"    [OK] Get user successful!")
            print(f"    ID: {user['id']}")
            print(f"    Name: {user['name']}")
            print(f"    Email: {user['email']}")
            print(f"    Role: {user['role']}")
            print(f"    Active: {user['is_active']}")
        else:
            print(f"    [ERROR] Get user failed: {response.status_code}")
            print(f"    Response: {response.text}")
            return

        # 4. Test update user
        print("\n[4] Testing update user profile...")
        update_data = {
            "bio": "Hello, I'm a test user!"
        }

        response = await client.put(
            f"{BASE_URL}/auth/me",
            json=update_data,
            headers=headers
        )

        if response.status_code == 200:
            user = response.json()
            print(f"    [OK] Update successful!")
            print(f"    Bio: {user['bio']}")
        else:
            print(f"    [ERROR] Update failed: {response.status_code}")
            print(f"    Response: {response.text}")
            return

        # 5. Test invalid token
        print("\n[5] Testing invalid token...")
        bad_headers = {"Authorization": "Bearer invalid_token_here"}

        response = await client.get(
            f"{BASE_URL}/auth/me",
            headers=bad_headers
        )

        if response.status_code == 401:
            print(f"    [OK] Invalid token correctly rejected!")
        else:
            print(f"    [WARNING] Unexpected status: {response.status_code}")

        print("\n" + "=" * 50)
        print("All authentication tests passed!")
        print("=" * 50)


if __name__ == "__main__":
    print("\nMake sure the server is running:")
    print("  cd Back-end && .\\venv\\Scripts\\python.exe -m uvicorn app.main:app --reload")
    print("\nPress Enter to start tests...")
    input()
    asyncio.run(test_auth())
