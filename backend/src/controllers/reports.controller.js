const pool = require('../config/db');
const asyncHandler = require('../utils/async-handler');

exports.getTeamPerformance = asyncHandler(async (req, res) => {
  // 1. Advisor Calling Performance Metrics
  const [advisors] = await pool.query(`
    SELECT 
      u.id AS user_id,
      u.name AS advisor_name,
      u.email AS advisor_email,
      COUNT(cl.id) AS total_calls,
      SUM(IF(cl.status = 'connected', 1, 0)) AS connected_calls,
      SUM(IF(cl.status = 'busy' OR cl.status = 'no_answer', 1, 0)) AS missed_calls,
      COALESCE(SUM(cl.duration), 0) AS total_duration_seconds,
      MAX(cl.created_at) AS last_call_at
    FROM users u
    LEFT JOIN call_logs cl ON cl.user_id = u.id
    GROUP BY u.id, u.name, u.email
    ORDER BY total_calls DESC
  `);

  // 2. High level Pipeline Metrics
  const [leadStats] = await pool.query(`SELECT COUNT(*) AS total_leads FROM leads`);
  const [fileStats] = await pool.query(`SELECT COUNT(*) AS files_logged FROM file_updates`);
  const [sanctionStats] = await pool.query(`SELECT COUNT(*) AS total_sanctions, COALESCE(SUM(sanction_amount), 0) AS total_sanction_amount FROM sanction_files`);
  const [disbursementStats] = await pool.query(`SELECT COUNT(*) AS total_disbursements, COALESCE(SUM(disbursed_amount), 0) AS total_disbursed_amount FROM disbursements`);
  const [crossSalesStats] = await pool.query(`
    SELECT 
      SUM(IF(forex_status = 'ISSUED' OR forex_status = 'APPLIED', 1, 0)) AS forex_count,
      SUM(IF(gic_status = 'OPENED' OR gic_status = 'APPLIED', 1, 0)) AS gic_count,
      SUM(IF(insurance_status = 'ISSUED' OR insurance_status = 'OPTED', 1, 0)) AS insurance_count,
      SUM(IF(sim_status = 'DELIVERED' OR sim_status = 'OPTED', 1, 0)) AS sim_count
    FROM cross_sales
  `);

  // 3. Conversion Funnel
  const totalLeads = Number(leadStats[0]?.total_leads || 0);
  const totalFiles = Number(fileStats[0]?.files_logged || 0);
  const totalSanctions = Number(sanctionStats[0]?.total_sanctions || 0);
  const totalDisbursed = Number(disbursementStats[0]?.total_disbursements || 0);

  const conversionFunnel = {
    totalLeads,
    totalFiles,
    totalSanctions,
    totalDisbursed,
    leadToSanctionRate: totalLeads > 0 ? ((totalSanctions / totalLeads) * 100).toFixed(1) : 0,
    sanctionToDisbursedRate: totalSanctions > 0 ? ((totalDisbursed / totalSanctions) * 100).toFixed(1) : 0
  };

  // 4. Lender Sanction Distribution Breakdown
  const [lenderBreakdown] = await pool.query(`
    SELECT 
      COALESCE(sf.lender, 'AVANSE') AS lender_name,
      COUNT(*) AS sanction_count,
      COALESCE(SUM(sf.sanction_amount), 0) AS total_amount
    FROM sanction_files sf
    GROUP BY sf.lender
    ORDER BY sanction_count DESC
  `);

  res.json({
    summary: {
      totalLeads,
      totalFiles,
      totalSanctions,
      totalSanctionAmount: Number(sanctionStats[0]?.total_sanction_amount || 0),
      totalDisbursements: totalDisbursed,
      totalDisbursedAmount: Number(disbursementStats[0]?.total_disbursed_amount || 0),
      crossSalesSummary: crossSalesStats[0] || {}
    },
    conversionFunnel,
    advisorPerformance: advisors.map(a => ({
      ...a,
      total_duration_minutes: Math.round(Number(a.total_duration_seconds || 0) / 60)
    })),
    lenderBreakdown
  });
});
