from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


ROLE_CHOICES = [
    ('teacher', 'Педагог'),
    ('employee', 'Сотрудник'),
    ('administrator', 'Администратор'),
    ('accountant', 'Бухгалтер'),
    ('senior_admin', 'Старший администратор'),
    ('chief_admin', 'Главный администратор'),
    ('moderator', 'Модератор'),
]

CAN_SUBMIT_SHEETS = ('teacher', 'employee', 'moderator')


class City(models.Model):
    name = models.CharField(max_length=200, unique=True, verbose_name="Название")

    class Meta:
        verbose_name = "Город"
        verbose_name_plural = "Города"
        ordering = ['name']

    def __str__(self):
        return self.name


class Branch(models.Model):
    name = models.CharField(max_length=200, verbose_name="Название филиала")
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='branches', verbose_name="Город")
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name="Баланс")

    class Meta:
        verbose_name = "Филиал"
        verbose_name_plural = "Филиалы"
        ordering = ['city', 'name']

    def __str__(self):
        return f"{self.name} ({self.city.name})"


class BranchTransaction(models.Model):
    TYPE_CHOICES = [
        ('deposit', 'Внесение'),
        ('withdrawal', 'Снятие'),
    ]
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Транзакция филиала"
        verbose_name_plural = "Транзакции филиалов"
        ordering = ['-created_at']


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='teacher', verbose_name="Роль")
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True, related_name='users', verbose_name="Город")
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='users', verbose_name="Филиал")
    totp_secret = models.CharField(max_length=64, blank=True, verbose_name="2FA секрет")
    totp_enabled = models.BooleanField(default=False, verbose_name="2FA включена")

    class Meta:
        verbose_name = "Профиль пользователя"
        verbose_name_plural = "Профили пользователей"

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=300)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}: {self.title}"


class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='activity_logs')
    action = models.CharField(max_length=300)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


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
    basic_rate = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    premium_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    vacation_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-effective_from']

    def __str__(self):
        return f"Инд. {self.basic_rate}₽"


class GroupPrice(models.Model):
    class_from = models.IntegerField(default=1)
    class_to = models.IntegerField(default=11)
    basic_rate = models.DecimalField(max_digits=10, decimal_places=2)
    premium_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    vacation_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-effective_from', 'class_from']


class PkshPrice(models.Model):
    basic_rate = models.DecimalField(max_digits=10, decimal_places=2)
    premium_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    vacation_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-effective_from']


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
        ordering = ['-effective_from']


class Bonus(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='bonuses')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField(blank=True)
    period_start = models.DateField()
    period_end = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-period_start']


class PayrollSheet(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('submitted', 'Отправлен'),
        ('approved', 'Утверждён'),
        ('rejected', 'Отклонён'),
        ('paid', 'Оплачен'),
    ]

    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='payroll_sheets')
    title = models.CharField(max_length=200)
    period_start = models.DateField()
    period_end = models.DateField()
    subjects = models.ManyToManyField(Subject, blank=True, related_name='payroll_sheets')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    rejection_comment = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_payroll_sheets')
    notes = models.TextField(blank=True)
    total_basic = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_premium = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_vacation = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    advance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
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
        ordering = ['date']


class IndividualLessonEntry(models.Model):
    payroll_sheet = models.ForeignKey(PayrollSheet, on_delete=models.CASCADE, related_name='individual_entries')
    student_name = models.CharField(max_length=200)
    lessons_count = models.IntegerField(default=0)
    hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    lesson_dates = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['student_name']


class GroupLessonEntry(models.Model):
    """grade_class=0 = ПКШ"""
    payroll_sheet = models.ForeignKey(PayrollSheet, on_delete=models.CASCADE, related_name='group_entries')
    group_name = models.CharField(max_length=300)
    children_count = models.IntegerField(default=0)
    grade_class = models.IntegerField(default=1)
    lessons_count = models.IntegerField(default=0)
    hours = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    lesson_dates = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['group_name']

    @property
    def is_pksh(self):
        return self.grade_class == 0


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
        ordering = ['-date', '-created_at']

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
        ('premium_credit', 'Начисление премиальных'),
        ('vacation_credit', 'Начисление отпускных'),
        ('disbursement', 'Выдача средств'),
        ('premium_disbursement', 'Выдача премиальных'),
        ('vacation_disbursement', 'Выдача отпускных'),
        ('extra_credit', 'Дополнительное начисление'),
        ('extra_premium', 'Дополнительные премиальные'),
        ('extra_vacation', 'Дополнительные отпускные'),
        ('advance_given', 'Аванс выдан'),
        ('advance_repaid', 'Аванс погашен'),
        ('expense', 'Расход'),
        ('income', 'Доход'),
    ]
    BALANCE_TYPE_CHOICES = [
        ('main', 'Основной'),
        ('premium', 'Премиальные'),
        ('vacation', 'Отпускные'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    balance_type = models.CharField(max_length=20, choices=BALANCE_TYPE_CHOICES, default='main')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    payroll_sheet = models.ForeignKey(PayrollSheet, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_transactions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @staticmethod
    def get_balance(user_id, balance_type='main'):
        from django.db.models import Sum
        return Transaction.objects.filter(
            user_id=user_id, balance_type=balance_type
        ).aggregate(t=Sum('amount'))['t'] or Decimal('0.00')

    @staticmethod
    def get_all_balances(user_id):
        return {
            'main': str(Transaction.get_balance(user_id, 'main')),
            'premium': str(Transaction.get_balance(user_id, 'premium')),
            'vacation': str(Transaction.get_balance(user_id, 'vacation')),
        }
