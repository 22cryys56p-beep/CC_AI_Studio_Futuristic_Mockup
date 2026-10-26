/**
 * Re-entry Briefing Card — Experimental Sandbox Prototype.
 * 
 * Explores the user experience for Project Re-entry (SESSION_START.md § 10):
 * "Where was I, how was I doing this, and what do I do next?"
 * 
 * Rules for this prototype:
 * 1. Pure visual prototype — no live AI calls, no external SDKs.
 * 2. Source fidelity — derived strictly from existing ProjectRecord fields.
 * 3. Clearly badged as an experimental sandbox prototype.
 * 4. Distinct visual treatment so it is never confused with authoritative record fields.
 * 5. Fails honestly: if operational data doesn't exist (e.g. ongoing, possible),
 *    it displays calm, neutral status context rather than fabricating content.
 */

import type { ProjectRecord } from "../data/project-record";

export interface ReentryBriefingOptions {
  /** Include an experimental, non-authoritative participant observation note */
  showObservationNote?: boolean;
}

export class ReentryBriefingCard {
  private readonly container: HTMLElement;
  private readonly record: ProjectRecord;
  private readonly options: ReentryBriefingOptions;

  constructor(
    container: HTMLElement,
    record: ProjectRecord,
    options: ReentryBriefingOptions = { showObservationNote: true }
  ) {
    this.container = container;
    this.record = record;
    this.options = options;
  }

  render(): HTMLElement {
    const card = this.container.createDiv({
      cls: "command-center-reentry-card",
    });

    card.style.background = "var(--background-secondary-alt, #282828)";
    card.style.border = "1px solid var(--interactive-accent, #7c3aed)";
    card.style.borderRadius = "8px";
    card.style.padding = "1rem 1.25rem";
    card.style.margin = "0.75rem 0 1.25rem 0";
    card.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "0.75rem";

    // Header badge
    const headerRow = card.createDiv({ cls: "reentry-header-row" });
    headerRow.style.display = "flex";
    headerRow.style.justifyContent = "space-between";
    headerRow.style.alignItems = "center";
    headerRow.style.flexWrap = "wrap";
    headerRow.style.gap = "0.5rem";

    const titleGroup = headerRow.createDiv({ cls: "reentry-title-group" });
    titleGroup.style.display = "flex";
    titleGroup.style.alignItems = "center";
    titleGroup.style.gap = "0.5rem";

    const icon = titleGroup.createEl("span", { text: "🧭", cls: "reentry-icon" });
    icon.style.fontSize = "1.1rem";

    const title = titleGroup.createEl("span", {
      text: "Project Re-entry Briefing",
      cls: "reentry-title",
    });
    title.style.fontWeight = "700";
    title.style.fontSize = "0.95rem";
    title.style.color = "var(--text-normal)";

    const badge = headerRow.createEl("span", {
      text: "🧪 Sandbox Prototype (SESSION_START § 10)",
      cls: "reentry-badge",
    });
    badge.style.fontSize = "0.7rem";
    badge.style.padding = "0.15rem 0.5rem";
    badge.style.borderRadius = "4px";
    badge.style.background = "rgba(124, 58, 237, 0.2)";
    badge.style.color = "#c4b5fd";
    badge.style.border = "1px solid rgba(124, 58, 237, 0.4)";
    badge.style.fontFamily = "monospace";

    // Three core re-entry questions
    const grid = card.createDiv({ cls: "reentry-grid" });
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    grid.style.gap = "0.85rem";
    grid.style.marginTop = "0.25rem";

    // 1. Where was I?
    this.renderQuestionSection(
      grid,
      "1. Where was I?",
      this.deriveWhereWasI(),
      "reentry-where"
    );

    // 2. How was I doing this?
    this.renderQuestionSection(
      grid,
      "2. How was I doing this?",
      this.deriveHowWasIDoingThis(),
      "reentry-how"
    );

    // 3. What do I do next?
    this.renderQuestionSection(
      grid,
      "3. What do I do next?",
      this.deriveWhatDoINext(),
      "reentry-next"
    );

    // Optional: Non-authoritative AI Participant Observation note
    if (this.options.showObservationNote) {
      this.renderObservationNote(card);
    }

    return card;
  }

