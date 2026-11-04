/**
 * Generates tailored prompt templates for the Gemini Chrome Side Panel
 * to assist the Yeshiva Guidance Counselor & Mashgiach.
 */

/**
 * 1. 1-on-1 Meeting Briefing Prompt
 * Synthesizes student's background, days elapsed, pinned guidance context,
 * unaddressed ideas/agenda, and past interaction logs.
 */
export function generateMeetingBriefingPrompt(student, studentLogs = []) {
  const logsSummary = studentLogs.length > 0
    ? studentLogs.map((log, idx) => {
        return `[Interaction ${idx + 1} - ${log.dateFormatted} (${log.interactionType})]
Summary: ${log.summary}
Agreed Next Steps: ${log.nextSteps || 'None noted'}`;
      }).join('\n\n')
    : 'No previous 1-on-1 interaction logs recorded in the system yet.';

  const shabbosInfo = student.shabbosCount > 0
    ? `${student.shabbosCount} meal(s) logged (${student.shabbosNotes || 'Last: ' + student.lastShabbosFormatted})`
    : 'No Shabbat meals logged yet with rebbeim/mashgichim';

  return `You are an expert Yeshiva Guidance Counselor, Mashgiach, and Adolescent Mentor assisting me with Shana Bet (second-year post-high school) yeshiva students in Israel.

I am preparing for an upcoming 1-on-1 guidance meeting with:
• Student Name: ${student.name}
• Student ID: ${student.id}
• Shiur / Cohort: ${student.shiur || 'Shana Bet'}
• Days Elapsed Since Last Meeting: ${student.urgency.displayDays} (Last met: ${student.lastMetFormatted})
• Shabbat Hospitality: ${shabbosInfo}

--- CORE GUIDANCE CONTEXT & LONG-TERM TRAJECTORY ---
${student.pinnedContext || 'No permanent pinned context noted yet. Treat as general second-year development, zman acclimation, and post-Shana Alef transition.'}

--- UNADDRESSED AGENDA ITEMS & IMMEDIATE OPEN LOOPS ---
${student.nextAgenda || 'No explicit pending agenda item recorded.'}

--- CHRONOLOGICAL INTERACTION LOGS ---
${logsSummary}

--- YOUR TASK & INSTRUCTIONS ---
Please synthesize the above history and dynamics to provide a structured, high-impact meeting preparation briefing:

1. ⚡ 2-Minute Executive Briefing:
   - What is the student's current psychological and spiritual temperature?
   - Identify the underlying emotional or interpersonal themes (e.g., chavrusa friction, nervous system over-arousal, hashkafic ambiguity, army prep anxiety, perseverance vs quitting).

2. 🎯 3 High-Impact Conversational Openers & Talking Points:
   - Provide 3 thoughtful, open-ended, non-judgmental prompts that invite genuine reflection rather than surface-level Yeshiva answers.

3. 🛠️ Concrete Rabbinic / Psychological Guidance Strategies:
   - Suggest 2 actionable tools, cognitive reframings, or behavioral commitments tailored specifically to his situation to offer during this session.

4. ⚠️ Delicate Areas & Watchouts:
   - What should I be sensitive not to push too hard on, and how can I ensure he leaves feeling supported rather than managed?`;
}

/**
 * 2. Draft Parent / Rosh Yeshiva Progress Update
 */
export function generateParentRoshYeshivaUpdatePrompt(student, studentLogs = []) {
  const logsSummary = studentLogs.length > 0
    ? studentLogs.slice(0, 4).map((log, idx) => {
        return `• [${log.dateFormatted}]: ${log.summary} (Next: ${log.nextSteps || 'N/A'})`;
      }).join('\n')
    : 'Ongoing zman participation, regular attendance, and informal check-ins.';

  return `You are a warm, perceptive Yeshiva Guidance Counselor drafting an executive student progress update for the Rosh Yeshiva and Parents.

• Student Name: ${student.name} (ID: ${student.id})
• Status: Shana Bet (${student.urgency.displayDays})
• Long-Term Developmental Focus: ${student.pinnedContext || 'General academic persistence, spiritual maturation, and peer integration.'}
• Current Open Items: ${student.nextAgenda || 'None'}
• Shabbat Hospitality: ${student.shabbosCount} meal(s)

Recent Counselor Notes:
${logsSummary}

--- INSTRUCTIONS ---
Draft two distinct, ready-to-refine updates:

### VERSION A: Executive Hanhala / Rosh Yeshiva Update (Internal & Candid)
- 2-3 concise paragraphs.
- Focus: Seder stamina, chavrusa dynamics, emotional resilience, hashkafic grounding, and concrete counselor intervention points.
- Professional, objective, and rabbinic in tone.

### VERSION B: Parent Communication (Warm, Reassuring & Growth-Oriented)
- 2 warm paragraphs suitable for an email or phone prep note.
- Focus: Character refinement (Middot), personal ownership of learning, personal maturation in Israel, and encouragement of his strengths.
- Maintains appropriate student confidentiality while giving parents genuine nachas and visibility into his mentorship.`;
}

