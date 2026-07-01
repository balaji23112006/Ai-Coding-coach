import { ProfileAgentState } from '../state.js';
import { ANALYSIS_CONFIG } from './analysis.js';

/**
 * Decision: Check bootstrap status.
 * If status is BOOTSTRAP, go straight to saveProfileNode (and then end).
 * Otherwise, go to checkHistorySufficient.
 */
export function routeBootstrapStatus(state: typeof ProfileAgentState.State): string {
  if (state.profileStatus === 'BOOTSTRAP') {
    return 'saveProfileNode';
  }
  return 'routeHistorySufficient';
}

/**
 * D1: History sufficient?
 * Checks if the user's baseline history (profile & submissions) is populated.
 * If yes, route to checkTopicStats (D2).
 * If no, check if we can run another tool to fetch it (D1A).
 */
export function routeHistorySufficient(state: typeof ProfileAgentState.State): string {
  const profileSolved = state.history?.profile?.solvedCount;
  const submissionsLength = state.history?.submissions?.length;
  const totalSolved = Math.max(profileSolved ?? 0, submissionsLength ?? 0);
  const hasHistory = state.history !== null && totalSolved >= ANALYSIS_CONFIG.MIN_SUBMISSIONS;

  if (hasHistory) {
    return 'checkTopicStats';
  }
  return 'routeHistoryAlternative';
}

/**
 * D1A: Another tool available (alternative for history)?
 * If getUserHistory tool hasn't been tried yet, route to run it.
 * Otherwise, proceed to checkTopicStats (D2) as fallback.
 */
export function routeHistoryAlternative(state: typeof ProfileAgentState.State): string {
  if (!state.toolsTried.includes('getUserHistory')) {
    return 'getUserHistoryNode';
  }
  return 'checkTopicStats';
}

/**
 * D2: Topic stats available?
 * Checks if the topic-wise performance stats are populated.
 * If yes, route to checkSubmissions (D3).
 * If no, check if we can run another tool to fetch it (D2A).
 */
export function routeTopicStatsAvailable(state: typeof ProfileAgentState.State): string {
  const hasTopicStats = Object.keys(state.topicStats).length >= ANALYSIS_CONFIG.MIN_TOPICS;
  if (hasTopicStats) {
    return 'checkSubmissions';
  }
  return 'routeTopicStatsAlternative';
}

/**
 * D2A: Another tool available (alternative for topic stats)?
 * If getTopicStats tool hasn't been tried yet, route to run it.
 * Otherwise, proceed to checkSubmissions (D3) as fallback.
 */
export function routeTopicStatsAlternative(state: typeof ProfileAgentState.State): string {
  if (!state.toolsTried.includes('getTopicStats')) {
    return 'getTopicStatsNode';
  }
  return 'checkSubmissions';
}

/**
 * D3: Submissions meaningful?
 * Checks if we have fetched a meaningful list of submissions.
 * If yes, route to checkRecentActivity (D4).
 * If no, check if we can run another tool to fetch them (D3A).
 */
export function routeSubmissionsMeaningful(state: typeof ProfileAgentState.State): string {
  const hasSubmissions =
    state.submissions && state.submissions.length >= ANALYSIS_CONFIG.MIN_SUBMISSIONS;
  if (hasSubmissions) {
    return 'checkRecentActivity';
  }
  return 'routeSubmissionsAlternative';
}

/**
 * D3A: Another tool available (alternative for submissions)?
 * If getSubmissions tool hasn't been tried yet, route to run it.
 * Otherwise, proceed to checkRecentActivity (D4) as fallback.
 */
export function routeSubmissionsAlternative(state: typeof ProfileAgentState.State): string {
  if (!state.toolsTried.includes('getSubmissions')) {
    return 'getSubmissionsNode';
  }
  return 'checkRecentActivity';
}

/**
 * D4: Recent activity available?
 * Checks if user's recent activity stream has been loaded.
 * If yes, route to checkProfileChange (D5).
 * If no, check if we can run another tool to fetch it (D4A).
 */
export function routeRecentActivityAvailable(state: typeof ProfileAgentState.State): string {
  const recentSolved = state.recentActivity
    ? state.recentActivity.filter((a) => a.type === 'SUBMISSION' && a.meta.status === 'ACCEPTED')
        .length
    : 0;
  const hasRecentActivity = recentSolved >= ANALYSIS_CONFIG.MIN_RECENT_ACTIVITY;
  if (hasRecentActivity) {
    return 'checkProfileChange';
  }
  return 'routeRecentActivityAlternative';
}

/**
 * D4A: Another tool available (alternative for recent activity)?
 * If getRecentActivity tool hasn't been tried yet, route to run it.
 * Otherwise, proceed to checkProfileChange (D5) as fallback.
 */
export function routeRecentActivityAlternative(state: typeof ProfileAgentState.State): string {
  if (!state.toolsTried.includes('getRecentActivity')) {
    return 'getRecentActivityNode';
  }
  return 'checkProfileChange';
}

/**
 * D5: Profile changed significantly?
 * Compares current derived state (e.g. mastery scores or level)
 * with the baseline history profile state.
 * If there is a significant change, route to save the profile.
 * Otherwise, route to END.
 */
export function routeProfileChangedSignificantly(state: typeof ProfileAgentState.State): string {
  if (!state.history || !state.history.profile) {
    // New profile creation scenario -> save profile
    return 'saveProfileNode';
  }

  const baseline = state.history.profile as any;

  // Check overall level change
  const levelChanged = state.level !== (baseline.experienceLevel || 'Beginner');
  if (levelChanged) {
    return 'saveProfileNode';
  }

  // Check solved counts change
  const solvedCountChanged =
    baseline.solvedCount !== state.solvedCount ||
    baseline.easySolved !== state.easySolved ||
    baseline.mediumSolved !== state.mediumSolved ||
    baseline.hardSolved !== state.hardSolved;
  if (solvedCountChanged) {
    return 'saveProfileNode';
  }

  // Check recommended focus or difficulty change
  const recommendationsChanged =
    (state.recommendedFocus || 'None') !== (baseline.recommendedFocus || 'None') ||
    (state.recommendedDifficulty || 'Easy') !== (baseline.recommendedDifficulty || 'Easy');
  if (recommendationsChanged) {
    return 'saveProfileNode';
  }

  // Check if mastery changes significantly (e.g. score diff >= 5)
  const baselineSkills = baseline.skills || {};
  for (const [topic, score] of Object.entries(state.mastery)) {
    const baselineScore = baselineSkills[topic] ?? 0;
    if (Math.abs(score - baselineScore) >= 5) {
      return 'saveProfileNode';
    }
  }

  return 'end';
}
