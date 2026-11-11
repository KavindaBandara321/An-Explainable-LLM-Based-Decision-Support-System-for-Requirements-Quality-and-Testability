import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip" href="#main">Skip to main content</a>
    <header>
      <span class="brand">User story quality: decision support prototype</span>
      <nav aria-label="Main">
        <a routerLink="/analysis" routerLinkActive="active" ariaCurrentWhenActive="page">Analysis</a>
        <a routerLink="/improvement" routerLinkActive="active" ariaCurrentWhenActive="page">Improvement</a>
        <a routerLink="/study" routerLinkActive="active" ariaCurrentWhenActive="page">User study</a>
      </nav>
    </header>
    <main id="main" tabindex="-1"><router-outlet /></main>
  `,
  styles: `
    header { display: flex; flex-wrap: wrap; gap: 0.5rem 2rem; align-items: center; padding: 0.6rem 1.25rem; background: #111827; color: #fff; }
    .brand { font-weight: 700; }
    nav { display: flex; gap: 0.25rem; }
    nav a { color: #fff; padding: 0.3rem 0.75rem; border-radius: 6px; text-decoration: none; border: 1px solid transparent; }
    nav a:hover { border-color: #9ca3af; }
    nav a.active { background: #fff; color: #111827; font-weight: 700; text-decoration: underline; }
    main { max-width: 74rem; margin: 0 auto; padding: 1.25rem; }
    .skip { position: absolute; left: -999px; background: #fff; padding: 0.5rem; z-index: 10; }
    .skip:focus { left: 0.5rem; top: 0.5rem; }
  `,
})
export class App {}
