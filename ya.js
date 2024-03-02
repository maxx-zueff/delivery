const axios = require('axios');
const uuidv4 = require('uuid').v4;

const orderData = {
    "items": [
      {
        "pickup_point": 1,
        "droppof_point": 200,
        "title": "Цветы",
        "cost_value": "1000.00",
        "cost_currency": "RUB",
        "quantity": 1
      }
    ],
    "route_points": [
      {
        "point_id": 1,
        "visit_order": 1,
        "contact": {
          "name": "Магазин",
          "phone": "+79290764295"
        },
        "address": {
          "fullname": "Россия, Ярославль, улица Бабича, 3В, Лепесток",
          "coordinates": [39.770583, 57.699097],
          "comment": "Салон цветов ЛЕПЕСТОК "
        },
        "skip_confirmation": true,
        "type": "source"
      },
      {
        "point_id": 200,
        "visit_order": 2,
        "contact": {
          "name": "Магазин",
          "phone": "+79290764295"
        },
        "address": {
          "fullname": "Ярославль, улица Бабича, 10А",
          "coordinates": [39.768633, 57.701054],
          "comment": "ююю"
        },
        "skip_confirmation": true,
        "type": "destination" //source, destination, return
      }
    ],
    "emergency_contact": {
      "name": "Цветочный магазин Лепесток",
      "phone": "+79290764295"
    },
    "client_requirements": {
      "taxi_class": "express",
      "cargo_options": [
          "auto_courier"
      ]
    }
    // "due": "2020-01-01T00:00:00+00:00"
  };


  
  const order = {
    "route_points": [
        {
          "id": 1,
            "fullname": "Ярославль, улица Бабича, 3В",
            "coordinates": [39.770583, 57.699097]
        },
        {
          "id": 2,
          "fullname": "Ярославль, улица Бабича, 10А",
          "coordinates": [39.768633, 57.701054]
        }
      ]
  }

  const token = 'y0_AgAAAABom-G9AAc6MQAAAADgYVtmAd8k1lO_RLCBcOQ2H-H35JnyRsg';
  
  async function createOrder(orderData, token) {
    const requestId = uuidv4();
    try {
    
        const newString = replaceSpacesWithPlus("Ярославль, улица Бабича, 10А")
        const geocodeResponse = await axios.get(`https://geocode-maps.yandex.ru/1.x/?apikey=e6fe2a3b-fa6d-456d-8847-502385e9b154&format=json&geocode=${newString}`);
        const result = geocodeResponse.data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos
        const coordinates = result.split(' ').map(Number);
        console.log(coordinates);

      const response = await axios.post(`https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/claims/create?request_id=${requestId}`, orderData, {
        headers: {
          'Accept-Language': 'ru',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(response.data);
      
    } catch (error) {
      console.error(error);
    }
  }

  function replaceSpacesWithPlus(inputString) {
    return inputString.replace(/ /g, '+');
}
  
  createOrder(orderData, token);