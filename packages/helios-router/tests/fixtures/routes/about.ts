import { html } from 'lit-html';
import { navComponent } from './nav-component';

export default {
  root: () => {
    return html`
      <div>About</div>
      <app-frame-lit-html id="link"></app-frame-lit-html>
    `;
  },
  //
  link: navComponent,
};
