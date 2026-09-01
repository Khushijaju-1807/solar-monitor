// Hero solar-cell sunrise sweep
const grid = document.getElementById('cellGrid');
if(grid){
  const cols = 24, rows = 10;
  const cells = [];

  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const div = document.createElement('div');
      grid.appendChild(div);
      cells.push({el:div, c, r});
    }
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(!prefersReduced){
    cells.forEach(cell=>{
      const delay = cell.c * 40 + Math.random()*200;
      setTimeout(()=>{
        cell.el.classList.add('lit');
        setTimeout(()=>{
          if(Math.random() > 0.4) cell.el.classList.remove('lit');
        }, 900);
      }, delay);
    });
  } else {
    cells.forEach(cell=>{ if(Math.random()>0.7) cell.el.classList.add('lit'); });
  }
}

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
if(revealEls.length){
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, {threshold:0.15});
  revealEls.forEach(el=>io.observe(el));
}

// Login form validation
const loginForm = document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit', function(e){
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorEl = document.getElementById('formError');

    if(!email || !password){
      errorEl.textContent = 'Please fill in both fields.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailPattern.test(email)){
      errorEl.textContent = 'Please enter a valid email address.';
      return;
    }

    errorEl.textContent = '';
    const roleInput = document.querySelector('input[name="role"]:checked');
    const role = roleInput ? roleInput.value : 'user';
    window.location.href = role === 'admin' ? 'admin/admin-dashboard.html' : 'dashboard.html';
  });
}

// Register form validation
const registerForm = document.getElementById('registerForm');
if(registerForm){
  registerForm.addEventListener('submit', function(e){
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const errorEl = document.getElementById('registerError');

    if(!name || !email || !password || !confirmPassword){
      errorEl.textContent = 'Please fill in all fields.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailPattern.test(email)){
      errorEl.textContent = 'Please enter a valid email address.';
      return;
    }

    if(password.length < 6){
      errorEl.textContent = 'Password must be at least 6 characters.';
      return;
    }

    if(password !== confirmPassword){
      errorEl.textContent = 'Passwords do not match.';
      return;
    }

    errorEl.textContent = '';
    window.location.href = 'login.html';
  });
}

// Energy analytics chart (dashboard page)
const chartCanvas = document.getElementById('energyChart');
if(chartCanvas){
  const dataSets = {
    week: {labels:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], values:[38,42,29,45,41,47,43]},
    month: {labels:['Wk 1','Wk 2','Wk 3','Wk 4'], values:[260,298,275,310]},
    year: {labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], values:[820,860,910,980,1040,1120,1180,1150,1050,960,880,830]}
  };

  const ctx = chartCanvas.getContext('2d');
  let energyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataSets.week.labels,
      datasets: [{
        label: 'Energy Generated (kWh)',
        data: dataSets.week.values,
        borderColor: '#F4A623',
        backgroundColor: 'rgba(244,166,35,0.12)',
        tension: 0.35,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#F4A623'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{ color:'#8FA3BF' }, grid:{ color:'rgba(143,163,191,0.1)' } },
        y:{ ticks:{ color:'#8FA3BF' }, grid:{ color:'rgba(143,163,191,0.1)' } }
      }
    }
  });

  document.querySelectorAll('.chart-tab').forEach(tab=>{
    tab.addEventListener('click', function(){
      document.querySelectorAll('.chart-tab').forEach(t=>t.classList.remove('active'));
      this.classList.add('active');
      const range = this.dataset.range;
      energyChart.data.labels = dataSets[range].labels;
      energyChart.data.datasets[0].data = dataSets[range].values;
      energyChart.update();
    });
  });
}

