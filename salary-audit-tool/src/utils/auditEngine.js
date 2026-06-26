// src/utils/auditEngine.js

export const performSalaryAudit = (oldData, newData) => {
  const oldMap = new Map();
  
  oldData.forEach(item => {
    const empId = item['Employee ID'] || item['Emp No'] || item['ID'];
    if (empId) oldMap.set(String(empId).trim(), item);
  });

  let totalOldGross = 0;
  let totalNewGross = 0;
  const detailedChanges = [];
  const processedEmpIds = new Set();

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

    const grossKey = Object.keys(newEmp).find(k => k.toLowerCase().includes('t.pay') || k.toLowerCase().includes('gross')) || 'T.Pay';
    const netKey = Object.keys(newEmp).find(k => k.toLowerCase().includes('net')) || 'Net Pay';

    const newGross = parseAmt(newEmp[grossKey]);
    totalNewGross += newGross;

    if (!oldEmp) {
      detailedChanges.push({
        empId, name: newEmp['Name'] || 'Unknown', type: 'NEW_EMPLOYEE', 
        grossDelta: newGross, netDelta: parseAmt(newEmp[netKey]), 
        oldMonth: '-', newMonth: newEmp['Month'] || 'Current', oldDays: 0, newDays: parseAmt(newEmp['Days']), breakdown: {}
      });
      return;
    }

    const oldGross = parseAmt(oldEmp[grossKey]);
    totalOldGross += oldGross;
    
    const grossDelta = Math.round((newGross - oldGross) * 100) / 100;
    const netDelta = Math.round((parseAmt(newEmp[netKey]) - parseAmt(oldEmp[netKey])) * 100) / 100;

    // Grab the timeline context
    const oldMonth = oldEmp['Month'] || 'Month 1';
    const newMonth = newEmp['Month'] || 'Month 2';
    const oldDays = parseAmt(oldEmp['Days']);
    const newDays = parseAmt(newEmp['Days']);

    const breakdown = {};
    let hasComponentShift = false;

    const allKeys = new Set([...Object.keys(oldEmp), ...Object.keys(newEmp)]);
    
    // Crucial: Delete Month and Days so they don't get processed as regular money
    ['Employee ID', 'Emp No', 'ID', 'Name', 'Month', 'Days'].forEach(k => allKeys.delete(k));

    allKeys.forEach(component => {
      const oldVal = parseAmt(oldEmp[component]);
      const newVal = parseAmt(newEmp[component]);
      const delta = Math.round((newVal - oldVal) * 100) / 100;

      if (Math.abs(delta) > 0) {
        hasComponentShift = true;
        breakdown[component] = {
          old: oldVal, new: newVal, delta: delta,
          pct: oldVal !== 0 ? ((delta / oldVal) * 100).toFixed(1) : 100
        };
      }
    });

    // FIXED: Removed the `oldDays !== newDays` trigger. 
    // Now, employees ONLY appear if there is a true financial change.
    if (Math.abs(grossDelta) > 0 || Math.abs(netDelta) > 0 || hasComponentShift) {
      detailedChanges.push({
        empId, name: newEmp['Name'] || oldEmp['Name'] || 'Unknown', 
        type: 'MODIFIED', oldGross, newGross, grossDelta, netDelta, 
        oldMonth, newMonth, oldDays, newDays, breakdown
      });
    }
  });

  oldMap.forEach((oldEmp, empId) => {
    if (!processedEmpIds.has(empId)) {
      const oldGross = parseAmt(oldEmp['T.Pay'] || oldEmp['Gross Salary']);
      totalOldGross += oldGross;
      detailedChanges.push({
        empId, name: oldEmp['Name'] || 'Unknown', type: 'DEPARTED', 
        oldGross: oldGross, newGross: 0, grossDelta: -oldGross, netDelta: -parseAmt(oldEmp['Net Pay']),
        oldMonth: oldEmp['Month'] || 'Previous', newMonth: '-', oldDays: parseAmt(oldEmp['Days']), newDays: 0, breakdown: {}
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