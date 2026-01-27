/**
 * Custom CodeMirror Search Panel
 *
 * Replaces the default search panel with a custom one that uses icon buttons
 * instead of checkboxes for a cleaner, more modern UI.
 */

import { EditorView } from "@codemirror/view";
import { SearchQuery, getSearchQuery, setSearchQuery, findNext, findPrevious, closeSearchPanel, replaceNext, replaceAll } from "@codemirror/search";

/**
 * Creates a custom search panel with icon buttons for toggle options
 */
export function createCustomSearchPanel(view: EditorView): {
  dom: HTMLElement;
  mount?: () => void;
  update?: (update: any) => void;
  destroy?: () => void;
} {
  const dom = document.createElement("div");
  dom.className = "cm-search-panel-custom";

  // Get current search query
  const query = getSearchQuery(view.state);

  // Build the panel structure
  dom.innerHTML = `
    <div class="cm-search-container">
      <div class="cm-search-row">
        <input
          type="text"
          class="cm-search-input"
          placeholder="Find"
          value="${query.search}"
          spellcheck="false"
          autocomplete="off"
        />
        <div class="cm-search-options">
          <button
            class="cm-search-option ${query.caseSensitive ? 'active' : ''}"
            title="Match Case"
            data-option="caseSensitive"
            aria-label="Match Case"
          >
            <span class="cm-option-icon">Aa</span>
          </button>
          <button
            class="cm-search-option ${query.wholeWord ? 'active' : ''}"
            title="Match Whole Word"
            data-option="wholeWord"
            aria-label="Match Whole Word"
          >
            <span class="cm-option-icon">ab|</span>
          </button>
          <button
            class="cm-search-option ${query.regexp ? 'active' : ''}"
            title="Use Regular Expression"
            data-option="regexp"
            aria-label="Use Regular Expression"
          >
            <span class="cm-option-icon">.*</span>
          </button>
        </div>
        <div class="cm-search-nav-buttons">
          <button class="cm-search-btn cm-search-prev" title="Previous (Shift+Enter)" aria-label="Previous">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          </button>
          <button class="cm-search-btn cm-search-next" title="Next (Enter)" aria-label="Next">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          <button class="cm-search-btn cm-search-close" title="Close (Escape)" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="cm-search-row cm-replace-row">
        <input
          type="text"
          class="cm-search-input cm-replace-input"
          placeholder="Replace"
          value="${query.replace || ''}"
          spellcheck="false"
          autocomplete="off"
        />
        <button class="cm-replace-btn" title="Replace (Ctrl+Shift+1)" aria-label="Replace">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12l5 5l10 -10"/>
          </svg>
        </button>
        <button class="cm-replace-all-btn" title="Replace All (Ctrl+Shift+Enter)" aria-label="Replace All">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 3l5 5l10 -10M5 10l5 5l10 -10M5 17l5 5l10 -10"/>
          </svg>
        </button>
        <div class="cm-search-status"></div>
      </div>
    </div>
  `;

  // Get DOM elements
  const input = dom.querySelector(".cm-search-input") as HTMLInputElement;
  const replaceInput = dom.querySelector(".cm-replace-input") as HTMLInputElement;
  const prevBtn = dom.querySelector(".cm-search-prev") as HTMLButtonElement;
  const nextBtn = dom.querySelector(".cm-search-next") as HTMLButtonElement;
  const closeBtn = dom.querySelector(".cm-search-close") as HTMLButtonElement;
  const replaceBtn = dom.querySelector(".cm-replace-btn") as HTMLButtonElement;
  const replaceAllBtn = dom.querySelector(".cm-replace-all-btn") as HTMLButtonElement;
  const statusEl = dom.querySelector(".cm-search-status") as HTMLElement;
  const options = dom.querySelectorAll(".cm-search-option") as NodeListOf<HTMLButtonElement>;

  // Update search query helper
  const updateQuery = (changes: Partial<SearchQuery>) => {
    const current = getSearchQuery(view.state);
    const newQuery = new SearchQuery({
      search: changes.search ?? current.search,
      caseSensitive: changes.caseSensitive ?? current.caseSensitive,
      regexp: changes.regexp ?? current.regexp,
      wholeWord: changes.wholeWord ?? current.wholeWord,
      replace: changes.replace ?? current.replace,
    });
    view.dispatch({ effects: setSearchQuery.of(newQuery) });
  };

  // Update status (match count)
  const updateStatus = () => {
    const current = getSearchQuery(view.state);
    if (!current.search) {
      statusEl.textContent = "";
      return;
    }

    // Count matches
    let count = 0;
    const cursor = current.getCursor(view.state.doc);
    while (!cursor.next().done) count++;

    statusEl.textContent = count === 0 ? "No results" : `${count} result${count > 1 ? 's' : ''}`;
  };

  // Event handlers
  input.addEventListener("input", (e) => {
    updateQuery({ search: (e.target as HTMLInputElement).value });
    updateStatus();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        findPrevious(view);
      } else {
        findNext(view);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeSearchPanel(view);
    }
  });

  prevBtn.addEventListener("click", () => findPrevious(view));
  nextBtn.addEventListener("click", () => findNext(view));
  closeBtn.addEventListener("click", () => closeSearchPanel(view));

  // Replace input handler
  replaceInput.addEventListener("input", (e) => {
    updateQuery({ replace: (e.target as HTMLInputElement).value });
  });

  replaceInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearchPanel(view);
    }
  });

  // Replace button handlers
  replaceBtn.addEventListener("click", () => {
    // First ensure the query has the latest replace value
    updateQuery({ replace: replaceInput.value });
    replaceNext(view);
    updateStatus();
  });

  replaceAllBtn.addEventListener("click", () => {
    // First ensure the query has the latest replace value
    updateQuery({ replace: replaceInput.value });
    replaceAll(view);
    updateStatus();
  });

  options.forEach((btn) => {
    btn.addEventListener("click", () => {
      const option = btn.dataset.option as keyof SearchQuery;
      const current = getSearchQuery(view.state);
      const newValue = !current[option];
      updateQuery({ [option]: newValue });

      // Update button state based on new value
      if (newValue) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }

      updateStatus();
    });
  });

  // Mount function
  const mount = () => {
    input.focus();
    input.select();
    updateStatus();
  };

  // Update function
  const update = (update: any) => {
    if (update.docChanged || update.selectionSet) {
      const current = getSearchQuery(view.state);
      input.value = current.search;
      replaceInput.value = current.replace || '';
      updateStatus();
    }
  };

  return { dom, mount, update };
}