/**
 * 3. Cohort Macro Report Prompt (Hanhala Executive Briefing)
 */
export function generateCohortReportPrompt(stats, activeKlal = [], priorityStudents = []) {
  const initiativesList = activeKlal.length > 0
    ? activeKlal.map((k, i) => {
        return `${i + 1}. [${k.category}] ${k.title} (Timing: ${k.targetTiming})
   • Vision: ${k.vision}
   • Action Plan: ${k.actionPlan}`;
      }).join('\n\n')
    : 'No active cohort initiatives currently logged.';

  const priorityList = priorityStudents.slice(0, 8).map(s => {
    return `• ${s.name} (${s.id}) - ${s.urgency.displayDays}${s.hasAgenda ? ' [Has Pending Agenda]' : ''} - Shabbat Meals: ${s.shabbosCount}`;
  }).join('\n');

  return `You are an executive educational and guidance consultant conducting a comprehensive cohort analysis for the Yeshiva Hanhala (Leadership Meeting) regarding the Shana Bet class.

--- COHORT TRIAGE & WELLBEING METRICS ---
• Total Student Body: ${stats.totalStudents} students
• Met in Last 7 Days: ${stats.metThisWeek} students (${Math.round((stats.metThisWeek / (stats.totalStudents || 1)) * 100)}%)
• 🔴 Critical Overdue (>30 days / Never Met): ${stats.overdueCritical} students
• 🟡 Attention Needed (21-30 days): ${stats.attentionCount} students
• 🟢 Up to Date (<21 days): ${stats.recentCount} students
• 💡 Unaddressed Pending Agendas: ${stats.hasAgendaCount} students awaiting follow-up

--- SHABBAT HOSPITALITY REACH ---
• 0 Meals with Rebbeim/Staff: ${stats.zeroShabbosMeals} students (${Math.round((stats.zeroShabbosMeals / (stats.totalStudents || 1)) * 100)}%)
• 1 Meal Logged: ${stats.oneShabbosMeal} students
• 2+ Meals Logged: ${stats.twoPlusShabbosMeals} students

--- TOP PRIORITY STUDENTS NEEDING IMMEDIATE OUTREACH ---
${priorityList}

--- ACTIVE KLAL COHORT INITIATIVES ---
${initiativesList}

--- YOUR TASK ---
Generate a high-level Executive Cohort Status Briefing for the Rosh Yeshiva and Guidance Staff:
1. Executive Health Assessment: Macro evaluation of cohort momentum, pastoral coverage, and triage bottlenecks.
2. 7-Day Action Plan: Concrete allocation of counselor hours to reach the overdue and 0-meal students before the upcoming Shabbat.
3. Klal Initiatives Optimization: Strategic review of the active educational and programming projects—recommend next milestones and faculty responsibilities.`;
}

/**
 * 4. Shabbat Hospitality Invitation Prompt
 */
export function generateShabbosInvitePrompt(student) {
  return `You are an inviting, hospitable Yeshiva Rebbe / Guidance Counselor.
Compose a warm, natural personal WhatsApp / SMS message to invite this Shana Bet student for a Shabbat meal at my home in Jerusalem.

• Student Name: ${student.name}
• History: ${student.shabbosCount === 0 ? 'Has not yet eaten at our home this year' : 'Has been over ' + student.shabbosCount + ' time(s)'}
• Guidance Notes: ${student.pinnedContext ? 'Focus area: ' + student.pinnedContext : 'General zman relationship building'}

Tone: Warm, low-pressure, welcoming, feeling like a natural personal invitation rather than an institutional check-off.`;
}

