from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


class Subject(models.Model):
    """Предмет"""
    name = models.CharField(max_length=200, unique=True, verbose_name="Название")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Предмет"
        verbose_name_plural = "Предметы"
        ordering = ['name']

    def __str__(self):
        return self.name


class Teacher(models.Model):
    """Преподаватель"""
    full_name = models.CharField(max_length=200, verbose_name="ФИО")
    subjects = models.ManyToManyField(
        Subject,
        blank=True,
        related_name='teachers',
        verbose_name="Предметы"
    )
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Преподаватель"
        verbose_name_plural = "Преподаватели"
        ordering = ['full_name']

    def __str__(self):
        return self.full_name


class IndividualPrice(models.Model):
    """Цена индивидуальных занятий (за одного ученика)"""
    basic_rate = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Основная цена"
    )
    premium_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Премиальные"
    )
    vacation_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Отпускные"
    )
    effective_from = models.DateField(verbose_name="Действует с")
    effective_to = models.DateField(null=True, blank=True, verbose_name="Действует до")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Цена индивидуальных занятий"
        verbose_name_plural = "Цены индивидуальных занятий"
        ordering = ['-effective_from']

    def __str__(self):
        return f"Инд. {self.basic_rate}₽ ({self.effective_from} — {self.effective_to or '...'})"


class GroupPrice(models.Model):
    """Цена групповых занятий (за одного ученика, зависит от диапазона классов)"""
    class_from = models.IntegerField(
        default=1,
        validators=[MinValueValidator(0)],
        verbose_name="Класс от"
    )
    class_to = models.IntegerField(
        default=11,
        validators=[MinValueValidator(0)],
        verbose_name="Класс до"
    )
    basic_rate = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Основная цена"
    )
    premium_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Премиальные"
    )
    vacation_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Отпускные"
    )
    effective_from = models.DateField(verbose_name="Действует с")
    effective_to = models.DateField(null=True, blank=True, verbose_name="Действует до")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Цена групповых занятий"
        verbose_name_plural = "Цены групповых занятий"
        ordering = ['-effective_from', 'class_from']

    def __str__(self):
        return (
            f"Груп. {self.class_from}-{self.class_to} кл. "
            f"{self.basic_rate}₽ ({self.effective_from} — {self.effective_to or '...'})"
        )


class PkshPrice(models.Model):
    """Цена ПКШ (подготовка к школе)"""
    basic_rate = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Основная цена"
    )
    premium_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Премиальные"
    )
    vacation_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Отпускные"
    )
    effective_from = models.DateField(verbose_name="Действует с")
    effective_to = models.DateField(null=True, blank=True, verbose_name="Действует до")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Цена ПКШ"
        verbose_name_plural = "Цены ПКШ"
        ordering = ['-effective_from']

    def __str__(self):
        return f"ПКШ {self.basic_rate}₽ ({self.effective_from} — {self.effective_to or '...'})"


class Rate(models.Model):
    """Тариф (общий для всех): Оплата, Премиальные, Отпускные — устаревшая модель, сохранена для миграций"""
    RATE_KIND_CHOICES = [
        ('payment', 'Оплата'),
        ('bonus', 'Премиальные'),
        ('vacation', 'Отпускные'),
    ]
    RATE_TYPE_CHOICES = [
        ('hour', 'За час'),
        ('group', 'За группу'),
    ]

    rate_kind = models.CharField(max_length=20, choices=RATE_KIND_CHOICES, default='payment', verbose_name="Вид")
    rate_type = models.CharField(max_length=10, choices=RATE_TYPE_CHOICES, null=True, blank=True, verbose_name="Тип")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='rates', verbose_name="Предмет")
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Сумма")
    effective_from = models.DateField(verbose_name="Действует с")
    effective_to = models.DateField(null=True, blank=True, verbose_name="Действует до")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Тариф (устар.)"
        verbose_name_plural = "Тарифы (устар.)"
        ordering = ['-effective_from', 'subject']

    def __str__(self):
        kind = self.get_rate_kind_display()
        extra = f" ({self.get_rate_type_display()})" if self.rate_type else ""
        return f"{self.subject} - {kind}{extra}: {self.amount}"


class Bonus(models.Model):
    """Премиальные"""
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='bonuses', verbose_name="Преподаватель")
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Сумма")
    description = models.TextField(blank=True, verbose_name="Описание")
    period_start = models.DateField(verbose_name="Период с")
    period_end = models.DateField(verbose_name="Период по")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Премиальные"
        verbose_name_plural = "Премиальные"
        ordering = ['-period_start', 'teacher']

    def __str__(self):
        return f"{self.teacher} - {self.amount} ({self.period_start} - {self.period_end})"


