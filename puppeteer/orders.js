module.exports = async function dataGrab(page) {
  await page.goto("https://flowwow.com/admin/order/index", {
    waitUntil: "networkidle2",
    timeout: 0,
  });

  try {
    await page.waitForSelector('a[data-val="status2"]', { visible: true });
    await page.click('a[data-val="status2"]');
    await page.waitForSelector(".list-view", { visible: true, timeout: 10000 });
    await page.waitForFunction(() => {
      const blocks = document.querySelectorAll('.an-order-block');
      return blocks.length > 0;
    }, { timeout: 10000 });
  } catch (e) {
    console.log(e);
    return false;
  }
    await page.waitForTimeout(3000);

    // while (true) {
    //   const isHidden = await page.$eval(".btn-show-more", (button) =>
    //     button.classList.contains("hidden")
    //   );
    //   if (isHidden) {
    //     break;
    //   }
    //   await page.click(".btn-show-more");
    //   await page.waitForTimeout(5000);
    // }

    try {
      // Wait for the button with a timeout
      await page.waitForSelector(".btn-show-more", { timeout: 10000 });
      
      while (true) {
        const isHidden = await page.$eval(".btn-show-more", (button) =>
          button.classList.contains("hidden")
        );
        if (isHidden) {
          break;
        }
        await page.click(".btn-show-more");
        await page.waitForTimeout(5000);
      }
    } catch (e) {
      console.log("Could not find or interact with 'Show More' button:", e.message);
      console.log("Continuing with available data...");
    }
    
    
    console.log(
      "Количество блоков соответствует ожидаемому. Продолжаем выполнение..."
    );

    let data = await page.evaluate(() => {
      const blocks = document.querySelectorAll('.an-order-block');
      return Array.from(blocks).map(block => {
        function convertMonthNameToNumber(monthName) {
          switch (monthName) {
            case "февраля":
              return "02";
            case "марта":
              return "03";
            case "апреля":
              return "04";
            case "мая":
              return "05";
            case "июня":
              return "06";
            case "июля":
              return "07";
            case "августа":
              return "08";
            case "сентября":
              return "09";
            case "октября":
              return "10";
            case "ноября":
              return "11";
            case "декабря":
              return "12";
          }
        }

        let order = block.querySelector(".order-id")?.textContent || "";
        order = parseInt(order.replace(/\D/g, ""), 10);
        let address =
          block.querySelector(".address-link-google")?.textContent.trim() || "";
        let coordinates = [];
        let blockContent =
          block.querySelector(".block-content")?.textContent || "";

        let dateDeliveryElement =
          block.querySelector(".an-deliverydatetime")?.textContent || "";
        let day = dateDeliveryElement.match(/\d+/)[0];
        if (day.length === 1) {
          day = "0" + day;
        }
        let monthText = dateDeliveryElement.match(
          /(февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/
        )[0];
        let month = convertMonthNameToNumber(monthText);
        let year = 2025;
        let date = `${year}-${month}-${day}`;
        let time = dateDeliveryElement.match(/\d{2}:\d{2}/);
        time = time == null ? "" : time[0];
        let senderPhone =
          "+" +
            block
              .querySelector('span[data-type="sender"]')
              ?.getAttribute("data-phone") || "";
        let additional =
          block.querySelector(".additional-info-block .block-content")
            ?.textContent || "";
        let comment = `Доп. номер ${senderPhone} / ${blockContent} / ${additional}`;
        let phone = block
          .querySelector('span[data-type="receiver"]')
          ?.getAttribute("data-phone");
        phone =
          phone !== undefined
            ? phone.length === 6
              ? "+74852" + phone
              : "+" + phone
            : senderPhone;

            if (phone === "+undefined" || !phone) {
              return false;
            }

        let group = "";
        let itemSumElements = block.querySelectorAll(".item-sum") || "";
        let delivery =
          itemSumElements[itemSumElements.length - 1]?.textContent
            .trim()
            .replace(/\D/g, "") || "";
        if (delivery == "0") {
          let surchargeItemElement = document.querySelector(".surcharge-item");
          if (surchargeItemElement !== null) {
            let surchargeText =
              surchargeItemElement.childNodes[0].nodeValue.trim(); // "Доплата за доставку"
            let paidSurchargeText =
              surchargeItemElement.querySelector(".paid-surcharge");
            if (paidSurchargeText !== null) {
              paidSurchargeText = paidSurchargeText.textContent; // "Оплачено"
            }
            if (
              surchargeText == "Доплата за доставку" &&
              paidSurchargeText == "Оплачено"
            ) {
              let deliverySum =
                surchargeItemElement.querySelector(
                  ".surcharge-sum"
                ).textContent;
              delivery = deliverySum.replace(/\D/g, "");
            }
          }
        }

        

        return {
          order,
          address,
          date,
          time,
          comment,
          phone,
          group,
          delivery,
          coordinates,
        };
      }).filter(item => item);
  });

  const hasInvalidPhone = data.some(item => !item || item.phone === "+undefined" || !item.phone);
  if (hasInvalidPhone) {
    console.log("Found order with invalid phone number, stopping execution");
    return [];
  }

  return data;
    // }
  // }
};
