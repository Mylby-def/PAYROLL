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
    City, UserProfile, Teacher, Subject,
    IndividualPrice, GroupPrice, PkshPrice,
    Rate, Bonus, PayrollSheet, PayrollEntry,
    IndividualLessonEntry, GroupLessonEntry, Advance, Transaction
)
from .serializers import (
    CitySerializer, UserSerializer, TeacherSerializer, SubjectSerializer,
    IndividualPriceSerializer, GroupPriceSerializer, PkshPriceSerializer,
    RateSerializer, BonusSerializer,
    PayrollSheetSerializer, PayrollSheetListSerializer, PayrollEntrySerializer,
    IndividualLessonEntrySerializer, GroupLessonEntrySerializer,
    AdvanceSerializer, TransactionSerializer, UserListSerializer
)
from .permissions import get_role, CanManagePrices, CanApproveSheets, CanDisburse, MANAGE_ROLES, DISBURSE_ROLES


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


# ── Cities ────────────────────────────────────────────────────

class CityViewSet(viewsets.ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer
    permission_classes = [IsAuthenticated]


# ── Teachers ──────────────────────────────────────────────────

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]


# ── Subjects ──────────────────────────────────────────────────

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]


# ── Prices ────────────────────────────────────────────────────

def _check_price_gaps(model_class):
    prices = model_class.objects.order_by('effective_from')
    gaps = []
    prev = None
    for p in prices:
        if prev and prev.effective_to:
            next_day = prev.effective_to + timedelta(days=1)
            if next_day < p.effective_from:
                gaps.append({'gap_from': str(next_day), 'gap_to': str(p.effective_from - timedelta(days=1))})
        prev = p
    return Response({'gaps': gaps})


class IndividualPriceViewSet(viewsets.ModelViewSet):
    queryset = IndividualPrice.objects.all()
    serializer_class = IndividualPriceSerializer
    permission_classes = [IsAuthenticated, CanManagePrices]

    def get_queryset(self):
        qs = super().get_queryset()
        d = self.request.query_params.get('date')
        if d:
            qs = qs.filter(Q(effective_from__lte=d) & (Q(effective_to__isnull=True) | Q(effective_to__gte=d)))
        return qs

    @action(detail=False, methods=['get'])
    def check_gaps(self, request):
        return _check_price_gaps(IndividualPrice)


class GroupPriceViewSet(viewsets.ModelViewSet):
    queryset = GroupPrice.objects.all()
    serializer_class = GroupPriceSerializer
    permission_classes = [IsAuthenticated, CanManagePrices]

    def get_queryset(self):
        qs = super().get_queryset()
        d = self.request.query_params.get('date')
        grade = self.request.query_params.get('grade')
        if d:
            qs = qs.filter(Q(effective_from__lte=d) & (Q(effective_to__isnull=True) | Q(effective_to__gte=d)))
        if grade:
            qs = qs.filter(class_from__lte=int(grade), class_to__gte=int(grade))
        return qs

    @action(detail=False, methods=['get'])
    def check_gaps(self, request):
        return _check_price_gaps(GroupPrice)


class PkshPriceViewSet(viewsets.ModelViewSet):
    queryset = PkshPrice.objects.all()
    serializer_class = PkshPriceSerializer
    permission_classes = [IsAuthenticated, CanManagePrices]

    def get_queryset(self):
        qs = super().get_queryset()
        d = self.request.query_params.get('date')
        if d:
            qs = qs.filter(Q(effective_from__lte=d) & (Q(effective_to__isnull=True) | Q(effective_to__gte=d)))
        return qs

    @action(detail=False, methods=['get'])
    def check_gaps(self, request):
        return _check_price_gaps(PkshPrice)


