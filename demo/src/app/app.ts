import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { type Theme, ThemeService } from '@pfm-solutions/ngx-theme';
import { DURATIONS, type DemoTransition, readSettings, saveSettingsAndReload, TRANSITIONS } from './demo-settings';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <header>
        <h1>ngx-theme</h1>
        <p>Light, dark and system theme for Angular. Pick a theme to see the transition play from your click.</p>
      </header>

      <section class="panel" aria-labelledby="theme-heading">
        <h2 id="theme-heading">Theme</h2>
        <div class="row" role="group" aria-label="Theme">
          @for (option of themes; track option.value) {
            <button
              type="button"
              [attr.data-theme-option]="option.value"
              [attr.aria-pressed]="themeService.theme() === option.value"
              (click)="themeService.setTheme(option.value, $event)"
            >
              {{ option.label }}
            </button>
          }
        </div>
        <p class="hint">
          Chosen: <strong>{{ themeService.theme() }}</strong
          >, applied: <strong>{{ themeService.resolvedTheme() }}</strong>
        </p>
      </section>

      <section class="panel" aria-labelledby="transition-heading">
        <h2 id="transition-heading">Transition</h2>
        <div class="row" role="group" aria-label="Transition">
          @for (type of transitions; track type) {
            <button
              type="button"
              [attr.data-transition-option]="type"
              [attr.aria-pressed]="settings.transition === type"
              (click)="update({ transition: type })"
            >
              {{ type }}
            </button>
          }
        </div>
        <h2 id="duration-heading">Duration</h2>
        <div class="row" role="group" aria-label="Duration">
          @for (duration of durations; track duration) {
            <button
              type="button"
              [attr.data-duration-option]="duration"
              [attr.aria-pressed]="settings.duration === duration"
              [disabled]="settings.transition === 'none'"
              (click)="update({ duration })"
            >
              {{ duration }} ms
            </button>
          }
        </div>
        <p class="hint">
          The transition is set when the app is provided, so changing it reloads the page.
          @if (reducedMotion) {
            Your system asks for reduced motion: the theme switches instantly.
          } @else if (!viewTransitions) {
            This browser has no View Transitions: the theme switches instantly.
          }
        </p>
      </section>

      <section aria-labelledby="cards-heading">
        <h2 id="cards-heading">No wave</h2>
        <p class="hint">
          Each card below animates its own colors with <code>transition-colors</code>. During a switch the library
          suspends those transitions, so everything changes together.
        </p>
        <div class="cards">
          @for (card of cards; track card.title) {
            <article class="card">
              <h3>{{ card.title }}</h3>
              <p>{{ card.text }}</p>
              <span class="badge">{{ card.badge }}</span>
            </article>
          }
        </div>
      </section>
    </main>
  `,
})
export class App {
  protected readonly themeService = inject(ThemeService);
  protected readonly settings = readSettings();
  protected readonly themes: readonly { value: Theme; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];
  protected readonly transitions = TRANSITIONS;
  protected readonly durations = DURATIONS;
  protected readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  protected readonly viewTransitions = 'startViewTransition' in document;
  protected readonly cards = [
    { title: 'Persisted', text: 'Your choice is saved and restored on the next visit.', badge: 'localStorage' },
    {
      title: 'Live system',
      text: 'In system mode the page follows your OS as it changes.',
      badge: 'prefers-color-scheme',
    },
    {
      title: 'Cross-tab',
      text: 'Open this page twice: a change in one tab reaches the other.',
      badge: 'storage event',
    },
    { title: 'No flash', text: 'The init script applies the theme before the first paint.', badge: 'theme-init.js' },
    {
      title: 'Accessible',
      text: 'Reduced motion and browsers without View Transitions switch instantly.',
      badge: 'fallback',
    },
    { title: 'Tiny API', text: 'provideTheme(), then theme, resolvedTheme and setTheme.', badge: 'signals' },
  ];

  protected update(change: Partial<{ transition: DemoTransition; duration: number }>): void {
    saveSettingsAndReload({ ...this.settings, ...change });
  }
}
