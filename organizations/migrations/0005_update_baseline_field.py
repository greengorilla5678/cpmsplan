from django.db import migrations, models

def update_null_baselines(apps, schema_editor):
    """
    Update any existing null baseline values to empty string
    """
    PerformanceMeasure = apps.get_model('organizations', 'PerformanceMeasure')
    PerformanceMeasure.objects.filter(baseline__isnull=True).update(baseline='')

class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0004_add_program_relations'),
    ]

    operations = [
        # First run the data migration to handle existing null values
        migrations.RunPython(
            update_null_baselines,
            reverse_code=migrations.RunPython.noop
        ),
        
        # Then modify the field to be non-nullable with default
        migrations.AlterField(
            model_name='performancemeasure',
            name='baseline',
            field=models.CharField(
                max_length=255,
                default='',
                blank=True,
            ),
        ),
    ]