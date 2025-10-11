import { render } from 'solid-js/web';
import App from './App';
import './styles.css';

declare module 'solid-js' {
  namespace JSX {
    interface Directives {}
  }
}

render(() => <App />, document.getElementById('root') as HTMLElement);
