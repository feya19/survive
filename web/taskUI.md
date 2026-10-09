# SURVIVE — Movie Intelligence UI/UX Redesign
## Laravel Workbench, Dynamic Dashboards & Floating AI Assistant

### Your Role

Act as a Senior Product Designer, UX Engineer, and Laravel Frontend Engineer experienced in building modern AI-powered analytics applications.

You are improving the existing **SURVIVE — Movie Intelligence** application.

Your goal is to transform the current interface into a polished, intuitive, responsive **Production Intelligence Workbench**.

**This is a UI/UX refinement, not a new application.**

Inspect the existing Laravel codebase, routes, Blade/Livewire/Inertia components, styling conventions, JavaScript libraries, and FastAPI integration before implementing changes.

Preserve all existing backend functionality.

---

# 1. Product Context

SURVIVE helps movie producers explore revenue predictions and production budget scenarios using specialized Machine Learning tools and AI-assisted analytics.

Existing capabilities include:

- Movie revenue prediction using LightGBM.
- Production budget input in USD.
- Genre selection based on the active model.
- Historical dataset selection.
- AI-generated dashboards.
- Saved dashboards.
- Active model metadata.
- AI Chat powered by FastAPI and OpenRouter.
- Structured ML and analytics tool execution.

The interface should communicate:

**Predict → Explore → Compare → Visualize**

The producer remains responsible for final decisions.

---

# 2. Problems to Fix

Based on the current interface:

1. AI Chat is buried near the bottom of the page.
2. Prediction inputs occupy too much vertical space.
3. Prediction results are not emphasized enough.
4. Historical analytics may appear as raw Markdown inside a large green banner.
5. Active model IDs are visually prominent but not meaningful to producers.
6. Model metadata occupies valuable dashboard space.
7. Empty saved-dashboard panels consume too much area.
8. Dashboard generation looks like a separate form rather than part of an analytics workflow.
9. AI Chat, prediction form, and dashboard generator do not feel like one connected experience.
10. The page requires unnecessary scrolling to access core features.

Solve these through improved layout, information hierarchy, progressive disclosure, and reusable interface components.

Do not solve them by merely reducing font sizes or hiding important information.

---

# 3. Design Direction

Maintain the existing SURVIVE visual identity.

### Colors

- Primary: Deep forest green.
- Accent: Lime or mint green.
- Background: Warm off-white.
- Surface: White.
- Text: Near-black or dark slate.
- Supporting text: Muted neutral gray.
- Error: Accessible red.
- Warning: Accessible amber.

Use semantic colors consistently.

Green should represent primary actions or meaningful positive states, not every informational message.

### Visual Style

Use a modern analytical SaaS aesthetic:

- Clean typography.
- Clear hierarchy.
- Spacious but efficient layout.
- Subtle borders.
- Consistent card radii.
- Minimal shadows.
- Well-aligned form controls.
- Restrained icon usage.
- Accessible contrast.
- Responsive layouts.

Do not redesign SURVIVE as a gaming interface or excessively futuristic AI application.

Prioritize usability over decoration.

---

# 4. Main Application Structure

Organize the interface into three primary user-facing areas:

### A. Movie Workbench

The default landing workspace.

Contains:

- Current movie scenario.
- Revenue prediction form.
- Prediction output.
- Budget scenario comparison.
- Access to historical analytics.
- Entry point for dashboard generation.

### B. Dashboards

Contains:

- Generated dashboard viewer.
- Dashboard templates.
- Saved dashboards.
- Dataset-based analytics visualization.
- Dashboard generation controls.

### C. Floating AI Assistant

Available globally across the Movie Workbench and Dashboards.

Do not keep a large permanent AI Chat card at the bottom of the page.

Preserve existing route structures where possible. Tabs, sections, or separate routes are acceptable depending on the current Laravel architecture.

---

# 5. Floating AI Assistant — Highest Priority

Replace the existing embedded AI Chat with a floating assistant.

## 5.1 Floating Launcher

Place a persistent AI assistant launcher in the bottom-right corner.

Suggested appearance:

- Deep forest-green background.
- Chat or sparkle icon.
- Label: `Ask SURVIVE`.
- Rounded pill or compact floating button.
- Subtle hover elevation.
- Visible keyboard focus indicator.

Position the launcher above fixed footers or other controls.

The launcher must not block essential page actions.

## 5.2 Chat Drawer

Clicking the launcher opens a right-side chat drawer.

Desktop target:

