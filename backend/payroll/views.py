from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Q, Sum
from django.http import HttpResponse
from datetime import datetime, timedelta, date
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from decimal import Decimal

from .models import (
    Teacher, Subject, Rate, Bonus,
    PayrollSheet, PayrollEntry,
    IndividualPrice, GroupPrice, PkshPrice,
    IndividualLessonEntry, GroupLessonEntry, Advance
)
from .serializers import (
    TeacherSerializer, SubjectSerializer,
    RateSerializer, BonusSerializer,
    PayrollSheetSerializer, PayrollSheetListSerializer, PayrollEntrySerializer,
    IndividualPriceSerializer, GroupPriceSerializer, PkshPriceSerializer,
    IndividualLessonEntrySerializer, GroupLessonEntrySerializer, AdvanceSerializer
)
from rest_framework import serializers


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)

    def to_representation(self, instance):
        return {
            'id': instance.id,
            'username': instance.username,
            'email': instance.email or '',
            'first_name': instance.first_name or '',
            'last_name': instance.last_name or '',
        }


class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]


class IndividualPriceViewSet(viewsets.ModelViewSet):
    queryset = IndividualPrice.objects.all()
    serializer_class = IndividualPriceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        d = self.request.query_params.get('date')
        if d:
            qs = qs.filter(
                Q(effective_from__lte=d) &
                (Q(effective_to__isnull=True) | Q(effective_to__gte=d))
            )
        return qs

    @action(detail=False, methods=['get'])
    def check_gaps(self, request):
        return _check_price_gaps(IndividualPrice)


class GroupPriceViewSet(viewsets.ModelViewSet):
    queryset = GroupPrice.objects.all()
    serializer_class = GroupPriceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        d = self.request.query_params.get('date')
        grade = self.request.query_params.get('grade')
        if d:
            qs = qs.filter(
                Q(effective_from__lte=d) &
                (Q(effective_to__isnull=True) | Q(effective_to__gte=d))
            )
        if grade:
            qs = qs.filter(class_from__lte=int(grade), class_to__gte=int(grade))
        return qs

    @action(detail=False, methods=['get'])
    def check_gaps(self, request):
        return _check_price_gaps(GroupPrice)


class PkshPriceViewSet(viewsets.ModelViewSet):
    queryset = PkshPrice.objects.all()
    serializer_class = PkshPriceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        d = self.request.query_params.get('date')
        if d:
            qs = qs.filter(
                Q(effective_from__lte=d) &
                (Q(effective_to__isnull=True) | Q(effective_to__gte=d))
            )
        return qs

    @action(detail=False, methods=['get'])
    def check_gaps(self, request):
        return _check_price_gaps(PkshPrice)


def _check_price_gaps(model_class):
    """Найти разрывы между периодами цен."""
    prices = model_class.objects.order_by('effective_from')
    gaps = []
    prev = None
    for p in prices:
        if prev and prev.effective_to:
            next_day = prev.effective_to + timedelta(days=1)
            if next_day < p.effective_from:
                gaps.append({
                    'gap_from': str(next_day),
                    'gap_to': str(p.effective_from - timedelta(days=1)),
                })
        prev = p
    return Response({'gaps': gaps})


class RateViewSet(viewsets.ModelViewSet):
    queryset = Rate.objects.all()
    serializer_class = RateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        subject_id = self.request.query_params.get('subject')
        d = self.request.query_params.get('date')
        rate_kind = self.request.query_params.get('rate_kind')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if d:
            queryset = queryset.filter(
                Q(effective_from__lte=d) &
                (Q(effective_to__isnull=True) | Q(effective_to__gte=d))
            )
        if rate_kind:
            queryset = queryset.filter(rate_kind=rate_kind)
        return queryset


class BonusViewSet(viewsets.ModelViewSet):
    queryset = Bonus.objects.all()
    serializer_class = BonusSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        teacher_id = self.request.query_params.get('teacher')
        period_start = self.request.query_params.get('period_start')
        period_end = self.request.query_params.get('period_end')
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if period_start:
            queryset = queryset.filter(period_end__gte=period_start)
        if period_end:
            queryset = queryset.filter(period_start__lte=period_end)
        return queryset


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

    @action(detail=False, methods=['get'])
    def debt(self, request):
        teacher_id = request.query_params.get('teacher')
        if not teacher_id:
            return Response({'detail': 'teacher param required'}, status=status.HTTP_400_BAD_REQUEST)
        debt = Advance.get_teacher_debt(int(teacher_id))
        return Response({'teacher_id': int(teacher_id), 'debt': str(debt)})


