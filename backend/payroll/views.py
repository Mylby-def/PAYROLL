from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Q, Sum
from django.http import HttpResponse
from datetime import timedelta, date
from decimal import Decimal
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

from .models import (
    City, Branch, BranchTransaction, UserProfile, Teacher, Subject,
    IndividualPrice, GroupPrice, PkshPrice, Rate, Bonus,
    PayrollSheet, PayrollEntry, IndividualLessonEntry, GroupLessonEntry,
    Advance, Transaction, Notification, ActivityLog, CAN_SUBMIT_SHEETS
)
from .serializers import (
    CitySerializer, BranchSerializer, BranchTransactionSerializer,
    UserSerializer, TeacherSerializer, SubjectSerializer,
    IndividualPriceSerializer, GroupPriceSerializer, PkshPriceSerializer,
    RateSerializer, BonusSerializer,
    PayrollSheetSerializer, PayrollSheetListSerializer, PayrollEntrySerializer,
    IndividualLessonEntrySerializer, GroupLessonEntrySerializer,
    AdvanceSerializer, TransactionSerializer, UserListSerializer,
    NotificationSerializer, ActivityLogSerializer
)
from .permissions import get_role, CanManagePrices, MANAGE_ROLES, DISBURSE_ROLES

PROFILE_ROLES = ('senior_admin', 'chief_admin', 'moderator')
BRANCH_FINANCE_ROLES = ('administrator', 'senior_admin', 'chief_admin', 'moderator')
BRANCH_WITHDRAW_ROLES = ('senior_admin', 'chief_admin', 'moderator')


def _log(user, action, details=''):
    ActivityLog.objects.create(user=user, action=action, details=details)


def _notify(user, title, message='', link=''):
    Notification.objects.create(user=user, title=title, message=message, link=link)


# ── Auth ──────────────────────────────────────────────────────

@api_view(['GET'])
@perm_classes([AllowAny])
@ensure_csrf_cookie
def csrf_cookie_view(request):
    return Response({'detail': 'CSRF cookie set'})

@api_view(['POST'])
@perm_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response({'detail': 'Необходимо указать имя пользователя и пароль'}, status=status.HTTP_400_BAD_REQUEST)
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        return Response({'user': UserSerializer(user).data})
    return Response({'detail': 'Неверные учетные данные'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@perm_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'detail': 'Выход выполнен успешно'})

@api_view(['GET'])
@perm_classes([IsAuthenticated])
def user_view(request):
    return Response(UserSerializer(request.user).data)

