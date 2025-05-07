from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0002_activity_budget_changes'),
    ]

    operations = [
        migrations.CreateModel(
            name='ActivityCostingAssumption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_type', models.CharField(choices=[
                    ('Training', 'Training'),
                    ('Meeting', 'Meeting'),
                    ('Workshop', 'Workshop'),
                    ('Printing', 'Printing'),
                    ('Supervision', 'Supervision'),
                    ('Procurement', 'Procurement'),
                    ('Other', 'Other')
                ], max_length=20)),
                ('location', models.CharField(choices=[
                    ('Addis_Ababa', 'Addis Ababa'),
                    ('Adama', 'Adama'),
                    ('Bahirdar', 'Bahirdar'),
                    ('Mekele', 'Mekele'),
                    ('Hawassa', 'Hawassa'),
                    ('Gambella', 'Gambella'),
                    ('Afar', 'Afar'),
                    ('Somali', 'Somali')
                ], max_length=20)),
                ('cost_type', models.CharField(choices=[
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
                ], max_length=30)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('description', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'unique_together': (('activity_type', 'location', 'cost_type'),),
            },
        ),
    ]