-- Seed data for vehicles and drivers
-- This migration adds sample fleet data for testing

-- Insert sample vehicles
INSERT INTO vehicles (id, registration_number, make, model, fuel_type, is_active, notes) VALUES
  ('v1000001-0000-0000-0000-000000000001', 'CF 123 456', 'Toyota', 'Hilux', 'diesel', true, 'Primary delivery vehicle'),
  ('v1000001-0000-0000-0000-000000000002', 'GP 789 012', 'Isuzu', 'KB250', 'diesel', true, 'Secondary delivery vehicle'),
  ('v1000001-0000-0000-0000-000000000003', 'NW 345 678', 'Ford', 'Ranger', 'diesel', true, 'Long distance trips'),
  ('v1000001-0000-0000-0000-000000000004', 'FS 901 234', 'Nissan', 'NP300', 'diesel', true, 'Backup vehicle'),
  ('v1000001-0000-0000-0000-000000000005', 'MP 567 890', 'Toyota', 'Quantum', 'diesel', false, 'Under maintenance')
ON CONFLICT (id) DO NOTHING;

-- Insert sample drivers
INSERT INTO drivers (id, full_name, phone, license_number, license_expiry, is_active, notes) VALUES
  ('d1000001-0000-0000-0000-000000000001', 'Thabo Mokoena', '082 123 4567', 'DL2024001234', '2027-06-15', true, 'Senior driver, 5 years experience'),
  ('d1000001-0000-0000-0000-000000000002', 'Sipho Ndlovu', '083 234 5678', 'DL2023005678', '2026-03-20', true, 'Experienced in long-distance routes'),
  ('d1000001-0000-0000-0000-000000000003', 'Johannes van der Merwe', '084 345 6789', 'DL2022009012', '2025-12-01', true, 'Specializes in warehouse deliveries'),
  ('d1000001-0000-0000-0000-000000000004', 'Blessing Mthembu', '085 456 7890', 'DL2024003456', '2028-01-10', true, 'New driver, completed training'),
  ('d1000001-0000-0000-0000-000000000005', 'Peter Molefe', '086 567 8901', 'DL2021007890', '2025-02-28', false, 'On extended leave')
ON CONFLICT (id) DO NOTHING;
