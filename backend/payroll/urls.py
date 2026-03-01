from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CityViewSet, BranchViewSet, BranchTransactionViewSet,
    TeacherViewSet, SubjectViewSet,
    IndividualPriceViewSet, GroupPriceViewSet, PkshPriceViewSet,
    RateViewSet, BonusViewSet,
    PayrollSheetViewSet, PayrollEntryViewSet,
    IndividualLessonEntryViewSet, GroupLessonEntryViewSet,
    AdvanceViewSet, TransactionViewSet,
    NotificationViewSet, ActivityLogViewSet,
    csrf_cookie_view, login_view, logout_view, user_view, change_password,
    disburse_funds, add_extra_funds, users_list,
    user_profiles_list, create_user_profile, update_user_profile,
)

router = DefaultRouter()
router.register(r'cities', CityViewSet)
router.register(r'branches', BranchViewSet)
router.register(r'branch-transactions', BranchTransactionViewSet)
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
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'activity-log', ActivityLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/csrf/', csrf_cookie_view),
    path('auth/login/', login_view),
    path('auth/logout/', logout_view),
    path('auth/user/', user_view),
    path('auth/change-password/', change_password),
    path('finance/disburse/', disburse_funds),
    path('finance/add-extra/', add_extra_funds),
    path('finance/users/', users_list),
    path('profiles/', user_profiles_list),
    path('profiles/create/', create_user_profile),
    path('profiles/<int:user_id>/', update_user_profile),
]
