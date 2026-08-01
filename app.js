const STORAGE_KEY = 'calendarTasksData';
const MAJOR_TASK_TEXT = 'Went to Study Hall';

let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
// data shape: { "2026-08-01": [ {text:"...", done:false, major:true}, ... ], ... }

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function todayKeyValue() {
  const t = new Date();
  t.setHours(0,0,0,0);
  return dateKey(t);
}

// Ensures the major "Went to Study Hall" task exists for a given date key,
// but only if that date is today or in the future. Past dates are untouched.
function ensureMajorTask(key) {
  const isPastDate = key < todayKeyValue();
  if (isPastDate) return;

  if (!data[key]) data[key] = [];
  const hasMajor = data[key].some(t => t.major);
  if (!hasMajor) {
    data[key].unshift({ text: MAJOR_TASK_TEXT, done: false, major: true });
  }
}

// Returns the tasks for a date, injecting the major task in-memory if needed
// (without necessarily persisting until the user interacts with it).
function getTasksForDate(key) {
  ensureMajorTask(key);
  return data[key] || [];
}

function isMajorDone(key) {
  const tasks = data[key] || [];
  const major = tasks.find(t => t.major);
  return major ? major.done : false;
}

let currentView = 'month';
let cursor = new Date();
let listStart = new Date();
listStart.setHours(0,0,0,0);

const monthViewEl = document.getElementById('monthView');
const listViewEl = document.getElementById('listView');
const navLabel = document.getElementById('navLabel');
const modalRoot = document.getElementById('modalRoot');

document.getElementById('btnMonth').onclick = () => switchView('month');
document.getElementById('btnList').onclick = () => switchView('list');
document.getElementById('prevBtn').onclick = () => nav(-1);
document.getElementById('nextBtn').onclick = () => nav(1);
document.getElementById('todayBtn').onclick = () => {
  cursor = new Date();
  listStart = new Date();
  listStart.setHours(0,0,0,0);
  render();
};

function switchView(v) {
  currentView = v;
  document.getElementById('btnMonth').classList.toggle('active', v==='month');
  document.getElementById('btnList').classList.toggle('active', v==='list');
  monthViewEl.style.display = v==='month' ? '' : 'none';
  listViewEl.style.display = v==='list' ? '' : 'none';
  render();
}

function nav(dir) {
  if (currentView === 'month') {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
  } else {
    listStart = new Date(listStart);
    listStart.setDate(listStart.getDate() + dir*14);
  }
  render();
}

function render() {
  if (currentView === 'month') renderMonth();
  else renderList();
}

function renderMonth() {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  navLabel.textContent = monthNames[month] + ' ' + year;

  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayKey = todayKeyValue();

  let html = '<div class="grid">';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    html += `<div class="weekday">${d}</div>`;
  });

  for (let i=0; i<startWeekday; i++) {
    html += '<div class="day-cell empty"></div>';
  }

  for (let day=1; day<=daysInMonth; day++) {
    const d = new Date(year, month, day);
    const key = dateKey(d);
    const tasks = getTasksForDate(key);
    const isToday = key === todayKey;
    const majorDone = isMajorDone(key);

    let preview = '';
    tasks.slice(0,3).forEach(t => {
      const classes = ['task-preview'];
      if (t.done) classes.push('done');
      if (t.major) classes.push('major');
      preview += `<div class="${classes.join(' ')}">${escapeHtml(t.text)}</div>`;
    });
    const doneCount = tasks.filter(t=>t.done).length;
    const progress = tasks.length ? `${doneCount}/${tasks.length} done` : '';

    const cellClasses = ['day-cell'];
    if (isToday) cellClasses.push('today');
    if (majorDone) cellClasses.push('studyhall-done');

    html += `<div class="${cellClasses.join(' ')}" data-key="${key}">
      <div class="day-num">${day}</div>
      ${preview}
      ${progress ? `<div class="progress-dot">${progress}</div>` : ''}
    </div>`;
  }

  html += '</div>';
  monthViewEl.innerHTML = html;

  monthViewEl.querySelectorAll('.day-cell[data-key]').forEach(cell => {
    cell.onclick = () => openDayModal(cell.dataset.key);
  });
}

