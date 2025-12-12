import json
import urllib.request
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получает расписание из Google Sheets и преобразует в формат для фронтенда
    Args: event - объект с httpMethod, headers, queryStringParameters
          context - объект с request_id, function_name и другими атрибутами
    Returns: JSON с массивом бронирований со статусами
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method == 'GET':
        google_sheets_url = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjOx6i8HorZCAYbr-tuEBPJLD5EG9P7MdaBWxQgSevHAjZiVzVFmNxR2YRQyLz620hUOGpZ45NuDGoFkrab1d7X1TCT2dnZV5ubYdY14it9FtYHbFZqls9sH289EgWSvD1AbiMeypMG4DvzrGYhwnCm3Nwqi9p8SrGuC6fsoEujV3d0i08KqsiECBei83rN2eccTgPFPc5bY-J-OHfIuFrIawIXlxXT1ukZ6RqdgKy3QnOGxgt4cZBS1GCJn4gK5ZoSnRk-EMgzQFnDMUQSw9QhSwVN_k1EYIyNvX_vB-xRc1AGbVEM7pDd2RDe-A&lib=MRD1yFWDc3NAGH661xW6qx5qd5ql5Bsbc'
        
        try:
            with urllib.request.urlopen(google_sheets_url, timeout=10) as response:
                raw_data = response.read().decode('utf-8')
            
            data: List[Dict[str, Any]] = json.loads(raw_data)
            bookings: List[Dict[str, Any]] = []
            
            for item in data:
                hall_name = item.get('hall', '').replace(' зал', '').strip()
                people_str = item.get('people', '0')
                
                try:
                    people_count = int(people_str) if people_str != '?' else 0
                except ValueError:
                    people_count = 0
                
                bookings.append({
                    'time': item.get('time', ''),
                    'hall': hall_name,
                    'people': people_count,
                    'status': item.get('status', 'booked'),
                    'comment': item.get('comment', '')
                })
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'bookings': bookings}, ensure_ascii=False),
                'isBase64Encoded': False
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': str(e)}, ensure_ascii=False),
                'isBase64Encoded': False
            }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
