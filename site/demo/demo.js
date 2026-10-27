// Client-side "backend" for the demo app so it also works on static GitHub Pages.
// The real REST API (server/app.mjs) is covered by the API test project.
const SESSION_KEY = 'taskflow.session';
const TODOS_KEY = 'taskflow.todos';
const DEMO_USERS = { 'qa@demo.dev': 'Passw0rd!' };

export function login(email, password) {
  if (DEMO_USERS[email] !== password) return false;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email, at: Date.now() }));
  return true;
}

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')?.email ?? null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(TODOS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveTodos(todos) {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}
