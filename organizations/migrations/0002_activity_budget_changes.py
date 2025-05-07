from django.db import migrations, models
import django.db.models.deletion
import django.core.validators

class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='mainactivity',
            name='budget',
        ),
        migrations.CreateModel(
            name='ActivityBudget',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('budget_calculation_type', models.CharField(choices=[('WITH_TOOL', 'With Tool'), ('WITHOUT_TOOL', 'Without Tool')], default='WITHOUT_TOOL', max_length=20)),
                ('activity_type', models.CharField(blank=True, choices=[('Training', 'Training'), ('Meeting', 'Meeting'), ('Workshop', 'Workshop'), ('Printing', 'Printing'), ('Supervision', 'Supervision'), ('Procurement', 'Procurement'), ('Other', 'Other')], max_length=20, null=True)),
                ('estimated_cost_with_tool', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('estimated_cost_without_tool', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('government_treasury', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('sdg_funding', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('partners_funding', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('other_funding', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('training_details', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('activity', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='budget', to='organizations.mainactivity')),
            ],
        ),
    ]