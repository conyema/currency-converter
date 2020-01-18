class CurrencyConverter {
  constructor() {
    this.registerServiceWorker();
    this.dbPromise = this.openDatabase();
    // this.getCurrency();
  }

  /* Register service worker */
  registerServiceWorker() {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('SW registered'))
      .catch(() => console.log('SW registartion failed'));
  }

  /* Create IDB store */
  openDatabase() {
    if (!('indexedDB' in window)) {
      console.log('This browser does not support indexedDB');
      return Promise.resolve();
    }
    return idb.open('currenciesDB1', 3, upgradeDb => {
      switch (upgradeDb.oldVersion) {
        case 0:
          // upgradeDb.createObjectStore('currencies', { autoIncrement: true });
          upgradeDb.createObjectStore('currencies');
      }
    });
  }
  
  /*  Store currency data in idb  */
  storeCurrency(data) {
    return this.dbPromise.then(db => {
      if (!db) return;
      const tx = db.transaction('currencies', 'readwrite');
      const store = tx.objectStore('currencies');
      // console.log(db, tx, store);
      store.put(data, 1);
      return tx.complete;
    })
    .catch(error => console.log('Failed to store currencies: ' + error));
  }

  /*  Get currnecy from Indexed DB  */
  getFromIdb() {
    return this.dbPromise.then(db => {
      if (!db) return;
      const tx = db.transaction('currencies', 'readwrite');
      const store = tx.objectStore('currencies');
      return store.get(1);
    })
    .catch(error => {
      console.log(`Error accessing IDB: ${error}`);
      // this.pagePost('', 'Please go online for latest rates');
    });
  }

  /* Get currencies from currencyLayer API or Inbdexed DB */
  getCurrrencies() {
    const accessKey = '4f43e92e9d68749f75c7cd58f101eae1';
    const dataUrl = `http://apilayer.net/api/live?access_key=${accessKey}`;
    
    // return fetch('./data.json')
    return fetch(dataUrl)
    .then(response => response.json())
    .then(data => {
      // console.log(data);
      this.storeCurrency(data);
      return data;
    })
    .catch((error) => {
      console.log('Cannot get currency from API');
      return this.getFromIdb();
    });
  }

  convertRate(quotes, source, fromCurrency, toCurrency) {
    // const {quotes, source} = currencies;
    let denum = `${source}${fromCurrency}`;
    let num = `${source}${toCurrency}`;
    const rate = quotes[num]/quotes[denum];
    // console.log(rate, quotes[num]);
    return rate;
  }

  getRate(fromCurrency, toCurrency) {
    // console.log(fromCurrency, toCurrency);

    return this.getCurrrencies()
    .then((currencies) => {
      const {quotes, timestamp, source} = currencies;
      const rate = this.convertRate(quotes, source, fromCurrency, toCurrency);
      // console.log(quotes, timestamp, source, rate);
      return {rate, timestamp};
    })
    .catch((error) => {
      console.log(`Conversion not successful: ${error}`);
      this.pagePost('', 'Conversion not successful');
    });
  }
  
  pagePost(x, message, outputResult = {}) {
    if (x === 'result') {
      // document.getElementById('result').innerHTML = `${outputResult.toCurrency} ${outputResult.result.toFixed(2)}`;
      document.getElementById('result').innerHTML = `${outputResult.result}`;
    }
    // else if (x = 'offlineFailure') {
    //   document.getElementById('result').innerHTML = '0.00';
    // }
    else (message !== '')
    document.getElementById('statement').innerHTML = message;
    return;
  }

  // Create html element
  createElement(element) {
    return document.createElement(element);
    // return;
  }
  appendElement(parentElement, element) {
    let element1 = element.cloneNode(true);
    parentElement[0].appendChild(element);
    parentElement[1].appendChild(element1);
    return;
  }
} // End Currency Converter class


(() => {
  const converter = new CurrencyConverter();

  // // get input values
  // const amount = document.getElementById('amount').value;
  // const fCurrency = document.getElementById('fCurrency').value;
  // const tCurrency = document.getElementById('tCurrency').value;
  // let message = '';
  
  document.addEventListener('DOMContentLoaded', (e) => {
    const amountField = document.getElementById('amount');
    amountField.focus();
    converter.pagePost('messages', 'Rates obtained from CurrencyLayer API...');
  });

  //  Attempt to update rate when netwoork goes from offline to online
  window.addEventListener('online', (e) => { 
    // console.log('online');
    converter.getCurrrencies();
  });

  // Listen to click event on "convert" button
  document.getElementById('convertBtn').addEventListener('click', () => {
    
    // get input values
    const amount = document.getElementById('amount').value;
    const fromCurrency = document.getElementById('fCurrency').value;
    const toCurrency = document.getElementById('tCurrency').value;
    let message = '';
  

    // Validate inputs
    if (amount === '' || isNaN(amount)) message = 'Enter a valid amount.';
    else if (fromCurrency === '') message = 'Select the currency to convert from.';
    else if (toCurrency === '') message = 'Select currency to convert to.';
    else {
      converter.getRate(fromCurrency, toCurrency)
      .then(response => {
        // console.log(response);
        const {rate, timestamp} = response;
        if (rate !== undefined) {
          const code = toCurrency.slice(0, 2);
          const total = amount * rate;
          // const result = amount * rate;
          const result = total.toLocaleString(`en-${code}`, { style: 'currency', currency: toCurrency, maximumFractionDigits: 2 });
          // console.log(result, code, total);
          const date = new Date(timestamp * 1000).toLocaleString();

          // Set conversion rate msg.
          // message = `${amount}  ${fromCurrency} is Equivalent to ${result}  ${toCurrency}`;
          message = `Rate: ${rate.toFixed(5)} valid as at ${date}`;
          converter.pagePost('result', message, { result, toCurrency });
        }
        else converter.pagePost('offline', 'Please go online to get updated rates.');
      })
      .catch(error => {
        console.log('Conversion unsuccessful: ' + error);
        // converter.pagePost('', error);
      });
    }
    converter.pagePost('message', message);
  });
})();