/**
 * CSS styles for the custom search panel
 * These should be injected into the document
 */
export const customSearchPanelStyles = `
  .cm-search-panel-custom {
    padding: 8px;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    gap: 0px;
    font-family: var(--font-family-base, sans-serif);
    max-width: 420px !important;
    width: auto !important;
  }

  .cm-search-container {
    display: flex;
    flex-direction: column;
    gap: 0px;
  }

  .cm-search-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
  }

  .cm-search-row:last-child {
    margin-bottom: 0;
  }

  .cm-search-input {
    flex: 1;
    padding: 5px 8px;
    background: var(--editor-bg);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-family-base, sans-serif);
    outline: none;
    min-width: 120px;
    max-width: 200px;
  }

  .cm-search-input:focus {
    border-color: var(--icon-primary);
    box-shadow: 0 0 0 1px var(--icon-primary);
  }

  .cm-search-options {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .cm-search-option {
    padding: 6px 8px;
    background: var(--active);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    color: var(--comment);
    cursor: pointer;
    font-size: 11px;
    font-family: var(--font-family-mono, monospace);
    font-weight: 600;
    transition: all 0.15s ease;
    min-width: 32px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cm-search-option:hover {
    background: var(--active);
    color: var(--text);
    border-color: var(--icon-primary);
  }

  .cm-search-option.active {
    background: var(--icon-primary);
    color: var(--bg);
    border-color: var(--icon-primary);
  }

  .cm-search-option:active {
    transform: scale(0.96);
  }

  .cm-option-icon {
    display: inline-block;
    line-height: 1;
  }

  .cm-search-nav-buttons {
    display: flex;
    gap: 4px;
  }

  .cm-search-btn {
    padding: 6px;
    background: var(--active);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    color: var(--comment);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    width: 28px;
    height: 28px;
  }

  .cm-search-btn:hover {
    background: var(--active);
    color: var(--text);
    border-color: var(--icon-primary);
  }

  .cm-search-btn:active {
    transform: scale(0.96);
  }

  .cm-replace-btn,
  .cm-replace-all-btn {
    padding: 6px;
    background: var(--active);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    color: var(--comment);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    width: 28px;
    height: 28px;
  }

  .cm-replace-btn:hover,
  .cm-replace-all-btn:hover {
    background: var(--active);
    color: var(--text);
    border-color: var(--icon-primary);
  }

  .cm-replace-btn:active,
  .cm-replace-all-btn:active {
    transform: scale(0.96);
  }

  .cm-search-status {
    font-size: 11px;
    color: var(--comment);
    font-family: var(--font-family-base, sans-serif);
    min-height: 16px;
    display: flex;
    align-items: center;
    padding: 0 4px;
    white-space: nowrap;
    margin-left: auto;
  }
`;
