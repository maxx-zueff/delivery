const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const prompt = require("prompt");
const mongojs = require("mongojs");
const db = mongojs("mongodb://localhost:27017/test");
const axios = require("axios");
const uuidv4 = require("uuid").v4;
const orderData = require("./config").order;
const token = require("./config").token;
const auth = require("./puppeteer/auth.js");
const dataGrab = require("./puppeteer/orders.js");
const geocoder_key = require("./config.js").geocoder_key;
const aasync = require('async');

puppeteer.use(StealthPlugin());

db.on("error", function (err) {
  console.log("database error", err);
});

db.on("connect", function () {
  console.log("database connected");
});

async function getDocuments(collectionName) {
  return new Promise((resolve, reject) => {
    const mycollection = db.collection(collectionName);
    mycollection.find().toArray(function (err, docs) {
      if (err) {
        reject(err);
      } else {
        resolve(docs);
      }
    });
  });
}

async function save(data) {

  data = data.filter((item, index, self) =>
    index === self.findIndex((t) => (
      t.order === item.order
    ))
  )

  const collection = db.collection("orders");
  const saved_docs = await getDocuments("orders");

//  return aasync.series([
//     function(callback) {
//       saved_docs.map(async (doc) => {
//         if (data.filter((item) => item.order === doc.order).length === 0) {
//           collection.updateOne(
//             { _id: doc._id },
//             { $set: { status: 1 } },
//             function (err, docs) {
//               if (err) throw new Error(err);
//               if (docs)  callback(null, '1');          
//             }
//           );
//         }
//       })
//     },
//     function(callback) {
//       data.map((item) => {
//          collection.update(
//           { order: item.order },
//           { $set: { ...item, status: 0 } },
//           { upsert: true },
//           function (err, res) {
//             if (err) throw new Error(err);
//             if (res) callback(null, '2');
//           }
//         );
//       })
//     },
//     function(callback) {
//       getDocuments("orders")
//         .then(docs => {
//           const updatedDocs = assignGroupByTimeDifference(new_docs);
//           updatedDocs.map(async (doc) => {
//             await collection.updateOne(
//               { _id: doc._id },
//               { $set: { group: doc.group } },
//               function (err, docs) {
//                 if (err) throw new Error(err);
//                 if (docs) callback(null, '3');
//               }
//             );
//           })

//       })
//     },
//     function(callback) {
//       const filtered_docs = new_docs.filter((doc) => doc.coordinates.length === 0);
//           filtered_docs.map(async (doc) => {
//       const geocode = doc.address.replace(/ /g, "+");
//       try {
//         const geocodeResponse = await axios.get(
//           "https://geocode-maps.yandex.ru/1.x/",
//           {
//             params: {
//               apikey: geocoder_key,
//               format: "json",
//               geocode: geocode,
//             },
//             timeout: 5000,
//           }
//         );
//         const result =
//           geocodeResponse.data.response.GeoObjectCollection.featureMember[0]
//             .GeoObject.Point.pos;
//         const coordinates = result.split(" ").map(Number);
//         await collection.updateOne(
//           { _id: doc._id },
//           { $set: { coordinates: coordinates } },
//           function (err, docs) {
//             if (err) throw new Error(err);
//             if (docs) callback(null, '4');;
//           }
//         );
//       } catch (err) {
//         throw new Error(err);
//       }
//     })
//     },
    
// ], function(err, results) {
//     console.log(results);
//     console.log(err);
//     // results is equal to ['one','two']
// });


  const updateOldStatus = await Promise.all(
    saved_docs.map(async (doc) => {
      if (data.filter((item) => item.order === doc.order).length === 0) {
        await collection.updateOne(
          { _id: doc._id },
          { $set: { status: 1 } },
          function (err, docs) {
            if (err) throw new Error(err);
            if (docs) return true;            
          }
        );
      }
    })
  );

  const saveNew = await Promise.all(
    data.map(async (item) => {
      await collection.update(
        { order: item.order },
        { $set: { ...item, status: 0 } },
        { upsert: true },
        function (err, res) {
          if (err) throw new Error(err);
          if (res) return true;
        }
      );
    })
  );

  const new_docs = await getDocuments("orders");
  const updatedDocs = assignGroupByTimeDifference(new_docs);
  const updateGroups = await Promise.all(
    updatedDocs.map(async (doc) => {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { group: doc.group } },
        function (err, docs) {
          if (err) throw new Error(err);
          if (docs) return true;
        }
      );
    })
  );

  const filtered_docs = new_docs.filter((doc) => doc.coordinates.length === 0);
  const setCoordinate = await Promise.all(
    filtered_docs.map(async (doc) => {
      const geocode = doc.address.replace(/ /g, "+");
      try {
        const geocodeResponse = await axios.get(
          "https://geocode-maps.yandex.ru/1.x/",
          {
            params: {
              apikey: geocoder_key,
              format: "json",
              geocode: geocode,
            },
            timeout: 5000,
          }
        );
        const result =
          geocodeResponse.data.response.GeoObjectCollection.featureMember[0]
            .GeoObject.Point.pos;
        const coordinates = result.split(" ").map(Number);
        await collection.updateOne(
          { _id: doc._id },
          { $set: { coordinates: coordinates } },
          function (err, docs) {
            if (err) throw new Error(err);
            if (docs) true;
          }
        );
      } catch (err) {
        throw new Error(err);
      }
    })
  );

}

