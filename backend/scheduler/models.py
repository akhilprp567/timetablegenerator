from django.db import models
from django.contrib.auth.models import User


class Course(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Semester(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='semesters')
    name = models.CharField(max_length=50)
    number = models.IntegerField()
    
    class Meta:
        ordering = ['number']
        unique_together = ('course', 'number')
    
    def __str__(self):
        return f"{self.course.name} - {self.name}"


class Section(models.Model):
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=10)
    
    class Meta:
        unique_together = ('semester', 'name')
        ordering = ['name']
    
    def __str__(self):
        return f"{self.semester} - Section {self.name}"


class Subject(models.Model):
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    weekly_hours = models.IntegerField(default=3)
    lab_required = models.BooleanField(default=False)
    lab_hours = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Faculty(models.Model):
    name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=50, unique=True)
    max_hours_per_week = models.IntegerField(default=18)
    max_hours_per_day = models.IntegerField(default=4)
    max_consecutive_classes = models.IntegerField(default=2)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='faculties')
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.employee_id})"


class FacultyAvailability(models.Model):
    DAY_CHOICES = [
        (1, 'Monday'), (2, 'Tuesday'), (3, 'Wednesday'), (4, 'Thursday'),
        (5, 'Friday'), (6, 'Saturday'), (7, 'Sunday')
    ]
    
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='availability')
    day = models.IntegerField(choices=DAY_CHOICES)
    available_from = models.TimeField()
    available_to = models.TimeField()
    
    class Meta:
        unique_together = ('faculty', 'day')
        ordering = ['day']
    
    def __str__(self):
        return f"{self.faculty.name} - {self.get_day_display()}"
    
    def get_day_display(self):
        day_map = {
            1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
            5: 'Friday', 6: 'Saturday', 7: 'Sunday'
        }
        return day_map.get(self.day, 'Unknown')


class FacultySubjectAllocation(models.Model):
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='subject_allocations')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='faculty_allocations')
    
    class Meta:
        unique_together = ('faculty', 'subject')
        ordering = ['subject__name']
    
    def __str__(self):
        return f"{self.faculty.name} - {self.subject.name}"


class InstitutionSettings(models.Model):
    institution_name = models.CharField(max_length=200, default='Institution')
    course = models.CharField(max_length=50)
    academic_year = models.CharField(max_length=10)
    working_days = models.IntegerField(default=5)
    periods_per_day = models.IntegerField()
    period_duration = models.IntegerField(default=60)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='institution_settings')
    is_setup_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Institution Settings"
    
    def __str__(self):
        return f"{self.institution_name} ({self.academic_year})"


class Room(models.Model):
    name = models.CharField(max_length=50)
    is_lab = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='rooms')
    
    class Meta:
        ordering = ['name']
        unique_together = ('name', 'created_by')
    
    def __str__(self):
        return f"{self.name} ({'Lab' if self.is_lab else 'Classroom'})"


class TimetableSlot(models.Model):
    DAY_CHOICES = [
        (1, 'Monday'), (2, 'Tuesday'), (3, 'Wednesday'), (4, 'Thursday'),
        (5, 'Friday'), (6, 'Saturday'), (7, 'Sunday')
    ]
    
    day = models.IntegerField(choices=DAY_CHOICES)
    period_number = models.IntegerField()
    
    class Meta:
        unique_together = ('day', 'period_number')
        ordering = ['day', 'period_number']
    
    def get_day_display(self):
        """Return human-readable day name"""
        day_map = {
            1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
            5: 'Friday', 6: 'Saturday', 7: 'Sunday'
        }
        return day_map.get(self.day, 'Unknown')
    
    def __str__(self):
        return f"{self.get_day_display()} - Period {self.period_number}"


class ScheduledSession(models.Model):
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='scheduled_sessions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='scheduled_sessions')
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='scheduled_sessions')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='scheduled_sessions')
    slot = models.ForeignKey(TimetableSlot, on_delete=models.CASCADE, related_name='scheduled_sessions')
    is_lab_session = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('slot', 'section', 'faculty')
        ordering = ['slot__day', 'slot__period_number']
        indexes = [
            models.Index(fields=['section', 'slot']),
            models.Index(fields=['faculty', 'slot']),
            models.Index(fields=['room', 'slot']),
        ]
    
    def __str__(self):
        return f"{self.section} - {self.subject.name} - {self.slot}"
