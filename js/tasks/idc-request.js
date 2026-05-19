const IdcRequestTask = {
    zones: [],

    init() {
        this.zones = [{
            zoneId: 1, roomName: '', floorNumber: '', rackSize: 42,
            rows: [{ rowName: '', rackRange: '' }]
        }];
        this.renderZones();
        this.bindGlobalEvents();
    },

    renderZones() {
        const container = document.getElementById('zones-container');
        container.innerHTML = this.zones.map((zone, zIdx) => `
            <div class="card zone-card" data-zone-idx="${zIdx}">
                <div class="card-header">
                    <h3>Zone ${zIdx + 1}${zone.roomName ? ' — ' + zone.roomName : ''}</h3>
                    <div class="btn-group">
                        <button class="btn btn-outline btn-sm btn-add-zone-row" data-zone-idx="${zIdx}">+ 열 추가</button>
                        ${this.zones.length > 1
                            ? `<button class="btn btn-danger btn-sm btn-remove-zone" data-zone-idx="${zIdx}">Zone 삭제</button>`
                            : ''}
                    </div>
                </div>
                <div class="card-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Room 이름</label>
                            <input type="text" class="form-input zone-field"
                                   value="${zone.roomName}"
                                   data-zone-idx="${zIdx}" data-field="roomName" placeholder="예: 5F">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Floor 번호</label>
                            <input type="number" class="form-input zone-field"
                                   value="${zone.floorNumber}"
                                   data-zone-idx="${zIdx}" data-field="floorNumber" placeholder="예: 5">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Zone ID</label>
                            <input type="number" class="form-input zone-field"
                                   value="${zone.zoneId}"
                                   data-zone-idx="${zIdx}" data-field="zoneId">
                            <span class="form-hint">1부터 순차 등록</span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rack 사이즈 (U)</label>
                            <input type="number" class="form-input zone-field"
                                   value="${zone.rackSize}"
                                   data-zone-idx="${zIdx}" data-field="rackSize">
                            <span class="form-hint">일반적으로 40 또는 42</span>
                        </div>
                    </div>
                    <table class="row-table" style="margin-top:16px;">
                        <thead>
                            <tr>
                                <th style="width:50px; text-align:center;">#</th>
                                <th>열 이름</th>
                                <th>랙 범위</th>
                                <th style="width:80px; text-align:center;">랙 수</th>
                                <th style="width:60px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${zone.rows.map((row, rIdx) => `
                            <tr>
                                <td class="row-number">${rIdx + 1}</td>
                                <td>
                                    <input type="text" class="form-input zone-row-field"
                                           value="${row.rowName}" placeholder="예: 5F-01" maxlength="20"
                                           data-zone-idx="${zIdx}" data-row-idx="${rIdx}" data-field="rowName">
                                    <span class="row-name-counter form-hint" data-zone-idx="${zIdx}" data-row-idx="${rIdx}">${row.rowName.length}/20</span>
                                </td>
                                <td>
                                    <input type="text" class="form-input zone-row-field"
                                           value="${row.rackRange}" placeholder="예: R01~R05 또는 B01~B08"
                                           data-zone-idx="${zIdx}" data-row-idx="${rIdx}" data-field="rackRange">
                                </td>
                                <td class="row-number rack-count-cell"
                                    data-zone-idx="${zIdx}" data-row-idx="${rIdx}">
                                    ${this.parseRackCount(row.rackRange) || '-'}
                                </td>
                                <td style="text-align:center;">
                                    <button class="btn btn-danger btn-sm btn-remove-zone-row"
                                            data-zone-idx="${zIdx}" data-row-idx="${rIdx}"
                                            ${zone.rows.length <= 1 ? 'disabled' : ''}>삭제</button>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `).join('');

        this.bindZoneEvents(container);
    },

    bindZoneEvents(container) {
        container.querySelectorAll('.zone-field').forEach(input => {
            input.addEventListener('input', (e) => {
                const zIdx = parseInt(e.target.dataset.zoneIdx);
                const field = e.target.dataset.field;
                this.zones[zIdx][field] = e.target.value;
                if (field === 'roomName') {
                    const h3 = container.querySelector(`.zone-card[data-zone-idx="${zIdx}"] .card-header h3`);
                    h3.textContent = `Zone ${zIdx + 1}${e.target.value ? ' — ' + e.target.value : ''}`;
                }
            });
        });

        container.querySelectorAll('.zone-row-field').forEach(input => {
            input.addEventListener('input', (e) => {
                const zIdx = parseInt(e.target.dataset.zoneIdx);
                const rIdx = parseInt(e.target.dataset.rowIdx);
                const field = e.target.dataset.field;
                this.zones[zIdx].rows[rIdx][field] = e.target.value;
                if (field === 'rackRange') {
                    const cell = container.querySelector(
                        `.rack-count-cell[data-zone-idx="${zIdx}"][data-row-idx="${rIdx}"]`
                    );
                    cell.textContent = this.parseRackCount(e.target.value) || '-';
                }
                if (field === 'rowName') {
                    const len = e.target.value.length;
                    const counter = container.querySelector(
                        `.row-name-counter[data-zone-idx="${zIdx}"][data-row-idx="${rIdx}"]`
                    );
                    counter.textContent = `${len}/20`;
                    counter.classList.toggle('over-limit', len > 20);
                    e.target.classList.toggle('input-error', len > 20);
                }
            });
        });

        container.querySelectorAll('.btn-add-zone-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.zones[parseInt(e.target.dataset.zoneIdx)].rows.push({ rowName: '', rackRange: '' });
                this.renderZones();
            });
        });

        container.querySelectorAll('.btn-remove-zone-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const zIdx = parseInt(e.target.dataset.zoneIdx);
                this.zones[zIdx].rows.splice(parseInt(e.target.dataset.rowIdx), 1);
                this.renderZones();
            });
        });

        container.querySelectorAll('.btn-remove-zone').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.zones.splice(parseInt(e.target.dataset.zoneIdx), 1);
                this.zones.forEach((z, i) => { z.zoneId = i + 1; });
                this.renderZones();
            });
        });
    },

    parseRackRange(range) {
        if (!range) return null;
        const cleaned = range.replace(/\s/g, '');
        const match = cleaned.match(/^([A-Za-z]?)(\d+)\s*[~\-]\s*([A-Za-z]?)(\d+)$/);
        if (!match) return null;

        let startPrefix = (match[1] || '').toUpperCase();
        let endPrefix = (match[3] || '').toUpperCase();
        if (!startPrefix && endPrefix) startPrefix = endPrefix;
        if (!endPrefix && startPrefix) endPrefix = startPrefix;
        if (!startPrefix && !endPrefix) {
            startPrefix = 'R';
            endPrefix = 'R';
        }
        if (startPrefix !== endPrefix) return null;

        const start = parseInt(match[2], 10);
        const end = parseInt(match[4], 10);
        if (end < start) return null;

        return {
            prefix: startPrefix,
            start,
            end,
            count: end - start + 1
        };
    },

    parseRackCount(range) {
        const info = this.parseRackRange(range);
        return info ? info.count : 0;
    },

    getRackPrefix(range) {
        const info = this.parseRackRange(range);
        return info ? info.prefix : 'R';
    },

    bindGlobalEvents() {
        document.getElementById('btn-add-zone').addEventListener('click', () => {
            this.zones.push({
                zoneId: this.zones.length + 1, roomName: '', floorNumber: '', rackSize: 42,
                rows: [{ rowName: '', rackRange: '' }]
            });
            this.renderZones();
        });

        document.getElementById('btn-generate').addEventListener('click', () => this.generate());
        document.getElementById('btn-copy-sql').addEventListener('click', () => this.copySQL());
        document.getElementById('btn-load-example').addEventListener('click', () => this.loadExample());

        document.getElementById('rack-modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('rack-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        const nameEl = document.getElementById('idc-name');
        const addrEl = document.getElementById('idc-address');
        let addrManual = false;
        addrEl.addEventListener('input', () => {
            addrManual = addrEl.value.trim() !== '' && addrEl.value.trim() !== nameEl.value.trim();
        });
        nameEl.addEventListener('input', () => {
            if (!addrManual) addrEl.value = nameEl.value;
        });
    },

    loadExample() {
        document.getElementById('idc-name').value = '호스트웨이IDC';
        document.getElementById('idc-address').value = '호스트웨이IDC';
        document.getElementById('idc-supply-code').value = '280';
        document.getElementById('user-id').value = 'EP10579';
        document.getElementById('display-order').value = '36';
        document.getElementById('idc-id').value = '37';

        this.zones = [
            {
                zoneId: 1, roomName: '5F', floorNumber: '5', rackSize: 42,
                rows: [
                    { rowName: '5F-01', rackRange: 'R01~R05' },
                    { rowName: '5F-02', rackRange: 'R01~R05' },
                    { rowName: '5F-03', rackRange: 'R01~R05' },
                    { rowName: '5F-04', rackRange: 'R01~R05' },
                    { rowName: '5F-05', rackRange: 'R01~R11' },
                    { rowName: '5F-06', rackRange: 'R01~R07' },
                ]
            },
            {
                zoneId: 2, roomName: '6F', floorNumber: '6', rackSize: 42,
                rows: [
                    { rowName: '6F-01', rackRange: 'R01~R03' },
                    { rowName: '6F-02', rackRange: 'R01~R08' },
                ]
            }
        ];
        this.renderZones();
        Layout.showToast('예제 데이터를 불러왔습니다 (2개 Zone).');
    },

    getFormData() {
        return {
            idcName: document.getElementById('idc-name').value.trim(),
            idcAddress: document.getElementById('idc-address').value.trim() || document.getElementById('idc-name').value.trim(),
            supplyCode: document.getElementById('idc-supply-code').value.trim(),
            userId: document.getElementById('user-id').value.trim(),
            displayOrder: document.getElementById('display-order').value.trim(),
            idcId: document.getElementById('idc-id').value.trim(),
        };
    },

    validate(data) {
        const required = [
            ['idcName', 'IDC 이름'], ['supplyCode', '공급업체 코드'],
            ['userId', '작업자 ID'], ['displayOrder', 'Display Order'],
            ['idcId', '예상 IDC ID'],
        ];
        for (const [key, label] of required) {
            if (!data[key]) return `${label}을(를) 입력해주세요.`;
        }
        for (let z = 0; z < this.zones.length; z++) {
            const zone = this.zones[z];
            if (!zone.roomName) return `Zone ${z + 1}의 Room 이름을 입력해주세요.`;
            if (!zone.floorNumber) return `Zone ${z + 1}의 Floor 번호를 입력해주세요.`;
            for (let r = 0; r < zone.rows.length; r++) {
                if (!zone.rows[r].rowName) return `Zone ${z + 1} 열 ${r + 1}의 이름을 입력해주세요.`;
                if (zone.rows[r].rowName.length > 20) return `Zone ${z + 1} 열 ${r + 1}의 이름이 20자를 초과합니다. (현재 ${zone.rows[r].rowName.length}자)`;
                if (!this.parseRackCount(zone.rows[r].rackRange))
                    return `Zone ${z + 1} 열 ${r + 1}의 랙 범위를 올바르게 입력해주세요. (예: R01~R05 또는 B01~B08)`;
            }
        }
        return null;
    },

    generate() {
        const data = this.getFormData();
        const error = this.validate(data);
        if (error) { Layout.showToast(error, 'error'); return; }

        document.getElementById('preview-content').innerHTML = this.buildFloorMap();
        this.bindFloorClickEvents();
        document.getElementById('preview-card').classList.remove('hidden');

        const sql = this.buildSQL(data);
        document.getElementById('sql-result-card').classList.remove('hidden');
        document.getElementById('sql-output').innerHTML = this.highlightSQL(sql);
        this._rawSQL = sql;

        document.getElementById('preview-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
        Layout.showToast('SQL 쿼리가 생성되었습니다.');
    },

    buildFloorMap() {
        return this.zones.map((zone, zIdx) => {
            const rowsHtml = zone.rows.map((row, rIdx) => {
                const count = this.parseRackCount(row.rackRange);
                const slots = Array.from({ length: count }, () => '<div class="floor-slot"></div>').join('');
                const widthPx = count * 52;
                return `
                    <div class="floor-row-block">
                        <div class="floor-row-label" style="width:${widthPx}px;"
                             data-zone-idx="${zIdx}" data-row-idx="${rIdx}">
                            ${row.rowName} (랙 개수 : ${count})
                        </div>
                        <div class="floor-row-slots" style="width:${widthPx}px;">${slots}</div>
                    </div>`;
            }).join('');
            return `<div class="floor-map"><div class="floor-map-title">${zone.roomName}</div>${rowsHtml}</div>`;
        }).join('');
    },

    bindFloorClickEvents() {
        document.querySelectorAll('#preview-content .floor-row-label').forEach(label => {
            label.addEventListener('click', (e) => {
                const zIdx = parseInt(e.currentTarget.dataset.zoneIdx);
                const rIdx = parseInt(e.currentTarget.dataset.rowIdx);
                this.openRackModal(zIdx, rIdx);
            });
        });
    },

    openRackModal(zIdx, rIdx) {
        const zone = this.zones[zIdx];
        const row = zone.rows[rIdx];
        const rSize = parseInt(zone.rackSize) || 42;
        const count = this.parseRackCount(row.rackRange);
        const prefix = this.getRackPrefix(row.rackRange);

        document.getElementById('rack-modal-title').textContent = row.rowName;

        const rackHeaders = Array.from({ length: count }, (_, i) => {
            const rackNum = count - i;
            return `<th>${prefix}${String(rackNum).padStart(2, '0')}<br><span style="font-weight:400;font-size:11px;">(0 / ${rSize})</span></th>`;
        }).join('');
        const colorBar = Array.from({ length: count }, () => '<th></th>').join('');
        const bodyRows = Array.from({ length: rSize }, (_, i) => {
            const holeNo = rSize - i;
            const cells = Array.from({ length: count }, () => '<td></td>').join('');
            return `<tr><td class="hole-no">${holeNo}</td>${cells}</tr>`;
        }).join('');

        document.getElementById('rack-modal-body').innerHTML = `
            <div class="rack-detail-scroll">
                <table class="rack-detail-table">
                    <thead>
                        <tr><th class="hole-col"></th>${rackHeaders}</tr>
                        <tr><th></th>${colorBar}</tr>
                    </thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </div>`;

        document.getElementById('rack-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    closeModal() {
        document.getElementById('rack-modal').classList.add('hidden');
        document.body.style.overflow = '';
    },

    buildSQL(d) {
        const lines = [];
        const END_X = 25;

        const totalZones = this.zones.length;
        const totalRows = this.zones.reduce((s, z) => s + z.rows.length, 0);
        const totalRacks = this.zones.reduce((s, z) =>
            s + z.rows.reduce((rs, r) => rs + this.parseRackCount(r.rackRange), 0), 0);
        const totalHoles = this.zones.reduce((s, z) => {
            const rSize = parseInt(z.rackSize) || 42;
            return s + z.rows.reduce((rs, r) => rs + this.parseRackCount(r.rackRange) * rSize, 0);
        }, 0);

        lines.push(`-- ${'='.repeat(60)}`);
        lines.push(`-- 상면관리 IDC 등록 쿼리`);
        lines.push(`-- IDC: ${d.idcName} (ID: ${d.idcId})`);
        lines.push(`-- 요약: ${totalZones}개 Zone, ${totalRows}개 열, ${totalRacks}개 랙, ${totalHoles}개 hole`);
        lines.push(`-- 작업자: ${d.userId}`);
        lines.push(`-- ${'='.repeat(60)}`);
        lines.push('');

        lines.push(`-- [1] IDC 생성: '${d.idcName}' (idc_id: 자동채번, 공급업체코드: ${d.supplyCode})`);
        lines.push(
            `INSERT INTO idc (idc_id, idc_name, idc_address, idc_supply_company_code, create_user_id, create_date, update_user_id, update_date, display_order) VALUES ((SELECT MAX(idc_id)+1 FROM (SELECT * FROM idc) AS r), '${d.idcName}', '${d.idcAddress}', ${d.supplyCode}, '${d.userId}', now(), '${d.userId}', now(), ${d.displayOrder});`
        );

        this.zones.forEach((zone, zIdx) => {
            const zId = zone.zoneId;
            const rSize = zone.rackSize || 42;
            const zoneRackCount = zone.rows.reduce((s, r) => s + this.parseRackCount(r.rackRange), 0);
            const zoneHoleCount = zoneRackCount * rSize;
            const rowSummary = zone.rows.map(r => `${r.rowName}(${this.parseRackCount(r.rackRange)})`).join(', ');
            const prefixCaseSql = zone.rows
                .map((row, rIdx) => `WHEN ${rIdx + 1} THEN '${this.getRackPrefix(row.rackRange)}'`)
                .join(' ');

            lines.push('');
            lines.push(`-- ${'='.repeat(60)}`);
            lines.push(`-- Zone ${zIdx + 1}: ${zone.roomName} (${zone.floorNumber}층)`);
            lines.push(`--   열 ${zone.rows.length}개: ${rowSummary}`);
            lines.push(`--   랙 ${zoneRackCount}개 (각 ${rSize}U), hole ${zoneHoleCount}개`);
            lines.push(`-- ${'='.repeat(60)}`);

            lines.push('');
            lines.push(`-- [2-${zIdx + 1}] Room '${zone.roomName}' 을 Zone ${zId}로 등록 (${zone.floorNumber}층)`);
            lines.push(
                `INSERT INTO idc_zone (idc_id, idc_zone_id, idc_zone_name, \`floor\`, \`zone\`, use_yn, vertical_panel_count, horizontal_panel_count, max_power_watt, able_power_quantity, server_per_power, max_cooling, able_cooling_quantity, server_per_cooling, remark, create_user_id, create_date, update_user_id, update_date) VALUES (${d.idcId}, ${zId}, '${zone.roomName}', ${zone.floorNumber}, '${zId}', 'Y', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '${d.userId}', NOW(), '${d.userId}', NOW());`
            );

            lines.push('');
            lines.push(`-- [3-${zIdx + 1}] 열(Row) ${zone.rows.length}개 등록`);
            zone.rows.forEach((row, rIdx) => {
                const rackCount = this.parseRackCount(row.rackRange);
                const rowId = rIdx + 1;
                lines.push(`--   ${row.rowName}: 랙 ${rackCount}개 (${row.rackRange})`);
                lines.push(
                    `INSERT INTO idc_zone_row (idc_id, idc_zone_id, rack_row_id, rack_row_name, start_x_position, start_y_position, end_x_position, end_y_position, rack_start_direction_code, cooling_direction_code, power_limit, able_yn, rack_count, create_user_id, create_date, update_user_id, update_date) VALUES (${d.idcId}, ${zId}, ${rowId}, '${row.rowName}', ${END_X - rackCount}, ${4 * rowId}, ${END_X}, ${4 * rowId + 1}, NULL, NULL, 0, 'Y', ${rackCount}, '${d.userId}', NOW(), '${d.userId}', NOW());`
                );
            });

            lines.push('');
            lines.push(`-- [4-${zIdx + 1}] 랙 ${zoneRackCount}개 일괄 생성 (각 ${rSize}U, rack_id 자동채번)`);
            lines.push(`INSERT INTO rack (
    rack_id, idc_id, idc_zone_id, rack_row_id, rack_name, rack_size,
    standard_power_watt, max_power_watt, rack_display_position, real_rack_count,
    ip_bandwidth, oobip_bandwidth, backup_ip_bandwidth,
    create_user_id, create_date, update_user_id, update_date, block_yn, rack_label
)
WITH RECURSIVE cfg AS (
    SELECT zr.idc_id, zr.idc_zone_id, zr.rack_row_id, zr.rack_count,
           CASE zr.rack_row_id ${prefixCaseSql} ELSE 'R' END AS rack_prefix, ${rSize} AS rack_size
    FROM idc_zone_row zr
    WHERE zr.idc_id = ${d.idcId} AND zr.idc_zone_id = ${zId}
),
seq AS (
    SELECT idc_id, idc_zone_id, rack_row_id, rack_count, rack_prefix, rack_size, 1 AS n
    FROM cfg WHERE rack_count >= 1
    UNION ALL
    SELECT idc_id, idc_zone_id, rack_row_id, rack_count, rack_prefix, rack_size, n + 1
    FROM seq WHERE n < rack_count
),
numbered AS (
    SELECT ROW_NUMBER() OVER (ORDER BY rack_row_id, n) AS rn,
           idc_id, idc_zone_id, rack_row_id, rack_count, rack_prefix, rack_size, n
    FROM seq
),
base AS (
    SELECT IFNULL(MAX(rack_id), 0) AS max_rack_id FROM rack
)
SELECT
    base.max_rack_id + numbered.rn, numbered.idc_id, numbered.idc_zone_id,
    numbered.rack_row_id,
    CONCAT(numbered.rack_prefix, LPAD(numbered.rack_count - numbered.n + 1, 2, '0')),
    numbered.rack_size, NULL, NULL, numbered.n, NULL, NULL, NULL, NULL,
    '${d.userId}', NOW(), '${d.userId}', NOW(), 'N', ''
FROM numbered CROSS JOIN base;`);

            lines.push('');
            lines.push(`-- [5-${zIdx + 1}] 랙당 1~${rSize}번 hole 생성 (미등록 상태 171, 총 ${zoneHoleCount}개)`);
            lines.push(`INSERT INTO hole (
    rack_id, hole_no, hole_state_code, remark, dh_hole_name,
    create_user_id, create_date, update_user_id, update_date
)
SELECT r.rack_id, s.n AS hole_no, 171 AS hole_state_code, NULL, NULL,
       '${d.userId}' AS create_user_id, NOW() AS create_date,
       '${d.userId}' AS update_user_id, NOW() AS update_date
FROM rack r
JOIN (
    WITH RECURSIVE seq AS (
        SELECT 1 AS n UNION ALL
        SELECT n + 1 FROM seq
        WHERE n < (SELECT MAX(rack_size) FROM rack WHERE idc_id = ${d.idcId} AND idc_zone_id = ${zId})
    )
    SELECT n FROM seq
) s ON s.n <= r.rack_size
WHERE r.idc_id = ${d.idcId} AND r.idc_zone_id = ${zId};`);
        });

        return lines.join('\n');
    },

    highlightSQL(sql) {
        return sql
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>')
            .replace(/\b(INSERT INTO|SELECT|FROM|WHERE|VALUES|JOIN|ON|WITH RECURSIVE|UNION ALL|AS|AND|NULL|CROSS JOIN|NOW|IFNULL|MAX|ROW_NUMBER|OVER|ORDER BY|CONCAT|LPAD)\b/gi,
                '<span class="sql-keyword">$1</span>')
            .replace(/'([^']*)'/g, '\'<span class="sql-string">$1</span>\'')
            .replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>');
    },

    copySQL() {
        if (!this._rawSQL) return;
        navigator.clipboard.writeText(this._rawSQL).then(() => {
            const btn = document.getElementById('btn-copy-sql');
            btn.textContent = '복사됨!';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = '복사'; btn.classList.remove('copied'); }, 2000);
        }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = this._rawSQL;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            Layout.showToast('복사되었습니다.');
        });
    }
};

document.addEventListener('DOMContentLoaded', () => IdcRequestTask.init());
