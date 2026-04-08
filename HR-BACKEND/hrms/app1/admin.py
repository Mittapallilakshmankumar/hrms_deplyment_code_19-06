from django.contrib import admin
from .models import Candidate, Education, Experience, Employee


# 🔹 Education Inline (inside Candidate page)
class EducationInline(admin.TabularInline):
    model = Education
    extra = 1
    fields = ('school', 'degree', 'field_of_study', 'start_date', 'notes')
    show_change_link = True


# 🔹 Experience Inline
class ExperienceInline(admin.TabularInline):
    model = Experience
    extra = 1
    fields = ('company_name', 'role', 'years', 'description')
    show_change_link = True


# 🔥 Candidate Admin (MAIN CONTROL)
class CandidateAdmin(admin.ModelAdmin):

    # ✅ Table columns
    list_display = (
        'id',
        'employee_id',
        'first_name',
        'last_name',
        'role',
        'email',
        'phone',
        'department',
        'status',
        'created_at'
    )

    # ✅ Search bar
    search_fields = (
        'first_name',
        'last_name',
        'email',
        'phone',
        'pan',
        'aadhaar',
        'employee_id'   # 🔥 ADD THIS
    )

    # ✅ Filters (right side)
    list_filter = (
        'department',
        'status',
        'created_at',
        'employee_id'   # 🔥 ADD THIS
    )

    # ✅ Sorting
    ordering = ('-created_at',)

    # ✅ Pagination
    list_per_page = 10

    # ✅ Inline tables (VERY IMPORTANT)
    inlines = [EducationInline, ExperienceInline]

    # ✅ Group fields in sections
    fieldsets = (

        ("Basic Info", {
            'fields': ('first_name', 'last_name', 'email', 'phone','employee_id', 'role')  # 🔥 ADD employee_id AND role HERE
        }),

        ("Government Details", {
            'fields': ('aadhaar', 'pan', 'uan')
        }),

        ("Official Info", {
            'fields': ('official_email',)
        }),

        ("Address", {
            'fields': ('address_line1', 'address_line2', 'city')
        }),

        ("Professional Details", {
            'fields': ('experience', 'source', 'skills', 'department')
        }),

        ("Other", {
            'fields': ('photo', 'status')
        }),
    )


# 🔹 Education Admin (optional separate view)
class EducationAdmin(admin.ModelAdmin):
    list_display = ('id', 'candidate', 'school', 'degree', 'field_of_study')
    search_fields = ('school', 'degree')


# 🔹 Experience Admin
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ('id', 'candidate', 'company_name', 'role')
    search_fields = ('company_name', 'role')


class EmployeeAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'employee_id',
        'name',
        'email',
        'department',
        'role',
        'date_of_joining',
        'is_active'   # ✅ SHOW THIS IN TABLE
    )

    search_fields = ('name', 'email', 'employee_id')

    list_filter = ('role', 'department')

    ordering = ('-id',)

    # 🔥 ADD THIS BLOCK
    fields = (
        'employee_id',
        'name',
        'email',
        'password',   # ✅ NOW IT WILL SHOW
        'phone',
        'department',
        'date_of_joining',
        'role',
        'aadhaar',
        'pan',
        'city',
        'skills',
        'is_active'
    )


# ✅ Register all models
admin.site.register(Candidate, CandidateAdmin)
admin.site.register(Education, EducationAdmin)
admin.site.register(Experience, ExperienceAdmin)
admin.site.register(Employee, EmployeeAdmin)



