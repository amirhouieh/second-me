import type { Learnings } from "../../types";

export default (profile: Learnings.User) => {
    if (!profile || (!profile.profile?.explicit && !profile.assistant?.tone)) {
        return "";
    }

    const explicit = profile.profile?.explicit || '';
    const implicit = profile.profile?.implicit || '';
    const tone = profile.assistant?.tone || '';
    const style = profile.assistant?.style || '';
    const frustration_triggers = profile.assistant?.frustration_triggers?.join(', ') || '';
    const engagement_patterns = profile.assistant?.engagement_patterns || '';


    const userProfile = [
      explicit ? `<explicit>\n${explicit}\n</explicit>` : "",
      implicit ? `<implicit>\n${implicit}\n</implicit>` : ""
    ].filter(Boolean).join("\n");

    const assistant = [
      tone ? `<tone>\n${tone}\n</tone>` : "",
      style ? `<style>\n${style}\n</style>` : "",
      frustration_triggers ? `<frustration_triggers>\n${frustration_triggers}\n</frustration_triggers>` : "",
      engagement_patterns ? `<engagement_patterns>\n${engagement_patterns}\n</engagement_patterns>` : ""
    ].filter(Boolean).join("\n");

    if(!userProfile.trim().length && !assistant.trim().length) return "";

    return `
${userProfile.trim().length > 0 ? `<user_profile>\n${userProfile}\n</user_profile>` : ""}
${assistant.trim().length > 0 ? `<assistant>\n${assistant}\n</assistant>` : ""}
`;
}