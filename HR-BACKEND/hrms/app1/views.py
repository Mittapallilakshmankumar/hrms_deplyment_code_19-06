from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Candidate, Education, Employee,Experience
from .serializers import CandidateSerializer
from datetime import date
from django.contrib.auth.hashers import make_password
from rest_framework import status
import json


# ✅ CREATE CANDIDATE
@api_view(['POST'])
def add_candidate(request):
    try:
        print("API HIT")
        print("===== CHECK START =====")
        print("FULL DATA:", request.data)
        print("EDUCATION:", request.data.get("education"))
        print("EXPERIENCE:", request.data.get("experiences"))
        print("===== CHECK END =====")

        data = request.data
        files = request.FILES

        photo = files.get("photo")

        # ✅ CREATE CANDIDATE
        candidate = Candidate.objects.create(
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            email=data.get("email"),
            phone=data.get("phone"),
            password=data.get("password"),
            role=data.get("role", "employee"),
            aadhaar=data.get("aadhaar"),
            pan=data.get("pan"),
            uan=data.get("uan"),
            employee_id=data.get("employee_id"),
            official_email=data.get("official_email"),
            address_line1=data.get("address_line1"),
            address_line2=data.get("address_line2"),
            city=data.get("city"),
            experience=data.get("experience"),
            source=data.get("source"),
            skills=data.get("skills"),
            department=data.get("department"),
            photo=photo,
        )

        print("SAVED:", candidate.id)

        # ✅ SAVE EDUCATION
                # ✅ SAVE EDUCATION
        education_list = data.get("education", [])

        if isinstance(education_list, str):
            education_list = json.loads(education_list)
            for edu in education_list:
                if isinstance(edu, dict):
                    Education.objects.create(
                        candidate=candidate,
                        school=edu.get("school") or edu.get("School Name"),
                        degree=edu.get("degree") or edu.get("Degree / Diploma"),
                        field_of_study=edu.get("field_of_study") or edu.get("Field of Study") or "N/A",
                        start_date=edu.get("start_date") or None,
                        notes=edu.get("notes") or edu.get("Notes"),
                    )

        # ✅ SAVE EXPERIENCE
        experience_list = data.get("experiences", [])

       
        if isinstance(experience_list, str):
             experience_list = json.loads(experience_list)
             for exp in experience_list:
                if isinstance(exp, dict):
                    Experience.objects.create(
                        candidate=candidate,
                        company_name=exp.get("company_name"),
                        role=exp.get("role"),
                        years=exp.get("years"),
                        description=exp.get("description")
                    )

        # ✅ RETURN
        return Response({"message": "Candidate saved successfully"})


    except Exception as e:
        print("ERROR:", str(e))
        return Response({"error": str(e)}, status=400)


# ✅ GET CANDIDATES (FIXED)
@api_view(['GET'])
def get_candidates(request):
    try:
        candidates = Candidate.objects.all()   # 🔥 SIMPLE FIX
        serializer = CandidateSerializer(candidates, many=True)
        return Response(serializer.data)

    except Exception as e:
        return Response({"error": str(e)})


# ✅ DELETE
@api_view(['DELETE'])
def delete_candidate(request, id):
    try:
        candidate = Candidate.objects.get(id=id)
        candidate.delete()
        return Response({"message": "Deleted successfully"})
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found"})


# ✅ UPDATE
@api_view(['PUT'])
def update_candidate(request, id):
    try:
        candidate = Candidate.objects.get(id=id)
        data = request.data

        candidate.first_name = data.get("first_name", candidate.first_name)
        candidate.last_name = data.get("last_name", candidate.last_name)
        candidate.email = data.get("email", candidate.email)
        candidate.phone = data.get("phone", candidate.phone)

        if request.FILES.get('photo'):
            candidate.photo = request.FILES.get('photo')

        candidate.save()

        return Response({"message": "Updated successfully"})

    except Exception as e:
        return Response({"error": str(e)})



