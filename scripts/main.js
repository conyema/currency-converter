let query = 'USD_AED';


const url = 'https://free.currencyconverterapi.com/api/v5/convert?q=${query}&compact=ultra';
fetch(url)
.then(data =>{
return data.json();
}).then(res =>{
  console.log(`${Object.values(res)}`);
}).catch(error => console.log(error));
