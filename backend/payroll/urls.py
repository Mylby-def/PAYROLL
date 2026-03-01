from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeacherViewSet, SubjectViewSet,
    RateViewSet, BonusViewSet,
    PayrollSheetViewSet, PayrollEntryViewSet,
    IndividualPriceViewSet, GroupPriceViewSet, PkshPriceViewSet,
    IndividualLessonEntryViewSet, GroupLessonEntryViewSet, AdvanceViewSet,
    csrf_cookie_view, login_view, logout_view, user_view
)

router = DefaultRouter()
router.register(r'teachers', TeacherViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'rates', RateViewSet)
router.register(r'bonuses', BonusViewSet)
router.register(r'payroll-sheets', PayrollSheetViewSet, basename='payrollsheet')
router.register(r'payroll-entries', PayrollEntryViewSet)
router.register(r'individual-prices', IndividualPriceViewSet)
router.register(r'group-prices', GroupPriceViewSet)
router.register(r'pksh-prices', PkshPriceViewSet)
router.register(r'individual-lesson-entries', IndividualLessonEntryViewSet)
router.register(r'group-lesson-entries', GroupLessonEntryViewSet)
router.register(r'advances', AdvanceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/csrf/', csrf_cookie_view, name='csrf_cookie'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/user/', user_view, name='user'),
]
