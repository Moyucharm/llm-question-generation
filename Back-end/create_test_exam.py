# -*- coding: utf-8 -*-
"""创建测试考试数据"""
import requests

# 登录
login = requests.post('http://localhost:8000/api/auth/login', 
    json={'email':'teacher@test.com','password':'test123456'})
token = login.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 创建考试
exam = requests.post('http://localhost:8000/api/exams', 
    json={'title':'Python期末考试','duration_minutes':60}, headers=headers)
exam_data = exam.json()
exam_id = exam_data['id']
print(f'创建考试: ID={exam_id}, 标题={exam_data["title"]}')

# 添加题目
q = requests.post(f'http://localhost:8000/api/exams/{exam_id}/questions', 
    json={
        'type': 'single',
        'stem': 'Python 的创建者是谁？',
        'options': {
            'A': 'Guido van Rossum',
            'B': 'James Gosling',
            'C': 'Linus Torvalds',
            'D': 'Brendan Eich'
        },
        'answer': {'correct': 'A'},
        'score': 10
    }, headers=headers)
print(f'添加题目: {q.status_code}')

# 发布
pub = requests.post(f'http://localhost:8000/api/exams/{exam_id}/publish', headers=headers)
print(f'发布考试: {pub.json().get("status")}')

print('完成!')
