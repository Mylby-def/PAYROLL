from django.contrib import admin
from .models import (
    Teacher, Subject, Rate, Bonus,
    PayrollSheet, PayrollEntry,
    IndividualPrice, GroupPrice, PkshPrice,
    IndividualLessonEntry, GroupLessonEntry, Advance
)


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['full_name']
    filter_horizontal = ['subjects']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(IndividualPrice)
class IndividualPriceAdmin(admin.ModelAdmin):
    list_display = ['basic_rate', 'premium_rate', 'vacation_rate', 'effective_from', 'effective_to']
    list_filter = ['effective_from']
    date_hierarchy = 'effective_from'


@admin.register(GroupPrice)
class GroupPriceAdmin(admin.ModelAdmin):
    list_display = ['class_from', 'class_to', 'basic_rate', 'premium_rate', 'vacation_rate', 'effective_from', 'effective_to']
    list_filter = ['effective_from', 'class_from']
    date_hierarchy = 'effective_from'


@admin.register(PkshPrice)
class PkshPriceAdmin(admin.ModelAdmin):
    list_display = ['basic_rate', 'premium_rate', 'vacation_rate', 'effective_from', 'effective_to']
    list_filter = ['effective_from']
    date_hierarchy = 'effective_from'


@admin.register(Rate)
class RateAdmin(admin.ModelAdmin):
    list_display = ['rate_kind', 'subject', 'rate_type', 'amount', 'effective_from', 'effective_to']
    list_filter = ['rate_kind', 'rate_type', 'effective_from', 'subject']
    search_fields = ['subject__name']
    date_hierarchy = 'effective_from'


@admin.register(Bonus)
class BonusAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'amount', 'period_start', 'period_end', 'created_at']
    list_filter = ['period_start', 'period_end']
    search_fields = ['teacher__full_name', 'description']
    date_hierarchy = 'period_start'


class IndividualLessonEntryInline(admin.TabularInline):
    model = IndividualLessonEntry
    extra = 0


class GroupLessonEntryInline(admin.TabularInline):
    model = GroupLessonEntry
    extra = 0


class PayrollEntryInline(admin.TabularInline):
    model = PayrollEntry
    extra = 0
    fields = ['teacher', 'subject', 'date', 'hours', 'amount']
    autocomplete_fields = ['teacher', 'subject']


@admin.register(PayrollSheet)
class PayrollSheetAdmin(admin.ModelAdmin):
    list_display = ['title', 'teacher', 'period_start', 'period_end', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'period_start', 'created_at']
    search_fields = ['title', 'teacher__full_name']
    date_hierarchy = 'period_start'
    filter_horizontal = ['subjects']
    inlines = [IndividualLessonEntryInline, GroupLessonEntryInline, PayrollEntryInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PayrollEntry)
class PayrollEntryAdmin(admin.ModelAdmin):
    list_display = ['payroll_sheet', 'teacher', 'subject', 'date', 'hours', 'amount']
    list_filter = ['payroll_sheet', 'date', 'subject']
    search_fields = ['teacher__full_name', 'subject__name']
    date_hierarchy = 'date'
    autocomplete_fields = ['teacher', 'subject', 'payroll_sheet']


@admin.register(Advance)
class AdvanceAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'advance_type', 'amount', 'date', 'created_at']
    list_filter = ['advance_type', 'date']
    search_fields = ['teacher__full_name']
    date_hierarchy = 'date'
