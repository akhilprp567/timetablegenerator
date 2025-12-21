import logging
from collections import defaultdict
from .models import (
    Section, Subject, Faculty, Room, TimetableSlot, ScheduledSession,
    FacultySubjectAllocation, InstitutionSettings, TimetableSlot as TimetableSlotModel
)

logger = logging.getLogger(__name__)

def generate_timetable():
    """
    Generate conflict-free timetable with intelligent distribution
    - Multi-section support with conflict resolution
    - Even distribution across week (no gaps)
    - No consecutive periods (max 2)
    - Respects all constraints
    """
    try:
        sections = list(Section.objects.all())
        if not sections:
            return {"status": "error", "message": "No sections found"}
        
        slots = list(TimetableSlot.objects.all().order_by('day', 'period_number'))
        if not slots:
            return {"status": "error", "message": "No timetable slots configured"}
        
        institution = InstitutionSettings.objects.first()
        if not institution:
            return {"status": "error", "message": "Institution settings not found"}
        
        rooms = list(Room.objects.all())
        if not rooms:
            return {"status": "error", "message": "No rooms available"}
        
        # Clear previous schedules
        ScheduledSession.objects.all().delete()
        
        # Global tracking for ALL sections (to prevent conflicts)
        global_faculty_slot_map = defaultdict(set)      # faculty_id -> set of slot_ids
        global_room_slot_map = defaultdict(set)         # room_id -> set of slot_ids
        global_section_slot_map = defaultdict(set)      # section_id -> set of slot_ids
        faculty_hours = defaultdict(int)                # faculty_id -> total hours assigned
        
        scheduled_count = 0
        failed_subjects = []
        
        # Collect all subject-faculty pairs across all sections
        all_subject_faculty_pairs = []
        for section in sections:
            semester = section.semester
            subjects = Subject.objects.filter(semester=semester)
            
            for subject in subjects:
                allocations = FacultySubjectAllocation.objects.filter(subject=subject)
                if not allocations.exists():
                    failed_subjects.append(f"{subject.name} (no faculty assigned)")
                    continue
                
                faculty_obj = allocations.first().faculty
                
                all_subject_faculty_pairs.append({
                    'section': section,
                    'subject': subject,
                    'faculty': faculty_obj,
                    'weekly_hours': subject.weekly_hours
                })
        
        # Sort by hours (harder subjects first) for better distribution
        all_subject_faculty_pairs.sort(key=lambda x: x['weekly_hours'], reverse=True)
        
        # Schedule each subject-faculty-section combination
        for pair in all_subject_faculty_pairs:
            section = pair['section']
            subject = pair['subject']
            faculty_obj = pair['faculty']
            weekly_hours = pair['weekly_hours']
            
            # Check faculty capacity
            if faculty_hours[faculty_obj.id] >= faculty_obj.max_hours_per_week:
                failed_subjects.append(
                    f"{subject.name} ({section.name}) - {faculty_obj.name} (max hours exceeded)"
                )
                continue
            
            remaining_capacity = faculty_obj.max_hours_per_week - faculty_hours[faculty_obj.id]
            hours_to_assign = min(weekly_hours, remaining_capacity)
            
            # Schedule with global conflict checking
            assigned = schedule_with_global_conflict_check(
                section=section,
                subject=subject,
                faculty=faculty_obj,
                rooms=rooms,
                slots=slots,
                hours_needed=int(hours_to_assign),
                global_faculty_slot_map=global_faculty_slot_map,
                global_room_slot_map=global_room_slot_map,
                global_section_slot_map=global_section_slot_map,
                institution=institution
            )
            
            if assigned > 0:
                faculty_hours[faculty_obj.id] += assigned
                scheduled_count += assigned
            else:
                failed_subjects.append(
                    f"{subject.name} ({section.name}) - couldn't find available slots"
                )
        
        logger.info(f"Scheduled {scheduled_count} total sessions across all sections")
        if failed_subjects:
            logger.warning(f"Failed subjects: {failed_subjects}")
        
        return {
            "status": "success",
            "message": f"Timetable generated with {scheduled_count} sessions",
            "stats": {
                "total_sessions": scheduled_count,
                "failed_subjects": len(failed_subjects),
                "sections_count": len(sections)
            }
        }
        
    except Exception as e:
        logger.exception("Timetable generation error: %s", str(e))
        return {"status": "error", "message": str(e)}


