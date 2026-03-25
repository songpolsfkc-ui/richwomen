// --- Data Management ---
let draftData = [];
let finalData = JSON.parse(localStorage.getItem('ultra_v6_data')) || [];
let grandReportData = JSON.parse(localStorage.getItem('ultra_v6_report')) || [];
let limits = JSON.parse(localStorage.getItem('lotto_limits')) || {};
let discounts = JSON.parse(localStorage.getItem('lotto_discounts')) || {}; 

const types = ["2ตัวบน", "2ตัวล่าง", "3ตัวบน", "3ตัวโต๊ด", "3ตัวล่าง", "วิ่งบน", "วิ่งล่าง"];

// --- 1. หน้า Index: Logic การคีย์และการแสดงผล ---
function initKeypadLogic() {
    const numInp = document.getElementById('num');
    if (!numInp) return;

    numInp.addEventListener('input', () => {
        const tod = document.getElementById('tod');
        const val = numInp.value.replace('*','');
        if (val.length === 1 || val.length === 2) {
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
    document.getElementById('tod').disabled = false;
}

function renderDraft() {
    let html = '';
    draftData.forEach((r, i) => {
        html += `<tr>
            <td><strong>${r.n}</strong></td>
            <td><input type="number" class="draft-input" value="${r.t}" onchange="updateDraft(${i},'t',this.value)"></td>
            <td><input type="number" class="draft-input" value="${r.td}" ${r.n.length < 3 ? 'disabled' : ''} onchange="updateDraft(${i},'td',this.value)"></td>
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
        let pref = "";
        if (item.n.length === 3) pref = "3ตัว";
        else if (item.n.length === 2) pref = "2ตัว";
        else if (item.n.length === 1) pref = "วิ่ง";

        const entry = (type, amt) => {
            if(amt > 0) {
                const data = { billId, session, type, n: item.n, amt, displayDate: dateStr, timestamp: new Date().getTime() };
                finalData.push(data);
                grandReportData.push(data);
            }
        };

        if (pref === "วิ่ง") {
            entry('วิ่งบน', item.t); 
            entry('วิ่งล่าง', item.d);
        } else {
            entry(pref+'บน', item.t); 
            entry(pref+'โต๊ด', item.td); 
            entry(pref+'ล่าง', item.d);
        }
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
                    <small style="margin-right:10px;">${bill.date}</small>
                    <button class="btn-del" onclick="event.stopPropagation(); deleteBill('${id}')">ลบ</button>
                </div>
            </div>
            <div id="body-${id}" class="bill-body" style="display: block; padding:10px;">
                <table style="width:100%;">
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

function deleteBill(id) {
    if(!confirm('ลบโพยนี้?')) return;
    finalData = finalData.filter(f => f.billId != id);
    grandReportData = grandReportData.filter(g => g.billId != id);
    localStorage.setItem('ultra_v6_data', JSON.stringify(finalData));
    localStorage.setItem('ultra_v6_report', JSON.stringify(grandReportData));
    renderFinal();
}

// --- 2. หน้า Check: รายงานสะสม ---
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
        html += `<tr><td style="text-align: left; padding-left:20px;"><strong>${r.n}</strong></td><td style="text-align: center;"><span class="badge">${r.type}</span></td><td style="text-align: right; font-weight:bold;">${r.amt.toLocaleString()}</td><td style="text-align: right;">${limit > 0 ? limit.toLocaleString() : '-'}</td><td style="text-align: right; color:var(--red); font-weight:800;">${isOver ? diff.toLocaleString() : '-'}</td></tr>`;
    });
    body.innerHTML = html || '<tr><td colspan="5" style="text-align:center;">ไม่มีข้อมูล</td></tr>';
}

// --- 3. หน้า Money: สรุปยอดรายคน + พิมพ์ PDF ---
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
    const discountOptions = [0, 5, 10, 15, 20, 25, 28];

    Object.keys(customers).forEach((name, idx) => {
        let cust = customers[name];
        let currentDiscount = discounts[name] || 0;
        let discountedTotal = cust.total * (1 - (currentDiscount / 100));

        html += `
        <div class="money-box" style="margin-bottom:15px; border:1px solid var(--border); border-radius:12px; overflow:hidden; background:white;">
            <div class="money-header" style="padding:15px; display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #f1f5f9;">
                <div onclick="toggleElement('detail-${idx}')" style="cursor:pointer; flex:1;">
                    <span class="cust-name" style="font-size:16px;">👤 <b>${name}</b></span><br>
                    <small style="color:#64748b;">ยอดเต็ม: ฿${cust.total.toLocaleString()}</small>
                    ${currentDiscount > 0 ? `<small style="color:#ef4444; margin-left:8px; font-weight:bold;">(ลด ${currentDiscount}%)</small>` : ''}
                    <br><button class="print-btn" style="background:#6366f1; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold; margin-top:8px;" onclick="event.stopPropagation(); printCustomerPDF('${name}')">📄 พิมพ์ PDF</button>
                </div>
                <div style="text-align:right;">
                    <span class="cust-total" style="color:var(--blue); font-weight:bold; font-size:22px;">฿ ${Math.round(discountedTotal).toLocaleString()}</span>
                </div>
            </div>
            
            <div style="padding: 12px 15px; background: #fff; border-bottom: 1px solid #f1f5f9;">
                <label style="font-size:11px; margin-bottom:8px; display:block; color:#94a3b8; font-weight:600;">เลือกส่วนลด:</label>
                <div class="discount-group" style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${discountOptions.map(ds => `<button onclick="applyDiscount('${name}', ${ds})" class="discount-btn ${currentDiscount === ds ? 'active' : ''}">${ds === 0 ? '❌' : ds + '%'}</button>`).join('')}
                </div>
            </div>

            <div id="detail-${idx}" class="money-detail" style="display:none; padding:10px; background:#f8fafc;">
                ${Object.keys(cust.bills).map(bid => `
                    <div style="margin-bottom:10px; border:1px solid #e2e8f0; border-radius:8px; background:white; overflow:hidden;">
                        <div style="font-size:11px; background:#f1f5f9; padding:5px 12px; border-bottom:1px solid #e2e8f0; color:#64748b; display:flex; justify-content:space-between;">
                            <span>📅 ${cust.bills[bid][0].displayDate}</span>
                            <span>ID: ${bid}</span>
                        </div>
                        <table style="width:100%;">
                            ${cust.bills[bid].map(line => `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 12px;">${line.type} <b>${line.n}</b></td><td style="text-align:right; padding:8px 12px; font-weight:bold; color:var(--blue);">฿${line.amt.toLocaleString()}</td></tr>`).join('')}
                        </table>
                    </div>
                `).join('')}
            </div>
        </div>`;
    });
    container.innerHTML = html || '<p style="text-align:center; color:#94a3b8;">ยังไม่มีข้อมูล</p>';
}

function printCustomerPDF(name) {
    let customerData = finalData.filter(i => i.session === name);
    if(customerData.length === 0) return;

    let bills = {};
    let totalAmt = 0;
    customerData.forEach(i => {
        if(!bills[i.billId]) bills[i.billId] = [];
        bills[i.billId].push(i);
        totalAmt += i.amt;
    });

    let discountPercent = discounts[name] || 0;
    let discountValue = totalAmt * (discountPercent / 100);
    let finalTotal = totalAmt - discountValue;

    let printHTML = `<div id="printSection">`;
    printHTML += `<h2 style="margin-bottom:5px;">ชื่อลูกค้า: ${name}</h2>`;
    printHTML += `<p style="font-size:18px; margin:0;"><b>ยอดรวมทั้งหมด: ฿${totalAmt.toLocaleString()}</b></p>`;
    if(discountPercent > 0) {
        printHTML += `<p style="color:red; margin:0;">ส่วนลด ${discountPercent}%: -฿${discountValue.toLocaleString()}</p>`;
        printHTML += `<p style="font-size:20px; margin:5px 0 20px 0; border-bottom:2px solid black; padding-bottom:10px;"><b>ยอดสุทธิที่ต้องชำระ: ฿${Math.round(finalTotal).toLocaleString()}</b></p>`;
    } else {
        printHTML += `<div style="border-bottom:2px solid black; margin-bottom:20px;"></div>`;
    }

    Object.keys(bills).forEach(bid => {
        let items = bills[bid];
        printHTML += `<div style="margin-bottom:20px; page-break-inside: avoid;">`;
        printHTML += `<div style="background:#eee; padding:5px;"><b>บิล ID: ${bid}</b> (วันที่ ${items[0].displayDate})</div>`;
        printHTML += `<table style="width:100%; border-collapse:collapse; margin-top:5px;">`;
        items.forEach(item => {
            printHTML += `<tr>
                <td style="padding:4px; border-bottom:1px solid #ccc;">${item.type} <b>${item.n}</b></td>
                <td style="padding:4px; border-bottom:1px solid #ccc; text-align:right;">${item.amt.toLocaleString()}</td>
            </tr>`;
        });
        printHTML += `</table></div>`;
    });

    printHTML += `<div style="text-align:center; margin-top:40px; font-weight:bold; border-top:1px dashed #000; padding-top:20px;">
                    ขอบคุณที่ใช้บริการ Rich Women
                  </div>`;
    printHTML += `</div>`;

    let oldPrint = document.getElementById('printSection');
    if(oldPrint) oldPrint.remove();
    
    document.body.insertAdjacentHTML('beforeend', printHTML);

    // ป้องกันหน้า PDF ค้างหลังจากปริ้นเสร็จ
    window.onafterprint = function() {
        let ps = document.getElementById('printSection');
        if(ps) ps.remove();
    };

    window.print();
}

function applyDiscount(customerName, percent) {
    discounts[customerName] = percent;
    localStorage.setItem('lotto_discounts', JSON.stringify(discounts));
    renderMoneyReport();
}

function toggleElement(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
}

function toggleIdxBody(id) {
    const el = document.getElementById(id);
    if(el) el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}

// --- 4. หน้า Limit Setting ---
function renderSettings() {
    const container = document.getElementById('settingsContainer');
    if(!container) return;
    let html = '';
    types.forEach((t, i) => {
        html += `<div style="margin-bottom:15px;"><label>${t}</label><input type="number" class="limit-input" id="limit_${t}" data-index="${i}" value="${limits[t]||''}" placeholder="ไม่จำกัด"></div>`;
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
    types.forEach(t => { limits[t] = parseFloat(document.getElementById(`limit_${t}`).value) || 0; });
    localStorage.setItem('lotto_limits', JSON.stringify(limits));
    alert('บันทึกเรียบร้อย');
    renderSettings();
}
s
function clearLimits() {
    if(confirm('ยืนยันล้างเพดานทั้งหมดให้เป็น "ไม่จำกัด" ใช่หรือไม่?')) {
        // 1. ล้างตัวแปรในโปรแกรม
        limits = {}; 
        // 2. ล้างค่าที่บันทึกไว้ใน Browser
        localStorage.removeItem('lotto_limits');
        // 3. สั่งวาดช่อง Input ใหม่ให้เป็นค่าว่าง
        renderSettings(); 
        alert('ล้างค่าเพดานเรียบร้อยแล้ว');
    }
}

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

function clearGrandReport() { if(confirm('ล้างข้อมูลโพยทั้งหมดในงวดนี้?')){ 
    finalData = []; grandReportData = [];
    localStorage.removeItem('ultra_v6_data');
    localStorage.removeItem('ultra_v6_report');
    location.reload(); 
} }

window.onload = () => {
    initKeypadLogic(); renderFinal(); renderReport(); renderSettings(); renderMoneyReport();
};