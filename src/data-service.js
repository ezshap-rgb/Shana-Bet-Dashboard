import fallbackData from './fallback-data.json';

const GAS_BASE_URL = 'https://script.google.com/macros/s/AKfycbyPqoLKl-sbwQmewRex_5u8ihj4DBzE-uKHGma_valOC2OdUdZHVD7e3JYBGXkdxjX4Iw/exec';
const GAS_ENDPOINT = `${GAS_BASE_URL}?action=getDashboardData`;
const CACHE_KEY = 'shana_bet_dashboard_cache_v2';
const CACHE_TIME_KEY = 'shana_bet_dashboard_cache_time_v2';

/**
 * Calculates days elapsed between a date string and reference date.
 * If dateStr is empty or invalid, returns null (never met).
 */
export function calculateDaysElapsed(dateStr, referenceDate = new Date()) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return null;
  }
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  const diffMs = referenceDate.getTime() - parsed.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
}

/**
 * Categorizes urgency based on days elapsed:
 * 🔴 Critical (> 30 days or never met)
 * 🟡 Attention (21-30 days)
 * 🟢 Recent (< 21 days)
 */
export function getUrgencyStatus(daysElapsed) {
  if (daysElapsed === null || daysElapsed === undefined || daysElapsed > 30) {
    return {
      level: 'critical',
      label: 'Critical',
      color: 'red',
      days: daysElapsed,
      displayDays: daysElapsed === null ? 'Never met' : `${daysElapsed}d overdue`
    };
  }
  if (daysElapsed >= 21) {
    return {
      level: 'attention',
      label: 'Attention',
      color: 'amber',
      days: daysElapsed,
      displayDays: `${daysElapsed}d elapsed`
    };
  }
  return {
    level: 'recent',
    label: 'Recent',
    color: 'emerald',
    days: daysElapsed,
    displayDays: `${daysElapsed}d ago`
  };
}

/**
 * Formats ISO date to readable string like "Oct 19, 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'Not recorded';
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Parses raw 2D array data into normalized model objects
 */