def schedule_with_global_conflict_check(section, subject, faculty, rooms, slots, hours_needed,
                                       global_faculty_slot_map, global_room_slot_map,
                                       global_section_slot_map, institution):
    """
    Schedule sessions with global conflict checking across all sections
    """
    assigned = 0
    
    if hours_needed <= 0:
        return assigned
    
    # Create list of candidate slots with scoring
    candidate_slots = []
    for slot in slots:
        score = calculate_slot_score(
            slot=slot,
            faculty=faculty,
            section=section,
            global_faculty_slot_map=global_faculty_slot_map,
            global_room_slot_map=global_room_slot_map,
            global_section_slot_map=global_section_slot_map,
            institution=institution
        )
        
        if score is not None:  # Only include valid slots
            candidate_slots.append((score, slot))
    
    # Sort by score (lower is better)
    candidate_slots.sort(key=lambda x: x[0])
    
    # Assign sessions to best available slots
    for _, slot in candidate_slots:
        if assigned >= hours_needed:
            break
        
        # Find available room (check global room map)
        available_room = find_globally_available_room(
            slot=slot,
            subject=subject,
            rooms=rooms,
            global_room_slot_map=global_room_slot_map
        )
        
        if not available_room:
            continue
        
        # Create session
        ScheduledSession.objects.create(
            section=section,
            subject=subject,
            faculty=faculty,
            room=available_room,
            slot=slot,
            is_lab_session=subject.lab_required
        )
        
        # Update global maps
        global_faculty_slot_map[faculty.id].add(slot.id)
        global_room_slot_map[available_room.id].add(slot.id)
        global_section_slot_map[section.id].add(slot.id)
        
        assigned += 1
        logger.debug(f"Assigned {subject.name} ({section.name}) to {slot.get_day_display()} P{slot.period_number}")
    
    return assigned


def calculate_slot_score(slot, faculty, section, global_faculty_slot_map,
                        global_room_slot_map, global_section_slot_map, institution):
    """
    Score a slot based on constraints and preferences
    Returns None if slot violates hard constraints
    """
    score = 0
    
    # HARD CONSTRAINTS (return None if violated)
    
    # Faculty conflict check
    if slot.id in global_faculty_slot_map.get(faculty.id, set()):
        return None  # Faculty already teaching in this slot
    
    # Section conflict check
    if slot.id in global_section_slot_map.get(section.id, set()):
        return None  # Section already has class in this slot
    
    # Room conflict check (at least one room must be free)
    if all(slot.id in global_room_slot_map.get(room.id, set()) 
           for room in Room.objects.all()):
        return None  # All rooms occupied in this slot
    
    # SOFT CONSTRAINTS (affect score)
    
    # Penalty for consecutive periods (max 2 allowed)
    consecutive_count = count_faculty_consecutive_on_day(slot, faculty, global_faculty_slot_map)
    if consecutive_count >= 2:
        score += 500  # High penalty for 3+ consecutive
    elif consecutive_count == 1:
        score += 50   # Small penalty for 2 consecutive
    
    # Prefer balanced distribution across days
    faculty_sessions_on_day = len([
        s for s in global_faculty_slot_map.get(faculty.id, set())
        if TimetableSlotModel.objects.filter(id=s, day=slot.day).exists()
    ])
    score += faculty_sessions_on_day * 10
    
    # Prefer middle periods
    middle = institution.periods_per_day / 2
    score += abs(slot.period_number - middle) * 3
    
    return score


def count_faculty_consecutive_on_day(current_slot, faculty, global_faculty_slot_map):
    """
    Count consecutive periods for faculty on same day
    """
    faculty_slots = global_faculty_slot_map.get(faculty.id, set())
    
    if not faculty_slots:
        return 0
    
    consecutive = 0
    
    # Get all slots for this faculty on same day
    faculty_day_slots = TimetableSlotModel.objects.filter(
        id__in=faculty_slots,
        day=current_slot.day
    ).order_by('period_number')
    
    if not faculty_day_slots.exists():
        return 0
    
    # Check if current period is adjacent to any scheduled period
    faculty_periods = set(s.period_number for s in faculty_day_slots)
    
    if (current_slot.period_number - 1) in faculty_periods:
        consecutive += 1
    if (current_slot.period_number + 1) in faculty_periods:
        consecutive += 1
    
    return consecutive


def find_globally_available_room(slot, subject, rooms, global_room_slot_map):
    """
    Find available room checking global map
    Prefers matching room type (lab/classroom)
    """
    # First try to match type
    for room in rooms:
        if slot.id not in global_room_slot_map.get(room.id, set()):
            if (subject.lab_required and room.is_lab) or (not subject.lab_required and not room.is_lab):
                return room
    
    # Fallback to any available room
    for room in rooms:
        if slot.id not in global_room_slot_map.get(room.id, set()):
            return room
    
    return None
