import { memPromptUserProfile } from ".";
import type { Learnings } from "../../types";


export default ({ current, recent }: {
    current: Learnings.User;
    recent: string;
  }) => {

    const currentExplicit = (current.profile?.explicit || '').trim();
    const currentImplicit = (current.profile?.implicit || '').trim();
    const haveWeLearned = currentExplicit !== '' || currentImplicit !== '';

    return `You are an agent as part of a conversational memory layer. You are the USER Profile Updater.

TASK - BUILD AND UPDATE USER PROFILE
Produce ONE JSON object with two parts:
1) profile: content-layer summaries
   - explicit: short bullet lines of user-stated facts/preferences/goals (joined by \n)
   - implicit: short bullet lines of cautiously inferred tendencies (joined by \n); must not restate explicit
2) assistant: interaction policy
   - tone: short string (e.g., "childlike", "playful", "professional", "casual")
   - style: short string (e.g., "direct", "detailed", "casual", "playful")
   - frustration_triggers: array of short strings (≤5)
   - engagement_patterns: short string (what keeps the user engaged)
3) flags: { explicitChanged: boolean, implicitChanged: boolean, assistantChanged: boolean }

IMPORTANT RULES
- explicit (profile): ONLY facts literally stated by the user in recent dialog; concise bullet lines.
- implicit (profile): Carefully inferred patterns; DO NOT restate explicit bullets.
- For assistant fields:
  - If the user explicitly requested tone/style, set it directly.
  - Otherwise infer from dialog; keep strings short and concrete.
  - Keep frustration_triggers as a small, deduped list (≤5).
  - Keep engagement_patterns as a concise phrase.
- Set flags.explicitChanged=true iff you added/changed profile.explicit vs CURRENT.
- Set flags.implicitChanged=true iff you added/changed profile.implicit vs CURRENT.
- Set flags.assistantChanged=true iff any assistant field changed vs CURRENT.

${haveWeLearned ? `CURRENT PROFILE (for reference)
EXPLICIT (current):
${currentExplicit.trim() ? currentExplicit : 'We have not leanred anything explicitly from the user'}

IMPLICIT (current):
${currentImplicit.trim() ? currentImplicit : 'We have not leanred anything implicitly from the user'}
` : 'No current profile is available; initialize thoughtfully.'}

RECENT DIALOG (user turns with assistant context if needed):
${recent}

Return ONLY the JSON, with no extra commentary.`;
}