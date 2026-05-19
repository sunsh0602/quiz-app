const CertVerifyTask = {
    init() {
        document.getElementById('btn-cert-render').addEventListener('click', () => this.renderResult());
        document.getElementById('btn-cert-example').addEventListener('click', () => this.loadExample());
        document.getElementById('btn-cert-clear').addEventListener('click', () => {
            document.getElementById('cert-input').value = '';
            document.getElementById('cert-result-card').classList.add('hidden');
        });
    },

    loadExample() {
        document.getElementById('cert-input').value = `=== 인증서 검증 (/Users/nhn/deploy/result/cloud.toast.com/2026.3/deploy) ===

[검사] 파일 존재 확인
[OK]   Chain_RootCA_Bundle.crt 존재
       └─ 크기: 6786 bytes
[OK]   private_toast.key 존재
       └─ 크기: 1886 bytes
[OK]   star_cloud_toast_com_cert.pem 존재
       └─ 크기: 2467 bytes

[검사] 인증서 유효기간
[OK]   Subject  : C=KR, ST=Gyeonggi-do, O=NHN Corporation, CN=*.cloud.toast.com
[OK]   Issuer   : C=GB, ST=Greater Manchester, L=Salford, O=Sectigo Limited, CN=Sectigo RSA Organization Validation Secure Server CA
[OK]   Serial   : 6648966FB7A2BCF8D33489D13B27AFC4
[OK]   SAN      : DNS:*.cloud.toast.com,DNS:cloud.toast.com
[OK]   notBefore: Mar  8 00:00:00 2026 GMT
[OK]   notAfter : Apr  8 23:59:59 2027 GMT
Certificate will not expire
[OK]   만료 여부  : 유효 (만료 전)

[검사] 개인키 복호화
       └─ passphrase.txt 읽음: 11자
[OK]   개인키 복호화 성공 (passphrase 일치)
       └─ passphrase 길이: 11자

[검사] 인증서·개인키 쌍 일치
       └─ 인증서 modulus MD5: 8fd12e27b90d9525b584c9e18348bbdf
       └─ 개인키  modulus MD5: 8fd12e27b90d9525b584c9e18348bbdf
[OK]   modulus 일치 → 인증서·개인키 쌍 정상

[검사] CA 체인 일치
       └─ 리프 Issuer : C=GB, ST=Greater Manchester, L=Salford, O=Sectigo Limited, CN=Sectigo RSA Organization Validation Secure Server CA
[FAIL] 리프 인증서 Issuer가 체인 번들에 없음 — 체인 파일이 이 인증서용이 아닐 수 있음
       └─ 체인 번들 내 Subject 목록:
       └─   · C=GB, O=Sectigo Limited, CN=Sectigo Public Server Authentication CA OV R36
       └─   · C=GB, O=Sectigo Limited, CN=Sectigo Public Server Authentication Root R46
       └─   · C=US, ST=New Jersey, L=Jersey City, O=The USERTRUST Network, CN=USERTrust RSA Certification Authority

=== 검증 실패가 있습니다 ===`;
        Layout.showToast('예제 데이터를 불러왔습니다.');
    },

    renderResult() {
        const raw = document.getElementById('cert-input').value.trim();
        if (!raw) {
            Layout.showToast('검증 결과를 입력해주세요.', 'error');
            return;
        }

        const lines = raw.split('\n');
        let okCount = 0;
        let failCount = 0;

        const highlighted = lines.map((line, lineIdx) => {
            const escaped = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            if (/^===.*===\s*$/.test(line)) {
                const cls = /실패/.test(line) ? 'cert-line-section-fail' : 'cert-line-section';
                return `<span class="${cls}">${escaped}</span>`;
            }
            if (/^\[검사\]/.test(line)) {
                return `<span class="cert-line-check">${escaped}</span>`;
            }
            if (/^\[OK\]/.test(line)) {
                okCount++;
                return escaped.replace(/\[OK\]/, '<span class="cert-tag-ok">[OK]</span>');
            }
            if (/^\[FAIL\]/.test(line)) {
                failCount++;
                return `<span class="cert-line-fail">${escaped.replace(
                    /\[FAIL\]/, '<span class="cert-tag-fail">[FAIL]</span>'
                )}</span>`;
            }
            if (/^\s+└─/.test(line)) {
                const parentFail = this._isPrevFail(lines, lineIdx);
                return parentFail
                    ? `<span class="cert-line-fail-detail">${escaped}</span>`
                    : `<span class="cert-line-detail">${escaped}</span>`;
            }
            if (/^Certificate will not expire/.test(line)) {
                return `<span class="cert-line-ok-text">${escaped}</span>`;
            }
            return escaped;
        }).join('\n');

        const resultCard = document.getElementById('cert-result-card');
        resultCard.classList.remove('hidden');

        const summary = document.getElementById('cert-summary');
        summary.innerHTML = failCount > 0
            ? `<span class="summary-ok">OK ${okCount}</span><span class="summary-fail">FAIL ${failCount}</span>`
            : `<span class="summary-ok">ALL PASS (${okCount})</span>`;

        document.getElementById('cert-output').innerHTML = highlighted;
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    _isPrevFail(lines, currentIdx) {
        for (let i = currentIdx - 1; i >= 0; i--) {
            const l = lines[i].trim();
            if (/^\[FAIL\]/.test(l)) return true;
            if (/^\[OK\]/.test(l) || /^\[검사\]/.test(l) || /^===/.test(l)) return false;
            if (!/^└─/.test(l) && l !== '') return false;
        }
        return false;
    }
};

document.addEventListener('DOMContentLoaded', () => CertVerifyTask.init());
