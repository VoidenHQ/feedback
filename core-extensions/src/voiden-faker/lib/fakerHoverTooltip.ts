import { getFakerDocsUrl, getFakerInfoByVariable } from './fakerEngine';

let cardEl: HTMLDivElement | null = null;
let hideTimer: number | null = null;
let listenersBound = false;

function clearHideTimer() {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function scheduleHide() {
  clearHideTimer();
  hideTimer = window.setTimeout(() => {
    if (cardEl) {
      cardEl.style.display = 'none';
    }
  }, 120);
}

function injectStyles() {
  const styleId = 'voiden-faker-hover-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .voiden-faker-hover-card {
      position: fixed;
      z-index: 10020;
      width: min(460px, calc(100vw - 16px));
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-secondary);
      color: var(--fg-primary);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      font-family: "Geist Mono", monospace;
      font-size: 12px;
      line-height: 1.4;
      padding: 10px;
    }
    .voiden-faker-hover-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .voiden-faker-hover-card__title {
      color: var(--fg-primary);
      font-weight: 600;
    }
    .voiden-faker-hover-card__meta {
      color: var(--fg-secondary);
      font-size: 11px;
    }
    .voiden-faker-hover-card__section + .voiden-faker-hover-card__section {
      margin-top: 8px;
    }
    .voiden-faker-hover-card__label {
      color: var(--fg-secondary);
      margin-bottom: 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .voiden-faker-hover-card__code {
      margin: 0;
      padding: 8px;
      border-radius: 6px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .voiden-faker-hover-card__code code {
      font-family: "Geist Mono", monospace;
      color: var(--fg-primary);
    }
    .voiden-faker-hover-card__link {
      display: inline-block;
      margin-top: 10px;
      color: var(--accent-alt, #3fa3d9);
      text-decoration: underline;
      cursor: pointer;
    }
    .voiden-faker-hover-card__hint {
      margin-top: 8px;
      color: var(--fg-secondary);
    }
  `;

  document.head.appendChild(style);
}

function ensureCard() {
  if (cardEl) return cardEl;

  cardEl = document.createElement('div');
  cardEl.className = 'voiden-faker-hover-card';
  cardEl.style.display = 'none';
  cardEl.addEventListener('mouseenter', () => clearHideTimer());
  cardEl.addEventListener('mouseleave', () => scheduleHide());
  cardEl.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>('[data-faker-doc-link]');
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute('href');
    if (!href) return;

    const electronApi = (window as any).electron;
    if (electronApi?.openExternal) {
      electronApi.openExternal(href);
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  });
  document.body.appendChild(cardEl);
  return cardEl;
}

function getVariableNameFromTarget(target: HTMLElement): string | null {
  const text = target.textContent?.trim();
  if (!text) return null;
  const match = text.match(/^\{\{(.*?)\}\}$/);
  return match?.[1]?.trim() ?? null;
}

function showForTarget(target: HTMLElement) {
  const variableName = getVariableNameFromTarget(target);
  if (!variableName) return;
  const fn = getFakerInfoByVariable(variableName);
  if (!fn) return;

  const path = fn.path;
  const paramsCount = fn.paramsCount ?? 0;
  const paramsType = fn.paramsType ?? 'unknown';
  const paramsSummary = fn.paramsSummary ?? null;
  const example = `{{$faker.${path}(${fn.argsTemplate ?? ''})}}`;
  const docsUrl = getFakerDocsUrl(path, fn.sourceUrl);

  const card = ensureCard();
  card.innerHTML = `
    <div class="voiden-faker-hover-card__header">
      <span class="voiden-faker-hover-card__title">${path}</span>
      <span class="voiden-faker-hover-card__meta">${paramsCount} param${paramsCount === 1 ? '' : 's'} • ${paramsType}</span>
    </div>
    ${paramsSummary ? `<div class="voiden-faker-hover-card__section">
      <div class="voiden-faker-hover-card__label">Params</div>
      <div class="voiden-faker-hover-card__code"><code>${paramsSummary}</code></div>
    </div>` : ''}
    <div class="voiden-faker-hover-card__section">
      <div class="voiden-faker-hover-card__label">Example</div>
      <pre class="voiden-faker-hover-card__code"><code>${example}</code></pre>
    </div>
    <a class="voiden-faker-hover-card__link" data-faker-doc-link href="${docsUrl}" target="_blank" rel="noopener noreferrer">Open Faker docs ↗</a>
  `;

  const rect = target.getBoundingClientRect();
  const margin = 10;
  card.style.display = 'block';
  const top = rect.top - card.offsetHeight - margin > 8 ? rect.top - card.offsetHeight - margin : rect.bottom + margin;
  const maxLeft = window.innerWidth - card.offsetWidth - 8;
  const left = Math.max(8, Math.min(rect.left, maxLeft));
  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
}

const onMouseOver = (event: Event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('.variable-highlight-faker');
  if (!target) return;
  clearHideTimer();
  showForTarget(target);
};

const onMouseOut = (event: Event) => {
  const fromTarget = (event.target as HTMLElement).closest<HTMLElement>('.variable-highlight-faker');
  if (!fromTarget) return;
  const toNode = (event as MouseEvent).relatedTarget as Node | null;
  if (toNode && (cardEl?.contains(toNode) || ((toNode as HTMLElement).closest && (toNode as HTMLElement).closest('.variable-highlight-faker')))) {
    return;
  }
  scheduleHide();
};

const onScroll = () => {
  if (cardEl) {
    cardEl.style.display = 'none';
  }
};

export function mountFakerHoverTooltip() {
  if (listenersBound || typeof document === 'undefined') return;
  listenersBound = true;
  injectStyles();
  document.addEventListener('mouseover', onMouseOver);
  document.addEventListener('mouseout', onMouseOut);
  window.addEventListener('scroll', onScroll, true);
}

export function unmountFakerHoverTooltip() {
  if (!listenersBound || typeof document === 'undefined') return;
  listenersBound = false;
  document.removeEventListener('mouseover', onMouseOver);
  document.removeEventListener('mouseout', onMouseOut);
  window.removeEventListener('scroll', onScroll, true);
  clearHideTimer();
  if (cardEl) {
    cardEl.remove();
    cardEl = null;
  }
}
