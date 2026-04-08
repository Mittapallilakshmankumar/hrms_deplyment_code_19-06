from datetime import time
from django.utils import timezone
from .models import Attendance
 
 
def auto_checkout_9pm():
 
    today = timezone.localdate()
 
    records = Attendance.objects.filter(
        date=today,
        check_in__isnull=False,
        check_out__isnull=True
    )
 
    updated_count = 0
 
    for record in records:
        record.check_out = time(21, 0)
        record.summary = "Auto checkout at 9 PM"
        record.save(update_fields=["check_out", "summary"])
 
        updated_count += 1
 
    print(f"{updated_count} employees auto-checked out at 9 PM")