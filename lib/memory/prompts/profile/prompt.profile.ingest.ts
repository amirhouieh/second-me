import type { Learnings } from "../../types";

export default (profile: Learnings.User) => {
    // Return an empty string if there's nothing to show, to save prompt space.
    if (!profile || (!profile.profile?.explicit && !profile.assistant?.tone)) {
        return "";
    }

    return `
<user_profile>
  <explicit>
    ${profile.profile?.explicit || 'No explicit facts learned.'}
  </explicit>
  <implicit>
    ${profile.profile?.implicit || 'No implicit tendencies learned.'}
  </implicit>
</user_profile>

<assistant_instructions>
  <tone>${profile.assistant?.tone || 'default'}</tone>
  <style>${profile.assistant?.style || 'default'}</style>
  <frustration_triggers>
    ${profile.assistant?.frustration_triggers?.join(', ') || 'None specified.'}
  </frustration_triggers>
  <engagement_patterns>
    ${profile.assistant?.engagement_patterns || 'None specified.'}
  </engagement_patterns>
</assistant_instructions>
`;
}