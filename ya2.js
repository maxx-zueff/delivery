const axios = require("axios");
const uuidv4 = require("uuid").v4;

const token = "y0_AgAAAABom-G9AAc6MQAAAADgYVtmAd8k1lO_RLCBcOQ2H-H35JnyRsg";

function replaceSpacesWithPlus(inputString) {
  return inputString.replace(/ /g, "+");
}

async function getCoordinates(inputString) {
    const newString = replaceSpacesWithPlus(inputString);
    const geocodeResponse = await axios.get(
      `https://geocode-maps.yandex.ru/1.x/?apikey=e6fe2a3b-fa6d-456d-8847-502385e9b154&format=json&geocode=${newString}`
    );
    const result =
      geocodeResponse.data.response.GeoObjectCollection.featureMember[0]
        .GeoObject.Point.pos;
    return result.split(" ").map(Number);
}

async function createOrder(inputString) {

    let coordinates = await getCoordinates(inputString);
    
    return {
        route_points: [
          {
            id: 1,
            fullname: "Ярославль, улица Бабича, 3В",
            coordinates: [39.770583, 57.699097]
          },
          {
            id: 2,
            fullname: inputString,
            coordinates: coordinates
          }
        ],
        requirements: {
          cargo_options: ["auto_courier"]
        }
      };
}



async function getPrice(order, token) {
  try {

    const response = await axios.post(
      `https://b2b.taxi.yandex.net/b2b/cargo/integration/v2/check-price`,
      order,
      {
        headers: {
          "Accept-Language": "ru",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

async function init(string) {
    let new_order = await createOrder(string);
    let response = await getPrice(new_order, token);
    console.log(response);
};

module.exports = { init };
