import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import (
    InstitutionSettings, Room, Faculty, Semester, Section, Subject, 
    FacultySubjectAllocation, TimetableSlot, ScheduledSession, Course
)
from .timetable_generator import generate_timetable
from django.db import transaction
from collections import defaultdict

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_and_generate(request):
    """Generate timetable with full setup"""
    data = request.data
    logger.info(f"Timetable generation requested by user: {request.user.username}")

    MAX_PERIODS_PER_DAY = 8
    MAX_WORKING_DAYS = 7

    periods_per_day = data.get("institute", {}).get("periodsPerDay", 6)
    working_days = data.get("institute", {}).get("workingDays", 5)
    
    if periods_per_day > MAX_PERIODS_PER_DAY or periods_per_day < 1:
        return Response({"error": f"Periods per day must be between 1 and {MAX_PERIODS_PER_DAY}."}, status=400)
    if working_days > MAX_WORKING_DAYS or working_days < 1:
        return Response({"error": f"Working days must be between 1 and {MAX_WORKING_DAYS}."}, status=400)

    try:
        with transaction.atomic():
            # Clear previous data
            ScheduledSession.objects.all().delete()
            TimetableSlot.objects.all().delete()
            Section.objects.all().delete()
            Subject.objects.all().delete()
            Semester.objects.all().delete()
            FacultySubjectAllocation.objects.all().delete()
            Room.objects.all().delete()
            Faculty.objects.all().delete()
            InstitutionSettings.objects.all().delete()

            # Save institution
            inst = InstitutionSettings.objects.create(
                institution_name=data["institute"].get("name", "Institution"),
                course=data["institute"]["course"],
                academic_year=data["institute"]["academicYear"],
                working_days=working_days,
                periods_per_day=periods_per_day,
                period_duration=data["institute"].get("periodDuration", 60)
            )

            course_obj, _ = Course.objects.get_or_create(
                name=data["institute"]["course"],
                defaults={"code": data["institute"]["course"][:20].upper()}
            )

            # Create slots
            for day in range(1, working_days + 1):
                for period in range(1, periods_per_day + 1):
                    TimetableSlot.objects.create(day=day, period_number=period)

            # Save rooms
            for room in data.get("rooms", []):
                Room.objects.create(name=room["name"], is_lab=room.get("isLab", False))

            # Save faculties
            for fac in data.get("faculties", []):
                Faculty.objects.create(
                    name=fac["name"],
                    employee_id=fac["empId"],
                    max_hours_per_week=fac.get("maxHours", 18)
                )

            # Save academics
            section_ids = []
            for sem in data.get("academics", []):
                semester_obj = Semester.objects.create(
                    course=course_obj,
                    name=f"Semester {sem['semester']}",
                    number=sem["semester"]
                )
                
                semester_subjects = []
                for subj in sem.get("subjects", []):
                    if not subj.get("faculty"):
                        return Response({"error": f"Faculty not assigned for {subj.get('name')}"}, status=400)
                    
                    try:
                        faculty_obj = Faculty.objects.get(name=subj["faculty"])
                    except Faculty.DoesNotExist:
                        return Response({"error": f"Faculty {subj['faculty']} not found"}, status=400)
                    
                    subject_code = f"{subj['name'][:10].upper()}_{sem['semester']}"
                    subject_obj, _ = Subject.objects.get_or_create(
                        semester=semester_obj,
                        code=subject_code,
                        defaults={
                            'name': subj['name'],
                            'weekly_hours': subj.get('weeklyHours', 3),
                            'lab_required': subj.get('isLab', False)
                        }
                    )
                    semester_subjects.append((subject_obj, faculty_obj))
                
                for sec in sem.get("sections", []):
                    if not sec.strip():
                        continue
                    section_obj = Section.objects.create(name=sec.strip(), semester=semester_obj)
                    section_ids.append(section_obj.id)
                    
                    for subject_obj, faculty_obj in semester_subjects:
                        FacultySubjectAllocation.objects.get_or_create(
                            faculty=faculty_obj,
                            subject=subject_obj
                        )

            # Generate timetable
            result = generate_timetable()
            if result["status"] != "success":
                return Response({"error": result["message"]}, status=400)

            logger.info(f"Timetable generated for {len(section_ids)} sections")
            return Response({
                "message": "Timetable generated successfully!",
                "section_id": section_ids[0] if section_ids else 1,
                "stats": result.get("stats", {})
            })

    except Exception as e:
        logger.exception("Setup and generate failed")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_timetable(request, section_id):
    """View timetable for a specific section"""
    try:
        logger.info(f"Timetable view requested for section: {section_id}")
        
        section = Section.objects.get(id=section_id)
        slots = TimetableSlot.objects.all().order_by('day', 'period_number')
        days = {slot.day: slot.get_day_display() for slot in slots}
        periods = sorted(set(slot.period_number for slot in slots))
        sessions = ScheduledSession.objects.filter(section_id=section_id).select_related(
            'slot', 'subject', 'faculty', 'room'
        )

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
        logger.error(f"Error viewing timetable: {str(e)}")
        return Response({'error': 'Failed to fetch timetable'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_timetables(request):
    """List all available timetables"""
    try:
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
        
        logger.info(f"Listed {len(timetables)} timetables")
        return Response({'timetables': timetables, 'total_count': len(timetables)})
        
    except Exception as e:
        logger.error(f"Error listing timetables: {str(e)}")
        return Response({'error': 'Failed to fetch timetables'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_section_navigation(request, section_id):
    """Get navigation for sections"""
    try:
        current_section = Section.objects.get(id=section_id)
        sections_with_sessions = Section.objects.filter(
            scheduledsession__isnull=False,
            semester__course=current_section.semester.course
        ).distinct().order_by('semester__number', 'name')
        
        navigation_data = [
            {
                'id': s.id,
                'name': s.name,
                'semester': s.semester.number,
                'display_name': f"Semester {s.semester.number} - Section {s.name}"
            }
            for s in sections_with_sessions
        ]
        
        return Response({
            'current_section': {
                'id': current_section.id,
                'name': current_section.name,
                'semester': current_section.semester.number
            },
            'all_sections': navigation_data
        })
        
    except Section.DoesNotExist:
        return Response({'error': 'Section not found'}, status=404)
    except Exception as e:
        logger.error(f"Error getting navigation: {str(e)}")
        return Response({'error': 'Failed to fetch navigation'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_setup_status(request):
    """Check user setup status"""
    try:
        user = request.user
        institute_setup = InstitutionSettings.objects.filter(
            created_by=user, is_setup_complete=True
        ).exists()
        
        institute_data = None
        faculties_data = []
        rooms_data = []
        
        if institute_setup:
            inst = InstitutionSettings.objects.filter(created_by=user).first()
            if inst:
                institute_data = {
                    'name': inst.institution_name,
                    'academicYear': inst.academic_year,
                    'course': inst.course,
                    'workingDays': inst.working_days,
                    'periodsPerDay': inst.periods_per_day,
                    'periodDuration': inst.period_duration
                }
            
            faculties_data = [
                {'name': f.name, 'empId': f.employee_id, 'maxHours': f.max_hours_per_week}
                for f in Faculty.objects.filter(created_by=user)
            ]
            rooms_data = [
                {'name': r.name, 'isLab': r.is_lab}
                for r in Room.objects.filter(created_by=user)
            ]
        
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
    """Save institute setup"""
    try:
        user = request.user
        data = request.data
        
        with transaction.atomic():
            InstitutionSettings.objects.filter(created_by=user).delete()
            Faculty.objects.filter(created_by=user).delete()
            Room.objects.filter(created_by=user).delete()
            
            InstitutionSettings.objects.create(
                institution_name=data["institute"]["name"],
                course=data["institute"]["course"],
                academic_year=data["institute"]["academicYear"],
                working_days=data["institute"]["workingDays"],
                periods_per_day=data["institute"]["periodsPerDay"],
                period_duration=data["institute"]["periodDuration"],
                created_by=user,
                is_setup_complete=True
            )
            
            for room in data.get("rooms", []):
                Room.objects.create(name=room["name"], is_lab=room.get("isLab", False), created_by=user)
            
            for fac in data.get("faculties", []):
                Faculty.objects.create(
                    name=fac["name"],
                    employee_id=fac["empId"],
                    max_hours_per_week=fac.get("maxHours", 18),
                    created_by=user
                )
        
        logger.info(f"Institute setup saved for user: {user.username}")
        return Response({'message': 'Institute setup saved successfully'})
        
    except Exception as e:
        logger.error(f"Error saving setup: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_from_academic_setup(request):
    """Generate timetable from academic setup"""
    try:
        user = request.user
        data = request.data
        
        institute = InstitutionSettings.objects.filter(
            created_by=user, is_setup_complete=True
        ).first()
        
        if not institute:
            return Response({'error': 'Please complete institute setup first'}, status=400)
        
        if not data.get('academics'):
            return Response({'error': 'Academic data is required'}, status=400)
        
        with transaction.atomic():
            existing_course = Course.objects.filter(name=institute.course).first()
            if existing_course:
                Semester.objects.filter(course=existing_course).delete()
            
            ScheduledSession.objects.all().delete()
            TimetableSlot.objects.all().delete()
            
            course_obj, _ = Course.objects.get_or_create(
                name=institute.course,
                defaults={"code": institute.course[:20].upper().replace(' ', '_')}
            )
            
            # Create slots
            for day in range(1, institute.working_days + 1):
                for period in range(1, institute.periods_per_day + 1):
                    TimetableSlot.objects.create(day=day, period_number=period)
            
            user_faculties = Faculty.objects.filter(created_by=user)
            faculty_map = {f.name: f for f in user_faculties}
            
            if not faculty_map:
                return Response({'error': 'No faculty members found in setup'}, status=400)
            
            section_ids = []
            for sem_data in data["academics"]:
                try:
                    semester_number = int(sem_data['semester'])
                except (ValueError, TypeError):
                    return Response({'error': f"Invalid semester: {sem_data.get('semester')}"}, status=400)
                
                semester_obj = Semester.objects.create(
                    course=course_obj,
                    name=f"Semester {semester_number}",
                    number=semester_number
                )
                
                semester_subjects = []
                for subj_data in sem_data.get("subjects", []):
                    if not subj_data.get("name") or not subj_data.get("faculty"):
                        return Response({'error': 'Subject name and faculty required'}, status=400)
                    
                    faculty_name = subj_data["faculty"]
                    if faculty_name not in faculty_map:
                        return Response({'error': f"Faculty '{faculty_name}' not found"}, status=400)
                    
                    faculty_obj = faculty_map[faculty_name]
                    subject_code = f"{subj_data['name'][:10].upper()}_{semester_number}"
                    
                    subject_obj = Subject.objects.create(
                        name=subj_data["name"],
                        semester=semester_obj,
                        code=subject_code,
                        weekly_hours=subj_data.get("weeklyHours", 3),
                        lab_required=subj_data.get("isLab", False)
                    )
                    
                    semester_subjects.append((subject_obj, faculty_obj))
                
                for section_name in sem_data.get("sections", []):
                    if not section_name.strip():
                        continue
                    
                    section_obj = Section.objects.create(name=section_name.strip(), semester=semester_obj)
                    section_ids.append(section_obj.id)
                    
                    for subject_obj, faculty_obj in semester_subjects:
                        FacultySubjectAllocation.objects.get_or_create(
                            faculty=faculty_obj,
                            subject=subject_obj
                        )
            
            if not section_ids:
                return Response({'error': 'No valid sections created'}, status=400)
            
            result = generate_timetable()
            if result["status"] != "success":
                return Response({"error": result["message"]}, status=400)
        
        logger.info(f"Generated timetable for {len(section_ids)} sections")
        return Response({
            "message": "Timetable generated successfully!",
            "section_id": section_ids[0],
            "stats": result.get("stats", {})
        })
        
    except Exception as e:
        logger.exception("Academic setup failed")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_faculty_timetable(request, faculty_id):
    """Get faculty timetable"""
    try:
        faculty = Faculty.objects.get(id=faculty_id)
        sessions = ScheduledSession.objects.filter(faculty=faculty).select_related(
            'slot', 'subject', 'section', 'room'
        )
        
        timetable_data = [
            {
                'day': s.slot.get_day_display(),
                'period': s.slot.period_number,
                'subject': s.subject.name,
                'section': s.section.name,
                'semester': s.section.semester.number,
                'room': s.room.name,
                'is_lab': s.is_lab_session,
            }
            for s in sessions
        ]
        
        all_slots = TimetableSlot.objects.all()
        days = sorted(set(s.get_day_display() for s in all_slots))
        periods = sorted(set(s.period_number for s in all_slots))
        
        continuous_warnings = detect_continuous_periods(sessions)
        
        return Response({
            'faculty': {
                'id': faculty.id,
                'name': faculty.name,
                'employee_id': faculty.employee_id,
                'max_hours_per_week': faculty.max_hours_per_week,
                'total_assigned_sessions': len(timetable_data)
            },
            'days': days,
            'periods': [str(p) for p in periods],
            'timetable': timetable_data,
            'continuous_warnings': continuous_warnings
        })
        
    except Faculty.DoesNotExist:
        return Response({'error': 'Faculty not found'}, status=404)
    except Exception as e:
        logger.error(f"Error retrieving faculty timetable: {str(e)}")
        return Response({'error': 'Failed to retrieve faculty timetable'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_faculties(request):
    """List all faculties"""
    try:
        faculties = Faculty.objects.all()
        faculty_list = [
            {
                'id': f.id,
                'name': f.name,
                'employee_id': f.employee_id,
                'max_hours': f.max_hours_per_week,
                'assigned_sessions': ScheduledSession.objects.filter(faculty=f).count()
            }
            for f in faculties
        ]
        
        logger.info(f"Listed {len(faculty_list)} faculty members")
        return Response({'faculties': faculty_list, 'total_count': len(faculty_list)})
        
    except Exception as e:
        logger.error(f"Error listing faculties: {str(e)}")
        return Response({'error': 'Failed to list faculties'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_master_timetable(request):
    """Get master timetable"""
    try:
        sections = Section.objects.filter(scheduledsession__isnull=False).distinct()
        
        if not sections.exists():
            return Response({'error': 'No timetables found'}, status=404)
        
        master_data = []
        all_slots = TimetableSlot.objects.all().order_by('day', 'period_number')
        days = sorted(set(s.get_day_display() for s in all_slots))
        periods = sorted(set(s.period_number for s in all_slots))
        
        for section in sections:
            sessions = ScheduledSession.objects.filter(section=section).select_related(
                'slot', 'subject', 'faculty', 'room'
            )
            
            section_timetable = [
                {
                    'day': s.slot.get_day_display(),
                    'period': s.slot.period_number,
                    'subject': s.subject.name,
                    'faculty': s.faculty.name,
                    'room': s.room.name,
                    'is_lab': s.is_lab_session,
                }
                for s in sessions
            ]
            
            master_data.append({
                'section_id': section.id,
                'section_name': section.name,
                'semester': section.semester.number,
                'course': section.semester.course.name,
                'sessions': section_timetable
            })
        
        logger.info(f"Master timetable for {len(master_data)} sections")
        return Response({
            'days': days,
            'periods': [str(p) for p in periods],
            'sections': master_data,
            'total_sections': len(master_data)
        })
        
    except Exception as e:
        logger.error(f"Error retrieving master timetable: {str(e)}")
        return Response({'error': 'Failed to retrieve master timetable'}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def validate_continuous_periods(request):
    """Validate continuous periods"""
    try:
        violations = []
        faculties = Faculty.objects.all()
        
        for faculty in faculties:
            warnings = detect_continuous_periods_for_faculty(faculty)
            if warnings:
                violations.append({
                    'faculty_id': faculty.id,
                    'faculty_name': faculty.name,
                    'warnings': warnings
                })
        
        return Response({
            'violations': violations,
            'total_violations': len(violations)
        })
        
    except Exception as e:
        logger.error(f"Error validating: {str(e)}")
        return Response({'error': 'Validation failed'}, status=500)


def detect_continuous_periods(sessions):
    """Detect continuous periods"""
    warnings = []
    
    if not sessions:
        return warnings
    
    sessions_by_day = defaultdict(list)
    for session in sessions:
        sessions_by_day[session.slot.day].append(session)
    
    for day, day_sessions in sessions_by_day.items():
        sorted_sessions = sorted(day_sessions, key=lambda s: s.slot.period_number)
        
        consecutive_groups = []
        current_group = [sorted_sessions[0]]
        
        for i in range(1, len(sorted_sessions)):
            if sorted_sessions[i].slot.period_number == sorted_sessions[i-1].slot.period_number + 1:
                current_group.append(sorted_sessions[i])
            else:
                if len(current_group) > 1:
                    consecutive_groups.append(current_group)
                current_group = [sorted_sessions[i]]
        
        if len(current_group) > 1:
            consecutive_groups.append(current_group)
        
        for group in consecutive_groups:
            if len(group) >= 3:
                day_map = {
                    1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
                    5: 'Friday', 6: 'Saturday', 7: 'Sunday'
                }
                warnings.append({
                    'day': day_map.get(day),
                    'periods': [str(s.slot.period_number) for s in group],
                    'count': len(group),
                    'severity': 'high' if len(group) >= 4 else 'medium'
                })
    
    return warnings


def detect_continuous_periods_for_faculty(faculty):
    """Detect continuous periods for faculty"""
    sessions = ScheduledSession.objects.filter(faculty=faculty).select_related('slot')
    return detect_continuous_periods(sessions)
