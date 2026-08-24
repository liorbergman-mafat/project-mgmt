-- ============================================================================
-- Optional demo data, so the UI has something to show on first run.
-- Run AFTER schema.sql. Delete this file once you have real data.
-- ============================================================================

with t as (
    insert into item_types (name)
    values ('קשר'), ('מחשוב'), ('ניווט')
    returning id, name
),
m as (
    insert into item_models (type_id, name)
    select id, 'MR-3' from t where name = 'קשר'
    union all
    select id, 'רגד' from t where name = 'מחשוב'
    returning id, name
),
s as (
    insert into item_statuses (name)
    values ('בשימוש'), ('במחסן'), ('בתחזוקה')
    returning id, name
),
l as (
    insert into locations (name, kind, brigade, battalion)
    values
        ('גדוד 890',    'יחידה', 'חטיבה 1',  'גדוד 890'),
        ('פלוגה ב׳',    'יחידה', 'חטיבה 1',  'גדוד 12'),
        ('מחסן מרכזי',  'מחסן',  null,       null)
    returning id, name
),
p as (
    insert into projects (name, description, status)
    values
        ('מבצע נחשון',  'הטמעת מערכות קשר בגדוד חי״ר', 'active'),
        ('פרויקט רקיע', 'ניסוי ציוד ניווט ביחידת איסוף', 'active')
    returning id, name
)
insert into items (project_id, type_id, model_id, serial_id, status_id, location_id)
select
    (select id from p where name = 'מבצע נחשון'),
    (select id from t where name = 'קשר'),
    (select id from m where name = 'MR-3'),
    'MR3-00841',
    (select id from s where name = 'בשימוש'),
    (select id from l where name = 'גדוד 890');
