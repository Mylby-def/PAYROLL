from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


class Teacher(models.Model):
    """Преподаватель"""
    full_name = models.CharField(max_length=200, verbose_name="ФИО")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, verbose_name="Активен")

    class Meta:
        verbose_name = "Преподаватель"
        verbose_name_plural = "Преподаватели"
        ordering = ['full_name']

    def __str__(self):
        return self.full_name


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


class Rate(models.Model):
    """Тариф (общий для всех): Оплата, Премиальные, Отпускные"""
    RATE_KIND_CHOICES = [
        ('payment', 'Оплата'),
        ('bonus', 'Премиальные'),
        ('vacation', 'Отпускные'),
    ]
    RATE_TYPE_CHOICES = [
        ('hour', 'За час'),
        ('group', 'За группу'),
    ]

    rate_kind = models.CharField(
        max_length=20,
        choices=RATE_KIND_CHOICES,
        default='payment',
        verbose_name="Вид"
    )
    rate_type = models.CharField(
        max_length=10,
        choices=RATE_TYPE_CHOICES,
        null=True,
        blank=True,
        verbose_name="Тип (только для Оплаты)"
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='rates',
        verbose_name="Предмет"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Сумма"
    )
    effective_from = models.DateField(verbose_name="Действует с")
    effective_to = models.DateField(null=True, blank=True, verbose_name="Действует до")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Тариф"
        verbose_name_plural = "Тарифы"
        ordering = ['-effective_from', 'subject']

    def __str__(self):
        kind = self.get_rate_kind_display()
        extra = f" ({self.get_rate_type_display()})" if self.rate_type else ""
        return f"{self.subject} - {kind}{extra}: {self.amount}"


class Bonus(models.Model):
    """Премиальные"""
    teacher = models.ForeignKey(
        Teacher, 
        on_delete=models.CASCADE, 
        related_name='bonuses',
        verbose_name="Преподаватель"
    )
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Сумма"
    )
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
        Teacher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payroll_sheets',
        verbose_name="Педагог (ФИО)"
    )
    title = models.CharField(max_length=200, verbose_name="Название")
    period_start = models.DateField(verbose_name="Период с")
    period_end = models.DateField(verbose_name="Период по")
    subjects = models.ManyToManyField(
        Subject,
        blank=True,
        related_name='payroll_sheets',
        verbose_name="Предметы по листу"
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='draft',
        verbose_name="Статус"
    )
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_payroll_sheets',
        verbose_name="Создан"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, verbose_name="Примечания")

    class Meta:
        verbose_name = "Расчётный лист"
        verbose_name_plural = "Расчётные листы"
        ordering = ['-period_start', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.period_start} - {self.period_end})"

    def get_total_amount(self):
        """Общая сумма расчётного листа"""
        from django.db.models import Sum
        result = self.entries.aggregate(total=Sum('amount'))
        return result['total'] or Decimal('0.00')


class PayrollEntry(models.Model):
    """Запись в расчётном листе"""
    payroll_sheet = models.ForeignKey(
        PayrollSheet, 
        on_delete=models.CASCADE, 
        related_name='entries',
        verbose_name="Расчётный лист"
    )
    teacher = models.ForeignKey(
        Teacher, 
        on_delete=models.CASCADE, 
        related_name='payroll_entries',
        verbose_name="Преподаватель"
    )
    subject = models.ForeignKey(
        Subject, 
        on_delete=models.CASCADE, 
        related_name='payroll_entries',
        verbose_name="Предмет"
    )
    date = models.DateField(verbose_name="Дата")
    hours = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Часы"
    )
    rate_per_hour = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Тариф за час"
    )
    rate_per_group = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Тариф за группу"
    )
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Сумма"
    )
    notes = models.TextField(blank=True, verbose_name="Примечания")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Запись в расчётном листе"
        verbose_name_plural = "Записи в расчётных листах"
        ordering = ['date', 'teacher']

    def __str__(self):
        return f"{self.teacher} - {self.subject} - {self.date}: {self.amount}"
