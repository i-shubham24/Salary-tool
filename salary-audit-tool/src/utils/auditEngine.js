export const performSalaryAudit = (oldData, newData) => {
  const oldMap = new Map();
  oldData.forEach(item => {
    // Uses "Type" column (e.g. Dr A Singh) as the unique ID
    const empId = item['Type'] || item['Employee ID'];
    if (empId) {
      oldMap.set(String(empId).trim(), item);
    }
  });

  // Mapped exactly to your CSV structure
  const salaryComponents = [
    'BP', 'SPL', 'PGT', 'NPA', 'DA', 'HRAP', 'FMA', 
    'PFD', 'IT', 'E-EXP', 'ADV', 'INS.', 'ESI'
  ];

  let totalOldGross = 0;
  let totalNewGross = 0;
  const detailedChanges = [];

  newData.forEach(newEmp => {
    const empId = String(newEmp['Type'] || newEmp['Employee ID'] || '').trim();
    if (!empId) return;

    const oldEmp = oldMap.get(empId);
    
    // T-PAY is your Gross
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

  return {
    summary: {
      totalOldGross,
      totalNewGross,
      netVariance: totalNewGross - totalOldGross,
      pctChange: totalOldGross !== 0 ? ((totalNewGross - totalOldGross) / totalOldGross * 100).toFixed(2) : 0,
      totalAudited: newData.length
    },
    changes: detailedChanges
  };
};