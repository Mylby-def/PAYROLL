from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


ROLE_CHOICES = [
    ('teacher', 'Педагог'),
    ('administrator', 'Администратор'),
    ('accountant', 'Бухгалтер'),
    ('senior_admin', 'Старший администратор'),
    ('chief_admin', 'Главный администратор'),
    ('moderator', 'Модератор'),
]


class City(models.Model):
    name = models.CharField(max_length=200, unique=True, verbose_name="Название")

    class Meta:
        verbose_name = "Город"
        verbose_name_plural = "Города"
        ordering = ['name']

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='teacher', verbose_name="Роль")
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True, related_name='users', verbose_name="Город")

    class Meta:
        verbose_name = "Профиль пользователя"
        verbose_name_plural = "Профили пользователей"

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class Subject(models.Model):
    name = models.CharField(max_length=200, unique=True, verbose_name="Название")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Предмет"
        verbose_name_plural = "Предметы"
        ordering = ['name']

    def __str__(self):
        return self.name


class Teacher(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile', null=True, blank=True)
    full_name = models.CharField(max_length=200, verbose_name="ФИО")
    subjects = models.ManyToManyField(Subject, blank=True, related_name='teachers', verbose_name="Предметы")
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
    basic_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Основная цена")
    premium_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Премиальные")
    vacation_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Отпускные")
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
    class_from = models.IntegerField(default=1, validators=[MinValueValidator(0)], verbose_name="Класс от")
    class_to = models.IntegerField(default=11, validators=[MinValueValidator(0)], verbose_name="Класс до")
    basic_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Основная цена")
    premium_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Премиальные")
    vacation_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Отпускные")
    effective_from = models.DateField(verbose_name="Действует с")
    effective_to = models.DateField(null=True, blank=True, verbose_name="Действует до")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Цена групповых занятий"
        verbose_name_plural = "Цены групповых занятий"
        ordering = ['-effective_from', 'class_from']

    def __str__(self):
        return f"Груп. {self.class_from}-{self.class_to} кл. {self.basic_rate}₽"


class PkshPrice(models.Model):
    basic_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Основная цена")
    premium_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Премиальные")
    vacation_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Отпускные")
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
    RATE_KIND_CHOICES = [('payment', 'Оплата'), ('bonus', 'Премиальные'), ('vacation', 'Отпускные')]
    RATE_TYPE_CHOICES = [('hour', 'За час'), ('group', 'За группу')]
    rate_kind = models.CharField(max_length=20, choices=RATE_KIND_CHOICES, default='payment')
    rate_type = models.CharField(max_length=10, choices=RATE_TYPE_CHOICES, null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='rates')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Тариф (устар.)"
        verbose_name_plural = "Тарифы (устар.)"
        ordering = ['-effective_from']

    def __str__(self):
        return f"{self.subject} — {self.amount}"


class Bonus(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='bonuses')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField(blank=True)
    period_start = models.DateField()
    period_end = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Премиальные"
        verbose_name_plural = "Премиальные"
        ordering = ['-period_start']

    def __str__(self):
        return f"{self.teacher} — {self.amount}"


class PayrollSheet(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('submitted', 'Отправлен'),
        ('approved', 'Утверждён'),
        ('rejected', 'Отклонён'),
        ('paid', 'Оплачен'),
    ]

    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='payroll_sheets', verbose_name="Педагог")
    title = models.CharField(max_length=200, verbose_name="Название")
    period_start = models.DateField(verbose_name="Период с")
    period_end = models.DateField(verbose_name="Период по")
    subjects = models.ManyToManyField(Subject, blank=True, related_name='payroll_sheets')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    rejection_comment = models.TextField(blank=True, verbose_name="Причина отклонения")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_payroll_sheets')
    notes = models.TextField(blank=True)
    total_basic = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Основные")
    total_premium = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Премиальные")
    total_vacation = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Отпускные")
    advance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Сумма аванса")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Расчётный лист"
        verbose_name_plural = "Расчётные листы"
        ordering = ['-period_start', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.period_start} — {self.period_end})"

    def get_total_amount(self):
        return self.total_basic


class PayrollEntry(models.Model):
    payroll_sheet = models.ForeignKey(PayrollSheet, on_delete=models.CASCADE, related_name='entries')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='payroll_entries')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='payroll_entries')
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    rate_per_hour = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rate_per_group = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Запись (устар.)"
        verbose_name_plural = "Записи (устар.)"
        ordering = ['date']

    def __str__(self):
        return f"{self.teacher} — {self.date}: {self.amount}"


class IndividualLessonEntry(models.Model):
    payroll_sheet = models.ForeignKey(PayrollSheet, on_delete=models.CASCADE, related_name='individual_entries')
    student_name = models.CharField(max_length=200, verbose_name="ФИ ученика")
    lessons_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    lesson_dates = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Индивидуальное занятие"
        verbose_name_plural = "Индивидуальные занятия"
        ordering = ['student_name']

    def __str__(self):
        return f"{self.student_name} — {self.lessons_count} зан."


class GroupLessonEntry(models.Model):
    """grade_class=0 означает ПКШ"""
    payroll_sheet = models.ForeignKey(PayrollSheet, on_delete=models.CASCADE, related_name='group_entries')
    group_name = models.CharField(max_length=300, verbose_name="Состав группы")
    children_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    grade_class = models.IntegerField(default=1, validators=[MinValueValidator(0)], verbose_name="Класс (0=ПКШ)")
    lessons_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'), validators=[MinValueValidator(Decimal('0.00'))])
    lesson_dates = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Групповое занятие"
        verbose_name_plural = "Групповые занятия"
        ordering = ['group_name']

    @property
    def is_pksh(self):
        return self.grade_class == 0

    def __str__(self):
        prefix = "[ПКШ] " if self.is_pksh else ""
        return f"{prefix}{self.group_name} — {self.children_count} дет."


class Advance(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ожидает одобрения'),
        ('approved', 'Одобрен'),
        ('rejected', 'Отклонён'),
    ]
    TYPE_CHOICES = [
        ('request', 'Запрос аванса'),
        ('repayment', 'Погашение аванса'),
    ]

    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='advances')
    advance_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    payroll_sheet = models.ForeignKey(PayrollSheet, on_delete=models.SET_NULL, null=True, blank=True, related_name='advances')
    description = models.TextField(blank=True)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Аванс"
        verbose_name_plural = "Авансы"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.teacher} — {self.get_advance_type_display()} {self.amount}₽ ({self.get_status_display()})"

    @staticmethod
    def get_teacher_debt(teacher_id):
        from django.db.models import Sum
        approved_requests = Advance.objects.filter(
            teacher_id=teacher_id, advance_type='request', status='approved'
        ).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')
        repayments = Advance.objects.filter(
            teacher_id=teacher_id, advance_type='repayment', status='approved'
        ).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')
        return approved_requests - repayments


class Transaction(models.Model):
    TYPE_CHOICES = [
        ('payroll_credit', 'Начисление по ведомости'),
        ('disbursement', 'Выдача средств'),
        ('extra_credit', 'Дополнительное начисление'),
        ('advance_given', 'Аванс выдан'),
        ('advance_repaid', 'Аванс погашен'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Сумма")
    description = models.TextField(blank=True)
    payroll_sheet = models.ForeignKey(PayrollSheet, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_transactions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Транзакция"
        verbose_name_plural = "Транзакции"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.get_transaction_type_display()} {self.amount}₽"

    @staticmethod
    def get_balance(user_id):
        from django.db.models import Sum
        return Transaction.objects.filter(user_id=user_id).aggregate(
            t=Sum('amount')
        )['t'] or Decimal('0.00')
