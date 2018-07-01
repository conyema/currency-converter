class CurrencyConverter {
    constructor() {
        this.registerServiceWorker();
        this.dbPromise = this.openDatabase();
        this.getCurrency();
    }
    // Register service worker
    registerServiceWorker(){
        if(!navigator.serviceWorker) return;
        navigator.serviceWorker.register('service-worker.js').then(() => console.log('registration Worked')).catch(() => console.log('Registartion Failed')
    );  
    }

    openDatabase(){
        if(!('indexedDB' in window)){
            console.log('This browser does not support indexedDB');
            return Promise.resolve();
        }
        return idb.open('currencyDB', 3, upgradeDb => {
            switch(upgradeDb.oldVersion){
                case 0:
                    upgradeDb.createObjectStore('currencies');
                case 1:
                    upgradeDb.transaction.objectStore('currencies').createIndex('id', 'id', {unique:true});
                case 2:
                    upgradeDb.createObjectStore('currencyRates', {keyPath:'query'});
                    upgradeDb.transaction.objectStore('currencyRates').createIndex('query', 'query', {unique:true});
            }
        });
    }

    getCurrency() {
        //get currencies from API
        fetch('https://free.currencyconverterapi.com/api/v5/currencies').then(response => {
            return response.json();
        }).then(response => {
            let currencies = Object.values(response.results); //get object values from response
            let selectBtns = document.querySelectorAll('select.currency');
            //iterate through individual currency objects to get values of currency(name, symbol and value) 
            for(const currency of Object.values(currencies)){
                let option = this.createElement('option');
                if(currency.hasOwnProperty('currencySymbol')) option.text = `${currency.currencyName} (${currency.currencySymbol})`;
                else option.text = `${currency.currencyName} (${currency.id})`;
                 option.value = currency.id;
  
                 //Add currencies to select button
                 this.appendElement(selectBtns,option);
            }
            // Store currencies in IDB cache
            this.storeCurrency(currencies); 
            this.pagePost('message','Device Online'); //post message to HTML page
           
        }).catch( error => {
            console.log('Could not fetch currencies: '+ error);
            this.showCurrencies(); // Attempt to get currencies from DB
        });
    }

    getRate(fCurrency, tCurrency) {
        let fromCurrency = encodeURIComponent(fCurrency);
        let toCurrency = encodeURIComponent(tCurrency);
        let query = fromCurrency + '_' + toCurrency;
        
        // Get currency rate from API
        return fetch('https://free.currencyconverterapi.com/api/v5/convert?q='+ query + '&compact=ultra').then(response => {
            return response.json();
        }).then(response => {
  
            const cRate = response[Object.keys(response)]; // get the conversion rate 
            return  {cRate, appStatus: 'online'};
        }).catch(error => {
            // Attempt to get rate from cache if fetch fails
            const cRate = this.getRateFromDB(fCurrency, tCurrency);
            return  cRate;
        });
    }

    storeCurrencyRate(rate, fCurrency, tCurrency) {
        this.dbPromise.then(db => {
            if (!db) return;
            
            let t = db.transaction('currencyRates', 'readwrite');
            let store = t.objectStore('currencyRates'); // get currency rate object store
            let query = `${fCurrency}_${tCurrency}`;
           
            // add the new entry or replace old entry with new one
            store.put({ query, rate });
  
            // keep only 30 entries in IDB
           store.index('query').openCursor(null, 'prev').then(cursor => {
                return cursor.advance(30);
            }).then(function deleteRest(cursor){
                if (!cursor) return;
                cursor.delete();
                return cursor.continue().then(deleteRest);
            });
        }).then(() => {
            console.log('Currency rate for ' + fCurrency + ' and ' + tCurrency + ' added to IDB cache');
         }).catch(error => console.log('Failed to store currency rate: '+ error));
    } 

    //store currencies in IDB cache
    storeCurrency(currencies){
        this.dbPromise.then(db => {
            if(!db) return;
            let t = db.transaction('currencies', 'readwrite');
            let store = t.objectStore('currencies');
            for(const currency of currencies) {
                store.put(currency, currency.id);
            }
            // keep only 180 currencies in cache and delete the rest
            store.index().openCursor(null, 'prev').then(cursor => {
                return cursor.advance(180);
            }).then(function deleteRest(cursor) {
                if(!cursor) return;
                cursor.delete();
                return cursor.continue().then(deleteRest);
            });
        }).then(() => {
            console.log('Currencies added to DB');
         }).catch(error => console.log('Failed to store currencies: '+ error));
    }

    getRateFromDB(fCurrency, tCurrency) {
        return this.dbPromise.then(db => {
             if (!db) return;
            // Get rates from IDB cache
             const query = `${fCurrency}_${tCurrency}`;
             let t = db.transaction('currencyRates', 'readwrite'); 
             let store = t.objectStore('currencyRates'); 
            return store.index('query').get(query);
         }).then( R => { 
                    const rate  = R.rate;
                     return {rate, appStatus: 'offline'}; // Return currency rate 
          }).catch(error => {
              console.log('Rate not in DB'); //log error to console
             // this.pagePost('','Rate not in DB');
              return error;
         });
     }

     showCurrencies() {
        return this.dbPromise.then( db => {
  
            if (!db) return;
            // Get the index of all currencies by 'id' 
            let index = db.transaction('currencies')
              .objectStore('currencies').index('id');
            return index.getAll().then( currencies => {
                console.log('Currencies fetched');
                let selectBtns = document.querySelectorAll('select.currency');  
                
                // append fetched currencies to select button with currency name and symbol or ID
                for(const currency of currencies){
                    let option = this.createElement('option');

                    if(currency.hasOwnProperty('currencySymbol')) option.text = `${currency.currencyName} (${currency.currencySymbol})`;
                    else option.text = `${currency.currencyName} (${currency.id})`;
                    option.value = currency.id;
                    this.appendElement(selectBtns,option); // Add currencies to select button
                }
                this.pagePost('message', 'Device Offline');
            });
          });
    }

    // DOM manipulation for posting messages on the home page
    pagePost(x, message, outputResult = {}) {
        if(x === 'result') { 
             document.getElementById('result').innerHTML = `${outputResult.tCurrency} ${outputResult.result.toFixed(2)}`;
         }
         else if(x = 'offlineFailure') {
             document.getElementById('result').innerHTML = '0.00';
         }  
         else(message !== '')
             document.getElementById('statement').innerHTML = message;
         
         return;
     }

      // Create html element
    createElement(element) {
        return document.createElement(element);
        return;
    }
   appendElement(parentElement, element)
   {
       let element1 = element.cloneNode(true); 
       parentElement[0].appendChild(element);
       parentElement[1].appendChild(element1);
       return;
   }
  } //End Currency Converter class
  

   (function(){
    const converter = new CurrencyConverter(); 
    
    // Listen to click event on "convert" button
    document.getElementById('convertBtn').addEventListener('click', () =>{
        let message = '';
         converter.pagePost('messages', 'Converting currency...');

        // get input values
        const amount = document.getElementById('amount').value;
        const fCurrency = document.getElementById('fCurrency').value;
        const tCurrency = document.getElementById('tCurrency').value;
    
        // Check if amount is a number
        if(amount === '' || isNaN(amount)) message = 'Enter a valid amount.';
        else if(fCurrency ==='') message = 'Select the currency to convert from.';
        else if(tCurrency ==='') message = 'Select currency to convert to.';
        else if (fCurrency === tCurrency) message = 'You have select same currency.';
        else {
            // call the method that calls currency api to get conversion rate
            converter.getRate(fCurrency,tCurrency).then( response =>{ // console.log(response);
                 const rate = response.cRate;
                 const appStatus = response.appStatus; // get state of device from request response
                if(rate !== undefined)
                {
                    const result = amount * rate; // performs currency convertion
                
                    // set conversion rate msg.
                    message = `${amount}  ${fCurrency} is Equivalent to ${result}  ${tCurrency}`;
                    converter.pagePost('result', message, {result, tCurrency}); // diplay conversion result on page
                    // Add/update rate in IDB cache if obtained online 
                    if(appStatus ==='online')  converter.storeCurrencyRate(rate, fCurrency, tCurrency); 
                }
                else converter.pagePost('offline', 'Please go online to get updated rates.');
            }).catch( error => {
                console.log('No rate was found in the cache: ' + error);
                converter.pagePost('', error);
            });
        }
    
        converter.pagePost('message', message); //   
    });
  
  
  })();
