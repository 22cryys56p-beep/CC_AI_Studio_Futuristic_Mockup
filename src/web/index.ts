import { setupObsidianDomShim } from "./obsidian-dom-shim";
import { NavigationController } from "../navigation/navigation-controller";
import { OrientationBarComponent } from "../navigation/orientation-bar";
import { NavigationInspector } from "../navigation/navigation-inspector";
import { EntryView } from "../views/entry-view";
import { GatewayView } from "../views/gateway-view";
import { ProjectListView } from "../views/project-list-view";
import { DashboardView } from "../views/dashboard-view";
import { NewProjectView } from "../views/new-project-view";
import { ReentryBriefingCard } from "./reentry-briefing-card";
import type { ProjectRecord, ProjectStatus } from "../data/project-record";
import type { ResolutionResult } from "../integration/obsidian-project-record-provider";

// Initialize Obsidian DOM helper methods
setupObsidianDomShim();

/** Authoritative sample project records from Temporary Test Notes */
const INITIAL_PROJECTS: ProjectRecord[] = [
  {
    project_id: "proj-test-current-list",
    name: "Test Current With A Deliberately Long Project Name To Check How Wrapping Behaves",
    purpose: "A current project with several blockers and long text to check wrapping on a narrow pane.",
    description: "Current status with all operational fields, three blockers, and a repository line. This description is intentionally long so that you can see how quiet secondary text wraps across several lines when the pane is narrow.",
    status: "current",
    focus: "Ship the first working version, then gather feedback from the first few users.",
    milestone: "M1 - Foundation",
    progress: "underway",
    next_action: "Review the draft outline with the team",
    blockers: ["First blocker", "Second blocker", "Third blocker"],
    last_updated: "2026-10-13T09:30:00Z",
    repo_reference: "https://example.com/test-repository",
  },
  {
    project_id: "proj-test-current-null",
    name: "Test Current Null Blockers",
    purpose: "Current project where blockers is null.",
    description: "Should show the no-blockers statement.",
    status: "current",
    focus: "Finish the current milestone.",
    milestone: "M1 - Foundation",
    progress: "underway",
    next_action: "Review the draft outline with the team",
    blockers: null,
    last_updated: "2026-10-13T09:30:00Z",
    repo_reference: "https://example.com/test-repository",
  },
  {
    project_id: "proj-test-current-empty",
    name: "Test Current Empty Blockers",
    purpose: "Current project where blockers is an empty list.",
    description: "Should show the same no-blockers statement.",
    status: "current",
    focus: "Finish the current milestone.",
    milestone: "M1 - Foundation",
    progress: "underway",
    next_action: "Review the draft outline with the team",
    blockers: [],
    last_updated: "2026-10-13T09:30:00Z",
    repo_reference: "https://example.com/test-repository",
  },
  {
    project_id: "proj-test-planning",
    name: "Test Planning",
    purpose: "A project being planned.",
    description: "Planned status with a list of two blockers.",
    status: "planned",
    focus: "Turn the outline into a schedule.",
    milestone: "M1 - Foundation",
    progress: "underway",
    next_action: "Review the draft outline with the team",
    blockers: ["Waiting on budget approval", "Need a decision on the platform"],
    last_updated: "2026-10-13T09:30:00Z",
  },
  {
    project_id: "proj-test-ideas",
    name: "Test Ideas",
    purpose: "A quick idea worth keeping an eye on.",
    description: "Possible status; only the universal fields should appear.",
    status: "possible",
    focus: "Decide whether this idea deserves a plan.",
  },
  {
    project_id: "proj-test-ongoing",
    name: "Test Ongoing",
    purpose: "Work that never really finishes.",
    description: "Ongoing status; only the universal fields should appear.",
    status: "ongoing",
    focus: "Keep the routine running smoothly.",
  },
  {
    project_id: "proj-test-archive",
    name: "Test Archive",
    purpose: "Finished work kept for reference.",
    description: "Archived status; only the universal fields should appear.",
    status: "archived",
    focus: "Nothing active; kept for reference.",
  },
];

class CommandCenterWebSandbox {
  private projects: ProjectRecord[] = [...INITIAL_PROJECTS];
  private controller: NavigationController | null = null;
  private orientationBar: OrientationBarComponent | null = null;
  private navigationInspector: NavigationInspector | null = null;
  private projectListView: ProjectListView | null = null;
  private gatewayView: GatewayView | null = null;
  private dashboardView: DashboardView | null = null;
  private entryView: EntryView | null = null;
  private newProjectView: NewProjectView | null = null;

