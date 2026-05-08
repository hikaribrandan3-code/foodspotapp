# Database Export SQLs - Run These in Supabase SQL Editor

Run each of these in order to capture the complete database state. Copy results and save to `DATABASE_EXPORT_[N].json`

---

## 1️⃣ ALL TABLES + COLUMNS + DATATYPES
```sql
SELECT 
    t.table_schema,
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM 
    information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name, c.ordinal_position;
```

**Output:** Complete schema with every column, data type, nullable status, defaults

---

## 2️⃣ ALL CONSTRAINTS (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK)
```sql
SELECT 
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name 
        AND tc.table_schema = ccu.table_schema
WHERE 
    tc.table_schema = 'public'
ORDER BY 
    tc.table_name, tc.constraint_type;
```

**Output:** All PKs, FKs, unique constraints, check constraints with relationships

---

## 3️⃣ ALL RLS POLICIES (CRITICAL)
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
ORDER BY 
    tablename, policyname;
```

**Output:** Every RLS policy with USING and WITH CHECK conditions

---

## 4️⃣ ALL INDEXES
```sql
SELECT 
    t.tablename,
    i.indexname,
    i.indexdef
FROM 
    pg_indexes i
    JOIN pg_tables t ON i.tablename = t.tablename
WHERE 
    t.schemaname = 'public'
ORDER BY 
    t.tablename, i.indexname;
```

**Output:** All indexes with their definitions (INCLUDE clauses, WHERE conditions, etc.)

---

## 5️⃣ ALL FUNCTIONS/STORED PROCEDURES (RPCs)
```sql
SELECT 
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition,
    p.prokind,
    oidvectortypes(p.proargtypes) AS argument_types,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public'
ORDER BY 
    p.proname;
```

**Output:** Complete source code for every function/RPC with signatures

---

## 6️⃣ ALL TRIGGERS + TRIGGER FUNCTIONS
```sql
SELECT 
    t.trigger_schema,
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_statement,
    t.action_orientation,
    pg_get_triggerdef((SELECT oid FROM information_schema.triggers WHERE trigger_name = t.trigger_name LIMIT 1)::regprocedure) AS trigger_definition
FROM 
    information_schema.triggers t
WHERE 
    t.trigger_schema = 'public'
ORDER BY 
    t.event_object_table, t.trigger_name;
```

**Output:** All triggers with their definitions and conditions

---

## 7️⃣ TABLE GRANTS (RLS ROLE PERMISSIONS)
```sql
SELECT 
    table_schema,
    table_name,
    grantor,
    grantee,
    privilege_type,
    is_grantable
FROM 
    information_schema.table_privileges
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name, grantee, privilege_type;
```

**Output:** Who has what permissions (anon, authenticated, service_role)

---

## 8️⃣ COLUMN COMMENTS + TABLE DESCRIPTIONS
```sql
SELECT 
    c.table_schema,
    c.table_name,
    c.column_name,
    col_description(to_regclass(c.table_schema||'.'||c.table_name), c.ordinal_position::int) AS column_comment,
    obj_description(to_regclass(c.table_schema||'.'||c.table_name)::oid) AS table_comment
FROM 
    information_schema.columns c
WHERE 
    c.table_schema = 'public'
ORDER BY 
    c.table_name, c.ordinal_position;
```

**Output:** All documentation comments on tables/columns

---

## BONUS: SEQUENCES (Auto-Increment IDs)
```sql
SELECT 
    sequence_schema,
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment,
    cycle_option
FROM 
    information_schema.sequences
WHERE 
    sequence_schema = 'public'
ORDER BY 
    sequence_name;
```

---

## How to Use

1. Open **Supabase SQL Editor** (supabase.com → your project → SQL Editor)
2. Run query **#1** → copy output → save as `DATABASE_EXPORT_01_TABLES.json`
3. Run query **#2** → copy output → save as `DATABASE_EXPORT_02_CONSTRAINTS.json`
4. Run query **#3** → copy output → save as `DATABASE_EXPORT_03_RLS_POLICIES.json`
5. Run query **#4** → copy output → save as `DATABASE_EXPORT_04_INDEXES.json`
6. Run query **#5** → copy output → save as `DATABASE_EXPORT_05_FUNCTIONS.json`
7. Run query **#6** → copy output → save as `DATABASE_EXPORT_06_TRIGGERS.json`
8. Run query **#7** → copy output → save as `DATABASE_EXPORT_07_GRANTS.json`
9. (Bonus) Run query **#8** → copy output → save as `DATABASE_EXPORT_COMMENTS.json`

**Save all files to:** `/DATABASE_SNAPSHOTS/` folder

---

## What This Captures

✅ Every table, column, data type, default value  
✅ All constraints (PK, FK, unique, check)  
✅ Complete RLS policies with conditions  
✅ All indexes (including partial + INCLUDE)  
✅ Every stored function/RPC with source code  
✅ All triggers with definitions  
✅ Role-based permissions  
✅ Documentation comments  

**Result:** A complete, queryable database snapshot that can be version-controlled, diffed, and used to recreate the schema from scratch.

---

## Next: Build Automated Snapshots

Once you run these once, we can set up:
1. **Weekly cron job** to auto-capture snapshots
2. **Git commits** to DATABASE_SNAPSHOTS/ folder
3. **Diff viewer** to see what changed each week
4. **Rollback docs** if needed

Would you like me to automate this?
