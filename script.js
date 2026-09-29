// ============================================================================
// SolarLedger frontend — wired to the Express/MongoDB backend
// ============================================================================
const API_BASE = 'http://localhost:5000/api';

// Pages live either at the repo root or inside admin/. Work out which, so
// every redirect/link below points at the right relative path either way.
const IS_ADMIN_PAGE = window.location.pathname.replace(/\\/g, '/').includes('/admin/');
const ROOT = IS_ADMIN_PAGE ? '../' : '';

// ---- session helpers --------------------------------------------------
function getToken() { return localStorage.getItem('sl_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('sl_user') || 'null'); }
  catch (e) { return null; }
}
function setSession(token, user) {
  localStorage.setItem('sl_token', token);
  localStorage.setItem('sl_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('sl_token');
  localStorage.removeItem('sl_user');
}
function initials(name) {
  if (!name) return '--';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '--';
}
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- API wrapper --------------------------------------------------------
async function api(path, options = {}) {
  const token = getToken();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let res;
  try {
    res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
  } catch (err) {
    throw new Error('Could not reach the backend. Is it running on http://localhost:5000?');
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (res.status === 401) {
    clearSession();
    window.location.href = ROOT + 'login.html';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

// ---- route guard ---------------------------------------------------------
// Call at the top of any protected page. Returns the logged-in user, or
// redirects (and returns null) if the session is missing/wrong role.
function requireAuth(requiredRole) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    window.location.href = ROOT + 'login.html';
    return null;
  }
  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role === 'admin' ? ROOT + 'admin/admin-dashboard.html' : ROOT + 'dashboard.html';
    return null;
  }
  return user;
}

// Logout — every page's sidebar has a `.sidebar-logout` link.
document.querySelectorAll('.sidebar-logout').forEach((link) => {
  link.addEventListener('click', () => clearSession());
});

// ---- server-verified session ---------------------------------------------
// localStorage alone proves nothing (a stale or hand-edited token still "looks"
// logged in), so ask the backend. Returns the real user, or null.
async function verifySession() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(API_BASE + '/auth/me', { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) { clearSession(); return null; }
    const data = await res.json();
    if (!data || !data.user) { clearSession(); return null; }
    setSession(token, data.user); // refresh cached name/role from the server
    return data.user;
  } catch (e) {
    return null; // backend unreachable: don't open a protected page
  }
}

// ---- global page guard ----------------------------------------------------
// Every page except these is protected. Runs on every page load, so it no
// longer depends on a particular element ID existing in the HTML.
const PUBLIC_PAGES = ['', 'index.html', 'login.html', 'register.html'];
const CURRENT_PAGE = window.location.pathname.replace(/\\/g, '/').split('/').pop();
if (!PUBLIC_PAGES.includes(CURRENT_PAGE)) {
  document.documentElement.style.visibility = 'hidden'; // hide until verified
  (async () => {
    const user = await verifySession();
    if (!user) { window.location.replace(ROOT + 'login.html'); return; }
    if (IS_ADMIN_PAGE && user.role !== 'admin') { window.location.replace(ROOT + 'dashboard.html'); return; }
    document.documentElement.style.visibility = '';
  })();
}

// ============================================================================
// Hero solar-cell sunrise sweep (unchanged — purely decorative)
// ============================================================================
const grid = document.getElementById('cellGrid');
if (grid) {
  const cols = 24, rows = 10;
  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const div = document.createElement('div');
      grid.appendChild(div);
      cells.push({ el: div, c, r });
    }
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReduced) {
    cells.forEach(cell => {
      const delay = cell.c * 40 + Math.random() * 200;
      setTimeout(() => {
        cell.el.classList.add('lit');
        setTimeout(() => {
          if (Math.random() > 0.4) cell.el.classList.remove('lit');
        }, 900);
      }, delay);
    });
  } else {
    cells.forEach(cell => { if (Math.random() > 0.7) cell.el.classList.add('lit'); });
  }
}

// Scroll reveal (unchanged — purely decorative)
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
}