- Width approximately 440–480px, adjustable based on available viewport space.
- Fixed within the viewport.
- Smooth, subtle slide-in animation.
- Independent scrolling inside the message area.
- Persistent message composer at the bottom.
- Visible close/minimize control.
- Proper z-index and focus management.

The drawer may overlay content rather than permanently shrinking the dashboard.

When closed, the user returns to the exact workbench scroll position.

## 5.3 Responsive Behavior

On mobile:

- Use a full-screen or near-full-screen assistant sheet.
- Keep the message composer accessible above the mobile keyboard.
- Respect safe-area insets.
- Maintain usable touch targets.
- Avoid horizontal overflow.

Support Escape to close on desktop, appropriate dialog semantics, and focus restoration.

## 5.4 Chat Header

Show:

- SURVIVE AI Assistant.
- Current movie domain.
- Current data context.
- Clear conversation action.
- Minimize/close action.

Do not display internal LLM model names or long UUIDs in the primary chat header.

## 5.5 Context Awareness

The assistant must be aware of the currently selected:

- Movie production budget (USD).
- Movie genres.
- Approved historical dataset.
- Active model version.
- Current prediction result, when available.
- Current dashboard context, when applicable.

Display context in a compact, collapsible section.

Example:

```text
Current Context
Budget: $2,000,000
Genres: Sci-Fi, Action
Dataset: movies_dataset.csv
Model: LightGBM Revenue
```

This context must come from real application state.

Do not invent missing fields.

Reuse existing FastAPI chat contracts and submit authorized context to the backend.

## 5.6 Suggested Prompts

When the chat is empty, display helpful prompt suggestions:

- "Predict revenue for my current movie."
- "What if my budget decreases by 20%?"
- "Compare historical revenue by genre."
- "Generate a dashboard for this scenario."

Clicking a suggestion should prefill or submit the relevant request.

## 5.7 Chat Message Design

Support distinct rendering for:

- User messages.
- AI explanations.
- Prediction tool results.
- Scenario comparison results.
- Dashboard generation results.
- Loading states.
- Error states.

For a prediction response, show a compact result card:

```text
Revenue Estimate
$X,XXX,XXX

LightGBM · Point prediction
[View in Workbench]
```

For dashboard generation, show:

```text
Dashboard Ready
Movie Revenue Comparison

[Open Dashboard]
```

All numerical values must originate from verified backend responses.

The assistant must not invent model outputs.

## 5.8 Chat-to-Workbench Interaction

Allow authorized AI tool results to interact with the current workspace.

Examples:

- `View Prediction` displays the verified prediction in the workbench.
- `Compare Scenarios` opens the comparison view.
- `Open Dashboard` navigates to a generated dashboard.
- `Apply Scenario` updates form inputs only after explicit user confirmation.

Do not allow AI-generated text to directly modify application state without a validated action.

Use existing backend tool contracts.

---

# 6. Movie Prediction Workbench

Redesign the movie prediction area to prioritize speed and clarity.

## 6.1 Compact Scenario Form

Use a compact horizontal layout on desktop.

Fields:

**Production Budget (USD)**

- Currency prefix: `$`.
- Display thousands separators.
- Support numeric input.
- Preserve raw numeric API values.
- Validate non-negative amounts.

**Movie Genres**

- Replace checkbox grid with a searchable multi-select.
- Use Select2 where compatible with the existing frontend stack.
- Support multiple selections.
- Display selected genres as removable chips.
- Fetch available genres from active model metadata.
- Prevent duplicates.
- Handle unsupported genres.

Do not hardcode genre values.

### Suggested Layout

```text
Movie Scenario

Budget (USD)             Genres
[$ 2,000,000]            [Sci-Fi ×] [Action ×]  ▾

[Predict Revenue]
```

On mobile, stack fields vertically.

## 6.2 Prediction Results

After successful inference, show a prominent prediction card.

Display:

- Predicted revenue.
- USD unit.
- Point estimate or actual quantile label.
- Current budget.
- Selected genres.
- Active model version.
- Relevant warnings and assumptions.

Provide actions:

- Compare Budget Scenario.
- Ask AI to Explain.
- Add to Dashboard.

Do not display prediction values until real inference succeeds.

Do not calculate a survival score or loss probability unless the backend actually provides it.

## 6.3 Scenario Comparison

Use a clear baseline-versus-modified comparison component.

Example:

```text
Budget Scenario Comparison

                    Baseline      Modified
Production Budget   $2,000,000    $1,600,000
Predicted Revenue   [Model]       [Model]

Revenue Difference  [Calculated from actual results]
```

