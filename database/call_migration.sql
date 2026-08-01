USE student_choice_crm;
CREATE TABLE IF NOT EXISTS calls (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id INT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  notes TEXT,
  follow_up_at DATETIME NULL,
  last_called_at DATETIME NULL,
  call_count INT UNSIGNED NOT NULL DEFAULT 0,
  assigned_to INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_calls_status(status), INDEX idx_calls_assigned_to(assigned_to), INDEX idx_calls_follow_up(follow_up_at),
  CONSTRAINT fk_call_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  CONSTRAINT fk_call_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
INSERT INTO calls (lead_id,customer_name,phone,status,notes,follow_up_at) VALUES
(1,'Aarav Sharma','9876543210','pending','Initial eligibility call pending.',NULL),
(2,'Isha Gupta','9876501234','follow_up','Asked to call after offer letter review.',DATE_ADD(NOW(),INTERVAL 1 DAY)),
(3,'Rohan Verma','9898989898','connected','Discussed sanction process.',NULL);
