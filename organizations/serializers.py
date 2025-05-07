from rest_framework import serializers
from .models import (
    Organization, OrganizationUser, StrategicObjective,
    Program, SubProgram, StrategicInitiative, PerformanceMeasure, MainActivity,
    ActivityBudget, ActivityCostingAssumption, Plan, PlanReview
)
from django.contrib.auth.models import User
from decimal import Decimal

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'

class OrganizationUserSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()
    
    class Meta:
        model = OrganizationUser
        fields = ['id', 'user', 'username', 'organization', 'organization_name', 'role', 'created_at']
    
    def get_username(self, obj):
        return obj.user.username if obj.user else None
    
    def get_organization_name(self, obj):
        return obj.organization.name if obj.organization else None

class StrategicObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = StrategicObjective
        fields = '__all__'

class ProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = '__all__'

class SubProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubProgram
        fields = '__all__'

class PerformanceMeasureSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceMeasure
        fields = '__all__'

class MainActivitySerializer(serializers.ModelSerializer):
    budget = serializers.SerializerMethodField()
    
    class Meta:
        model = MainActivity
        fields = '__all__'
    
    def get_budget(self, obj):
        try:
            budget = ActivityBudget.objects.get(activity=obj)
            return ActivityBudgetSerializer(budget).data
        except ActivityBudget.DoesNotExist:
            return None

class StrategicInitiativeSerializer(serializers.ModelSerializer):
    performance_measures = PerformanceMeasureSerializer(many=True, read_only=True)
    main_activities = MainActivitySerializer(many=True, read_only=True)
    
    class Meta:
        model = StrategicInitiative
        fields = '__all__'

class ActivityBudgetSerializer(serializers.ModelSerializer):
    activity_name = serializers.CharField(source='activity.name', read_only=True)
    total_funding = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    funding_gap = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    estimated_cost = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = ActivityBudget
        fields = [
            'id', 'activity', 'activity_name', 'budget_calculation_type', 'activity_type',
            'estimated_cost_with_tool', 'estimated_cost_without_tool',
            'government_treasury', 'sdg_funding', 'partners_funding', 'other_funding',
            'total_funding', 'estimated_cost', 'funding_gap',
            'training_details', 'meeting_workshop_details',
            'procurement_details', 'printing_details', 'supervision_details',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        # Get the budget calculation type
        budget_calculation_type = data.get('budget_calculation_type', 'WITHOUT_TOOL')
        
        # Get the estimated cost based on calculation type
        estimated_cost = (
            data.get('estimated_cost_with_tool', 0)
            if budget_calculation_type == 'WITH_TOOL'
            else data.get('estimated_cost_without_tool', 0)
        )

        # Calculate total funding
        total_funding = (
            Decimal(str(data.get('government_treasury', 0))) +
            Decimal(str(data.get('sdg_funding', 0))) +
            Decimal(str(data.get('partners_funding', 0))) +
            Decimal(str(data.get('other_funding', 0)))
        )

        # Validate total funding against estimated cost
        if total_funding > Decimal(str(estimated_cost)):
            raise serializers.ValidationError(
                f'Total funding ({total_funding}) cannot exceed estimated cost ({estimated_cost})'
            )

        return data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # Ensure numeric fields are properly formatted
        numeric_fields = [
            'estimated_cost_with_tool', 'estimated_cost_without_tool',
            'government_treasury', 'sdg_funding', 'partners_funding', 'other_funding',
            'total_funding', 'estimated_cost', 'funding_gap'
        ]
        
        for field in numeric_fields:
            if field in data:
                data[field] = float(data[field] or 0)
        
        return data

class ActivityCostingAssumptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityCostingAssumption
        fields = '__all__'

class PlanSerializer(serializers.ModelSerializer):
    organizationName = serializers.SerializerMethodField()
    plannerName = serializers.CharField(source='planner_name', read_only=True)
    
    class Meta:
        model = Plan
        fields = '__all__'
        
    def get_organizationName(self, obj):
        return obj.organization.name if obj.organization else None

    def create(self, validated_data):
        """
        Ensure each new plan is created as a fresh instance
        without carrying over any pre-existing data
        """
        # Create a fresh plan instance with only the validated data
        # This ensures no unwanted data comes along from previous plans
        plan = Plan.objects.create(**validated_data)
        return plan
        
    def to_representation(self, instance):
        """
        Ensure complete representation with organization name
        """
        data = super().to_representation(instance)
        
        # Add organization name if it's not already there
        if 'organizationName' not in data or not data['organizationName']:
            data['organizationName'] = self.get_organizationName(instance)
            
        return data

class PlanReviewSerializer(serializers.ModelSerializer):
    evaluator_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PlanReview
        fields = '__all__'
        read_only_fields = ['evaluator', 'evaluator_name', 'reviewed_at']
        
    def get_evaluator_name(self, obj):
        return obj.evaluator.user.get_full_name() if obj.evaluator and obj.evaluator.user else None