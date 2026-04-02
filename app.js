// --- Data Management ---
let draftData = [];
let finalData = JSON.parse(localStorage.getItem('ultra_v6_data')) || [];
let grandReportData = JSON.parse(localStorage.getItem('ultra_v6_report')) || [];
let limits = JSON.parse(localStorage.getItem('lotto_limits')) || {};
let discounts = JSON.parse(localStorage.getItem('lotto_discounts')) || {}; 

const types = ["2ตัวบน", "2ตัวล่าง", "3ตัวบน", "3ตัวโต๊ด", "3ตัวล่าง", "วิ่งบน", "วิ่งล่าง"];

// --- 1. หน้า Index: Logic การคีย์และการแสดงผล (ฉบับปรับปรุง) ---

function initKeypadLogic() {
    const numInp = document.getElementById('num');
    const todInp = document.getElementById('tod');
    const downInp = document.getElementById('down');
    
    if (!numInp) return;

    numInp.addEventListener('input', () => {
        const val = numInp.value.replace('*','');
        // Logic: ถ้าเป็นเลข 3 หลัก ให้ปิดช่อง "ล่าง" (สีทึบ)
        if (val.length === 3) {
            downInp.disabled = true;
            downInp.value = "";
            downInp.style.backgroundColor = "#e9ecef"; // ทำสีทึบ
            
            todInp.disabled = false;
            todInp.style.backgroundColor = "";
        } 
        // Logic: ถ้าเป็นเลข 1 หรือ 2 หลัก ให้ปิดช่อง "โต๊ด"
        else if (val.length === 1 || val.length === 2) {
            todInp.disabled = true;
            todInp.value = "";
            todInp.style.backgroundColor = "#e9ecef"; // ทำสีทึบ
            
            downInp.disabled = false;
            downInp.style.backgroundColor = "";
        } else {
            todInp.disabled = false;
            downInp.disabled = false;
            todInp.style.backgroundColor = "";
            downInp.style.backgroundColor = "";
        }
    });

    const ins = [
        document.getElementById('sessionName'), 
        document.getElementById('num'), 
        document.getElementById('top'), 
        document.getElementById('tod'), 
        document.getElementById('down')
    ];

    ins.forEach((el, i) => {
        if(el) {
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    let next = i + 1;
                    // ข้ามช่องที่ถูก disabled
                    while (next < ins.length && ins[next].disabled) next++;
                    
                    if (next < ins.length) {
                        ins[next].focus();
                    } else {
                        addToDraft();
                    }
                }
            });
        }
    });
}

function addToDraft() {
    const session = document.getElementById('sessionName').value.trim() || "ไม่ระบุชื่อ";
    const numEl = document.getElementById('num');
    const n = numEl.value.trim();
    
    if(!n) return;
    
    let isRev = n.includes('*');
    let base = n.replace('*', '');
    let nums = isRev ? getPermutations(base) : [base];

    const t = parseFloat(document.getElementById('top').value) || 0;
    const td = parseFloat(document.getElementById('tod').value) || 0;
    const d = parseFloat(document.getElementById('down').value) || 0;

    nums.forEach(num => {
        // เพิ่มข้อมูลลงใน draftData
        draftData.push({ session, n: num, t, td, d });
    });

    renderDraft();

    // แก้ไข: ค้างราคาสุดไว้ เคลียร์เฉพาะช่องตัวเลข
    numEl.value = '';
    numEl.focus();
    
    // รีเซ็ตสถานะการ disabled เบื้องต้น
    document.getElementById('tod').disabled = false;
    document.getElementById('down').disabled = false;
    document.getElementById('tod').style.backgroundColor = "";
    document.getElementById('down').style.backgroundColor = "";
}

