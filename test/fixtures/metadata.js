import {defineMessages} from 'react-intl';
class App {
  constructor(arg='test') {
    var m = defineMessages({
      greeting: {
        id: 'greetingId',
        defaultMessage: 'Hello World!'
      },
    });

    this.result = arg;
  }
}

export default App;