class PayrollSheetViewSet(viewsets.ModelViewSet):
    queryset = PayrollSheet.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PayrollSheetListSerializer
        return PayrollSheetSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        period_start = self.request.query_params.get('period_start')
        period_end = self.request.query_params.get('period_end')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if period_start:
            queryset = queryset.filter(period_end__gte=period_start)
        if period_end:
            queryset = queryset.filter(period_start__lte=period_end)
        return queryset

    def perform_create(self, serializer):
        teacher = serializer.validated_data.get('teacher')
        period_start = serializer.validated_data.get('period_start')
        period_end = serializer.validated_data.get('period_end')
        title = serializer.validated_data.get('title') or ''
        if teacher and not title:
            title = f"Расчётный лист: {teacher.full_name} ({period_start} — {period_end})"
        serializer.save(created_by=self.request.user, title=title or 'Без названия')

    def destroy(self, request, *args, **kwargs):
        sheet = self.get_object()
        if sheet.status != 'draft':
            return Response(
                {'detail': 'Удалять можно только расчётные листы в статусе «Черновик».'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        sheet = self.get_object()
        sheet.status = 'submitted'
        sheet.save()
        return Response({'status': 'submitted'})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        sheet = self.get_object()
        sheet.status = 'approved'
        sheet.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def request_advance(self, request, pk=None):
        """Запросить аванс"""
        sheet = self.get_object()
        amount = request.data.get('amount')
        if not amount or Decimal(str(amount)) <= 0:
            return Response({'detail': 'Укажите сумму аванса'}, status=status.HTTP_400_BAD_REQUEST)
        if not sheet.teacher_id:
            return Response({'detail': 'Педагог не указан'}, status=status.HTTP_400_BAD_REQUEST)
        advance = Advance.objects.create(
            teacher=sheet.teacher,
            advance_type='request',
            amount=Decimal(str(amount)),
            payroll_sheet=sheet,
            description=request.data.get('description', 'Запрос аванса'),
            date=date.today(),
        )
        return Response(AdvanceSerializer(advance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def pay_advance(self, request, pk=None):
        """Выплатить аванс (уменьшить долг)"""
        sheet = self.get_object()
        amount = request.data.get('amount')
        if not amount or Decimal(str(amount)) <= 0:
            return Response({'detail': 'Укажите сумму выплаты'}, status=status.HTTP_400_BAD_REQUEST)
        if not sheet.teacher_id:
            return Response({'detail': 'Педагог не указан'}, status=status.HTTP_400_BAD_REQUEST)
        advance = Advance.objects.create(
            teacher=sheet.teacher,
            advance_type='payment',
            amount=Decimal(str(amount)),
            payroll_sheet=sheet,
            description=request.data.get('description', 'Выплата аванса'),
            date=date.today(),
        )
        return Response(AdvanceSerializer(advance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def export_excel(self, request, pk=None):
        sheet = self.get_object()
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Расчётный лист"

        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF", size=12)
        title_font = Font(bold=True, size=14)
        border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )

        ws.merge_cells('A1:H1')
        ws['A1'] = f"Расчётный лист: {sheet.title}"
        ws['A1'].font = title_font
        ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
        ws['A2'] = f"Период: {sheet.period_start} — {sheet.period_end}"
        teacher_name = sheet.teacher.full_name if sheet.teacher else 'Не указан'
        ws['A3'] = f"Сотрудник: {teacher_name}"
        ws['A4'] = f"Статус: {sheet.get_status_display()}"

        row = 6
        if sheet.individual_entries.exists():
            ws.merge_cells(f'A{row}:D{row}')
            ws[f'A{row}'] = 'Индивидуальные занятия'
            ws[f'A{row}'].font = Font(bold=True, size=12)
            ws[f'A{row}'].alignment = Alignment(horizontal='center')
            row += 1
            for col, header in enumerate(['ФИ ученика', 'Занятий', 'Часов', 'Даты занятий'], 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.fill = header_fill
                cell.font = header_font
                cell.border = border
            row += 1
            for entry in sheet.individual_entries.all():
                ws.cell(row=row, column=1, value=entry.student_name).border = border
                ws.cell(row=row, column=2, value=entry.lessons_count).border = border
                ws.cell(row=row, column=3, value=float(entry.hours)).border = border
                ws.cell(row=row, column=4, value=entry.lesson_dates).border = border
                row += 1
            row += 1

        if sheet.group_entries.exists():
            ws.merge_cells(f'A{row}:F{row}')
            ws[f'A{row}'] = 'Групповые занятия'
            ws[f'A{row}'].font = Font(bold=True, size=12)
            ws[f'A{row}'].alignment = Alignment(horizontal='center')
            row += 1
            for col, header in enumerate(['Состав группы', 'Детей', 'Класс', 'Занятий', 'Часов', 'Даты занятий'], 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.fill = header_fill
                cell.font = header_font
                cell.border = border
            row += 1
            for entry in sheet.group_entries.all():
                prefix = "[ПКШ] " if entry.is_pksh else ""
                ws.cell(row=row, column=1, value=f"{prefix}{entry.group_name}").border = border
                ws.cell(row=row, column=2, value=entry.children_count).border = border
                ws.cell(row=row, column=3, value=entry.grade_class).border = border
                ws.cell(row=row, column=4, value=entry.lessons_count).border = border
                ws.cell(row=row, column=5, value=float(entry.hours)).border = border
                ws.cell(row=row, column=6, value=entry.lesson_dates).border = border
                row += 1

        column_widths = [30, 12, 10, 10, 10, 30, 12, 12]
        for col, width in enumerate(column_widths, 1):
            ws.column_dimensions[get_column_letter(col)].width = width

        http_response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f"payroll_{sheet.id}_{sheet.period_start}_{sheet.period_end}.xlsx"
        http_response['Content-Disposition'] = f'attachment; filename="{filename}"'
        wb.save(http_response)
        return http_response


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_cookie_view(request):
    return Response({'detail': 'CSRF cookie set'})


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return Response(
            {'detail': 'Необходимо указать имя пользователя и пароль'},
            status=status.HTTP_400_BAD_REQUEST
        )
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        serializer = UserSerializer(user)
        return Response({'user': serializer.data})
    else:
        return Response(
            {'detail': 'Неверные учетные данные'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'detail': 'Выход выполнен успешно'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class PayrollEntryViewSet(viewsets.ModelViewSet):
    queryset = PayrollEntry.objects.all()
    serializer_class = PayrollEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        sheet_id = self.request.query_params.get('payroll_sheet')
        teacher_id = self.request.query_params.get('teacher')
        if sheet_id:
            queryset = queryset.filter(payroll_sheet_id=sheet_id)
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        return queryset
