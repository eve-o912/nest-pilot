-- Seed lenders table with sample Kenyan lending partners
INSERT INTO lenders (name, logo_url, type, min_amount, max_amount, interest_rate, repayment_period, requirements, active) VALUES
('KCB Bank', NULL, 'bank', 50000, 5000000, 2.5, '1–60 months', ARRAY['6 months business history', 'Min KES 50,000 monthly revenue', 'Business registration certificate'], true),
('Faulu Kenya', NULL, 'microfinance', 10000, 500000, 3.0, '1–12 months', ARRAY['3 months business history', 'Min KES 10,000 monthly revenue', 'Active M-Pesa account'], true),
('M-Shwari', NULL, 'mobile', 500, 50000, 7.5, '30 days', ARRAY['Active M-Pesa account for 6 months', 'Regular M-Pesa transactions', 'Good repayment history'], true),
('Hustler Fund', NULL, 'mobile', 500, 50000, 8.0, '14 days', ARRAY['Kenyan citizen ID', 'Active phone number', 'No existing loan defaults'], true),
('Equity Bank', NULL, 'bank', 100000, 10000000, 2.0, '1–72 months', ARRAY['12 months business history', 'Min KES 100,000 monthly revenue', 'Business bank account'], true),
('KWFT (Kenya Women Finance Trust)', NULL, 'microfinance', 5000, 1000000, 2.8, '1–24 months', ARRAY['3 months business history', 'Min KES 15,000 monthly revenue', 'Group guarantee or collateral'], true),
('SACCO Federation', NULL, 'sacco', 20000, 2000000, 1.5, '1–36 months', ARRAY['SACCO membership for 6 months', 'Regular savings contributions', 'Min KES 20,000 monthly revenue'], true),
('Tala', NULL, 'mobile', 500, 30000, 15.0, '30 days', ARRAY['Active phone number', 'Regular airtime purchases', 'Good mobile data usage'], true),
('Branch International', NULL, 'mobile', 1000, 50000, 12.0, '30 days', ARRAY['Active Facebook account', 'Regular phone usage', 'No existing loan defaults'], true),
('Co-operative Bank', NULL, 'bank', 50000, 5000000, 2.2, '1–48 months', ARRAY['6 months business history', 'Min KES 40,000 monthly revenue', 'Business registration'], true);
