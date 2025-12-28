import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import (
    InstitutionSettings, Room, Faculty, Semester, Section, Subject, FacultySubjectAllocation, TimetableSlot, ScheduledSession, Course
)
from .timetable_generator import generate_timetable
from django.db import transaction
from collections import defaultdict

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
                    # Enhanced subject validation with multiple faculty support
                    subject_name = subj.get("name", "").strip()
                    faculty_assignments = subj.get("facultyAssignments", [])
                    weekly_hours = subj.get("weeklyHours", 3)
                    is_lab = subj.get("isLab", False)
                    
                    if not subject_name:
                        logger.error("Subject name is required")
                        return Response({"error": "Subject name is required."}, status=400)
                    
                    if not faculty_assignments or len(faculty_assignments) == 0:
                        logger.error("At least one faculty assignment is required for subject %s", subject_name)
                        return Response({"error": f"At least one faculty must be assigned to subject {subject_name}."}, status=400)
                    
                    # Validate faculty assignments
                    total_assigned_hours = 0
                    validated_assignments = []
                    
                    for assignment in faculty_assignments:
                        faculty_name = assignment.get("faculty", "").strip()
                        hours_per_week = assignment.get("hoursPerWeek", 0)
                        
                        if not faculty_name:
                            continue  # Skip empty faculty assignments
                        
                        try:
                            faculty_obj = Faculty.objects.get(name=faculty_name)
                        except Faculty.DoesNotExist:
                            logger.error("Faculty %s not found", faculty_name)
                            return Response({"error": f"Faculty {faculty_name} not found."}, status=400)
                        
                        if hours_per_week < 1:
                            logger.error("Faculty %s must have at least 1 hour for subject %s", faculty_name, subject_name)
                            return Response({"error": f"Faculty {faculty_name} must have at least 1 hour for subject {subject_name}."}, status=400)
                        
                        total_assigned_hours += hours_per_week
                        validated_assignments.append((faculty_obj, hours_per_week))
                    
                    # Check if total assigned hours match subject weekly hours
                    if total_assigned_hours != weekly_hours:
                        logger.error("Total faculty hours (%d) don't match subject weekly hours (%d) for %s", 
                                   total_assigned_hours, weekly_hours, subject_name)
                        return Response({
                            "error": f"Total faculty hours ({total_assigned_hours}) must equal subject weekly hours ({weekly_hours}) for {subject_name}."
                        }, status=400)
                    
                    if weekly_hours < 1 or weekly_hours > 10:
                        logger.error("Invalid weekly hours for subject %s: %d", subject_name, weekly_hours)
                        return Response({"error": f"Subject {subject_name} weekly hours must be between 1 and 10."}, status=400)
                    
                    # Generate unique code from subject name + semester + type
                    subject_code = f"{subject_name[:10].replace(' ', '').upper()}_{sem['semester']}_{('LAB' if is_lab else 'TH')}"
                    
                    # Create subject
                    subject_obj = Subject.objects.create(
                        name=subject_name, 
                        semester=semester_obj,
                        code=subject_code,
                        weekly_hours=weekly_hours,
                        lab_required=is_lab,
                        lab_hours=weekly_hours if is_lab else 0
                    )
                    
                    # Store subject with multiple faculty assignments
                    semester_subjects.append((subject_obj, validated_assignments))
                    logger.info(f"Created subject: {subject_obj.name} ({'Lab' if is_lab else 'Theory'}) - {weekly_hours} hours/week with {len(validated_assignments)} faculty")

                # Create sections for each semester
                for sec in sem.get("sections", []):
                    section_name = sec.get("name", "").strip()
                    if not section_name:
                        logger.error("Section name is required")
                        return Response({"error": "Section name is required."}, status=400)
                    
                    # Create section
                    section_obj = Section.objects.create(
                        name=section_name,
                        semester=semester_obj
                    )
                    section_ids.append(section_obj.id)
                    logger.info(f"Created section: {section_obj.name} for {semester_obj.name}")

                # Faculty-Subject allocation
                for subj, assignments in semester_subjects:
                    for faculty_obj, hours in assignments:
                        FacultySubjectAllocation.objects.create(
                            faculty=faculty_obj,
                            subject=subj,
                            hours_per_week=hours
                        )
                        logger.info(f"Allocated {hours} hours of {subj.name} to {faculty_obj.name}")

            # Generate timetable
            logger.info("Starting timetable generation...")
            generate_timetable(inst, course_obj, section_ids)
            logger.info("Timetable generation completed.")

    except Exception as e:
        logger.exception("Error in setup and generate: %s", str(e))
        return Response({"error": "An error occurred during setup and timetable generation."}, status=500)
    
    return Response({"message": "Setup complete, and timetable generated successfully."}, status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_timetable(request, section_id):
    """Get timetable for a specific section"""
    try:
        from .models import Section, TimetableSlot, ScheduledSession
        
        # Get section
        section = Section.objects.get(id=section_id)
        
        # Get all sessions for this section
        sessions = ScheduledSession.objects.filter(section=section).select_related(
            'subject', 'faculty', 'room', 'slot'
        ).order_by('slot__day', 'slot__period_number')
        
        # Get all slots for structure
        slots = TimetableSlot.objects.all().order_by('day', 'period_number')
        days = {slot.day: slot.get_day_display() for slot in slots}
        periods = sorted(set(slot.period_number for slot in slots))
        
        # Build timetable
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
        
    except Section.DoesNotExist:
        return Response({'error': 'Section not found'}, status=404)
    except Exception as e:
        logger.error(f"Error getting section timetable: {str(e)}")
        return Response({'error': 'Failed to fetch timetable'}, status=500)

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
                    'name': institute.institution_name,
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
        
        logger.info(f"Received institute setup data: {data}")
        
        # Enhanced validation
        if not data.get("institute"):
            return Response({'error': 'Institute data is required'}, status=400)
        if not data.get("faculties") or len(data.get("faculties", [])) == 0:
            return Response({'error': 'At least one faculty member is required'}, status=400)
        if not data.get("rooms") or len(data.get("rooms", [])) == 0:
            return Response({'error': 'At least one room is required'}, status=400)
        
        institute_data = data["institute"]
        
        # Validate required institute fields
        required_fields = ["name", "academicYear", "course", "workingDays", "periodsPerDay"]
        for field in required_fields:
            if not institute_data.get(field):
                return Response({'error': f'Institute {field} is required'}, status=400)
        
        # Validate working constraints
        working_days = int(institute_data.get("workingDays", 5))
        periods_per_day = int(institute_data.get("periodsPerDay", 6))
        
        if working_days < 1 or working_days > 7:
            return Response({'error': 'Working days must be between 1 and 7'}, status=400)
        if periods_per_day < 1 or periods_per_day > 10:
            return Response({'error': 'Periods per day must be between 1 and 10'}, status=400)
        
        # Validate faculties
        for i, fac in enumerate(data["faculties"]):
            if not fac.get("name", "").strip():
                return Response({'error': f'Faculty {i+1} name is required'}, status=400)
            if not fac.get("empId", "").strip():
                return Response({'error': f'Faculty {i+1} employee ID is required'}, status=400)
            max_hours = fac.get("maxHours", 0)
            if not isinstance(max_hours, (int, float)) or max_hours < 1:
                return Response({'error': f'Faculty {i+1} must have at least 1 hour per week'}, status=400)
        
        # Validate rooms
        for i, room in enumerate(data["rooms"]):
            if not room.get("name", "").strip():
                return Response({'error': f'Room {i+1} name is required'}, status=400)
        
        with transaction.atomic():
            # Clear user's previous setup
            InstitutionSettings.objects.filter(created_by=user).delete()
            Faculty.objects.filter(created_by=user).delete()
            Room.objects.filter(created_by=user).delete()
            
            # Save institute settings
            institute = InstitutionSettings.objects.create(
                institution_name=institute_data.get("name", "Institution"),
                course=institute_data["course"],
                academic_year=institute_data["academicYear"],
                working_days=working_days,
                periods_per_day=periods_per_day,
                period_duration=int(institute_data.get("periodDuration", 60)),
                created_by=user,
                is_setup_complete=True
            )
            
            logger.info(f"Created institute settings: {institute}")
            
            # Save rooms with validation
            room_names = set()
            for room in data["rooms"]:
                room_name = room.get("name", "").strip()
                if room_name in room_names:
                    return Response({'error': f'Duplicate room name: {room_name}'}, status=400)
                room_names.add(room_name)
                
                room_obj = Room.objects.create(
                    name=room_name, 
                    is_lab=bool(room.get("isLab", False)),
                    created_by=user
                )
                logger.info(f"Created room: {room_obj}")
            
            # Save faculties with enhanced validation
            faculty_names = set()
            faculty_ids = set()
            
            for fac in data["faculties"]:
                fac_name = fac.get("name", "").strip()
                emp_id = fac.get("empId", "").strip()
                max_hours = int(fac.get("maxHours", 18))
                
                if fac_name in faculty_names:
                    return Response({'error': f'Duplicate faculty name: {fac_name}'}, status=400)
                if emp_id in faculty_ids:
                    return Response({'error': f'Duplicate employee ID: {emp_id}'}, status=400)
                
                faculty_names.add(fac_name)
                faculty_ids.add(emp_id)
                
                faculty_obj = Faculty.objects.create(
                    name=fac_name, 
                    employee_id=emp_id,
                    max_hours_per_week=max_hours,
                    created_by=user
                )
                logger.info(f"Created faculty: {faculty_obj}")
            
            logger.info(f"Institute setup completed for user: {user.username}")
        
        return Response({
            'message': 'Institute setup saved successfully',
            'stats': {
                'faculty_count': len(data["faculties"]),
                'room_count': len(data["rooms"]),
                'working_days': working_days,
                'periods_per_day': periods_per_day
            }
        }, status=200)
        
    except Exception as e:
        logger.exception(f"Error saving institute setup: {str(e)}")
        return Response({'error': f'Failed to save setup: {str(e)}'}, status=500)

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
        
        # Get user's existing faculties
        user_faculties = Faculty.objects.filter(created_by=user)
        if not user_faculties.exists():
            return Response({
                'error': 'No faculty members found in your setup'
            }, status=400)
        
        with transaction.atomic():
            # Clear only academic and scheduling data, keep institute setup
            existing_course = Course.objects.filter(name=institute.course).first()
            if existing_course:
                Semester.objects.filter(course=existing_course).delete()
            
            ScheduledSession.objects.all().delete()
            TimetableSlot.objects.all().delete()
            
            # Get or create course
            course_obj, created = Course.objects.get_or_create(
                name=institute.course,
                defaults={"code": institute.course[:20].upper().replace(' ', '_')}
            )
            
            # Create timetable slots
            for day in range(1, institute.working_days + 1):
                for period in range(1, institute.periods_per_day + 1):
                    TimetableSlot.objects.create(day=day, period_number=period)
            
            faculty_map = {f.name: f for f in user_faculties}
            
            # Create academic structure with multiple faculty support
            section_ids = []
            
            for sem_data in data["academics"]:
                semester_number = int(sem_data['semester'])
                semester_obj = Semester.objects.create(
                    course=course_obj,
                    name=f"Semester {semester_number}",
                    number=semester_number
                )
                
                semester_subjects = []
                for subj_data in sem_data["subjects"]:
                    subject_name = subj_data.get("name", "").strip()
                    faculty_assignments = subj_data.get("facultyAssignments", [])
                    weekly_hours = subj_data.get("weeklyHours", 3)
                    is_lab = subj_data.get("isLab", False)
                    
                    if not subject_name or not faculty_assignments:
                        continue
                    
                    # Create subject
                    subject_code = f"{subject_name[:10].replace(' ', '').upper()}_{semester_number}_{course_obj.id}_{('LAB' if is_lab else 'TH')}"
                    
                    subject_obj = Subject.objects.create(
                        name=subject_name,
                        semester=semester_obj,
                        code=subject_code,
                        weekly_hours=weekly_hours,
                        lab_required=is_lab,
                        lab_hours=weekly_hours if is_lab else 0
                    )
                    
                    # Create faculty allocations
                    validated_assignments = []
                    for assignment in faculty_assignments:
                        faculty_name = assignment.get("faculty", "").strip()
                        hours_per_week = assignment.get("hoursPerWeek", 0)
                        
                        if faculty_name in faculty_map and hours_per_week > 0:
                            validated_assignments.append((faculty_map[faculty_name], hours_per_week))
                    
                    semester_subjects.append((subject_obj, validated_assignments))
                
                # Create faculty allocations before iterating through sections
                for subject_obj, faculty_assignments in semester_subjects:
                    for faculty_obj, hours_per_week in faculty_assignments:
                        FacultySubjectAllocation.objects.create(
                            faculty=faculty_obj,
                            subject=subject_obj,
                            hours_per_week=hours_per_week
                        )

                # Create sections
                for section_name in sem_data.get("sections", []):
                    if not section_name.strip():
                        continue
                        
                    section_obj = Section.objects.create(
                        name=section_name.strip(), 
                        semester=semester_obj
                    )
                    section_ids.append(section_obj.id)
            
            if not section_ids:
                return Response({'error': 'No valid sections were created'}, status=400)
            
            # Generate timetable
            result = generate_timetable()
            
            if result["status"] != "success":
                logger.error(f"Timetable generation failed: {result['message']}")
                return Response({"error": result["message"]}, status=400)
        
        return Response({
            "message": "Timetable generated successfully!",
            "section_id": section_ids[0] if section_ids else 1,
            "stats": result.get("stats", {})
        })
        
    except Exception as e:
        logger.exception("Academic setup and generation failed: %s", str(e))
        return Response({"error": f"Internal error: {str(e)}"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_faculty_timetable(request, faculty_id):
    """Get timetable for a specific faculty member"""
    try:
        from .models import Faculty, ScheduledSession, TimetableSlot
        
        # Get faculty
        faculty = Faculty.objects.get(id=faculty_id)
        
        # Get all sessions for this faculty
        sessions = ScheduledSession.objects.filter(faculty=faculty).select_related(
            'section', 'subject', 'room', 'slot'
        ).order_by('slot__day', 'slot__period_number')
        
        # Get all slots for structure
        slots = TimetableSlot.objects.all().order_by('day', 'period_number')
        days = {slot.day: slot.get_day_display() for slot in slots}
        periods = sorted(set(slot.period_number for slot in slots))
        
        # Build faculty-specific timetable
        faculty_timetable = []
        for session in sessions:
            faculty_timetable.append({
                "day": session.slot.get_day_display(),
                "period": session.slot.period_number,
                "subject": session.subject.name,
                "section": f"{session.section.semester.name} - Section {session.section.name}",
                "room": session.room.name,
                "is_lab": session.is_lab_session,
                "semester": session.section.semester.number
            })
        
        return Response({
            "faculty": {
                "name": faculty.name,
                "employee_id": faculty.employee_id,
                "max_hours_per_week": faculty.max_hours_per_week
            },
            "days": list(days.values()),
            "periods": [str(p) for p in periods],
            "timetable": faculty_timetable,
            "summary": {
                "total_hours": len(sessions),
                "max_hours": faculty.max_hours_per_week,
                "utilization": (len(sessions) / faculty.max_hours_per_week * 100) if faculty.max_hours_per_week > 0 else 0
            }
        })
        
    except Faculty.DoesNotExist:
        return Response({'error': 'Faculty not found'}, status=404)
    except Exception as e:
        logger.error(f"Error getting faculty timetable: {str(e)}")
        return Response({'error': 'Failed to fetch faculty timetable'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_master_timetable(request):
    """Get master timetable showing all sections and faculty"""
    try:
        from .models import ScheduledSession, TimetableSlot, Section
        
        # Get all sessions
        sessions = ScheduledSession.objects.all().select_related(
            'section', 'subject', 'faculty', 'room', 'slot'
        ).order_by('slot__day', 'slot__period_number', 'section__name')
        
        # Get structure
        slots = TimetableSlot.objects.all().order_by('day', 'period_number')
        days = {slot.day: slot.get_day_display() for slot in slots}
        periods = sorted(set(slot.period_number for slot in slots))
        
        # Group sessions by day and period
        master_timetable = {}
        for day_num, day_name in days.items():
            master_timetable[day_name] = {}
            for period in periods:
                day_period_sessions = sessions.filter(
                    slot__day=day_num, 
                    slot__period_number=period
                )
                master_timetable[day_name][str(period)] = [
                    {
                        "subject": session.subject.name,
                        "faculty": session.faculty.name,
                        "section": f"{session.section.semester.name} - {session.section.name}",
                        "room": session.room.name,
                        "is_lab": session.is_lab_session,
                        "semester": session.section.semester.number
                    }
                    for session in day_period_sessions
                ]
        
        # Get all sections
        sections = Section.objects.all().select_related('semester')
        
        return Response({
            "days": list(days.values()),
            "periods": [str(p) for p in periods],
            "master_timetable": master_timetable,
            "sections": [
                {
                    "id": section.id,
                    "name": section.name,
                    "semester": section.semester.number,
                    "display_name": f"{section.semester.name} - Section {section.name}"
                }
                for section in sections
            ],
            "total_sessions": sessions.count()
        })
        
    except Exception as e:
        logger.error(f"Error getting master timetable: {str(e)}")
        return Response({'error': 'Failed to fetch master timetable'}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_faculty_for_timetables(request):
    """List all faculty members for timetable generation"""
    try:
        from .models import Faculty, ScheduledSession
        
        # Get faculty with session counts
        faculties = Faculty.objects.all()
        faculty_list = []
        
        for faculty in faculties:
            session_count = ScheduledSession.objects.filter(faculty=faculty).count()
            faculty_list.append({
                'id': faculty.id,
                'name': faculty.name,
                'employee_id': faculty.employee_id,
                'max_hours_per_week': faculty.max_hours_per_week,
                'sessions_count': session_count,
                'utilization': (session_count / faculty.max_hours_per_week * 100) if faculty.max_hours_per_week > 0 else 0
            })
        
        return Response({
            'faculties': faculty_list,
            'total_count': len(faculty_list)
        })
        
    except Exception as e:
        logger.error(f"Error listing faculty: {str(e)}")
        return Response({'error': 'Failed to fetch faculty list'}, status=500)

# Placeholder functions for interactive editing features
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_session(request):
    """Move a session to a new time slot"""
    return Response({'error': 'Feature not implemented yet'}, status=501)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_move(request):
    """Validate if a session move would create conflicts"""
    return Response({'error': 'Feature not implemented yet'}, status=501)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def swap_sessions(request):
    """Swap two sessions"""
    return Response({'error': 'Feature not implemented yet'}, status=501)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_operations(request):
    """Handle bulk operations"""
    return Response({'error': 'Feature not implemented yet'}, status=501)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_slots(request):
    """Get available time slots"""
    return Response({'error': 'Feature not implemented yet'}, status=501)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_algorithm_flowchart(request):
    """Get algorithm flowchart data with steps, test cases, and interactive elements"""
    try:
        # Get current user's setup for realistic test data
        user = request.user
        institute = InstitutionSettings.objects.filter(created_by=user).first()
        user_faculties = Faculty.objects.filter(created_by=user)
        user_rooms = Room.objects.filter(created_by=user)
        
        # Algorithm steps with detailed explanations
        algorithm_steps = [
            {
                "id": "step1",
                "title": "Initialize System",
                "description": "Load institution settings, faculty limits, and available resources",
                "type": "input",
                "inputs": ["Institution Settings", "Faculty List", "Room List", "Time Slots"],
                "outputs": ["System Configuration"],
                "details": "Validates working days (1-7), periods per day (1-10), and creates time slot matrix",
                "complexity": "O(1)",
                "sample_data": {
                    "working_days": institute.working_days if institute else 6,
                    "periods_per_day": institute.periods_per_day if institute else 7,
                    "total_slots": (institute.working_days * institute.periods_per_day) if institute else 42,
                    "faculty_count": user_faculties.count(),
                    "room_count": user_rooms.count()
                }
            },
            {
                "id": "step2",
                "title": "Validate Faculty Hours",
                "description": "Check faculty hour limits and calculate total available teaching hours",
                "type": "validation",
                "inputs": ["Faculty List", "Hour Limits"],
                "outputs": ["Faculty Capacity Matrix"],
                "details": "Each faculty has max_hours_per_week limit. System ensures no faculty exceeds this limit",
                "complexity": "O(f) where f = number of faculty",
                "sample_data": {
                    "faculty_limits": [
                        {"name": f.name, "max_hours": f.max_hours_per_week} 
                        for f in user_faculties.all()[:3]
                    ] if user_faculties.exists() else [
                        {"name": "Dr. Smith", "max_hours": 18},
                        {"name": "Prof. Johnson", "max_hours": 16},
                        {"name": "Ms. Davis", "max_hours": 20}
                    ],
                    "total_available_hours": sum(f.max_hours_per_week for f in user_faculties.all()) or 54
                }
            },
            {
                "id": "step3",
                "title": "Create Session List",
                "description": "Generate all sessions needed based on subject allocations",
                "type": "processing",
                "inputs": ["Subjects", "Faculty Allocations", "Weekly Hours"],
                "outputs": ["Session Queue"],
                "details": "Creates individual session objects for each subject-faculty allocation pair",
                "complexity": "O(s × f) where s = subjects, f = faculty per subject",
                "sample_data": {
                    "sample_sessions": [
                        {"subject": "Data Structures", "faculty": "Dr. Smith", "hours_needed": 3, "type": "Theory"},
                        {"subject": "Database Lab", "faculty": "Prof. Johnson", "hours_needed": 2, "type": "Lab"},
                        {"subject": "Web Development", "faculty": "Ms. Davis", "hours_needed": 4, "type": "Theory"}
                    ],
                    "total_sessions": 45,
                    "lab_sessions": 12,
                    "theory_sessions": 33
                }
            },
            {
                "id": "step4",
                "title": "Priority Sorting",
                "description": "Sort sessions by priority: faculty load balance, lab preference, and constraints",
                "type": "optimization",
                "inputs": ["Session Queue", "Faculty Load", "Subject Types"],
                "outputs": ["Prioritized Session List"],
                "details": "Labs get higher priority, then balanced by faculty current workload",
                "complexity": "O(n log n) where n = total sessions",
                "sample_data": {
                    "sorting_criteria": [
                        "Faculty load ratio (current/max)",
                        "Lab sessions (higher priority)",
                        "Section distribution balance",
                        "Random factor for variety"
                    ],
                    "priority_example": {
                        "high_priority": "Database Lab (Lab + low faculty load)",
                        "medium_priority": "Data Structures (Theory + medium load)", 
                        "low_priority": "Elective Subject (Theory + high faculty load)"
                    }
                }
            },
            {
                "id": "step5",
                "title": "Slot Assignment Loop",
                "description": "For each session, find the best available time slot",
                "type": "iteration",
                "inputs": ["Prioritized Sessions", "Available Slots", "Conflict Matrix"],
                "outputs": ["Scheduled Sessions"],
                "details": "Checks faculty, section, and room conflicts for each potential slot",
                "complexity": "O(n × s × r) where n = sessions, s = slots, r = rooms",
                "sample_data": {
                    "conflict_checks": [
                        "Faculty already teaching at this time?",
                        "Section already has class at this time?", 
                        "Room already occupied?",
                        "Too many consecutive sessions?",
                        "Exceeds daily session limit?"
                    ],
                    "slot_selection": {
                        "strategy": "Minimize day clustering",
                        "lab_preference": "Adjacent slots for multi-hour labs",
                        "distribution": "Spread across all working days"
                    }
                }
            },
            {
                "id": "step6",
                "title": "Conflict Resolution",
                "description": "Handle scheduling conflicts and constraint violations",
                "type": "decision",
                "inputs": ["Potential Conflicts", "Constraint Rules"],
                "outputs": ["Resolved Schedule or Skip Session"],
                "details": "Uses fallback strategies and relaxed constraints when needed",
                "complexity": "O(1) per conflict check",
                "sample_data": {
                    "common_conflicts": [
                        {"type": "Faculty Overlap", "resolution": "Try different time slot"},
                        {"type": "Room Unavailable", "resolution": "Use alternative room type"},
                        {"type": "Section Overload", "resolution": "Distribute to lighter day"},
                        {"type": "Lab Room Shortage", "resolution": "Allow theory rooms for labs"}
                    ],
                    "constraint_relaxation": [
                        "Allow theory subjects in lab rooms if needed",
                        "Permit 4+ sessions per day in fallback mode",
                        "Accept non-adjacent lab sessions if necessary"
                    ]
                }
            },
            {
                "id": "step7",
                "title": "Update Tracking",
                "description": "Update all tracking matrices after successful assignment",
                "type": "processing",
                "inputs": ["Scheduled Session", "Tracking Matrices"],
                "outputs": ["Updated System State"],
                "details": "Updates faculty hours, room occupancy, section schedules, and day counters",
                "complexity": "O(1) per update",
                "sample_data": {
                    "tracking_updates": [
                        "faculty_schedule[faculty_id].add(slot_id)",
                        "faculty_hours_used[faculty_id] += 1",
                        "room_schedule[room_id].add(slot_id)", 
                        "section_schedule[section_id].add(slot_id)",
                        "section_day_count[section][day] += 1"
                    ],
                    "state_example": {
                        "dr_smith_hours": "12/18 used",
                        "lab_room_1": "15/42 slots occupied",
                        "section_A_monday": "3/7 periods scheduled"
                    }
                }
            },
            {
                "id": "step8",
                "title": "Generate Statistics",
                "description": "Calculate success rates, utilization metrics, and warnings",
                "type": "output",
                "inputs": ["Final Schedule", "Original Requirements"],
                "outputs": ["Statistics Report", "Warnings"],
                "details": "Provides comprehensive analytics on scheduling success and resource utilization",
                "complexity": "O(n) where n = scheduled sessions",
                "sample_data": {
                    "success_metrics": {
                        "scheduling_rate": "89.5% (179/200 sessions)",
                        "faculty_utilization": "Average 74.2%",
                        "room_utilization": "68.9% peak usage", 
                        "day_distribution": "Monday: 85%, Tuesday: 78%, ..."
                    },
                    "warnings": [
                        "3 faculty members under 50% utilization",
                        "Section CS-A has no Friday classes",
                        "Lab Room shortage during peak hours"
                    ]
                }
            }
        ]
        
        # Test cases with different scenarios
        test_cases = [
            {
                "id": "optimal",
                "title": "Optimal Case",
                "description": "Sufficient resources, balanced faculty loads",
                "parameters": {
                    "faculty_count": 8,
                    "subjects": 12,
                    "sections": 4,
                    "working_days": 6,
                    "periods_per_day": 7,
                    "total_hours_needed": 120,
                    "total_hours_available": 144
                },
                "expected_outcome": {
                    "success_rate": "95-100%",
                    "faculty_utilization": "70-85%",
                    "issues": "Minimal conflicts"
                },
                "visualization_color": "#10B981"
            },
            {
                "id": "constrained",
                "title": "Resource Constrained",
                "description": "Limited faculty hours or rooms",
                "parameters": {
                    "faculty_count": 5,
                    "subjects": 15,
                    "sections": 6,
                    "working_days": 5,
                    "periods_per_day": 6,
                    "total_hours_needed": 180,
                    "total_hours_available": 150
                },
                "expected_outcome": {
                    "success_rate": "75-85%",
                    "faculty_utilization": "90-100%",
                    "issues": "Some sessions unscheduled"
                },
                "visualization_color": "#F59E0B"
            },
            {
                "id": "overloaded",
                "title": "Overloaded System",
                "description": "More requirements than capacity",
                "parameters": {
                    "faculty_count": 4,
                    "subjects": 20,
                    "sections": 8,
                    "working_days": 5,
                    "periods_per_day": 7,
                    "total_hours_needed": 280,
                    "total_hours_available": 160
                },
                "expected_outcome": {
                    "success_rate": "50-65%",
                    "faculty_utilization": "100%",
                    "issues": "Many unscheduled sessions"
                },
                "visualization_color": "#EF4444"
            }
        ]
        
        # Interactive elements for learning
        interactive_elements = {
            "what_if_scenarios": [
                {
                    "question": "What if we add one more faculty member?",
                    "impact": "Reduces average faculty load, improves success rate by ~15%",
                    "explanation": "More teaching capacity allows better distribution and fewer conflicts"
                },
                {
                    "question": "What if we reduce working days from 6 to 5?", 
                    "impact": "Increases day density, may reduce success rate by ~20%",
                    "explanation": "Fewer available slots create more scheduling conflicts"
                },
                {
                    "question": "What if all subjects require lab rooms?",
                    "impact": "Room conflicts increase dramatically, success rate drops ~40%",
                    "explanation": "Limited lab rooms become bottleneck resource"
                },
                {
                    "question": "What if faculty hours are unlimited?",
                    "impact": "Scheduling becomes purely slot-based, ~98% success rate",
                    "explanation": "Removes faculty capacity constraints, only time/room conflicts remain"
                }
            ],
            "algorithm_variations": [
                {
                    "name": "Greedy First-Fit",
                    "description": "Schedule sessions in order without optimization",
                    "pros": ["Fast execution", "Simple implementation"],
                    "cons": ["Poor resource utilization", "Unbalanced schedule"]
                },
                {
                    "name": "Priority-Based (Current)",
                    "description": "Sort by priority then schedule optimally",
                    "pros": ["Balanced workload", "Handles constraints well"],
                    "cons": ["More complex", "Slightly slower"]
                },
                {
                    "name": "Genetic Algorithm",
                    "description": "Evolutionary approach for optimal solutions",
                    "pros": ["Near-optimal results", "Handles complex constraints"],
                    "cons": ["Much slower", "Complex implementation"]
                }
            ]
        }
        
        # Performance metrics
        performance_data = {
            "time_complexity": {
                "initialization": "O(d × p) - Create time slots",
                "validation": "O(f) - Check faculty limits", 
                "session_creation": "O(s × a) - Create session list",
                "sorting": "O(n log n) - Priority sorting",
                "scheduling": "O(n × s × r) - Main scheduling loop",
                "overall": "O(n × s × r) - Dominated by scheduling loop"
            },
            "space_complexity": {
                "tracking_matrices": "O(f × s + r × s + sec × s) - Conflict tracking",
                "session_storage": "O(n) - Session objects", 
                "overall": "O((f + r + sec) × s + n) - Linear in most parameters"
            },
            "typical_performance": {
                "small_institution": "< 1 second (4 faculty, 50 sessions)",
                "medium_institution": "2-5 seconds (10 faculty, 200 sessions)",
                "large_institution": "10-30 seconds (25 faculty, 500 sessions)"
            }
        }
        
        return Response({
            "algorithm_steps": algorithm_steps,
            "test_cases": test_cases,
            "interactive_elements": interactive_elements,
            "performance_data": performance_data,
            "user_context": {
                "has_setup": institute is not None,
                "faculty_count": user_faculties.count(),
                "room_count": user_rooms.count(),
                "estimated_complexity": "Medium" if user_faculties.count() > 5 else "Low"
            }
        })
        
    except Exception as e:
        logger.error(f"Error generating flowchart data: {str(e)}")
        return Response({'error': 'Failed to generate algorithm flowchart'}, status=500)
