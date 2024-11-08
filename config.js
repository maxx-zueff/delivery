const order = {
  "items": [],
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
        "coordinates": [39.774688, 57.701295],
        "comment": "Салон цветов ЛЕПЕСТОК "
      },
      "skip_confirmation": true,
      "type": "source" //source, destination, return
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

const token = 'y0_AgAAAABom-G9AAc6MQAAAADgYVtmAd8k1lO_RLCBcOQ2H-H35JnyRsg';
const geocoder_key = 'fecf23f3-e364-49d6-a0b2-c3a2801b6bda';

module.exports = {order, token, geocoder_key}