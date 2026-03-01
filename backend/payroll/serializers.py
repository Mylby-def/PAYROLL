from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Teacher, Subject, Rate, Bonus,
    PayrollSheet, PayrollEntry
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = '__all__'


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
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


class PayrollEntrySerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = PayrollEntry
        fields = '__all__'


class PayrollSheetSerializer(serializers.ModelSerializer):
    entries = PayrollEntrySerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    subject_ids = serializers.SerializerMethodField()
    subjects = serializers.PrimaryKeyRelatedField(many=True, queryset=Subject.objects.all(), required=False)
    title = serializers.CharField(required=False, allow_blank=True)

    def get_teacher_name(self, obj):
        return obj.teacher.full_name if obj.teacher_id else None

    class Meta:
        model = PayrollSheet
        fields = [
            'id', 'teacher', 'teacher_name', 'title', 'period_start', 'period_end',
            'status', 'notes', 'created_by', 'created_by_name', 'created_at', 'updated_at',
            'entries', 'total_amount', 'subject_ids', 'subjects'
        ]

    def create(self, validated_data):
        subjects = validated_data.pop('subjects', [])
        sheet = super().create(validated_data)
        if subjects:
            sheet.subjects.set(subjects)
        return sheet

    def get_total_amount(self, obj):
        return str(obj.get_total_amount())

    def get_subject_ids(self, obj):
        return list(obj.subjects.values_list('id', flat=True))


class PayrollSheetListSerializer(serializers.ModelSerializer):
    total_amount = serializers.SerializerMethodField()
    entries_count = serializers.IntegerField(source='entries.count', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    teacher_name = serializers.SerializerMethodField()

    def get_teacher_name(self, obj):
        return obj.teacher.full_name if obj.teacher_id else None

    class Meta:
        model = PayrollSheet
        fields = ['id', 'title', 'teacher', 'teacher_name', 'period_start', 'period_end', 'status',
                  'total_amount', 'entries_count', 'created_by_name',
                  'created_at', 'updated_at']

    def get_total_amount(self, obj):
        return str(obj.get_total_amount())
