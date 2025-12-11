from .models import *
from django.db import transaction

@transaction.atomic
def setup_sample_data():
    # Delete old data
    ScheduledSession.objects.all().delete()
    TimetableSlot.objects.all().delete()
    FacultyAvailability.objects.all().delete()
    FacultySubjectAllocation.objects.all().delete()
    Subject.objects.all().delete()
    Section.objects.all().delete()
    Semester.objects.all().delete()
    Course.objects.all().delete()
    Faculty.objects.all().delete()
    Room.objects.all().delete()
    InstitutionSettings.objects.all().delete()

    # Create new data
    course = Course.objects.create(name="MCA", code="MCA")
    sem1 = Semester.objects.create(course=course, name="Semester 1", number=1)
    sectionA = Section.objects.create(semester=sem1, name="A")

    faculty1 = Faculty.objects.create(name="Prof. Rajesh", employee_id="F01", max_hours_per_week=15, max_hours_per_day=3, max_consecutive_classes=2)
    faculty2 = Faculty.objects.create(name="Prof. Anita", employee_id="F02", max_hours_per_week=15, max_hours_per_day=3, max_consecutive_classes=2)

    sub1 = Subject.objects.create(semester=sem1, name="DBMS", code="DBMS", weekly_hours=3, lab_required=False)
    sub2 = Subject.objects.create(semester=sem1, name="Python", code="PYTHON", weekly_hours=3, lab_required=True, lab_hours=2)
    sub3 = Subject.objects.create(semester=sem1, name="Operating Systems", code="OS", weekly_hours=2, lab_required=False)

    FacultySubjectAllocation.objects.create(faculty=faculty1, subject=sub1)
    FacultySubjectAllocation.objects.create(faculty=faculty1, subject=sub3)
    FacultySubjectAllocation.objects.create(faculty=faculty2, subject=sub2)

    Room.objects.create(name="Room 101", is_lab=False)
    Room.objects.create(name="Lab 1", is_lab=True)

    InstitutionSettings.objects.create(
        working_days_per_week=5,
        periods_per_day=6,
        period_duration_minutes=60,
        lunch_after_period=4,
        lab_continuous_periods=2
    )

    for day in range(1, 6):
        for period in range(1, 7):
            TimetableSlot.objects.create(day=day, period_number=period)

    return "Sample data setup successfully!"
