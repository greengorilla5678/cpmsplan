from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrganizationViewSet, StrategicObjectiveViewSet,
    ProgramViewSet, SubProgramViewSet, StrategicInitiativeViewSet,
    PerformanceMeasureViewSet, MainActivityViewSet,
    ActivityBudgetViewSet, ActivityCostingAssumptionViewSet,
    PlanViewSet, PlanReviewViewSet,
    login_view, logout_view, check_auth
)

router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet)
router.register(r'strategic-objectives', StrategicObjectiveViewSet)
router.register(r'programs', ProgramViewSet)
router.register(r'subprograms', SubProgramViewSet)
router.register(r'strategic-initiatives', StrategicInitiativeViewSet)
router.register(r'performance-measures', PerformanceMeasureViewSet)
router.register(r'main-activities', MainActivityViewSet)
router.register(r'activity-budgets', ActivityBudgetViewSet)
router.register(r'activity-costing-assumptions', ActivityCostingAssumptionViewSet)
router.register(r'plans', PlanViewSet)
router.register(r'plan-reviews', PlanReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/check/', check_auth, name='check_auth'),
    # Add custom budget update endpoint
    path('main-activities/<str:pk>/budget/', MainActivityViewSet.as_view({'post': 'update_budget'}), name='activity-budget-update'),
]