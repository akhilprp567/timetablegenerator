from django.urls import path
from . import views

urlpatterns = [
    # Setup endpoints
    path('setup/status/', views.get_user_setup_status, name='setup-status'),
    path('setup/institute/', views.save_institute_setup, name='save-institute'),
    path('setup/academic/', views.generate_from_academic_setup, name='generate-academic'),
    
    # Legacy endpoint (for backward compatibility)
    path('generate/', views.setup_and_generate, name='generate'),
    
    # Timetable view endpoints
    path('view/<int:section_id>/', views.view_timetable, name='view-timetable'),
    path('list/', views.list_timetables, name='list-timetables'),
    path('navigation/<int:section_id>/', views.get_section_navigation, name='section-navigation'),
    
    # Faculty and Master timetable endpoints
    path('faculty/<int:faculty_id>/', views.get_faculty_timetable, name='faculty-timetable'),
    path('faculty-list/', views.list_faculties, name='faculty-list'),
    path('master/', views.get_master_timetable, name='master-timetable'),
    path('validate-continuous/', views.validate_continuous_periods, name='validate-continuous'),
]