// If someone who's already logged in lands back on login/register, send them on.
if (document.getElementById('loginForm') || document.getElementById('registerForm')) {
  verifySession().then((existing) => {
    if (existing) {
      window.location.href = existing.role === 'admin' ? 'admin/admin-dashboard.html' : 'dashboard.html';
    }
  });
}

// ============================================================================
// Login
// ============================================================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('formError');
    errorEl.textContent = '';

    if (!email || !password) {
      errorEl.textContent = 'Please fill in both fields.';
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errorEl.textContent = 'Please enter a valid email address.';
      return;
    }

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';

    try {
      const { token, user } = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(token, user);
      window.location.href = user.role === 'admin' ? 'admin/admin-dashboard.html' : 'dashboard.html';
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });
}

// ============================================================================
// Register
// ============================================================================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    if (!name || !email || !password || !confirmPassword) {
      errorEl.textContent = 'Please fill in all fields.';
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errorEl.textContent = 'Please enter a valid email address.';
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters.';
      return;
    }
    if (password !== confirmPassword) {
      errorEl.textContent = 'Passwords do not match.';
      return;
    }

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      window.location.href = 'login.html';
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
}

// ============================================================================
// Owner dashboard
// ============================================================================
const chartCanvas = document.getElementById('energyChart');
if (chartCanvas && !IS_ADMIN_PAGE) {
  (async () => {
    const user = requireAuth();
    if (!user) return;

    const greetingEl = document.getElementById('dashGreeting');
    if (greetingEl) {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      greetingEl.textContent = `Good ${timeOfDay}, ${user.name.split(' ')[0]}`;
    }
    const initialsEl = document.getElementById('dashUserInitials');
    if (initialsEl) initialsEl.textContent = initials(user.name);

    let plant = null;
    try {
      const { plants } = await api('/plants');
      plant = plants[0] || null;
    } catch (err) {
      console.error(err);
    }

    if (plant) {
      document.getElementById('plantName').textContent = plant.name || '—';
      document.getElementById('plantCapacity').textContent = plant.capacity_kw ? `${plant.capacity_kw} kW` : '—';
      document.getElementById('plantLocation').textContent = plant.location || '—';
      document.getElementById('plantInstalled').textContent = plant.installed_on ? formatDate(plant.installed_on) : '—';
      document.getElementById('plantInverter').textContent = plant.inverter || '—';
    }

    // Active faults, from this user's maintenance tickets
    try {
      const { tickets } = await api('/maintenance');
      const active = tickets.filter(t => t.status !== 'closed').length;
      const faultValueEl = document.querySelector('.stat-card:nth-child(4) .stat-value');
      const faultDeltaEl = document.querySelector('.stat-card:nth-child(4) .stat-delta');
      if (faultValueEl) faultValueEl.textContent = active;
      if (faultDeltaEl) faultDeltaEl.textContent = active > 0 ? 'Needs attention' : 'All clear';
      const statusValueEl = document.querySelector('.stat-card:nth-child(3) .stat-value');
      if (statusValueEl) statusValueEl.textContent = active > 0 ? 'Attention' : 'Healthy';
    } catch (err) {
      console.error(err);
    }

    // Generation chart, backed by real readings
    const ctx = chartCanvas.getContext('2d');
    let energyChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{
        label: 'Energy Generated (kWh)',
        data: [],
        borderColor: '#F4A623',
        backgroundColor: 'rgba(244,166,35,0.12)',
        tension: 0.35,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#F4A623',
      }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8FA3BF' }, grid: { color: 'rgba(143,163,191,0.1)' } },
          y: { ticks: { color: '#8FA3BF' }, grid: { color: 'rgba(143,163,191,0.1)' } },
        },
      },
    });

    async function loadRange(range) {
      if (!plant) return;
      try {
        const { readings } = await api(`/plants/${plant.id}/generation?range=${range}`);
        energyChart.data.labels = readings.map(r => formatDate(r.reading_date));
        energyChart.data.datasets[0].data = readings.map(r => r.kwh);
        energyChart.update();

        const todayEl = document.querySelector('.stat-card:nth-child(1) .stat-value');
        const monthEl = document.querySelector('.stat-card:nth-child(2) .stat-value');
        if (range === 'week' && readings.length && todayEl) {
          const last = readings[readings.length - 1];
          todayEl.innerHTML = `${last.kwh} <span>kWh</span>`;
        }
        if (range === 'month' && monthEl) {
          const total = readings.reduce((sum, r) => sum + r.kwh, 0);
          monthEl.innerHTML = `${total.toLocaleString()} <span>kWh</span>`;
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadRange('week');
    loadRange('month'); // also fills the "This Month" stat card

    document.querySelectorAll('.chart-tab').forEach(tab => {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        loadRange(this.dataset.range);
      });
    });
  })();
}

