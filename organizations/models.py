from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal

class Organization(models.Model):
    ORGANIZATION_TYPES = [
        ('MINISTER', 'Minister'),
        ('STATE_MINISTER', 'State Minister'),
        ('CHIEF_EXECUTIVE', 'Chief Executive'),
        ('LEAD_EXECUTIVE', 'Lead Executive'),
        ('EXECUTIVE', 'Executive'),
        ('TEAM_LEAD', 'Team Lead'),
        ('DESK', 'Desk')
    ]
    
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=ORGANIZATION_TYPES)
    parent = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children'
    )
    vision = models.TextField(null=True, blank=True)
    mission = models.TextField(null=True, blank=True)
    core_values = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class OrganizationUser(models.Model):
    ROLES = [
        ('ADMIN', 'Admin'),
        ('PLANNER', 'Planner'),
        ('EVALUATOR', 'Evaluator')
    ]
    
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='organization_users')
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='users')
    role = models.CharField(max_length=20, choices=ROLES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'organization', 'role')
    
    def __str__(self):
        return f"{self.user.username} - {self.organization.name} ({self.role})"

class StrategicObjective(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            lambda value: ValidationError('Weight must be positive') if value <= 0 else None,
            lambda value: ValidationError('Weight cannot exceed 100') if value > 100 else None
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        # Validate logic (in addition to field validators)
        super().clean()
        if self.weight <= 0:
            raise ValidationError('Weight must be positive')
        if self.weight > 100:
            raise ValidationError('Weight cannot exceed 100')
    
    def __str__(self):
        return self.title

class Program(models.Model):
    strategic_objective = models.ForeignKey(
        StrategicObjective,
        on_delete=models.CASCADE,
        related_name='programs'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        super().clean()
        if self.weight <= 0:
            raise ValidationError('Weight must be positive')
            
        # Check if total program weight exceeds objective weight
        total_weight = Program.objects.filter(
            strategic_objective=self.strategic_objective
        ).exclude(id=self.id).aggregate(
            total=models.Sum('weight')
        )['total'] or Decimal('0')
        
        if total_weight + self.weight > self.strategic_objective.weight:
            raise ValidationError(
                f'Total weight of programs ({total_weight + self.weight}) cannot exceed '
                f'objective weight ({self.strategic_objective.weight})'
            )
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name

class SubProgram(models.Model):
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name='subprograms'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        super().clean()
        if self.weight <= 0:
            raise ValidationError('Weight must be positive')
            
        # Check if total subprogram weight exceeds program weight
        total_weight = SubProgram.objects.filter(
            program=self.program
        ).exclude(id=self.id).aggregate(
            total=models.Sum('weight')
        )['total'] or Decimal('0')
        
        if total_weight + self.weight > self.program.weight:
            raise ValidationError(
                f'Total weight of subprograms ({total_weight + self.weight}) cannot exceed '
                f'program weight ({self.program.weight})'
            )
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name

class StrategicInitiative(models.Model):
    name = models.CharField(max_length=255)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    strategic_objective = models.ForeignKey(
        StrategicObjective,
        on_delete=models.CASCADE,
        related_name='initiatives',
        null=True,
        blank=True
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name='initiatives',
        null=True,
        blank=True
    )
    subprogram = models.ForeignKey(
        SubProgram,
        on_delete=models.CASCADE,
        related_name='initiatives',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(
                    models.Q(
                        strategic_objective__isnull=False,
                        program__isnull=True,
                        subprogram__isnull=True
                    ) |
                    models.Q(
                        strategic_objective__isnull=True,
                        program__isnull=False,
                        subprogram__isnull=True
                    ) |
                    models.Q(
                        strategic_objective__isnull=True,
                        program__isnull=True,
                        subprogram__isnull=False
                    )
                ),
                name='initiative_relation_check'
            ),
        ]
        indexes = [
            models.Index(fields=['program'], name='idx_initiative_program'),
            models.Index(fields=['subprogram'], name='idx_initiative_subprogram'),
        ]
    
    def clean(self):
        super().clean()
        
        # Validate the parent relationship
        parent_count = 0
        if self.strategic_objective:
            parent_count += 1
        if self.program:
            parent_count += 1
        if self.subprogram:
            parent_count += 1
            
        if parent_count != 1:
            raise ValidationError('Initiative must be linked to exactly one parent: strategic objective, program, or subprogram')
    
    def __str__(self):
        return self.name

class PerformanceMeasure(models.Model):
    initiative = models.ForeignKey(
        StrategicInitiative,
        on_delete=models.CASCADE,
        related_name='performance_measures'
    )
    name = models.CharField(max_length=255)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    baseline = models.CharField(max_length=255, default="", blank=True)
    q1_target = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        verbose_name="Q1 Target (Jul-Sep)"
    )
    q2_target = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        verbose_name="Q2 Target (Oct-Dec)"
    )
    q3_target = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        verbose_name="Q3 Target (Jan-Mar)"
    )
    q4_target = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        verbose_name="Q4 Target (Apr-Jun)"
    )
    annual_target = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        super().clean()
        
        # Validate weight is positive
        if self.weight <= 0:
            raise ValidationError('Weight must be positive')
        
        # Validate targets
        quarterly_sum = self.q1_target + self.q2_target + self.q3_target + self.q4_target
        if quarterly_sum > self.annual_target:
            raise ValidationError('Sum of quarterly targets cannot exceed annual target')
        
        # Validate measure weight against total for initiative (total should be 35%)
        total_weight = PerformanceMeasure.objects.filter(
            initiative=self.initiative
        ).exclude(id=self.id).aggregate(
            total=models.Sum('weight')
        )['total'] or Decimal('0')
        
        if total_weight + self.weight > 35:
            raise ValidationError(f'Total weight of performance measures ({total_weight + self.weight}%) cannot exceed 35%')
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name

