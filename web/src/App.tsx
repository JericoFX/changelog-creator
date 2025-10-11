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

type LanguageCode = 'es' | 'en';
type TranslationKey = string;
type TranslationParams = Record<string, string | number>;

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

const translations: Record<LanguageCode, Record<string, unknown>> = {
  es: {
    hero: {
      title: 'Changelog Creator',
      tagline: 'Visualiza, documenta y exporta tus cambios para el servidor FiveM sin tocar el JSON a mano.',
      badge: {
        label: 'Versión actual',
        empty: 'Sin definir'
      }
    },
    language: {
      label: 'Idioma',
      options: {
        es: 'Español',
        en: 'Inglés'
      }
    },
    sections: {
      source: { title: 'Fuente del changelog' },
      preparedChanges: {
        title: 'Cambios preparados ({{count}})',
        description: 'Organiza los cambios por categoría. Cada elemento puede eliminarse antes de exportar.'
      },
      addChange: { title: 'Agregar cambio' },
      history: {
        title: 'Historial de versiones',
        description: 'Guarda y revisa versiones anteriores para reutilizar su contenido o consultar notas.'
      },
      historyDetail: {
        title: 'Detalle de {{version}}'
      }
    },
    forms: {
      filePath: { label: 'Ruta a changelog.json' },
      version: {
        label: 'Versión a publicar',
        placeholder: 'Ej: 1.2.0'
      },
      published: {
        label: 'Versión publicada',
        empty: 'Sin publicar',
        help: 'Este valor se actualiza automáticamente al enviarse a Discord.'
      },
      notes: {
        label: 'Resumen o notas de la versión',
        placeholder: 'Describe los puntos clave de este despliegue…'
      },
      changeType: {
        label: 'Tipo',
        options: {
          additions: 'Añadido',
          removals: 'Eliminado',
          modifications: 'Modificado',
          misc: 'Misceláneo'
        }
      },
      changeText: {
        label: 'Descripción',
        placeholder: 'Describe el cambio…'
      }
    },
    categories: {
      additions: {
        title: 'Añadidos',
        description: 'Novedades y nuevas funcionalidades'
      },
      removals: {
        title: 'Eliminados',
        description: 'Elementos que ya no están disponibles'
      },
      modifications: {
        title: 'Mejoras',
        description: 'Cambios y ajustes sobre contenido existente'
      },
      misc: {
        title: 'Misceláneo',
        description: 'Notas generales y recordatorios'
      }
    },
    actions: {
      reload: 'Recargar',
      import: 'Importar JSON',
      download: 'Descargar JSON',
      save: 'Guardar archivo',
      saving: 'Guardando…',
      snapshot: 'Guardar versión en historial',
      add: 'Añadir al listado',
      remove: 'Quitar',
      useVersion: 'Usar esta versión'
    },
    labels: {
      prefix: 'Prefijo: {{prefix}}',
      changeCount: '{{count}} cambios'
    },
    feedback: {
      saveSuccess: 'Cambios guardados correctamente en el archivo.'
    },
    errors: {
      fetch: 'No se pudo cargar el changelog. Comprueba la ruta, que el archivo exista y que el servidor permita su lectura.',
      save: 'No se pudo guardar el changelog en el archivo indicado. Comprueba permisos y que estés ejecutando el servidor de desarrollo.',
      importInvalid: 'El archivo seleccionado no es un JSON válido.'
    },
    messages: {
      loading: 'Cargando changelog…'
    },
    emptyStates: {
      noChanges: 'Todavía no hay cambios. Agrega la primera entrada para empezar.',
      noCategoryItems: 'No hay elementos en esta categoría.',
      noHistory: 'Todavía no has guardado versiones en este proyecto.'
    },
    common: {
      noNotes: 'Sin notas adicionales.'
    },
    footer: {
      note: 'Construido con SolidJS. Tras exportar el archivo, súbelo al recurso en el servidor para que el script de FiveM lo envíe automáticamente.'
    }
  },
  en: {
    hero: {
      title: 'Changelog Creator',
      tagline: 'Browse, document, and export your FiveM updates without editing the JSON by hand.',
      badge: {
        label: 'Current version',
        empty: 'Not set'
      }
    },
    language: {
      label: 'Language',
      options: {
        es: 'Spanish',
        en: 'English'
      }
    },
    sections: {
      source: { title: 'Changelog source' },
      preparedChanges: {
        title: 'Prepared changes ({{count}})',
        description: 'Group updates by category. Remove anything you do not want before exporting.'
      },
      addChange: { title: 'Add change' },
      history: {
        title: 'Version history',
        description: 'Capture and review previous versions so you can reuse notes or compare updates.'
      },
      historyDetail: {
        title: '{{version}} details'
      }
    },
    forms: {
      filePath: { label: 'Path to changelog.json' },
      version: {
        label: 'Version to publish',
        placeholder: 'Ex: 1.2.0'
      },
      published: {
        label: 'Published version',
        empty: 'Not published',
        help: 'This value updates automatically when the bot posts to Discord.'
      },
      notes: {
        label: 'Release summary or notes',
        placeholder: 'Highlight the key points included in this release…'
      },
      changeType: {
        label: 'Type',
        options: {
          additions: 'Added',
          removals: 'Removed',
          modifications: 'Changed',
          misc: 'Miscellaneous'
        }
      },
      changeText: {
        label: 'Description',
        placeholder: 'Describe the change…'
      }
    },
    categories: {
      additions: {
        title: 'Additions',
        description: 'New features and freshly added content'
      },
      removals: {
        title: 'Removals',
        description: 'Items that are no longer available'
      },
      modifications: {
        title: 'Improvements',
        description: 'Updates and adjustments to existing content'
      },
      misc: {
        title: 'Miscellaneous',
        description: 'General notes and reminders'
      }
    },
    actions: {
      reload: 'Reload',
      import: 'Import JSON',
      download: 'Download JSON',
      save: 'Save file',
      saving: 'Saving…',
      snapshot: 'Store version in history',
      add: 'Add to list',
      remove: 'Remove',
      useVersion: 'Use this version'
    },
    labels: {
      prefix: 'Prefix: {{prefix}}',
      changeCount: '{{count}} changes'
    },
    feedback: {
      saveSuccess: 'Changes saved to the file successfully.'
    },
    errors: {
      fetch: 'The changelog could not be loaded. Verify the path, that the file exists, and that the server allows it to be read.',
      save: 'The changelog could not be saved to the selected file. Check permissions and ensure the dev server is running.',
      importInvalid: 'The selected file is not valid JSON.'
    },
    messages: {
      loading: 'Loading changelog…'
    },
    emptyStates: {
      noChanges: 'No changes yet. Add your first entry to get started.',
      noCategoryItems: 'There are no entries in this category.',
      noHistory: 'You have not stored any versions for this project yet.'
    },
    common: {
      noNotes: 'No additional notes.'
    },
    footer: {
      note: 'Built with SolidJS. After exporting, upload the file to your resource so the FiveM script can announce it automatically.'
    }
  }
};

