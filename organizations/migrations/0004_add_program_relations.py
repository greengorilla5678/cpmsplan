from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0003_activity_costing_assumptions'),
    ]

    operations = [
        migrations.AddField(
            model_name='strategicinitiative',
            name='program',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='initiatives',
                to='organizations.program'
            ),
        ),
        migrations.AddField(
            model_name='strategicinitiative',
            name='subprogram',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='initiatives',
                to='organizations.subprogram'
            ),
        ),
        migrations.AddConstraint(
            model_name='strategicinitiative',
            constraint=models.CheckConstraint(
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
        ),
        migrations.AddIndex(
            model_name='strategicinitiative',
            index=models.Index(
                fields=['program'],
                name='idx_initiative_program'
            ),
        ),
        migrations.AddIndex(
            model_name='strategicinitiative',
            index=models.Index(
                fields=['subprogram'],
                name='idx_initiative_subprogram'
            ),
        ),
    ]