from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CityViewSet, TeacherViewSet, SubjectViewSet,
    IndividualPriceViewSet, GroupPriceViewSet, PkshPriceViewSet,
    RateViewSet, BonusViewSet,
    PayrollSheetViewSet, PayrollEntryViewSet,
    IndividualLessonEntryViewSet, GroupLessonEntryViewSet,
    AdvanceViewSet, TransactionViewSet,
    csrf_cookie_view, login_view, logout_view, user_view,
    disburse_funds, add_extra_funds, users_list,
    user_profiles_list, create_user_profile, update_user_profile,
)

router = DefaultRouter()
router.register(r'cities', CityViewSet)
router.register(r'teachers', TeacherViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'individual-prices', IndividualPriceViewSet)
router.register(r'group-prices', GroupPriceViewSet)
router.register(r'pksh-prices', PkshPriceViewSet)
router.register(r'rates', RateViewSet)
router.register(r'bonuses', BonusViewSet)
router.register(r'payroll-sheets', PayrollSheetViewSet, basename='payrollsheet')
router.register(r'payroll-entries', PayrollEntryViewSet)
router.register(r'individual-lesson-entries', IndividualLessonEntryViewSet)
router.register(r'group-lesson-entries', GroupLessonEntryViewSet)
router.register(r'advances', AdvanceViewSet)
router.register(r'transactions', TransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/csrf/', csrf_cookie_view, name='csrf_cookie'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/user/', user_view, name='user'),
    path('finance/disburse/', disburse_funds, name='disburse'),
    path('finance/add-extra/', add_extra_funds, name='add_extra'),
    path('finance/users/', users_list, name='users_list'),
    path('profiles/', user_profiles_list, name='profiles_list'),
    path('profiles/create/', create_user_profile, name='profile_create'),
    path('profiles/<int:user_id>/', update_user_profile, name='profile_update'),
]
