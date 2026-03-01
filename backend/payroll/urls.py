from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeacherViewSet, SubjectViewSet,
    RateViewSet, BonusViewSet,
    PayrollSheetViewSet, PayrollEntryViewSet,
    csrf_cookie_view, login_view, logout_view, user_view
)

router = DefaultRouter()
router.register(r'teachers', TeacherViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'rates', RateViewSet)
router.register(r'bonuses', BonusViewSet)
router.register(r'payroll-sheets', PayrollSheetViewSet, basename='payrollsheet')
router.register(r'payroll-entries', PayrollEntryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/csrf/', csrf_cookie_view, name='csrf_cookie'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/user/', user_view, name='user'),
]
