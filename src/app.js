import { initIcons } from './icons.js';
import { 
  DataService, 
  calculateQuickStats, 
  formatDate 
} from './data-service.js';
import { 
  generateMeetingBriefingPrompt, 
  generateParentRoshYeshivaUpdatePrompt, 
  generateCohortReportPrompt,
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
  sortBy: 'urgency-desc',
  klalStatusFilter: 'active',
  klalCategoryFilter: 'all',
  activeCol3Tab: 'klal', // 'klal' | 'hospitality'
  isLoading: false,
  syncStatus: 'init', // 'live' | 'cached' | 'syncing' | 'error'
  lastSyncTime: null,
  activePromptText: '',
  activePromptTitle: ''
};

// ================= DOM ELEMENTS =================
const elements = {
  // Stats
  statTotalStudents: document.getElementById('stat-total-students'),
  statMetWeek: document.getElementById('stat-met-week'),
  statOverdue: document.getElementById('stat-overdue'),
  statAgendas: document.getElementById('stat-agendas'),
  statActiveKlal: document.getElementById('stat-active-klal'),

  // Sync & Header
  btnRefresh: document.getElementById('btn-refresh'),
  refreshIcon: document.getElementById('refresh-icon'),
  syncStatusIndicator: document.getElementById('sync-status-indicator'),
  syncDot: document.getElementById('sync-dot'),
  syncText: document.getElementById('sync-text'),

  // Column 1: Radar
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

  // Column 2: Dossier
  dossierHeaderContainer: document.getElementById('dossier-header-container'),
  dossierBodyContainer: document.getElementById('dossier-body-container'),

  // Column 3: Klal & Hospitality
  col3TabKlal: document.getElementById('col3-tab-klal'),
  col3TabHospitality: document.getElementById('col3-tab-hospitality'),
  klalTabContent: document.getElementById('klal-tab-content'),
  hospitalityTabContent: document.getElementById('hospitality-tab-content'),
  klalStatusFilter: document.getElementById('klal-status-filter'),
  klalCategoryFilter: document.getElementById('klal-category-filter'),
  klalCardsContainer: document.getElementById('klal-cards-container'),
  hospitalityCardsContainer: document.getElementById('hospitality-cards-container'),
  btnCohortReport: document.getElementById('btn-cohort-report'),

  // Modal & Toast
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
    ? `<i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>` 
    : `<i data-lucide="alert-circle" class="w-4 h-4 text-rose-400"></i>`;

  toast.className = `flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-xl backdrop-blur-md pointer-events-auto transition-all duration-200 transform translate-y-2 opacity-0 text-xs font-medium z-50 ${
    type === 'success' 
      ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/20' 
      : 'bg-slate-900/95 border-rose-500/40 text-rose-200 shadow-rose-950/20'
  }`;

  toast.innerHTML = `
    ${iconMarkup}
    <span class="flex-1">${message}</span>
  `;

  elements.toastContainer.appendChild(toast);
  initIcons();

  // Animate in
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
      // Fallback for older environments
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

/**
 * Close Prompt Preview Modal
 */
function closePromptModal() {
  elements.promptModal.classList.add('hidden');
  elements.promptModal.classList.remove('flex');
}

/**
 * Update Header Quick Stats
 */
function renderQuickStats() {
  const stats = calculateQuickStats(state.data);
  elements.statTotalStudents.textContent = stats.totalStudents;
  elements.statMetWeek.textContent = stats.metThisWeek;
  elements.statOverdue.textContent = stats.overdueCritical;
  elements.statAgendas.textContent = stats.hasAgendaCount;
  elements.statActiveKlal.textContent = stats.activeKlalCount;

  // Radar tab count badges
  elements.tabCountAll.textContent = stats.totalStudents;
  elements.tabCountCritical.textContent = stats.overdueCritical;
  elements.tabCountAttention.textContent = stats.attentionCount;
  elements.tabCountRecent.textContent = stats.recentCount;
  elements.tabCountAgenda.textContent = stats.hasAgendaCount;
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
    elements.syncDot.classList.add('bg-emerald-400');
    elements.refreshIcon.classList.remove('animate-spin');
  } else if (status === 'cached') {
    elements.syncDot.classList.add('bg-amber-400');
    elements.refreshIcon.classList.remove('animate-spin');
  } else {
    elements.syncDot.classList.add('bg-rose-400');
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
        <button id="reset-filters-btn" class="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer">
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
          b.classList.toggle('bg-slate-800', b.dataset.filter !== 'all');
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
    
    // Status color border and badge styling
    let urgencyBadge = '';
    let borderAccent = 'border-l-2 border-emerald-500';

    if (student.urgency.level === 'critical') {
      borderAccent = 'border-l-2 border-rose-500';
      urgencyBadge = `
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          ${student.urgency.displayDays}
        </span>
      `;
    } else if (student.urgency.level === 'attention') {
      borderAccent = 'border-l-2 border-amber-500';
      urgencyBadge = `
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          ${student.urgency.displayDays}
        </span>
      `;
    } else {
      borderAccent = 'border-l-2 border-emerald-500';
      urgencyBadge = `
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          ${student.urgency.displayDays}
        </span>
      `;
    }

    const agendaPill = student.hasAgenda 
      ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-400/15 text-amber-300 border border-amber-400/30" title="Has pending next agenda item">
           <i data-lucide="lightbulb" class="w-2.5 h-2.5 text-amber-400"></i>
           Agenda
         </span>`
      : '';

    const shabbosPill = student.shabbosCount > 0
      ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
           🍷 ${student.shabbosCount}
         </span>`
      : `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-500">
           🍷 0
         </span>`;

    const pinnedIndicator = student.pinnedContext 
      ? `<span class="text-indigo-400 text-[10px]" title="Has long-term guidance notes">📌</span>`
      : '';

    return `
      <div 
        data-student-id="${student.id}" 
        class="student-card cursor-pointer p-3 rounded-lg transition-all duration-150 ${borderAccent} ${
          isSelected 
            ? 'bg-slate-800/90 ring-1 ring-sky-500/60 shadow-lg' 
            : 'bg-slate-900/40 hover:bg-slate-800/50'
        }"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs text-white truncate">${student.name}</span>
              ${pinnedIndicator}
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
              <span class="font-mono text-slate-500 text-[10px]">${student.id}</span>
              <span>•</span>
              <span class="truncate text-[10px]">${student.shiur || 'Shana Bet'}</span>
            </div>
          </div>
          <div class="flex-none">
            ${urgencyBadge}
          </div>
        </div>

        <!-- Badges row -->
        <div class="flex items-center gap-1.5 mt-2">
          ${agendaPill}
          ${shabbosPill}
          ${
            student.nextAgenda 
              ? `<span class="text-[10px] text-slate-400 truncate flex-1 italic">"${student.nextAgenda.replace(/^[•\s-]+/, '').slice(0, 38)}..."</span>` 
              : ''
          }
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
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

  // Filter logs for this student
  const studentLogs = state.data.logs.filter(l => l.studentId === student.id);

  // Status badge styling
  let urgencyPill = '';
  if (student.urgency.level === 'critical') {
    urgencyPill = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        🔴 Critical Triage (${student.urgency.displayDays})
      </span>
    `;
  } else if (student.urgency.level === 'attention') {
    urgencyPill = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
        🟡 Attention Needed (${student.urgency.displayDays})
      </span>
    `;
  } else {
    urgencyPill = `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        🟢 Up to Date (${student.urgency.displayDays})
      </span>
    `;
  }

  // Dossier Header
  elements.dossierHeaderContainer.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-bold text-white">${student.name}</h2>
          <span class="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            ${student.id}
          </span>
          <span class="px-2 py-0.5 rounded text-xs bg-sky-950/40 text-sky-400 border border-sky-800/40">
            ${student.shiur || 'Shana Bet'}
          </span>
        </div>
        <p class="text-xs text-slate-400 mt-1 flex items-center gap-2">
          <span>Last 1-on-1: <strong class="text-slate-200">${student.lastMetFormatted}</strong></span>
          <span>•</span>
          <span>Shabbat Meals: <strong class="text-slate-200">${student.shabbosCount}</strong></span>
          ${student.shabbosNotes ? `<span>(${student.shabbosNotes})</span>` : ''}
        </p>
      </div>
      <div>
        ${urgencyPill}
      </div>
    </div>

    <!-- Quick Stats Grid for Student -->
    <div class="grid grid-cols-3 gap-2.5 mt-3.5 pt-3 border-t border-slate-800/80">
      <div class="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Meeting Interval</span>
        <span class="text-xs font-bold text-white font-mono mt-0.5 block">${student.urgency.displayDays}</span>
      </div>
      <div class="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Shabbat Hospitality</span>
        <span class="text-xs font-bold text-indigo-300 font-mono mt-0.5 block">${student.shabbosCount} meal${student.shabbosCount === 1 ? '' : 's'}</span>
      </div>
      <div class="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Past Logged Notes</span>
        <span class="text-xs font-bold text-sky-300 font-mono mt-0.5 block">${studentLogs.length} interactions</span>
      </div>
    </div>

    <!-- Gemini Copilot Actions Toolbar -->
    <div class="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
      <span class="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
        <i data-lucide="sparkles" class="w-3.5 h-3.5 text-sky-400"></i>
        Gemini Copilot:
      </span>

      <!-- Action 1: Prep Briefing -->
      <button 
        id="btn-prep-briefing" 
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-sky-950/40 transition cursor-pointer"
        title="Synthesizes student's history and copies a briefing prompt for Gemini side panel"
      >
        <i data-lucide="clipboard-list" class="w-3.5 h-3.5"></i>
        <span>📋 Prep Meeting Briefing</span>
      </button>

      <!-- Action 2: Draft Parent / Rosh Yeshiva Update -->
      <button 
        id="btn-draft-update" 
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-indigo-950/40 transition cursor-pointer"
        title="Copies prompt to draft an executive progress update for Rosh Yeshiva & Parents"
      >
        <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
        <span>📝 Draft Parent / RY Update</span>
      </button>

      <!-- Action 3: Shabbos Invite Outreach -->
      <button 
        id="btn-shabbos-invite" 
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
        title="Generate a personal Shabbat invite message"
      >
        <i data-lucide="utensils" class="w-3.5 h-3.5 text-amber-400"></i>
        <span>🍷 Invite Check</span>
      </button>

      <!-- Preview Prompt Button -->
      <button 
        id="btn-preview-current-prompt" 
        class="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
        title="View prompt text before copying"
      >
        <i data-lucide="eye" class="w-3.5 h-3.5 text-slate-400"></i>
        <span>Preview</span>
      </button>
    </div>
  `;

  // Dossier Body
  const pinnedHtml = student.pinnedContext 
    ? `
      <div class="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 to-purple-950/20 p-4 shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          <i data-lucide="compass" class="w-4 h-4 text-indigo-400"></i>
          <h3 class="text-xs font-bold text-indigo-200 uppercase tracking-wider">Pinned Guidance Focus & Long-Term Trajectory</h3>
        </div>
        <p class="text-xs text-slate-200 leading-relaxed font-sans">${student.pinnedContext}</p>
      </div>
    `
    : `
      <div class="rounded-xl border border-slate-800/70 bg-slate-900/30 p-3 text-slate-500 text-xs flex items-center gap-2">
        <i data-lucide="info" class="w-4 h-4 opacity-60"></i>
        <span>No permanent pinned guidance context recorded for this student yet.</span>
      </div>
    `;

  const agendaHtml = student.hasAgenda 
    ? `
      <div class="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 to-yellow-950/20 p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <i data-lucide="lightbulb" class="w-4 h-4 text-amber-400"></i>
            <h3 class="text-xs font-bold text-amber-200 uppercase tracking-wider">Pending Agenda (Unaddressed Ideas Waiting)</h3>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
            Immediate Follow-up
          </span>
        </div>
        <div class="text-xs text-amber-100/90 leading-relaxed whitespace-pre-line pl-1 border-l-2 border-amber-500/50">
          ${student.nextAgenda}
        </div>
      </div>
    `
    : `
      <div class="rounded-xl border border-slate-800/60 bg-slate-900/20 p-3 text-slate-500 text-xs flex items-center gap-2">
        <i data-lucide="check" class="w-4 h-4 text-emerald-500"></i>
        <span>No urgent pending agenda item recorded. Next meeting will follow natural check-in flow.</span>
      </div>
    `;

  // History timeline
  let timelineHtml = '';
  if (studentLogs.length > 0) {
    timelineHtml = `
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i data-lucide="history" class="w-4 h-4 text-sky-400"></i>
            <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Chronological Interaction History</h3>
          </div>
          <span class="text-[11px] text-slate-400 font-mono">${studentLogs.length} recorded</span>
        </div>

        <div class="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          ${studentLogs.map((log) => `
            <div class="relative group">
              <!-- Dot on timeline -->
              <div class="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-sky-400 group-hover:scale-125 transition-transform"></div>

              <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition">
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      ${log.interactionType}
                    </span>
                    <span class="font-bold text-slate-200">${log.dateFormatted}</span>
                  </div>
                </div>

                <p class="text-xs text-slate-300 leading-relaxed">${log.summary}</p>

                ${log.nextSteps ? `
                  <div class="mt-2 pt-2 border-t border-slate-800/60 flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg">
                    <i data-lucide="arrow-right-circle" class="w-3.5 h-3.5 text-sky-400 mt-0.5 flex-none"></i>
                    <div class="text-[11px] text-sky-200/90 leading-tight">
                      <strong class="text-sky-300">Next Steps:</strong> ${log.nextSteps}
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
      <div class="rounded-xl border border-dashed border-slate-800 p-8 text-center text-slate-500 text-xs space-y-2">
        <i data-lucide="message-square-off" class="w-8 h-8 mx-auto opacity-50"></i>
        <p class="font-medium text-slate-400">No interaction logs recorded for this student yet.</p>
        <p class="text-[11px] text-slate-500">Dictate an interaction via the mobile voice Web App or hold a meeting to record discussion summaries.</p>
      </div>
    `;
  }

  elements.dossierBodyContainer.innerHTML = `
    <!-- Pinned Context -->
    ${pinnedHtml}

    <!-- Pending Agenda -->
    ${agendaHtml}

    <!-- Interaction History Timeline -->
    ${timelineHtml}
  `;

  // Attach button event handlers
  const btnPrepBriefing = document.getElementById('btn-prep-briefing');
  const btnDraftUpdate = document.getElementById('btn-draft-update');
  const btnShabbosInvite = document.getElementById('btn-shabbos-invite');
  const btnPreviewPrompt = document.getElementById('btn-preview-current-prompt');

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

  if (list.length === 0) {
    elements.klalCardsContainer.innerHTML = `
      <div class="p-8 text-center text-slate-500 text-xs">
        <i data-lucide="layers" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        <p>No cohort initiatives match the selected filters.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  elements.klalCardsContainer.innerHTML = list.map(item => {
    const isEducational = item.isEducational;
    const badgeCategory = isEducational
      ? `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">Educational</span>`
      : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">Programming</span>`;

    const statusBadge = item.isActive
      ? `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Active</span>`
      : item.isCompleted
      ? `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">Completed</span>`
      : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">Backlog</span>`;

    return `
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 hover:border-slate-700 transition shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div class="space-y-1">
            <h4 class="text-xs font-bold text-white leading-snug">${item.title}</h4>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${badgeCategory}
              ${statusBadge}
              <span class="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <i data-lucide="calendar" class="w-3 h-3 text-slate-500"></i>
                ${item.targetTiming}
              </span>
            </div>
          </div>
        </div>

        <div class="space-y-1.5 pt-1 text-xs">
          <div class="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span class="text-[10px] uppercase font-bold text-indigo-300 block mb-1">Core Vision & Need</span>
            <p class="text-slate-300 leading-relaxed text-[11px]">${item.vision}</p>
          </div>

          <div class="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <span class="text-[10px] uppercase font-bold text-sky-300 block mb-1">Action Plan & Next Steps</span>
            <p class="text-slate-300 leading-relaxed text-[11px]">${item.actionPlan}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');

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
  const candidates0 = state.data.students
    .filter(s => s.shabbosCount === 0)
    .sort((a, b) => {
      const daysA = a.daysElapsed === null ? 9999 : a.daysElapsed;
      const daysB = b.daysElapsed === null ? 9999 : b.daysElapsed;
      return daysB - daysA;
    });

  elements.hospitalityCardsContainer.innerHTML = `
    <!-- Distribution Progress Bar -->
    <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold text-white flex items-center gap-1.5">
          <i data-lucide="bar-chart-3" class="w-3.5 h-3.5 text-amber-400"></i>
          Hospitality Distribution
        </h4>
        <span class="text-[10px] font-mono text-slate-400">${total} total students</span>
      </div>

      <!-- Segmented Bar -->
      <div class="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
        <div style="width: ${pct0}%" class="bg-rose-500/80 hover:bg-rose-500 transition-all" title="0 Meals: ${stats.zeroShabbosMeals} (${pct0}%)"></div>
        <div style="width: ${pct1}%" class="bg-amber-500/80 hover:bg-amber-500 transition-all" title="1 Meal: ${stats.oneShabbosMeal} (${pct1}%)"></div>
        <div style="width: ${pct2Plus}%" class="bg-emerald-500/80 hover:bg-emerald-500 transition-all" title="2+ Meals: ${stats.twoPlusShabbosMeals} (${pct2Plus}%)"></div>
      </div>

      <!-- Legend -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs pt-1">
        <div class="bg-rose-950/30 border border-rose-500/20 p-2 rounded-lg">
          <span class="text-[10px] text-rose-300 font-semibold block">0 Meals</span>
          <span class="text-sm font-bold text-white font-mono">${stats.zeroShabbosMeals}</span>
          <span class="text-[10px] text-rose-400 font-mono block">(${pct0}%)</span>
        </div>
        <div class="bg-amber-950/30 border border-amber-500/20 p-2 rounded-lg">
          <span class="text-[10px] text-amber-300 font-semibold block">1 Meal</span>
          <span class="text-sm font-bold text-white font-mono">${stats.oneShabbosMeal}</span>
          <span class="text-[10px] text-amber-400 font-mono block">(${pct1}%)</span>
        </div>
        <div class="bg-emerald-950/30 border border-emerald-500/20 p-2 rounded-lg">
          <span class="text-[10px] text-emerald-300 font-semibold block">2+ Meals</span>
          <span class="text-sm font-bold text-white font-mono">${stats.twoPlusShabbosMeals}</span>
          <span class="text-[10px] text-emerald-400 font-mono block">(${pct2Plus}%)</span>
        </div>
      </div>
    </div>

    <!-- Priority Candidates List -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="user-plus" class="w-3.5 h-3.5 text-rose-400"></i>
          Priority Candidates for Next Shabbat
        </h4>
        <span class="text-[10px] text-rose-400 font-mono font-medium">${candidates0.length} students</span>
      </div>

      <div class="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
        ${candidates0.slice(0, 15).map(student => `
          <div 
            data-student-id="${student.id}" 
            class="shabbos-candidate-card cursor-pointer p-2.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition flex items-center justify-between gap-2"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs text-white truncate">${student.name}</span>
                <span class="text-[10px] font-mono text-slate-500">${student.id}</span>
              </div>
              <span class="text-[10px] text-slate-400 block">${student.urgency.displayDays}</span>
            </div>
            <button 
              data-invite-id="${student.id}" 
              class="btn-quick-invite flex-none px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-medium flex items-center gap-1 transition"
              title="Copy personalized invite prompt for Gemini"
            >
              <i data-lucide="sparkles" class="w-2.5 h-2.5 text-amber-400"></i>
              <span>Invite</span>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Attach card click handlers
  elements.hospitalityCardsContainer.querySelectorAll('.shabbos-candidate-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-quick-invite')) return;
      selectStudent(card.dataset.studentId);
    });
  });

  // Attach quick invite click handlers
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
 * Handle Cohort Report Prompt Generation
 */
function handleCohortReport() {
  const stats = calculateQuickStats(state.data);
  const activeKlal = state.data.klal.filter(k => k.isActive);
  const priorityStudents = state.data.students.filter(s => s.urgency.level === 'critical');
  const prompt = generateCohortReportPrompt(stats, activeKlal, priorityStudents);
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

    // Re-render UI
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
    
    // Fall back to cached or embedded fallback data
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
  // 1. Instant load from cache or fallback
  const initial = DataService.getCachedData() || DataService.getFallbackData();
  state.data = initial.data;
  state.lastSyncTime = initial.cacheTime;
  
  // Pick initial student (David Ellis or first student)
  const david = state.data.students.find(s => s.id === 'S13');
  state.selectedStudentId = david ? david.id : (state.data.students[0]?.id || null);

  updateSyncUI('cached', 'Cached Data');
  renderQuickStats();
  renderRadarColumn();
  renderStudentDossier();
  renderKlalInitiatives();
  renderHospitalityMatrix();
  refreshIcons();

  // 2. Parallel background fetch for live data
  refreshData(false);

  // 3. Attach UI Listeners
  setupEventListeners();
}

/**
 * Setup All Event Listeners
 */
function setupEventListeners() {
  // Manual refresh
  elements.btnRefresh.addEventListener('click', () => refreshData(true));

  // Search input
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

  // Filter Buttons
  elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.filterButtons.forEach(b => {
        b.classList.remove('bg-sky-600', 'text-white');
        b.classList.add('bg-slate-800');
      });
      btn.classList.add('bg-sky-600', 'text-white');
      btn.classList.remove('bg-slate-800');

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
    elements.col3TabKlal.className = 'col3-tab active py-1.5 rounded-md font-semibold text-center transition cursor-pointer bg-slate-800 text-white shadow-sm flex items-center justify-center gap-1.5';
    elements.col3TabHospitality.className = 'col3-tab py-1.5 rounded-md font-medium text-center transition cursor-pointer text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5';
    elements.klalTabContent.classList.remove('hidden');
    elements.hospitalityTabContent.classList.add('hidden');
    renderKlalInitiatives();
  });

  elements.col3TabHospitality.addEventListener('click', () => {
    state.activeCol3Tab = 'hospitality';
    elements.col3TabHospitality.className = 'col3-tab active py-1.5 rounded-md font-semibold text-center transition cursor-pointer bg-slate-800 text-white shadow-sm flex items-center justify-center gap-1.5';
    elements.col3TabKlal.className = 'col3-tab py-1.5 rounded-md font-medium text-center transition cursor-pointer text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5';
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

  // Cohort report button
  elements.btnCohortReport.addEventListener('click', handleCohortReport);

  // Modal handlers
  elements.closePromptModalBtn.addEventListener('click', closePromptModal);
  elements.cancelPromptModalBtn.addEventListener('click', closePromptModal);
  elements.modalCopyBtn.addEventListener('click', () => {
    copyToClipboard(elements.promptModalTextarea.value, 'Copied! Paste into Gemini side panel (Ctrl+V)');
    closePromptModal();
  });

  // Close modal on Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePromptModal();
    }
    // Keyboard shortcut '/' to search
    if (e.key === '/' && document.activeElement !== elements.searchStudentsInput) {
      e.preventDefault();
      elements.searchStudentsInput.focus();
    }
  });
}

// Start application
init();
