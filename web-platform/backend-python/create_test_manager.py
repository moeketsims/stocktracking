"""Quick script to create test location manager"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from uuid import uuid4
from datetime import datetime
from app.config import get_supabase_admin_client

def create_test_location_manager():
    supabase = get_supabase_admin_client()

    email = 'manager@test.com'
    password = 'Test123!'

    # Check if user exists
    try:
        users = supabase.auth.admin.list_users()
        for u in users:
            if hasattr(u, 'email') and u.email == email:
                # Update password
                supabase.auth.admin.update_user_by_id(u.id, {'password': password})
                print(f'User already exists. Password reset.')
                print(f'Email: {email}')
                print(f'Password: {password}')
                return
    except Exception as e:
        print(f'Error checking users: {e}')

    # Create new user
    try:
        auth_response = supabase.auth.admin.create_user({
            'email': email,
            'password': password,
            'email_confirm': True
        })

        if auth_response.user:
            user_id = auth_response.user.id

            # Get first shop location
            locations = supabase.table('locations').select('id, name, zone_id').eq('type', 'shop').limit(1).execute()
            if not locations.data:
                locations = supabase.table('locations').select('id, name, zone_id').limit(1).execute()

            location_id = locations.data[0]['id'] if locations.data else None
            location_name = locations.data[0]['name'] if locations.data else 'Unknown'
            zone_id = locations.data[0].get('zone_id') if locations.data else None

            # Create profile
            profile_data = {
                'id': str(uuid4()),
                'user_id': user_id,
                'role': 'location_manager',
                'zone_id': zone_id,
                'location_id': location_id,
                'full_name': 'Test Location Manager',
                'is_active': True,
                'created_at': datetime.utcnow().isoformat(),
            }

            supabase.table('profiles').insert(profile_data).execute()

            print(f'Location Manager created successfully!')
            print(f'Email: {email}')
            print(f'Password: {password}')
            print(f'Location: {location_name}')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    create_test_location_manager()
