import { initIcons } from './icons.js';
import { 
  DataService, 
  calculateQuickStats, 
  formatDate,
  getUrgencyStatus
} from './data-service.js';
import { 
  generateMeetingBriefingPrompt, 
  generateParentRoshYeshivaUpdatePrompt, 
  generateGroupReportPrompt,
  generateShabbosInvitePrompt 
} from './prompt-templates.js';

// Application State
const state = {
  data: {
    students: [],
    logs: [],
    klal: []
  },
  selectedStudentId: null,
  radarFilter: 'all', // 'all' | 'critical' | 'attention' | 'recent' | 'agenda'
  searchQuery: '',
  col3SearchQuery: '',
  sortBy: 'urgency-desc',
  klalStatusFilter: 'active',
  klalCategoryFilter: 'all',
  activeCol3Tab: 'klal', // 'klal' | 'hospitality'
  isCol1Open: true,
  isCol2Open: true,
  isCol3Open: true,
  isEditingPinned: false,
  isLoading: false,
  syncStatus: 'init', // 'live' | 'cached' | 'syncing' | 'error'
  lastSyncTime: null,
  activePromptText: '',
  activePromptTitle: ''
};

// ================= DOM ELEMENTS =================
const elements = {
  // Sync & Header
  btnRefresh: document.getElementById('btn-refresh'),
  refreshIcon: document.getElementById('refresh-icon'),
  syncStatusIndicator: document.getElementById('sync-status-indicator'),
  syncDot: document.getElementById('sync-dot'),
  syncText: document.getElementById('sync-text'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),

  // Layout View Switcher
  viewAllColsBtn: document.getElementById('view-all-cols-btn'),
  viewFocusStudentBtn: document.getElementById('view-focus-student-btn'),
  viewFocusKlalBtn: document.getElementById('view-focus-klal-btn'),

  // Column 1: Radar & Collapsed strip
  colStudents: document.getElementById('col-students'),
  colStudentsCollapsed: document.getElementById('col-students-collapsed'),
  btnCollapseCol1: document.getElementById('btn-collapse-col1'),
  miniCriticalBadge: document.getElementById('mini-critical-badge'),
  filteredStudentsCount: document.getElementById('filtered-students-count'),
  searchStudentsInput: document.getElementById('search-students-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  studentSortSelect: document.getElementById('student-sort-select'),
  studentListContainer: document.getElementById('student-list-container'),
  tabCountAll: document.getElementById('tab-count-all'),
  tabCountCritical: document.getElementById('tab-count-critical'),
  tabCountAttention: document.getElementById('tab-count-attention'),
  tabCountRecent: document.getElementById('tab-count-recent'),
  tabCountAgenda: document.getElementById('tab-count-agenda'),
  filterButtons: document.querySelectorAll('.filter-tab-btn'),

  // Column 2: Dossier & Collapsed strip
  colDossier: document.getElementById('col-dossier'),
  colDossierCollapsed: document.getElementById('col-dossier-collapsed'),
  miniStudentBadge: document.getElementById('mini-student-badge'),
  miniStudentName: document.getElementById('mini-student-name'),
  dossierHeaderContainer: document.getElementById('dossier-header-container'),
  dossierBodyContainer: document.getElementById('dossier-body-container'),

  // Column 3: Klal & Hospitality & Collapsed strip
  colKlal: document.getElementById('col-klal'),
  colKlalCollapsed: document.getElementById('col-klal-collapsed'),
  btnCollapseCol3: document.getElementById('btn-collapse-col3'),
  miniKlalBadge: document.getElementById('mini-klal-badge'),
  col3TabKlal: document.getElementById('col3-tab-klal'),
  col3TabHospitality: document.getElementById('col3-tab-hospitality'),
  klalTabContent: document.getElementById('klal-tab-content'),
  hospitalityTabContent: document.getElementById('hospitality-tab-content'),
  klalStatusFilter: document.getElementById('klal-status-filter'),
  klalCategoryFilter: document.getElementById('klal-category-filter'),
  col3SearchInput: document.getElementById('col3-search-input'),
  clearCol3SearchBtn: document.getElementById('clear-col3-search-btn'),
  klalCardsContainer: document.getElementById('klal-cards-container'),
  hospitalityCardsContainer: document.getElementById('hospitality-cards-container'),
  btnCohortReport: document.getElementById('btn-cohort-report'),
  btnNewInitiativeHeader: document.getElementById('btn-new-initiative-header'),

  // Modals & Toast
  logMeetingModal: document.getElementById('log-meeting-modal'),
  formLogMeeting: document.getElementById('form-log-meeting'),
  closeLogModalBtn: document.getElementById('close-log-modal-btn'),
  cancelLogModalBtn: document.getElementById('cancel-log-modal-btn'),
  modalLogStudentSubtitle: document.getElementById('modal-log-student-subtitle'),
  inputLogType: document.getElementById('input-log-type'),
  inputLogDate: document.getElementById('input-log-date'),
  inputLogSummary: document.getElementById('input-log-summary'),
  inputLogNextsteps: document.getElementById('input-log-nextsteps'),
  inputLogClearAgenda: document.getElementById('input-log-clear-agenda'),

  newKlalModal: document.getElementById('new-klal-modal'),
  formNewKlal: document.getElementById('form-new-klal'),
  closeNewKlalModalBtn: document.getElementById('close-new-klal-modal-btn'),
  cancelNewKlalModalBtn: document.getElementById('cancel-new-klal-modal-btn'),
  inputKlalTitle: document.getElementById('input-klal-title'),
  inputKlalCategory: document.getElementById('input-klal-category'),
  inputKlalTiming: document.getElementById('input-klal-timing'),
  inputKlalStatus: document.getElementById('input-klal-status'),
  inputKlalVision: document.getElementById('input-klal-vision'),
  inputKlalActionplan: document.getElementById('input-klal-actionplan'),

  promptModal: document.getElementById('prompt-modal'),
  promptModalTitle: document.getElementById('prompt-modal-title'),
  promptModalTextarea: document.getElementById('prompt-modal-textarea'),
  closePromptModalBtn: document.getElementById('close-prompt-modal-btn'),
  cancelPromptModalBtn: document.getElementById('cancel-prompt-modal-btn'),
  modalCopyBtn: document.getElementById('modal-copy-btn'),
  toastContainer: document.getElementById('toast-container')
};

/**
 * Initialize icons
 */
function refreshIcons() {
  initIcons();
}

/**
 * Display a floating toast notification
 */
function showToast(message, type = 'success', duration = 3800) {
  const toast = document.createElement('div');
  const iconMarkup = type === 'success' 
    ? `<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-500"></i>` 
    : `<i data-lucide="alert-circle" class="w-4 h-4 text-rose-500"></i>`;

  toast.className = `flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-xl backdrop-blur-md pointer-events-auto transition-all duration-200 transform translate-y-2 opacity-0 text-xs font-semibold z-50 ${
    type === 'success' 
      ? 'bg-white dark:bg-slate-900 border-emerald-500/50 text-slate-800 dark:text-emerald-200 shadow-emerald-950/20' 
      : 'bg-white dark:bg-slate-900 border-rose-500/50 text-slate-800 dark:text-rose-200 shadow-rose-950/20'
  }`;

  toast.innerHTML = `
    ${iconMarkup}
    <span class="flex-1">${message}</span>
  `;

  elements.toastContainer.appendChild(toast);
  initIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Copy text to clipboard and show toast
 */
async function copyToClipboard(text, customMessage = 'Copied! Paste into Gemini side panel (Ctrl+V)') {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    showToast(customMessage, 'success');
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    showToast('Failed to copy to clipboard', 'error');
  }
}

/**
 * Open Prompt Preview Modal
 */
function openPromptModal(title, promptText) {
  state.activePromptTitle = title;
  state.activePromptText = promptText;
  elements.promptModalTitle.textContent = title;
  elements.promptModalTextarea.value = promptText;
  elements.promptModal.classList.remove('hidden');
  elements.promptModal.classList.add('flex');
  refreshIcons();
}

function closePromptModal() {
  elements.promptModal.classList.add('hidden');
  elements.promptModal.classList.remove('flex');
}

/**
 * Adjust Column 3 width dynamically:
 * If Column 2 (Student Dossier) is collapsed and Column 3 is open,
 * Column 3 expands to full remaining width (flex-1) so the counselor can focus solely on Group & Klal!
 */
function adjustColumnWidths() {
  if (!elements.colKlal) return;
  if (!state.isCol2Open && state.isCol3Open) {
    elements.colKlal.classList.remove('w-[370px]', '2xl:w-[410px]', 'flex-none');
    elements.colKlal.classList.add('flex-1', 'min-w-0');
  } else {
    elements.colKlal.classList.remove('flex-1', 'min-w-0');
    elements.colKlal.classList.add('w-[370px]', '2xl:w-[410px]', 'flex-none');
  }
}

/**
 * Toggle Column 1 (Left: Students)
 */
function toggleCol1(shouldOpen = !state.isCol1Open) {
  state.isCol1Open = shouldOpen;
  if (state.isCol1Open) {
    elements.colStudents.classList.remove('hidden');
    elements.colStudentsCollapsed.classList.add('hidden');
    elements.colStudentsCollapsed.classList.remove('flex');
  } else {
    elements.colStudents.classList.add('hidden');
    elements.colStudentsCollapsed.classList.remove('hidden');
    elements.colStudentsCollapsed.classList.add('flex');
  }
  adjustColumnWidths();
  updateLayoutPresetButtons();
  refreshIcons();
}

/**
 * Toggle Column 2 (Center: Student Dossier)
 */
function toggleCol2(shouldOpen = !state.isCol2Open) {
  state.isCol2Open = shouldOpen;
  if (state.isCol2Open) {
    elements.colDossier.classList.remove('hidden');
    elements.colDossier.classList.add('flex');
    elements.colDossierCollapsed.classList.add('hidden');
    elements.colDossierCollapsed.classList.remove('flex');
  } else {
    elements.colDossier.classList.add('hidden');
    elements.colDossier.classList.remove('flex');
    elements.colDossierCollapsed.classList.remove('hidden');
    elements.colDossierCollapsed.classList.add('flex');
  }

  // Update mini badge on collapsed strip
  const student = state.data.students.find(s => s.id === state.selectedStudentId);
  if (student) {
    if (elements.miniStudentBadge) elements.miniStudentBadge.textContent = student.id;
    if (elements.miniStudentName) elements.miniStudentName.textContent = student.name;
  }

  adjustColumnWidths();
  updateLayoutPresetButtons();
  refreshIcons();
}

/**
 * Toggle Column 3 (Right: Klal & Hospitality)
 */
function toggleCol3(shouldOpen = !state.isCol3Open) {
  state.isCol3Open = shouldOpen;
  if (state.isCol3Open) {
    elements.colKlal.classList.remove('hidden');
    elements.colKlalCollapsed.classList.add('hidden');
    elements.colKlalCollapsed.classList.remove('flex');
  } else {
    elements.colKlal.classList.add('hidden');
    elements.colKlalCollapsed.classList.remove('hidden');
    elements.colKlalCollapsed.classList.add('flex');
  }
  adjustColumnWidths();
  updateLayoutPresetButtons();
  refreshIcons();
}

/**
 * Set Layout Presets: 'all', 'focus-student', 'focus-klal'
 */
function setLayoutPreset(preset) {
  if (preset === 'all') {
    toggleCol1(true);
    toggleCol2(true);
    toggleCol3(true);
  } else if (preset === 'focus-student') {
    toggleCol1(false);
    toggleCol2(true);
    toggleCol3(false);
  } else if (preset === 'focus-klal') {
    toggleCol1(false);
    toggleCol2(false);
    toggleCol3(true);
  }
}

function updateLayoutPresetButtons() {
  const isAll = state.isCol1Open && state.isCol2Open && state.isCol3Open;
  const isFocusStudent = !state.isCol1Open && state.isCol2Open && !state.isCol3Open;
  const isFocusKlal = !state.isCol1Open && !state.isCol2Open && state.isCol3Open;

  const btnClassesActive = 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold';
  const btnClassesInactive = 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium';

  [
    { btn: elements.viewAllColsBtn, active: isAll },
    { btn: elements.viewFocusStudentBtn, active: isFocusStudent },
    { btn: elements.viewFocusKlalBtn, active: isFocusKlal }
  ].forEach(({ btn, active }) => {
    if (!btn) return;
    if (active) {
      btn.className = `layout-preset-btn active px-2.5 py-1 rounded-md text-xs transition cursor-pointer flex items-center gap-1.5 ${btnClassesActive}`;
    } else {
      btn.className = `layout-preset-btn px-2.5 py-1 rounded-md text-xs transition cursor-pointer flex items-center gap-1.5 ${btnClassesInactive}`;
    }
  });
}

/**
 * Toggle Dark / Light Theme
 */
function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('shana_bet_theme', 'light');
    showToast('Switched to Light Theme', 'success', 2000);
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('shana_bet_theme', 'dark');
    showToast('Switched to Dark Theme', 'success', 2000);
  }
  refreshIcons();
}