function assignGroupByTimeDifference(arr) {
  if (!Array.isArray(arr)) {
    console.error("Invalid argument: arr should be an array");
    return;
  }
  arr.sort(
    (a, b) =>
      new Date(`1970-01-01T${a.time}Z`) - new Date(`1970-01-01T${b.time}Z`)
  );

  let maxDifferenceInMinutes = 5;
  let groupCounter = 1;
  let tempTime = arr[0].time;
  let tempDelivery = arr[0].delivery;
  let tempDate = arr[0].date;
  let groupSize = 1;

  if (arr[0].status !== 0) {
    arr[0].group = 0;
  } else {
    arr[0].group = groupCounter;
  }

  for (let i = 1; i < arr.length; i++) {
    if (arr[i].status === 0) {
      let diff =
        Math.abs(
          new Date(`1970-01-01T${arr[i].time}Z`) -
            new Date(`1970-01-01T${tempTime}Z`)
        ) / 60000;
      if (
        diff <= maxDifferenceInMinutes &&
        arr[i].delivery === tempDelivery &&
        arr[i].date === tempDate &&
        groupSize <= 6
      ) {
        arr[i].group = groupCounter;
        groupSize++;
      } else {
        groupCounter++;
        arr[i].group = groupCounter;
        tempTime = arr[i].time;
        tempDelivery = arr[i].delivery;
        tempDate = arr[i].date;
        groupSize = 1;
      }
    } else {
      arr[i].group = 0;
    }
  }
  return arr;
}

async function createOrder(orderData, token) {
  const docs = await getDocuments("orders");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = {
    189: 30,
    289: 40,
    379: 40,
    389: 40,
    449: 60,
    749: 60,
    549: 60,
  };
  let targe_time = new Date();

  const groups = {};

  for (const doc of docs) {
    const docDate = new Date(doc.date);
    docDate.setHours(0, 0, 0, 0);

    if (
      doc.group !== 0 &&
      docDate.getTime() === today.getTime() &&
      doc.time.length > 0
    ) {
      let deliveryTime = delivery[doc.delivery];
      let time = doc.time;
      let [hours, minutes] = time.split(":").map(Number);
      targe_time.setHours(hours, minutes);
      targe_time.setMinutes(targe_time.getMinutes() - deliveryTime);

      if (targe_time < new Date()) {
        if (!groups[doc.group]) {
          groups[doc.group] = [];
        }
      }
    }
  }
  for (const doc of docs) {
    if (groups[doc.group] && doc.time.length > 0) {
      groups[doc.group].push({
        point_id: doc.order,
        visit_order: groups[doc.group].length + 2,
        contact: {
          name: "Получатель",
          phone: doc.phone,
        },
        address: {
          fullname: doc.address,
          coordinates: doc.coordinates,
          comment: doc.comment,
        },
        skip_confirmation: true,
        type: "destination",
        external_order_id: doc.order.toString()
      });
    }
  }

  
  for (const groupKey of Object.keys(groups)) {
    let order = orderData;
    let group = groups[groupKey];

    order.route_points.push(...group)
    for (const doc of group) {
      order.items.push({
        pickup_point: 1,
        droppof_point: doc.point_id,
        title: "Цветы",
        cost_value: "1000.00",
        cost_currency: "RUB",
        quantity: 1,
        extra_id: doc.point_id.toString()
      })
    }
    
    const requestId = uuidv4();
    const collection = db.collection("orders");
    try {
      const response = await axios.post(
        `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/create?request_id=${requestId}`,
        order,
        {
          headers: {
            "Accept-Language": "ru",
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (response.data.status) {
        for (const item of group) {
          await collection.update(
            { order: item.point_id },
            { $set: { group: 0 } },
            function (err, res) {
              if (err) throw new Error(err);
              if (res) return true;
            }
          );
        }
      }

    } catch (error) {
      console.error(error.message);
    }
    let point = order.route_points[0];
    order.route_points = [point];
    order.items = [];
  }

  let result = [];

  for (let key in groups) {
      let subArray = [];
      for (let i = 0; i < groups[key].length; i++) {
          subArray.push({
              "address": groups[key][i].address.fullname,
              "order": groups[key][i].external_order_id
          });
      }
      result.push(subArray);
  }

  return result;
}

async function main() {
  let [res_cookie] = await getDocuments("mycollection");
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });

  if (!res_cookie) {
    console.log("No document found in cookies collection");
    res_cookie = await auth(page, db);
  }

  const flowwow = res_cookie.flowwow;
  await page.setCookie(...flowwow);

  const data = await dataGrab(page);
  if (!data) {
    await browser.close();
    return {"new_order":false,"result":false};
  } else {
    await save(data);
    await browser.close();
    const result = await createOrder(orderData, token)

    return {
      "new_order" : result.length > 0 ? true : false,
      "result": result.length > 0 ? result : false
    };
  }
};

module.exports = main;
