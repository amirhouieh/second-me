import type { Learnings } from "../../types";

export default (profile: Learnings.User) => {
    return `"""
    Here are learnings so far (retrieved from memory):


    LEARNINGS FROM USER:
    <profile_explicit>
    Excplits learnings (what the user has explicitly stated):
    ${profile.profile.explicit}
    </profile_explicit>

    <profile_implicit>
    Implicit learnings (what the user has implicitly stated):
    ${profile.profile.implicit}
    </profile_implicit>


    LEARNINGS FOR ASSISTANT(YOU):
    <tone>
    Your tone to adopt:
    ${profile.assistant.tone}
    </tone>

    <style>
    Your style to adopt:
    ${profile.assistant.style}
    </style>

    <frustration_triggers>
    Your frustration triggers to avoid:
    ${profile.assistant.frustration_triggers.join(', ')}
    </frustration_triggers>

    <engagement_patterns>
    Your engagement patterns to keep the user engaged:
    ${profile.assistant.engagement_patterns}
    </engagement_patterns>
    """
    `
}