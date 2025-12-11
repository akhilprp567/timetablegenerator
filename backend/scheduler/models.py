from django.db import models

# Create your models here.
class Course(models.Model):
    name = models.CharField(max_length=100)  # e.g., MCA, BE(CSE), B.Tech ECE
    code = models.CharField(max_length=20, unique=True)  # e.g., MCA, CSE-BE
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class Semester(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)  # e.g., Semester 1
    number = models.IntegerField()  # e.g., 1, 2, 3, 8
    
    def __str__(self):
        return f"{self.course.name} - {self.name}"

class Section(models.Model):
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE)
    name = models.CharField(max_length=10)  # e.g., A, B, C
    
    def __str__(self):
        return f"{self.semester} - Section {self.name}"

class Subject(models.Model):
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    weekly_hours = models.IntegerField(default=0)  # Total lecture hours
    lab_required = models.BooleanField(default=False)
    lab_hours = models.IntegerField(default=0)  # If lab → usually 2 hrs
    
    def __str__(self):
        return f"{self.name} ({self.code})"

class Faculty(models.Model):
    name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=50, unique=True)
    max_hours_per_week = models.IntegerField(default=18)  # Now from user input
    max_hours_per_day = models.IntegerField(default=4)
    max_consecutive_classes = models.IntegerField(default=3)
    
    # Add user association for one-time setup
    created_by = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.employee_id})"

class FacultyAvailability(models.Model):
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    day = models.IntegerField(choices=[(1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri'),(6,'Sat'),(7,'Sun')])
    available_from = models.TimeField()
    available_to = models.TimeField()
    
    def __str__(self):
        return f"{self.faculty.name} - Day {self.day}"

class FacultySubjectAllocation(models.Model):
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.faculty.name} - {self.subject.name}"

class InstitutionSettings(models.Model):
    institution_name = models.CharField(max_length=200, default='Institution') # e.g., VTU
    course = models.CharField(max_length=50)
    academic_year = models.CharField(max_length=10)
    working_days = models.IntegerField(default=5)
    periods_per_day = models.IntegerField()
    period_duration = models.IntegerField(default=60)
    
    # Add user association and setup status
    created_by = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)
    is_setup_complete = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.institution_name} ({self.academic_year})"

class Room(models.Model):
    name = models.CharField(max_length=50)  # e.g., Room 101
    is_lab = models.BooleanField(default=False)
    
    # Add user association for one-time setup
    created_by = models.ForeignKey('auth.User', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({'Lab' if self.is_lab else 'Classroom'})"

class TimetableSlot(models.Model):
    day = models.IntegerField(choices=[(1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri'),(6,'Sat'),(7,'Sun')])
    period_number = models.IntegerField()  # e.g., 1 to 6
    
    def __str__(self):
        day_name = dict([(1,'Mon'),(2,'Tue'),(3,'Wed'),(4,'Thu'),(5,'Fri'),(6,'Sat'),(7,'Sun')])[self.day]
        return f"{day_name} - Period {self.period_number}"

class ScheduledSession(models.Model):
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    faculty = models.ForeignKey(Faculty, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    slot = models.ForeignKey(TimetableSlot, on_delete=models.CASCADE)
    is_lab_session = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.section} - {self.subject.name} - {self.slot}"
