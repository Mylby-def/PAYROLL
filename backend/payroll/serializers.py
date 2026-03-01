from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    City, Branch, BranchTransaction, UserProfile, Teacher, Subject,
    IndividualPrice, GroupPrice, PkshPrice, Rate, Bonus,
    PayrollSheet, PayrollEntry, IndividualLessonEntry, GroupLessonEntry,
    Advance, Transaction, Notification, ActivityLog, ROLE_CHOICES
)


class CitySerializer(serializers.ModelSerializer):
    branch_count = serializers.SerializerMethodField()
    class Meta:
        model = City
        fields = ['id', 'name', 'branch_count']
    def get_branch_count(self, obj):
        return obj.branches.count()


class BranchSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source='city.name', read_only=True)
    class Meta:
        model = Branch
        fields = '__all__'


class BranchTransactionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    class Meta:
        model = BranchTransaction
        fields = '__all__'
    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    class Meta:
        model = ActivityLog
        fields = '__all__'
    def get_user_name(self, obj):
        return obj.user.username if obj.user else None


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    city_id = serializers.SerializerMethodField()
    branch_id = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    balance_premium = serializers.SerializerMethodField()
    balance_vacation = serializers.SerializerMethodField()
    teacher_id = serializers.SerializerMethodField()
    unread_notifications = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'city', 'city_id', 'branch_id',
                  'balance', 'balance_premium', 'balance_vacation',
                  'teacher_id', 'unread_notifications']

    def get_role(self, obj):
        try: return obj.profile.role
        except: return 'teacher'
    def get_city(self, obj):
        try: return obj.profile.city.name if obj.profile.city else None
        except: return None
    def get_city_id(self, obj):
        try: return obj.profile.city_id
        except: return None
    def get_branch_id(self, obj):
        try: return obj.profile.branch_id
        except: return None
    def get_balance(self, obj):
        return str(Transaction.get_balance(obj.id, 'main'))
    def get_balance_premium(self, obj):
        return str(Transaction.get_balance(obj.id, 'premium'))
    def get_balance_vacation(self, obj):
        return str(Transaction.get_balance(obj.id, 'vacation'))
    def get_teacher_id(self, obj):
        try: return obj.teacher_profile.id
        except: return None
    def get_unread_notifications(self, obj):
        return obj.notifications.filter(is_read=False).count()


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


