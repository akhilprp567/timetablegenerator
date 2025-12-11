from django.urls import path
from .views import (
    setup_and_generate, view_timetable, list_timetables, get_section_navigation,
    get_user_setup_status, save_institute_setup, generate_from_academic_setup
)
from .authentication import register_user, login_user, logout_user, get_user_profile, test_auth

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', register_user, name='register'),
    path('auth/login/', login_user, name='login'),
    path('auth/logout/', logout_user, name='logout'),
    path('auth/profile/', get_user_profile, name='profile'),
    path('auth/test/', test_auth, name='test_auth'),  # Debug endpoint
    
    # Setup endpoints
    path('setup/status/', get_user_setup_status, name='get_user_setup_status'),
    path('setup/institute/', save_institute_setup, name='save_institute_setup'),
    path('setup/academic/', generate_from_academic_setup, name='generate_from_academic_setup'),
    
    # Legacy endpoint (for backward compatibility)
    path('generate/', setup_and_generate, name='setup_and_generate'),
    
    # Timetable endpoints
    path('view/<int:section_id>/', view_timetable, name='view_timetable'),
    path('list/', list_timetables, name='list_timetables'),
    path('navigation/<int:section_id>/', get_section_navigation, name='get_section_navigation'),  # New endpoint
]