from datetime import date
from app1.models import Employee, Candidate ,Education,Experience
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['POST'])
def approve_candidate(request, id):
    user = request.user   # ✅ STEP 1
      # ✅ ADD THESE 2 LINES HERE
    print("USER:", request.user)
    print("ROLE:", request.user.role)
     # ✅ ADD THIS (VERY IMPORTANT)
    if not user.is_authenticated:
        return Response({"error": "Login required"}, status=401)

    # if user.role not in ["admin", "hr", "management"]:
    
    if user.role.lower() not in ["admin", "hr", "management"]:
        return Response({"error": "Permission denied"}, status=403)
    print("APPROVE CLICKED")

    try:
        # ✅ Get candidate
        candidate = Candidate.objects.get(id=id)

        # 🔥 FINAL ID LOGIC (CORRECT)

     

        # ✅ Create employee
        emp = Employee.objects.create(
            employee_id=candidate.employee_id,
            name=candidate.first_name + " " + candidate.last_name,
            email=candidate.email,
            password=candidate.password,
            phone=candidate.phone or "9999999999",
            department=candidate.department or "IT",
            date_of_joining=date.today(),
            role=candidate.role,

            aadhaar=candidate.aadhaar or "",
            pan=candidate.pan or "",
            city=candidate.city or "",
            skills=candidate.skills or "",
            photo=candidate.photo,   # ✅ ADD THIS LINE

             # 🔥 ADD THESE
            official_email=candidate.official_email,
            address_line1=candidate.address_line1,
            address_line2=candidate.address_line2,
            experience=candidate.experience,
            source=candidate.source,
            uan=candidate.uan

            # 🔥 COPY EDUCATION FROM CANDIDATE → EMPLOYEE
       
        )

        print("EMP CREATED:", emp)
        for edu in candidate.education.all():
            Education.objects.create(
            employee=emp,
            school=edu.school,
            degree=edu.degree,
            field_of_study=edu.field_of_study,
            start_date=edu.start_date,
            notes=edu.notes
        )
        # ✅ COPY EXPERIENCE
        for exp in candidate.experiences.all():
            Experience.objects.create(
              employee=emp,
              company_name=exp.company_name,
              role=exp.role,
              years=exp.years,
              description=exp.description
            )
        candidate.delete()

        return Response({
    "message": "Approved",
    "employee_id": candidate.employee_id
})

    except Exception as e:
        print("ERROR:", str(e))
        return Response({"error": str(e)}, status=400)

    except Exception as e:
        print("ERROR:", str(e))  # 🔥 DEBUG
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ✅ DASHBOARD
@api_view(['GET'])
def dashboard(request):
    from attendance.models import Attendance
    today = date.today()

    present = Attendance.objects.filter(
        check_in__isnull=False,
        date__month=today.month
    ).count()

    absent = Attendance.objects.filter(
        check_in__isnull=True,
        date__month=today.month
    ).count()

    return Response({
        "present_days": present,
        "absent_days": absent,
        "pending_requests": 0,
        "leave_balance": 20
    })


# ✅ EMPLOYEE LIST
@api_view(['GET'])
def list_employees(request):
    emp_id = request.GET.get("employee_id")
    user_id = request.GET.get("user_id")

    # 🔥 IF employee_id USED
    if emp_id:
        employees = Employee.objects.filter(employee_id=emp_id)

    # 🔥 IF user_id USED
    elif user_id:
        emp = Employee.objects.get(id=user_id)

        # if emp.role == "admin":
        # if emp.role in ["admin", "hr", "management"]:
        if emp.role.lower() in ["admin", "hr", "management"]:
            employees = Employee.objects.all()
        else:
            employees = Employee.objects.filter(id=user_id)

    else:
        employees = Employee.objects.all()

    return Response(list(employees.values(
        "id",
        "employee_id",
        "name",
        "email",
        "phone",
        "department",
        "date_of_joining",
        "role",
        "aadhaar",
        "pan",
        "city",
        "skills",
          "is_active"
    )))


from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Employee



@api_view(['PATCH'])
def exit_employee(request, pk):

    user = request.user   # ✅ ADD THIS
    # ✅ ADD THIS FIRST
    if not user.is_authenticated:
        return Response({"error": "Login required"}, status=401)
    # ✅ ADD THESE 2 LINES HERE
    print("USER:", request.user)
    print("ROLE:", request.user.role)

    # 🔥 SECURITY CHECK
    # if user.role not in ["admin", "hr", "management"]:
    if user.role.lower() not in ["admin", "hr", "management"]:
        return Response({"error": "Permission denied"}, status=403)

    try:
        emp = Employee.objects.get(id=pk)

        emp.is_active = False   # ✅ MAIN LOGIC
        emp.save()

        return Response({"message": "Employee exited successfully"})

    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)


###
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Candidate
from .serializers import CandidateSerializer

@api_view(['GET'])
def candidate_detail(request, id):
    try:
        candidate = Candidate.objects.get(id=id)
        serializer = CandidateSerializer(candidate)
        return Response(serializer.data)
    except Candidate.DoesNotExist:
        return Response({"error": "Candidate not found"})


@api_view(['GET'])
def employee_detail(request, id):
    try:
        emp = Employee.objects.get(id=id)

        return Response({
            "id": emp.id,
            "employee_id": emp.employee_id,
            "name": emp.name,
            "first_name": emp.name.split(" ")[0],
            "last_name": emp.name.split(" ")[1] if " " in emp.name else "",
            "email": emp.email,
            "phone": emp.phone,
            "department": emp.department,
            "date_of_joining": emp.date_of_joining,
            "role": emp.role,
            "aadhaar": emp.aadhaar,
            "pan": emp.pan,
            "city": emp.city,
            "skills": emp.skills,
            "official_email": emp.official_email,
            "address_line1": emp.address_line1,
            "address_line2": emp.address_line2,
            "experience": emp.experience,
            "source": emp.source,
            "uan": emp.uan,
            # 🔥 ADD THESE
            "education": list(Education.objects.filter(employee=emp).values()),
            "experiences": list(Experience.objects.filter(employee=emp).values()),
        })

    except Employee.DoesNotExist:
        return Response({"error": "Employee not found"})