Use charts where appropriate.

Clearly label model-based what-if comparisons as non-causal estimates.

Keep both scenarios on the same model version for a valid comparison.

---

# 7. Historical Analytics & Dashboard Generation

## 7.1 Fix Raw Markdown Rendering

The current interface can display large AI-generated Markdown tables inside an information banner.

This must be corrected.

Do not render a complete analytical report as raw Markdown text in an alert.

Instead, use structured components for:

- KPI statistics.
- Historical revenue charts.
- Data tables.
- Model information.
- Analytical notes.

Prefer JSON-structured tool results from FastAPI.

If existing responses contain Markdown, handle them safely, but do not make raw Markdown the primary analytics UI contract.

Never inject untrusted content as raw HTML.

## 7.2 Dashboard Creation Flow

Create a clear dashboard-generation workspace.

Use two steps:

**Step 1 — Data Source**

- Select an approved historical dataset.
- Show dataset name.
- Show row count.
- Show validation status.
- Show model compatibility when relevant.

**Step 2 — Dashboard Request**

- Natural-language prompt.
- Suggested dashboard templates.
- Generate action.

Suggested prompt:

"Compare historical revenue by genre and include my current movie revenue prediction."

Keep the form compact.

Do not require the user to scroll through unrelated sections.

## 7.3 Dashboard Preview

After generation, show the dashboard directly in the analytics workspace.

Support:

- KPI cards.
- Bar charts.
- Line charts.
- Scatter charts.
- Comparison charts.
- Data tables.
- AI insight cards.

Use existing charting libraries and validated dashboard JSON specifications.

Do not execute arbitrary JavaScript, PHP, Blade templates, or SQL generated by the LLM.

## 7.4 Dashboard Actions

Provide:

- Save Dashboard.
- Refresh Data.
- Open Dashboard.
- Generate Another.
- View Data Sources.

Preserve source dataset version, model version, and generation metadata.

Separate historical data statistics from ML predictions using clear labels.

---

# 8. Saved Dashboards

The current Saved Dashboards card occupies significant space even when empty.

Redesign it.

Suggested options:

- Compact recent dashboards list.
- Dedicated Dashboards page/tab.
- Small "Recent Dashboards" panel.
- Empty state with a useful dashboard generation action.

Do not display a large mostly empty panel above more important analytical content.

When dashboards exist, show:

- Dashboard title.
- Dataset.
- Last updated date.
- Model version when relevant.
- Open action.

Use existing persistence APIs.

---

# 9. Model Transparency

Keep model information accessible without dominating the screen.

Replace the large permanent Model Facts sidebar with a compact model indicator and expandable details.

### Compact Indicator

```text
Active Model
LightGBM Revenue · USD
[View Details]
```

### Expanded Details

Show:

- Full model version UUID.
- Model type.
- Prediction target.
- Dataset version.
- Holdout sample size.
- MAE.
- RMSE.
- Limitations.
- Output type.

For USD revenue models, format MAE and RMSE as USD amounts when confirmed by the model contract.

Provide a short explanation:

"MAE represents the average absolute difference between predicted and actual revenue on the evaluation set."

Do not hide poor evaluation metrics.

Do not present a model's registration or validation status as proof of predictive accuracy.

---

# 10. Information Hierarchy

Apply the following priorities.

### Primary Information

Always easy to find:

- Production budget.
- Selected genres.
- Revenue prediction.
- Scenario comparison.
- Generate Dashboard.
- Ask SURVIVE.

### Secondary Information

Available through progressive disclosure:

- Dataset details.
- Model metrics.
- Model UUID.
- Historical aggregation policy.
- Technical metadata.
- Detailed warnings and limitations.

### Low-Priority Information

Avoid placing these prominently:

- Raw JSON.
- Raw Markdown tables.
- Full UUIDs.
- Internal API implementation details.
- Long unformatted analytical text.

---

# 11. State Management

The prediction form, dashboard generator, and AI Chat must share a consistent movie scenario context.

Implement a reusable scenario state mechanism compatible with the existing Laravel frontend architecture.

Persist state appropriately across navigation without storing sensitive information unnecessarily.

Keep separate:

- Unsaved form inputs.
- Last successful prediction.
- Active model version.
- Selected dataset.
- Current chat context.
- Saved dashboard configuration.

When the user changes budget or genres, visually distinguish stale prediction results from the current inputs.

Do not silently imply that an old prediction reflects newly edited inputs.

