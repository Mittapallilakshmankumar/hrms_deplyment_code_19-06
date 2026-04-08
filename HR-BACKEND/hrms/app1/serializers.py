from rest_framework import serializers
from .models import Candidate, Education


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = '__all__'


class CandidateSerializer(serializers.ModelSerializer):
    education = EducationSerializer(many=True, read_only=True)

    # ✅ ADD THIS FUNCTION
    def validate_employee_id(self, value):
        if Candidate.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError("Employee ID already exists ❌")
        return value

    class Meta:
        model = Candidate
        fields = '__all__'


        