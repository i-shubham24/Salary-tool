// src/utils/auditEngine.js

export const performSalaryAudit = (oldData, newData) => {
  const oldMap = new Map();
  
  oldData.forEach(item => {
    oldMap.set(String(item['Employee ID']).trim(), item);
  });

  // Internal Components ONLY (Gross and Net are handled separately)
  const salaryComponents = [
    'Basic', 'Spl', 'PGT', 'NPA', 'DA', 'HRA', 'FMA', 'Arear', 'SHP', 'PFP', 'Misc Earn',
    'Sec', 'ITax', 'PFD', 'Elect', 'Adv', 'Misc Ded', 'Ins', 'T/INS', 'Wel', 'HRD', 'ESI', 'PTax'
  ];

  let totalOldGross = 0;
  let totalNewGross = 0;
  const detailedChanges = [];
  const processedEmpIds = new Set();

  newData.forEach(newEmp => {
    const empId = String(newEmp['Employee ID']).trim();
    processedEmpIds.add(empId);
    
    const oldEmp = oldMap.get(empId);
    const newGross = newEmp['T.Pay'] || 0;
    const newNet = newEmp['Net Pay'] || 0;
    totalNewGross += newGross;

    if (!oldEmp) {
      detailedChanges.push({
        empId, name: newEmp['Name'], type: 'NEW_EMPLOYEE', 
        grossDelta: newGross, netDelta: newNet, breakdown: {}
      });
      return;
    }

    const oldGross = oldEmp['T.Pay'] || 0;
    const oldNet = oldEmp['Net Pay'] || 0;
    totalOldGross += oldGross;
    
    const grossDelta = Math.round((newGross - oldGross) * 100) / 100;
    const netDelta = Math.round((newNet - oldNet) * 100) / 100;

    const breakdown = {};
    let hasComponentShift = false;

    salaryComponents.forEach(component => {
      const oldVal = oldEmp[component] || 0;
      const newVal = newEmp[component] || 0;
      const delta = Math.round((newVal - oldVal) * 100) / 100;

      if (Math.abs(delta) > 0) {
        hasComponentShift = true;
        breakdown[component] = {
          old: oldVal, new: newVal, delta: delta,
          pct: oldVal !== 0 ? ((delta / oldVal) * 100).toFixed(1) : 100
        };
      }
    });

    if (Math.abs(grossDelta) > 0 || Math.abs(netDelta) > 0 || hasComponentShift) {
      detailedChanges.push({
        empId, name: newEmp['Name'], type: 'MODIFIED', oldGross, newGross, grossDelta, netDelta, breakdown
      });
    }
  });

  oldMap.forEach((oldEmp, empId) => {
    if (!processedEmpIds.has(empId)) {
      const oldGross = oldEmp['T.Pay'] || 0;
      const oldNet = oldEmp['Net Pay'] || 0;
      totalOldGross += oldGross;
      detailedChanges.push({
        empId, name: oldEmp['Name'], type: 'DEPARTED', 
        oldGross: oldGross, newGross: 0, grossDelta: -oldGross, netDelta: -oldNet, breakdown: {}
      });
    }
  });

  return {
    summary: {
      totalOldGross, totalNewGross,
      netVariance: totalNewGross - totalOldGross,
      pctChange: totalOldGross !== 0 ? ((totalNewGross - totalOldGross) / totalOldGross * 100).toFixed(2) : 0,
      totalAudited: Math.max(oldData.length, newData.length)
    },
    changes: detailedChanges
  };
};