class TeacherSerializer(serializers.ModelSerializer):
    subject_ids = serializers.PrimaryKeyRelatedField(many=True, queryset=Subject.objects.all(), source='subjects', required=False)
    subject_names = serializers.SerializerMethodField()
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    city_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Teacher
        fields = ['id', 'full_name', 'is_active', 'subject_ids', 'subject_names',
                  'username', 'password', 'user_id', 'city_id', 'created_at', 'updated_at']

    def get_subject_names(self, obj):
        return list(obj.subjects.values_list('name', flat=True))

    def create(self, validated_data):
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)
        city_id = validated_data.pop('city_id', None)
        subjects = validated_data.pop('subjects', [])
        user = None
        if username and password:
            user = User.objects.create_user(username=username, password=password, first_name=validated_data.get('full_name', ''))
            UserProfile.objects.create(user=user, role='teacher', city_id=city_id)
        teacher = Teacher.objects.create(user=user, **validated_data)
        if subjects:
            teacher.subjects.set(subjects)
        return teacher

    def update(self, instance, validated_data):
        validated_data.pop('username', None)
        validated_data.pop('password', None)
        validated_data.pop('city_id', None)
        subjects = validated_data.pop('subjects', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if subjects is not None:
            instance.subjects.set(subjects)
        return instance


class IndividualPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndividualPrice
        fields = '__all__'

class GroupPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPrice
        fields = '__all__'

class PkshPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PkshPrice
        fields = '__all__'

class RateSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class Meta:
        model = Rate
        fields = '__all__'

class BonusSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    class Meta:
        model = Bonus
        fields = '__all__'

class IndividualLessonEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = IndividualLessonEntry
        fields = '__all__'

class GroupLessonEntrySerializer(serializers.ModelSerializer):
    is_pksh = serializers.BooleanField(read_only=True)
    class Meta:
        model = GroupLessonEntry
        fields = ['id', 'payroll_sheet', 'group_name', 'children_count', 'grade_class',
                  'is_pksh', 'lessons_count', 'hours', 'lesson_dates', 'created_at', 'updated_at']

class AdvanceSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    class Meta:
        model = Advance
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    user_city = serializers.SerializerMethodField()
    class Meta:
        model = Transaction
        fields = '__all__'
    def get_user_name(self, obj):
        try: return obj.user.teacher_profile.full_name
        except: return obj.user.get_full_name() or obj.user.username
    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None
    def get_user_city(self, obj):
        try: return obj.user.profile.city.name if obj.user.profile.city else None
        except: return None

class PayrollEntrySerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class Meta:
        model = PayrollEntry
        fields = '__all__'

class PayrollSheetSerializer(serializers.ModelSerializer):
    entries = PayrollEntrySerializer(many=True, read_only=True)
    individual_entries = IndividualLessonEntrySerializer(many=True, read_only=True)
    group_entries = GroupLessonEntrySerializer(many=True, read_only=True)
    advances = AdvanceSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()
    subject_ids = serializers.SerializerMethodField()
    subjects = serializers.PrimaryKeyRelatedField(many=True, queryset=Subject.objects.all(), required=False)
    title = serializers.CharField(required=False, allow_blank=True)
    advance_debt = serializers.SerializerMethodField()

    class Meta:
        model = PayrollSheet
        fields = [
            'id', 'teacher', 'teacher_name', 'title', 'period_start', 'period_end',
            'status', 'rejection_comment', 'notes', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
            'entries', 'individual_entries', 'group_entries', 'advances',
            'total_basic', 'total_premium', 'total_vacation', 'advance_amount',
            'subject_ids', 'subjects', 'advance_debt'
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None
    def get_teacher_name(self, obj):
        return obj.teacher.full_name if obj.teacher_id else None
    def get_subject_ids(self, obj):
        return list(obj.subjects.values_list('id', flat=True))
    def get_advance_debt(self, obj):
        if obj.teacher_id:
            return str(Advance.get_teacher_debt(obj.teacher_id))
        return '0.00'
    def create(self, validated_data):
        subjects = validated_data.pop('subjects', [])
        sheet = super().create(validated_data)
        if subjects:
            sheet.subjects.set(subjects)
        return sheet


class PayrollSheetListSerializer(serializers.ModelSerializer):
    entries_count = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = PayrollSheet
        fields = ['id', 'title', 'teacher', 'teacher_name', 'period_start', 'period_end',
                  'status', 'rejection_comment', 'total_basic', 'total_premium', 'total_vacation', 'advance_amount',
                  'entries_count', 'created_by_name', 'created_at', 'updated_at']
    def get_entries_count(self, obj):
        return obj.individual_entries.count() + obj.group_entries.count()
    def get_created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else None
    def get_teacher_name(self, obj):
        return obj.teacher.full_name if obj.teacher_id else None


class UserListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    city_name = serializers.SerializerMethodField()
    city_id = serializers.SerializerMethodField()
    branch_id = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    balance_premium = serializers.SerializerMethodField()
    balance_vacation = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'role', 'city_name', 'city_id',
                  'branch_id', 'branch_name',
                  'balance', 'balance_premium', 'balance_vacation', 'is_active']

    def get_role(self, obj):
        try: return obj.profile.role
        except: return None
    def get_city_name(self, obj):
        try: return obj.profile.city.name if obj.profile.city else None
        except: return None
    def get_city_id(self, obj):
        try: return obj.profile.city_id
        except: return None
    def get_branch_id(self, obj):
        try: return obj.profile.branch_id
        except: return None
    def get_branch_name(self, obj):
        try: return obj.profile.branch.name if obj.profile.branch else None
        except: return None
    def get_balance(self, obj):
        return str(Transaction.get_balance(obj.id, 'main'))
    def get_balance_premium(self, obj):
        return str(Transaction.get_balance(obj.id, 'premium'))
    def get_balance_vacation(self, obj):
        return str(Transaction.get_balance(obj.id, 'vacation'))
    def get_full_name(self, obj):
        try: return obj.teacher_profile.full_name
        except: return obj.get_full_name() or obj.username
