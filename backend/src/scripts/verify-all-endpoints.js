const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const LeadModel = require('../models/lead.model');
const FileUpdateModel = require('../models/file-update.model');
const SanctionModel = require('../models/sanction.model');
const PfUpdateModel = require('../models/pf-update.model');
const CallModel = require('../models/call.model');
const UserModel = require('../models/user.model');
const RoleModel = require('../models/role.model');

async function testAllFunctionality() {
  console.log('--- STARTING FUNCTIONALITY & AUTHENTICATION TEST ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test UserModel & Roles
    console.log('\n--- 1. Testing UserModel, Login & RoleModel ---');
    const users = await UserModel.findAll();
    assert(Array.isArray(users), 'UserModel.findAll() returns an array');

    const admin = await UserModel.findByEmail('admin@studentschoice.in');
    assert(admin && admin.email === 'admin@studentschoice.in', 'UserModel.findByEmail() works correctly');

    // Test password hash comparison for login
    const passHash = admin.password || admin.password_hash;
    assert(Boolean(passHash), 'admin.password hash column is retrieved properly');
    const match = await bcrypt.compare('admin123', passHash);
    assert(match, 'Login password compare works cleanly with user.password');

    const roles = await RoleModel.findAll();
    assert(Array.isArray(roles) && roles.length > 0, 'RoleModel.findAll() returns active roles');

    // 2. Test LeadModel & Module Syncing
    console.log('\n--- 2. Testing LeadModel CRUD & Module Syncing ---');
    const timestamp = Date.now();
    const testLead = await LeadModel.create({
      name: `Automated Test Lead ${timestamp}`,
      phone: `999${String(timestamp).slice(-7)}`,
      email: `test_${timestamp}@example.com`,
      country: 'UK',
      university: 'Oxford',
      loanAmount: 500000,
      studentName: 'YES',
      coApplicant: 'FATHER',
      occupation: 'BUSINESS',
      source: 'Direct',
      remarks: 'Testing MVC refactoring',
      loginCity: 'MUMBAI',
      sanctionCity: 'MUMBAI',
      status: 'file_update'
    });

    assert(testLead && testLead.id > 0, 'LeadModel.create() created a new lead with status="file_update"');

    // Verify lead created an entry in file_updates
    const fuEntry = await FileUpdateModel.findById(testLead.id);
    assert(fuEntry && fuEntry.lead_id === testLead.id, 'FileUpdateModel automatically synced record for status="file_update"');

    // Update lead status to sanction
    const updatedLead = await LeadModel.update(testLead.id, {
      ...testLead,
      status: 'sanction'
    });
    assert(updatedLead && updatedLead.status === 'sanction', 'LeadModel.update() updated lead status to "sanction"');

    // Verify lead now has entry in sanction_files while file_updates entry remains preserved!
    const sancEntry = await SanctionModel.findById(testLead.id);
    assert(sancEntry && sancEntry.lead_id === testLead.id, 'SanctionModel synced record for status="sanction"');

    const fuPreserved = await FileUpdateModel.findById(testLead.id);
    assert(fuPreserved && fuPreserved.lead_id === testLead.id, 'FileUpdateModel preserved existing record without auto-deleting!');

    // 3. Test FileUpdateModel Upsert
    console.log('\n--- 3. Testing FileUpdateModel Bank Updates ---');
    const updatedFu = await FileUpdateModel.upsert(testLead.id, {
      tata: 'SANCTIONED',
      tata_remarks: 'TATA APP REF #998877',
      icici: 'LOGIN',
      icici_remarks: 'ICICI IN PROCESS'
    });
    assert(updatedFu && updatedFu.tata === 'SANCTIONED', 'FileUpdateModel.upsert() saved bank status update');

    // 4. Test SanctionModel Upsert
    console.log('\n--- 4. Testing SanctionModel Updates ---');
    const updatedSanc = await SanctionModel.upsert(testLead.id, {
      lender: 'TATA',
      lender_remarks: 'REF TATA #998877',
      sanction_amount: 450000,
      pf_amount: 12000,
      interest_rate: '10.75',
      remarks: 'SANCTIONED'
    });
    assert(updatedSanc && Number(updatedSanc.sanction_amount) === 450000, 'SanctionModel.upsert() saved sanction details');

    // 5. Test PfUpdateModel Upsert & Auto-Transition to Disbursement
    console.log('\n--- 5. Testing PfUpdateModel & Auto-Transition to Disbursement ---');
    const updatedPf = await PfUpdateModel.upsert(testLead.id, {
      lender: 'TATA',
      lender_remarks: 'REF TATA #998877',
      sanction_amount: 450000,
      pf_amount: 12000,
      interest_rate: '10.75',
      pf_paid: 10000,
      remarks: 'PAID'
    });
    assert(updatedPf && Number(updatedPf.pf_paid) === 10000, 'PfUpdateModel.upsert() saved PF details');

    // Verify auto-transition to DisbursementModel
    const DisbursementModel = require('../models/disbursement.model');
    const CrossSalesModel = require('../models/cross-sales.model');

    const disbEntry = await DisbursementModel.findById(testLead.id);
    assert(disbEntry && disbEntry.lead_id === testLead.id, 'DisbursementModel auto-synced record from PF Update');

    // 6. Test DisbursementModel Update & Auto-Transition to Cross Sales
    console.log('\n--- 6. Testing DisbursementModel & Auto-Transition to Cross Sales ---');
    const updatedDisb = await DisbursementModel.upsert(testLead.id, {
      lender: 'TATA',
      sanction_amount: 450000,
      disbursed_amount: 450000,
      tranche_number: '1ST TRANCHE',
      disbursed_date: '2026-08-17',
      status: 'DISBURSED',
      remarks: 'Final 1st tranche disbursed'
    });
    assert(updatedDisb && Number(updatedDisb.disbursed_amount) === 450000, 'DisbursementModel.upsert() updated disbursement details');

    const crossSalesEntry = await CrossSalesModel.findById(testLead.id);
    assert(crossSalesEntry && crossSalesEntry.lead_id === testLead.id, 'CrossSalesModel auto-synced record from Disbursement');

    // 7. Test CallModel
    console.log('\n--- 7. Testing CallModel Operations ---');
    const testCall = await CallModel.create({
      leadId: testLead.id,
      customerName: testLead.name,
      phone: testLead.phone,
      status: 'pending',
      notes: 'Initial test call notes',
      assignedTo: admin.id
    });
    assert(testCall && testCall.id > 0, 'CallModel.create() created a call record');

    const callStats = await CallModel.stats(null, { role_key: 'super_admin', id: admin.id });
    assert(callStats && callStats.total >= 1, 'CallModel.stats() returns total call counts');

    // Cleanup test records
    console.log('\n--- Cleaning up test records ---');
    await LeadModel.remove(testLead.id);
    await CallModel.remove(testCall.id);
    console.log('✓ Cleaned up test lead and call records.');

    console.log(`\n==========================================`);
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==========================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testAllFunctionality();
