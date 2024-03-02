module.exports = async function dataGrab(page) {

    await page.goto('https://flowwow.com/admin/order/index', { waitUntil: 'load', timeout: 0 });
    await page.waitForSelector('a[data-val="status2"]', {visible: true});
    let spanContent = await page.$eval('ul[data-bar="2"] li:nth-child(3) .an-count', span => span.textContent);
    spanContent = parseInt(spanContent, 10);
    if (spanContent === 0) {
      console.log('Принятых заказов 0, stopping execution');
      return false;
    } else {
  
      await page.click('a[data-val="status2"]');
      await page.waitForSelector('.list-view', {visible: true, timeout: 60000});
      while (true) {
        const isHidden = await page.$eval('.btn-show-more', (button) => button.classList.contains('hidden'));
        if (isHidden) {
          break;
        }
        await page.click('.btn-show-more');
        await page.waitForTimeout(2000);
      }

      
      await page.waitForTimeout(5000);
      let data = await page.$$eval('.an-order-block', blocks => blocks.map(block => {
        
        function convertMonthNameToNumber(monthName) {
          switch (monthName) {
            case 'февраля': return '02';
            case 'марта': return '03';
            case 'апреля': return '04';
          }
        }
        
        let order = block.querySelector('.order-id')?.textContent || '';
        order = parseInt(order.replace(/\D/g, ''), 10);
        let address = block.querySelector('.address-link-google')?.textContent.trim() || '';
        let coordinates = [];
        let blockContent = block.querySelector('.block-content')?.textContent || '';
        
        let dateDeliveryElement = block.querySelector('.an-deliverydatetime')?.textContent || "";
        let day = dateDeliveryElement.match(/\d+/)[0];
        let monthText = dateDeliveryElement.match(/(февраля|марта|апреля)/)[0];
        let month = convertMonthNameToNumber(monthText);
        let year = 2024;
        let date = `${year}-${month}-${day}`;
        let time = dateDeliveryElement.match(/\d{2}:\d{2}/);
        time = time == null ? "" : time[0];
        let senderPhone = "+" + block.querySelector('span[data-type="sender"]')?.getAttribute('data-phone') || '';
        let additional = block.querySelector('.additional-info-block .block-content')?.textContent || '';
        let comment = `${senderPhone} / ${blockContent} / ${additional}`;
        let phone = block.querySelector('span[data-type="receiver"]')?.getAttribute('data-phone');
        phone = phone !== undefined ? "+" + phone : senderPhone;
        let status = 0;
        let group = 0;
        let itemSumElements = block.querySelectorAll('.item-sum') || '';
        let delivery = itemSumElements[itemSumElements.length - 1]?.textContent.trim().replace(/\D/g, '') || '';
        
        return { order, address, date, time, comment, phone, status, group, delivery, coordinates };
        
      }));

      if (data.length !== spanContent) {
        console.log('Захвачены лишние заказы');
        return false;
      } else {
        return data;
      }
  
    }
  }