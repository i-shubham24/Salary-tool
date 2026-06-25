// src/utils/auditEngine.js

export const performSalaryAudit = (oldData, newData) => {
  const oldMap = new Map();
  
  oldData.forEach(item => {
    // Highly flexible ID targeting based on what the AI extracts
    const empId = item['Employee ID'] || item['Emp No'] || item['ID'];
    if (empId) oldMap.set(String(empId).trim(), item);
  });

  let totalOldGross = 0;
  let totalNewGross = 0;
  const detailedChanges = [];
  const processedEmpIds = new Set();

  // Strict Number Sanitizer (Fixes the comma and floating point bugs)
  const parseAmt = (val) => {
    if (val === undefined || val === null) return 0;
    const cleaned = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
  };

  newData.forEach(newEmp => {
    const empId = String(newEmp['Employee ID'] || newEmp['Emp No'] || newEmp['ID'] || '').trim();
    if (!empId) return;

    processedEmpIds.add(empId);
    const oldEmp = oldMap.get(empId);

    // Dynamically locate the Gross (T.Pay) and Net columns regardless of slight AI naming changes
    const grossKey = Object.keys(newEmp).find(k => k.toLowerCase().includes('t.pay') || k.toLowerCase().includes('gross')) || 'T.Pay';
    const netKey = Object.keys(newEmp).find(k => k.toLowerCase().includes('net')) || 'Net Pay';

    const newGross = parseAmt(newEmp[grossKey]);
    totalNewGross += newGross;

    if (!oldEmp) {
      detailedChanges.push({
        empId, name: newEmp['Name'] || 'Unknown', type: 'NEW_EMPLOYEE', 
        grossDelta: newGross, netDelta: parseAmt(newEmp[netKey]), breakdown: {}
      });
      return;
    }

    const oldGross = parseAmt(oldEmp[grossKey]);
    totalOldGross += oldGross;
    
    // Strict rounding to 2 decimal places to prevent 0.00000001 triggers
    const grossDelta = Math.round((newGross - oldGross) * 100) / 100;
    const netDelta = Math.round((parseAmt(newEmp[netKey]) - parseAmt(oldEmp[netKey])) * 100) / 100;

    const breakdown = {};
    let hasComponentShift = false;

    // DYNAMIC EXTRACTION: Find EVERY key present in either the old or new month
    const allKeys = new Set([...Object.keys(oldEmp), ...Object.keys(newEmp)]);
    
    // Remove non-financial or top-level keys from the breakdown grid
    ['Employee ID', 'Emp No', 'ID', 'Name', 'Month', 'Days'].forEach(k => allKeys.delete(k));

    allKeys.forEach(component => {
      const oldVal = parseAmt(oldEmp[component]);
      const newVal = parseAmt(newEmp[component]);
      const delta = Math.round((newVal - oldVal) * 100) / 100;

      // Only flag it if there is a TRUE mathematical difference greater than 0
      if (Math.abs(delta) > 0) {
        hasComponentShift = true;
        breakdown[component] = {
          old: oldVal, new: newVal, delta: delta,
          pct: oldVal !== 0 ? ((delta / oldVal) * 100).toFixed(1) : 100
        };
      }
    });

    // If there is ANY real shift, log the employee
    if (Math.abs(grossDelta) > 0 || Math.abs(netDelta) > 0 || hasComponentShift) {
      detailedChanges.push({
        empId, name: newEmp['Name'] || oldEmp['Name'] || 'Unknown', 
        type: 'MODIFIED', oldGross, newGross, grossDelta, netDelta, breakdown
      });
    }
  });

  // Sweep for Departed Employees
  oldMap.forEach((oldEmp, empId) => {
    if (!processedEmpIds.has(empId)) {
      const oldGross = parseAmt(oldEmp['T.Pay'] || oldEmp['Gross Salary']);
      totalOldGross += oldGross;
      detailedChanges.push({
        empId, name: oldEmp['Name'] || 'Unknown', type: 'DEPARTED', 
        oldGross: oldGross, newGross: 0, grossDelta: -oldGross, netDelta: -parseAmt(oldEmp['Net Pay']), breakdown: {}
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