@api_view(['POST'])
@perm_classes([IsAuthenticated])
def change_password(request):
    old_pw = request.data.get('old_password')
    new_pw = request.data.get('new_password')
    if not old_pw or not new_pw:
        return Response({'detail': 'Укажите старый и новый пароль'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(old_pw):
        return Response({'detail': 'Неверный текущий пароль'}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(new_pw)
    request.user.save()
    login(request, request.user)
    _log(request.user, 'Смена пароля')
    return Response({'detail': 'Пароль изменён'})


# ── Notifications ─────────────────────────────────────────────

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        n = self.get_object()
        n.is_read = True
        n.save()
        return Response({'ok': True})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'ok': True})


# ── Activity Log ──────────────────────────────────────────────

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role = get_role(self.request.user)
        if role in ('chief_admin', 'moderator'):
            return super().get_queryset()
        if role == 'senior_admin':
            try:
                city_id = self.request.user.profile.city_id
                if city_id:
                    return super().get_queryset().filter(user__profile__city_id=city_id)
            except:
                pass
        return super().get_queryset().filter(user=self.request.user)


# ── Cities & Branches ────────────────────────────────────────

class CityViewSet(viewsets.ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer
    permission_classes = [IsAuthenticated]


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        city_id = self.request.query_params.get('city')
        role = get_role(self.request.user)
        if city_id:
            qs = qs.filter(city_id=city_id)
        elif role == 'senior_admin':
            try:
                my_city = self.request.user.profile.city_id
                if my_city:
                    qs = qs.filter(city_id=my_city)
            except:
                pass
        return qs

    @action(detail=True, methods=['post'])
    def deposit(self, request, pk=None):
        role = get_role(request.user)
        if role not in BRANCH_FINANCE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        branch = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        if amount <= 0:
            return Response({'detail': 'Сумма > 0'}, status=status.HTTP_400_BAD_REQUEST)
        branch.balance += amount
        branch.save()
        BranchTransaction.objects.create(
            branch=branch, transaction_type='deposit', amount=amount,
            description=request.data.get('description', ''), created_by=request.user
        )
        _log(request.user, f'Внесение на филиал "{branch.name}"', f'{amount}₽')
        return Response(BranchSerializer(branch).data)

    @action(detail=True, methods=['post'])
    def withdraw(self, request, pk=None):
        role = get_role(request.user)
        if role not in BRANCH_WITHDRAW_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        branch = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        if amount <= 0:
            return Response({'detail': 'Сумма > 0'}, status=status.HTTP_400_BAD_REQUEST)
        if amount > branch.balance:
            return Response({'detail': f'Недостаточно средств ({branch.balance}₽)'}, status=status.HTTP_400_BAD_REQUEST)
        branch.balance -= amount
        branch.save()
        BranchTransaction.objects.create(
            branch=branch, transaction_type='withdrawal', amount=amount,
            description=request.data.get('description', ''), created_by=request.user
        )
        _log(request.user, f'Снятие с филиала "{branch.name}"', f'{amount}₽')
        return Response(BranchSerializer(branch).data)


class BranchTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BranchTransaction.objects.all()
    serializer_class = BranchTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs


# ── Teachers / Subjects ──────────────────────────────────────

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]


# ── Prices ────────────────────────────────────────────────────

def _check_price_gaps(model_class):
    prices = model_class.objects.order_by('effective_from')
    gaps, prev = [], None
    for p in prices:
        if prev and prev.effective_to:
            nd = prev.effective_to + timedelta(days=1)
            if nd < p.effective_from:
                gaps.append({'gap_from': str(nd), 'gap_to': str(p.effective_from - timedelta(days=1))})
        prev = p
    return Response({'gaps': gaps})

class IndividualPriceViewSet(viewsets.ModelViewSet):
    queryset = IndividualPrice.objects.all()
    serializer_class = IndividualPriceSerializer
    permission_classes = [IsAuthenticated, CanManagePrices]
    def get_queryset(self):
        qs = super().get_queryset()
        d = self.request.query_params.get('date')
        if d: qs = qs.filter(Q(effective_from__lte=d) & (Q(effective_to__isnull=True) | Q(effective_to__gte=d)))
        return qs
    @action(detail=False, methods=['get'])
    def check_gaps(self, request): return _check_price_gaps(IndividualPrice)

class GroupPriceViewSet(viewsets.ModelViewSet):
    queryset = GroupPrice.objects.all()
    serializer_class = GroupPriceSerializer
    permission_classes = [IsAuthenticated, CanManagePrices]
    def get_queryset(self):
        qs = super().get_queryset()
        d = self.request.query_params.get('date')
        grade = self.request.query_params.get('grade')
        if d: qs = qs.filter(Q(effective_from__lte=d) & (Q(effective_to__isnull=True) | Q(effective_to__gte=d)))
        if grade: qs = qs.filter(class_from__lte=int(grade), class_to__gte=int(grade))
        return qs
    @action(detail=False, methods=['get'])
    def check_gaps(self, request): return _check_price_gaps(GroupPrice)

class PkshPriceViewSet(viewsets.ModelViewSet):
    queryset = PkshPrice.objects.all()
    serializer_class = PkshPriceSerializer
    permission_classes = [IsAuthenticated, CanManagePrices]
    def get_queryset(self):
        qs = super().get_queryset()
        d = self.request.query_params.get('date')
        if d: qs = qs.filter(Q(effective_from__lte=d) & (Q(effective_to__isnull=True) | Q(effective_to__gte=d)))
        return qs
    @action(detail=False, methods=['get'])
    def check_gaps(self, request): return _check_price_gaps(PkshPrice)

class RateViewSet(viewsets.ModelViewSet):
    queryset = Rate.objects.all()
    serializer_class = RateSerializer
    permission_classes = [IsAuthenticated]

class BonusViewSet(viewsets.ModelViewSet):
    queryset = Bonus.objects.all()
    serializer_class = BonusSerializer
    permission_classes = [IsAuthenticated]


# ── Entries ───────────────────────────────────────────────────

class IndividualLessonEntryViewSet(viewsets.ModelViewSet):
    queryset = IndividualLessonEntry.objects.all()
    serializer_class = IndividualLessonEntrySerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = super().get_queryset()
        sid = self.request.query_params.get('payroll_sheet')
        return qs.filter(payroll_sheet_id=sid) if sid else qs
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        items = request.data if isinstance(request.data, list) else [request.data]
        created = []
        for item in items:
            s = IndividualLessonEntrySerializer(data=item)
            s.is_valid(raise_exception=True)
            created.append(s.save())
        return Response(IndividualLessonEntrySerializer(created, many=True).data, status=status.HTTP_201_CREATED)

class GroupLessonEntryViewSet(viewsets.ModelViewSet):
    queryset = GroupLessonEntry.objects.all()
    serializer_class = GroupLessonEntrySerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = super().get_queryset()
        sid = self.request.query_params.get('payroll_sheet')
        return qs.filter(payroll_sheet_id=sid) if sid else qs
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        items = request.data if isinstance(request.data, list) else [request.data]
        created = []
        for item in items:
            s = GroupLessonEntrySerializer(data=item)
            s.is_valid(raise_exception=True)
            created.append(s.save())
        return Response(GroupLessonEntrySerializer(created, many=True).data, status=status.HTTP_201_CREATED)

class PayrollEntryViewSet(viewsets.ModelViewSet):
    queryset = PayrollEntry.objects.all()
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsAuthenticated]


