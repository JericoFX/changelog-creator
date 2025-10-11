import { For, Show } from 'solid-js';
import { createMemo, createSignal, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';

type HistoryEntry = {
  version: string;
  changes: string[];
  notes?: string;
  timestamp: string;
};

type ChangelogData = {
  Version: string;
  Changes: string[];
  DO_NOT_CHANGE_VER: string;
  History: HistoryEntry[];
};

type ChangeView = {
  index: number;
  label: string;
  category: 'additions' | 'removals' | 'modifications' | 'misc';
  prefix: string;
  text: string;
};

const DEFAULT_FILE_PATH = '/changelogs/changelog.json';

const DEFAULT_DATA: ChangelogData = {
  Version: '',
  Changes: [],
  DO_NOT_CHANGE_VER: '',
  History: []
};

const CATEGORY_META = {
  additions: { title: 'Añadidos', description: 'Novedades y nuevas funcionalidades', accent: '🟢' },
  removals: { title: 'Eliminados', description: 'Elementos que ya no están disponibles', accent: '🔴' },
  modifications: { title: 'Mejoras', description: 'Cambios y ajustes sobre contenido existente', accent: '🟡' },
  misc: { title: 'Misceláneo', description: 'Notas generales y recordatorios', accent: '🔹' }
} as const;

const TYPE_TO_PREFIX: Record<string, string> = {
  additions: '+',
  removals: '-',
  modifications: '*',
  misc: ''
};

const PREFIX_TO_TYPE: Record<string, ChangeView['category']> = {
  '+': 'additions',
  '-': 'removals',
  '*': 'modifications'
};

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('es', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch (error) {
    return iso;
  }
};

const normalizeData = (raw: Partial<ChangelogData> | undefined): ChangelogData => ({
  Version: raw?.Version ?? DEFAULT_DATA.Version,
  Changes: raw?.Changes ? [...raw.Changes] : [],
  DO_NOT_CHANGE_VER: raw?.DO_NOT_CHANGE_VER ?? DEFAULT_DATA.DO_NOT_CHANGE_VER,
  History: raw?.History ? [...raw.History] : []
});

const App = () => {
  const [data, setData] = createStore<ChangelogData>(normalizeData(undefined));
  const [filePath, setFilePath] = createSignal(DEFAULT_FILE_PATH);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string>();
  const [saveMessage, setSaveMessage] = createSignal<string>();
  const [selectedHistoryIndex, setSelectedHistoryIndex] = createSignal(-1);
  const [newChangeType, setNewChangeType] = createSignal<ChangeView['category']>('additions');
  const [newChangeText, setNewChangeText] = createSignal('');
  const [releaseNotes, setReleaseNotes] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);

  const parsedChanges = createMemo<ChangeView[]>(() =>
    data.Changes.map((change, index) => {
      const trimmed = change.trim();
      const first = trimmed.charAt(0);
      const category = PREFIX_TO_TYPE[first] ?? 'misc';
      const text = category === 'misc' ? trimmed : trimmed.slice(1).trim();
      return {
        index,
        label: CATEGORY_META[category].title,
        category,
        prefix: TYPE_TO_PREFIX[category],
        text
      } satisfies ChangeView;
    })
  );

  const groupedChanges = createMemo(() => ({
    additions: parsedChanges().filter((item) => item.category === 'additions'),
    removals: parsedChanges().filter((item) => item.category === 'removals'),
    modifications: parsedChanges().filter((item) => item.category === 'modifications'),
    misc: parsedChanges().filter((item) => item.category === 'misc')
  }));

  const currentHistory = createMemo(() => data.History ?? []);
  const selectedHistory = createMemo(() => {
    const history = currentHistory();
    const index = selectedHistoryIndex();
    return index >= 0 && index < history.length ? history[index] : undefined;
  });

  const resolvePath = (input: string) => {
    if (/^https?:\/\//i.test(input)) {
      return input;
    }

    try {
      const url = new URL(input, window.location.origin);
      return url.pathname + url.search;
    } catch {
      return input;
    }
  };

  const handleFetch = async (path?: string) => {
    const target = path ?? filePath();
    const resolved = resolvePath(target);
    console.debug('[Changelog Creator] intentando cargar changelog desde', resolved);
    setIsLoading(true);
    setError(undefined);
    setSaveMessage('');

    try {
      const response = await fetch(resolved, {
        headers: { 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const raw = await response.json();
      const normalized = normalizeData(raw);
      setData(normalized);
      console.debug(
        '[Changelog Creator] changelog cargado',
        { cambios: normalized.Changes.length, historial: normalized.History.length }
      );
      setSelectedHistoryIndex(-1);
      setReleaseNotes('');
      if (path) {
        setFilePath(target);
      }
    } catch (fetchError) {
      console.error('[Changelog Creator] error al cargar el changelog', fetchError);
      setError(
        'No se pudo cargar el changelog. Comprueba la ruta, que el archivo exista y que el servidor permita su lectura.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToFile = async () => {
    const target = filePath();
    const resolved = resolvePath(target);
    const payload = JSON.stringify(data, null, 2);
    console.debug('[Changelog Creator] intentando guardar changelog en', resolved);
    setIsSaving(true);
    setError(undefined);
    setSaveMessage('');

    try {
      const response = await fetch(resolved, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.debug('[Changelog Creator] changelog guardado correctamente en', resolved);
      setSaveMessage('Cambios guardados correctamente en el archivo.');
    } catch (saveError) {
      console.error('[Changelog Creator] error al guardar el changelog', saveError);
      setError(
        'No se pudo guardar el changelog en el archivo indicado. Comprueba permisos y que estés ejecutando el servidor de desarrollo.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddChange = (event: Event) => {
    event.preventDefault();
    const text = newChangeText().trim();
    if (!text) return;
    const type = newChangeType();
    const prefix = TYPE_TO_PREFIX[type];
    const formatted = prefix ? `${prefix} ${text}` : text;
    setData('Changes', (changes) => [...changes, formatted]);
    setNewChangeText('');
  };

  const removeChange = (index: number) => {
    setData('Changes', (changes) => changes.filter((_, idx) => idx !== index));
  };

  const handleSnapshot = () => {
    const entry: HistoryEntry = {
      version: data.Version,
      changes: [...data.Changes],
      notes: releaseNotes().trim() || undefined,
      timestamp: new Date().toISOString()
    };
    setData('History', (history) => [entry, ...history]);
    setSelectedHistoryIndex(0);
  };

  const downloadJson = () => {
    const file = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filePath().split('/').pop() ?? 'changelog.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const [file] = input.files ?? [];
    if (!file) return;
    try {
      const content = await file.text();
      const raw = JSON.parse(content);
      const normalized = normalizeData(raw);
      setData(normalized);
      setSelectedHistoryIndex(-1);
      setReleaseNotes('');
      setFilePath(file.name);
      setError(undefined);
    } catch (importError) {
      console.error(importError);
      setError('El archivo seleccionado no es un JSON válido.');
    } finally {
      input.value = '';
    }
  };

  const useHistoryEntry = (entry: HistoryEntry) => {
    setData('Version', entry.version);
    setData('Changes', [...entry.changes]);
    setSelectedHistoryIndex(-1);
    setReleaseNotes(entry.notes ?? '');
  };

  const changeCount = createMemo(() => data.Changes.length);

  onMount(() => {
    void handleFetch(DEFAULT_FILE_PATH);
  });

  return (
    <main class="layout">
      <header class="hero panel">
        <div>
          <h1>Changelog Creator</h1>
          <p class="tagline">
            Visualiza, documenta y exporta tus cambios para el servidor FiveM sin tocar el JSON a mano.
          </p>
        </div>
        <div class="badge">
          <span>Versión actual</span>
          <strong>{data.Version || 'Sin definir'}</strong>
        </div>
      </header>

      <section class="panel grid">
        <h2 class="section-title">Fuente del changelog</h2>
        <div class="field-group">
          <label for="filepath">Ruta a changelog.json</label>
          <div class="actions">
            <input
              id="filepath"
              type="text"
              value={filePath()}
              onInput={(event) => setFilePath(event.currentTarget.value)}
            />
            <button type="button" onClick={() => handleFetch()} disabled={isLoading()}>
              Recargar
            </button>
            <label class="button-like secondary">
              Importar JSON
              <input type="file" accept="application/json" onChange={handleImportFile} hidden />
            </label>
            <button type="button" class="secondary" onClick={downloadJson} disabled={!changeCount()}>
              Descargar JSON
            </button>
            <button type="button" onClick={handleSaveToFile} disabled={isSaving()}>
              {isSaving() ? 'Guardando…' : 'Guardar archivo'}
            </button>
          </div>
        </div>
        <Show when={error()}>
          {(message) => <p class="error">{message}</p>}
        </Show>
        <Show when={saveMessage()}>
          {(message) => <p class="status success">{message}</p>}
        </Show>
        <Show when={isLoading()}>
          <p class="status">Cargando changelog…</p>
        </Show>
      </section>

      <section class="panel grid-two">
        <div class="grid">
          <div class="field-group">
            <label for="version">Versión a publicar</label>
            <input
              id="version"
              type="text"
              value={data.Version}
              onInput={(event) => setData('Version', event.currentTarget.value)}
              placeholder="Ej: 1.2.0"
            />
          </div>
          <div class="field-group">
            <label>Versión publicada</label>
            <div class="readonly">
              <span>{data.DO_NOT_CHANGE_VER || 'Sin publicar'}</span>
              <small>Este valor se actualiza automáticamente al enviarse a Discord.</small>
            </div>
          </div>
          <div class="field-group">
            <label>Resumen o notas de la versión</label>
            <textarea
              value={releaseNotes()}
              onInput={(event) => setReleaseNotes(event.currentTarget.value)}
              placeholder="Describe los puntos clave de este despliegue…"
            />
          </div>
          <div>
            <button type="button" onClick={handleSnapshot} disabled={!data.Version || !changeCount()}>
              Guardar versión en historial
            </button>
          </div>
        </div>

        <div class="change-form">
          <h3>Agregar cambio</h3>
          <form class="grid" onSubmit={handleAddChange}>
            <div class="field-group">
              <label for="changeType">Tipo</label>
              <select
                id="changeType"
                value={newChangeType()}
                onChange={(event) => setNewChangeType(event.currentTarget.value as ChangeView['category'])}
              >
                <option value="additions">Añadido</option>
                <option value="removals">Eliminado</option>
                <option value="modifications">Modificado</option>
                <option value="misc">Misceláneo</option>
              </select>
            </div>
            <div class="field-group">
              <label for="changeText">Descripción</label>
              <textarea
                id="changeText"
                value={newChangeText()}
                onInput={(event) => setNewChangeText(event.currentTarget.value)}
                placeholder="Describe el cambio…"
              />
            </div>
            <div class="actions">
              <button type="submit" disabled={!newChangeText().trim()}>
                Añadir al listado
              </button>
            </div>
          </form>
        </div>
      </section>

      <section class="panel">
        <div class="section-header">
          <div>
            <h2 class="section-title">Cambios preparados ({changeCount()})</h2>
            <p class="section-description">
              Organiza los cambios por categoría. Cada elemento puede eliminarse antes de exportar.
            </p>
          </div>
        </div>

        <Show
          when={changeCount()}
          fallback={<div class="empty-state">Todavía no hay cambios. Agrega la primera entrada para empezar.</div>}
        >
          <div class="category-grid">
            <For each={Object.entries(groupedChanges())}>
              {([key, items]) => (
                <div class="category-card">
                  <header>
                    <span class="icon">{CATEGORY_META[key as ChangeView['category']].accent}</span>
                    <div>
                      <h3>{CATEGORY_META[key as ChangeView['category']].title}</h3>
                      <p>{CATEGORY_META[key as ChangeView['category']].description}</p>
                    </div>
                    <span class="count">{items.length}</span>
                  </header>
                  <Show
                    when={items.length}
                    fallback={<p class="muted">No hay elementos en esta categoría.</p>}
                  >
                    <ul class="changes-list">
                      <For each={items}>
                        {(item) => (
                          <li class="change-item">
                            <header>
                              <strong>{item.text}</strong>
                              <button
                                type="button"
                                class="secondary small"
                                onClick={() => removeChange(item.index)}
                              >
                                Quitar
                              </button>
                            </header>
                            <span class="chip">Prefijo: {item.prefix || '—'}</span>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </section>

      <section class="panel">
        <div class="section-header">
          <div>
            <h2 class="section-title">Historial de versiones</h2>
            <p class="section-description">
              Guarda y revisa versiones anteriores para reutilizar su contenido o consultar notas.
            </p>
          </div>
        </div>
        <Show
          when={currentHistory().length}
          fallback={<p class="history-empty">Todavía no has guardado versiones en este proyecto.</p>}
        >
          <div class="history-list">
            <For each={currentHistory()}>
              {(entry, index) => (
                <article
                  class={`version-card ${index() === selectedHistoryIndex() ? 'active' : ''}`}
                  onClick={() => setSelectedHistoryIndex(index())}
                >
                  <div class="version-info">
                    <h3>{entry.version}</h3>
                    <time>{formatDate(entry.timestamp)}</time>
                  </div>
                  <p class="muted">{entry.notes || 'Sin notas adicionales.'}</p>
                  <div class="chip-row">
                    <span class="chip">{entry.changes.length} cambios</span>
                  </div>
                  <button
                    type="button"
                    class="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      useHistoryEntry(entry);
                    }}
                  >
                    Usar esta versión
                  </button>
                </article>
              )}
            </For>
          </div>
        </Show>
      </section>

      <Show when={selectedHistory()}>
        {(entry) => (
          <section class="panel">
            <h2 class="section-title">Detalle de {entry().version}</h2>
            <p class="muted">{entry().notes || 'Sin notas adicionales.'}</p>
            <ul class="changes-list">
              <For each={entry().changes}>
                {(item) => (
                  <li class="change-item compact">
                    <span>{item}</span>
                  </li>
                )}
              </For>
            </ul>
          </section>
        )}
      </Show>

      <footer>
        <p>
          Construido con SolidJS. Tras exportar el archivo, súbelo al recurso en el servidor para que el script de FiveM lo
          envíe automáticamente.
        </p>
      </footer>
    </main>
  );
};

export default App;