// Maintenance request form
const maintenanceForm = document.getElementById('maintenanceForm');
if(maintenanceForm){
  maintenanceForm.addEventListener('submit', function(e){
    e.preventDefault();

    const issueType = document.getElementById('issueType').value;
    const issueDesc = document.getElementById('issueDesc').value.trim();
    const errorEl = document.getElementById('maintenanceError');

    if(!issueType || !issueDesc){
      errorEl.textContent = 'Please select an issue type and add a description.';
      return;
    }

    errorEl.textContent = '';

    const ticketList = document.getElementById('ticketList');
    const newTicket = document.createElement('div');
    newTicket.className = 'ticket-row';
    newTicket.innerHTML = `
      <div>
        <div class="ticket-title">${issueType.replace('-', ' ')}</div>
        <div class="ticket-date">Raised just now</div>
      </div>
      <span class="ticket-status assigned">Submitted</span>
    `;
    ticketList.prepend(newTicket);

    maintenanceForm.reset();
  });
}

// Report download buttons (placeholder — backend will generate real PDFs)
document.querySelectorAll('.report-download-btn').forEach(btn=>{
  btn.addEventListener('click', function(){
    const reportName = this.dataset.report;
    alert(`"${reportName}" would download here once the backend report-generation API is connected.`);
  });
});
document.querySelectorAll('.report-link-btn[data-report]').forEach(btn=>{
  btn.addEventListener('click', function(){
    const reportName = this.dataset.report;
    alert(`"${reportName}" would download here once the backend report-generation API is connected.`);
  });
});

// Profile form
const profileForm = document.getElementById('profileForm');
if(profileForm){
  profileForm.addEventListener('submit', function(e){
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    const errorEl = document.getElementById('profileError');
    const successEl = document.getElementById('profileSuccess');

    successEl.textContent = '';

    if(!fullName || !email){
      errorEl.textContent = 'Name and email cannot be empty.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailPattern.test(email)){
      errorEl.textContent = 'Please enter a valid email address.';
      return;
    }

    errorEl.textContent = '';
    successEl.textContent = 'Profile updated (not yet saved to backend).';
  });
}

// Admin fleet chart
const fleetCanvas = document.getElementById('fleetChart');
if(fleetCanvas){
  new Chart(fleetCanvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [{
        label: 'Fleet Generation (kWh)',
        data: [4820, 5120, 4390, 5340, 5010, 5480, 5210],
        backgroundColor: '#59D8C6',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{ color:'#8FA3BF' }, grid:{ display:false } },
        y:{ ticks:{ color:'#8FA3BF' }, grid:{ color:'rgba(143,163,191,0.1)' } }
      }
    }
  });
}

// Admin: user management (remove row + placeholder add)
document.querySelectorAll('.user-remove-btn').forEach(btn=>{
  btn.addEventListener('click', function(){
    if(confirm('Remove this user? This cannot be undone.')){
      this.closest('tr').remove();
    }
  });
});

const addUserBtn = document.getElementById('addUserBtn');
if(addUserBtn){
  addUserBtn.addEventListener('click', function(){
    alert('This is where the "Add User" form/modal will open once the backend user-creation API is connected.');
  });
}

// Admin: plant management (remove row + placeholder add)
document.querySelectorAll('.plant-remove-btn').forEach(btn=>{
  btn.addEventListener('click', function(){
    if(confirm('Remove this plant? This cannot be undone.')){
      this.closest('tr').remove();
    }
  });
});

const addPlantBtn = document.getElementById('addPlantBtn');
if(addPlantBtn){
  addPlantBtn.addEventListener('click', function(){
    alert('This is where the "Add Plant" form/modal will open once the backend plant-creation API is connected.');
  });
}

// Admin: maintenance status dropdown updates the badge live
document.querySelectorAll('.ticket-status-select').forEach(select=>{
  select.addEventListener('change', function(){
    const row = this.closest('tr');
    const badge = row.querySelector('.ticket-status');
    const value = this.value;

    badge.classList.remove('assigned','in-progress','closed');
    badge.classList.add(value);

    const labels = {assigned:'Assigned', 'in-progress':'In Progress', closed:'Closed'};
    badge.textContent = labels[value];
  });
});