const CATEGORY_META = {
  additions: {
    accent: '🟢',
    titleKey: 'categories.additions.title',
    descriptionKey: 'categories.additions.description',
    optionKey: 'forms.changeType.options.additions'
  },
  removals: {
    accent: '🔴',
    titleKey: 'categories.removals.title',
    descriptionKey: 'categories.removals.description',
    optionKey: 'forms.changeType.options.removals'
  },
  modifications: {
    accent: '🟡',
    titleKey: 'categories.modifications.title',
    descriptionKey: 'categories.modifications.description',
    optionKey: 'forms.changeType.options.modifications'
  },
  misc: {
    accent: '🔹',
    titleKey: 'categories.misc.title',
    descriptionKey: 'categories.misc.description',
    optionKey: 'forms.changeType.options.misc'
  }
} as const;

const LOCALE_MAP: Record<LanguageCode, string> = {
  es: 'es-ES',
  en: 'en-US'
};

const resolveTranslation = (lang: LanguageCode, key: TranslationKey): string | undefined => {
  const dictionary = translations[lang] ?? translations.es;
  const value = key
    .split('.')
    .reduce<unknown>((acc, segment) => (acc as Record<string, unknown>)?.[segment], dictionary);
  return typeof value === 'string' ? value : undefined;
};

const applyParams = (template: string, params?: TranslationParams) => {
  if (!params) return template;
  return template.replace(/\{\{(.*?)\}\}/g, (_, token) => {
    const value = params[token.trim()];
    return value !== undefined ? String(value) : `{{${token}}}`;
  });
};

