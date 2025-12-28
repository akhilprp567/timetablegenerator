import logging
from .models import Section, Subject, Faculty, Room, TimetableSlot, ScheduledSession, FacultySubjectAllocation, InstitutionSettings
from collections import defaultdict
import random

logger = logging.getLogger(__name__)

def generate_timetable():
    """Enhanced timetable generator with strict faculty hour constraints and full week utilization"""
    
    sections = Section.objects.all()
    slots = list(TimetableSlot.objects.all().order_by('day', 'period_number'))
    settings = InstitutionSettings.objects.first()

    if not settings:
        raise ValueError("No institution settings found")

    if not sections.exists():
        raise ValueError("No sections found")
    
    if not slots:
        raise ValueError("No time slots found")

    logger.info("Starting enhanced timetable generation with strict faculty hour tracking")
    logger.info("Sections: %d, Total slots: %d (%d days × %d periods)", 
                sections.count(), len(slots), settings.working_days, settings.periods_per_day)

    # Clear previous sessions
    ScheduledSession.objects.all().delete()

    # Initialize tracking structures
    faculty_schedule = defaultdict(set)  # faculty_id -> set of slot_ids
    faculty_hours_used = defaultdict(int)  # faculty_id -> total hours used
    room_schedule = defaultdict(set)     # room_id -> set of slot_ids
    section_schedule = defaultdict(set)  # section_id -> set of slot_ids
    
    # Track sessions per day for better distribution
    section_day_count = defaultdict(lambda: defaultdict(int))  # section_id -> day -> count
    subject_day_count = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))  # section -> subject -> day -> count

    result = []
    
    # Get faculty hour limits and validate them
    faculty_limits = {}
    faculties = Faculty.objects.all()
    total_faculty_hours_available = 0
    
    for faculty in faculties:
        max_hours = max(1, min(faculty.max_hours_per_week, settings.working_days * settings.periods_per_day))
        faculty_limits[faculty.id] = max_hours
        total_faculty_hours_available += max_hours
        logger.info(f"Faculty {faculty.name} ({faculty.id}): {max_hours} hours/week limit")
    
    # Calculate total sessions needed and validate feasibility
    total_sessions_needed = 0
    sessions_by_faculty = defaultdict(int)
    
    # Collect all sessions that need to be scheduled with better hour distribution
    all_sessions = []
    
    for section in sections:
        subjects = Subject.objects.filter(semester=section.semester)
        logger.info(f"Section {section.name} (ID: {section.id}): {subjects.count()} subjects")
        
        for subject in subjects:
            # Get all faculty allocations for this subject (supporting multiple faculty)
            allocations = FacultySubjectAllocation.objects.filter(subject=subject)
            if not allocations.exists():
                logger.warning(f"No faculty allocated for subject {subject.name}")
                continue
            
            logger.info(f"Subject {subject.name}: {allocations.count()} faculty assigned ({'LAB' if subject.lab_required else 'THEORY'})")
            
            # Create sessions for each faculty allocation
            for allocation in allocations:
                faculty = allocation.faculty
                sessions_needed = allocation.hours_per_week  # Use allocated hours, not total subject hours
                
                if sessions_needed <= 0:
                    logger.warning(f"Faculty {faculty.name} has {sessions_needed} hours for {subject.name}, skipping")
                    continue
                
                # Cap at reasonable maximum
                sessions_needed = min(sessions_needed, settings.periods_per_day)
                
                # Check faculty capacity
                faculty_limit = faculty_limits.get(faculty.id, 18)
                faculty_remaining = faculty_limit - sessions_by_faculty[faculty.id]
                
                if faculty_remaining <= 0:
                    logger.warning(f"Faculty {faculty.name} has no remaining hours, skipping {subject.name} allocation")
                    continue
                
                # Adjust sessions if faculty doesn't have enough remaining capacity
                sessions_needed = min(sessions_needed, faculty_remaining)
                sessions_needed = max(1, sessions_needed)  # At least 1 session
                
                sessions_by_faculty[faculty.id] += sessions_needed
                total_sessions_needed += sessions_needed
                
                # Get appropriate rooms based on lab requirement
                if subject.lab_required:
                    available_rooms = list(Room.objects.filter(is_lab=True))
                    if not available_rooms:
                        logger.warning(f"No lab rooms available for {subject.name}, using regular rooms")
                        available_rooms = list(Room.objects.filter(is_lab=False))
                else:
                    available_rooms = list(Room.objects.filter(is_lab=False))
                    # Allow theory subjects in labs if no regular rooms available
                    if not available_rooms:
                        available_rooms = list(Room.objects.all())
                
                if not available_rooms:
                    logger.error(f"No rooms available for {subject.name}")
                    continue
                
                logger.info(f"Faculty {faculty.name} -> {subject.name} ({'LAB' if subject.lab_required else 'THEORY'}): {sessions_needed}/{allocation.hours_per_week} sessions, Total faculty load: {sessions_by_faculty[faculty.id]}/{faculty_limits.get(faculty.id, 18)}")
                
                # Create session scheduling requests
                for session_num in range(sessions_needed):
                    # Priority: Labs get preference, then by faculty load balance
                    priority_boost = 0 if subject.lab_required else 5
                    faculty_load_factor = sessions_by_faculty[faculty.id] / faculty_limit if faculty_limit > 0 else 0
                    
                    all_sessions.append({
                        'section': section,
                        'subject': subject,
                        'faculty': faculty,
                        'available_rooms': available_rooms,
                        'session_num': session_num,
                        'is_lab': subject.lab_required,
                        'priority': session_num + priority_boost + (faculty_load_factor * 2),
                        'faculty_load': sessions_by_faculty[faculty.id],
                        'weekly_hours': subject.weekly_hours,
                        'allocation_hours': allocation.hours_per_week,
                        'allocation_id': allocation.id
                    })

    logger.info(f"Total sessions to schedule: {total_sessions_needed}")
    logger.info(f"Total faculty hours available: {total_faculty_hours_available}")
    
    # Enhanced logging for multiple faculty per subject
    subject_faculty_map = defaultdict(list)
    for session_data in all_sessions:
        subject_key = f"{session_data['subject'].name} ({session_data['section'].name})"
        faculty_key = f"{session_data['faculty'].name}({session_data['allocation_hours']}h)"
        if faculty_key not in subject_faculty_map[subject_key]:
            subject_faculty_map[subject_key].append(faculty_key)
    
    logger.info("Subject-Faculty Distribution:")
    for subject, faculties in subject_faculty_map.items():
        logger.info(f"  {subject}: {', '.join(faculties)}")

    logger.info(f"Total sessions to schedule: {total_sessions_needed}")
    logger.info(f"Total faculty hours available: {total_faculty_hours_available}")
    
    if total_sessions_needed > len(slots) * sections.count():
        logger.warning(f"Sessions needed ({total_sessions_needed}) exceeds available slots ({len(slots) * sections.count()})")
    
    # Sort sessions for optimal scheduling - prioritize by faculty load and session distribution
    def session_sort_key(session):
        faculty_current_load = faculty_hours_used.get(session['faculty'].id, 0)
        faculty_total_limit = faculty_limits.get(session['faculty'].id, 18)
        section_current_load = len(section_schedule.get(session['section'].id, []))
        
        # Prioritize faculty with lower current load relative to their limit
        faculty_load_ratio = faculty_current_load / faculty_total_limit if faculty_total_limit > 0 else 1
        
        return (faculty_load_ratio, section_current_load, session['priority'], random.random())
    
    all_sessions.sort(key=session_sort_key)
    
    # Group slots by day for strategic scheduling
    slots_by_day = defaultdict(list)
    for slot in slots:
        slots_by_day[slot.day].append(slot)
    
    # Schedule sessions with enhanced logic
    scheduled_count = 0
    skipped_count = 0
    
    for session_data in all_sessions:
        section = session_data['section']
        subject = session_data['subject']
        faculty = session_data['faculty']
        available_rooms = session_data['available_rooms']
        session_num = session_data['session_num']
        is_lab = session_data['is_lab']
        
        # Strict faculty hour limit check
        faculty_limit = faculty_limits.get(faculty.id, 18)
        if faculty_hours_used.get(faculty.id, 0) >= faculty_limit:
            logger.warning(f"Faculty {faculty.name} has reached strict hour limit ({faculty_limit} hours)")
            skipped_count += 1
            continue
        
        scheduled = False
        best_slot = None
        best_room = None
        
        # Enhanced day selection strategy - use ALL available days effectively
        day_scores = []
        
        for day in range(1, settings.working_days + 1):
            # Calculate day utilization for better distribution
            section_sessions_today = section_day_count[section.id][day]
            subject_sessions_today = subject_day_count[section.id][subject.id][day]
            
            # Calculate day load across all sections
            day_total_sessions = sum(
                len([s for s in section_schedule[sec.id] if any(slot.day == day for slot in slots if slot.id in section_schedule[sec.id])])
                for sec in sections
            )
            
            # Prefer days with lower overall load and better distribution
            score = (
                subject_sessions_today * 10 +  # Avoid clustering same subject
                section_sessions_today * 3 +   # Distribute section load
                day_total_sessions * 1 +       # Balance overall day load
                random.uniform(0, 0.3)         # Add randomness
            )
            
            day_scores.append((score, day))
        
        # Sort by score (ascending - lower is better)
        day_scores.sort()
        
        # Try to schedule on the best available days
        for score, preferred_day in day_scores:
            if scheduled:
                break
                
            available_slots = slots_by_day[preferred_day]
            # Try different periods strategically
            slot_attempts = available_slots.copy()
            
            # Prioritize middle periods for better distribution
            slot_attempts.sort(key=lambda s: abs(s.period_number - (settings.periods_per_day // 2)))
            
            for slot in slot_attempts:
                # Check all conflicts
                if slot.id in faculty_schedule[faculty.id]:
                    continue  # Faculty conflict
                if slot.id in section_schedule[section.id]:
                    continue  # Section conflict
                
                # Find an available room
                room_found = None
                # Prioritize less used rooms
                room_usage = [(room, len(room_schedule[room.id])) for room in available_rooms]
                room_usage.sort(key=lambda x: x[1])  # Sort by usage count
                
                for room, usage_count in room_usage:
                    if slot.id not in room_schedule[room.id]:
                        room_found = room
                        break
                
                if not room_found:
                    continue  # No room available
                
                # Enhanced consecutive session check for labs
                consecutive_limit = 3 if is_lab else 2  # Labs can have longer sessions
                consecutive_count = 0
                
                # Check for existing consecutive sessions more thoroughly
                for check_period in range(max(1, slot.period_number - consecutive_limit), 
                                        min(settings.periods_per_day + 1, slot.period_number + consecutive_limit + 1)):
                    if check_period == slot.period_number:
                        continue
                        
                    check_slot = next((s for s in slots if s.day == slot.day and s.period_number == check_period), None)
                    if check_slot and ScheduledSession.objects.filter(
                        section=section, subject=subject, slot=check_slot).exists():
                        consecutive_count += 1
                
                if consecutive_count >= consecutive_limit:
                    continue  # Too many consecutive sessions
                
                # Additional check for labs: prefer to schedule in blocks
                if is_lab and session_num > 0:
                    # Try to find adjacent slot for lab continuation
                    adjacent_slots = [
                        next((s for s in slots if s.day == slot.day and s.period_number == slot.period_number - 1), None),
                        next((s for s in slots if s.day == slot.day and s.period_number == slot.period_number + 1), None)
                    ]
                    
                    has_adjacent_lab = False
                    for adj_slot in adjacent_slots:
                        if adj_slot and ScheduledSession.objects.filter(
                            section=section, subject=subject, slot=adj_slot, is_lab_session=True).exists():
                            has_adjacent_lab = True
                            break
                    
                    # For lab sessions after the first one, prefer adjacent slots
                    if not has_adjacent_lab and session_num > 0:
                        # Lower priority if no adjacent lab session
                        pass
                
                # Additional check: ensure section doesn't get too many sessions in one day
                max_sessions_per_day = min(4, settings.periods_per_day // 2 + 1)
                if section_day_count[section.id][slot.day] >= max_sessions_per_day:
                    continue
                
                # This slot is suitable!
                best_slot = slot
                best_room = room_found
                break
            
            if best_slot:
                break
        
        # If no preferred slot found, try fallback with relaxed constraints
        if not best_slot:
            logger.info(f"Trying fallback scheduling for {section.name}-{subject.name}")
            for slot in slots:
                if (slot.id not in faculty_schedule[faculty.id] and 
                    slot.id not in section_schedule[section.id]):
                    
                    for room in available_rooms:
                        if slot.id not in room_schedule[room.id]:
                            # Allow scheduling even if day gets crowded as fallback
                            if section_day_count[section.id][slot.day] < settings.periods_per_day:
                                best_slot = slot
                                best_room = room
                                break
                    if best_slot:
                        break
        
        # Schedule the session if we found a slot
        if best_slot and best_room:
            # Update all tracking structures
            faculty_schedule[faculty.id].add(best_slot.id)
            faculty_hours_used[faculty.id] = faculty_hours_used.get(faculty.id, 0) + 1
            room_schedule[best_room.id].add(best_slot.id)
            section_schedule[section.id].add(best_slot.id)
            section_day_count[section.id][best_slot.day] += 1
            subject_day_count[section.id][subject.id][best_slot.day] += 1
            
            # Save to database
            ScheduledSession.objects.create(
                section=section,
                subject=subject,
                faculty=faculty,
                room=best_room,
                slot=best_slot,
                is_lab_session=is_lab
            )
            
            # Add to result with allocation info
            result.append({
                "section": section.id,
                "subject": subject.name,
                "faculty": faculty.name,
                "room": best_room.name,
                "day": best_slot.day,
                "period": best_slot.period_number,
                "is_lab": is_lab,
                "allocation_hours": session_data.get('allocation_hours', subject.weekly_hours),
                "faculty_total_load": faculty_hours_used[faculty.id]
            })
            
            scheduled_count += 1
            logger.info(f"✓ Scheduled: {section.name}-{subject.name} ({'LAB' if is_lab else 'THEORY'}) -> {faculty.name} ({session_data.get('allocation_hours', 'N/A')}h alloc) on Day {best_slot.day} Period {best_slot.period_number} "
                       f"(Faculty load: {faculty_hours_used[faculty.id]}/{faculty_limits.get(faculty.id, 18)} hours)")
        else:
            logger.warning(f"✗ Could not schedule: {section.name}-{subject.name} (session {session_num})")
            skipped_count += 1

    # Enhanced statistics and validation
    logger.info(f"Scheduling completed: {scheduled_count} scheduled, {skipped_count} skipped")
    
    # Detailed faculty hour usage analysis
    faculty_utilization_stats = []
    faculty_subject_breakdown = defaultdict(list)
    
    # Collect faculty-subject breakdown
    for session in result:
        faculty_name = session['faculty']
        subject_info = f"{session['subject']} ({session.get('allocation_hours', 'N/A')}h)"
        if subject_info not in faculty_subject_breakdown[faculty_name]:
            faculty_subject_breakdown[faculty_name].append(subject_info)
    
    for faculty_id, hours_used in faculty_hours_used.items():
        faculty = Faculty.objects.get(id=faculty_id)
        limit = faculty_limits.get(faculty_id, 18)
        percentage = (hours_used / limit) * 100 if limit > 0 else 0
        
        subjects_taught = faculty_subject_breakdown.get(faculty.name, [])
        
        faculty_utilization_stats.append({
            'name': faculty.name,
            'used': hours_used,
            'limit': limit,
            'percentage': percentage,
            'subjects_taught': subjects_taught,
            'subject_count': len(subjects_taught)
        })
        logger.info(f"Faculty {faculty.name}: {hours_used}/{limit} hours used ({percentage:.1f}%) - Subjects: {', '.join(subjects_taught)}")
    
    # Day-wise utilization analysis
    day_utilization = {}
    for day in range(1, settings.working_days + 1):
        day_sessions = sum(1 for session in result if session['day'] == day)
        total_possible = settings.periods_per_day * sections.count()
        day_util = (day_sessions / total_possible) * 100 if total_possible > 0 else 0
        day_utilization[day] = day_util
        logger.info(f"Day {day} utilization: {day_sessions}/{total_possible} slots ({day_util:.1f}%)")
    
    # Overall statistics
    total_slots_available = len(slots) * sections.count()
    overall_utilization = (scheduled_count / total_slots_available) * 100 if total_slots_available > 0 else 0
    logger.info(f"Overall slot utilization: {scheduled_count}/{total_slots_available} ({overall_utilization:.1f}%)")
    
    # Validate minimum requirements
    if scheduled_count == 0:
        raise ValueError("No sessions could be scheduled. Please check faculty hour limits and room availability.")
    
    # Check if any section has no sessions at all
    sections_without_sessions = []
    for section in sections:
        section_sessions = [s for s in result if s['section'] == section.id]
        if not section_sessions:
            sections_without_sessions.append(section.name)
    
    if sections_without_sessions:
        logger.warning(f"Sections without any sessions: {', '.join(sections_without_sessions)}")
    
    # Check faculty utilization warnings
    underutilized_faculty = []
    overutilized_faculty = []
    
    for faculty_id, hours_used in faculty_hours_used.items():
        faculty = Faculty.objects.get(id=faculty_id)
        limit = faculty_limits.get(faculty_id, 18)
        utilization_rate = (hours_used / limit) * 100 if limit > 0 else 0
        
        if utilization_rate < 50 and hours_used > 0:
            underutilized_faculty.append(f"{faculty.name} ({utilization_rate:.1f}%)")
        elif hours_used >= limit:
            overutilized_faculty.append(f"{faculty.name} ({hours_used}/{limit})")
    
    if underutilized_faculty:
        logger.info(f"Underutilized faculty (< 50%): {', '.join(underutilized_faculty)}")
    
    if overutilized_faculty:
        logger.warning(f"Faculty at maximum capacity: {', '.join(overutilized_faculty)}")
    
    # Calculate success rate and prepare message
    success_rate = (scheduled_count / len(all_sessions)) * 100
    message = f"✔ Timetable generated with {scheduled_count} sessions ({success_rate:.1f}% success rate)!"
    
    if skipped_count > 0:
        message += f" {skipped_count} sessions could not be scheduled due to constraints."
    
    if sections_without_sessions:
        message += f" Warning: {len(sections_without_sessions)} sections have no scheduled sessions."
    
    # Final validation check
    if success_rate < 70:
        logger.warning(f"Low success rate ({success_rate:.1f}%). Consider adjusting faculty hours or reducing subject requirements.")
    
    return {
        "status": "success", 
        "message": message,
        "timetable": result,
        "stats": {
            "scheduled": scheduled_count,
            "skipped": skipped_count,
            "success_rate": success_rate,
            "slot_utilization": overall_utilization,
            "faculty_utilization": faculty_utilization_stats,
            "day_utilization": day_utilization,
            "total_sessions_needed": len(all_sessions),
            "total_slots_available": total_slots_available,
            "sections_total": sections.count(),
            "sections_without_sessions": len(sections_without_sessions),
            "underutilized_faculty": len(underutilized_faculty),
            "faculty_at_max_capacity": len(overutilized_faculty)
        },
        "warnings": {
            "sections_without_sessions": sections_without_sessions,
            "underutilized_faculty": underutilized_faculty,
            "overutilized_faculty": overutilized_faculty,
            "low_success_rate": success_rate < 70
        }
    }
