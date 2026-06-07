// src/utils/auditEngine.js

export const performSalaryAudit = (oldData, newData) => {
  const oldMap = new Map();
  oldData.forEach(item => {
    if (item['Employee ID']) {
      oldMap.set(String(item['Employee ID']).trim(), item);
    }
  });

  const salaryComponents = [
    'Basic', 'PF', 'DA', 'HRA', 'LTA', 
    'Other Allowances', 'Perquisites', 'Medical Allowance'
  ];

  let totalOldGross = 0;
  let totalNewGross = 0;
  const detailedChanges = [];

  newData.forEach(newEmp => {
    const empId = String(newEmp['Employee ID'] || '').trim();
    if (!empId) return;

    const oldEmp = oldMap.get(empId);
    const newGross = parseFloat(newEmp['Gross Salary']) || 0;
    totalNewGross += newGross;

    if (!oldEmp) {
      // New Employee Entry
      detailedChanges.push({
        empId,
        name: newEmp['Name'] || 'Unknown',
        type: 'NEW_EMPLOYEE',
        grossDelta: newGross,
        breakdown: {}
      });
      return;
    }

    const oldGross = parseFloat(oldEmp['Gross Salary']) || 0;
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
        name: newEmp['Name'] || oldEmp['Name'],
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