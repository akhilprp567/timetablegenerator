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

    logger.info("Starting enhanced timetable generation with faculty hour tracking")
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
    
    # Get faculty hour limits and log them
    faculty_limits = {}
    faculties = Faculty.objects.all()
    for faculty in faculties:
        faculty_limits[faculty.id] = faculty.max_hours_per_week
        logger.info(f"Faculty {faculty.name} ({faculty.id}): {faculty.max_hours_per_week} hours/week limit")
    
    # Collect all sessions that need to be scheduled
    all_sessions = []
    
    for section in sections:
        subjects = Subject.objects.filter(semester=section.semester)
        logger.info(f"Section {section.name} (ID: {section.id}): {subjects.count()} subjects")
        
        for subject in subjects:
            allocation = FacultySubjectAllocation.objects.filter(subject=subject).first()
            if not allocation:
                logger.warning(f"No faculty allocated for subject {subject.name}")
                continue
            
            faculty = allocation.faculty
            sessions_needed = min(subject.weekly_hours, 6)  # Cap at 6 sessions per week
            
            # Check if faculty has enough remaining hours
            faculty_remaining = faculty_limits.get(faculty.id, 18) - faculty_hours_used.get(faculty.id, 0)
            if faculty_remaining < sessions_needed:
                logger.warning(f"Faculty {faculty.name} has only {faculty_remaining} hours remaining, reducing {subject.name} from {sessions_needed} to {max(1, faculty_remaining)} sessions")
                sessions_needed = max(1, faculty_remaining)
            
            # Get appropriate rooms
            if subject.lab_required:
                available_rooms = list(Room.objects.filter(is_lab=True))
                if not available_rooms:
                    logger.warning(f"No lab rooms available for {subject.name}, using regular rooms")
                    available_rooms = list(Room.objects.filter(is_lab=False))
            else:
                available_rooms = list(Room.objects.filter(is_lab=False))
            
            if not available_rooms:
                available_rooms = list(Room.objects.all())
            
            logger.info(f"Subject {subject.name}: {sessions_needed} sessions, Faculty: {faculty.name}, Rooms: {len(available_rooms)}")
            
            # Create session scheduling requests
            for session_num in range(sessions_needed):
                all_sessions.append({
                    'section': section,
                    'subject': subject,
                    'faculty': faculty,
                    'available_rooms': available_rooms,
                    'session_num': session_num,
                    'is_lab': subject.lab_required,
                    'priority': session_num  # Earlier sessions have higher priority
                })
    
    logger.info(f"Total sessions to schedule: {len(all_sessions)}")
    
    # Sort sessions to prioritize better distribution
    def session_sort_key(session):
        faculty_load = faculty_hours_used.get(session['faculty'].id, 0)
        section_load = len(section_schedule.get(session['section'].id, []))
        return (faculty_load, section_load, session['priority'], random.random())
    
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
        
        # Check faculty hour limit first
        if faculty_hours_used.get(faculty.id, 0) >= faculty_limits.get(faculty.id, 18):
            logger.warning(f"Faculty {faculty.name} has reached hour limit ({faculty_limits.get(faculty.id, 18)} hours)")
            skipped_count += 1
            continue
        
        scheduled = False
        best_slot = None
        best_room = None
        
        # Enhanced day selection strategy
        day_scores = []
        
        for day in range(1, settings.working_days + 1):
            # Factors for day selection scoring (lower score = better)
            subject_sessions_today = subject_day_count[section.id][subject.id][day]
            section_sessions_today = section_day_count[section.id][day]
            
            # Prefer days with:
            # - Fewer sessions for this specific subject-section combination
            # - Fewer overall sessions for this section
            # - Avoid overloading any single day
            score = (subject_sessions_today * 5) + (section_sessions_today * 2) + random.uniform(0, 0.5)
            day_scores.append((score, day))
        
        # Sort by score (ascending - lower is better)
        day_scores.sort()
        
        # Try to schedule on the best available days
        for score, preferred_day in day_scores:
            if scheduled:
                break
                
            available_slots = slots_by_day[preferred_day]
            # Shuffle slots within the day for period variety
            random.shuffle(available_slots)
            
            for slot in available_slots:
                # Check all conflicts
                if slot.id in faculty_schedule[faculty.id]:
                    continue  # Faculty conflict
                if slot.id in section_schedule[section.id]:
                    continue  # Section conflict
                
                # Find an available room
                room_found = None
                # Randomize room selection to distribute usage
                shuffled_rooms = available_rooms.copy()
                random.shuffle(shuffled_rooms)
                
                for room in shuffled_rooms:
                    if slot.id not in room_schedule[room.id]:
                        room_found = room
                        break
                
                if not room_found:
                    continue  # No room available
                
                # Check for too many consecutive sessions of same subject
                consecutive_limit = 2 if is_lab else 1
                consecutive_count = 0
                
                # Check previous periods
                for prev_period in range(max(1, slot.period_number - consecutive_limit), slot.period_number):
                    prev_slot = next((s for s in slots if s.day == slot.day and s.period_number == prev_period), None)
                    if prev_slot and ScheduledSession.objects.filter(
                        section=section, subject=subject, slot=prev_slot).exists():
                        consecutive_count += 1
                
                # Check next periods
                for next_period in range(slot.period_number + 1, min(settings.periods_per_day + 1, slot.period_number + consecutive_limit + 1)):
                    next_slot = next((s for s in slots if s.day == slot.day and s.period_number == next_period), None)
                    if next_slot and ScheduledSession.objects.filter(
                        section=section, subject=subject, slot=next_slot).exists():
                        consecutive_count += 1
                
                if consecutive_count >= consecutive_limit:
                    continue  # Too many consecutive sessions
                
                # This slot is suitable!
                best_slot = slot
                best_room = room_found
                break
            
            if best_slot:
                break
        
        # If no preferred slot found, try any available slot as fallback
        if not best_slot:
            for slot in slots:
                if (slot.id not in faculty_schedule[faculty.id] and 
                    slot.id not in section_schedule[section.id]):
                    
                    for room in available_rooms:
                        if slot.id not in room_schedule[room.id]:
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
            
            # Add to result
            result.append({
                "section": section.id,
                "subject": subject.name,
                "faculty": faculty.name,
                "room": best_room.name,
                "day": best_slot.day,
                "period": best_slot.period_number,
                "is_lab": is_lab
            })
            
            scheduled_count += 1
            logger.info(f"✓ Scheduled: {section.name}-{subject.name} on Day {best_slot.day} Period {best_slot.period_number} "
                       f"(Faculty {faculty.name}: {faculty_hours_used[faculty.id]}/{faculty_limits.get(faculty.id, 18)} hours)")
        else:
            logger.warning(f"✗ Could not schedule: {section.name}-{subject.name} (session {session_num})")
            skipped_count += 1

    # Final statistics and validation
    logger.info(f"Scheduling completed: {scheduled_count} scheduled, {skipped_count} skipped")
    
    # Log faculty hour usage
    for faculty_id, hours_used in faculty_hours_used.items():
        faculty = Faculty.objects.get(id=faculty_id)
        limit = faculty_limits.get(faculty_id, 18)
        percentage = (hours_used / limit) * 100 if limit > 0 else 0
        logger.info(f"Faculty {faculty.name}: {hours_used}/{limit} hours used ({percentage:.1f}%)")
    
    # Log day distribution
    total_slots_used = len(slots) * sections.count()
    slots_scheduled = scheduled_count
    utilization = (slots_scheduled / total_slots_used) * 100 if total_slots_used > 0 else 0
    logger.info(f"Overall slot utilization: {slots_scheduled}/{total_slots_used} ({utilization:.1f}%)")
    
    if scheduled_count == 0:
        raise ValueError("No sessions could be scheduled. Please check faculty hour limits and room availability.")
    
    success_rate = (scheduled_count / len(all_sessions)) * 100
    message = f"✔ Timetable generated with {scheduled_count} sessions ({success_rate:.1f}% success rate)!"
    if skipped_count > 0:
        message += f" {skipped_count} sessions could not be scheduled due to constraints."
    
    return {
        "status": "success", 
        "message": message,
        "timetable": result,
        "stats": {
            "scheduled": scheduled_count,
            "skipped": skipped_count,
            "success_rate": success_rate,
            "slot_utilization": utilization
        }
    }