# ── Legacy ────────────────────────────────────────────────────

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
        sheet_id = self.request.query_params.get('payroll_sheet')
        if sheet_id:
            qs = qs.filter(payroll_sheet_id=sheet_id)
        return qs

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
        sheet_id = self.request.query_params.get('payroll_sheet')
        if sheet_id:
            qs = qs.filter(payroll_sheet_id=sheet_id)
        return qs

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
        teacher_id = self.request.query_params.get('teacher')
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        role = get_role(request.user)
        if role not in MANAGE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        adv = self.get_object()
        if adv.status != 'pending':
            return Response({'detail': 'Аванс уже обработан'}, status=status.HTTP_400_BAD_REQUEST)
        adv.status = 'approved'
        adv.save()
        if adv.advance_type == 'request' and adv.teacher and adv.teacher.user:
            Transaction.objects.create(
                user=adv.teacher.user,
                transaction_type='advance_given',
                amount=adv.amount,
                description=f'Аванс одобрен',
                created_by=request.user,
            )
        return Response(AdvanceSerializer(adv).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        role = get_role(request.user)
        if role not in MANAGE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        adv = self.get_object()
        if adv.status != 'pending':
            return Response({'detail': 'Аванс уже обработан'}, status=status.HTTP_400_BAD_REQUEST)
        adv.status = 'rejected'
        adv.save()
        return Response(AdvanceSerializer(adv).data)

    @action(detail=False, methods=['get'])
    def debt(self, request):
        teacher_id = request.query_params.get('teacher')
        if not teacher_id:
            return Response({'detail': 'teacher param required'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'teacher_id': int(teacher_id), 'debt': str(Advance.get_teacher_debt(int(teacher_id)))})


# ── Transactions / Balance ────────────────────────────────────

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        role = get_role(self.request.user)
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        elif role == 'teacher':
            qs = qs.filter(user=self.request.user)
        return qs


@api_view(['POST'])
@perm_classes([IsAuthenticated])
def disburse_funds(request):
    role = get_role(request.user)
    if role not in DISBURSE_ROLES:
        return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
    user_id = request.data.get('user_id')
    amount = request.data.get('amount')
    description = request.data.get('description', 'Выдача средств')
    if not user_id or not amount:
        return Response({'detail': 'user_id и amount обязательны'}, status=status.HTTP_400_BAD_REQUEST)
    amount = Decimal(str(amount))
    if amount <= 0:
        return Response({'detail': 'Сумма должна быть больше 0'}, status=status.HTTP_400_BAD_REQUEST)
    target_user = User.objects.get(id=user_id)
    balance = Transaction.get_balance(user_id)
    if amount > balance:
        return Response({'detail': f'Недостаточно средств на счету ({balance}₽)'}, status=status.HTTP_400_BAD_REQUEST)

    if role == 'senior_admin':
        try:
            my_city = request.user.profile.city_id
            target_city = target_user.profile.city_id
            if my_city and target_city and my_city != target_city:
                return Response({'detail': 'Вы можете выдавать средства только пользователям вашего города'}, status=status.HTTP_403_FORBIDDEN)
        except UserProfile.DoesNotExist:
            pass

    Transaction.objects.create(
        user=target_user,
        transaction_type='disbursement',
        amount=-amount,
        description=description,
        created_by=request.user,
    )
    return Response({'balance': str(Transaction.get_balance(user_id))})


@api_view(['POST'])
@perm_classes([IsAuthenticated])
def add_extra_funds(request):
    role = get_role(request.user)
    if role not in DISBURSE_ROLES:
        return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
    user_id = request.data.get('user_id')
    amount = request.data.get('amount')
    description = request.data.get('description', 'Дополнительное начисление')
    if not user_id or not amount:
        return Response({'detail': 'user_id и amount обязательны'}, status=status.HTTP_400_BAD_REQUEST)
    amount = Decimal(str(amount))
    if amount <= 0:
        return Response({'detail': 'Сумма должна быть больше 0'}, status=status.HTTP_400_BAD_REQUEST)
    target_user = User.objects.get(id=user_id)

    if role == 'senior_admin':
        try:
            my_city = request.user.profile.city_id
            target_city = target_user.profile.city_id
            if my_city and target_city and my_city != target_city:
                return Response({'detail': 'Нет прав для этого города'}, status=status.HTTP_403_FORBIDDEN)
        except UserProfile.DoesNotExist:
            pass

    Transaction.objects.create(
        user=target_user,
        transaction_type='extra_credit',
        amount=amount,
        description=description,
        created_by=request.user,
    )
    return Response({'balance': str(Transaction.get_balance(user_id))})


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def users_list(request):
    role = get_role(request.user)
    if role not in (*MANAGE_ROLES, *DISBURSE_ROLES):
        return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)

    qs = User.objects.select_related('profile', 'teacher_profile').filter(is_active=True)

    if role == 'senior_admin':
        try:
            city_id = request.user.profile.city_id
            if city_id:
                qs = qs.filter(profile__city_id=city_id)
        except UserProfile.DoesNotExist:
            pass

    return Response(UserListSerializer(qs, many=True).data)


