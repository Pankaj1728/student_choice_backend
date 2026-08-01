USE student_choice_crm;
INSERT IGNORE INTO roles (`key`,name) VALUES ('super_admin','Super Admin');
INSERT IGNORE INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.`key`='super_admin';
