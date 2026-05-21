-- Returns any exposed public tables after the RLS lockdown migration.
-- Expected result: zero rows.

SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    COALESCE(bool_or(p.grantee = 'anon' AND p.privilege_type IS NOT NULL), false) AS anon_has_table_privileges,
    COALESCE(bool_or(p.grantee = 'authenticated' AND p.privilege_type IS NOT NULL), false) AS authenticated_has_table_privileges
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN information_schema.table_privileges p
    ON p.table_schema = n.nspname
   AND p.table_name = c.relname
   AND p.grantee IN ('anon', 'authenticated')
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
GROUP BY n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
HAVING
    c.relrowsecurity IS NOT TRUE
    OR c.relforcerowsecurity IS NOT TRUE
    OR COALESCE(bool_or(p.grantee = 'anon' AND p.privilege_type IS NOT NULL), false)
    OR COALESCE(bool_or(p.grantee = 'authenticated' AND p.privilege_type IS NOT NULL), false)
ORDER BY schema_name, table_name;