// ============================================================================
// Maintenance (owner-facing)
// ============================================================================
const maintenanceForm = document.getElementById('maintenanceForm');
const ticketList = document.getElementById('ticketList');
if (ticketList && !IS_ADMIN_PAGE) {
  (async () => {
    const user = requireAuth();
    if (!user) return;

    async function loadTickets() {
      try {
        const { tickets } = await api('/maintenance');
        ticketList.innerHTML = '';
        if (!tickets.length) {
          ticketList.innerHTML = '<p style="color:#8FA3BF;">No maintenance requests yet.</p>';
          return;
        }
        tickets.forEach(t => {
          const row = document.createElement('div');
          row.className = 'ticket-row';
          const title = t.description || t.issue_type;
          row.innerHTML = `
            <div>
              <div class="ticket-title">${title}</div>
              <div class="ticket-date">Raised ${formatDate(t.created_at)}</div>
            </div>
            <span class="ticket-status ${t.status}">${t.status.replace('-', ' ')}</span>
          `;
          ticketList.appendChild(row);
        });
      } catch (err) {
        ticketList.innerHTML = `<p style="color:#E06666;">${err.message}</p>`;
      }
    }

    loadTickets();

    if (maintenanceForm) {
      maintenanceForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const issueType = document.getElementById('issueType').value;
        const issueDesc = document.getElementById('issueDesc').value.trim();
        const errorEl = document.getElementById('maintenanceError');
        errorEl.textContent = '';

        if (!issueType || !issueDesc) {
          errorEl.textContent = 'Please select an issue type and add a description.';
          return;
        }

        const submitBtn = maintenanceForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';

        try {
          await api('/maintenance', {
            method: 'POST',
            body: JSON.stringify({ issue_type: issueType, description: issueDesc }),
          });
          maintenanceForm.reset();
          loadTickets();
        } catch (err) {
          errorEl.textContent = err.message;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Request';
        }
      });
    }
  })();
}

