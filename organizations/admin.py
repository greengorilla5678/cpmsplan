from django.contrib import admin
from django import forms
from .models import (
    Organization, OrganizationUser, StrategicObjective, 
    Program, SubProgram, StrategicInitiative, PerformanceMeasure, MainActivity,
    ActivityBudget, ActivityCostingAssumption
)

class OrganizationAdminForm(forms.ModelForm):
    core_values_text = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 5}),
        required=False,
        label="Core Values (one per line)",
        help_text="Enter each core value on a new line"
    )

    class Meta:
        model = Organization
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Convert JSON list to newline-separated text for editing
        if self.instance.pk and self.instance.core_values:
            self.fields['core_values_text'].initial = '\n'.join(self.instance.core_values)

    def clean(self):
        cleaned_data = super().clean()
        # Convert newline-separated text back to list for JSON field
        core_values_text = cleaned_data.get('core_values_text', '')
        if core_values_text:
            cleaned_data['core_values'] = [value.strip() for value in core_values_text.split('\n') if value.strip()]
        else:
            cleaned_data['core_values'] = []
        return cleaned_data

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    form = OrganizationAdminForm
    list_display = ('name', 'type', 'parent', 'created_at', 'updated_at')
    list_filter = ('type',)
    search_fields = ('name',)
    ordering = ('type', 'name')
    fieldsets = (
        (None, {
            'fields': ('name', 'type', 'parent')
        }),
        ('Metadata', {
            'fields': ('vision', 'mission', 'core_values_text'),
            'classes': ('collapse',),
        }),
    )

    def save_model(self, request, obj, form, change):
        # Core values are already processed in the form's clean method
        super().save_model(request, obj, form, change)

@admin.register(OrganizationUser)
class OrganizationUserAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'role', 'created_at')
    list_filter = ('role', 'organization')
    search_fields = ('user__username', 'user__email', 'organization__name')
    ordering = ('organization', 'user')

@admin.register(StrategicObjective)
class StrategicObjectiveAdmin(admin.ModelAdmin):
    list_display = ('title', 'weight', 'created_at', 'updated_at')
    search_fields = ('title', 'description')

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('name', 'strategic_objective', 'weight', 'created_at', 'updated_at')
    list_filter = ('strategic_objective',)
    search_fields = ('name', 'description')

@admin.register(SubProgram)
class SubProgramAdmin(admin.ModelAdmin):
    list_display = ('name', 'program', 'weight', 'created_at', 'updated_at')
    list_filter = ('program',)
    search_fields = ('name', 'description')

class PerformanceMeasureInline(admin.TabularInline):
    model = PerformanceMeasure
    extra = 1
    fields = ('name', 'weight', 'baseline', 'q1_target', 'q2_target', 'q3_target', 'q4_target', 'annual_target')

class MainActivityInline(admin.TabularInline):
    model = MainActivity
    extra = 1
    fields = ('name', 'weight', 'selected_months', 'selected_quarters')

@admin.register(StrategicInitiative)
class StrategicInitiativeAdmin(admin.ModelAdmin):
    list_display = ('name', 'strategic_objective', 'weight', 'created_at', 'updated_at')
    list_filter = ('strategic_objective',)
    search_fields = ('name',)
    inlines = [PerformanceMeasureInline, MainActivityInline]

@admin.register(PerformanceMeasure)
class PerformanceMeasureAdmin(admin.ModelAdmin):
    list_display = ('name', 'initiative', 'weight', 'annual_target', 'created_at', 'updated_at')
    list_filter = ('initiative',)
    search_fields = ('name',)
    fieldsets = (
        (None, {
            'fields': ('initiative', 'name', 'weight', 'baseline')
        }),
        ('Targets', {
            'fields': ('q1_target', 'q2_target', 'q3_target', 'q4_target', 'annual_target'),
        }),
    )

@admin.register(MainActivity)
class MainActivityAdmin(admin.ModelAdmin):
    list_display = ('name', 'initiative', 'weight', 'created_at', 'updated_at')
    list_filter = ('initiative',)
    search_fields = ('name',)
    fieldsets = (
        (None, {
            'fields': ('initiative', 'name', 'weight')
        }),
        ('Period', {
            'fields': ('selected_months', 'selected_quarters'),
        }),
    )

@admin.register(ActivityBudget)
class ActivityBudgetAdmin(admin.ModelAdmin):
    list_display = ('activity', 'budget_calculation_type', 'activity_type', 'created_at')
    list_filter = ('budget_calculation_type', 'activity_type')
    search_fields = ('activity__name',)
    fieldsets = (
        (None, {
            'fields': ('activity', 'budget_calculation_type', 'activity_type')
        }),
        ('Costs', {
            'fields': (
                'estimated_cost_with_tool',
                'estimated_cost_without_tool',
                'government_treasury',
                'sdg_funding',
                'partners_funding',
                'other_funding'
            ),
        }),
        ('Training Details', {
            'fields': ('training_details',),
            'classes': ('collapse',),
        }),
    )

@admin.register(ActivityCostingAssumption)
class ActivityCostingAssumptionAdmin(admin.ModelAdmin):
    list_display = ('activity_type', 'location', 'cost_type', 'amount', 'created_at')
    list_filter = ('activity_type', 'location', 'cost_type')
    search_fields = ('description',)
    ordering = ('activity_type', 'location', 'cost_type')