function renderList() {
  navLabel.textContent = formatRange(listStart);
  const dowNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const todayKey = todayKeyValue();

  let html = '<div class="day-list">';
  for (let i=0; i<14; i++) {
    const d = new Date(listStart);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const tasks = getTasksForDate(key);
    const isToday = key === todayKey;
    const majorDone = isMajorDone(key);

    const rowClasses = ['day-row'];
    if (isToday) rowClasses.push('today');
    if (majorDone) rowClasses.push('studyhall-done');

    html += `<div class="${rowClasses.join(' ')}">
      <div class="day-row-header">
        <span class="dow">${dowNames[d.getDay()]}</span>
        <span class="dnum">${d.toLocaleDateString(undefined,{month:'short', day:'numeric'})}</span>
        <span class="count">${tasks.filter(t=>t.done).length}/${tasks.length}</span>
      </div>
      <div class="tasks-container" data-key="${key}">
        ${tasks.length === 0 ? '<div class="empty-hint">No tasks</div>' : tasks.map((t, idx) => taskItemHtml(key, t, idx)).join('')}
      </div>
      <div class="add-task">
        <input type="text" placeholder="Add a task..." data-key="${key}" class="new-task-input">
        <button class="add-btn" data-key="${key}">Add</button>
      </div>
    </div>`;
  }
  html += '</div>';
  listViewEl.innerHTML = html;
  wireTaskEvents(listViewEl);
}

function taskItemHtml(key, t, idx) {
  const classes = ['task-item'];
  if (t.major) classes.push('major');
  return `<div class="${classes.join(' ')}">
    <input type="checkbox" ${t.done?'checked':''} data-key="${key}" data-idx="${idx}" class="task-check">
    <span class="${t.done?'done':''}">${escapeHtml(t.text)}</span>
    ${t.major ? '<span class="major-label">Major</span>' : ''}
    ${t.major ? '' : `<button class="del" data-key="${key}" data-idx="${idx}">✕</button>`}
  </div>`;
}

function wireTaskEvents(root) {
  root.querySelectorAll('.task-check').forEach(cb => {
    cb.onchange = () => {
      const key = cb.dataset.key, idx = +cb.dataset.idx;
      data[key][idx].done = cb.checked;
      save();
      render();
      if (document.getElementById('modalRoot').innerHTML) openDayModal(key);
    };
  });
  root.querySelectorAll('.del').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.key, idx = +btn.dataset.idx;
      data[key].splice(idx, 1);
      if (data[key].length === 0) delete data[key];
      save();
      render();
      if (document.getElementById('modalRoot').innerHTML) openDayModal(key);
    };
  });
  root.querySelectorAll('.add-btn').forEach(btn => {
    btn.onclick = () => addTask(btn.dataset.key, root);
  });
  root.querySelectorAll('.new-task-input').forEach(input => {
    input.onkeydown = (e) => { if (e.key === 'Enter') addTask(input.dataset.key, root); };
  });
}

function addTask(key, root) {
  const input = root.querySelector(`.new-task-input[data-key="${key}"]`);
  const text = input.value.trim();
  if (!text) return;
  if (!data[key]) data[key] = [];
  data[key].push({text, done:false, major:false});
  save();
  render();
  if (document.getElementById('modalRoot').innerHTML) openDayModal(key);
}

function openDayModal(key) {
  const tasks = getTasksForDate(key);
  const d = new Date(key + 'T00:00:00');
  const label = d.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric', year:'numeric'});
  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="backdrop">
      <div class="modal">
        <button class="modal-close" id="closeModal">✕</button>
        <h2>${label}</h2>
        <div class="tasks-container" data-key="${key}">
          ${tasks.length === 0 ? '<div class="empty-hint">No tasks yet</div>' : tasks.map((t, idx) => taskItemHtml(key, t, idx)).join('')}
        </div>
        <div class="add-task">
          <input type="text" placeholder="Add a task..." data-key="${key}" class="new-task-input">
          <button class="add-btn" data-key="${key}">Add</button>
        </div>
      </div>
    </div>
  `;
  wireTaskEvents(modalRoot);
  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('backdrop').onclick = (e) => { if (e.target.id === 'backdrop') closeModal(); };
}

function closeModal() {
  modalRoot.innerHTML = '';
  render();
}

function formatRange(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  const opts = {month:'short', day:'numeric'};
  return start.toLocaleDateString(undefined, opts) + ' – ' + end.toLocaleDateString(undefined, opts);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

render();