// Estilos compartidos para react-day-picker (.rdp) usando los tokens de tema.
// Usa las variables CSS semánticas (--c-*) para que el calendario se vea
// correcto tanto en modo claro como oscuro (antes usaba color: #FFF fijo, lo
// que dejaba los números invisibles sobre el fondo claro).
export const dayPickerCss = `
  .rdp {
    --rdp-cell-size: 40px;
    --rdp-accent-color: rgb(var(--c-accent));
    --rdp-background-color: rgb(var(--c-surface-2));
    --rdp-accent-color-dark: rgb(var(--c-accent));
    --rdp-background-color-dark: rgb(var(--c-surface-2));
    --rdp-outline: 2px solid var(--rdp-accent-color);
    --rdp-border-radius: 12px;
    color: rgb(var(--c-text));
    margin: 1em auto;
  }
  .rdp-caption_label { color: rgb(var(--c-text-strong)); font-weight: bold; }
  .rdp-nav_button { color: rgb(var(--c-accent)); }
  .rdp-nav_button:hover { background-color: rgb(var(--c-surface-2)); }
  .rdp-head_cell { color: rgb(var(--c-text-muted)); font-size: 0.8em; text-transform: capitalize; }
  .rdp-day { color: rgb(var(--c-text-strong)); }
  .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgb(var(--c-surface-2)); }
  .rdp-day_selected, .rdp-day_selected:hover { background-color: var(--rdp-accent-color); color: #fff; font-weight: bold; }
  .rdp-day_today { font-weight: bold; color: rgb(var(--c-accent)); }
  .rdp-day_disabled { color: rgb(var(--c-text-faint)); opacity: 0.4; }
  .rdp-day_outside { color: rgb(var(--c-text-faint)); }
  .rdp-dropdown {
    background-color: rgb(var(--c-surface-2));
    border: 1px solid rgb(var(--c-border));
    color: rgb(var(--c-text));
    padding: 4px 8px;
    border-radius: 6px;
  }
  .rdp-dropdown_month, .rdp-dropdown_year { color: rgb(var(--c-text)); }
  .rdp-caption_dropdowns { gap: 6px; }
`;
