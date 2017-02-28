import {defineMessages} from 'react-intl';
class App {
  constructor(arg='test') {
    var m = defineMessages({
      greeting: {
        id: 'greetingId',
        defaultMessage: 'Hello World!'
      },
    });

    bla bla
    this.result = arg;
  }
}

export default App;
