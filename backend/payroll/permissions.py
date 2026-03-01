from rest_framework.permissions import BasePermission

MANAGE_ROLES = ('accountant', 'senior_admin', 'chief_admin', 'moderator')
PRICE_ROLES = ('accountant', 'chief_admin', 'moderator')
DISBURSE_ROLES = ('senior_admin', 'chief_admin', 'moderator')
ALL_ACCESS_ROLES = ('chief_admin', 'moderator')


def get_role(user):
    try:
        return user.profile.role
    except Exception:
        return None


class IsAccountant(BasePermission):
    def has_permission(self, request, view):
        return get_role(request.user) in PRICE_ROLES


class CanApproveSheets(BasePermission):
    def has_permission(self, request, view):
        return get_role(request.user) in MANAGE_ROLES


class CanDisburse(BasePermission):
    def has_permission(self, request, view):
        return get_role(request.user) in DISBURSE_ROLES


class CanManagePrices(BasePermission):
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return get_role(request.user) in PRICE_ROLES


class IsModeratorOrChiefAdmin(BasePermission):
    def has_permission(self, request, view):
        return get_role(request.user) in ALL_ACCESS_ROLES
