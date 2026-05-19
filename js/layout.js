const Layout = {
    menu: [
        {
            category: '상면관리',
            items: [
                { id: 'idc-request', label: 'IDC 요청', icon: '&#9634;', page: 'idc-request.html' }
            ]
        },
        {
            category: '인증서',
            items: [
                { id: 'cert-verify', label: '인증서 검증', icon: '&#9888;', page: 'cert-verify.html' }
            ]
        }
    ],

    init() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        this.renderSidebar(currentPage);
    },

    renderSidebar(currentPage) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        let html = `
            <div class="sidebar-header">
                <h1 class="sidebar-title">Infra Platform</h1>
                <p class="sidebar-subtitle">업무 자동화</p>
            </div>
            <nav class="sidebar-nav">`;

        this.menu.forEach((group, gIdx) => {
            const mt = gIdx > 0 ? ' style="margin-top:12px;"' : '';
            html += `<div class="nav-category"${mt}>${group.category}</div><ul class="nav-list">`;

            group.items.forEach(item => {
                const isActive = currentPage === item.page
                    || (currentPage === 'index.html' && item.page === 'idc-request.html');
                html += `
                <li>
                    <a href="${item.page}" class="nav-item${isActive ? ' active' : ''}">
                        <span class="nav-icon">${item.icon}</span>
                        ${item.label}
                    </a>
                </li>`;
            });

            html += '</ul>';
        });

        html += `
            </nav>
            <div class="sidebar-footer">
                <span class="version">v1.0.0</span>
            </div>`;

        sidebar.innerHTML = html;
    },

    showToast(message, type = 'success') {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = `toast ${type}`;
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
};

document.addEventListener('DOMContentLoaded', () => Layout.init());
