// --- Data Management ---
let draftData = [];
let finalData = JSON.parse(localStorage.getItem('ultra_v6_data')) || [];
let grandReportData = JSON.parse(localStorage.getItem('ultra_v6_report')) || [];
let limits = JSON.parse(localStorage.getItem('lotto_limits')) || {};

const types = ["2ตัวบน", "2ตัวล่าง", "3ตัวบน", "3ตัวโต๊ด", "3ตัวล่าง"];

// --- 1. หน้า Index: Logic การคีย์และการแสดงผล ---
function initKeypadLogic() {
    const numInp = document.getElementById('num');
    if (!numInp) return;

    numInp.addEventListener('input', () => {
        const tod = document.getElementById('tod');
        const val = numInp.value.replace('*','');
        if (val.length === 2) {
            tod.disabled = true;
            tod.value = "";
        } else {
            tod.disabled = false;
        }
    });

    const ins = [document.getElementById('sessionName'), document.getElementById('num'), document.getElementById('top'), document.getElementById('tod'), document.getElementById('down')];
    ins.forEach((el, i) => {
        if(el) {
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    let next = i + 1;
                    while (next < ins.length && ins[next].disabled) next++;
                    if (next < ins.length) ins[next].focus();
                    else addToDraft();
                }
            });
        }
    });
}

function addToDraft() {
    const session = document.getElementById('sessionName').value.trim() || "ไม่ระบุชื่อ";
    const n = document.getElementById('num').value.trim();
    if(!n) return;
    
    let isRev = n.includes('*');
    let base = n.replace('*', '');
    let nums = isRev ? getPermutations(base) : [base];

    const t = parseFloat(document.getElementById('top').value) || 0;
    const td = parseFloat(document.getElementById('tod').value) || 0;
    const d = parseFloat(document.getElementById('down').value) || 0;

    nums.forEach(num => {
        draftData.push({ session, n: num, t, td, d });
    });

    renderDraft();
    document.getElementById('num').value = '';
    document.getElementById('top').value = '';
    document.getElementById('tod').value = '';
    document.getElementById('down').value = '';
    document.getElementById('num').focus();
}

function renderDraft() {
    let html = '';
    draftData.forEach((r, i) => {
        html += `<tr>
            <td><strong>${r.n}</strong></td>
            <td><input type="number" class="draft-input" value="${r.t}" onchange="updateDraft(${i},'t',this.value)"></td>
            <td><input type="number" class="draft-input" value="${r.td}" ${r.n.length===2?'disabled':''} onchange="updateDraft(${i},'td',this.value)"></td>
            <td><input type="number" class="draft-input" value="${r.d}" onchange="updateDraft(${i},'d',this.value)"></td>
            <td style="text-align:center"><button onclick="draftData.splice(${i},1);renderDraft()" style="color:var(--red); border:none; background:none; cursor:pointer; font-weight:bold;">✕</button></td>
        </tr>`;
    });
    const body = document.getElementById('draftBody');
    if(body) body.innerHTML = html;
    const btn = document.getElementById('submitBtn');
    if(btn) btn.style.display = draftData.length > 0 ? 'block' : 'none';
}

function updateDraft(idx, field, val) {
    draftData[idx][field] = parseFloat(val) || 0;
    renderDraft();
}

function submitToFinal() {
    const billId = new Date().getTime();
    const session = document.getElementById('sessionName').value.trim() || "ไม่ระบุชื่อ";
    const dateStr = new Date().toLocaleString('th-TH');
    
    draftData.forEach(item => {
        let pref = item.n.length === 3 ? "3ตัว" : "2ตัว";
        const entry = (type, amt) => {
            if(amt > 0) {
                const data = { billId, session, type, n: item.n, amt, displayDate: dateStr, timestamp: new Date().getTime() };
                finalData.push(data);
                grandReportData.push(data);
            }
        };
        entry(pref+'บน', item.t); 
        entry(pref+'โต๊ด', item.td); 
        entry(pref+'ล่าง', item.d);
    });

    localStorage.setItem('ultra_v6_data', JSON.stringify(finalData));
    localStorage.setItem('ultra_v6_report', JSON.stringify(grandReportData));
    draftData = []; renderDraft(); renderFinal();
}