class PayrollSheet(models.Model):
    """Расчётный лист"""
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('submitted', 'Отправлен'),
        ('approved', 'Утверждён'),
        ('paid', 'Оплачен'),
    ]

    teacher = models.ForeignKey(
        Teacher, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payroll_sheets', verbose_name="Педагог (ФИО)"
    )
    title = models.CharField(max_length=200, verbose_name="Название")
    period_start = models.DateField(verbose_name="Период с")
    period_end = models.DateField(verbose_name="Период по")
    subjects = models.ManyToManyField(
        Subject, blank=True, related_name='payroll_sheets', verbose_name="Предметы"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="Статус")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='created_payroll_sheets', verbose_name="Создан"
    )
    notes = models.TextField(blank=True, verbose_name="Примечания")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Расчётный лист"
        verbose_name_plural = "Расчётные листы"
        ordering = ['-period_start', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.period_start} - {self.period_end})"

    def get_total_amount(self):
        from django.db.models import Sum
        old_total = self.entries.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        period_date = self.period_start

        individual_price = IndividualPrice.objects.filter(
            effective_from__lte=period_date
        ).filter(
            models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=period_date)
        ).first()
        individual_lessons = self.individual_entries.aggregate(total=Sum('lessons_count'))['total'] or 0
        individual_total = (
            Decimal(individual_lessons) * individual_price.basic_rate
            if individual_price else Decimal('0.00')
        )

        pksh_price = PkshPrice.objects.filter(
            effective_from__lte=period_date
        ).filter(
            models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=period_date)
        ).first()
        group_prices = list(
            GroupPrice.objects.filter(
                effective_from__lte=period_date
            ).filter(
                models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=period_date)
            )
        )
        group_total = Decimal('0.00')
        for entry in self.group_entries.all():
            if entry.is_pksh:
                rate = pksh_price.basic_rate if pksh_price else Decimal('0.00')
            else:
                rate = next(
                    (
                        p.basic_rate for p in group_prices
                        if p.class_from <= entry.grade_class <= p.class_to
                    ),
                    Decimal('0.00')
                )
            group_total += Decimal(entry.children_count) * Decimal(entry.lessons_count) * rate

        return old_total + individual_total + group_total


class PayrollEntry(models.Model):
    """Запись в расчётном листе (устаревшая)"""
    payroll_sheet = models.ForeignKey(PayrollSheet, on_delete=models.CASCADE, related_name='entries', verbose_name="Расчётный лист")
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='payroll_entries', verbose_name="Преподаватель")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='payroll_entries', verbose_name="Предмет")
    date = models.DateField(verbose_name="Дата")
    hours = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Часы")
    rate_per_hour = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Тариф за час")
    rate_per_group = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Тариф за группу")
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Сумма")
    notes = models.TextField(blank=True, verbose_name="Примечания")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Запись в расчётном листе (устар.)"
        verbose_name_plural = "Записи в расчётных листах (устар.)"
        ordering = ['date', 'teacher']

    def __str__(self):
        return f"{self.teacher} - {self.subject} - {self.date}: {self.amount}"


class IndividualLessonEntry(models.Model):
    """Запись индивидуального занятия в расчётном листе"""
    payroll_sheet = models.ForeignKey(
        PayrollSheet, on_delete=models.CASCADE,
        related_name='individual_entries', verbose_name="Расчётный лист"
    )
    student_name = models.CharField(max_length=200, verbose_name="ФИ ученика")
    lessons_count = models.IntegerField(
        default=0, validators=[MinValueValidator(0)],
        verbose_name="Занятий"
    )
    hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Часов"
    )
    lesson_dates = models.TextField(blank=True, verbose_name="Даты занятий")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Индивидуальное занятие"
        verbose_name_plural = "Индивидуальные занятия"
        ordering = ['student_name']

    def __str__(self):
        return f"{self.student_name} — {self.lessons_count} зан."


class GroupLessonEntry(models.Model):
    """Запись группового занятия в расчётном листе"""
    payroll_sheet = models.ForeignKey(
        PayrollSheet, on_delete=models.CASCADE,
        related_name='group_entries', verbose_name="Расчётный лист"
    )
    group_name = models.CharField(max_length=300, verbose_name="Состав группы")
    children_count = models.IntegerField(
        default=0, validators=[MinValueValidator(0)],
        verbose_name="Детей в группе"
    )
    grade_class = models.IntegerField(
        default=1, validators=[MinValueValidator(0)],
        verbose_name="Класс"
    )
    is_pksh = models.BooleanField(default=False, verbose_name="ПКШ (подготовка к школе)")
    lessons_count = models.IntegerField(
        default=0, validators=[MinValueValidator(0)],
        verbose_name="Занятий"
    )
    hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Часов"
    )
    lesson_dates = models.TextField(blank=True, verbose_name="Даты занятий")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Групповое занятие"
        verbose_name_plural = "Групповые занятия"
        ordering = ['group_name']

    def __str__(self):
        prefix = "[ПКШ] " if self.is_pksh else ""
        return f"{prefix}{self.group_name} — {self.children_count} дет., {self.lessons_count} зан."


class Advance(models.Model):
    """Аванс"""
    ADVANCE_TYPE_CHOICES = [
        ('request', 'Запрос аванса'),
        ('payment', 'Выплата аванса'),
    ]

    teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE,
        related_name='advances', verbose_name="Преподаватель"
    )
    advance_type = models.CharField(
        max_length=20, choices=ADVANCE_TYPE_CHOICES,
        verbose_name="Тип операции"
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Сумма"
    )
    payroll_sheet = models.ForeignKey(
        PayrollSheet, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='advances', verbose_name="Расчётный лист"
    )
    description = models.TextField(blank=True, verbose_name="Описание")
    date = models.DateField(verbose_name="Дата")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Аванс"
        verbose_name_plural = "Авансы"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.teacher} — {self.get_advance_type_display()} {self.amount}₽"

    @staticmethod
    def get_teacher_debt(teacher_id):
        """Текущий долг преподавателя (запросы - выплаты)"""
        from django.db.models import Sum, Q
        requested = Advance.objects.filter(
            teacher_id=teacher_id, advance_type='request'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        paid = Advance.objects.filter(
            teacher_id=teacher_id, advance_type='payment'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return requested - paid