/**
 * Update Header Quick Stats & Badges
 */
function renderQuickStats() {
  const stats = calculateQuickStats(state.data);

  // Radar tab count badges
  if (elements.tabCountAll) elements.tabCountAll.textContent = stats.totalStudents;
  if (elements.tabCountCritical) elements.tabCountCritical.textContent = stats.overdueCritical;
  if (elements.tabCountAttention) elements.tabCountAttention.textContent = stats.attentionCount;
  if (elements.tabCountRecent) elements.tabCountRecent.textContent = stats.recentCount;
  if (elements.tabCountAgenda) elements.tabCountAgenda.textContent = stats.hasAgendaCount;

  // Mini collapsed strip badges
  if (elements.miniCriticalBadge) elements.miniCriticalBadge.textContent = `🔴 ${stats.overdueCritical}`;
  if (elements.miniKlalBadge) elements.miniKlalBadge.textContent = `📋 ${stats.activeKlalCount}`;
}

/**
 * Update Sync Indicator UI
 */
function updateSyncUI(status, label) {
  state.syncStatus = status;
  elements.syncText.textContent = label;

  elements.syncDot.className = 'w-2 h-2 rounded-full';
  if (status === 'syncing') {
    elements.syncDot.classList.add('bg-sky-400', 'animate-ping');
    elements.refreshIcon.classList.add('animate-spin');
  } else if (status === 'live') {
    elements.syncDot.classList.add('bg-emerald-500');
    elements.refreshIcon.classList.remove('animate-spin');
  } else if (status === 'cached') {
    elements.syncDot.classList.add('bg-amber-500');
    elements.refreshIcon.classList.remove('animate-spin');
  } else {
    elements.syncDot.classList.add('bg-rose-500');
    elements.refreshIcon.classList.remove('animate-spin');
  }
}

/**
 * Filter & Sort Students for Column 1
 */
