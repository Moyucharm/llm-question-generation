# -*- coding: utf-8 -*-
"""测试创建考试并获取详情"""
import requests

login = requests.post('http://localhost:8000/api/auth/login', 
    json={'email':'teacher@test.com','password':'test123456'})
token = login.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 创建考试
exam = requests.post('http://localhost:8000/api/exams', 
    json={'title':'测试新考试','duration_minutes':30}, headers=headers)
exam_data = exam.json()
exam_id = exam_data['id']
print(f'Created exam ID: {exam_id}')

# 获取详情
detail = requests.get(f'http://localhost:8000/api/exams/{exam_id}', headers=headers)
print(f'Get detail status: {detail.status_code}')

if detail.status_code == 200:
    data = detail.json()
    print(f'Title: {data.get("title")}')
    print(f'Questions: {len(data.get("questions", []))}')
else:
    print(f'Error: {detail.text}')