  private renderQuestionSection(
    parent: HTMLElement,
    heading: string,
    content: string,
    cls: string
  ): void {
    const box = parent.createDiv({ cls: `reentry-box ${cls}` });
    box.style.background = "var(--background-secondary, #1f1f1f)";
    box.style.border = "1px solid var(--background-modifier-border, #3a3a3a)";
    box.style.borderRadius = "6px";
    box.style.padding = "0.75rem 0.85rem";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.gap = "0.35rem";

    const label = box.createEl("span", { text: heading, cls: "reentry-box-label" });
    label.style.fontSize = "0.75rem";
    label.style.fontWeight = "600";
    label.style.textTransform = "uppercase";
    label.style.letterSpacing = "0.03em";
    label.style.color = "var(--text-muted, #999)";

    const textEl = box.createEl("div", { text: content, cls: "reentry-box-text" });
    textEl.style.fontSize = "0.88rem";
    textEl.style.lineHeight = "1.45";
    textEl.style.color = "var(--text-normal, #ddd)";
    textEl.style.whiteSpace = "pre-wrap";
  }

  /** Derives "Where was I?" strictly from status, milestone, progress, and last_updated */
  private deriveWhereWasI(): string {
    const r = this.record;
    if (r.status === "planned" || r.status === "current") {
      const milestone = r.milestone || "No milestone stated";
      const progress = r.progress ? `Progress recorded as "${r.progress}"` : "Progress underway";
      const dateStr = r.last_updated ? ` (last updated ${r.last_updated.slice(0, 10)})` : "";
      return `At ${milestone}.\n${progress}${dateStr}.`;
    }
    if (r.status === "ongoing") {
      return "Project is ongoing. Steady-state operational cycle; no active sprint milestone.";
    }
    if (r.status === "possible") {
      return "Exploratory idea stage. Not yet scheduled or formalized into a project plan.";
    }
    if (r.status === "archived") {
      return "Archived for historical reference. No active operational stage.";
    }
    return `Status: ${r.status}.`;
  }

  /** Derives "How was I doing this?" strictly from focus, blockers, repo_reference */
  private deriveHowWasIDoingThis(): string {
    const r = this.record;
    const focusSnippet = r.focus ? `Focus: "${r.focus}"` : "No focus recorded";

    if (r.status === "planned" || r.status === "current") {
      let blockerInfo = "";
      if (r.blockers === null || (Array.isArray(r.blockers) && r.blockers.length === 0)) {
        blockerInfo = "✓ No active blockers.";
      } else if (Array.isArray(r.blockers) && r.blockers.length > 0) {
        blockerInfo = `⚠️ ${r.blockers.length} blocker(s) active:\n• ` + r.blockers.join("\n• ");
      }

      const repoInfo = r.repo_reference ? `\nRepo: ${r.repo_reference}` : "";
      return `${focusSnippet}\n${blockerInfo}${repoInfo}`;
    }

    return `${focusSnippet}\n(Operational blockers do not apply at status: ${r.status})`;
  }

  /** Derives "What do I do next?" strictly from next_action or status intent */
  private deriveWhatDoINext(): string {
    const r = this.record;
    if (r.next_action) {
      return `Action recorded: "${r.next_action}"`;
    }
    if (r.status === "planned") {
      return "Define first milestone deliverables and review plan before advancing to current.";
    }
    if (r.status === "possible") {
      return "Evaluate whether this idea deserves promotion to planned status or should remain in Ideas.";
    }
    if (r.status === "ongoing") {
      return "Maintain regular cadence. Review when operational context changes.";
    }
    if (r.status === "archived") {
      return "No action required. Archived.";
    }
    return "Check project focus and update next action.";
  }

  /** Renders an experimental non-authoritative observation footer */
  private renderObservationNote(parent: HTMLElement): void {
    const note = parent.createDiv({ cls: "reentry-observation-note" });
    note.style.borderTop = "1px dashed var(--background-modifier-border, #3a3a3a)";
    note.style.paddingTop = "0.5rem";
    note.style.fontSize = "0.78rem";
    note.style.color = "var(--text-muted, #888)";
    note.style.display = "flex";
    note.style.alignItems = "baseline";
    note.style.gap = "0.4rem";

    const label = note.createEl("strong", { text: "Participant Signal (Non-Authoritative):" });
    label.style.color = "#a78bfa";

    let suggestion = "";
    if (Array.isArray(this.record.blockers) && this.record.blockers.length > 0) {
      suggestion = `Resolve recorded blocker ("${this.record.blockers[0]}") before proceeding with "${this.record.next_action || 'work'}".`;
    } else if (this.record.next_action) {
      suggestion = `Ready to resume "${this.record.next_action}".`;
    } else if (this.record.status === "possible") {
      suggestion = "Review project purpose to determine feasibility.";
    } else {
      suggestion = "Project state is steady. Ready for re-entry.";
    }

    note.createEl("span", { text: suggestion });
  }
}
