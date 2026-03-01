from django.contrib import admin
from .models import (
    City, UserProfile, Teacher, Subject,
    IndividualPrice, GroupPrice, PkshPrice,
    Rate, Bonus, PayrollSheet, PayrollEntry,
    IndividualLessonEntry, GroupLessonEntry, Advance, Transaction
)


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ['name']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'city']
    list_filter = ['role', 'city']


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'user', 'is_active']
    list_filter = ['is_active']
    filter_horizontal = ['subjects']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


@admin.register(IndividualPrice)
class IndividualPriceAdmin(admin.ModelAdmin):
    list_display = ['basic_rate', 'premium_rate', 'vacation_rate', 'effective_from', 'effective_to']


@admin.register(GroupPrice)
class GroupPriceAdmin(admin.ModelAdmin):
    list_display = ['class_from', 'class_to', 'basic_rate', 'effective_from', 'effective_to']


@admin.register(PkshPrice)
class PkshPriceAdmin(admin.ModelAdmin):
    list_display = ['basic_rate', 'premium_rate', 'vacation_rate', 'effective_from', 'effective_to']


@admin.register(PayrollSheet)
class PayrollSheetAdmin(admin.ModelAdmin):
    list_display = ['title', 'teacher', 'status', 'period_start', 'period_end']
    list_filter = ['status']


@admin.register(Advance)
class AdvanceAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'advance_type', 'status', 'amount', 'date']
    list_filter = ['advance_type', 'status']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'transaction_type', 'amount', 'created_at']
    list_filter = ['transaction_type']


admin.site.register(Rate)
admin.site.register(Bonus)
admin.site.register(PayrollEntry)
admin.site.register(IndividualLessonEntry)
admin.site.register(GroupLessonEntry)