function renderFinal() {
    const container = document.getElementById('billContainer');
    if(!container) return;
    
    let grouped = {};
    finalData.forEach(item => {
        if(!grouped[item.billId]) grouped[item.billId] = { session: item.session, date: item.displayDate, items: [] };
        grouped[item.billId].items.push(item);
    });

    let html = '', totalAll = 0;
    Object.keys(grouped).sort((a,b) => b-a).forEach(id => {
        let bill = grouped[id];
        let billSum = bill.items.reduce((s, c) => s + c.amt, 0);
        totalAll += billSum;

        html += `
        <div class="bill-card" style="margin-bottom:12px;">
            <div class="bill-header-index" onclick="toggleIdxBody('body-${id}')" style="cursor:pointer; padding:12px; background:var(--card-header); display:flex; justify-content:space-between; align-items:center;">
                <span>👤 <b>${bill.session}</b> | <span style="color:var(--blue)">฿ ${billSum.toLocaleString()}</span></span>
                <div>
                    <small style="margin-right:10px; font-weight:normal;">${bill.date}</small>
                    <button class="btn-del" onclick="event.stopPropagation(); deleteBill('${id}')">ลบ</button>
                </div>
            </div>
            <div id="body-${id}" class="bill-body" style="display: block; padding:10px;">
                <table style="width:100%; font-size:14px;">
                    <tbody>
                        ${bill.items.map(i => `
                            <tr>
                                <td style="width:40%">${i.type}</td>
                                <td style="width:30%; font-weight:bold;">${i.n}</td>
                                <td style="width:30%; text-align:right; font-weight:bold; color:var(--blue);">${i.amt.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    });
    container.innerHTML = html;
    if(document.getElementById('totalAmt')) document.getElementById('totalAmt').innerText = totalAll.toLocaleString();
}

function toggleIdxBody(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}

function deleteBill(id) {
    if(!confirm('ลบโพยนี้?')) return;
    finalData = finalData.filter(f => f.billId != id);
    grandReportData = grandReportData.filter(g => g.billId != id);
    localStorage.setItem('ultra_v6_data', JSON.stringify(finalData));
    localStorage.setItem('ultra_v6_report', JSON.stringify(grandReportData));
    renderFinal();
}

// --- 2. หน้า Check: รายงานสะสม (แก้ไขลำดับและ Alignment) ---
function renderReport() {
    const body = document.getElementById('reportBody');
    if(!body) return;
    
    let summary = {}; 
    grandReportData.forEach(item => {
        let key = item.n + "_" + item.type;
        if(!summary[key]) summary[key] = { n: item.n, type: item.type, amt: 0 };
        summary[key].amt += item.amt;
    });
    
    let summaryArray = Object.values(summary).sort((a,b) => a.n.localeCompare(b.n));
    let html = '';
    summaryArray.forEach(r => {
        let limit = limits[r.type] || 0;
        let diff = r.amt - limit;
        let isOver = limit > 0 && diff > 0;
        
        html += `<tr>
            <td style="text-align: left; padding-left:20px;"><strong>${r.n}</strong></td>
            <td style="text-align: center;"><span class="badge">${r.type}</span></td>
            <td style="text-align: right; font-weight:bold;">${r.amt.toLocaleString()}</td>
            <td style="text-align: right; color:#64748b;">${limit > 0 ? limit.toLocaleString() : '-'}</td>
            <td style="text-align: right; color:var(--red); font-weight:800; padding-right:20px;">${isOver ? diff.toLocaleString() : '-'}</td>
        </tr>`;
    });
    body.innerHTML = html || '<tr><td colspan="5" style="text-align:center;">ไม่มีข้อมูลสะสม</td></tr>';
}

// --- 3. หน้า Money: สรุปยอดรายคน (แก้ไขช่องว่าง Expand) ---
function renderMoneyReport() {
    const container = document.getElementById('moneyList');
    if(!container) return;
    let customers = {};
    finalData.forEach(item => {
        if(!customers[item.session]) customers[item.session] = { total: 0, bills: {} };
        customers[item.session].total += item.amt;
        if(!customers[item.session].bills[item.billId]) customers[item.session].bills[item.billId] = [];
        customers[item.session].bills[item.billId].push(item);
    });

    let html = '';
    Object.keys(customers).forEach((name, idx) => {
        let cust = customers[name];
        html += `<div class="money-box" style="margin-bottom:10px; border:1px solid var(--border); border-radius:12px; overflow:hidden; background:white;">
            <div class="money-header" onclick="toggleElement('detail-${idx}')" style="cursor:pointer; padding:15px; display:flex; justify-content:space-between; align-items:center;">
                <span class="cust-name">👤 <b>${name}</b></span>
                <span class="cust-total" style="color:var(--blue); font-weight:bold; font-size:18px;">฿ ${cust.total.toLocaleString()}</span>
            </div>
            <div id="detail-${idx}" class="money-detail" style="display:none; padding:10px; background:#f8fafc; border-top:1px solid var(--border);">
                ${Object.keys(cust.bills).map(bid => `
                    <div style="margin-bottom:10px; border:1px solid #e2e8f0; border-radius:8px; background:white; overflow:hidden;">
                        <div style="font-size:11px; background:#f1f5f9; padding:5px 12px; border-bottom:1px solid #e2e8f0; color:#64748b; display:flex; justify-content:space-between;">
                            <span>📅 ${cust.bills[bid][0].displayDate}</span>
                            <span>ID: ${bid}</span>
                        </div>
                        <table style="width:100%; border-collapse:collapse;">
                            ${cust.bills[bid].map(line => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:8px 12px;">${line.type} <b>${line.n}</b></td>
                                    <td style="text-align:right; padding:8px 12px; font-weight:bold; color:var(--blue);">฿${line.amt.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                `).join('')}
            </div>
        </div>`;
    });
    container.innerHTML = html || '<p style="grid-column: 1/-1; text-align:center; color:#94a3b8;">ยังไม่มีข้อมูล</p>';
}

function toggleElement(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
}

// --- 4. หน้า Limit Setting ---
function renderSettings() {
    const container = document.getElementById('settingsContainer');
    if(!container) return;
    let html = '';
    types.forEach((t, i) => {
        html += `<div style="margin-bottom:15px;">
            <label>${t}</label>
            <input type="number" class="limit-input" id="limit_${t}" data-index="${i}" value="${limits[t]||''}" placeholder="ไม่จำกัด">
        </div>`;
    });
    container.innerHTML = html;

    const limitInputs = document.querySelectorAll('.limit-input');
    limitInputs.forEach(inp => {
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                let nextIdx = parseInt(inp.getAttribute('data-index')) + 1;
                if (nextIdx < limitInputs.length) limitInputs[nextIdx].focus();
                else saveSettings();
            }
        });
    });
}

function saveSettings() {
    types.forEach(t => { 
        limits[t] = parseFloat(document.getElementById(`limit_${t}`).value) || 0; 
    });
    localStorage.setItem('lotto_limits', JSON.stringify(limits));
    alert('บันทึกเรียบร้อย');
    renderSettings();
}

function clearLimits() {
    if(confirm('ยืนยันล้างเพดานทั้งหมดให้เป็น "ไม่จำกัด" ใช่หรือไม่?')) {
        limits = {};
        localStorage.removeItem('lotto_limits');
        renderSettings();
        alert('ล้างค่าเพดานเรียบร้อยแล้ว');
    }
}

// --- Helpers ---
function getPermutations(s) {
    let res = new Set();
    if (s.length === 2) { res.add(s); res.add(s[1] + s[0]); }
    else if (s.length === 3) {
        let arr = s.split('');
        for(let i=0; i<3; i++) for(let j=0; j<3; j++) for(let k=0; k<3; k++)
            if(i!==j && j!==k && i!==k) res.add(arr[i]+arr[j]+arr[k]);
    } else { res.add(s); }
    return Array.from(res);
}

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(finalData.map(i => ({ "วันที่": i.displayDate, "ลูกค้า": i.session, "เลข": i.n, "ประเภท": i.type, "ยอด": i.amt })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "โพยรวมรายลูกค้า.xlsx");
}

function exportReportToExcel() {
    let summary = {}; 
    grandReportData.forEach(item => {
        let key = item.n + "_" + item.type;
        if(!summary[key]) summary[key] = { n: item.n, type: item.type, amt: 0 };
        summary[key].amt += item.amt;
    });
    const ws = XLSX.utils.json_to_sheet(Object.values(summary).map(i => ({ "เลข": i.n, "ประเภท": i.type, "รวม": i.amt, "เกิน": Math.max(0, i.amt - (limits[i.type] || 0)) })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Check");
    XLSX.writeFile(wb, "รายงานสะสม.xlsx");
}

function clearGrandReport() { if(confirm('ล้างข้อมูลโพยทั้งหมดในงวดนี้? (ไม่รวมเพดาน)')){ 
    finalData = []; grandReportData = [];
    localStorage.removeItem('ultra_v6_data');
    localStorage.removeItem('ultra_v6_report');
    location.reload(); 
} }