When the active model changes, invalidate incompatible cached feature metadata and prediction state.

---

# 12. Loading, Empty & Error States

Implement polished states for all major user actions.

### Prediction

- Idle.
- Validating.
- Predicting.
- Success.
- Error.

### AI Chat

- Ready.
- Sending.
- Processing tools.
- Generating explanation.
- Completed.
- Rate limited.
- Failed.

### Dashboard Generation

- Waiting for input.
- Collecting data.
- Planning visualization.
- Rendering.
- Completed.
- Failed.

Use skeletons or concise progress indicators where appropriate.

Do not fabricate completion percentages.

Show friendly error messages without exposing stack traces or credentials.

---

# 13. Accessibility & Responsive Design

Target:

- 1440px desktop.
- 1024px tablet.
- 390px mobile.

Requirements:

- Keyboard-accessible chat launcher.
- Proper focus management in the chat drawer.
- Visible focus states.
- Accessible text contrast.
- Responsive form layout.
- Responsive chart containers.
- Mobile-friendly data tables.
- No horizontal viewport overflow.
- Charts with accessible labels or data-table alternatives.
- Respect reduced-motion preferences.
- Touch-friendly interactive controls.

Ensure the floating assistant does not obscure essential primary actions.

---

# 14. Implementation Constraints

Preserve:

- Existing Laravel authentication.
- Existing FastAPI endpoints.
- Existing prediction logic.
- Existing AI tool orchestration.
- Instructor/Pydantic JSON contracts.
- Existing dashboard storage.
- Existing model registry integration.
- Existing dataset validation and provenance.

Do not rewrite working backend code for cosmetic reasons.

Do not introduce a second AI Chat backend.

Do not create hardcoded prediction values.

Do not remove model limitations or evaluation metrics.

Do not introduce a new frontend framework unless the project already depends on it or there is a concrete technical requirement.

---

# 15. Suggested Implementation Phases

## Phase 1 — UI Audit

Inspect existing pages, components, styles, scripts, and API integrations.

Identify reusable components.

Create a concise design/refactor plan.

## Phase 2 — Layout Refactor

- Improve workbench information hierarchy.
- Compact movie prediction form.
- Improve prediction results.
- Reduce redundant sidebar content.
- Create model transparency disclosure.

## Phase 3 — Floating Assistant

- Add floating launcher.
- Implement right-side drawer.
- Integrate existing chat endpoint.
- Add context awareness.
- Render tool result cards.
- Implement chat-to-workbench actions.

## Phase 4 — Analytics & Dashboards

- Replace raw Markdown analytics presentation.
- Improve data-source selector.
- Improve dashboard generation workflow.
- Render validated dashboard widgets.
- Refine saved-dashboard experience.

## Phase 5 — Responsive QA

- Test desktop, tablet, and mobile.
- Test keyboard navigation.
- Test floating chat behavior.
- Validate prediction and dashboard state synchronization.
- Fix visual regressions.

---

# 16. Acceptance Tests

Verify that:

1. A producer can enter a USD budget and multiple genres.
2. The form uses actual model-supported genre categories.
3. The prediction result is visible without excessive scrolling.
4. Historical statistics do not appear as raw Markdown tables.
5. Model transparency remains accessible.
6. The AI Chat launcher is visible while scrolling.
7. Chat opens in a usable drawer.
8. The chat drawer works on desktop and mobile.
9. Chat uses current movie scenario context.
10. AI-generated predictions come from real ML tools.
11. A chat result can open the relevant dashboard.
12. Dashboard generation renders actual validated data.
13. Saved dashboards can be reopened.
14. Changing form inputs does not misrepresent stale predictions.
15. Existing backend workflows continue functioning.
16. No console errors, major layout shifts, or horizontal overflow occur.

Use the project's existing test framework and browser automation tools where available.

Capture before/after screenshots at desktop and mobile sizes if the development environment supports it.

---

# 17. Definition of Done

The refactor is complete when the SURVIVE interface feels like one coherent production intelligence application rather than separate forms and technical panels.

The intended workflow is:

**Configure Movie → Predict Revenue → Ask AI → Compare Scenarios → Generate Dashboard → Save Insights.**

The AI Assistant must be persistently accessible without dominating the page.

The workbench must prioritize producer decisions over implementation details.

All analytics must remain grounded in verified model outputs and approved datasets.

Implement the refactor, test the existing integrations, and report what changed, what was verified, and any remaining limitations.

Do not stop after producing design recommendations. Execute the improvements in the existing codebase.