function renderDraft() {
    let html = '';
    draftData.forEach((r, i) => {
        // ถอดเงื่อนไข disabled ออก เพื่อให้ในตารางพักสามารถแก้ไขได้อิสระทุกช่อง
        html += `<tr>
            <td><strong>${r.n}</strong></td>
            <td>
                <input type="number" class="draft-input" value="${r.t}" 
                    onchange="updateDraft(${i},'t',this.value)">
            </td>
            <td>
                <input type="number" class="draft-input" value="${r.td}" 
                    onchange="updateDraft(${i},'td',this.value)">
            </td>
            <td>
                <input type="number" class="draft-input" value="${r.d}" 
                    onchange="updateDraft(${i},'d',this.value)">
            </td>
            <td style="text-align:center">
                <button onclick="deleteDraftItem(${i})" 
                    style="color:var(--red); border:none; background:none; cursor:pointer; font-size:18px;">✕</button>
            </td>
        </tr>`;
    });
    
    const body = document.getElementById('draftBody');
    if(body) body.innerHTML = html;
    
    const btn = document.getElementById('submitBtn');
    if(btn) btn.style.display = draftData.length > 0 ? 'block' : 'none';
}

function deleteDraftItem(index) {
    draftData.splice(index, 1);
    renderDraft();
}

function updateDraft(idx, field, val) {
    draftData[idx][field] = parseFloat(val) || 0;
    // ไม่ต้อง renderDraft ใหม่ทั้งหมดเพื่อประหยัดทรัพยากร ยกเว้นต้องการอัปเดต UI ทันที
}

function submitToFinal() {
    const billId = new Date().getTime(); // ID สำหรับรวมกลุ่มบิล
    const session = document.getElementById('sessionName').value.trim() || "ไม่ระบุชื่อ";
    const dateStr = new Date().toLocaleString('th-TH');
    
    draftData.forEach((item, index) => { // เพิ่ม index เข้ามาช่วย
        let pref = "";
        if (item.n.length === 3) pref = "3ตัว";
        else if (item.n.length === 2) pref = "2ตัว";
        else if (item.n.length === 1) pref = "วิ่ง";

        const entry = (type, amt, subIdx) => { // เพิ่ม subIdx ป้องกันซ้ำในแถวเดียวกัน (บน/โต๊ด/ล่าง)
            if(amt > 0) {
                const data = { 
                    billId, 
                    session, 
                    type, 
                    n: item.n, 
                    amt, 
                    displayDate: dateStr, 
                    // แก้ไขจุดนี้: ทำให้ ID ไม่ซ้ำแน่นอนโดยใช้ billId + index + subIdx
                    timestamp: `${billId}_${index}_${subIdx}` 
                };
                finalData.push(data);
                grandReportData.push(data);
            }
        };

        if (pref === "วิ่ง") {
            entry('วิ่งบน', item.t, 'top'); 
            entry('วิ่งล่าง', item.d, 'down');
        } else {
            entry(pref+'บน', item.t, 'top'); 
            entry(pref+'โต๊ด', item.td, 'tod'); 
            entry(pref+'ล่าง', item.d, 'down');
        }
    });

    localStorage.setItem('ultra_v6_data', JSON.stringify(finalData));
    localStorage.setItem('ultra_v6_report', JSON.stringify(grandReportData));
    
    draftData = []; 
    renderDraft(); 
    renderFinal();

    document.getElementById('top').value = '';
    document.getElementById('tod').value = '';
    document.getElementById('down').value = '';
}

// --- 1. ปรับปรุงการแสดงผล (ส่ง timestamp แทน index) ---

