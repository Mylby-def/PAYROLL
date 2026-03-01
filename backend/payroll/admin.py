from django.contrib import admin
from .models import (
    City, Branch, BranchTransaction, UserProfile, Teacher, Subject,
    IndividualPrice, GroupPrice, PkshPrice, Rate, Bonus,
    PayrollSheet, PayrollEntry, IndividualLessonEntry, GroupLessonEntry,
    Advance, Transaction, Notification, ActivityLog
)

for m in [City, Branch, BranchTransaction, UserProfile, Teacher, Subject,
          IndividualPrice, GroupPrice, PkshPrice, Rate, Bonus,
          PayrollSheet, PayrollEntry, IndividualLessonEntry, GroupLessonEntry,
          Advance, Transaction, Notification, ActivityLog]:
    admin.site.register(m)