class MainActivity(models.Model):
    initiative = models.ForeignKey(
        StrategicInitiative,
        on_delete=models.CASCADE,
        related_name='main_activities'
    )
    name = models.CharField(max_length=255)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    selected_months = models.JSONField(null=True, blank=True)
    selected_quarters = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def clean(self):
        super().clean()
        
        # Validate weight is positive
        if self.weight <= 0:
            raise ValidationError('Weight must be positive')
        
        # Validate period selection
        if not self.selected_months and not self.selected_quarters:
            raise ValidationError('At least one month or quarter must be selected')
            
        # Initialize empty arrays if fields are None
        if self.selected_months is None:
            self.selected_months = []
        if self.selected_quarters is None:
            self.selected_quarters = []
        
        # Validate activity weight against total for initiative (total should be 65%)
        total_weight = MainActivity.objects.filter(
            initiative=self.initiative
        ).exclude(id=self.id).aggregate(
            total=models.Sum('weight')
        )['total'] or Decimal('0')
        
        if total_weight + self.weight > 65:
            raise ValidationError(f'Total weight of activities ({total_weight + self.weight}%) cannot exceed 65%')
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name

class ActivityBudget(models.Model):
    BUDGET_CALCULATION_TYPES = [
        ('WITH_TOOL', 'With Tool'),
        ('WITHOUT_TOOL', 'Without Tool')
    ]
    
    ACTIVITY_TYPES = [
        ('Training', 'Training'),
        ('Meeting', 'Meeting'),
        ('Workshop', 'Workshop'),
        ('Printing', 'Printing'),
        ('Supervision', 'Supervision'),
        ('Procurement', 'Procurement'),
        ('Other', 'Other')
    ]

    activity = models.OneToOneField(
        'MainActivity',
        on_delete=models.CASCADE,
        related_name='budget'
    )
    budget_calculation_type = models.CharField(
        max_length=20,
        choices=BUDGET_CALCULATION_TYPES,
        default='WITHOUT_TOOL'
    )
    activity_type = models.CharField(
        max_length=20,
        choices=ACTIVITY_TYPES,
        null=True,
        blank=True
    )
    estimated_cost_with_tool = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    estimated_cost_without_tool = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    government_treasury = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    sdg_funding = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    partners_funding = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    other_funding = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    training_details = models.JSONField(null=True, blank=True)
    meeting_workshop_details = models.JSONField(null=True, blank=True)
    procurement_details = models.JSONField(null=True, blank=True)
    printing_details = models.JSONField(null=True, blank=True)
    supervision_details = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()

        # Get the estimated cost based on calculation type
        estimated_cost = (
            self.estimated_cost_with_tool 
            if self.budget_calculation_type == 'WITH_TOOL'
            else self.estimated_cost_without_tool
        )

        # Calculate total funding
        total_funding = (
            self.government_treasury +
            self.sdg_funding +
            self.partners_funding +
            self.other_funding
        )

        # Validate total funding against estimated cost
        if total_funding > estimated_cost:
            raise ValidationError(
                f'Total funding ({total_funding}) cannot exceed estimated cost ({estimated_cost})'
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Budget for {self.activity.name}"

    @property
    def total_funding(self):
        return (
            self.government_treasury +
            self.sdg_funding +
            self.partners_funding +
            self.other_funding
        )

    @property
    def estimated_cost(self):
        return (
            self.estimated_cost_with_tool 
            if self.budget_calculation_type == 'WITH_TOOL'
            else self.estimated_cost_without_tool
        )

    @property
    def funding_gap(self):
        return self.estimated_cost - self.total_funding

class ActivityCostingAssumption(models.Model):
    ACTIVITY_TYPES = [
        ('Training', 'Training'),
        ('Meeting', 'Meeting'),
        ('Workshop', 'Workshop'),
        ('Printing', 'Printing'),
        ('Supervision', 'Supervision'),
        ('Procurement', 'Procurement'),
        ('Other', 'Other')
    ]

    LOCATIONS = [
        ('Addis_Ababa', 'Addis Ababa'),
        ('Adama', 'Adama'),
        ('Bahirdar', 'Bahirdar'),
        ('Mekele', 'Mekele'),
        ('Hawassa', 'Hawassa'),
        ('Gambella', 'Gambella'),
        ('Afar', 'Afar'),
        ('Somali', 'Somali')
    ]

    COST_TYPES = [
        ('per_diem', 'Per Diem'),
        ('accommodation', 'Accommodation'),
        ('venue', 'Venue'),
        ('transport_land', 'Land Transport'),
        ('transport_air', 'Air Transport'),
        ('participant_flash_disk', 'Flash Disk (per participant)'),
        ('participant_stationary', 'Stationary (per participant)'),
        ('session_flip_chart', 'Flip Chart (per session)'),
        ('session_marker', 'Marker (per session)'),
        ('session_toner_paper', 'Toner and Paper (per session)')
    ]

    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    location = models.CharField(max_length=20, choices=LOCATIONS)
    cost_type = models.CharField(max_length=30, choices=COST_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('activity_type', 'location', 'cost_type')
        
    def __str__(self):
        return f"{self.activity_type} - {self.location} - {self.cost_type}: {self.amount}"

class Plan(models.Model):
    PLAN_TYPES = [
        ('LEAD_EXECUTIVE', 'Lead Executive'),
        ('TEAM_DESK', 'Team/Desk'),
        ('INDIVIDUAL', 'Individual')
    ]
    
    PLAN_STATUS = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected')
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='plans'
    )
    planner_name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=PLAN_TYPES)
    executive_name = models.CharField(max_length=255, null=True, blank=True)
    strategic_objective = models.ForeignKey(
        StrategicObjective,
        on_delete=models.CASCADE,
        related_name='plans'
    )
    program = models.ForeignKey(
        Program,
        on_delete=models.CASCADE,
        related_name='plans',
        null=True,
        blank=True
    )
    subprogram = models.ForeignKey(
        SubProgram,
        on_delete=models.CASCADE,
        related_name='plans',
        null=True,
        blank=True
    )
    fiscal_year = models.CharField(max_length=10)
    from_date = models.DateField()
    to_date = models.DateField()
    status = models.CharField(
        max_length=20, 
        choices=PLAN_STATUS,
        default='DRAFT'
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.organization.name} - {self.strategic_objective} - {self.fiscal_year}"
        
    # Method to clean the plan data and prevent duplicate submissions
    def clean(self):
        super().clean()
        
        # Validate date range
        if self.to_date <= self.from_date:
            raise ValidationError('End date must be after start date')
            
        # Make sure we have at least one of strategic_objective, program, or subprogram
        if not self.strategic_objective and not self.program and not self.subprogram:
            raise ValidationError('At least one of strategic objective, program, or subprogram must be specified')
            
        # If submitting a plan, check for duplicate submissions
        if self.status == 'SUBMITTED' or self.status == 'APPROVED':
            # Check for existing approved/submitted plans with same organization + objective/program/subprogram
            existing_plans = Plan.objects.filter(
                organization=self.organization,
                strategic_objective=self.strategic_objective,
                status__in=['SUBMITTED', 'APPROVED']
            ).exclude(id=self.id)
            
            if existing_plans.exists():
                raise ValidationError(
                    'A plan for this organization and strategic objective has already been submitted or approved'
                )
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

class PlanReview(models.Model):
    REVIEW_STATUS = [
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected')
    ]
    
    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    evaluator = models.ForeignKey(
        OrganizationUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reviews'
    )
    status = models.CharField(max_length=20, choices=REVIEW_STATUS)
    feedback = models.TextField()
    reviewed_at = models.DateTimeField()
    
    def __str__(self):
        return f"Review of {self.plan} by {self.evaluator.user.username}" if self.evaluator else f"Review of {self.plan}"