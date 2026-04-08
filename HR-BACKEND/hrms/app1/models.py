from django.db import models
from django.contrib.auth.hashers import make_password   # ✅ ADD THIS ON TOP


# ✅ Candidate Table
class Candidate(models.Model):

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=10)

    password = models.CharField(max_length=255, null=True, blank=True)
    employee_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    aadhaar = models.CharField(max_length=12)
    pan = models.CharField(max_length=10)
    uan = models.CharField(max_length=12, blank=True, null=True)

    official_email = models.EmailField(blank=True, null=True)

    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)

    experience = models.CharField(max_length=100, blank=True)
    source = models.CharField(max_length=100, blank=True)
    skills = models.CharField(max_length=255, blank=True)
    department = models.CharField(max_length=100, default="IT")  # dept
    ROLE_CHOICES = [
    ("hr", "HR"),
    ("checker", "Checker"),
    ("employee", "Employee"),
    ("admin", "Admin"),
    ("management", "Management"),
    ]

    role = models.CharField(
    max_length=20,
    choices=ROLE_CHOICES,
    default="employee"
    )  


    photo = models.ImageField(upload_to="candidates/photos/", blank=True, null=True)

    status = models.CharField(max_length=50, default="Pending")

    created_at = models.DateTimeField(auto_now_add=True)
    date_of_joining = models.DateField(null=True, blank=True)

class Education(models.Model):

    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="education",
        null=True,
        blank=True
    )

    employee = models.ForeignKey(
        "Employee",
        on_delete=models.CASCADE,
        related_name="education",
        null=True,
        blank=True
    )

   

    school = models.CharField(max_length=255)
    degree = models.CharField(max_length=255)
    field_of_study = models.CharField(max_length=255)
    start_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.school


# ✅ Experience
class Experience(models.Model):

    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="experiences",
        null=True,
        blank=True
    )

    employee = models.ForeignKey(
        "Employee",   # ✅ IMPORTANT
        on_delete=models.CASCADE,
        related_name="experiences",
        null=True,
        blank=True
    )

    company_name = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    years = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.company_name


# ✅ FINAL EMPLOYEE MODEL (UPDATED 🔥)
class Employee(models.Model):

    employee_id = models.CharField(max_length=20, unique=True)

    name = models.CharField(max_length=200)
    email = models.EmailField()
    password = models.CharField(max_length=255)

    phone = models.CharField(max_length=15)
    is_active = models.BooleanField(default=True)
    department = models.CharField(max_length=100)
    date_of_joining = models.DateField()
   
    ROLE_CHOICES = [
    ("hr", "HR"),
    ("checker", "Checker"),
    ("employee", "Employee"),
    ("admin", "Admin"),
    ("management", "Management"),
    
    ]

    role = models.CharField(
    max_length=20,
    choices=ROLE_CHOICES,
    default="employee"
    )

    # 🔥 ADD THESE (IMPORTANT)
    aadhaar = models.CharField(max_length=12, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    city = models.CharField(max_length=100, blank=True)
    skills = models.CharField(max_length=255, blank=True)
    photo = models.ImageField(upload_to="employees/photos/", blank=True, null=True) 
    official_email = models.EmailField(blank=True, null=True)

    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)

    experience = models.CharField(max_length=100, blank=True)
    source = models.CharField(max_length=100, blank=True)

    uan = models.CharField(max_length=12, blank=True, null=True)

     # 🔥 ADD THIS FUNCTION (VERY IMPORTANT)
    def save(self, *args, **kwargs):
        if not self.password.startswith("pbkdf2_sha256"):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)


    def __str__(self):
        return f"{self.name} ({self.employee_id})"