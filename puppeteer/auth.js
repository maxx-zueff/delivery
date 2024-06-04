const prompt = require('prompt');


module.exports = async function auth(page, db) {
    await page.goto('https://flowwow.com/partners/');
    await page.waitForSelector('#js-open-auth', {visible: true});
    await page.click('#js-open-auth').then(()=> console.log('Окно авторизации открыто'));
    await page.waitForSelector('#login-phone', {visible: true});
    await page.type('#login-phone', '9056346690').then(()=> console.log('Телефон введён'));
    await page.click('.js-get-code').then(()=> console.log('Код отправлен в СМС'));
  
    let {code} = await prompt.get(['code']);
    let els = await page.$$(".code-holder > input")
    let i = 0; for (const el of els) {
      await el.type(code[i]);
      i = i+1;
    }
  
    await page.waitForNavigation({waitUntil: 'networkidle2'})
    const cookies = await page.cookies();

    await db.mycollection.remove({}, function (err) {
      if (err) console.log(err)
    })
    
    await db.mycollection.save({"flowwow": cookies}, function (err, res) {
      if (err) console.log(err)
    })
  
    return {"flowwow": cookies};
  }