// ============================================================================
// Reports (owner-facing)
// ============================================================================
async function downloadReportPdf(id, title) {
  const res = await fetch(`${API_BASE}/reports/${id}/pdf`, { headers: { Authorization: 'Bearer ' + getToken() } });
  if (!res.ok) {
    let msg = 'Could not generate the PDF.';
    try { msg = (await res.json()).error || msg; } catch (e) { /* not JSON */ }
    throw new Error(msg);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') + '.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const reportTableBody = document.getElementById('reportTableBody');
if (reportTableBody) {
  (async () => {
    const user = requireAuth();
    if (!user) return;

    async function loadReports() {
      try {
        const { reports } = await api('/reports');
        if (!reports.length) {
          reportTableBody.innerHTML = '<tr><td colspan="4">No reports generated yet.</td></tr>';
          return;
        }
        reportTableBody.innerHTML = reports.map(r => `
          <tr>
            <td>${r.title}</td>
            <td>${r.report_type}</td>
            <td>${formatDate(r.generated_on)}</td>
            <td><button class="btn-secondary report-link-btn" data-id="${r.id}" data-report="${r.title}">Download</button></td>
          </tr>
        `).join('');
        document.querySelectorAll('.report-link-btn[data-report]').forEach(btn => {
          btn.addEventListener('click', async function () {
            try { await downloadReportPdf(this.dataset.id, this.dataset.report); }
            catch (err) { alert(err.message); }
          });
        });
      } catch (err) {
        reportTableBody.innerHTML = `<tr><td colspan="4">${err.message}</td></tr>`;
      }
    }

    loadReports();

    document.querySelectorAll('.report-download-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const type = this.dataset.type || 'monthly';
        const now = new Date();
        const title = type === 'annual'
          ? `${this.dataset.report} - ${now.getFullYear()}`
          : `${this.dataset.report} - ${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
        try {
          const { report } = await api('/reports', {
            method: 'POST',
            body: JSON.stringify({ title, report_type: type }),
          });
          await downloadReportPdf(report.id, title);
          loadReports();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  })();
}

// ============================================================================
// Profile (owner + admin)
// ============================================================================
const profileForm = document.getElementById('profileForm');
if (profileForm) {
  (async () => {
    const user = requireAuth();
    if (!user) return;

    try {
      const { user: me } = await api('/auth/me');
      document.getElementById('profileAvatar').textContent = initials(me.name);
      document.getElementById('profileNameDisplay').textContent = me.name;
      document.getElementById('profileEmailDisplay').textContent = me.email;
      document.getElementById('profileRoleValue').textContent = me.role === 'admin' ? 'Admin' : 'Plant Owner';
      document.getElementById('profileSinceValue').textContent = formatDate(me.created_at);

      document.getElementById('fullName').value = me.name;
      document.getElementById('profileEmail').value = me.email;
      document.getElementById('phone').value = me.phone || '';

      try {
        const { plants } = await api('/plants');
        document.getElementById('profilePlantsValue').textContent = plants.length;
      } catch (e) { /* non-fatal */ }

      setSession(getToken(), me); // keep cached name/role fresh
    } catch (err) {
      console.error(err);
    }

    profileForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('profileEmail').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const errorEl = document.getElementById('profileError');
      const successEl = document.getElementById('profileSuccess');
      errorEl.textContent = '';
      successEl.textContent = '';

      if (!fullName || !email) {
        errorEl.textContent = 'Name and email cannot be empty.';
        return;
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        errorEl.textContent = 'Please enter a valid email address.';
        return;
      }

      try {
        const { user: updated } = await api('/auth/me', {
          method: 'PUT',
          body: JSON.stringify({ fullName, email, phone }),
        });
        setSession(getToken(), updated);
        document.getElementById('profileNameDisplay').textContent = updated.name;
        document.getElementById('profileEmailDisplay').textContent = updated.email;
        document.getElementById('profileAvatar').textContent = initials(updated.name);
        successEl.textContent = 'Profile updated.';
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });

    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const errorEl = document.getElementById('passwordError');
        const successEl = document.getElementById('passwordSuccess');
        errorEl.textContent = '';
        successEl.textContent = '';

        if (!currentPassword || !newPassword) {
          errorEl.textContent = 'Please fill in both fields.';
          return;
        }
        if (newPassword.length < 6) {
          errorEl.textContent = 'New password must be at least 6 characters.';
          return;
        }

        try {
          await api('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
          });
          passwordForm.reset();
          successEl.textContent = 'Password updated.';
        } catch (err) {
          errorEl.textContent = err.message;
        }
      });
    }
  })();
}

// ============================================================================
// Admin dashboard
// ============================================================================
const fleetCanvas = document.getElementById('fleetChart');
if (fleetCanvas) {
  (async () => {
    const user = requireAuth('admin');
    if (!user) return;

    const initialsEl = document.getElementById('adminUserInitials');
    if (initialsEl) initialsEl.textContent = initials(user.name);

    try {
      const { users } = await api('/users');
      document.getElementById('statTotalUsers').textContent = users.length;
    } catch (err) { console.error(err); }

    try {
      const { plants } = await api('/plants');
      document.getElementById('statTotalPlants').textContent = plants.length;
    } catch (err) { console.error(err); }

    try {
      const { tickets } = await api('/maintenance');
      const active = tickets.filter(t => t.status !== 'closed').length;
      document.getElementById('statActiveRequests').textContent = active;
    } catch (err) { console.error(err); }

    // Fleet generation chart stays demo data — no fleet-wide aggregation
    // endpoint exists yet (per-plant /generation is the only readings API).
    new Chart(fleetCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Fleet Generation (kWh)',
          data: [4820, 5120, 4390, 5340, 5010, 5480, 5210],
          backgroundColor: '#59D8C6',
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8FA3BF' }, grid: { display: false } },
          y: { ticks: { color: '#8FA3BF' }, grid: { color: 'rgba(143,163,191,0.1)' } },
        },
      },
    });
  })();
}

// ============================================================================
// Admin: User Management
// ============================================================================
const userTableBody = document.getElementById('userTableBody');
if (userTableBody) {
  (async () => {
    const user = requireAuth('admin');
    if (!user) return;

    const initialsEl = document.getElementById('adminUserInitials');
    if (initialsEl) initialsEl.textContent = initials(user.name);

    async function loadUsers() {
      try {
        const { users } = await api('/users');
        userTableBody.innerHTML = users.map(u => `
          <tr data-id="${u.id}">
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>${u.plant_count}</td>
            <td>${u.status}</td>
            <td><button class="btn-secondary user-remove-btn">Remove</button></td>
          </tr>
        `).join('');

        userTableBody.querySelectorAll('.user-remove-btn').forEach(btn => {
          btn.addEventListener('click', async function () {
            const row = this.closest('tr');
            const id = row.dataset.id;
            if (!confirm('Remove this user? This cannot be undone.')) return;
            try {
              await api(`/users/${id}`, { method: 'DELETE' });
              row.remove();
            } catch (err) {
              alert(err.message);
            }
          });
        });
      } catch (err) {
        userTableBody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
      }
    }

    loadUsers();

    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', async () => {
        const name = prompt('Full name:');
        if (!name) return;
        const email = prompt('Email:');
        if (!email) return;
        const password = prompt('Temporary password (min 6 characters):');
        if (!password) return;
        const role = confirm('Click OK to make this user an Admin, Cancel for a regular Plant Owner.') ? 'admin' : 'owner';

        try {
          await api('/users', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role }),
          });
          loadUsers();
        } catch (err) {
          alert(err.message);
        }
      });
    }
  })();
}

// ============================================================================
// Admin: Plant Management
// ============================================================================
const plantTableBody = document.getElementById('plantTableBody');
if (plantTableBody) {
  (async () => {
    const user = requireAuth('admin');
    if (!user) return;

    const initialsEl = document.getElementById('adminUserInitials');
    if (initialsEl) initialsEl.textContent = initials(user.name);

    async function loadPlants() {
      try {
        const { plants } = await api('/plants');
        plantTableBody.innerHTML = plants.map(p => `
          <tr data-id="${p.id}">
            <td>${p.name}</td>
            <td>${p.owner_name || '—'}</td>
            <td>${p.capacity_kw ? p.capacity_kw + ' kW' : '—'}</td>
            <td>${p.location || '—'}</td>
            <td>Active</td>
            <td><button class="btn-secondary plant-remove-btn">Remove</button></td>
          </tr>
        `).join('');

        plantTableBody.querySelectorAll('.plant-remove-btn').forEach(btn => {
          btn.addEventListener('click', async function () {
            const row = this.closest('tr');
            const id = row.dataset.id;
            if (!confirm('Remove this plant? This cannot be undone.')) return;
            try {
              await api(`/plants/${id}`, { method: 'DELETE' });
              row.remove();
            } catch (err) {
              alert(err.message);
            }
          });
        });
      } catch (err) {
        plantTableBody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
      }
    }

    loadPlants();

    const addPlantBtn = document.getElementById('addPlantBtn');
    if (addPlantBtn) {
      addPlantBtn.addEventListener('click', async () => {
        const ownerEmail = prompt("Owner's email (must already be a registered user):");
        if (!ownerEmail) return;
        const name = prompt('Plant name:');
        if (!name) return;
        const capacity_kw = prompt('Capacity (kW):') || null;
        const location = prompt('Location:') || null;
        const installed_on = prompt('Installed on (YYYY-MM-DD):') || null;
        const inverter = prompt('Inverter model:') || null;

        try {
          const { users } = await api('/users');
          const owner = users.find(u => u.email.toLowerCase() === ownerEmail.trim().toLowerCase());
          if (!owner) {
            alert('No user found with that email. Add the user first.');
            return;
          }
          await api('/plants', {
            method: 'POST',
            body: JSON.stringify({
              owner_id: owner.id, name,
              capacity_kw: capacity_kw ? Number(capacity_kw) : null,
              location, installed_on, inverter,
            }),
          });
          loadPlants();
        } catch (err) {
          alert(err.message);
        }
      });
    }
  })();
}

// ============================================================================
// Admin: Maintenance Management
// ============================================================================
const adminTicketBody = document.getElementById('adminTicketBody');
if (adminTicketBody) {
  (async () => {
    const user = requireAuth('admin');
    if (!user) return;

    const initialsEl = document.getElementById('adminUserInitials');
    if (initialsEl) initialsEl.textContent = initials(user.name);

    try {
      const { tickets } = await api('/maintenance');
      if (!tickets.length) {
        adminTicketBody.innerHTML = '<tr><td colspan="6">No maintenance requests yet.</td></tr>';
      } else {
        adminTicketBody.innerHTML = tickets.map(t => `
          <tr data-id="${t.id}">
            <td>${t.description || t.issue_type}</td>
            <td>${t.raised_by_name || '—'}</td>
            <td>${t.plant_name || '—'}</td>
            <td>${t.technician || 'Unassigned'}</td>
            <td><span class="ticket-status ${t.status}">${t.status.replace('-', ' ')}</span></td>
            <td>
              <select class="ticket-status-select form-select">
                <option value="assigned" ${t.status === 'assigned' ? 'selected' : ''}>Assigned</option>
                <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                <option value="closed" ${t.status === 'closed' ? 'selected' : ''}>Closed</option>
              </select>
            </td>
          </tr>
        `).join('');
      }

      document.querySelectorAll('.ticket-status-select').forEach(select => {
        select.addEventListener('change', async function () {
          const row = this.closest('tr');
          const id = row.dataset.id;
          const value = this.value;
          const badge = row.querySelector('.ticket-status');

          try {
            await api(`/maintenance/${id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: value }),
            });
            badge.classList.remove('assigned', 'in-progress', 'closed');
            badge.classList.add(value);
            const labels = { assigned: 'Assigned', 'in-progress': 'In Progress', closed: 'Closed' };
            badge.textContent = labels[value];
          } catch (err) {
            alert(err.message);
          }
        });
      });
    } catch (err) {
      adminTicketBody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
    }
  })();
}

