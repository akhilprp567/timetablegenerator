import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import (
    InstitutionSettings, Room, Faculty, Semester, Section, Subject, FacultySubjectAllocation, TimetableSlot, ScheduledSession, Course
)
from .timetable_generator import generate_timetable
from django.db import transaction

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])  # Add authentication requirement
def setup_and_generate(request):
    data = request.data
    
    # Log the authenticated user
    logger.info(f"Timetable generation requested by user: {request.user.username}")

    # Restrictions (sync with frontend):
    MAX_PERIODS_PER_DAY = 8
    MAX_WORKING_DAYS = 7

    # Validate institution settings
    periods_per_day = data["institute"]["periodsPerDay"]
    working_days = data["institute"]["workingDays"]
    if periods_per_day > MAX_PERIODS_PER_DAY or periods_per_day < 1:
        logger.error("Invalid periods per day: %s", periods_per_day)
        return Response({"error": f"Periods per day must be between 1 and {MAX_PERIODS_PER_DAY}."}, status=400)
    if working_days > MAX_WORKING_DAYS or working_days < 1:
        logger.error("Invalid working days: %s", working_days)
        return Response({"error": f"Working days must be between 1 and {MAX_WORKING_DAYS}."}, status=400)

    try:
        with transaction.atomic():
            # Clear previous setup
            InstitutionSettings.objects.all().delete()
            Room.objects.all().delete()
            Faculty.objects.all().delete()
            Semester.objects.all().delete()
            Section.objects.all().delete()
            Subject.objects.all().delete()
            FacultySubjectAllocation.objects.all().delete()
            TimetableSlot.objects.all().delete()
            ScheduledSession.objects.all().delete()

            # Save institution settings
            inst = InstitutionSettings.objects.create(
                course=data["institute"]["course"],
                academic_year=data["institute"]["academicYear"],
                working_days=working_days,
                periods_per_day=periods_per_day,
                period_duration=data["institute"]["periodDuration"]
            )

            # Ensure course exists and get/create Course object
            course_obj, _ = Course.objects.get_or_create(
                name=data["institute"]["course"],
                defaults={"code": data["institute"]["course"][:20]}
            )

            # Create timetable slots for each day/period
            for day in range(1, working_days + 1):
                for period in range(1, periods_per_day + 1):
                    TimetableSlot.objects.create(day=day, period_number=period)

            # Save rooms/labs
            for room in data["rooms"]:
                Room.objects.create(name=room["name"], is_lab=room["isLab"])

            # Save faculties
            for fac in data["faculties"]:
                Faculty.objects.create(name=fac["name"], employee_id=fac["empId"])

            # Save academic setup
            section_ids = []
            for sem in data["academics"]:
                # Create Semester with course_obj
                semester_obj = Semester.objects.create(
                    course=course_obj,
                    name=f"Semester {sem['semester']}",
                    number=sem["semester"]
                )
                
                # Create subjects once per semester (not per section)
                semester_subjects = []
                for subj in sem["subjects"]:
                    # Validate faculty assignment
                    if not subj["faculty"]:
                        logger.error("Faculty not assigned for subject %s", subj['name'])
                        return Response({"error": f"Faculty not assigned for subject {subj['name']}."}, status=400)
                    
                    try:
                        faculty_obj = Faculty.objects.get(name=subj["faculty"])
                    except Faculty.DoesNotExist:
                        logger.error("Faculty %s not found", subj["faculty"])
                        return Response({"error": f"Faculty {subj['faculty']} not found."}, status=400)
                    
                    # Generate unique code from subject name + semester
                    subject_code = f"{subj['name'][:10].replace(' ', '').upper()}_{sem['semester']}"
                    
                    # Check if subject already exists for this semester
                    existing_subject = Subject.objects.filter(
                        code=subject_code, 
                        semester=semester_obj
                    ).first()
                    
                    if existing_subject:
                        subject_obj = existing_subject
                    else:
                        subject_obj = Subject.objects.create(
                            name=subj["name"], 
                            semester=semester_obj,
                            code=subject_code,
                            weekly_hours=subj.get("weeklyHours", 3),
                            lab_required=subj.get("isLab", False),
                            lab_hours=subj.get("labHours", 0)
                        )
                    
                    semester_subjects.append((subject_obj, faculty_obj))
                
                # Create sections and link them to subjects
                for sec in sem["sections"]:
                    section_obj = Section.objects.create(name=sec, semester=semester_obj)
                    section_ids.append(section_obj.id)
                    
                    # Create faculty allocations for this section
                    for subject_obj, faculty_obj in semester_subjects:
                        # Check if allocation already exists
                        allocation_exists = FacultySubjectAllocation.objects.filter(
                            faculty=faculty_obj,
                            subject=subject_obj
                        ).exists()
                        
                        if not allocation_exists:
                            FacultySubjectAllocation.objects.create(
                                faculty=faculty_obj,
                                subject=subject_obj
                            )

            # Generate timetable
            try:
                result = generate_timetable()
            except Exception as e:
                logger.exception("Timetable generation failed: %s", str(e))
                return Response({"error": str(e)}, status=400)

            if result["status"] != "success":
                logger.error("Timetable generation error: %s", result["message"])
                return Response({"error": result["message"]}, status=400)

    except Exception as e:
        logger.exception("Setup and generate failed: %s", str(e))
        return Response({"error": str(e)}, status=500)

    # Return first section id for navigation
    return Response({
        "message": "Timetable generated successfully!",
        "section_id": section_ids[0] if section_ids else 1
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Add authentication requirement
def view_timetable(request, section_id):
    from .models import Section, TimetableSlot, ScheduledSession
    # Log the authenticated user
    logger.info(f"Timetable view requested by user: {request.user.username} for section: {section_id}")
    
    section = Section.objects.get(id=section_id)
    slots = TimetableSlot.objects.all().order_by('day', 'period_number')
    days = {slot.day: slot.get_day_display() for slot in slots}
    periods = sorted(set(slot.period_number for slot in slots))
    sessions = ScheduledSession.objects.filter(section_id=section_id)

    timetable = []
    for session in sessions:
        timetable.append({
            "day": session.slot.get_day_display(),
            "period": session.slot.period_number,
            "subject": session.subject.name,
            "faculty": session.faculty.name,
            "room": session.room.name,
            "is_lab": session.is_lab_session,
        })

    return Response({
        "section": section.name,
        "days": list(days.values()),
        "periods": [str(p) for p in periods],
        "timetable": timetable,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_timetables(request):
    """List all available timetables"""
    try:
        from .models import Section, ScheduledSession
        
        # Get all sections that have scheduled sessions
        sections_with_sessions = Section.objects.filter(
            scheduledsession__isnull=False
        ).distinct()
        
        timetables = []
        for section in sections_with_sessions:
            session_count = ScheduledSession.objects.filter(section=section).count()
            
            timetables.append({
                'id': section.id,
                'name': section.name,
                'semester': section.semester.number,
                'course': section.semester.course.name,
                'sessions_count': session_count
            })
        
        logger.info(f"Listed {len(timetables)} timetables for user: {request.user.username}")
        
        return Response({
            'timetables': timetables,
            'total_count': len(timetables)
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error listing timetables: {str(e)}")
        return Response({'error': 'Failed to fetch timetables'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_section_navigation(request, section_id):
    """Get navigation info for a specific section"""
    try:
        from .models import Section, ScheduledSession
        
        # Get current section
        current_section = Section.objects.get(id=section_id)
        
        # Get all sections that have scheduled sessions (same course)
        sections_with_sessions = Section.objects.filter(
            scheduledsession__isnull=False,
            semester__course=current_section.semester.course
        ).distinct().order_by('semester__number', 'name')
        
        navigation_data = []
        for section in sections_with_sessions:
            navigation_data.append({
                'id': section.id,
                'name': section.name,
                'semester': section.semester.number,
                'display_name': f"Semester {section.semester.number} - Section {section.name}"
            })
        
        return Response({
            'current_section': {
                'id': current_section.id,
                'name': current_section.name,
                'semester': current_section.semester.number
            },
            'all_sections': navigation_data
        }, status=200)
        
    except Section.DoesNotExist:
        return Response({'error': 'Section not found'}, status=404)
    except Exception as e:
        logger.error(f"Error getting section navigation: {str(e)}")
        return Response({'error': 'Failed to fetch navigation data'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_setup_status(request):
    """Check if user has completed one-time setup"""
    try:
        user = request.user
        
        # Check if institute setup is complete
        institute_setup = InstitutionSettings.objects.filter(
            created_by=user, 
            is_setup_complete=True
        ).exists()
        
        # Get existing data if setup is complete
        institute_data = None
        faculties_data = []
        rooms_data = []
        
        if institute_setup:
            institute = InstitutionSettings.objects.filter(created_by=user).first()
            if institute:
                institute_data = {
                    'name': institute.institution_name,  # Use institution_name field
                    'academicYear': institute.academic_year,
                    'course': institute.course,
                    'workingDays': institute.working_days,
                    'periodsPerDay': institute.periods_per_day,
                    'periodDuration': institute.period_duration
                }
            
            # Get user's faculties
            faculties = Faculty.objects.filter(created_by=user)
            faculties_data = [{
                'name': f.name,
                'empId': f.employee_id,
                'maxHours': f.max_hours_per_week
            } for f in faculties]
            
            # Get user's rooms
            rooms = Room.objects.filter(created_by=user)
            rooms_data = [{
                'name': r.name,
                'isLab': r.is_lab
            } for r in rooms]
        
        return Response({
            'setup_complete': institute_setup,
            'institute': institute_data,
            'faculties': faculties_data,
            'rooms': rooms_data
        })
        
    except Exception as e:
        logger.error(f"Error checking setup status: {str(e)}")
        return Response({'error': 'Failed to check setup status'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_institute_setup(request):
    """Save one-time institute, faculty, and room setup"""
    try:
        user = request.user
        data = request.data
        
        with transaction.atomic():
            # Clear user's previous setup
            InstitutionSettings.objects.filter(created_by=user).delete()
            Faculty.objects.filter(created_by=user).delete()
            Room.objects.filter(created_by=user).delete()
            
            # Save institute settings
            institute = InstitutionSettings.objects.create(
                institution_name=data["institute"]["name"],  # Store institution name
                course=data["institute"]["course"],
                academic_year=data["institute"]["academicYear"],
                working_days=data["institute"]["workingDays"],
                periods_per_day=data["institute"]["periodsPerDay"],
                period_duration=data["institute"]["periodDuration"],
                created_by=user,
                is_setup_complete=True
            )
            
            # Save rooms
            for room in data["rooms"]:
                Room.objects.create(
                    name=room["name"], 
                    is_lab=room["isLab"],
                    created_by=user
                )
            
            # Save faculties with working hours
            for fac in data["faculties"]:
                Faculty.objects.create(
                    name=fac["name"], 
                    employee_id=fac["empId"],
                    max_hours_per_week=fac.get("maxHours", 18),
                    created_by=user
                )
        
        logger.info(f"Institute setup completed for user: {user.username}")
        return Response({'message': 'Institute setup saved successfully'})
        
    except Exception as e:
        logger.error(f"Error saving institute setup: {str(e)}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_from_academic_setup(request):
    """Generate timetable using existing institute setup + new academic data"""
    try:
        user = request.user
        data = request.data
        
        # Check if user has completed institute setup
        institute = InstitutionSettings.objects.filter(
            created_by=user, 
            is_setup_complete=True
        ).first()
        
        if not institute:
            return Response({
                'error': 'Please complete institute setup first'
            }, status=400)
        
        # Validate that academics data exists
        if 'academics' not in data or not data['academics']:
            return Response({
                'error': 'Academic data is required'
            }, status=400)
        
        with transaction.atomic():
            # Clear only academic and scheduling data, keep institute setup
            # Find existing course for this user's institute
            existing_course = Course.objects.filter(
                name=institute.course
            ).first()
            
            if existing_course:
                # Clear semesters for this course only
                Semester.objects.filter(course=existing_course).delete()
            
            # Clear all scheduling data
            ScheduledSession.objects.all().delete()
            TimetableSlot.objects.all().delete()
            
            # Get or create course with proper handling
            course_obj, created = Course.objects.get_or_create(
                name=institute.course,
                defaults={
                    "code": institute.course[:20].upper().replace(' ', '_')
                }
            )
            
            logger.info(f"Using course: {course_obj.name} (ID: {course_obj.id})")
            
            # Create timetable slots
            for day in range(1, institute.working_days + 1):
                for period in range(1, institute.periods_per_day + 1):
                    TimetableSlot.objects.create(day=day, period_number=period)
            
            # Get user's existing faculties
            user_faculties = Faculty.objects.filter(created_by=user)
            faculty_map = {f.name: f for f in user_faculties}
            
            if not faculty_map:
                return Response({
                    'error': 'No faculty members found in your setup'
                }, status=400)
            
            # Create academic structure
            section_ids = []
            for sem_data in data["academics"]:
                try:
                    semester_number = int(sem_data['semester'])
                except (ValueError, TypeError):
                    return Response({
                        'error': f"Invalid semester number: {sem_data.get('semester')}"
                    }, status=400)
                
                # Create semester with the course object
                semester_obj = Semester.objects.create(
                    course=course_obj,  # Pass the actual Course object
                    name=f"Semester {semester_number}",
                    number=semester_number
                )
                
                logger.info(f"Created semester: {semester_obj.name} for course: {course_obj.name}")
                
                # Validate subjects data
                if 'subjects' not in sem_data or not sem_data['subjects']:
                    return Response({
                        'error': f"No subjects defined for semester {semester_number}"
                    }, status=400)
                
                semester_subjects = []
                for subj_data in sem_data["subjects"]:
                    # Validate required fields
                    if not subj_data.get("name"):
                        return Response({
                            'error': f"Subject name is required for semester {semester_number}"
                        }, status=400)
                    
                    if not subj_data.get("faculty"):
                        return Response({
                            'error': f"Faculty assignment is required for subject {subj_data.get('name', 'Unknown')}"
                        }, status=400)
                    
                    faculty_name = subj_data["faculty"]
                    if faculty_name not in faculty_map:
                        return Response({
                            'error': f"Faculty '{faculty_name}' not found in your setup. Available faculty: {', '.join(faculty_map.keys())}"
                        }, status=400)
                    
                    faculty_obj = faculty_map[faculty_name]
                    subject_code = f"{subj_data['name'][:10].replace(' ', '').upper()}_{semester_number}_{course_obj.id}"
                    
                    # Create subject
                    subject_obj = Subject.objects.create(
                        name=subj_data["name"],
                        semester=semester_obj,
                        code=subject_code,
                        weekly_hours=subj_data.get("weeklyHours", 3),
                        lab_required=subj_data.get("isLab", False),
                        lab_hours=subj_data.get("labHours", 0)
                    )
                    
                    semester_subjects.append((subject_obj, faculty_obj))
                    logger.info(f"Created subject: {subject_obj.name} assigned to {faculty_obj.name}")
                
                # Validate sections data
                if 'sections' not in sem_data or not sem_data['sections']:
                    return Response({
                        'error': f"No sections defined for semester {semester_number}"
                    }, status=400)
                
                for section_name in sem_data["sections"]:
                    if not section_name.strip():
                        continue  # Skip empty section names
                        
                    section_obj = Section.objects.create(
                        name=section_name.strip(), 
                        semester=semester_obj
                    )
                    section_ids.append(section_obj.id)
                    logger.info(f"Created section: {section_obj.name}")
                    
                    # Create faculty allocations for this section
                    for subject_obj, faculty_obj in semester_subjects:
                        FacultySubjectAllocation.objects.get_or_create(
                            faculty=faculty_obj,
                            subject=subject_obj
                        )
            
            if not section_ids:
                return Response({
                    'error': 'No valid sections were created'
                }, status=400)
            
            # Generate timetable
            logger.info("Starting timetable generation...")
            result = generate_timetable()
            
            if result["status"] != "success":
                logger.error(f"Timetable generation failed: {result['message']}")
                return Response({"error": result["message"]}, status=400)
            
            logger.info(f"Timetable generation successful. Created {len(section_ids)} sections.")
        
        return Response({
            "message": "Timetable generated successfully!",
            "section_id": section_ids[0] if section_ids else 1,
            "stats": result.get("stats", {})
        })
        
    except Exception as e:
        logger.exception("Academic setup and generation failed: %s", str(e))
        return Response({"error": f"Internal error: {str(e)}"}, status=500)