function getFilteredStudents() {
  let list = [...state.data.students];

  // 1. Urgency / Radar filter tab
  if (state.radarFilter === 'critical') {
    list = list.filter(s => s.urgency.level === 'critical');
  } else if (state.radarFilter === 'attention') {
    list = list.filter(s => s.urgency.level === 'attention');
  } else if (state.radarFilter === 'recent') {
    list = list.filter(s => s.urgency.level === 'recent');
  } else if (state.radarFilter === 'agenda') {
    list = list.filter(s => s.hasAgenda);
  }

  // 2. Search query filter
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(s => {
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.nextAgenda.toLowerCase().includes(q) ||
        s.pinnedContext.toLowerCase().includes(q) ||
        s.shabbosNotes.toLowerCase().includes(q)
      );
    });
  }

  // 3. Sorting
  list.sort((a, b) => {
    if (state.sortBy === 'urgency-desc') {
      const daysA = a.daysElapsed === null ? 9999 : a.daysElapsed;
      const daysB = b.daysElapsed === null ? 9999 : b.daysElapsed;
      return daysB - daysA;
    }
    if (state.sortBy === 'agenda-first') {
      if (a.hasAgenda && !b.hasAgenda) return -1;
      if (!a.hasAgenda && b.hasAgenda) return 1;
      const daysA = a.daysElapsed === null ? 9999 : a.daysElapsed;
      const daysB = b.daysElapsed === null ? 9999 : b.daysElapsed;
      return daysB - daysA;
    }
    if (state.sortBy === 'name-asc') {
      return a.name.localeCompare(b.name);
    }
    if (state.sortBy === 'id-asc') {
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    }
    if (state.sortBy === 'shabbos-asc') {
      if (a.shabbosCount !== b.shabbosCount) {
        return a.shabbosCount - b.shabbosCount;
      }
      const daysA = a.daysElapsed === null ? 9999 : a.daysElapsed;
      const daysB = b.daysElapsed === null ? 9999 : b.daysElapsed;
      return daysB - daysA;
    }
    return 0;
  });

  return list;
}

/**
 * Render Column 1: Attention Radar
 */
function renderRadarColumn() {
  const filtered = getFilteredStudents();
  elements.filteredStudentsCount.textContent = `${filtered.length} of ${state.data.students.length}`;

  if (filtered.length === 0) {
    elements.studentListContainer.innerHTML = `
      <div class="p-8 text-center text-slate-500 text-xs">
        <i data-lucide="user-x" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        <p>No students match the current filters.</p>
        <button id="reset-filters-btn" class="mt-3 px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] cursor-pointer">
          Reset Filters
        </button>
      </div>
    `;
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.radarFilter = 'all';
        state.searchQuery = '';
        elements.searchStudentsInput.value = '';
        elements.clearSearchBtn.classList.add('hidden');
        elements.filterButtons.forEach(b => {
          b.classList.toggle('bg-sky-600', b.dataset.filter === 'all');
          b.classList.toggle('text-white', b.dataset.filter === 'all');
          b.classList.toggle('bg-slate-200', b.dataset.filter !== 'all');
          b.classList.toggle('dark:bg-slate-800', b.dataset.filter !== 'all');
        });
        renderRadarColumn();
      });
    }
    refreshIcons();
    return;
  }

  // Ensure an active student is selected
  if (!state.selectedStudentId || !state.data.students.find(s => s.id === state.selectedStudentId)) {
    state.selectedStudentId = filtered[0].id;
  }

  elements.studentListContainer.innerHTML = filtered.map(student => {
    const isSelected = student.id === state.selectedStudentId;
    
    let urgencyBadge = '';
    let borderAccent = 'border-l-2 border-emerald-500';

    if (student.urgency.level === 'critical') {
      borderAccent = 'border-l-2 border-rose-500';
      urgencyBadge = `
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          ${student.urgency.displayDays}
        </span>
      `;
    } else if (student.urgency.level === 'attention') {
      borderAccent = 'border-l-2 border-amber-500';
      urgencyBadge = `
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          ${student.urgency.displayDays}
        </span>
      `;
    } else {
      borderAccent = 'border-l-2 border-emerald-500';
      urgencyBadge = `
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          ${student.urgency.displayDays}
        </span>
      `;
    }

    const agendaPill = student.hasAgenda 
      ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30" title="Has pending next agenda item">
           <i data-lucide="lightbulb" class="w-2.5 h-2.5 text-amber-500"></i>
           Agenda
         </span>`
      : '';

    const shabbosPill = student.shabbosCount > 0
      ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
           🍷 ${student.shabbosCount}
         </span>`
      : `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-500">
           🍷 0
         </span>`;

    const pinnedIndicator = student.pinnedContext 
      ? `<span class="text-indigo-500 dark:text-indigo-400 text-[10px]" title="Has long-term guidance notes">📌</span>`
      : '';

    return `
      <div 
        data-student-id="${student.id}" 
        class="student-card cursor-pointer p-2.5 rounded-lg transition-all duration-150 ${borderAccent} ${
          isSelected 
            ? 'bg-sky-50 dark:bg-slate-800/90 ring-1 ring-sky-500 shadow-xs' 
            : 'bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200/80 dark:border-transparent'
        }"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs text-slate-900 dark:text-white truncate">${student.name}</span>
              ${pinnedIndicator}
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span class="font-mono text-slate-400 dark:text-slate-500 text-[10px]">${student.id}</span>
              <span>•</span>
              <span class="truncate text-[10px]">${student.shiur || 'Shana Bet'}</span>
            </div>
          </div>
          <div class="flex-none">
            ${urgencyBadge}
          </div>
        </div>

        <div class="flex items-center gap-1.5 mt-2">
          ${agendaPill}
          ${shabbosPill}
          ${
            student.nextAgenda 
              ? `<span class="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-1 italic">"${student.nextAgenda.replace(/^[•\s-]+/, '').slice(0, 36)}..."</span>` 
              : ''
          }
        </div>
      </div>
    `;
  }).join('');

  elements.studentListContainer.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.studentId;
      selectStudent(id);
    });
  });

  refreshIcons();
}

/**
 * Select a Student and update Column 2
 */
function selectStudent(studentId) {
  state.selectedStudentId = studentId;
  state.isEditingPinned = false;
  renderRadarColumn();
  renderStudentDossier();
}

/**
 * Render Column 2: Interactive Student Dossier
 */