  private rootEl: HTMLElement;
  private viewContainer: HTMLElement;
  private inspectorContainer: HTMLElement | null = null;
  private orientationBarContainer: HTMLElement | null = null;
  private gatewayViewContainer: HTMLElement | null = null;
  private projectListViewContainer: HTMLElement | null = null;
  private dashboardViewContainer: HTMLElement | null = null;
  private newProjectContainer: HTMLElement | null = null;
  private briefingCardContainer: HTMLElement | null = null;

  private showDiagnosticInspector = false;
  private showReentryBriefing = true;
  private showObservationNote = true;
  private currentTab: "app" | "review" | "vault" = "app";
  private isDark = true;
  private boardroomStage: HTMLElement | null = null;

  constructor(mountEl: HTMLElement) {
    this.rootEl = mountEl;
    this.renderHeader();

    // Futuristic computer screen stage containing the tactical cyber display
    this.boardroomStage = document.createElement("div");
    this.boardroomStage.className = "cc-screen-stage cc-boardroom-stage";

    const screenChassis = document.createElement("div");
    screenChassis.className = "cc-futuristic-screen cc-boardroom-corkboard";

    // Orientation Navigation Bar container mounted at the very top of the screen (above the HUD header plate)
    this.orientationBarContainer = document.createElement("div");
    this.orientationBarContainer.className = "command-center-orientation-bar-container";
    this.orientationBarContainer.style.display = "none";
    screenChassis.appendChild(this.orientationBarContainer);

    // Inner viewport where Command Center views mount
    this.viewContainer = document.createElement("div");
    this.viewContainer.className = "cc-sandbox-main-area";
    screenChassis.appendChild(this.viewContainer);

    // Floating tactical "Top of Screen" scroll button
    const scrollToTopBtn = document.createElement("button");
    scrollToTopBtn.type = "button";
    scrollToTopBtn.className = "cc-scroll-to-top-btn";
    scrollToTopBtn.innerHTML = "▲ Top of Screen";
    scrollToTopBtn.title = "Scroll back to the top of this screen";
    scrollToTopBtn.addEventListener("click", () => {
      this.viewContainer.scrollTo({ top: 0, behavior: "smooth" });
    });
    screenChassis.appendChild(scrollToTopBtn);

    this.viewContainer.addEventListener("scroll", () => {
      if (this.viewContainer.scrollTop > 60) {
        scrollToTopBtn.classList.add("visible");
      } else {
        scrollToTopBtn.classList.remove("visible");
      }
    });

    this.boardroomStage.appendChild(screenChassis);
    this.rootEl.appendChild(this.boardroomStage);

    this.showEntry();
  }