# ── Advances ──────────────────────────────────────────────────

class AdvanceViewSet(viewsets.ModelViewSet):
    queryset = Advance.objects.all()
    serializer_class = AdvanceSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = super().get_queryset()
        tid = self.request.query_params.get('teacher')
        return qs.filter(teacher_id=tid) if tid else qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if get_role(request.user) not in MANAGE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        adv = self.get_object()
        if adv.status != 'pending':
            return Response({'detail': 'Уже обработан'}, status=status.HTTP_400_BAD_REQUEST)
        adv.status = 'approved'
        adv.save()
        if adv.advance_type == 'request' and adv.teacher and adv.teacher.user:
            Transaction.objects.create(user=adv.teacher.user, transaction_type='advance_given', balance_type='main', amount=adv.amount, description='Аванс одобрен', created_by=request.user)
        return Response(AdvanceSerializer(adv).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if get_role(request.user) not in MANAGE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        adv = self.get_object()
        if adv.status != 'pending':
            return Response({'detail': 'Уже обработан'}, status=status.HTTP_400_BAD_REQUEST)
        adv.status = 'rejected'
        adv.save()
        return Response(AdvanceSerializer(adv).data)

    @action(detail=False, methods=['get'])
    def debt(self, request):
        tid = request.query_params.get('teacher')
        if not tid:
            return Response({'detail': 'teacher required'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'debt': str(Advance.get_teacher_debt(int(tid)))})


# ── Transactions ──────────────────────────────────────────────

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = super().get_queryset()
        role = get_role(self.request.user)
        uid = self.request.query_params.get('user')
        if uid: qs = qs.filter(user_id=uid)
        elif role == 'teacher' or role == 'employee': qs = qs.filter(user=self.request.user)
        elif role == 'senior_admin':
            try:
                cid = self.request.user.profile.city_id
                if cid: qs = qs.filter(user__profile__city_id=cid)
            except: pass
        return qs
    def create(self, request, *args, **kwargs):
        role = get_role(request.user)
        if role not in DISBURSE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        data['created_by'] = request.user.id
        s = TransactionSerializer(data=data)
        s.is_valid(raise_exception=True)
        s.save()
        _log(request.user, 'Создание транзакции', str(data.get('description', '')))
        return Response(s.data, status=status.HTTP_201_CREATED)


# ── Finance ──────────────────────────────────────────────────

@api_view(['POST'])
@perm_classes([IsAuthenticated])
def disburse_funds(request):
    role = get_role(request.user)
    if role not in DISBURSE_ROLES:
        return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
    uid = request.data.get('user_id')
    amount = Decimal(str(request.data.get('amount', 0)))
    bt = request.data.get('balance_type', 'main')
    desc = request.data.get('description', 'Выдача средств')
    if not uid or amount <= 0:
        return Response({'detail': 'user_id и amount > 0'}, status=status.HTTP_400_BAD_REQUEST)
    target = User.objects.get(id=uid)
    bal = Transaction.get_balance(uid, bt)
    if amount > bal:
        return Response({'detail': f'Недостаточно ({bal}₽)'}, status=status.HTTP_400_BAD_REQUEST)
    t_type = {'main': 'disbursement', 'premium': 'premium_disbursement', 'vacation': 'vacation_disbursement'}[bt]
    Transaction.objects.create(user=target, transaction_type=t_type, balance_type=bt, amount=-amount, description=desc, created_by=request.user)
    _log(request.user, f'Выдача {amount}₽ ({bt})', f'Пользователь: {target.username}')
    return Response(Transaction.get_all_balances(uid))

@api_view(['POST'])
@perm_classes([IsAuthenticated])
def add_extra_funds(request):
    role = get_role(request.user)
    if role not in DISBURSE_ROLES:
        return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
    uid = request.data.get('user_id')
    amount = Decimal(str(request.data.get('amount', 0)))
    bt = request.data.get('balance_type', 'main')
    desc = request.data.get('description', 'Дополнительное начисление')
    if not uid or amount <= 0:
        return Response({'detail': 'user_id и amount > 0'}, status=status.HTTP_400_BAD_REQUEST)
    target = User.objects.get(id=uid)
    t_type = {'main': 'extra_credit', 'premium': 'extra_premium', 'vacation': 'extra_vacation'}[bt]
    Transaction.objects.create(user=target, transaction_type=t_type, balance_type=bt, amount=amount, description=desc, created_by=request.user)
    _notify(target, 'Начисление средств', f'{amount}₽ на счёт {bt}')
    _log(request.user, f'Начисление {amount}₽ ({bt})', f'Пользователь: {target.username}')
    return Response(Transaction.get_all_balances(uid))

@api_view(['GET'])
@perm_classes([IsAuthenticated])
def users_list(request):
    role = get_role(request.user)
    if role not in (*MANAGE_ROLES, *DISBURSE_ROLES):
        return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
    qs = User.objects.select_related('profile', 'teacher_profile').filter(is_active=True)
    if role == 'senior_admin':
        try:
            cid = request.user.profile.city_id
            if cid: qs = qs.filter(profile__city_id=cid)
        except: pass
    return Response(UserListSerializer(qs, many=True).data)


# ── User Profiles ─────────────────────────────────────────────

@api_view(['GET'])
@perm_classes([IsAuthenticated])
def user_profiles_list(request):
    role = get_role(request.user)
    if role not in PROFILE_ROLES:
        return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
    qs = User.objects.select_related('profile', 'teacher_profile').filter(is_active=True)
    if role == 'senior_admin':
        try:
            cid = request.user.profile.city_id
            if cid: qs = qs.filter(profile__city_id=cid)
        except: pass
    return Response(UserListSerializer(qs, many=True).data)

@api_view(['POST'])
@perm_classes([IsAuthenticated])
def create_user_profile(request):
    role = get_role(request.user)
    if role not in PROFILE_ROLES:
        return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
    username = request.data.get('username')
    password = request.data.get('password')
    full_name = request.data.get('full_name', '')
    target_role = request.data.get('role', 'teacher')
    city_id = request.data.get('city_id')
    branch_id = request.data.get('branch_id')
    if role == 'senior_admin' and target_role not in ('teacher', 'administrator', 'employee'):
        return Response({'detail': 'Вы можете создавать только педагогов, сотрудников и администраторов'}, status=status.HTTP_403_FORBIDDEN)
    if not username or not password:
        return Response({'detail': 'username и password обязательны'}, status=status.HTTP_400_BAD_REQUEST)
    if User.objects.filter(username=username).exists():
        return Response({'detail': 'Логин уже занят'}, status=status.HTTP_400_BAD_REQUEST)
    user = User.objects.create_user(username=username, password=password, first_name=full_name)
    UserProfile.objects.create(user=user, role=target_role, city_id=city_id, branch_id=branch_id)
    if target_role in ('teacher', 'employee'):
        Teacher.objects.create(user=user, full_name=full_name)
    _log(request.user, f'Создание пользователя {username}', f'Роль: {target_role}')
    return Response(UserListSerializer(user).data, status=status.HTTP_201_CREATED)

@api_view(['PATCH'])
@perm_classes([IsAuthenticated])
def update_user_profile(request, user_id):
    role = get_role(request.user)
    if role not in PROFILE_ROLES:
        return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
    target = User.objects.get(id=user_id)
    new_role = request.data.get('role')
    city_id = request.data.get('city_id')
    branch_id = request.data.get('branch_id')
    is_active = request.data.get('is_active')
    profile, _ = UserProfile.objects.get_or_create(user=target)
    if new_role: profile.role = new_role
    if city_id is not None: profile.city_id = city_id if city_id else None
    if branch_id is not None: profile.branch_id = branch_id if branch_id else None
    profile.save()
    if is_active is not None:
        target.is_active = is_active
        target.save()
    _log(request.user, f'Обновление профиля {target.username}')
    return Response(UserListSerializer(target).data)


# ── PayrollSheet ──────────────────────────────────────────────

class PayrollSheetViewSet(viewsets.ModelViewSet):
    queryset = PayrollSheet.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return PayrollSheetListSerializer if self.action == 'list' else PayrollSheetSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = get_role(self.request.user)
        if role in ('teacher', 'employee'):
            try:
                teacher = self.request.user.teacher_profile
                qs = qs.filter(teacher=teacher)
            except: qs = qs.none()
        sf = self.request.query_params.get('status')
        if sf: qs = qs.filter(status=sf)
        return qs

    def perform_create(self, serializer):
        teacher = serializer.validated_data.get('teacher')
        ps = serializer.validated_data.get('period_start')
        pe = serializer.validated_data.get('period_end')
        title = serializer.validated_data.get('title') or ''
        if teacher and not title:
            title = f"РЛ: {teacher.full_name} ({ps} — {pe})"
        serializer.save(created_by=self.request.user, title=title or 'Без названия')

    def update(self, request, *args, **kwargs):
        sheet = self.get_object()
        role = get_role(request.user)
        if role in ('teacher', 'employee') and sheet.status not in ('draft', 'rejected'):
            return Response({'detail': 'Нельзя редактировать'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        sheet = self.get_object()
        if sheet.status != 'draft':
            return Response({'detail': 'Удалять можно только черновики'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        sheet = self.get_object()
        if sheet.status not in ('draft', 'rejected'):
            return Response({'detail': 'Можно отправить только черновик или отклонённый'}, status=status.HTTP_400_BAD_REQUEST)
        sheet.status = 'submitted'
        sheet.rejection_comment = ''
        sheet.total_basic = Decimal(str(request.data.get('total_basic', sheet.total_basic)))
        sheet.total_premium = Decimal(str(request.data.get('total_premium', sheet.total_premium)))
        sheet.total_vacation = Decimal(str(request.data.get('total_vacation', sheet.total_vacation)))
        adv = Decimal(str(request.data.get('advance_amount', sheet.advance_amount)))
        # Аванс может быть любой суммы — одобрение на усмотрение РЛ
        sheet.advance_amount = adv
        sheet.save()
        _log(request.user, f'Отправка РЛ #{sheet.id}')
        return Response({'status': 'submitted'})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        role = get_role(request.user)
        if role not in MANAGE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        sheet = self.get_object()
        if sheet.status != 'submitted':
            return Response({'detail': 'Только отправленный'}, status=status.HTTP_400_BAD_REQUEST)
        sheet.status = 'approved'
        sheet.save()

        if sheet.teacher and sheet.teacher.user:
            u = sheet.teacher.user
            payout = sheet.total_basic - sheet.advance_amount
            if payout > 0:
                Transaction.objects.create(user=u, transaction_type='payroll_credit', balance_type='main', amount=payout, description=f'Ведомость #{sheet.id}', payroll_sheet=sheet, created_by=request.user)
            if sheet.total_premium > 0:
                Transaction.objects.create(user=u, transaction_type='premium_credit', balance_type='premium', amount=sheet.total_premium, description=f'Премия #{sheet.id}', payroll_sheet=sheet, created_by=request.user)
            if sheet.total_vacation > 0:
                Transaction.objects.create(user=u, transaction_type='vacation_credit', balance_type='vacation', amount=sheet.total_vacation, description=f'Отпускные #{sheet.id}', payroll_sheet=sheet, created_by=request.user)

            if sheet.advance_amount > 0:
                Advance.objects.create(teacher=sheet.teacher, advance_type='request', status='approved', amount=sheet.advance_amount, payroll_sheet=sheet, description='Аванс (одобрен)', date=date.today())
                Transaction.objects.create(user=u, transaction_type='advance_given', balance_type='main', amount=sheet.advance_amount, description=f'Аванс #{sheet.id}', payroll_sheet=sheet, created_by=request.user)

            _notify(u, 'Ведомость одобрена', f'Расчётный лист #{sheet.id} одобрен', f'/payroll-sheets/{sheet.id}')

        _log(request.user, f'Одобрение РЛ #{sheet.id}')
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if get_role(request.user) not in MANAGE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        sheet = self.get_object()
        if sheet.status != 'submitted':
            return Response({'detail': 'Только отправленный'}, status=status.HTTP_400_BAD_REQUEST)
        comment = request.data.get('comment', '')
        if not comment:
            return Response({'detail': 'Укажите причину'}, status=status.HTTP_400_BAD_REQUEST)
        sheet.status = 'rejected'
        sheet.rejection_comment = comment
        sheet.save()
        if sheet.teacher and sheet.teacher.user:
            _notify(sheet.teacher.user, 'Ведомость отклонена', comment, f'/payroll-sheets/{sheet.id}')
        _log(request.user, f'Отклонение РЛ #{sheet.id}', comment)
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def request_advance(self, request, pk=None):
        sheet = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        if amount <= 0:
            return Response({'detail': 'Сумма > 0'}, status=status.HTTP_400_BAD_REQUEST)
        # Любая сумма разрешена — решение об одобрении принимают при проверке РЛ
        sheet.advance_amount = amount
        sheet.save()
        return Response({'advance_amount': str(sheet.advance_amount)})

    @action(detail=True, methods=['post'])
    def repay_advance(self, request, pk=None):
        sheet = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        if amount <= 0:
            return Response({'detail': 'Сумма > 0'}, status=status.HTTP_400_BAD_REQUEST)
        if not sheet.teacher_id:
            return Response({'detail': 'Педагог не указан'}, status=status.HTTP_400_BAD_REQUEST)
        debt = Advance.get_teacher_debt(sheet.teacher_id)
        if amount > debt:
            return Response({'detail': f'Не может превышать долг ({debt}₽)'}, status=status.HTTP_400_BAD_REQUEST)
        # Максимум к погашению — не больше долга и не больше заработка по данному РЛ
        max_repay = min(debt, sheet.total_basic)
        if amount > max_repay:
            return Response({'detail': f'Макс. к погашению по этому РЛ: {max_repay}₽'}, status=status.HTTP_400_BAD_REQUEST)
        # Не проверяем баланс — человек сам решает сколько погасить, не обязываем отдавать всё сразу
        Advance.objects.create(teacher=sheet.teacher, advance_type='repayment', status='approved', amount=amount, payroll_sheet=sheet, description='Погашение аванса', date=date.today())
        if sheet.teacher.user:
            Transaction.objects.create(user=sheet.teacher.user, transaction_type='advance_repaid', balance_type='main', amount=-amount, description='Погашение аванса', payroll_sheet=sheet, created_by=request.user)
        return Response({'debt': str(Advance.get_teacher_debt(sheet.teacher_id))})

    @action(detail=True, methods=['get'])
    def export_excel(self, request, pk=None):
        sheet = self.get_object()
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Расчётный лист"
        hf = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        hfn = Font(bold=True, color="FFFFFF", size=11)
        tf = Font(bold=True, size=14)
        bd = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
        ws.merge_cells('A1:F1'); ws['A1'] = sheet.title; ws['A1'].font = tf; ws['A1'].alignment = Alignment(horizontal='center')
        tn = sheet.teacher.full_name if sheet.teacher else '—'
        ws['A2'] = f"Сотрудник: {tn}"; ws['A3'] = f"Период: {sheet.period_start} — {sheet.period_end}"
        row = 5
        if sheet.individual_entries.exists():
            ws.merge_cells(f'A{row}:D{row}'); ws[f'A{row}'] = 'Индивидуальные'; ws[f'A{row}'].font = Font(bold=True, size=12); ws[f'A{row}'].alignment = Alignment(horizontal='center'); row += 1
            for col, h in enumerate(['ФИ ученика', 'Занятий', 'Часов', 'Даты'], 1):
                c = ws.cell(row=row, column=col, value=h); c.fill = hf; c.font = hfn; c.border = bd
            row += 1
            for e in sheet.individual_entries.all():
                ws.cell(row=row, column=1, value=e.student_name).border = bd; ws.cell(row=row, column=2, value=e.lessons_count).border = bd
                ws.cell(row=row, column=3, value=float(e.hours)).border = bd; ws.cell(row=row, column=4, value=e.lesson_dates).border = bd; row += 1
            row += 1
        if sheet.group_entries.exists():
            ws.merge_cells(f'A{row}:F{row}'); ws[f'A{row}'] = 'Групповые'; ws[f'A{row}'].font = Font(bold=True, size=12); ws[f'A{row}'].alignment = Alignment(horizontal='center'); row += 1
            for col, h in enumerate(['Состав', 'Детей', 'Класс', 'Занятий', 'Часов', 'Даты'], 1):
                c = ws.cell(row=row, column=col, value=h); c.fill = hf; c.font = hfn; c.border = bd
            row += 1
            for e in sheet.group_entries.all():
                ws.cell(row=row, column=1, value=e.group_name).border = bd; ws.cell(row=row, column=2, value=e.children_count).border = bd
                ws.cell(row=row, column=3, value='ПКШ' if e.is_pksh else str(e.grade_class)).border = bd
                ws.cell(row=row, column=4, value=e.lessons_count).border = bd; ws.cell(row=row, column=5, value=float(e.hours)).border = bd
                ws.cell(row=row, column=6, value=e.lesson_dates).border = bd; row += 1
        for col, w in enumerate([30, 12, 10, 10, 10, 30], 1): ws.column_dimensions[get_column_letter(col)].width = w
        resp = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        resp['Content-Disposition'] = f'attachment; filename="payroll_{sheet.id}.xlsx"'
        wb.save(resp)
        return resp


# ── Dashboard Stats ───────────────────────────────────────────

@api_view(['GET'])
@perm_classes([IsAuthenticated])
def dashboard_stats(request):
    role = get_role(request.user)
    data = {}

    if role == 'senior_admin':
        try:
            city_id = request.user.profile.city_id
            if city_id:
                branches = Branch.objects.filter(city_id=city_id)
                data['branches'] = [{'id': b.id, 'name': b.name, 'balance': str(b.balance)} for b in branches]
                data['city_name'] = request.user.profile.city.name
        except: pass

    elif role in ('chief_admin', 'moderator'):
        cities = City.objects.all()
        city_data = []
        for c in cities:
            branches = c.branches.all()
            city_data.append({
                'id': c.id, 'name': c.name,
                'total_balance': str(sum(b.balance for b in branches)),
                'branches': [{'id': b.id, 'name': b.name, 'balance': str(b.balance)} for b in branches],
            })
        data['cities'] = city_data

    return Response(data)


# ── Transaction Export ────────────────────────────────────────

@api_view(['GET'])
@perm_classes([IsAuthenticated])
def export_transactions(request):
    role = get_role(request.user)
    qs = Transaction.objects.select_related('user', 'created_by').all()
    if role in ('teacher', 'employee'):
        qs = qs.filter(user=request.user)
    elif role == 'senior_admin':
        try:
            cid = request.user.profile.city_id
            if cid: qs = qs.filter(user__profile__city_id=cid)
        except: pass

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Транзакции"
    headers = ['Дата', 'Пользователь', 'Тип', 'Счёт', 'Сумма', 'Описание']
    hf = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    hfn = Font(bold=True, color="FFFFFF")
    for col, h in enumerate(headers, 1):
        c = ws.cell(row=1, column=col, value=h); c.fill = hf; c.font = hfn
    for i, tx in enumerate(qs[:5000], 2):
        ws.cell(row=i, column=1, value=tx.created_at.strftime('%d.%m.%Y %H:%M'))
        ws.cell(row=i, column=2, value=tx.user.get_full_name() or tx.user.username)
        ws.cell(row=i, column=3, value=tx.get_transaction_type_display())
        ws.cell(row=i, column=4, value=tx.get_balance_type_display())
        ws.cell(row=i, column=5, value=float(tx.amount))
        ws.cell(row=i, column=6, value=tx.description)
    for col, w in enumerate([18, 25, 25, 15, 15, 40], 1):
        ws.column_dimensions[get_column_letter(col)].width = w
    resp = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    resp['Content-Disposition'] = 'attachment; filename="transactions.xlsx"'
    wb.save(resp)
    return resp