// ============================================================================
// Admin: Reports (fleet-wide report history)
// ============================================================================
if (IS_ADMIN_PAGE && CURRENT_PAGE === 'reports.html') {
  (async () => {
    const user = requireAuth('admin');
    if (!user) return;

    const initialsEl = document.getElementById('adminUserInitials');
    if (initialsEl) initialsEl.textContent = initials(user.name);

    const body = document.getElementById('adminReportBody') || document.querySelector('tbody');
    if (!body) return;

    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    try {
      const { reports } = await api('/reports/all');
      if (!reports.length) {
        body.innerHTML = '<tr><td colspan="4">No reports have been generated yet.</td></tr>';
        return;
      }
      body.innerHTML = reports.map((r) => `
        <tr>
          <td><a href="#" class="admin-report-link" data-id="${esc(r.id)}" data-title="${esc(r.title)}">${esc(r.title)}</a></td>
          <td>${esc(r.owner_name)}</td>
          <td>${esc(r.report_type)}</td>
          <td>${formatDate(r.generated_on)}</td>
        </tr>
      `).join('');

      body.querySelectorAll('.admin-report-link').forEach((link) => {
        link.addEventListener('click', async function (e) {
          e.preventDefault();
          try { await downloadReportPdf(this.dataset.id, this.dataset.title); }
          catch (err) { alert(err.message); }
        });
      });
    } catch (err) {
      body.innerHTML = `<tr><td colspan="4">${esc(err.message)}</td></tr>`;
    }
  })();
}