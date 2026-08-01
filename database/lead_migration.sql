USE student_choice_crm;
CREATE TABLE IF NOT EXISTS leads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  email VARCHAR(150) NOT NULL DEFAULT '',
  country VARCHAR(80) NOT NULL DEFAULT '',
  university VARCHAR(180) NOT NULL DEFAULT '',
  loan_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  student_name VARCHAR(120) NOT NULL DEFAULT '',
  co_applicant VARCHAR(120) NOT NULL DEFAULT '',
  occupation VARCHAR(100) NOT NULL DEFAULT '',
  source VARCHAR(80) NOT NULL DEFAULT 'Direct',
  remarks TEXT,
  login_city VARCHAR(100) NOT NULL DEFAULT '',
  sanction_city VARCHAR(100) NOT NULL DEFAULT '',
  credit_score SMALLINT UNSIGNED NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  assigned_to INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leads_status (status), INDEX idx_leads_source (source), INDEX idx_leads_assigned_to (assigned_to), INDEX idx_leads_phone (phone),
  CONSTRAINT fk_lead_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO leads (name,phone,email,country,university,loan_amount,student_name,co_applicant,occupation,source,remarks,login_city,sanction_city,credit_score,status,assigned_to) VALUES
('Aarav Sharma','9876543210','aarav@example.com','Canada','York University',3200000,'Aarav Sharma','Rakesh Sharma','Student','Website','Requested loan eligibility.','Delhi','',745,'interested',NULL),
('Isha Gupta','9876501234','isha@example.com','United Kingdom','University of Leeds',2800000,'Isha Gupta','Manoj Gupta','Student','Referral','Offer letter received.','Mumbai','Mumbai',790,'login',NULL),
('Rohan Verma','9898989898','rohan@example.com','Australia','Monash University',4100000,'Rohan Verma','Nisha Verma','Student','Instagram','Sanction in process.','Pune','Pune',765,'sanction',NULL)
ON DUPLICATE KEY UPDATE name=VALUES(name);