function renderStudentDossier() {
  const student = state.data.students.find(s => s.id === state.selectedStudentId);

  if (!student) {
    elements.dossierHeaderContainer.innerHTML = `
      <div class="text-center p-6 text-slate-500 text-xs">
        Select a student from the triage column to view their dossier.
      </div>
    `;
    elements.dossierBodyContainer.innerHTML = '';
    return;
  }

  const studentLogs = state.data.logs.filter(l => l.studentId === student.id);

  let urgencyPill = '';
  if (student.urgency.level === 'critical') {
    urgencyPill = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
        <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        🔴 Critical Triage (${student.urgency.displayDays})
      </span>
    `;
  } else if (student.urgency.level === 'attention') {
    urgencyPill = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
        🟡 Attention Needed (${student.urgency.displayDays})
      </span>
    `;
  } else {
    urgencyPill = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        🟢 Up to Date (${student.urgency.displayDays})
      </span>
    `;
  }

  // Dossier Header
  elements.dossierHeaderContainer.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-base font-bold text-slate-900 dark:text-white">${student.name}</h2>
          <span class="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            ${student.id}
          </span>
          <span class="px-2 py-0.5 rounded text-xs bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 font-medium">
            ${student.shiur || 'Shana Bet'}
          </span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
          <span>Last Met: <strong class="text-slate-800 dark:text-slate-200">${student.lastMetFormatted}</strong></span>
          <span>•</span>
          <span>Shabbat Meals: <strong class="text-slate-800 dark:text-slate-200">${student.shabbosCount}</strong></span>
          ${student.shabbosNotes ? `<span>(${student.shabbosNotes})</span>` : ''}
        </p>
      </div>
      <div class="flex items-center gap-1.5">
        ${urgencyPill}
        <button id="btn-collapse-col2" class="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer" title="Collapse Student Dossier (Focus on Group & Klal)">
          <i data-lucide="chevron-left" class="w-4 h-4"></i>
        </button>
      </div>
    </div>

    <!-- Quick Stats Grid for Student -->
    <div class="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80">
      <div class="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block">Meeting Interval</span>
        <span class="text-xs font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">${student.urgency.displayDays}</span>
      </div>
      <div class="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block">Shabbat Meals</span>
        <span class="text-xs font-bold text-indigo-600 dark:text-indigo-300 font-mono mt-0.5 block">${student.shabbosCount} meal${student.shabbosCount === 1 ? '' : 's'}</span>
      </div>
      <div class="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider block">Past Logged Notes</span>
        <span class="text-xs font-bold text-sky-600 dark:text-sky-300 font-mono mt-0.5 block">${studentLogs.length} interactions</span>
      </div>
    </div>

    <!-- Action Toolbar (Direct Desktop Actions & Gemini Exporters) -->
    <div class="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
      
      <!-- Direct Action: Mark Met Today -->
      <button 
        id="btn-mark-met-today" 
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        title="Sets Last Met Date to today and shifts student to Recent in Attention Radar"
      >
        <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-300"></i>
        <span>⚡ Mark Met Today</span>
      </button>

      <!-- Direct Action: Log Interaction (NEW DIRECT ADD) -->
      <button 
        id="btn-open-log-meeting" 
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        title="Directly record a meeting discussion and save to Sheet"
      >
        <i data-lucide="plus-circle" class="w-3.5 h-3.5 text-sky-400"></i>
        <span>+ Log Meeting</span>
      </button>

      <span class="text-slate-300 dark:text-slate-700 mx-0.5">|</span>

      <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-0.5">
        <i data-lucide="sparkles" class="w-3 h-3 text-sky-500 dark:text-sky-400"></i>
        Gemini:
      </span>

      <!-- Action: Prep Briefing -->
      <button 
        id="btn-prep-briefing" 
        class="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        title="Synthesizes student's history and copies a briefing prompt for Gemini side panel"
      >
        <i data-lucide="clipboard-list" class="w-3.5 h-3.5"></i>
        <span>📋 Briefing</span>
      </button>

      <!-- Action: Draft Parent / Rosh Yeshiva Update -->
      <button 
        id="btn-draft-update" 
        class="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        title="Copies prompt to draft an executive progress update for Rosh Yeshiva & Parents"
      >
        <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
        <span>📝 Update</span>
      </button>

      <!-- Action: Shabbos Invite Outreach -->
      <button 
        id="btn-shabbos-invite" 
        class="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-300 dark:border-slate-700 transition cursor-pointer"
        title="Generate a personal Shabbat invite message"
      >
        <i data-lucide="utensils" class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400"></i>
        <span>🍷 Invite</span>
      </button>

      <!-- Preview Prompt Button -->
      <button 
        id="btn-preview-current-prompt" 
        class="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition cursor-pointer"
        title="View prompt text before copying"
      >
        <i data-lucide="eye" class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"></i>
        <span>Preview</span>
      </button>
    </div>
  `;

  // Dossier Body
  const pinnedHtml = `
    <div class="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 dark:from-indigo-950/30 dark:to-purple-950/20 p-3.5 shadow-xs">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <i data-lucide="compass" class="w-4 h-4 text-indigo-500 dark:text-indigo-400"></i>
          <h3 class="text-xs font-bold text-indigo-700 dark:text-indigo-200 uppercase tracking-wider">Pinned Guidance Focus & Long-Term Trajectory</h3>
        </div>
        <button id="btn-toggle-edit-pinned" class="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
          <i data-lucide="pencil" class="w-3 h-3"></i>
          <span>${state.isEditingPinned ? 'Cancel' : 'Edit'}</span>
        </button>
      </div>
      ${
        state.isEditingPinned
          ? `
            <form id="form-edit-pinned" class="space-y-2">
              <textarea id="input-edit-pinned" rows="3" class="w-full bg-white dark:bg-slate-950 border border-indigo-500/40 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 resize-none font-sans leading-relaxed">${student.pinnedContext || ''}</textarea>
              <div class="flex justify-end gap-2">
                <button type="submit" class="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs">
                  Save Notes
                </button>
              </div>
            </form>
          `
          : `
            <p class="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">${student.pinnedContext || '<span class="italic text-slate-400">No permanent pinned guidance context recorded for this student yet. Click Edit to add.</span>'}</p>
          `
      }
    </div>
  `;

  const agendaHtml = student.hasAgenda 
    ? `
      <div class="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 dark:from-amber-950/30 dark:to-yellow-950/20 p-3.5 shadow-xs">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <i data-lucide="lightbulb" class="w-4 h-4 text-amber-500 dark:text-amber-400"></i>
            <h3 class="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider">Pending Agenda (Unaddressed Ideas Waiting)</h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-medium">
              Immediate Follow-up
            </span>
            <button 
              id="btn-clear-agenda" 
              class="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-rose-500/30 text-amber-800 dark:text-amber-200 hover:text-rose-700 dark:hover:text-rose-200 border border-amber-500/40 hover:border-rose-500/40 text-[11px] font-semibold transition cursor-pointer active:scale-95"
              title="Clear all pending agenda items and update Sheet"
            >
              <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500"></i>
              <span>✓ Clear Agenda</span>
            </button>
          </div>
        </div>

        <div class="text-xs text-amber-900 dark:text-amber-100/90 leading-relaxed whitespace-pre-line pl-2.5 py-1 border-l-2 border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/20 rounded-r-lg">
          ${student.nextAgenda}
        </div>

        <!-- Quick Inline Agenda Adder -->
        <form id="form-add-agenda" class="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center gap-2">
          <div class="relative flex-1">
            <i data-lucide="plus" class="w-3.5 h-3.5 text-amber-500 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-new-agenda" 
              type="text" 
              placeholder="Add next agenda topic (e.g. Discuss chavrusa pacing, sleep routine...)" 
              class="w-full bg-white dark:bg-slate-950 border border-amber-500/30 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
              required
            />
          </div>
          <button 
            type="submit" 
            id="btn-submit-agenda" 
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-semibold transition cursor-pointer shadow-xs flex-none"
          >
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>+ Add</span>
          </button>
        </form>
      </div>
    `
    : `
      <div class="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 p-3.5 shadow-xs space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <i data-lucide="check" class="w-4 h-4 text-emerald-500"></i>
            <span class="text-xs font-medium text-slate-700 dark:text-slate-300">No urgent pending agenda item recorded.</span>
          </div>
          <span class="text-[10px] text-slate-400 font-mono">Clean Slate</span>
        </div>

        <!-- Quick Inline Agenda Adder when clean -->
        <form id="form-add-agenda" class="flex items-center gap-2 pt-1">
          <div class="relative flex-1">
            <i data-lucide="plus" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
            <input 
              id="input-new-agenda" 
              type="text" 
              placeholder="Add agenda topic for next meeting (e.g. Chavrusa dynamics, IDF thoughts...)" 
              class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition"
              required
            />
          </div>
          <button 
            type="submit" 
            id="btn-submit-agenda" 
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-medium transition cursor-pointer flex-none"
          >
            <i data-lucide="plus" class="w-3.5 h-3.5 text-sky-500 dark:text-sky-400"></i>
            <span>+ Add</span>
          </button>
        </form>
      </div>
    `;

  let timelineHtml = '';
  if (studentLogs.length > 0) {
    timelineHtml = `
      <div class="space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i data-lucide="history" class="w-4 h-4 text-sky-500 dark:text-sky-400"></i>
            <h3 class="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Chronological Interaction History</h3>
          </div>
          <span class="text-[11px] text-slate-400 font-mono">${studentLogs.length} recorded</span>
        </div>

        <div class="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          ${studentLogs.map((log) => `
            <div class="relative group">
              <div class="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-950 border-2 border-sky-500 group-hover:scale-125 transition-transform"></div>

              <div class="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1.5 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                      ${log.interactionType}
                    </span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">${log.dateFormatted}</span>
                  </div>
                </div>

                <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">${log.summary}</p>

                ${log.nextSteps ? `
                  <div class="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg">
                    <i data-lucide="arrow-right-circle" class="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 mt-0.5 flex-none"></i>
                    <div class="text-[11px] text-sky-900 dark:text-sky-200/90 leading-tight">
                      <strong class="text-sky-700 dark:text-sky-300">Next Steps:</strong> ${log.nextSteps}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    timelineHtml = `
      <div class="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center text-slate-500 text-xs space-y-2">
        <i data-lucide="message-square-off" class="w-8 h-8 mx-auto opacity-50"></i>
        <p class="font-medium text-slate-600 dark:text-slate-400">No interaction logs recorded for this student yet.</p>
        <p class="text-[11px] text-slate-400">Click <strong class="text-sky-500">+ Log Meeting</strong> above or dictate via mobile to record discussion summaries.</p>
      </div>
    `;
  }

  elements.dossierBodyContainer.innerHTML = `
    ${pinnedHtml}
    ${agendaHtml}
    ${timelineHtml}
  `;

  // Update mini badge for collapsed state
  if (elements.miniStudentBadge) elements.miniStudentBadge.textContent = student.id;
  if (elements.miniStudentName) elements.miniStudentName.textContent = student.name;

  // Attach button event handlers in Dossier
  const btnCollapseCol2 = document.getElementById('btn-collapse-col2');
  const btnMarkMetToday = document.getElementById('btn-mark-met-today');
  const btnOpenLogMeeting = document.getElementById('btn-open-log-meeting');
  const btnClearAgenda = document.getElementById('btn-clear-agenda');
  const formAddAgenda = document.getElementById('form-add-agenda');
  const btnToggleEditPinned = document.getElementById('btn-toggle-edit-pinned');
  const formEditPinned = document.getElementById('form-edit-pinned');
  const btnPrepBriefing = document.getElementById('btn-prep-briefing');
  const btnDraftUpdate = document.getElementById('btn-draft-update');
  const btnShabbosInvite = document.getElementById('btn-shabbos-invite');
  const btnPreviewPrompt = document.getElementById('btn-preview-current-prompt');

  if (btnCollapseCol2) {
    btnCollapseCol2.addEventListener('click', () => toggleCol2(false));
  }

  // Direct Action: Mark Met Today
  if (btnMarkMetToday) {
    btnMarkMetToday.addEventListener('click', async () => {
      const prevDate = student.lastMetDate;
      const prevFormatted = student.lastMetFormatted;
      const prevDays = student.daysElapsed;
      const prevUrgency = student.urgency;

      const nowIso = new Date().toISOString();
      student.lastMetDate = nowIso;
      student.lastMetFormatted = formatDate(nowIso);
      student.daysElapsed = 0;
      student.urgency = getUrgencyStatus(0);

      renderQuickStats();
      renderRadarColumn();
      renderStudentDossier();
      DataService.saveCurrentStateToCache(state.data);

      showToast(`Saving to Sheet: Marked ${student.name} met today...`, 'success', 2200);

      try {
        await DataService.sendDirectUpdate({
          action: 'markMetToday',
          studentName: student.name
        });
        showToast(`✓ Marked ${student.name} met today! Sheet updated.`, 'success');
      } catch (err) {
        console.error('Failed to mark met today:', err);
        student.lastMetDate = prevDate;
        student.lastMetFormatted = prevFormatted;
        student.daysElapsed = prevDays;
        student.urgency = prevUrgency;

        renderQuickStats();
        renderRadarColumn();
        renderStudentDossier();
        DataService.saveCurrentStateToCache(state.data);

        showToast(`Could not update Sheet: ${err.message}`, 'error', 5000);
      }
    });
  }

  // Open Log Meeting Modal
  if (btnOpenLogMeeting) {
    btnOpenLogMeeting.addEventListener('click', () => {
      openLogMeetingModal(student);
    });
  }

  // Clear Agenda
  if (btnClearAgenda) {
    btnClearAgenda.addEventListener('click', async () => {
      const prevAgenda = student.nextAgenda;
      const prevHasAgenda = student.hasAgenda;

      student.nextAgenda = '';
      student.hasAgenda = false;

      renderQuickStats();
      renderRadarColumn();
      renderStudentDossier();
      DataService.saveCurrentStateToCache(state.data);

      showToast(`Saving to Sheet: Clearing agenda for ${student.name}...`, 'success', 2200);

      try {
        await DataService.sendDirectUpdate({
          action: 'clearAgenda',
          studentName: student.name
        });
        showToast(`✓ Agenda cleared for ${student.name}! Sheet updated.`, 'success');
      } catch (err) {
        console.error('Failed to clear agenda:', err);
        student.nextAgenda = prevAgenda;
        student.hasAgenda = prevHasAgenda;

        renderQuickStats();
        renderRadarColumn();
        renderStudentDossier();
        DataService.saveCurrentStateToCache(state.data);

        showToast(`Could not clear agenda on Sheet: ${err.message}`, 'error', 5000);
      }
    });
  }

  // Add Agenda Item
  if (formAddAgenda) {
    formAddAgenda.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('input-new-agenda');
      const text = input ? input.value.trim() : '';
      if (!text) return;

      const prevAgenda = student.nextAgenda;
      const prevHasAgenda = student.hasAgenda;

      const bullet = text.startsWith('•') || text.startsWith('-') ? text : `• ${text}`;
      student.nextAgenda = student.nextAgenda ? `${student.nextAgenda}\n${bullet}` : bullet;
      student.hasAgenda = true;

      if (input) input.value = '';

      renderQuickStats();
      renderRadarColumn();
      renderStudentDossier();
      DataService.saveCurrentStateToCache(state.data);

      showToast(`Saving to Sheet: Adding agenda for ${student.name}...`, 'success', 2200);

      try {
        await DataService.sendDirectUpdate({
          action: 'addIdea',
          studentName: student.name,
          idea: text
        });
        showToast(`✓ Added agenda topic for ${student.name}! Sheet updated.`, 'success');
      } catch (err) {
        console.error('Failed to add idea:', err);
        student.nextAgenda = prevAgenda;
        student.hasAgenda = prevHasAgenda;

        renderQuickStats();
        renderRadarColumn();
        renderStudentDossier();
        DataService.saveCurrentStateToCache(state.data);

        showToast(`Could not add agenda to Sheet: ${err.message}`, 'error', 5000);
      }
    });
  }

  // Toggle Edit Pinned Guidance Context
  if (btnToggleEditPinned) {
    btnToggleEditPinned.addEventListener('click', () => {
      state.isEditingPinned = !state.isEditingPinned;
      renderStudentDossier();
    });
  }

  // Save Edit Pinned Guidance Context
  if (formEditPinned) {
    formEditPinned.addEventListener('submit', (e) => {
      e.preventDefault();
      const textarea = document.getElementById('input-edit-pinned');
      if (textarea) {
        student.pinnedContext = textarea.value.trim();
        state.isEditingPinned = false;
        DataService.saveCurrentStateToCache(state.data);
        renderStudentDossier();
        showToast(`Updated pinned guidance notes for ${student.name}`, 'success');
      }
    });
  }

  if (btnPrepBriefing) {
    btnPrepBriefing.addEventListener('click', () => {
      const prompt = generateMeetingBriefingPrompt(student, studentLogs);
      copyToClipboard(prompt, 'Copied! Paste into Gemini side panel (Ctrl+V)');
    });
  }

  if (btnDraftUpdate) {
    btnDraftUpdate.addEventListener('click', () => {
      const prompt = generateParentRoshYeshivaUpdatePrompt(student, studentLogs);
      copyToClipboard(prompt, 'Copied! Paste into Gemini side panel (Ctrl+V)');
    });
  }

  if (btnShabbosInvite) {
    btnShabbosInvite.addEventListener('click', () => {
      const prompt = generateShabbosInvitePrompt(student);
      copyToClipboard(prompt, 'Copied! Paste into Gemini side panel (Ctrl+V)');
    });
  }

  if (btnPreviewPrompt) {
    btnPreviewPrompt.addEventListener('click', () => {
      const prompt = generateMeetingBriefingPrompt(student, studentLogs);
      openPromptModal(`Gemini Briefing Prompt for ${student.name}`, prompt);
    });
  }

  refreshIcons();
}

/**
 * Open Modal to Log 1-on-1 Interaction
 */
function openLogMeetingModal(student) {
  elements.modalLogStudentSubtitle.textContent = `Logging 1-on-1 interaction for ${student.name} (${student.id})`;
  elements.inputLogDate.value = new Date().toISOString().split('T')[0];
  elements.inputLogSummary.value = '';
  elements.inputLogNextsteps.value = '';
  elements.inputLogClearAgenda.checked = student.hasAgenda;
  elements.logMeetingModal.classList.remove('hidden');
  elements.logMeetingModal.classList.add('flex');
  refreshIcons();
  elements.inputLogSummary.focus();
}

function closeLogMeetingModal() {
  elements.logMeetingModal.classList.add('hidden');
  elements.logMeetingModal.classList.remove('flex');
}

/**
 * Handle Direct Submission of Log Meeting
 */
async function handleLogMeetingSubmit(e) {
  e.preventDefault();
  const student = state.data.students.find(s => s.id === state.selectedStudentId);
  if (!student) return;

  const interactionType = elements.inputLogType.value || 'Meeting';
  const rawDate = elements.inputLogDate.value;
  const dateObj = rawDate ? new Date(rawDate) : new Date();
  const dateIso = dateObj.toISOString();
  const summary = elements.inputLogSummary.value.trim();
  const nextSteps = elements.inputLogNextsteps.value.trim();
  const clearAgenda = elements.inputLogClearAgenda.checked;

  if (!summary) return;

  closeLogMeetingModal();

  // Optimistic updates
  const newLog = {
    date: dateIso,
    dateFormatted: formatDate(dateIso),
    timestamp: dateObj.getTime(),
    studentId: student.id,
    name: student.name,
    interactionType,
    summary,
    nextSteps
  };

  state.data.logs.unshift(newLog);

  const prevLastMet = student.lastMetDate;
  student.lastMetDate = dateIso;
  student.lastMetFormatted = formatDate(dateIso);
  student.daysElapsed = 0;
  student.urgency = getUrgencyStatus(0);

  let prevAgenda = student.nextAgenda;
  if (clearAgenda) {
    student.nextAgenda = '';
    student.hasAgenda = false;
  }

  renderQuickStats();
  renderRadarColumn();
  renderStudentDossier();
  DataService.saveCurrentStateToCache(state.data);

  showToast(`Saving interaction log for ${student.name} to Sheet...`, 'success', 2200);

  try {
    await DataService.sendDirectUpdate({
      action: 'logMeeting',
      studentName: student.name,
      summary,
      nextSteps,
      clearAgenda
    });
    showToast(`✓ Logged meeting for ${student.name} directly to Google Sheet!`, 'success');
  } catch (err) {
    console.error('Failed to log meeting:', err);
    // Revert
    state.data.logs = state.data.logs.filter(l => l !== newLog);
    student.lastMetDate = prevLastMet;
    student.lastMetFormatted = formatDate(prevLastMet);
    if (clearAgenda) {
      student.nextAgenda = prevAgenda;
      student.hasAgenda = prevAgenda.length > 0;
    }
    renderQuickStats();
    renderRadarColumn();
    renderStudentDossier();
    DataService.saveCurrentStateToCache(state.data);
    showToast(`Could not save meeting log to Sheet: ${err.message}`, 'error', 5000);
  }
}

/**
 * Open Modal to Add New Klal Initiative
 */
function openNewKlalModal() {
  elements.inputKlalTitle.value = '';
  elements.inputKlalTiming.value = '';
  elements.inputKlalVision.value = '';
  elements.inputKlalActionplan.value = '';
  elements.inputKlalStatus.value = 'Active';
  elements.newKlalModal.classList.remove('hidden');
  elements.newKlalModal.classList.add('flex');
  refreshIcons();
  elements.inputKlalTitle.focus();
}

function closeNewKlalModal() {
  elements.newKlalModal.classList.add('hidden');
  elements.newKlalModal.classList.remove('flex');
}

/**
 * Handle Direct Submission of New Klal Initiative
 */
async function handleNewKlalSubmit(e) {
  e.preventDefault();
  const title = elements.inputKlalTitle.value.trim();
  const category = elements.inputKlalCategory.value || 'Educational';
  const targetTiming = elements.inputKlalTiming.value.trim() || 'Upcoming Zman';
  const status = elements.inputKlalStatus.value || 'Active';
  const vision = elements.inputKlalVision.value.trim();
  const actionPlan = elements.inputKlalActionplan.value.trim();

  if (!title) return;

  closeNewKlalModal();

  const newInitiative = {
    id: `klal-${Date.now()}`,
    date: new Date().toISOString(),
    dateFormatted: formatDate(new Date().toISOString()),
    category,
    isEducational: category.toLowerCase().includes('educational'),
    isProgramming: category.toLowerCase().includes('programming'),
    title,
    vision,
    actionPlan,
    status,
    isActive: status.toLowerCase() === 'active',
    isCompleted: status.toLowerCase() === 'completed',
    isBacklog: status.toLowerCase() === 'backlog',
    targetTiming
  };

  state.data.klal.unshift(newInitiative);

  renderQuickStats();
  renderKlalInitiatives();
  DataService.saveCurrentStateToCache(state.data);

  showToast(`Creating '${title}' on Google Sheet...`, 'success', 2200);

  try {
    await DataService.sendDirectUpdate({
      action: 'logKlalInitiative',
      title,
      category,
      vision,
      actionPlan,
      status,
      targetTiming
    });
    showToast(`✓ Created initiative '${title}' on Google Sheet!`, 'success');
  } catch (err) {
    console.error('Failed to create initiative:', err);
    state.data.klal = state.data.klal.filter(k => k !== newInitiative);
    renderQuickStats();
    renderKlalInitiatives();
    DataService.saveCurrentStateToCache(state.data);
    showToast(`Could not create initiative on Sheet: ${err.message}`, 'error', 5000);
  }
}

/**
 * Render Column 3: Klal Initiatives Tab
 */
function renderKlalInitiatives() {
  let list = [...state.data.klal];

  // Status Filter
  if (state.klalStatusFilter !== 'all') {
    list = list.filter(k => k.status.toLowerCase() === state.klalStatusFilter.toLowerCase());
  }

  // Category Filter
  if (state.klalCategoryFilter === 'educational') {
    list = list.filter(k => k.isEducational);
  } else if (state.klalCategoryFilter === 'programming') {
    list = list.filter(k => k.isProgramming);
  }

  // Column 3 Search Filter
  if (state.col3SearchQuery.trim() !== '') {
    const q = state.col3SearchQuery.toLowerCase();
    list = list.filter(k => {
      return (
        k.title.toLowerCase().includes(q) ||
        k.vision.toLowerCase().includes(q) ||
        k.actionPlan.toLowerCase().includes(q) ||
        k.category.toLowerCase().includes(q) ||
        k.targetTiming.toLowerCase().includes(q)
      );
    });
  }

  if (list.length === 0) {
    elements.klalCardsContainer.innerHTML = `
      <div class="p-8 text-center text-slate-500 text-xs">
        <i data-lucide="layers" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        <p>No group initiatives match the selected filters.</p>
        <button id="btn-quick-new-init" class="mt-3 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] cursor-pointer">
          + Add New Initiative
        </button>
      </div>
    `;
    const quickBtn = document.getElementById('btn-quick-new-init');
    if (quickBtn) quickBtn.addEventListener('click', openNewKlalModal);
    refreshIcons();
    return;
  }

  elements.klalCardsContainer.innerHTML = list.map(item => {
    const isEducational = item.isEducational;
    const badgeCategory = isEducational
      ? `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">Educational</span>`
      : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30">Programming</span>`;

    const statusSelect = `
      <div class="relative inline-flex items-center">
        <select 
          data-klal-id="${item.id}" 
          class="klal-status-select text-[10px] font-semibold rounded px-2 py-0.5 border cursor-pointer focus:outline-none transition ${
            item.isActive 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:border-emerald-400' 
              : item.isCompleted 
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-500' 
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:border-amber-400'
          }"
          title="Change initiative status and save directly to Sheet"
        >
          <option value="Active" ${item.isActive ? 'selected' : ''}>Active</option>
          <option value="Backlog" ${item.isBacklog ? 'selected' : ''}>Backlog</option>
          <option value="Completed" ${item.isCompleted ? 'selected' : ''}>Completed</option>
        </select>
      </div>
    `;

    return `
      <div class="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs">
        <div class="flex items-start justify-between gap-2">
          <div class="space-y-1">
            <h4 class="text-xs font-bold text-slate-900 dark:text-white leading-snug">${item.title}</h4>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${badgeCategory}
              ${statusSelect}
              <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <i data-lucide="calendar" class="w-3 h-3 text-slate-400"></i>
                ${item.targetTiming}
              </span>
            </div>
          </div>
        </div>

        <div class="space-y-1.5 pt-0.5 text-xs">
          <div class="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80">
            <span class="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-300 block mb-0.5">Core Vision & Need</span>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">${item.vision}</p>
          </div>

          <div class="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80">
            <span class="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-300 block mb-0.5">Action Plan & Next Steps</span>
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">${item.actionPlan}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');

  elements.klalCardsContainer.querySelectorAll('.klal-status-select').forEach(select => {
    select.addEventListener('change', async () => {
      const klalId = select.dataset.klalId;
      const item = state.data.klal.find(k => k.id === klalId);
      if (!item) return;

      const prevStatus = item.status;
      const prevIsActive = item.isActive;
      const prevIsCompleted = item.isCompleted;
      const prevIsBacklog = item.isBacklog;

      const newStatus = select.value;

      item.status = newStatus;
      item.isActive = newStatus.toLowerCase() === 'active';
      item.isCompleted = newStatus.toLowerCase() === 'completed';
      item.isBacklog = newStatus.toLowerCase() === 'backlog';

      renderQuickStats();
      renderKlalInitiatives();
      DataService.saveCurrentStateToCache(state.data);

      showToast(`Saving to Sheet: Updating ${item.title} to ${newStatus}...`, 'success', 2200);

      try {
        await DataService.sendDirectUpdate({
          action: 'updateKlalStatus',
          title: item.title,
          status: newStatus
        });
        showToast(`✓ Updated '${item.title}' to ${newStatus}! Sheet updated.`, 'success');
      } catch (err) {
        console.error('Failed to update status:', err);
        item.status = prevStatus;
        item.isActive = prevIsActive;
        item.isCompleted = prevIsCompleted;
        item.isBacklog = prevIsBacklog;

        renderQuickStats();
        renderKlalInitiatives();
        DataService.saveCurrentStateToCache(state.data);

        showToast(`Could not update Klal status on Sheet: ${err.message}`, 'error', 5000);
      }
    });
  });

  refreshIcons();
}

/**
 * Render Column 3: Shabbat Hospitality Tab
 */
function renderHospitalityMatrix() {
  const stats = calculateQuickStats(state.data);
  const total = stats.totalStudents || 1;

  const pct0 = Math.round((stats.zeroShabbosMeals / total) * 100);
  const pct1 = Math.round((stats.oneShabbosMeal / total) * 100);
  const pct2Plus = Math.round((stats.twoPlusShabbosMeals / total) * 100);

  // Priority Candidates: 0 meals students, sorted by urgency
  let candidates0 = state.data.students
    .filter(s => s.shabbosCount === 0)
    .sort((a, b) => {
      const daysA = a.daysElapsed === null ? 9999 : a.daysElapsed;
      const daysB = b.daysElapsed === null ? 9999 : b.daysElapsed;
      return daysB - daysA;
    });

  // Filter candidates if search is typed
  if (state.col3SearchQuery.trim() !== '') {
    const q = state.col3SearchQuery.toLowerCase();
    candidates0 = candidates0.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }

  elements.hospitalityCardsContainer.innerHTML = `
    <!-- Distribution Progress Bar -->
    <div class="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5 shadow-xs">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <i data-lucide="bar-chart-3" class="w-3.5 h-3.5 text-amber-500"></i>
          Hospitality Reach
        </h4>
        <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400">${total} students</span>
      </div>

      <div class="w-full h-2.5 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-800">
        <div style="width: ${pct0}%" class="bg-rose-500/80 hover:bg-rose-500 transition-all" title="0 Meals: ${stats.zeroShabbosMeals} (${pct0}%)"></div>
        <div style="width: ${pct1}%" class="bg-amber-500/80 hover:bg-amber-500 transition-all" title="1 Meal: ${stats.oneShabbosMeal} (${pct1}%)"></div>
        <div style="width: ${pct2Plus}%" class="bg-emerald-500/80 hover:bg-emerald-500 transition-all" title="2+ Meals: ${stats.twoPlusShabbosMeals} (${pct2Plus}%)"></div>
      </div>

      <div class="grid grid-cols-3 gap-1.5 text-center text-xs pt-1">
        <div class="bg-rose-500/10 border border-rose-500/20 p-1.5 rounded-lg">
          <span class="text-[10px] text-rose-700 dark:text-rose-300 font-semibold block">0 Meals</span>
          <span class="text-xs font-bold text-slate-900 dark:text-white font-mono">${stats.zeroShabbosMeals}</span>
          <span class="text-[10px] text-rose-600 dark:text-rose-400 font-mono block">(${pct0}%)</span>
        </div>
        <div class="bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg">
          <span class="text-[10px] text-amber-700 dark:text-amber-300 font-semibold block">1 Meal</span>
          <span class="text-xs font-bold text-slate-900 dark:text-white font-mono">${stats.oneShabbosMeal}</span>
          <span class="text-[10px] text-amber-600 dark:text-amber-400 font-mono block">(${pct1}%)</span>
        </div>
        <div class="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-lg">
          <span class="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block">2+ Meals</span>
          <span class="text-xs font-bold text-slate-900 dark:text-white font-mono">${stats.twoPlusShabbosMeals}</span>
          <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono block">(${pct2Plus}%)</span>
        </div>
      </div>
    </div>

    <!-- Priority Candidates List -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="user-plus" class="w-3.5 h-3.5 text-rose-500"></i>
          Priority Candidates for Next Shabbat
        </h4>
        <span class="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-medium">${candidates0.length} students</span>
      </div>

      <div class="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        ${candidates0.length === 0 ? '<div class="p-6 text-center text-slate-500 text-xs">No matching candidates found.</div>' : ''}
        ${candidates0.slice(0, 18).map(student => `
          <div 
            data-student-id="${student.id}" 
            class="shabbos-candidate-card cursor-pointer p-2 rounded-lg bg-white dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition flex items-center justify-between gap-2 shadow-xs"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs text-slate-900 dark:text-white truncate">${student.name}</span>
                <span class="text-[10px] font-mono text-slate-400">${student.id}</span>
              </div>
              <span class="text-[10px] text-slate-500 dark:text-slate-400 block">${student.urgency.displayDays}</span>
            </div>
            <button 
              data-invite-id="${student.id}" 
              class="btn-quick-invite flex-none px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-medium flex items-center gap-1 transition cursor-pointer"
              title="Copy personalized invite prompt for Gemini"
            >
              <i data-lucide="sparkles" class="w-2.5 h-2.5 text-amber-500"></i>
              <span>Invite</span>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  elements.hospitalityCardsContainer.querySelectorAll('.shabbos-candidate-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-quick-invite')) return;
      selectStudent(card.dataset.studentId);
    });
  });

  elements.hospitalityCardsContainer.querySelectorAll('.btn-quick-invite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.inviteId;
      const student = state.data.students.find(s => s.id === id);
      if (student) {
        const prompt = generateShabbosInvitePrompt(student);
        copyToClipboard(prompt, `Copied Shabbat invite prompt for ${student.name}! Paste in Gemini (Ctrl+V)`);
      }
    });
  });

  refreshIcons();
}

/**
 * Handle Group Report Prompt Generation
 */
function handleGroupReport() {
  const stats = calculateQuickStats(state.data);
  const activeKlal = state.data.klal.filter(k => k.isActive);
  const priorityStudents = state.data.students.filter(s => s.urgency.level === 'critical');
  const prompt = generateGroupReportPrompt(stats, activeKlal, priorityStudents);
  copyToClipboard(prompt, 'Copied! Paste into Gemini side panel (Ctrl+V)');
}

/**
 * Fetch and refresh data from Google Apps Script
 */
async function refreshData(isManual = false) {
  if (state.isLoading) return;

  state.isLoading = true;
  updateSyncUI('syncing', 'Syncing Sheet...');

  try {
    const result = await DataService.fetchLiveData();
    state.data = result.data;
    state.lastSyncTime = result.cacheTime;
    updateSyncUI('live', `Live Synced (${result.cacheTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);

    renderQuickStats();
    renderRadarColumn();
    renderStudentDossier();
    renderKlalInitiatives();
    renderHospitalityMatrix();

    if (isManual) {
      showToast('Dashboard updated with fresh Google Sheet data', 'success');
    }
  } catch (error) {
    console.warn('Network fetch failed or CORS restricted, using cached/fallback data:', error);
    
    const cached = DataService.getCachedData() || DataService.getFallbackData();
    state.data = cached.data;
    state.lastSyncTime = cached.cacheTime;

    updateSyncUI('cached', 'Offline / Cached Data');
    renderQuickStats();
    renderRadarColumn();
    renderStudentDossier();
    renderKlalInitiatives();
    renderHospitalityMatrix();

    if (isManual) {
      showToast('Live fetch paused. Using cached/local data gracefully.', 'success');
    }
  } finally {
    state.isLoading = false;
  }
}

/**
 * Initial Bootstrap
 */
function init() {
  const initial = DataService.getCachedData() || DataService.getFallbackData();
  state.data = initial.data;
  state.lastSyncTime = initial.cacheTime;
  
  const david = state.data.students.find(s => s.id === 'S13');
  state.selectedStudentId = david ? david.id : (state.data.students[0]?.id || null);

  updateSyncUI('cached', 'Cached Data');
  renderQuickStats();
  renderRadarColumn();
  renderStudentDossier();
  renderKlalInitiatives();
  renderHospitalityMatrix();
  updateLayoutPresetButtons();
  refreshIcons();

  // Background fetch for fresh live data
  refreshData(false);

  // Setup event listeners
  setupEventListeners();
}

/**
 * Setup All Event Listeners
 */
function setupEventListeners() {
  // Manual refresh
  elements.btnRefresh.addEventListener('click', () => refreshData(true));

  // Theme toggle
  elements.btnThemeToggle.addEventListener('click', toggleTheme);

  // Layout View Mode Presets
  elements.viewAllColsBtn.addEventListener('click', () => setLayoutPreset('all'));
  elements.viewFocusStudentBtn.addEventListener('click', () => setLayoutPreset('focus-student'));
  elements.viewFocusKlalBtn.addEventListener('click', () => setLayoutPreset('focus-klal'));

  // Column 1 collapse / expand
  elements.btnCollapseCol1.addEventListener('click', () => toggleCol1(false));
  elements.colStudentsCollapsed.addEventListener('click', () => toggleCol1(true));

  // Column 2 collapse / expand
  elements.colDossierCollapsed.addEventListener('click', () => toggleCol2(true));

  // Column 3 collapse / expand
  elements.btnCollapseCol3.addEventListener('click', () => toggleCol3(false));
  elements.colKlalCollapsed.addEventListener('click', () => toggleCol3(true));

  // Search input in Column 1
  elements.searchStudentsInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    elements.clearSearchBtn.classList.toggle('hidden', state.searchQuery === '');
    renderRadarColumn();
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    state.searchQuery = '';
    elements.searchStudentsInput.value = '';
    elements.clearSearchBtn.classList.add('hidden');
    renderRadarColumn();
  });

  // Search input in Column 3
  elements.col3SearchInput.addEventListener('input', (e) => {
    state.col3SearchQuery = e.target.value;
    elements.clearCol3SearchBtn.classList.toggle('hidden', state.col3SearchQuery === '');
    if (state.activeCol3Tab === 'klal') {
      renderKlalInitiatives();
    } else {
      renderHospitalityMatrix();
    }
  });

  elements.clearCol3SearchBtn.addEventListener('click', () => {
    state.col3SearchQuery = '';
    elements.col3SearchInput.value = '';
    elements.clearCol3SearchBtn.classList.add('hidden');
    if (state.activeCol3Tab === 'klal') {
      renderKlalInitiatives();
    } else {
      renderHospitalityMatrix();
    }
  });

  // Filter Buttons in Column 1
  elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.filterButtons.forEach(b => {
        b.classList.remove('bg-sky-600', 'text-white');
        b.classList.add('bg-slate-200', 'dark:bg-slate-800');
      });
      btn.classList.add('bg-sky-600', 'text-white');
      btn.classList.remove('bg-slate-200', 'dark:bg-slate-800');

      state.radarFilter = btn.dataset.filter;
      renderRadarColumn();
    });
  });

  // Student Sort
  elements.studentSortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderRadarColumn();
  });

  // Col 3 Tabs
  elements.col3TabKlal.addEventListener('click', () => {
    state.activeCol3Tab = 'klal';
    elements.col3TabKlal.className = 'col3-tab active py-1 rounded-md font-semibold text-center transition cursor-pointer bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs flex items-center justify-center gap-1.5';
    elements.col3TabHospitality.className = 'col3-tab py-1 rounded-md font-medium text-center transition cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center justify-center gap-1.5';
    elements.klalTabContent.classList.remove('hidden');
    elements.hospitalityTabContent.classList.add('hidden');
    renderKlalInitiatives();
  });

  elements.col3TabHospitality.addEventListener('click', () => {
    state.activeCol3Tab = 'hospitality';
    elements.col3TabHospitality.className = 'col3-tab active py-1 rounded-md font-semibold text-center transition cursor-pointer bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs flex items-center justify-center gap-1.5';
    elements.col3TabKlal.className = 'col3-tab py-1 rounded-md font-medium text-center transition cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center justify-center gap-1.5';
    elements.klalTabContent.classList.add('hidden');
    elements.hospitalityTabContent.classList.remove('hidden');
    renderHospitalityMatrix();
  });

  // Klal Filters
  elements.klalStatusFilter.addEventListener('change', (e) => {
    state.klalStatusFilter = e.target.value;
    renderKlalInitiatives();
  });

  elements.klalCategoryFilter.addEventListener('change', (e) => {
    state.klalCategoryFilter = e.target.value;
    renderKlalInitiatives();
  });

  // Direct Modal openers & form handlers
  elements.btnNewInitiativeHeader.addEventListener('click', openNewKlalModal);
  elements.closeNewKlalModalBtn.addEventListener('click', closeNewKlalModal);
  elements.cancelNewKlalModalBtn.addEventListener('click', closeNewKlalModal);
  elements.formNewKlal.addEventListener('submit', handleNewKlalSubmit);

  elements.closeLogModalBtn.addEventListener('click', closeLogMeetingModal);
  elements.cancelLogModalBtn.addEventListener('click', closeLogMeetingModal);
  elements.formLogMeeting.addEventListener('submit', handleLogMeetingSubmit);

  // Group report button
  elements.btnCohortReport.addEventListener('click', handleGroupReport);

  // Prompt Modal handlers
  elements.closePromptModalBtn.addEventListener('click', closePromptModal);
  elements.cancelPromptModalBtn.addEventListener('click', closePromptModal);
  elements.modalCopyBtn.addEventListener('click', () => {
    copyToClipboard(elements.promptModalTextarea.value, 'Copied! Paste into Gemini side panel (Ctrl+V)');
    closePromptModal();
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePromptModal();
      closeLogMeetingModal();
      closeNewKlalModal();
    }
    if (e.key === '/' && document.activeElement !== elements.searchStudentsInput && document.activeElement !== elements.col3SearchInput) {
      e.preventDefault();
      elements.searchStudentsInput.focus();
    }
  });
}

// Start application
init();
