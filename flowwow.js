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
const moment = require("moment");
const flow_async = require("async");

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

async function removeOldDocs(collection, saved_docs, new_docs) {
  saved_docs.map(async (doc) => {
    if (new_docs.filter((item) => item.order === doc.order).length === 0) {
      await collection.remove({ _id: doc._id }, function (err, doc) {
        if (err) throw new Error(err);
        return doc;
      });
    }
  });
}

async function updateDocument(collection, target, update) {
  await collection.updateOne(target, { $set: update }, function (err, res) {
    if (err) throw new Error(err);
    if (res) return res;
  });
}

async function setCoordinate(item) {
  const collection = db.collection("orders");

  if (item.address.length > 0) {
    const geocode = item.address.replace(/ /g, "+");
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
      

      return coordinates;
      
    } catch (err) {
      console.log(err);
      throw new Error(err);
    }
  }
}

async function insertOrUpdate(collection, saved_docs, new_docs) {
  new_docs.map(async (item) => {
    const existingDoc = saved_docs.find((doc) => doc.order === item.order);

    if (existingDoc) {
      if (
        existingDoc.address !== item.address ||
        existingDoc.comment !== item.comment ||
        existingDoc.date !== item.date ||
        existingDoc.delivery !== item.delivery ||
        existingDoc.phone !== item.phone ||
        existingDoc.time !== item.time
      ) {
        await updateDocument(collection, { order: item.order }, item);
        if (existingDoc.address !== item.address)
          return await updateDocument(
            collection,
            { order: item.order },
            { coordinates: null }
          );
      }
    } else {
      await collection.insertOne(item, function (err, res) {
        if (err) throw new Error(err);
        if (res) return res;
      });
    }
  });
}

async function save(data) {
  const collection = db.collection("orders");
  const saved_docs = await getDocuments("orders");

  data = data.filter(
    (item, index, self) =>
      index === self.findIndex((t) => t.order === item.order)
  );


  const res1 = await removeOldDocs(collection, saved_docs, data);
  const res2 = await insertOrUpdate(collection, saved_docs, data);

  const new_docs = await getDocuments("orders");
  console.log("Из БД", new_docs)
  
  const updatedDocs = assignGroupByTimeDifference(new_docs);
  console.log("Группы", updatedDocs);
  updatedDocs.map(async (doc) => {
    await updateDocument(collection, { _id: doc._id }, { group: doc.group });
  });
  
  for (let i = 0; i < new_docs.length; i++) {
    const doc = new_docs[i];
    if (doc.coordinates === null || doc.coordinates.length === 0) {
      let coordinates = await setCoordinate(doc);
      if (coordinates !== undefined) {
        let i = await updateDocument(
          collection,
          { _id: doc._id },
          { coordinates: coordinates }
          );
      }
    }
  }
    
  // Почему возвращает без координат?
  const result = await getDocuments("orders");
  return result;
}

function assignGroupByTimeDifference(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    console.error("Invalid argument: arr should be an array");
    return;
  }

  arr = arr.filter(item => item.group !== 0);

  arr.sort((a, b) =>
    moment(`1970-01-01T${a.time}Z`).diff(moment(`1970-01-01T${b.time}Z`))
  );

  let maxDifferenceInMinutes = 16;
  let groupCounter = 1;
  let tempTime = moment(`1970-01-01T${arr[0].time}Z`);
  let tempDelivery = arr[0].delivery;
  let tempDate = arr[0].date;
  let groupSize = 1;
  arr[0].group = groupCounter;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i].group === null || arr[i].group !== 0) {
      let currentTime = moment(`1970-01-01T${arr[i].time}Z`);
      let diff = Math.abs(tempTime.diff(currentTime, "minutes"));
      if (
        diff <= maxDifferenceInMinutes &&
        arr[i].delivery === tempDelivery &&
        arr[i].date === tempDate &&
        groupSize <= 4
      ) {
        arr[i].group = groupCounter;
        groupSize++;
      } else {
        groupCounter++;
        arr[i].group = groupCounter;
        tempTime = currentTime;
        tempDelivery = arr[i].delivery;
        tempDate = arr[i].date;
        groupSize = 1;
      }
    }
  }
  return arr;
}

async function createOrder(docs, orderData, token) {
  console.log("Формирует заказ", docs)
  const groups = {};
  const today = moment().startOf("day");
  let target_time = moment();
  const delivery = {
    189: 30,
    289: 40,
    379: 40,
    389: 40,
    449: 60,
    749: 60,
    549: 60,
  };

  for (const doc of docs) {
    const docDate = moment(doc.date).startOf("day");
    if (doc.group !== 0 && docDate.isSame(today) && doc.time.length > 0) {
      let deliveryTime = delivery[doc.delivery];
      let time = doc.time;
      let [hours, minutes] = time.split(":").map(Number);
      target_time = moment()
        .hours(hours)
        .minutes(minutes)
        .subtract(deliveryTime, "minutes");

      if (target_time.isBefore(moment())) {
        if (!groups[doc.group]) {
          groups[doc.group] = [];
        }
      }
    }
  }

  for (const doc of docs) {
    
    if (groups[doc.group] && doc.time.length > 0 && doc.address.length > 0) {
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
        external_order_id: doc.order.toString(),
      });
    }
  }

  for (const groupKey of Object.keys(groups)) {
    let order = orderData;
    let group = groups[groupKey];
    order.route_points.push(...group);
    for (const doc of group) {
      order.items.push({
        pickup_point: 1,
        droppof_point: doc.point_id,
        title: "Цветы",
        cost_value: "1000.00",
        cost_currency: "RUB",
        quantity: 1,
        extra_id: doc.point_id.toString(),
      });
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
            Authorization: `Bearer ${token}`,
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
      console.error(error);
    }
    let point = order.route_points[0];
    order.route_points = [point];
    order.items = [];
  }

  return Object.values(groups).map((group) => {
    return group.map((item) => {
      return {
        address: item.address.fullname,
        order: item.external_order_id,
      };
    });
  });
}

async function main() {
  let [res_cookie] = await getDocuments("mycollection");
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });

  if (!res_cookie) {
    console.log("No document found in cookies collection");
    res_cookie = await auth(page, db);
  }

  const flowwow = res_cookie.flowwow;
  await page.setCookie(...flowwow);

  const data = await dataGrab(page);
  await browser.close();


  if (!data) {
    return { new_order: false, result: false };
  } else {
    const newData = await save(data);
    // const newData = await newSave(data);
    const result = await createOrder(newData, orderData, token);

    return {
      new_order: result.length > 0 ? true : false,
      result: result.length > 0 ? result : false,
    };
  }
}

module.exports = main;
