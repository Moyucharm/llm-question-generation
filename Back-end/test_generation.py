"""
Test script for question generation API
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"


def test_register_teacher():
    """Register a teacher account"""
    print("\n=== 1. 注册教师账号 ===")
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": "teacher_test@example.com",
            "name": "测试老师",
            "password": "test123456",
            "role": "teacher"
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    return response.json() if response.status_code == 200 else None


def test_login(email: str, password: str):
    """Login and get token"""
    print("\n=== 2. 登录获取Token ===")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": email,
            "password": password
        }
    )
    print(f"Status: {response.status_code}")
    data = response.json()
    if response.status_code == 200:
        print(f"Token: {data['access_token'][:50]}...")
        return data['access_token']
    else:
        print(f"Error: {data}")
        return None


def test_generate_quick(token: str):
    """Test quick generation (skip review)"""
    print("\n=== 3. 快速生成题目 (跳过AI审核) ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/questions/generate/quick",
        headers=headers,
        json={
            "course_name": "Python编程",
            "knowledge_point": "列表操作",
            "question_type": "single",
            "difficulty": 3,
            "count": 2,
            "language": "zh"
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"生成题目数量: {data['count']}")
        for i, q in enumerate(data['questions'], 1):
            print(f"\n题目 {i}:")
            print(f"  题干: {q.get('stem', 'N/A')[:50]}...")
            print(f"  答案: {q.get('answer', 'N/A')}")
    else:
        print(f"Error: {response.text}")
    return response.json() if response.status_code == 200 else None


def test_generate_full(token: str):
    """Test full pipeline generation"""
    print("\n=== 4. 完整流水线生成题目 ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/questions/generate",
        headers=headers,
        json={
            "course_name": "数据结构",
            "knowledge_point": "二叉树",
            "question_type": "single",
            "difficulty": 3,
            "count": 1,
            "language": "zh"
        },
        timeout=120  # LLM可能需要较长时间
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        summary = data.get('summary', {})
        print(f"总数: {summary.get('total', 0)}")
        print(f"通过: {summary.get('approved', 0)}")
        print(f"待审核: {summary.get('needs_review', 0)}")
        print(f"拒绝: {summary.get('rejected', 0)}")
        print(f"成功率: {summary.get('success_rate', 0)}%")

        if data.get('approved_questions'):
            print("\n通过的题目:")
            for q in data['approved_questions']:
                question = q.get('question', {})
                print(f"  - {question.get('stem', 'N/A')[:60]}...")
    else:
        print(f"Error: {response.text[:500]}")
    return response.json() if response.status_code == 200 else None


def test_question_types():
    """Test get question types"""
    print("\n=== 5. 获取支持的题型 ===")
    response = requests.get(f"{BASE_URL}/questions/types")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        for t in data.get('types', []):
            print(f"  - {t['value']}: {t['label']} - {t['description']}")
    return response.json() if response.status_code == 200 else None


if __name__ == "__main__":
    print("=" * 60)
    print("题目生成API测试")
    print("=" * 60)

    # 1. 注册教师
    user = test_register_teacher()

    # 2. 登录
    token = test_login("teacher_test@example.com", "test123456")

    if token:
        # 3. 测试快速生成
        test_generate_quick(token)

        # 4. 测试完整流水线 (可能较慢)
        print("\n注意: 完整流水线会调用两次LLM (生成+审核), 可能需要1-2分钟...")
        test_generate_full(token)

    # 5. 测试获取题型
    test_question_types()

    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)
