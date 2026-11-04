const app = document.querySelector('#app');

if (app) {
  const heading = document.createElement('h1');
  heading.textContent = 'Drumline Radio';
  const paragraph = document.createElement('p');
  paragraph.textContent = 'The player is coming soon.';
  app.append(heading, paragraph);
}