function renderFinal() {
    const container = document.getElementById('billContainer');
    if (!container) return;

    let grouped = {};
    finalData.forEach(item => {
        if (!grouped[item.billId]) {
            grouped[item.billId] = { session: item.session, date: item.displayDate, items: [] };
        }
        grouped[item.billId].items.push(item);
    });

    let html = '', totalAll = 0;
    Object.keys(grouped).sort((a, b) => b - a).forEach(id => {
        let bill = grouped[id];
        let billSum = bill.items.reduce((s, c) => s + c.amt, 0);
        totalAll += billSum;

        html += `
        <div class="bill-card" style="margin-bottom:15px; border:1px solid #e2e8f0; border-radius:12px; background:#fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div class="bill-header-index" style="padding:12px; background:#f8fafc; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; border-radius:12px 12px 0 0;">
                <span>👤 <b>${bill.session}</b> | <span style="color:var(--blue); font-weight:bold;">฿${billSum.toLocaleString()}</span></span>
                <div style="display:flex; gap:8px; align-items:center;">
                    <small style="color:#64748b;">${bill.date}</small>
                    <button class="btn-del" style="background:var(--blue); padding:5px 10px;" onclick="toggleIdxBody('body-${id}')">ดู/แก้</button>
                    <button class="btn-del" style="background:var(--red); padding:5px 10px;" onclick="deleteBill('${id}')">ลบทั้งบิล</button>
                </div>
            </div>
            
            <div id="body-${id}" style="display: none; padding:0;">
                <table style="width:100%; border-collapse: collapse; font-size:14px;">
                    <thead style="background:#f1f5f9;">
                        <tr style="text-align:left; color:#64748b; font-size:12px;">
                            <th style="padding:8px 12px;">ประเภท</th>
                            <th style="padding:8px 12px;">เลข</th>
                            <th style="padding:8px 12px; text-align:right;">ราคา (แก้ไขได้)</th>
                            <th style="padding:8px 12px; text-align:center;">ลบ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bill.items.map(i => `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:10px 12px; color:#475569;">${i.type}</td>
                                <td style="padding:10px 12px;"><b>${i.n}</b></td>
                                <td style="padding:10px 12px; text-align:right;">
                                    <input type="number" value="${i.amt}" 
                                        style="width:80px; text-align:right; border:1px solid #cbd5e1; border-radius:4px; padding:4px;"
                                        onchange="updateFinalAmt('${i.timestamp}', this.value)">
                                </td>
                                <td style="padding:10px 12px; text-align:center;">
                                    <button onclick="deleteRowInFinal('${i.timestamp}')" 
                                        style="color:var(--red); border:none; background:none; cursor:pointer; font-size:18px; line-height:1;">✕</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    if (document.getElementById('totalAmt')) {
        document.getElementById('totalAmt').innerText = totalAll.toLocaleString();
    }
}

// --- 2. ฟังก์ชัน ลบรายการ (รายบรรทัด) ---

function deleteRowInFinal(targetId) {
    if(!confirm('ต้องการลบรายการเลขนี้ใช่หรือไม่?')) return;
    
    // กรองออกโดยใช้ ID ที่ส่งมา (เปรียบเทียบแบบ String)
    finalData = finalData.filter(item => String(item.timestamp) !== String(targetId));
    grandReportData = grandReportData.filter(item => String(item.timestamp) !== String(targetId));
    
    saveAndRefresh();
}

// --- ฟังก์ชัน อัปเดตราคาเฉพาะแถว ---
function updateFinalAmt(targetId, newVal) {
    const val = parseFloat(newVal) || 0;
    
    const idx = finalData.findIndex(item => String(item.timestamp) === String(targetId));
    if(idx > -1) finalData[idx].amt = val;
    
    const rIdx = grandReportData.findIndex(item => String(item.timestamp) === String(targetId));
    if(rIdx > -1) grandReportData[rIdx].amt = val;
    
    saveAndRefresh();
}

// --- 4. ฟังก์ชัน ลบทั้งบิล ---
function deleteBill(billId) {
    if(!confirm('ยืนยันลบทั้งบิลนี้ใช่หรือไม่?')) return;
    
    finalData = finalData.filter(item => String(item.billId) !== String(billId));
    grandReportData = grandReportData.filter(item => String(item.billId) !== String(billId));
    
    saveAndRefresh();
}

// --- 5. บันทึกค่า ---
function saveAndRefresh() {
    localStorage.setItem('ultra_v6_data', JSON.stringify(finalData));
    localStorage.setItem('ultra_v6_report', JSON.stringify(grandReportData));
    renderFinal(); 
}

// --- 2. หน้า Check: รายงานสะสม (เวอร์ชันแก้ไขพร้อมระบบ Filter) ---
// ค้นหาฟังก์ชัน renderReport() ใน app.js แล้วแทนที่ส่วน loop summaryArray.forEach ดังนี้:

function renderReport() {
    const body = document.getElementById('reportBody');
    if(!body) return;

    const filterValue = document.getElementById('typeFilter')?.value || 'all';

    let summary = {}; 
    grandReportData.forEach(item => {
        if (filterValue !== 'all' && item.type !== filterValue) return;

        let key = item.n + "_" + item.type;
        if(!summary[key]) summary[key] = { n: item.n, type: item.type, amt: 0 };
        summary[key].amt += item.amt;
    });

    // เรียงลำดับ: ประเภทเดียวกันอยู่ด้วยกัน และเลขเรียงจากน้อยไปมาก
    let summaryArray = Object.values(summary).sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type, 'th');
        return a.n.localeCompare(b.n);
    });

    let html = '';
    summaryArray.forEach(r => {
        let limit = limits[r.type] || 0;
        let diff = r.amt - limit;
        let isOver = limit > 0 && diff > 0;
        
        // ใช้ width ชุดเดียวกับหัวตาราง (15% | 20% | 15% | 25% | 25%)
        html += `
            <tr style="border-bottom: 1px solid #edf2f7;">
                <td style="width: 20%; text-align: center; padding: 12px 0;">
                    <span class="badge" style="font-size: 11px;">${r.type}</span>
                </td>
                <td style="width: 20%; text-align: center; color: #64748b;">
                    ${limit > 0 ? limit.toLocaleString() : '-'}
                </td>
                <td style="width: 20%; text-align: center;">
                    <strong style="font-size: 16px; color: #1e293b;">${r.n}</strong>
                </td>
                <td style="width: 20%; text-align: center; font-weight: 700; color: var(--blue);">
                    ${r.amt.toLocaleString()}
                </td>
                <td style="width: 20%; text-align: center; padding-right: 20px; color: var(--red); font-weight: 800;">
                    ${isOver ? diff.toLocaleString() : '-'}
                </td>
            </tr>`;
    });

    body.innerHTML = html || '<tr><td colspan="5" style="text-align:center; padding:20px;">ไม่พบข้อมูล</td></tr>';
}