const translate = (lang: LanguageCode, key: TranslationKey, params?: TranslationParams) => {
  const primary = resolveTranslation(lang, key);
  const fallback = primary ?? resolveTranslation('es', key);
  if (!fallback || typeof fallback !== 'string') {
    return key;
  }
  return applyParams(fallback, params);
};

const formatDate = (iso: string, lang: LanguageCode) => {
  try {
    return new Intl.DateTimeFormat(LOCALE_MAP[lang] ?? 'es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch (error) {
    return iso;
  }
};

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

const normalizeData = (raw: Partial<ChangelogData> | undefined): ChangelogData => ({
  Version: raw?.Version ?? DEFAULT_DATA.Version,
  Changes: raw?.Changes ? [...raw.Changes] : [],
  DO_NOT_CHANGE_VER: raw?.DO_NOT_CHANGE_VER ?? DEFAULT_DATA.DO_NOT_CHANGE_VER,
  History: raw?.History ? [...raw.History] : []
});

const App = () => {
  const [language, setLanguage] = createSignal<LanguageCode>('es');
  const t = (key: TranslationKey, params?: TranslationParams) => translate(language(), key, params);

  const [data, setData] = createStore<ChangelogData>(normalizeData(undefined));
  const [filePath, setFilePath] = createSignal(DEFAULT_FILE_PATH);
  const [isLoading, setIsLoading] = createSignal(true);
  const [errorKey, setErrorKey] = createSignal<TranslationKey | undefined>(undefined);
  const [errorParams, setErrorParams] = createSignal<TranslationParams | undefined>(undefined);
  const [saveMessageKey, setSaveMessageKey] = createSignal<TranslationKey | undefined>(undefined);
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
        label: t(CATEGORY_META[category].titleKey),
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
    setErrorKey(undefined);
    setErrorParams(undefined);
    setSaveMessageKey(undefined);

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
      setErrorKey('errors.fetch');
      setErrorParams(undefined);
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
    setErrorKey(undefined);
    setErrorParams(undefined);
    setSaveMessageKey(undefined);

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
      setSaveMessageKey('feedback.saveSuccess');
    } catch (saveError) {
      console.error('[Changelog Creator] error al guardar el changelog', saveError);
      setErrorKey('errors.save');
      setErrorParams(undefined);
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
      setErrorKey(undefined);
      setErrorParams(undefined);
    } catch (importError) {
      console.error(importError);
      setErrorKey('errors.importInvalid');
      setErrorParams(undefined);
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
          <h1>{t('hero.title')}</h1>
          <p class="tagline">{t('hero.tagline')}</p>
        </div>
        <div class="hero-actions">
          <div class="language-switcher">
            <label for="language-select">{t('language.label')}</label>
            <select
              id="language-select"
              value={language()}
              onChange={(event) => setLanguage(event.currentTarget.value as LanguageCode)}
            >
              <option value="es">{t('language.options.es')}</option>
              <option value="en">{t('language.options.en')}</option>
            </select>
          </div>
          <div class="badge">
            <span>{t('hero.badge.label')}</span>
            <strong>{data.Version || t('hero.badge.empty')}</strong>
          </div>
        </div>
      </header>

      <section class="panel grid">
        <h2 class="section-title">{t('sections.source.title')}</h2>
        <div class="field-group">
          <label for="filepath">{t('forms.filePath.label')}</label>
          <div class="actions">
            <input
              id="filepath"
              type="text"
              value={filePath()}
              onInput={(event) => setFilePath(event.currentTarget.value)}
            />
            <button type="button" onClick={() => handleFetch()} disabled={isLoading()}>
              {t('actions.reload')}
            </button>
            <label class="button-like secondary">
              {t('actions.import')}
              <input type="file" accept="application/json" onChange={handleImportFile} hidden />
            </label>
            <button type="button" class="secondary" onClick={downloadJson} disabled={!changeCount()}>
              {t('actions.download')}
            </button>
            <button type="button" onClick={handleSaveToFile} disabled={isSaving()}>
              {isSaving() ? t('actions.saving') : t('actions.save')}
            </button>
          </div>
        </div>
        <Show when={errorKey()}>
          {(key) => <p class="error">{t(key(), errorParams())}</p>}
        </Show>
        <Show when={saveMessageKey()}>
          {(key) => <p class="status success">{t(key())}</p>}
        </Show>
        <Show when={isLoading()}>
          <p class="status">{t('messages.loading')}</p>
        </Show>
      </section>

      <section class="panel grid-two">
        <div class="grid">
          <div class="field-group">
            <label for="version">{t('forms.version.label')}</label>
            <input
              id="version"
              type="text"
              value={data.Version}
              onInput={(event) => setData('Version', event.currentTarget.value)}
              placeholder={t('forms.version.placeholder')}
            />
          </div>
          <div class="field-group">
            <label>{t('forms.published.label')}</label>
            <div class="readonly">
              <span>{data.DO_NOT_CHANGE_VER || t('forms.published.empty')}</span>
              <small>{t('forms.published.help')}</small>
            </div>
          </div>
          <div class="field-group">
            <label>{t('forms.notes.label')}</label>
            <textarea
              value={releaseNotes()}
              onInput={(event) => setReleaseNotes(event.currentTarget.value)}
              placeholder={t('forms.notes.placeholder')}
            />
          </div>
          <div>
            <button type="button" onClick={handleSnapshot} disabled={!data.Version || !changeCount()}>
              {t('actions.snapshot')}
            </button>
          </div>
        </div>

        <div class="change-form">
          <h3>{t('sections.addChange.title')}</h3>
          <form class="grid" onSubmit={handleAddChange}>
            <div class="field-group">
              <label for="changeType">{t('forms.changeType.label')}</label>
              <select
                id="changeType"
                value={newChangeType()}
                onChange={(event) => setNewChangeType(event.currentTarget.value as ChangeView['category'])}
              >
                <option value="additions">{t(CATEGORY_META.additions.optionKey)}</option>
                <option value="removals">{t(CATEGORY_META.removals.optionKey)}</option>
                <option value="modifications">{t(CATEGORY_META.modifications.optionKey)}</option>
                <option value="misc">{t(CATEGORY_META.misc.optionKey)}</option>
              </select>
            </div>
            <div class="field-group">
              <label for="changeText">{t('forms.changeText.label')}</label>
              <textarea
                id="changeText"
                value={newChangeText()}
                onInput={(event) => setNewChangeText(event.currentTarget.value)}
                placeholder={t('forms.changeText.placeholder')}
              />
            </div>
            <div class="actions">
              <button type="submit" disabled={!newChangeText().trim()}>
                {t('actions.add')}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section class="panel">
        <div class="section-header">
          <div>
            <h2 class="section-title">{t('sections.preparedChanges.title', { count: changeCount() })}</h2>
            <p class="section-description">{t('sections.preparedChanges.description')}</p>
          </div>
        </div>

        <Show
          when={changeCount()}
          fallback={<div class="empty-state">{t('emptyStates.noChanges')}</div>}
        >
          <div class="category-grid">
            <For each={Object.entries(groupedChanges())}>
              {([key, items]) => (
                <div class="category-card">
                  <header>
                    <span class="icon">{CATEGORY_META[key as ChangeView['category']].accent}</span>
                    <div>
                      <h3>{t(CATEGORY_META[key as ChangeView['category']].titleKey)}</h3>
                      <p>{t(CATEGORY_META[key as ChangeView['category']].descriptionKey)}</p>
                    </div>
                    <span class="count">{items.length}</span>
                  </header>
                  <Show
                    when={items.length}
                    fallback={<p class="muted">{t('emptyStates.noCategoryItems')}</p>}
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
                                {t('actions.remove')}
                              </button>
                            </header>
                            <span class="chip">{t('labels.prefix', { prefix: item.prefix || '—' })}</span>
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
            <h2 class="section-title">{t('sections.history.title')}</h2>
            <p class="section-description">{t('sections.history.description')}</p>
          </div>
        </div>
        <Show
          when={currentHistory().length}
          fallback={<p class="history-empty">{t('emptyStates.noHistory')}</p>}
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
                    <time>{formatDate(entry.timestamp, language())}</time>
                  </div>
                  <p class="muted">{entry.notes || t('common.noNotes')}</p>
                  <div class="chip-row">
                    <span class="chip">{t('labels.changeCount', { count: entry.changes.length })}</span>
                  </div>
                  <button
                    type="button"
                    class="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      useHistoryEntry(entry);
                    }}
                  >
                    {t('actions.useVersion')}
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
            <h2 class="section-title">{t('sections.historyDetail.title', { version: entry().version })}</h2>
            <p class="muted">{entry().notes || t('common.noNotes')}</p>
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
        <p>{t('footer.note')}</p>
      </footer>
    </main>
  );
};

export default App;
