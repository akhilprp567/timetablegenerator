from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token
from django.db import IntegrityError
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Register a new user account"""
    try:
        data = request.data
        
        # Validate required fields
        required_fields = ['username', 'password', 'fullName', 'email']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'error': f'{field} is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        username = data['username']
        password = data['password']
        full_name = data['fullName']
        email = data['email']
        institution = data.get('institution', '')
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if email already exists
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'Email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=full_name.split()[0] if full_name.split() else '',
            last_name=' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else ''
        )
        
        # Create or get token for the user
        token, created = Token.objects.get_or_create(user=user)
        
        logger.info(f"User {username} registered successfully")
        
        return Response({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'name': full_name,
                'email': user.email,
                'institution': institution
            },
            'token': token.key
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        # Log the full exception for debugging
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Registration failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """Authenticate user login"""
    try:
        data = request.data
        
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Username and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if user is None:
            logger.error(f"Authentication failed for username: {username}")
            return Response(
                {'error': 'Invalid username or password'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'Account is disabled'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Create or get token for the user
        token, created = Token.objects.get_or_create(user=user)
        
        logger.info(f"User {username} logged in successfully")
        
        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email
            },
            'token': token.key
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        # Log the full exception for debugging
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {'error': f'Login failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def logout_user(request):
    """Logout user and invalidate token"""
    try:
        # Delete the user's token
        if request.user.is_authenticated:
            Token.objects.filter(user=request.user).delete()
            logger.info(f"User {request.user.username} logged out")
            
        return Response({
            'message': 'Logged out successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return Response(
            {'error': 'Logout failed'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_user_profile(request):
    """Get current user profile"""
    try:
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = request.user
        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        return Response(
            {'error': 'Failed to fetch profile'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def test_auth(request):
    """Test endpoint to debug authentication"""
    try:
        from django.contrib.auth.models import User
        from rest_framework.authtoken.models import Token
        
        users = User.objects.all()
        user_data = []
        
        for user in users:
            try:
                token = Token.objects.get(user=user)
                token_key = token.key
            except Token.DoesNotExist:
                token_key = "No token"
            
            user_data.append({
                'username': user.username,
                'email': user.email,
                'is_active': user.is_active,
                'token': token_key
            })
        
        return Response({
            'users': user_data,
            'total_users': len(users)
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)