export function parseDashboardData(rawData) {
  if (!rawData || !rawData.data) {
    throw new Error('Invalid data payload format received.');
  }

  const { students: rawStudents = [], logs: rawLogs = [], klal: rawKlal = [] } = rawData.data;

  // 1. Parse Students
  // Header: ["ID","Name","Shiur","PinnedContext","NextAgenda","LastMetDate","LastShabbosDate","ShabbosCount","ShabbosNotes"]
  const studentRows = rawStudents.length > 0 ? rawStudents.slice(1) : [];
  const students = studentRows.map((row) => {
    const id = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();
    const shiur = String(row[2] || '').trim();
    const pinnedContext = String(row[3] || '').trim();
    const nextAgenda = String(row[4] || '').trim();
    const lastMetDate = row[5] ? String(row[5]).trim() : '';
    const lastShabbosDate = row[6] ? String(row[6]).trim() : '';
    const shabbosCount = parseInt(row[7], 10) || 0;
    const shabbosNotes = String(row[8] || '').trim();

    const daysElapsed = calculateDaysElapsed(lastMetDate);
    const urgency = getUrgencyStatus(daysElapsed);

    return {
      id,
      name,
      shiur,
      pinnedContext,
      nextAgenda,
      hasAgenda: nextAgenda.length > 0,
      lastMetDate,
      lastMetFormatted: formatDate(lastMetDate),
      lastShabbosDate,
      lastShabbosFormatted: formatDate(lastShabbosDate),
      shabbosCount,
      shabbosNotes,
      daysElapsed,
      urgency
    };
  });

  // 2. Parse Logs
  // Header: ["Date Logged","StudentID","Name","InteractionType","Summary","NextSteps"]
  const logRows = rawLogs.length > 0 ? rawLogs.slice(1) : [];
  const logs = logRows.map((row) => {
    const date = row[0] ? String(row[0]).trim() : '';
    const studentId = String(row[1] || '').trim();
    const name = String(row[2] || '').trim();
    const interactionType = String(row[3] || 'Meeting').trim();
    const summary = String(row[4] || '').trim();
    const nextSteps = String(row[5] || '').trim();

    return {
      date,
      dateFormatted: formatDate(date),
      timestamp: date ? new Date(date).getTime() : 0,
      studentId,
      name,
      interactionType,
      summary,
      nextSteps
    };
  }).sort((a, b) => b.timestamp - a.timestamp); // newest first

  // 3. Parse Klal Initiatives
  // Header: ["Date Logged","Category","Initiative Title","Core Vision & Underlying Need","Actionable Plan / Next Steps","Status","Target Timing / Zman"]
  const klalRows = rawKlal.length > 0 ? rawKlal.slice(1) : [];
  const klal = klalRows.map((row, index) => {
    const date = row[0] ? String(row[0]).trim() : '';
    const category = String(row[1] || 'General').trim();
    const title = String(row[2] || `Initiative ${index + 1}`).trim();
    const vision = String(row[3] || '').trim();
    const actionPlan = String(row[4] || '').trim();
    const status = String(row[5] || 'Active').trim();
    const targetTiming = String(row[6] || 'Upcoming').trim();

    return {
      id: `klal-${index}`,
      date,
      dateFormatted: formatDate(date),
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
  });

  return {
    students,
    logs,
    klal,
    parsedAt: new Date().toISOString()
  };
}

/**
 * Calculates high-level header statistics
 */
export function calculateQuickStats(parsedData) {
  const { students = [], klal = [] } = parsedData;
  const total = students.length;

  let metThisWeek = 0;
  let overdueCritical = 0;
  let attentionCount = 0;
  let recentCount = 0;
  let hasAgendaCount = 0;
  let zeroShabbosMeals = 0;
  let oneShabbosMeal = 0;
  let twoPlusShabbosMeals = 0;

  students.forEach((s) => {
    if (s.daysElapsed !== null && s.daysElapsed <= 7) {
      metThisWeek++;
    }
    if (s.urgency.level === 'critical') {
      overdueCritical++;
    } else if (s.urgency.level === 'attention') {
      attentionCount++;
    } else {
      recentCount++;
    }

    if (s.hasAgenda) {
      hasAgendaCount++;
    }

    if (s.shabbosCount === 0) {
      zeroShabbosMeals++;
    } else if (s.shabbosCount === 1) {
      oneShabbosMeal++;
    } else {
      twoPlusShabbosMeals++;
    }
  });

  const activeKlalCount = klal.filter(k => k.isActive).length;

  return {
    totalStudents: total,
    metThisWeek,
    overdueCritical,
    attentionCount,
    recentCount,
    hasAgendaCount,
    activeKlalCount,
    zeroShabbosMeals,
    oneShabbosMeal,
    twoPlusShabbosMeals
  };
}

/**
 * Data Service object handling caching and network fetching
 */
export const DataService = {
  getEndpointUrl() {
    return GAS_ENDPOINT;
  },

  getCachedData() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
      if (raw) {
        const parsedJson = JSON.parse(raw);
        const data = parseDashboardData(parsedJson);
        return {
          data,
          cacheTime: cacheTime ? new Date(cacheTime) : new Date(),
          isLive: false,
          isFallback: false
        };
      }
    } catch (err) {
      console.warn('Failed to parse localStorage cache:', err);
    }
    return null;
  },

  getFallbackData() {
    const data = parseDashboardData(fallbackData);
    return {
      data,
      cacheTime: new Date(),
      isLive: false,
      isFallback: true
    };
  },

  async fetchLiveData() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(GAS_ENDPOINT, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const rawJson = await response.json();
      if (!rawJson || rawJson.status !== 'success') {
        throw new Error(rawJson?.message || 'Server returned non-success response');
      }

      // Save to localStorage
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(rawJson));
        localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
      } catch (storageErr) {
        console.warn('Could not save to localStorage (storage quota):', storageErr);
      }

      const data = parseDashboardData(rawJson);
      return {
        data,
        cacheTime: new Date(),
        isLive: true,
        isFallback: false
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Fetch error from Google Apps Script:', error);
      throw error;
    }
  },

  /**
   * Sends a micro-update to the Google Apps Script Web App.
   * Uses POST with Content-Type: text/plain;charset=utf-8 to prevent CORS preflight OPTIONS failures.
   */
  async sendDirectUpdate(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 16000);

    try {
      const response = await fetch(GAS_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        redirect: 'follow',
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      let jsonRes = null;
      try {
        jsonRes = JSON.parse(text);
      } catch (e) {
        // GAS may return HTML or non-JSON if redirect issue occurs
        console.warn('Response from GAS not valid JSON, raw text length:', text.length);
      }

      if (jsonRes && jsonRes.status === 'error') {
        throw new Error(jsonRes.message || 'Error reported by Google Apps Script');
      }

      return jsonRes || { status: 'success', message: 'Action executed' };
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('sendDirectUpdate error:', err);
      throw err;
    }
  },

  /**
   * Updates local storage cache with current mutated state
   */
  saveCurrentStateToCache(data) {
    try {
      // Re-encode into the matrix format that parseDashboardData expects
      const studentHeaders = ["ID","Name","Shiur","PinnedContext","NextAgenda","LastMetDate","LastShabbosDate","ShabbosCount","ShabbosNotes"];
      const studentRows = data.students.map(s => [
        s.id,
        s.name,
        s.shiur,
        s.pinnedContext,
        s.nextAgenda,
        s.lastMetDate,
        s.lastShabbosDate,
        s.shabbosCount,
        s.shabbosNotes
      ]);

      const logHeaders = ["Date Logged","StudentID","Name","InteractionType","Summary","NextSteps"];
      const logRows = data.logs.map(l => [
        l.date,
        l.studentId,
        l.name,
        l.interactionType,
        l.summary,
        l.nextSteps
      ]);

      const klalHeaders = ["Date Logged","Category","Initiative Title","Core Vision & Underlying Need","Actionable Plan / Next Steps","Status","Target Timing / Zman"];
      const klalRows = data.klal.map(k => [
        k.date,
        k.category,
        k.title,
        k.vision,
        k.actionPlan,
        k.status,
        k.targetTiming
      ]);

      const payload = {
        status: 'success',
        action: 'getDashboardData',
        data: {
          students: [studentHeaders, ...studentRows],
          logs: [logHeaders, ...logRows],
          klal: [klalHeaders, ...klalRows]
        }
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());
    } catch (err) {
      console.warn('Could not update localStorage cache:', err);
    }
  },

  clearCache() {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIME_KEY);
  }
};

