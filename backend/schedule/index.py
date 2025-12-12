import json
import urllib.request
import re
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получает расписание из Google Sheets и преобразует в формат для фронтенда
    Args: event - объект с httpMethod, headers, queryStringParameters
          context - объект с request_id, function_name и другими атрибутами
    Returns: JSON с массивом бронирований
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
        google_sheets_url = 'https://script.google.com/macros/s/AKfycby_nhnO2oKfZ2J9o1DAe10JjkBGoSomxSYlR9nDbzoGbedDry1F2I46acsx2uLfibrmgQ/exec'
        
        try:
            with urllib.request.urlopen(google_sheets_url, timeout=10) as response:
                data = response.read().decode('utf-8')
                
            bookings: List[Dict[str, Any]] = []
            lines = data.strip().split('\n')
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                parts = line.split('\t')
                if len(parts) < 2:
                    continue
                
                time_range = parts[0].strip()
                hall_info = parts[1].strip()
                
                match = re.match(r'^(.+?)\s+зал(?:,\s*(\d+)\s*чел\.)?', hall_info)
                if match:
                    hall_name = match.group(1).strip()
                    people_count = int(match.group(2)) if match.group(2) else 0
                    
                    bookings.append({
                        'time': time_range,
                        'hall': hall_name,
                        'people': people_count
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