# ── PayrollSheet ──────────────────────────────────────────────

class PayrollSheetViewSet(viewsets.ModelViewSet):
    queryset = PayrollSheet.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PayrollSheetListSerializer
        return PayrollSheetSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        role = get_role(self.request.user)
        if role == 'teacher':
            try:
                teacher = self.request.user.teacher_profile
                qs = qs.filter(teacher=teacher)
            except Teacher.DoesNotExist:
                qs = qs.none()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        teacher = serializer.validated_data.get('teacher')
        period_start = serializer.validated_data.get('period_start')
        period_end = serializer.validated_data.get('period_end')
        title = serializer.validated_data.get('title') or ''
        if teacher and not title:
            title = f"РЛ: {teacher.full_name} ({period_start} — {period_end})"
        serializer.save(created_by=self.request.user, title=title or 'Без названия')

    def destroy(self, request, *args, **kwargs):
        sheet = self.get_object()
        if sheet.status != 'draft':
            return Response({'detail': 'Удалять можно только черновики'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        sheet = self.get_object()
        if sheet.status not in ('draft', 'rejected'):
            return Response({'detail': 'Можно отправить только черновик или отклонённый лист'}, status=status.HTTP_400_BAD_REQUEST)
        sheet.status = 'submitted'
        sheet.rejection_comment = ''
        total_basic = Decimal(str(request.data.get('total_basic', sheet.total_basic)))
        total_premium = Decimal(str(request.data.get('total_premium', sheet.total_premium)))
        total_vacation = Decimal(str(request.data.get('total_vacation', sheet.total_vacation)))
        advance_amount = Decimal(str(request.data.get('advance_amount', sheet.advance_amount)))
        sheet.total_basic = total_basic
        sheet.total_premium = total_premium
        sheet.total_vacation = total_vacation
        sheet.advance_amount = advance_amount
        sheet.save()
        return Response({'status': 'submitted'})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        role = get_role(request.user)
        if role not in MANAGE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        sheet = self.get_object()
        if sheet.status != 'submitted':
            return Response({'detail': 'Можно одобрить только отправленный лист'}, status=status.HTTP_400_BAD_REQUEST)
        sheet.status = 'approved'
        sheet.save()

        if sheet.teacher and sheet.teacher.user:
            total_credit = sheet.total_basic
            if total_credit > 0:
                Transaction.objects.create(
                    user=sheet.teacher.user,
                    transaction_type='payroll_credit',
                    amount=total_credit,
                    description=f'Ведомость #{sheet.id} одобрена',
                    payroll_sheet=sheet,
                    created_by=request.user,
                )

        if sheet.advance_amount > 0 and sheet.teacher:
            adv = Advance.objects.create(
                teacher=sheet.teacher,
                advance_type='request',
                status='approved',
                amount=sheet.advance_amount,
                payroll_sheet=sheet,
                description='Аванс по ведомости (одобрен)',
                date=date.today(),
            )
            if sheet.teacher.user:
                Transaction.objects.create(
                    user=sheet.teacher.user,
                    transaction_type='advance_given',
                    amount=sheet.advance_amount,
                    description=f'Аванс по ведомости #{sheet.id}',
                    payroll_sheet=sheet,
                    created_by=request.user,
                )

        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        role = get_role(request.user)
        if role not in MANAGE_ROLES:
            return Response({'detail': 'Нет прав'}, status=status.HTTP_403_FORBIDDEN)
        sheet = self.get_object()
        if sheet.status != 'submitted':
            return Response({'detail': 'Можно отклонить только отправленный лист'}, status=status.HTTP_400_BAD_REQUEST)
        comment = request.data.get('comment', '')
        if not comment:
            return Response({'detail': 'Укажите причину отклонения'}, status=status.HTTP_400_BAD_REQUEST)
        sheet.status = 'rejected'
        sheet.rejection_comment = comment
        sheet.save()
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'])
    def request_advance(self, request, pk=None):
        sheet = self.get_object()
        amount = request.data.get('amount')
        if not amount or Decimal(str(amount)) <= 0:
            return Response({'detail': 'Укажите сумму'}, status=status.HTTP_400_BAD_REQUEST)
        if not sheet.teacher_id:
            return Response({'detail': 'Педагог не указан'}, status=status.HTTP_400_BAD_REQUEST)
        sheet.advance_amount = Decimal(str(amount))
        sheet.save()
        return Response({'advance_amount': str(sheet.advance_amount)})

    @action(detail=True, methods=['post'])
    def repay_advance(self, request, pk=None):
        sheet = self.get_object()
        amount = request.data.get('amount')
        if not amount or Decimal(str(amount)) <= 0:
            return Response({'detail': 'Укажите сумму'}, status=status.HTTP_400_BAD_REQUEST)
        if not sheet.teacher_id:
            return Response({'detail': 'Педагог не указан'}, status=status.HTTP_400_BAD_REQUEST)
        amount = Decimal(str(amount))
        debt = Advance.get_teacher_debt(sheet.teacher_id)
        if amount > debt:
            return Response({'detail': f'Сумма погашения не может превышать долг ({debt}₽)'}, status=status.HTTP_400_BAD_REQUEST)
        Advance.objects.create(
            teacher=sheet.teacher,
            advance_type='repayment',
            status='approved',
            amount=amount,
            payroll_sheet=sheet,
            description='Погашение аванса',
            date=date.today(),
        )
        if sheet.teacher.user:
            Transaction.objects.create(
                user=sheet.teacher.user,
                transaction_type='advance_repaid',
                amount=-amount,
                description=f'Погашение аванса по ведомости #{sheet.id}',
                payroll_sheet=sheet,
                created_by=request.user,
            )
        return Response({'debt': str(Advance.get_teacher_debt(sheet.teacher_id))})

    @action(detail=True, methods=['get'])
    def export_excel(self, request, pk=None):
        sheet = self.get_object()
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Расчётный лист"
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF", size=11)
        title_font = Font(bold=True, size=14)
        border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

        ws.merge_cells('A1:F1')
        ws['A1'] = sheet.title
        ws['A1'].font = title_font
        ws['A1'].alignment = Alignment(horizontal='center')
        teacher_name = sheet.teacher.full_name if sheet.teacher else 'Не указан'
        ws['A2'] = f"Сотрудник: {teacher_name}"
        ws['A3'] = f"Период: {sheet.period_start} — {sheet.period_end}"
        row = 5

        if sheet.individual_entries.exists():
            ws.merge_cells(f'A{row}:D{row}')
            ws[f'A{row}'] = 'Индивидуальные занятия'
            ws[f'A{row}'].font = Font(bold=True, size=12)
            ws[f'A{row}'].alignment = Alignment(horizontal='center')
            row += 1
            for col, h in enumerate(['ФИ ученика', 'Занятий', 'Часов', 'Даты'], 1):
                cell = ws.cell(row=row, column=col, value=h)
                cell.fill = header_fill
                cell.font = header_font
                cell.border = border
            row += 1
            for e in sheet.individual_entries.all():
                ws.cell(row=row, column=1, value=e.student_name).border = border
                ws.cell(row=row, column=2, value=e.lessons_count).border = border
                ws.cell(row=row, column=3, value=float(e.hours)).border = border
                ws.cell(row=row, column=4, value=e.lesson_dates).border = border
                row += 1
            row += 1

        if sheet.group_entries.exists():
            ws.merge_cells(f'A{row}:F{row}')
            ws[f'A{row}'] = 'Групповые занятия'
            ws[f'A{row}'].font = Font(bold=True, size=12)
            ws[f'A{row}'].alignment = Alignment(horizontal='center')
            row += 1
            for col, h in enumerate(['Состав', 'Детей', 'Класс', 'Занятий', 'Часов', 'Даты'], 1):
                cell = ws.cell(row=row, column=col, value=h)
                cell.fill = header_fill
                cell.font = header_font
                cell.border = border
            row += 1
            for e in sheet.group_entries.all():
                ws.cell(row=row, column=1, value=e.group_name).border = border
                ws.cell(row=row, column=2, value=e.children_count).border = border
                ws.cell(row=row, column=3, value='ПКШ' if e.is_pksh else str(e.grade_class)).border = border
                ws.cell(row=row, column=4, value=e.lessons_count).border = border
                ws.cell(row=row, column=5, value=float(e.hours)).border = border
                ws.cell(row=row, column=6, value=e.lesson_dates).border = border
                row += 1

        for col, w in enumerate([30, 12, 10, 10, 10, 30], 1):
            ws.column_dimensions[get_column_letter(col)].width = w

        resp = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        resp['Content-Disposition'] = f'attachment; filename="payroll_{sheet.id}.xlsx"'
        wb.save(resp)
        return resp
