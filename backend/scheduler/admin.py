from django.contrib import admin
from .models import (
    Course, Semester, Section, Subject, Faculty,
    FacultySubjectAllocation, Room, InstitutionSettings,
    TimetableSlot, ScheduledSession
)

admin.site.register(Course)
admin.site.register(Semester)
admin.site.register(Section)
admin.site.register(Subject)
admin.site.register(Faculty)
admin.site.register(FacultySubjectAllocation)
admin.site.register(Room)
admin.site.register(InstitutionSettings)
admin.site.register(TimetableSlot)
admin.site.register(ScheduledSession)
