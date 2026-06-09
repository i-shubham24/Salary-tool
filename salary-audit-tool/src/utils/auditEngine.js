export const performSalaryAudit = (oldData, newData) => {
  const oldMap = new Map();
  
  oldData.forEach(item => {
    // Look for 'Type' (Dental College Format) or fallback to 'Employee ID'
    const empId = item['Type'] || item['Employee ID'];
    if (empId) {
      oldMap.set(String(empId).trim(), item);
    }
  });

  // Comprehensive list of EVERY earning and deduction parameter from your specific files
  const salaryComponents = [
    // --- Earnings ---
    'BP', 'SPL', 'PGT', 'NPA', 'DA', 'HRAP', 'FMA', 'AREAR', 'SHP', 'PFP', 'IR', 'Misc',
    // --- Deductions ---
    'SEC.', 'IT', 'PFD', 'E-EXP', 'ADV', 'MISC', 'INS.', 'Welfare', 'T/INS', 'ESI', 'HRAD', 'P.Tax.',
    // --- Net/Total Shift Tracking ---
    'T-DED.', 'NET PAY'
  ];

  let totalOldGross = 0;
  let totalNewGross = 0;
  const detailedChanges = [];
  
  // NEW: A tracker to remember exactly who we have audited so far
  const processedEmpIds = new Set();

  // SWEEP 1: Look through the New Sheet for Updates and New Hires
  newData.forEach(newEmp => {
    const empId = String(newEmp['Type'] || newEmp['Employee ID'] || '').trim();
    if (!empId) return;

    processedEmpIds.add(empId); // Mark this employee as seen

    const oldEmp = oldMap.get(empId);
    
    // Using T-PAY as the Gross Salary metric
    const newGross = parseFloat(newEmp['T-PAY'] || newEmp['Gross Salary']) || 0;
    totalNewGross += newGross;

    if (!oldEmp) {
      detailedChanges.push({
        empId,
        name: empId,
        type: 'NEW_EMPLOYEE',
        grossDelta: newGross,
        breakdown: {}
      });
      return;
    }

    const oldGross = parseFloat(oldEmp['T-PAY'] || oldEmp['Gross Salary']) || 0;
    totalOldGross += oldGross;
    const grossDelta = newGross - oldGross;

    const breakdown = {};
    let hasComponentShift = false;

    // Evaluate every single component to see exactly what caused the shift
    salaryComponents.forEach(component => {
      const oldVal = parseFloat(oldEmp[component]) || 0;
      const newVal = parseFloat(newEmp[component]) || 0;
      const delta = newVal - oldVal;

      if (delta !== 0) {
        hasComponentShift = true;
        breakdown[component] = {
          old: oldVal,
          new: newVal,
          delta: delta,
          pct: oldVal !== 0 ? ((delta / oldVal) * 100).toFixed(1) : 100
        };
      }
    });

    // If their total pay shifted OR any internal structural allowance/deduction shifted
    if (grossDelta !== 0 || hasComponentShift) {
      detailedChanges.push({
        empId,
        name: empId,
        type: 'MODIFIED',
        oldGross,
        newGross,
        grossDelta,
        breakdown
      });
    }
  });

  // SWEEP 2: Look back at the Old Sheet to find anyone who was removed (Terminations/Resignations)
  oldMap.forEach((oldEmp, empId) => {
    if (!processedEmpIds.has(empId)) {
      // This person is missing from the new sheet!
      const oldGross = parseFloat(oldEmp['T-PAY'] || oldEmp['Gross Salary']) || 0;
      totalOldGross += oldGross; // We must still add them to the old total for accurate math

      detailedChanges.push({
        empId,
        name: empId,
        type: 'DEPARTED',
        oldGross: oldGross,
        newGross: 0,
        grossDelta: -oldGross, // Log a complete negative delta for their vanished salary
        breakdown: {}
      });
    }
  });

  return {
    summary: {
      totalOldGross,
      totalNewGross,
      netVariance: totalNewGross - totalOldGross,
      pctChange: totalOldGross !== 0 ? ((totalNewGross - totalOldGross) / totalOldGross * 100).toFixed(2) : 0,
      totalAudited: Math.max(oldData.length, newData.length) // Uses the larger file size for total audited
    },
    changes: detailedChanges
  };
};