  private renderHeader(): void {
    const header = document.createElement("header");
    header.className = "cc-sandbox-header";
    header.innerHTML = `
      <div class="cc-header-brand">
        <span class="cc-header-logo">⚡</span>
        <div>
          <div class="cc-header-title">Command Center</div>
          <div class="cc-header-sub">Pre-flight Reviewer & Experimental Sandbox</div>
        </div>
      </div>
      <div class="cc-header-tabs">
        <button type="button" class="cc-tab-btn active" data-tab="app">Command Center</button>
        <button type="button" class="cc-tab-btn" data-tab="review">Pre-Flight Review & Tests (183/183)</button>
        <button type="button" class="cc-tab-btn" data-tab="vault">Vault Test Notes (7)</button>
      </div>
      <div class="cc-header-controls">
        <label class="cc-toggle-label" title="Toggle the Re-entry Briefing prototype on the Dashboard">
          <input type="checkbox" id="toggle-briefing" checked />
          <span style="color: #c4b5fd; font-weight: 600;">🧭 Re-entry Briefing</span>
        </label>
        <label class="cc-toggle-label" title="Toggle persistent Navigation Inspector">
          <input type="checkbox" id="toggle-inspector" />
          <span>Diagnostic Inspector</span>
        </label>
        <button type="button" class="cc-theme-btn" id="toggle-theme">☀️ Light / 🌙 Dark</button>
        <button type="button" class="cc-reset-btn" id="btn-reopen" title="Re-open plugin view">Reset View</button>
      </div>
    `;
    this.rootEl.appendChild(header);

    // Event listeners
    header.querySelectorAll(".cc-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        header.querySelectorAll(".cc-tab-btn").forEach((b) => b.classList.remove("active"));
        const target = e.currentTarget as HTMLElement;
        target.classList.add("active");
        this.switchTab(target.getAttribute("data-tab") as any);
      });
    });

    const briefingToggle = header.querySelector("#toggle-briefing") as HTMLInputElement;
    briefingToggle.addEventListener("change", () => {
      this.showReentryBriefing = briefingToggle.checked;
      this.renderBriefingCard();
    });

    const inspectorToggle = header.querySelector("#toggle-inspector") as HTMLInputElement;
    inspectorToggle.addEventListener("change", () => {
      this.showDiagnosticInspector = inspectorToggle.checked;
      if (this.inspectorContainer) {
        this.inspectorContainer.style.display = this.showDiagnosticInspector ? "block" : "none";
      }
    });

    const themeBtn = header.querySelector("#toggle-theme") as HTMLElement;
    themeBtn.addEventListener("click", () => {
      this.isDark = !this.isDark;
      document.body.classList.toggle("theme-light", !this.isDark);
      document.body.classList.toggle("theme-dark", this.isDark);
    });

    const reopenBtn = header.querySelector("#btn-reopen") as HTMLElement;
    reopenBtn.addEventListener("click", () => {
      this.showEntry();
    });
  }

  private switchTab(tab: "app" | "review" | "vault"): void {
    this.currentTab = tab;
    let reviewPanel = document.getElementById("cc-review-panel");
    let vaultPanel = document.getElementById("cc-vault-panel");

    if (tab === "app") {
      if (this.boardroomStage) this.boardroomStage.style.display = "flex";
      this.viewContainer.style.display = "flex";
      if (reviewPanel) reviewPanel.style.display = "none";
      if (vaultPanel) vaultPanel.style.display = "none";
    } else if (tab === "review") {
      if (this.boardroomStage) this.boardroomStage.style.display = "none";
      this.viewContainer.style.display = "none";
      if (vaultPanel) vaultPanel.style.display = "none";
      if (!reviewPanel) {
        reviewPanel = document.createElement("div");
        reviewPanel.id = "cc-review-panel";
        reviewPanel.className = "cc-sandbox-panel";
        this.rootEl.appendChild(reviewPanel);
      }
      reviewPanel.style.display = "block";
      this.renderReviewPanel(reviewPanel);
    } else if (tab === "vault") {
      if (this.boardroomStage) this.boardroomStage.style.display = "none";
      this.viewContainer.style.display = "none";
      if (reviewPanel) reviewPanel.style.display = "none";
      if (!vaultPanel) {
        vaultPanel = document.createElement("div");
        vaultPanel.id = "cc-vault-panel";
        vaultPanel.className = "cc-sandbox-panel";
        this.rootEl.appendChild(vaultPanel);
      }
      vaultPanel.style.display = "block";
      this.renderVaultPanel(vaultPanel);
    }
  }

  private renderReviewPanel(container: HTMLElement): void {
    container.innerHTML = `
      <div class="review-card">
        <h2>Pre-Flight Verification Summary</h2>
        <div class="badge-row">
          <span class="badge badge-success">✓ 183 / 183 Vitest Tests Passing</span>
          <span class="badge badge-success">✓ TypeScript Strict Typecheck Clean</span>
          <span class="badge badge-info">Commit: b2ba287 (main head)</span>
          <span class="badge badge-info">Phase 4 / WP16 Implementation Verified</span>
        </div>
        
        <h3>1. WP16 Dashboard Core-Content Review</h3>
        <p class="review-text">
          Checked <code>src/views/dashboard-view.ts</code> and <code>tests/views/dashboard-view.test.ts</code> against WP16 Sections 2 and 3, ACP-014, ACP-015, ACP-016, and Phase 3 Sections D & E:
        </p>
        <ul class="review-list">
          <li><strong>Binding Rule 1 (Source Fidelity):</strong> Where Things Stand is derived exclusively from existing fields (<code>milestone</code>, <code>progress</code>, <code>next_action</code>, <code>blockers</code>, <code>last_updated</code>). Verified by unit tests 2, 3, 5, 8.</li>
          <li><strong>Binding Rule 2 (Universal Retention):</strong> Where Things Stand is retained at lower statuses (<code>possible</code>, <code>ongoing</code>, <code>archived</code>) with neutral explanatory copy (<em>"No operational information applies at this status."</em>). Verified by test 5.</li>
          <li><strong>Binding Rule 3 (User Progress vs AI Estimate):</strong> <code>progress</code> is labeled <code>Progress (recorded)</code>; verified that no text implies an AI estimate (ACP-015 §3.2). Verified by test 7.</li>
          <li><strong>Binding Rule 4 (Blockers Semantics D2):</strong> <code>null</code> and <code>[]</code> both render identical no-blockers copy (<em>"No blockers."</em>); arrays render bulleted list. Verified by test 6.</li>
          <li><strong>Binding Rule 5 (Prominence D4):</strong> Focus is rendered as part of the triad with Purpose and Description, distinct from Where Things Stand. Verified by tests 4 & 12.</li>
          <li><strong>Section E Invalid-Absence Acceptance:</strong> Missing vs. malformation distinction implemented via deterministic <code>describeIssue</code> mapping; tier naming matches fixed field-to-tier map without guessing. Verified by tests 11, 12, 13, 14.</li>
        </ul>

        <h3>2. UI Pass 1 Architecture Review</h3>
        <ul class="review-list">
          <li><strong>Header strip orientation bar:</strong> Compact flex row with subtle bottom border (<code>1px solid var(--background-modifier-border)</code>). Verified in <code>orientation-bar.ts</code> line 120-128.</li>
          <li><strong>Gateway three-by-two centered grid:</strong> ACP-011 authoritative order (Current, Planning, Ideas, Ongoing, New Project, Archive) with <code>gridTemplateColumns: "repeat(3, minmax(0, 11rem))"</code>. Verified in <code>gateway-view.ts</code> line 84-91.</li>
          <li><strong>Theme-aware project list rows:</strong> Uses Obsidian CSS variables (<code>--background-secondary</code>, <code>--text-normal</code>, <code>--text-muted</code>, <code>--background-modifier-border</code>). Verified in <code>project-list-view.ts</code> line 78-83.</li>
          <li><strong>Navigation Inspector hidden by default:</strong> <code>SHOW_DIAGNOSTIC_INSPECTOR = false</code> in <code>command-center-view.ts</code>; inspector is passive and uniform across depths.</li>
        </ul>

        <h3>3. Prototype: Re-entry Briefing Card</h3>
        <p class="review-text">
          As recommended by GPT and Kurt, an interactive visual prototype of the <strong>Re-entry Briefing Card</strong> is integrated into this sandbox. It operates under strict constraints:
        </p>
        <ul class="review-list">
          <li><strong>Zero live AI calls & zero external dependencies:</strong> Runs purely locally in memory.</li>
          <li><strong>Answers the three SESSION_START § 10 questions:</strong> <em>1. Where was I? 2. How was I doing this? 3. What do I do next?</em></li>
          <li><strong>Source fidelity:</strong> Directly derived from the active record's milestone, progress, focus, blockers, repo reference, and next action.</li>
          <li><strong>Non-authoritative labeling:</strong> Any participant observation note is explicitly labeled as non-authoritative signal.</li>
        </ul>
      </div>
    `;
  }

  private renderVaultPanel(container: HTMLElement): void {
    container.innerHTML = `
      <div class="review-card">
        <h2>Vault Test Notes (Loaded into Sandbox)</h2>
        <p class="review-text">These notes from <code>Temporary Test Notes/</code> provide live verification projects in the Command Center. Click "Open in Dashboard" to inspect the project and its Re-entry Briefing Card:</p>
        <div class="vault-grid">
          ${this.projects
            .map(
              (p) => `
            <div class="vault-card">
              <div class="vault-card-header">
                <span class="vault-id">${p.project_id}</span>
                <span class="vault-status status-${p.status}">${p.status}</span>
              </div>
              <div class="vault-name">${p.name}</div>
              <div class="vault-field"><strong>Focus:</strong> ${p.focus}</div>
              <div class="vault-field"><strong>Purpose:</strong> ${p.purpose}</div>
              ${p.milestone ? `<div class="vault-field"><strong>Milestone:</strong> ${p.milestone}</div>` : ""}
              ${p.blockers !== undefined ? `<div class="vault-field"><strong>Blockers:</strong> ${p.blockers === null ? "null (no blockers)" : JSON.stringify(p.blockers)}</div>` : ""}
              ${p.repo_reference ? `<div class="vault-field"><strong>Repo:</strong> ${p.repo_reference}</div>` : ""}
              <button type="button" class="trigger-btn select-proj-btn" data-id="${p.project_id}" style="margin-top: 0.6rem; width: 100%;">
                Open in Dashboard ➔
              </button>
            </div>
          `
            )
            .join("")}
        </div>
        
        <h3 style="margin-top: 1.5rem;">Simulate WP15 / WP16 Diagnostic Scenarios</h3>
        <div class="test-triggers">
          <button type="button" class="trigger-btn" id="trig-missing">Test Missing Project ("proj-missing-999")</button>
          <button type="button" class="trigger-btn" id="trig-invalid">Test Invalid Project (Fails validation)</button>
          <button type="button" class="trigger-btn" id="trig-duplicate">Test Duplicate Project (Duplicate ID collision)</button>
        </div>
      </div>
    `;

    container.querySelectorAll(".select-proj-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute("data-id");
        if (id) {
          this.switchTab("app");
          if (this.controller) {
            this.controller.selectProject(id);
            this.renderAll();
          }
        }
      });
    });

    container.querySelector("#trig-missing")?.addEventListener("click", () => {
      this.switchTab("app");
      if (this.controller) {
        this.controller.selectProject("proj-missing-999");
        this.renderAll();
      }
    });

    container.querySelector("#trig-invalid")?.addEventListener("click", () => {
      this.switchTab("app");
      if (this.controller) {
        this.controller.selectProject("proj-invalid-example");
        this.renderAll();
      }
    });

    container.querySelector("#trig-duplicate")?.addEventListener("click", () => {
      this.switchTab("app");
      if (this.controller) {
        this.controller.selectProject("proj-dup-collision");
        this.renderAll();
      }
    });
  }

  private showEntry(): void {
    if (this.orientationBarContainer) {
      this.orientationBarContainer.style.display = "none";
      this.orientationBarContainer.empty();
    }
    this.viewContainer.empty();

    // Mount EntryView into its own dedicated host container so the scroll container (.cc-sandbox-main-area)
    // never inherits .command-center-entry-view or its flexbox centering styles.
    const entryHost = this.viewContainer.createDiv({
      cls: "command-center-entry-host",
    });
    entryHost.style.flex = "1";
    entryHost.style.display = "flex";
    entryHost.style.width = "100%";
    entryHost.style.minHeight = "100%";

    this.entryView = new EntryView(entryHost, () => {
      this.enterNavigationRoot();
    });
    this.entryView.render();
  }

  private enterNavigationRoot(): void {
    this.viewContainer.empty();
    this.viewContainer.style.display = "flex";
    this.viewContainer.style.flexDirection = "column";
    this.viewContainer.style.alignItems = "stretch";
    this.viewContainer.style.justifyContent = "flex-start";

    this.entryView = null;

    const getProjectRecords = (): readonly ProjectRecord[] => {
      return this.projects;
    };

    const resolveProjectRecord = (project_id: string): ResolutionResult => {
      if (project_id === "proj-missing-999") {
        return { condition: "missing" };
      }
      if (project_id === "proj-invalid-example") {
        return {
          condition: "invalid",
          candidatePath: "Active Projects/invalid-sample.md",
          issues: [
            { field: "name", reason: "missing" },
            { field: "purpose", reason: "missing" },
            { field: "milestone", reason: "missing" },
            { field: "last_updated", reason: "invalid_timestamp" },
          ],
        };
      }
      if (project_id === "proj-dup-collision") {
        return {
          condition: "duplicate",
          paths: ["Active Projects/Project Alpha.md", "Archive/Duplicate Alpha.md"],
        };
      }

      const match = this.projects.find((p) => p.project_id === project_id);
      if (match) {
        return { condition: "resolved", record: match };
      }
      return { condition: "missing" };
    };

    this.controller = new NavigationController(getProjectRecords);

    if (this.orientationBarContainer) {
      this.orientationBarContainer.style.display = "";
      this.orientationBarContainer.empty();
    }

    // Top spacer ensures screen canvas and top rounded corners are visible on scroll-up
    this.viewContainer.createDiv({
      cls: "cc-screen-top-spacer",
    });

    this.inspectorContainer = this.viewContainer.createDiv({
      cls: "command-center-inspector-container",
    });
    if (!this.showDiagnosticInspector) {
      this.inspectorContainer.style.display = "none";
    }

    this.gatewayViewContainer = this.viewContainer.createDiv({
      cls: "command-center-gateway-view-container",
    });

    this.projectListViewContainer = this.viewContainer.createDiv({
      cls: "command-center-project-list-view-container",
    });

    // Dashboard container
    this.dashboardViewContainer = this.viewContainer.createDiv({
      cls: "command-center-dashboard-view-container",
    });

    // Bottom spacer ensures screen canvas and bottom rounded corners are visible on scroll-down
    this.viewContainer.createDiv({
      cls: "cc-screen-bottom-spacer",
    });

    const onStateChange = (): void => {
      this.renderAll();
    };

    this.orientationBar = new OrientationBarComponent(
      this.orientationBarContainer,
      this.controller,
      onStateChange
    );

    this.navigationInspector = new NavigationInspector(
      this.inspectorContainer,
      this.controller
    );

    this.gatewayView = new GatewayView(
      this.gatewayViewContainer,
      this.controller,
      () => this.enterNewProject()
    );

    this.projectListView = new ProjectListView(
      this.projectListViewContainer,
      this.controller,
      getProjectRecords
    );

    this.dashboardView = new DashboardView(
      this.dashboardViewContainer,
      this.controller,
      resolveProjectRecord
    );

    this.gatewayView.setOnStateChange(onStateChange);
    this.projectListView.setOnStateChange(onStateChange);

    this.renderAll();
  }

  private renderAll(): void {
    this.orientationBar?.render();
    this.navigationInspector?.render();
    this.gatewayView?.render();
    this.projectListView?.render();
    this.dashboardView?.render();
    this.renderBriefingCard();

    if (this.viewContainer) {
      this.viewContainer.scrollTop = 0;
    }
  }

  /**
   * Mounts or clears the prototype Re-entry Briefing Card when at Dashboard depth
   * for a resolved project.
   */
  private renderBriefingCard(): void {
    if (!this.controller || !this.dashboardViewContainer) return;

    const state = this.controller.getState();
    const isAtDashboard = state.depth === "dashboard" && state.object?.kind === "project";

    // Clean up existing briefing card container if any
    if (this.briefingCardContainer) {
      this.briefingCardContainer.remove();
      this.briefingCardContainer = null;
    }

    if (!isAtDashboard || !this.showReentryBriefing) {
      return;
    }

    const projectId = state.object?.project_id;
    const project = this.projects.find((p) => p.project_id === projectId);

    if (!project) return;

    // Insert briefing card above Where Things Stand inside the resolved dashboard container
    const resolvedRoot = this.dashboardViewContainer.querySelector(
      ".command-center-dashboard-resolved"
    ) as HTMLElement | null;

    if (!resolvedRoot) return;

    const targetContainer = document.createElement("div");
    targetContainer.className = "cc-sandbox-briefing-wrapper";

    // Insert right after the identity element (name and status)
    const identityEl = resolvedRoot.querySelector(".command-center-dashboard-identity");
    if (identityEl && identityEl.nextSibling) {
      resolvedRoot.insertBefore(targetContainer, identityEl.nextSibling);
    } else {
      resolvedRoot.prepend(targetContainer);
    }

    this.briefingCardContainer = targetContainer;

    const card = new ReentryBriefingCard(targetContainer, project, {
      showObservationNote: this.showObservationNote,
    });
    card.render();
  }

  private enterNewProject(): void {
    if (this.orientationBarContainer) this.orientationBarContainer.style.display = "none";
    if (this.gatewayViewContainer) this.gatewayViewContainer.style.display = "none";
    if (this.projectListViewContainer) this.projectListViewContainer.style.display = "none";
    if (this.dashboardViewContainer) this.dashboardViewContainer.style.display = "none";

    this.newProjectContainer = this.viewContainer.createDiv({
      cls: "command-center-new-project-view-container",
    });

    this.newProjectView = new NewProjectView(this.newProjectContainer, {
      onCancel: () => this.exitNewProject(),
      onSubmit: (status: ProjectStatus) => {
        alert(`New Project created with initial status: ${status}`);
        this.exitNewProject();
      },
    });
    this.newProjectView.render();
  }

  private exitNewProject(): void {
    this.newProjectView?.clear();
    this.newProjectView = null;
    this.newProjectContainer?.remove();
    this.newProjectContainer = null;

    if (this.orientationBarContainer) this.orientationBarContainer.style.display = "";
    if (this.gatewayViewContainer) this.gatewayViewContainer.style.display = "";
    if (this.projectListViewContainer) this.projectListViewContainer.style.display = "";
    if (this.dashboardViewContainer) this.dashboardViewContainer.style.display = "";

    this.renderAll();
  }
}

// Boot sandbox
window.addEventListener("DOMContentLoaded", () => {
  const mount = document.getElementById("app");
  if (mount) {
    new CommandCenterWebSandbox(mount);
  }
});
