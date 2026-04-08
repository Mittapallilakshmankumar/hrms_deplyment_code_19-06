from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime, date
from django.utils import timezone
from .models import Attendance
from app1.models import Employee
 
 
# ✅ CHECK-IN (ONLY ONCE PER DAY)
@api_view(['POST'])
def check_in(request):
 
    user_id = request.data.get("user_id")
 
    print("USER ID:", user_id)   # 👈 DEBUG
 
    if not user_id:
        return Response({"message": "User ID missing"})
 
    user_id = int(user_id)   # ✅ important
 
    # today = date.today()
    today = timezone.localdate()
    record = Attendance.objects.filter(user_id=user_id, date=today).first()
 
    if record:
        return Response({"message": "Already checked in"})
 
    Attendance.objects.create(
        user_id=user_id,
        date=today,
        # check_in=datetime.now().time()
        check_in=timezone.localtime().time()
 
    )
 
    print("DATA SAVED ✅")   # 👈 DEBUG
 
    return Response({"message": "Check-in success"})
 
 
# ✅ CHECK-OUT (ONLY ONCE)
@api_view(['POST'])
def check_out(request):
    user_id = int(request.data.get("user_id"))
    # user_id = request.data.get("user_id")
 
    if not user_id:
        return Response({"message": "User ID missing"})
 
    today = date.today()
    today = timezone.localdate()
 
    record = Attendance.objects.filter(user_id=user_id, date=today).first()
 
    if not record:
        return Response({"message": "No check-in found"})
 
    if record.check_out:
        return Response({"message": "Already checked out"})
 
    # record.check_out = datetime.now().time()
    record.check_out = timezone.localtime().time()
    record.summary = request.data.get("summary", "")
    record.save()
 
    return Response({"message": "Check-out success"})
 
 
# ✅ TRACKER (ONLY USER DATA)
@api_view(['GET'])
def attendance_list(request):
 
    user_id = request.GET.get("user_id")
 
    print("URL USER ID:", user_id)
 
    if not user_id:
        return Response([])
 
    user_id = int(user_id)
 
    all_data = Attendance.objects.all()
    print("ALL DATA:", list(all_data.values()))
 
   
    Attendance.objects.filter(user_id=user_id)  
    # print("FILTERED DATA:", list(data.values()))
 
    # return Response(list(data.values()))
    queryset = Attendance.objects.filter(user_id=user_id)
 
    print("FILTERED DATA:", list(queryset.values()))
 
    return Response(list(queryset.values()))
 
# ✅ ADMIN DASHBOARD
@api_view(['GET'])
def admin_dashboard(request):
    today = date.today()
    today = timezone.localdate()
 
    employees = Employee.objects.all()
    data = []
 
    for emp in employees:
        user_id = emp.id   # your Attendance uses user_id = Employee.id
 
        records = Attendance.objects.filter(user_id=user_id)
 
        present_days = records.filter(check_in__isnull=False).count()
        total_days = records.count()
        absent_days = total_days - present_days
 
        today_record = records.filter(date=today).first()
 
        data.append({
            "employee_id": emp.employee_id,   # ✅ CORRECT FIELD
            "name": emp.name,            # ✅ CORRECT FIELD
 
            "today_status": "Present" if today_record and today_record.check_in else "Absent",
 
            "login_time": today_record.check_in if today_record else None,
            "logout_time": today_record.check_out if today_record else None,
 
            "present_days": present_days,
            "absent_days": absent_days,
            "total_days": total_days,
        })
 
    return Response(data)




@api_view(['POST'])
def admin_reset_password(request):
 
    try:
        employee_id = request.data.get("employee_id")
        email = request.data.get("email")
        new_password = request.data.get("new_password")
 
        # ✅ validation
        if not employee_id or not email or not new_password:
            return Response(
                {"message": "employee_id, email and new_password required"},
                status=400
            )
 
        # ✅ find employee
        employee = Employee.objects.filter(
            employee_id=employee_id,
            email=email
        ).first()
 
        if not employee:
            return Response(
                {"message": "Employee not found or email mismatch"},
                status=404
            )
 
        # ✅ update password (model save() already hashes it)
        employee.password = new_password
        employee.save()
 
        return Response({
            "message": "Password reset successfully"
        })
 
    except Exception as e:
        return Response({"error": str(e)}, status=400)
 
 

 
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Attendance
from app1.models import Employee

@api_view(['GET'])
def attendance_by_date(request):
    date = request.GET.get('date')

    employees = Employee.objects.all()
    data = []

    for emp in employees:
        record = Attendance.objects.filter(
            user_id=emp.id,    # ✅ IMPORTANT FIX
            date=date
        ).first()

        if record and record.check_in and record.check_out:
            status = "Present"
        else:
            status = "Absent"

        data.append({
            "employee_id": emp.employee_id,
            "name": emp.name,
            "status": status
        })

    return Response(data)

@api_view(['GET'])
def attendance_by_month(request):
    month_str = request.GET.get('month')  # format: 2026-04

    year, month = month_str.split("-")

    employees = Employee.objects.all()
    data = []

    for emp in employees:
        records = Attendance.objects.filter(
            user_id=emp.id,   # ✅ same as your date API
            date__year=year,
            date__month=month
        )

        present_days = records.filter(
            check_in__isnull=False,
            check_out__isnull=False
        ).count()

        total_days = records.count()
        absent_days = total_days - present_days

        data.append({
            "employee_id": emp.employee_id,
            "name": emp.name,
            "present_days": present_days,
            "absent_days": absent_days,
            "total_days": total_days,
            "today_status": "Present" if present_days > 0 else "Absent"
        })

    return Response(data)




    