from django.contrib import admin
from django.urls import path, include
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.db.models import Sum, Q
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
from django.utils.dateparse import parse_date
from decimal import Decimal
import datetime
from .models import (
    Organization, OrganizationUser, StrategicObjective,
    Program, SubProgram, StrategicInitiative, PerformanceMeasure, MainActivity,
    ActivityBudget, ActivityCostingAssumption, Plan, PlanReview
)
from .serializers import (
    OrganizationSerializer, OrganizationUserSerializer,
    StrategicObjectiveSerializer, ProgramSerializer,
    SubProgramSerializer, StrategicInitiativeSerializer,
    UserSerializer, PerformanceMeasureSerializer, MainActivitySerializer,
    ActivityBudgetSerializer, ActivityCostingAssumptionSerializer,
    PlanSerializer, PlanReviewSerializer
)

@api_view(['POST', 'GET'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def login_view(request):
    if request.method == 'GET':
        return Response({'detail': 'CSRF cookie set'})
    
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'success': False, 'error': 'Please provide both username and password'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        user_orgs = OrganizationUser.objects.filter(user=user)
        user_orgs_data = OrganizationUserSerializer(user_orgs, many=True).data
        
        return Response({
            'success': True, 
            'user': UserSerializer(user).data,
            'userOrganizations': user_orgs_data,
            'message': 'Login successful'
        })
    else:
        return Response({
            'success': False,
            'error': 'Invalid credentials'
        }, status=status.HTTP_200_OK)

@api_view(['POST', 'GET'])
@ensure_csrf_cookie
def logout_view(request):
    if request.method == 'GET':
        return Response({'detail': 'CSRF cookie set'})
    
    logout(request)
    response = Response({'success': True, 'message': 'Logout successful'})
    response.delete_cookie('sessionid', path='/')
    response.delete_cookie('csrftoken', path='/')
    
    return response

@api_view(['GET'])
def check_auth(request):
    if request.user.is_authenticated:
        user_orgs = OrganizationUser.objects.filter(user=request.user)
        user_orgs_data = OrganizationUserSerializer(user_orgs, many=True).data
        
        return Response({
            'isAuthenticated': True, 
            'user': UserSerializer(request.user).data,
            'userOrganizations': user_orgs_data
        })
    return Response({'isAuthenticated': False})

class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['GET'])
    def hierarchy(self, request):
        root_orgs = Organization.objects.filter(parent=None)
        serializer = self.get_serializer(root_orgs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['PATCH'])
    def update_metadata(self, request, pk=None):
        organization = self.get_object()
        serializer = self.get_serializer(
            organization,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def user_organizations(self, request):
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user_orgs = OrganizationUser.objects.filter(user=request.user)
        orgs = [org_user.organization for org_user in user_orgs]
        
        serializer = self.get_serializer(orgs, many=True)
        return Response(serializer.data)

class StrategicObjectiveViewSet(viewsets.ModelViewSet):
    queryset = StrategicObjective.objects.all()
    serializer_class = StrategicObjectiveSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can create strategic objectives'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can update strategic objectives'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['GET'])
    def weight_summary(self, request):
        total_weight = StrategicObjective.objects.aggregate(
            total=Sum('weight')
        )['total'] or Decimal('0')
        
        remaining_weight = Decimal('100') - total_weight
        
        return Response({
            'total_weight': total_weight,
            'remaining_weight': remaining_weight,
            'is_valid': total_weight == Decimal('100')
        })
    
    @action(detail=False, methods=['POST'])
    def validate_total_weight(self, request):
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can validate strategic objectives'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        total_weight = StrategicObjective.objects.aggregate(total=Sum('weight'))['total'] or Decimal('0')
        
        if total_weight != Decimal('100'):
            return Response({
                'is_valid': False,
                'total_weight': total_weight,
                'message': f'The sum of all strategic objectives weights must be exactly 100%. Current total: {total_weight}%'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'is_valid': True,
            'total_weight': total_weight,
            'message': 'The sum of all strategic objectives weights is exactly 100%.'
        })

class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all()
    serializer_class = ProgramSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can create programs'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        objective_id = request.data.get('strategic_objective')
        if not objective_id:
            return Response(
                {'detail': 'Strategic objective is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        objective = get_object_or_404(StrategicObjective, id=objective_id)
        weight = Decimal(str(request.data.get('weight', '0')))

        total_weight = Program.objects.filter(
            strategic_objective=objective
        ).aggregate(total=Sum('weight'))['total'] or Decimal('0')

        if total_weight + weight > objective.weight:
            return Response({
                'detail': f'Total weight of programs ({total_weight + weight}%) cannot exceed objective weight ({objective.weight}%)'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can update programs'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()
        objective = instance.strategic_objective
        weight = Decimal(str(request.data.get('weight', instance.weight)))

        total_weight = Program.objects.filter(
            strategic_objective=objective
        ).exclude(id=instance.id).aggregate(
            total=Sum('weight')
        )['total'] or Decimal('0')

        if total_weight + weight > objective.weight:
            return Response({
                'detail': f'Total weight of programs ({total_weight + weight}%) cannot exceed objective weight ({objective.weight}%)'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)

class SubProgramViewSet(viewsets.ModelViewSet):
    queryset = SubProgram.objects.all()
    serializer_class = SubProgramSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can create subprograms'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        program_id = request.data.get('program')
        if not program_id:
            return Response(
                {'detail': 'Program is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        program = get_object_or_404(Program, id=program_id)
        weight = Decimal(str(request.data.get('weight', '0')))

        total_weight = SubProgram.objects.filter(
            program=program
        ).aggregate(total=Sum('weight'))['total'] or Decimal('0')

        if total_weight + weight > program.weight:
            return Response({
                'detail': f'Total weight of subprograms ({total_weight + weight}%) cannot exceed program weight ({program.weight}%)'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can update subprograms'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()
        program = instance.program
        weight = Decimal(str(request.data.get('weight', instance.weight)))

        total_weight = SubProgram.objects.filter(
            program=program
        ).exclude(id=instance.id).aggregate(
            total=Sum('weight')
        )['total'] or Decimal('0')

        if total_weight + weight > program.weight:
            return Response({
                'detail': f'Total weight of subprograms ({total_weight + weight}%) cannot exceed program weight ({program.weight}%)'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)


    
class StrategicInitiativeViewSet(viewsets.ModelViewSet):
    queryset = StrategicInitiative.objects.all()
    serializer_class = StrategicInitiativeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by parent (objective, program, or subprogram)
        objective_id = self.request.query_params.get('objective')
        program_id = self.request.query_params.get('program')
        subprogram_id = self.request.query_params.get('subprogram')
        created_date = self.request.query_params.get('created_date')
        
        if objective_id:
            queryset = queryset.filter(strategic_objective_id=objective_id)
        elif program_id:
            queryset = queryset.filter(program_id=program_id)
        elif subprogram_id:
            queryset = queryset.filter(subprogram_id=subprogram_id)
            
        # Filter by creation date if provided
        if created_date:
            try:
                date_obj = parse_date(created_date)
                if date_obj:
                    # Create a date range for the entire day
                    date_start = datetime.datetime.combine(date_obj, datetime.time.min)
                    date_end = datetime.datetime.combine(date_obj, datetime.time.max)
                    print(f"Filtering by date range: {date_start} to {date_end}")
                    queryset = queryset.filter(created_at__range=(date_start, date_end))
            except Exception as e:
                print(f"Error parsing date: {e}")
            
        return queryset

    @action(detail=False, methods=['GET'])
    def weight_summary(self, request):
        """Get weight summary for initiatives"""
        objective_id = request.query_params.get('objective')
        program_id = request.query_params.get('program')
        subprogram_id = request.query_params.get('subprogram')
        
        if not any([objective_id, program_id, subprogram_id]):
            return Response({'error': 'Parent ID is required'}, status=400)
            
        # Get total weight of initiatives
        initiatives = self.get_queryset()
        total_weight = initiatives.aggregate(total=Sum('weight'))['total'] or Decimal('0')
            
        return Response({
            'data': {
                'total_initiatives_weight': float(total_weight),
            }
        })

    # Add a helper method to get complete initiative data with related measures and activities
    @action(detail=True, methods=['GET'])
    def complete(self, request, pk=None):
        """Get complete initiative data including performance measures and activities"""
        initiative = self.get_object()
        
        # Get performance measures
        performance_measures = PerformanceMeasure.objects.filter(initiative=initiative)
        
        # Get main activities with their budgets
        main_activities = MainActivity.objects.filter(initiative=initiative)
        
        # Serialize data
        initiative_data = self.get_serializer(initiative).data
        initiative_data['performance_measures'] = PerformanceMeasureSerializer(performance_measures, many=True).data
        initiative_data['main_activities'] = MainActivitySerializer(main_activities, many=True).data
        
        return Response(initiative_data)
    
class PerformanceMeasureViewSet(viewsets.ModelViewSet):
    queryset = PerformanceMeasure.objects.all()
    serializer_class = PerformanceMeasureSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        initiative_id = self.request.query_params.get('initiative')
        if initiative_id:
            return self.queryset.filter(initiative_id=initiative_id)
        return self.queryset

    def create(self, request, *args, **kwargs):
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can create performance measures'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        initiative_id = request.data.get('initiative')
        if not initiative_id:
            return Response(
                {'detail': 'Initiative is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        initiative = get_object_or_404(StrategicInitiative, id=initiative_id)
        weight = Decimal(str(request.data.get('weight', '0')))

        total_weight = PerformanceMeasure.objects.filter(
            initiative=initiative
        ).aggregate(total=Sum('weight'))['total'] or Decimal('0')

        if total_weight + weight > Decimal('35'):
            return Response({
                'detail': f'Total weight of performance measures ({total_weight + weight}%) cannot exceed 35%'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can update performance measures'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()
        initiative = instance.initiative
        weight = Decimal(str(request.data.get('weight', instance.weight)))

        total_weight = PerformanceMeasure.objects.filter(
            initiative=initiative
        ).exclude(id=instance.id).aggregate(
            total=Sum('weight')
        )['total'] or Decimal('0')

        if total_weight + weight > Decimal('35'):
            return Response({
                'detail': f'Total weight of performance measures ({total_weight + weight}%) cannot exceed 35%'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def weight_summary(self, request):
        initiative_id = request.query_params.get('initiative')
        if not initiative_id:
            return Response({'error': 'Initiative ID is required'}, status=400)
        
        initiative = get_object_or_404(StrategicInitiative, id=initiative_id)
        total_weight = PerformanceMeasure.objects.filter(
            initiative=initiative
        ).aggregate(total=Sum('weight'))['total'] or Decimal('0')
        
        remaining_weight = Decimal('35') - total_weight
        
        return Response({
            'initiative_weight': initiative.weight,
            'expected_measures_weight': Decimal('35'),
            'total_measures_weight': total_weight,
            'remaining_weight': remaining_weight,
            'is_valid': total_weight == Decimal('35')
        })

class MainActivityViewSet(viewsets.ModelViewSet):
    queryset = MainActivity.objects.all()
    serializer_class = MainActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = MainActivity.objects.all()
        initiative_id = self.request.query_params.get('initiative', None)
        if initiative_id:
            queryset = queryset.filter(initiative_id=initiative_id)
        return queryset

    @action(detail=True, methods=['post'])
    def update_budget(self, request, pk=None):
        """Update or create a budget for an activity"""
        activity = self.get_object()
        
        try:
            # Get or create budget
            budget, created = ActivityBudget.objects.get_or_create(activity=activity)
            
            # Update budget with request data
            serializer = ActivityBudgetSerializer(budget, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            # Save budget
            budget = serializer.save()
            
            # Return updated budget data with activity details
            response_data = ActivityBudgetSerializer(budget).data
            response_data['activity_name'] = activity.name
            
            return Response(response_data)
            
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'detail': f'Failed to update budget: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def weight_summary(self, request):
        initiative_id = request.query_params.get('initiative')
        if not initiative_id:
            return Response(
                {'detail': 'Initiative ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            initiative = StrategicInitiative.objects.get(id=initiative_id)
            activities = MainActivity.objects.filter(initiative=initiative)
            
            total_weight = sum(activity.weight for activity in activities)
            
            return Response({
                'data': {
                    'initiative_weight': initiative.weight,
                    'expected_activities_weight': 65,  # Fixed percentage for activities
                    'total_activities_weight': total_weight,
                    'remaining_weight': 65 - total_weight,
                    'is_valid': total_weight == 65
                }
            })
        except StrategicInitiative.DoesNotExist:
            return Response(
                {'detail': 'Initiative not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def validate_activities_weight(self, request):
        initiative_id = request.query_params.get('initiative')
        if not initiative_id:
            return Response(
                {'detail': 'Initiative ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            initiative = StrategicInitiative.objects.get(id=initiative_id)
            activities = MainActivity.objects.filter(initiative=initiative)
            
            total_weight = sum(activity.weight for activity in activities)
            
            if total_weight != 65:
                return Response({
                    'data': {
                        'message': f'Total weight must be 65%. Current total: {total_weight}%',
                        'is_valid': False
                    }
                })
            
            return Response({
                'data': {
                    'message': 'Activities weight validated successfully',
                    'is_valid': True
                }
            })
        except StrategicInitiative.DoesNotExist:
            return Response(
                {'detail': 'Initiative not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ActivityBudgetViewSet(viewsets.ModelViewSet):
    queryset = ActivityBudget.objects.all()
    serializer_class = ActivityBudgetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        activity_id = self.request.query_params.get('activity')
        if activity_id:
            return self.queryset.filter(activity_id=activity_id)
        return self.queryset

class ActivityCostingAssumptionViewSet(viewsets.ModelViewSet):
    queryset = ActivityCostingAssumption.objects.all()
    serializer_class = ActivityCostingAssumptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        activity_type = self.request.query_params.get('activity_type')
        location = self.request.query_params.get('location')
        
        queryset = self.queryset
        
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)
        if location:
            queryset = queryset.filter(location=location)
            
        return queryset

class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all().order_by('-updated_at')
    serializer_class = PlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filter plans based on user role and organization
        """
        user = self.request.user
        user_orgs = OrganizationUser.objects.filter(user=user)
        
        # Get query parameters
        status_filter = self.request.query_params.get('status')
        organization_filter = self.request.query_params.get('organization')
        
        # Base queryset
        queryset = super().get_queryset()
        
        # Filter by organization and planner
        if user_orgs.filter(role='ADMIN').exists():
            # Admins can see all plans in their organizations
            org_ids = user_orgs.values_list('organization_id', flat=True)
            queryset = queryset.filter(organization__in=org_ids)
        elif user_orgs.filter(role='PLANNER').exists():
            # Planners can only see their own plans
            org_ids = user_orgs.filter(role='PLANNER').values_list('organization_id', flat=True)
            queryset = queryset.filter(
                organization__in=org_ids,
                planner_name__in=[user.username, user.first_name, user.last_name]
            )
        elif user_orgs.filter(role='EVALUATOR').exists():
            # Evaluators can only see submitted plans from their organizations
            org_ids = user_orgs.values_list('organization_id', flat=True)
            queryset = queryset.filter(organization__in=org_ids)
            if not status_filter:  # Only apply if no specific status filter
                queryset = queryset.filter(status='SUBMITTED')
        else:
            # Users with no role see nothing
            return Plan.objects.none()
        
        # Apply status filter if provided
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        # Apply organization filter if provided
        if organization_filter:
            queryset = queryset.filter(organization=organization_filter)
        
        return queryset

    def perform_create(self, serializer):
        """Save the planner name from the authenticated user"""
        user = self.request.user
        
        # Check if user has planner role
        if not OrganizationUser.objects.filter(user=user, role='PLANNER').exists():
            raise ValidationError('Only planners can create plans')
        
        # Use first name if available, otherwise username
        planner_name = user.first_name if user.first_name else user.username
        serializer.save(planner_name=planner_name)

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a plan with its related data"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Load related objectives data
        if instance.strategic_objective:
            try:
                # Get the objective data
                objective = StrategicObjective.objects.get(id=instance.strategic_objective)
                objective_serializer = StrategicObjectiveSerializer(objective)
                objective_data = objective_serializer.data
                
                # Get related initiatives and their performance measures & activities
                initiatives = StrategicInitiative.objects.filter(strategic_objective=objective)
                initiative_data = []
                
                for initiative in initiatives:
                    initiative_serializer = StrategicInitiativeSerializer(initiative)
                    initiative_item = initiative_serializer.data
                    
                    # Get performance measures
                    performance_measures = PerformanceMeasure.objects.filter(initiative=initiative)
                    initiative_item['performance_measures'] = PerformanceMeasureSerializer(performance_measures, many=True).data
                    
                    # Get main activities with their budgets
                    main_activities = MainActivity.objects.filter(initiative=initiative)
                    initiative_item['main_activities'] = MainActivitySerializer(main_activities, many=True).data
                    
                    initiative_data.append(initiative_item)
                    
                objective_data['initiatives'] = initiative_data
                data['objectives'] = [objective_data]
            except Exception as e:
                print(f"Error loading objective data: {e}")
                data['objectives'] = []
            
        # Load plan reviews
        try:
            reviews = PlanReview.objects.filter(plan=instance)
            data['reviews'] = PlanReviewSerializer(reviews, many=True).data
        except Exception as e:
            print(f"Error loading plan reviews: {e}")
            data['reviews'] = []
            
        return Response(data)

    @action(detail=True, methods=['POST'])
    def submit(self, request, pk=None):
        """Submit a plan for review"""
        plan = self.get_object()
        
        # Only planners can submit plans
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='PLANNER')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only planners can submit plans'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Check if plan is already submitted or approved
        if plan.status != 'DRAFT':
            return Response(
                {'detail': f'Plan is already {plan.status.lower()}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update plan status and submitted date
        plan.status = 'SUBMITTED'
        plan.submitted_at = timezone.now()
        plan.save()
        
        return Response({
            'detail': 'Plan submitted successfully',
            'status': plan.status
        })
        
    @action(detail=True, methods=['POST'])
    def approve(self, request, pk=None):
        """Approve a submitted plan"""
        plan = self.get_object()
        
        # Only evaluators can approve plans
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='EVALUATOR')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only evaluators can approve plans'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Check if plan is submitted
        if plan.status != 'SUBMITTED':
            return Response(
                {'detail': f'Only submitted plans can be approved. Current status: {plan.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create review record
        feedback = request.data.get('feedback', '')
        evaluator = user_orgs.first()
        
        review = PlanReview.objects.create(
            plan=plan,
            evaluator=evaluator,
            status='APPROVED',
            feedback=feedback,
            reviewed_at=timezone.now()
        )
            
        # Update plan status
        plan.status = 'APPROVED'
        plan.save()
        
        return Response({
            'detail': 'Plan approved successfully',
            'status': plan.status,
            'review_id': review.id
        })
        
    @action(detail=True, methods=['POST'])
    def reject(self, request, pk=None):
        """Reject a submitted plan"""
        plan = self.get_object()
        
        # Only evaluators can reject plans
        user_orgs = OrganizationUser.objects.filter(user=request.user, role='EVALUATOR')
        if not user_orgs.exists():
            return Response(
                {'detail': 'Only evaluators can reject plans'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Check if plan is submitted
        if plan.status != 'SUBMITTED':
            return Response(
                {'detail': f'Only submitted plans can be rejected. Current status: {plan.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Feedback is required for rejections
        feedback = request.data.get('feedback')
        if not feedback:
            return Response(
                {'detail': 'Feedback is required when rejecting a plan'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create review record
        evaluator = user_orgs.first()
        
        review = PlanReview.objects.create(
            plan=plan,
            evaluator=evaluator,
            status='REJECTED',
            feedback=feedback,
            reviewed_at=timezone.now()
        )
            
        # Update plan status
        plan.status = 'REJECTED'
        plan.save()
        
        return Response({
            'detail': 'Plan rejected successfully',
            'status': plan.status,
            'review_id': review.id
        })

class PlanReviewViewSet(viewsets.ModelViewSet):
    queryset = PlanReview.objects.all().order_by('-reviewed_at')
    serializer_class = PlanReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by plan if provided
        plan_id = self.request.query_params.get('plan')
        queryset = self.queryset
        
        if plan_id:
            queryset = queryset.filter(plan_id=plan_id)
            
        # Filter by user's role
        user = self.request.user
        user_orgs = OrganizationUser.objects.filter(user=user)
        
        if user_orgs.filter(role='ADMIN').exists():
            # Admins can see all reviews
            return queryset
        elif user_orgs.filter(role='EVALUATOR').exists():
            # Evaluators can see their own reviews
            evaluator_ids = user_orgs.filter(role='EVALUATOR').values_list('id', flat=True)
            return queryset.filter(evaluator_id__in=evaluator_ids)
        else:
            # Others can't see reviews
            return PlanReview.objects.none()

    def perform_create(self, serializer):
        """Set the evaluator to the authenticated user"""
        user = self.request.user
        evaluator = OrganizationUser.objects.filter(user=user, role='EVALUATOR').first()
        
        if not evaluator:
            raise ValidationError('Only evaluators can create reviews')
            
        serializer.save(evaluator=evaluator, reviewed_at=timezone.now())