// --- 3. หน้า Money: สรุปยอดรายคน + พิมพ์ PDF (ฉบับปรับปรุง ส่วนลด และ Bill ID) ---
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
    // แก้ไข: เอา 28% ออกเหลือแค่ 25%
    const discountOptions = [0, 5, 10, 15, 20, 25];

    Object.keys(customers).forEach((name, idx) => {
        let cust = customers[name];
        let currentDiscount = discounts[name] || 0;
        let discountedTotal = cust.total * (1 - (currentDiscount / 100));
        let sortedBillIds = Object.keys(cust.bills).sort((a, b) => a - b);

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
                    ${discountOptions.map(ds => `
                        <button onclick="applyDiscount('${name}', ${ds})" 
                                class="discount-btn ${currentDiscount === ds ? 'active' : ''}" 
                                style="flex-grow: 1; min-width: 45px; padding: 8px 4px;">
                            ${ds === 0 ? '❌' : ds + '%'}
                        </button>`).join('')}
                </div>
            </div>

            <div id="detail-${idx}" class="money-detail" style="display:none; padding:10px; background:#f8fafc;">
                ${sortedBillIds.map((bid, bIdx) => {
                    let items = cust.bills[bid];
                    let billSum = items.reduce((sum, item) => sum + item.amt, 0);
                    return `
                    <div style="margin-bottom:10px; border:1px solid #e2e8f0; border-radius:8px; background:white; overflow:hidden;">
                        <div style="font-size:11px; background:#f1f5f9; padding:5px 12px; border-bottom:1px solid #e2e8f0; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
                            <span>📅 ${items[0].displayDate} | <b>Bill ${bIdx + 1}</b></span>
                            <span style="color:#1e293b; font-weight:bold;">ยอดบิลนี้: ฿${billSum.toLocaleString()}</span>
                        </div>
                        <table style="width:100%; border-collapse: collapse;">
                            ${items.map(line => `
                                <tr style="border-bottom:1px solid #f1f5f9;">
                                    <td style="padding:8px 12px; font-size:13px;">${line.type} <b>${line.n}</b></td>
                                    <td style="text-align:right; padding:8px 12px; font-weight:bold; color:var(--blue); font-size:13px;">฿${line.amt.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>`;
    });
    container.innerHTML = html || '<p style="text-align:center; color:#94a3b8;">ยังไม่มีข้อมูล</p>';
}

function printCustomerPDF(name) {
    let customerData = finalData.filter(i => i.session === name);
    if(customerData.length === 0) return;

    // จัดกลุ่มบิลและเรียงตามเวลา (Timestamp/ID) เพื่อให้ Bill 1, 2 ถูกต้อง
    let bills = {};
    let totalAmt = 0;
    customerData.forEach(i => {
        if(!bills[i.billId]) bills[i.billId] = [];
        bills[i.billId].push(i);
        totalAmt += i.amt;
    });

    let sortedBillIds = Object.keys(bills).sort((a, b) => a - b);
    let discountPercent = discounts[name] || 0;
    let discountValue = totalAmt * (discountPercent / 100);
    let finalTotal = totalAmt - discountValue;

    // เริ่มสร้างโครงสร้าง HTML สำหรับพิมพ์
    let printHTML = `<div id="printSection" style="font-family: sans-serif; padding: 20px;">`;
    printHTML += `<h2 style="margin-bottom:5px; border-bottom: 2px solid #333; padding-bottom: 10px;">รายการโพย: ${name}</h2>`;
    
    // สรุปยอดรวมด้านบน
    printHTML += `<div style="margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 8px;">`;
    printHTML += `<p style="font-size:16px; margin:0;">ยอดรวมทั้งหมด: <strong>฿${totalAmt.toLocaleString()}</strong></p>`;
    if(discountPercent > 0) {
        printHTML += `<p style="color:#ef4444; margin:5px 0;">ส่วนลด ${discountPercent}%: -฿${discountValue.toLocaleString()}</p>`;
        printHTML += `<p style="font-size:20px; margin:5px 0; color: #1e40af;"><strong>ยอดสุทธิที่ต้องชำระ: ฿${Math.round(finalTotal).toLocaleString()}</strong></p>`;
    } else {
        printHTML += `<p style="font-size:20px; margin:5px 0; color: #1e40af;"><strong>ยอดสุทธิที่ต้องชำระ: ฿${totalAmt.toLocaleString()}</strong></p>`;
    }
    printHTML += `</div>`;

    // รายละเอียดแต่ละบิล
    sortedBillIds.forEach((bid, bIdx) => {
        let items = bills[bid];
        let billSum = items.reduce((s, c) => s + c.amt, 0); // คำนวณยอดรวมของบิลนี้

        printHTML += `<div style="margin-bottom:25px; page-break-inside: avoid;">`;
        printHTML += `
            <div style="background:#e2e8f0; padding:8px 12px; display:flex; justify-content:space-between; font-weight:bold;">
                <span>📄 Bill ${bIdx + 1} <small style="font-weight:normal; color:#666;">(${items[0].displayDate})</small></span>
                <span>รวมบิลนี้: ฿${billSum.toLocaleString()}</span>
            </div>`;
        
        printHTML += `<table style="width:100%; border-collapse:collapse; margin-top:5px;">`;
        printHTML += `
            <tr style="background:#f1f5f9; text-align:left; font-size:12px;">
                <th style="padding:6px; border:1px solid #ccc;">ประเภท</th>
                <th style="padding:6px; border:1px solid #ccc;">เลข</th>
                <th style="padding:6px; border:1px solid #ccc; text-align:right;">ราคา</th>
            </tr>`;

        items.forEach(item => {
            printHTML += `
                <tr>
                    <td style="padding:6px; border:1px solid #ccc;">${item.type}</td>
                    <td style="padding:6px; border:1px solid #ccc;"><strong>${item.n}</strong></td>
                    <td style="padding:6px; border:1px solid #ccc; text-align:right;">${item.amt.toLocaleString()}</td>
                </tr>`;
        });
        printHTML += `</table></div>`;
    });

    printHTML += `<div style="text-align:center; margin-top:40px; font-weight:bold; border-top:1px dashed #000; padding-top:20px; color: #666;">
                    ขอบคุณที่ใช้บริการ Rich Women
                  </div>`;
    printHTML += `</div>`;

    // ลบ Section เก่า (ถ้ามี) แล้วใส่ใหม่
    let oldPrint = document.getElementById('printSection');
    if(oldPrint) oldPrint.remove();
    
    document.body.insertAdjacentHTML('beforeend', printHTML);

    window.print();

    // ล้างข้อมูลหลังสั่งพิมพ์เสร็จ (เพื่อไม่ให้เกะกะหน้าจอหลัก)
    setTimeout(() => {
        let ps = document.getElementById('printSection');
        if(ps) ps.remove();
    }, 100);
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

// --- 1. ปรับปรุงการคีย์และการกด Enter (ข้อ 1, 2, 3) ---
function initKeypadLogic() {
    const numInp = document.getElementById('num');
    const topInp = document.getElementById('top');
    const todInp = document.getElementById('tod');
    const downInp = document.getElementById('down');
    const sessInp = document.getElementById('sessionName');
    
    if (!numInp) return;

    // Logic: ปิดช่องตามจำนวนเลข (เลข 3 หลัก ปิดล่าง / เลข 2 หลัก ปิดโต๊ด)
    numInp.addEventListener('input', () => {
        const val = numInp.value.replace('*','');
        if (val.length === 3) {
            downInp.disabled = true;
            downInp.style.backgroundColor = "#e2e8f0"; // สีทึบ
            downInp.value = "";
            todInp.disabled = false;
            todInp.style.backgroundColor = "";
        } else if (val.length === 1 || val.length === 2) {
            todInp.disabled = true;
            todInp.style.backgroundColor = "#e2e8f0";
            todInp.value = "";
            downInp.disabled = false;
            downInp.style.backgroundColor = "";
        } else {
            // ถ้าว่างหรืออื่นๆ ให้เปิดหมด
            todInp.disabled = false;
            downInp.disabled = false;
            todInp.style.backgroundColor = "";
            downInp.style.backgroundColor = "";
        }
    });

    // แก้ปัญหา Enter แล้วนิ่ง: ใช้ Array เช็คสถานะช่องที่ "เปิดอยู่" เท่านั้น
    const inputs = [sessInp, numInp, topInp, todInp, downInp];
    inputs.forEach((el) => {
        if(!el) return;
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();

                // ค้นหาว่า ณ ตอนนี้ ช่องไหนบ้างที่ใช้งานได้ (Not Disabled)
                const activeInputs = inputs.filter(input => input && !input.disabled);
                const currentIndex = activeInputs.indexOf(e.target);

                if (currentIndex !== -1 && currentIndex < activeInputs.length - 1) {
                    // ถ้ายังไม่ถึงช่องสุดท้ายที่เปิดอยู่ ให้ไปช่องถัดไป
                    activeInputs[currentIndex + 1].focus();
                } else {
                    // ถ้าอยู่ที่ช่องสุดท้ายที่เปิดอยู่แล้ว ให้เพิ่มข้อมูลทันที
                    addToDraft();
                }
            }
        });
    });
}

// แก้ไขฟังก์ชันเพิ่มเข้าตารางพัก (เน้นเรื่องค้างราคา)
function addToDraft() {
    const sessInp = document.getElementById('sessionName');
    const numInp = document.getElementById('num');
    const topInp = document.getElementById('top');
    const todInp = document.getElementById('tod');
    const downInp = document.getElementById('down');

    const session = sessInp.value.trim() || "ไม่ระบุชื่อ";
    const n = numInp.value.trim();
    
    if(!n) {
        numInp.focus();
        return;
    }
    
    const t = parseFloat(topInp.value) || 0;
    const td = parseFloat(todInp.value) || 0;
    const d = parseFloat(downInp.value) || 0;

    // ตรวจสอบว่าใส่ราคาหรือยัง
    if (t === 0 && td === 0 && d === 0) {
        alert("กรุณาใส่ราคาด้วยครับ");
        topInp.focus();
        return;
    }

    let isRev = n.includes('*');
    let base = n.replace('*', '');
    let nums = isRev ? getPermutations(base) : [base];

    nums.forEach(num => {
        draftData.push({ session, n: num, t, td, d });
    });

    renderDraft();
    
    // --- จุดสำคัญ (ข้อ 3): ล้างแค่เลข แต่ค้างราคาไว้ ---
    numInp.value = ''; 
    numInp.focus(); 
    
    // ไม่ต้องล้าง topInp.value, todInp.value, downInp.value
    // เพื่อให้ผู้ใช้คีย์เลขถัดไปได้เลยโดยใช้ราคาเดิม
}

// --- 2. แก้ไขการ Export Excel (ข้อ 4: แยก Bill 1, 2) ---
function exportToExcel() {
    if (finalData.length === 0) {
        alert("ไม่มีข้อมูลให้ Export");
        return;
    }

    const billCounter = {}; // เก็บจำนวนบิลของแต่ละคน { "Ta": 0, "Mew": 0 }
    const billIdMap = {};   // แมพ billId จริง กับ ชื่อบิลที่จะโชว์ { "17123...": "Ta Bill 1" }

    // เรียงข้อมูลตามเวลาเพื่อความถูกต้อง
    const sortedData = [...finalData].sort((a, b) => a.billId - b.billId);

    const dataToExport = sortedData.map(item => {
        const name = item.session;
        
        // ถ้าเจอบิลนี้ครั้งแรก
        if (!billIdMap[item.billId]) {
            if (!billCounter[name]) billCounter[name] = 0;
            billCounter[name]++;
            billIdMap[item.billId] = `${name} Bill ${billCounter[name]}`;
        }

        return {
            "ชุดที่": billIdMap[item.billId],
            "ชื่อลูกค้า": item.session,
            "วันที่/เวลา": item.displayDate,
            "ประเภท": item.type,
            "เลข": item.n,
            "ยอดเงิน": item.amt
        };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `RichWomen_Data.xlsx`);
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

// --- 5. Win Check Logic ---
// ฟังก์ชันสำหรับดึงค่าที่เคยบันทึกไว้มาแสดงตอนโหลดหน้าใหม่

// --- 5. Win Check Logic (ฉบับแก้ไขสมบูรณ์) ---

// ฟังก์ชันสำหรับดึงค่าที่เคยบันทึกไว้มาแสดงและคำนวณอัตโนมัติ
function loadSavedWinNumbers() {
    const saved = localStorage.getItem('lotto_win_storage');
    if (saved) {
        const data = JSON.parse(saved);
        const f1 = document.getElementById('winFull1');
        const d2 = document.getElementById('winDown2');
        const d3_1 = document.getElementById('winDown3_1');
        const d3_2 = document.getElementById('winDown3_2');

        // หยอดค่าลงช่อง Input
        if (f1) f1.value = data.full1 || '';
        if (d2) d2.value = data.down2 || '';
        if (d3_1) d3_1.value = data.d3_1 || '';
        if (d3_2) d3_2.value = data.d3_2 || '';

        // ถ้ามีข้อมูลเลขรางวัลหลัก ให้รันการเช็ครางวัลทันทีโดยไม่ต้องกดปุ่ม
        if (data.full1 || data.down2) {
            processWinCheck(false); // ใส่ false เพื่อไม่ให้ alert ตอนโหลดหน้า
        }
    }
}

function processWinCheck(showAlert = true) {
    const f1_el = document.getElementById('winFull1');
    const d2_el = document.getElementById('winDown2');
    const d3_1_el = document.getElementById('winDown3_1');
    const d3_2_el = document.getElementById('winDown3_2');

    if(!f1_el || !d2_el) return;

    const full1 = f1_el.value.trim();
    const down2 = d2_el.value.trim();
    const d3_1 = d3_1_el.value.trim();
    const d3_2 = d3_2_el.value.trim();

    if (full1.length < 3 && !down2) {
        if(showAlert) alert("กรุณากรอกรางวัลที่ 1 หรือเลขท้าย 2 ตัว");
        return;
    }

    // บันทึกเลขรางวัลลงเครื่อง (LocalStorage)
    const winNumbers = { full1, down2, d3_1, d3_2 };
    localStorage.setItem('lotto_win_storage', JSON.stringify(winNumbers));

    // เริ่ม Logic การคำนวณ
    const top3 = full1.slice(-3);
    const top2 = full1.slice(-2);
    const todSet = getPermutations(top3);
    const runTop = top3.split('');
    const runDown = down2.split('');

    document.getElementById('summaryNumbers').style.display = 'block';
    
    const resultHTML = `
        <div class="win-board-grid">
            <div class="win-block"><label>3 ตัวบน</label><div class="win-num">${top3 || '-'}</div></div>
            <div class="win-block"><label>2 ตัวล่าง</label><div class="win-num down2">${down2 || '-'}</div></div>
            <div class="win-block"><label>3 ตัวล่าง (1)</label><div class="win-num">${d3_1 || '-'}</div></div>
            <div class="win-block"><label>3 ตัวล่าง (2)</label><div class="win-num">${d3_2 || '-'}</div></div>
        </div>
    `;
    document.getElementById('txtResult').innerHTML = resultHTML;

    let winByCustomer = {};
    grandReportData.forEach(item => {
        let winType = "";
        if (item.type === "3ตัวบน" && item.n === top3) winType = "3 ตัวบน";
        else if (item.type === "3ตัวโต๊ด" && todSet.includes(item.n)) winType = "3 ตัวโต๊ด";
        else if (item.type === "2ตัวบน" && item.n === top2) winType = "2 ตัวบน";
        else if (item.type === "2ตัวล่าง" && item.n === down2) winType = "2 ตัวล่าง";
        else if (item.type === "3ตัวล่าง" && (item.n === d3_1 || item.n === d3_2)) winType = "3 ตัวล่าง";
        else if (item.type === "วิ่งบน" && runTop.includes(item.n)) winType = "วิ่งบน";
        else if (item.type === "วิ่งล่าง" && runDown.includes(item.n)) winType = "วิ่งล่าง";

        if (winType !== "") {
            if (!winByCustomer[item.session]) winByCustomer[item.session] = [];
            winByCustomer[item.session].push({ ...item, winName: winType });
        }
    });

    displayGroupedWinners(winByCustomer);
}

function displayGroupedWinners(groupedData) {
    const section = document.getElementById('winResultSection');
    const container = document.getElementById('winGroupContainer');
    section.style.display = 'block';
    container.innerHTML = "";

    const customers = Object.keys(groupedData);

    if (customers.length === 0) {
        container.innerHTML = "<div style='text-align:center; padding:40px; color:#94a3b8;'>ไม่พบรายการถูกรางวัลในงวดนี้</div>";
        return;
    }

    customers.forEach(name => {
        let customerTotal = 0;
        let rows = groupedData[name].map(w => {
            customerTotal += w.amt;
            return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding:10px;">${w.winName}</td>
                    <td style="padding:10px; font-weight:bold; color:var(--blue);">${w.n}</td>
                    <td style="padding:10px; text-align:right;">฿${w.amt.toLocaleString()}</td>
                </tr>
            `;
        }).join('');

        const card = document.createElement('div');
        card.style.cssText = "margin-bottom:20px; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;";
        card.innerHTML = `
            <div style="background:#f8fafc; padding:10px 15px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
                <span style="font-weight:bold; font-size:1.1rem;">👤 คุณ ${name}</span>
                <span style="color:var(--green); font-weight:800;">รวมยอดถูก: ฿${customerTotal.toLocaleString()}</span>
            </div>
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background:#fff; font-size:0.85rem; color:#64748b;">
                    <tr>
                        <th style="text-align:left; padding:10px;">ประเภท</th>
                        <th style="text-align:left; padding:10px;">เลข</th>
                        <th style="text-align:right; padding:10px;">ยอดซื้อ</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
        container.appendChild(card);
    });
}

function loadSavedWinNumbers() {
    const saved = localStorage.getItem('lotto_win_storage');
    if (saved) {
        const data = JSON.parse(saved);
        const f1 = document.getElementById('winFull1');
        const d2 = document.getElementById('winDown2');
        const d3_1 = document.getElementById('winDown3_1');
        const d3_2 = document.getElementById('winDown3_2');

        if (f1) f1.value = data.full1 || '';
        if (d2) d2.value = data.down2 || '';
        if (d3_1) d3_1.value = data.d3_1 || '';
        if (d3_2) d3_2.value = data.d3_2 || '';

        // ถ้ามีข้อมูลเลข ให้รันการเช็ครางวัลทันที
        if (data.full1 || data.down2) {
            processWinCheck();
        }
    }
}

window.onload = () => {
    initKeypadLogic(); 
    renderFinal(); 
    renderReport(); 
    renderSettings(); 
    renderMoneyReport();
    
    // ดึงข้อมูลรางวัลกลับมาแสดงทันทีที่โหลดหน้า Win Check
    if (document.getElementById('winFull1')) {
        loadSavedWinNumbers();
    }
};