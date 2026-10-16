export interface NigerianState {
  name: string;
  capital: string;
  majorCities: string[];
}

export interface NigerianLandmark {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  category: 'TRANSIT_HUB' | 'JUNCTION' | 'MARKET' | 'SHOPPING_MALL' | 'PUBLIC_LANDMARK' | 'CAMPUS' | 'HOTEL' | 'FUEL_STATION';
}

export const NIGERIAN_STATES: NigerianState[] = [
  {
    "name": "Abia",
    "capital": "Umuahia",
    "majorCities": [
      "Umuahia",
      "Aba",
      "Ohafia"
    ]
  },
  {
    "name": "Adamawa",
    "capital": "Yola",
    "majorCities": [
      "Yola",
      "Jimeta",
      "Mubi"
    ]
  },
  {
    "name": "Akwa Ibom",
    "capital": "Uyo",
    "majorCities": [
      "Uyo",
      "Eket",
      "Ikot Ekpene"
    ]
  },
  {
    "name": "Anambra",
    "capital": "Awka",
    "majorCities": [
      "Awka",
      "Onitsha",
      "Nnewi"
    ]
  },
  {
    "name": "Bauchi",
    "capital": "Bauchi",
    "majorCities": [
      "Bauchi",
      "Azare",
      "Misau"
    ]
  },
  {
    "name": "Bayelsa",
    "capital": "Yenagoa",
    "majorCities": [
      "Yenagoa",
      "Amassoma",
      "Ogbia"
    ]
  },
  {
    "name": "Benue",
    "capital": "Makurdi",
    "majorCities": [
      "Makurdi",
      "Gboko",
      "Otukpo"
    ]
  },
  {
    "name": "Borno",
    "capital": "Maiduguri",
    "majorCities": [
      "Maiduguri",
      "Biu",
      "Bama"
    ]
  },
  {
    "name": "Cross River",
    "capital": "Calabar",
    "majorCities": [
      "Calabar",
      "Ikom",
      "Ogoja"
    ]
  },
  {
    "name": "Delta",
    "capital": "Asaba",
    "majorCities": [
      "Asaba",
      "Warri",
      "Ughelli",
      "Sapele"
    ]
  },
  {
    "name": "Ebonyi",
    "capital": "Abakaliki",
    "majorCities": [
      "Abakaliki",
      "Afikpo",
      "Onueke"
    ]
  },
  {
    "name": "Edo",
    "capital": "Benin City",
    "majorCities": [
      "Benin City",
      "Auchi",
      "Ekpoma"
    ]
  },
  {
    "name": "Ekiti",
    "capital": "Ado-Ekiti",
    "majorCities": [
      "Ado-Ekiti",
      "Ikere-Ekiti",
      "Ijero-Ekiti"
    ]
  },
  {
    "name": "Enugu",
    "capital": "Enugu",
    "majorCities": [
      "Enugu",
      "Nsukka",
      "Oji River"
    ]
  },
  {
    "name": "FCT Abuja",
    "capital": "Abuja",
    "majorCities": [
      "Abuja Central",
      "Gwarinpa",
      "Kubwa",
      "Lugbe",
      "Wuse",
      "Garki"
    ]
  },
  {
    "name": "Gombe",
    "capital": "Gombe",
    "majorCities": [
      "Gombe",
      "Kaltungo",
      "Billiri"
    ]
  },
  {
    "name": "Imo",
    "capital": "Owerri",
    "majorCities": [
      "Owerri",
      "Orlu",
      "Okigwe"
    ]
  },
  {
    "name": "Jigawa",
    "capital": "Dutse",
    "majorCities": [
      "Dutse",
      "Hadejia",
      "Kazaure"
    ]
  },
  {
    "name": "Kaduna",
    "capital": "Kaduna",
    "majorCities": [
      "Kaduna",
      "Zaria",
      "Kafanchan"
    ]
  },
  {
    "name": "Kano",
    "capital": "Kano",
    "majorCities": [
      "Kano Municipal",
      "Fagge",
      "Nasarawa",
      "Dala"
    ]
  },
  {
    "name": "Katsina",
    "capital": "Katsina",
    "majorCities": [
      "Katsina",
      "Daura",
      "Funtua"
    ]
  },
  {
    "name": "Kebbi",
    "capital": "Birnin Kebbi",
    "majorCities": [
      "Birnin Kebbi",
      "Argungu",
      "Yauri"
    ]
  },
  {
    "name": "Kogi",
    "capital": "Lokoja",
    "majorCities": [
      "Lokoja",
      "Okene",
      "Anyigba"
    ]
  },
  {
    "name": "Kwara",
    "capital": "Ilorin",
    "majorCities": [
      "Ilorin",
      "Offa",
      "Omu-Aran"
    ]
  },
  {
    "name": "Lagos",
    "capital": "Ikeja",
    "majorCities": [
      "Lagos Island",
      "Ikeja",
      "Lekki",
      "Ikorodu",
      "Alimosho",
      "Oshodi"
    ]
  },
  {
    "name": "Nasarawa",
    "capital": "Lafia",
    "majorCities": [
      "Lafia",
      "Keffi",
      "Mararaba",
      "Akwanga"
    ]
  },
  {
    "name": "Niger",
    "capital": "Minna",
    "majorCities": [
      "Minna",
      "Suleja",
      "Bida",
      "Kontagora"
    ]
  },
  {
    "name": "Ogun",
    "capital": "Abeokuta",
    "majorCities": [
      "Abeokuta",
      "Sagamu",
      "Ijebu-Ode",
      "Ota"
    ]
  },
  {
    "name": "Ondo",
    "capital": "Akure",
    "majorCities": [
      "Akure",
      "Ondo Town",
      "Owo"
    ]
  },
  {
    "name": "Osun",
    "capital": "Osogbo",
    "majorCities": [
      "Osogbo",
      "Ile-Ife",
      "Ilesa",
      "Ede"
    ]
  },
  {
    "name": "Oyo",
    "capital": "Ibadan",
    "majorCities": [
      "Ibadan",
      "Ogbomoso",
      "Oyo Town",
      "Iseyin"
    ]
  },
  {
    "name": "Plateau",
    "capital": "Jos",
    "majorCities": [
      "Jos",
      "Bukuru",
      "Pankshin"
    ]
  },
  {
    "name": "Rivers",
    "capital": "Port Harcourt",
    "majorCities": [
      "Port Harcourt",
      "Obio-Akpor",
      "Eleme",
      "Bonny"
    ]
  },
  {
    "name": "Sokoto",
    "capital": "Sokoto",
    "majorCities": [
      "Sokoto",
      "Tambuwal",
      "Wurno"
    ]
  },
  {
    "name": "Taraba",
    "capital": "Jalingo",
    "majorCities": [
      "Jalingo",
      "Wukari",
      "Bali"
    ]
  },
  {
    "name": "Yobe",
    "capital": "Damaturu",
    "majorCities": [
      "Damaturu",
      "Potiskum",
      "Gashua"
    ]
  },
  {
    "name": "Zamfara",
    "capital": "Gusau",
    "majorCities": [
      "Gusau",
      "Kaura Namoda",
      "Talata Mafara"
    ]
  }
];

export const ALL_NIGERIAN_LANDMARKS: NigerianLandmark[] = [
  {
    "id": "ng-lm-1",
    "name": "Main Park Aba",
    "address": "Asa Road, Aba",
    "city": "Aba",
    "state": "Abia",
    "latitude": 5.1066,
    "longitude": 7.3667,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-2",
    "name": "Isi Gate Roundabout",
    "address": "Umuahia Central, Umuahia",
    "city": "Umuahia",
    "state": "Abia",
    "latitude": 5.5265,
    "longitude": 7.4896,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-3",
    "name": "Ariaria Market Junction",
    "address": "Faulks Road, Aba",
    "city": "Aba",
    "state": "Abia",
    "latitude": 5.1278,
    "longitude": 7.3489,
    "category": "MARKET"
  },
  {
    "id": "ng-lm-4",
    "name": "Jimeta Modern Market",
    "address": "Mohammed Mustapha Way, Jimeta",
    "city": "Jimeta",
    "state": "Adamawa",
    "latitude": 9.2789,
    "longitude": 12.4489,
    "category": "MARKET"
  },
  {
    "id": "ng-lm-5",
    "name": "Yola Town Flyover",
    "address": "Lamido Zubairu Way, Yola",
    "city": "Yola",
    "state": "Adamawa",
    "latitude": 9.2003,
    "longitude": 12.48,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-6",
    "name": "Ibom Plaza Roundabout",
    "address": "Oron Road, Uyo",
    "city": "Uyo",
    "state": "Akwa Ibom",
    "latitude": 5.0377,
    "longitude": 7.9128,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-7",
    "name": "Itam Motor Park",
    "address": "Itam Junction, Itu Road, Uyo",
    "city": "Uyo",
    "state": "Akwa Ibom",
    "latitude": 5.056,
    "longitude": 7.892,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-8",
    "name": "Tropicana Mall Uyo",
    "address": "Udo Udoma Avenue, Uyo",
    "city": "Uyo",
    "state": "Akwa Ibom",
    "latitude": 5.0125,
    "longitude": 7.94,
    "category": "SHOPPING_MALL"
  },
  {
    "id": "ng-lm-9",
    "name": "Upper Iweka Flyover",
    "address": "Enugu-Onitsha Expressway, Onitsha",
    "city": "Onitsha",
    "state": "Anambra",
    "latitude": 6.1368,
    "longitude": 6.7933,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-10",
    "name": "Aroma Junction Awka",
    "address": "Enugu-Onitsha Expressway, Awka",
    "city": "Awka",
    "state": "Anambra",
    "latitude": 6.2209,
    "longitude": 7.0706,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-11",
    "name": "Onitsha Main Market",
    "address": "Old Market Road, Onitsha",
    "city": "Onitsha",
    "state": "Anambra",
    "latitude": 6.155,
    "longitude": 6.776,
    "category": "MARKET"
  },
  {
    "id": "ng-lm-12",
    "name": "Ekwulobia Roundabout",
    "address": "Uga Road, Ekwulobia",
    "city": "Ekwulobia",
    "state": "Anambra",
    "latitude": 6.024,
    "longitude": 7.085,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-13",
    "name": "Bauchi Central Motor Park",
    "address": "Jos Road, Bauchi",
    "city": "Bauchi",
    "state": "Bauchi",
    "latitude": 10.3158,
    "longitude": 9.8442,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-14",
    "name": "Emir Palace Roundabout",
    "address": "Ahmadu Bello Way, Bauchi",
    "city": "Bauchi",
    "state": "Bauchi",
    "latitude": 10.311,
    "longitude": 9.843,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-15",
    "name": "Tombia Roundabout",
    "address": "Melford Okilo Road, Yenagoa",
    "city": "Yenagoa",
    "state": "Bayelsa",
    "latitude": 4.9602,
    "longitude": 6.3278,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-16",
    "name": "Swali Market Transit Hub",
    "address": "Swali Waterfront, Yenagoa",
    "city": "Yenagoa",
    "state": "Bayelsa",
    "latitude": 4.912,
    "longitude": 6.289,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-17",
    "name": "Wurukum Roundabout",
    "address": "Kashim Ibrahim Road, Makurdi",
    "city": "Makurdi",
    "state": "Benue",
    "latitude": 7.7322,
    "longitude": 8.5392,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-18",
    "name": "North Bank Junction",
    "address": "Lafia Road, Makurdi",
    "city": "Makurdi",
    "state": "Benue",
    "latitude": 7.751,
    "longitude": 8.544,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-19",
    "name": "Post Office Roundabout",
    "address": "Kashim Ibrahim Way, Maiduguri",
    "city": "Maiduguri",
    "state": "Borno",
    "latitude": 11.8333,
    "longitude": 13.15,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-20",
    "name": "Baga Road Market Park",
    "address": "Baga Road, Maiduguri",
    "city": "Maiduguri",
    "state": "Borno",
    "latitude": 11.865,
    "longitude": 13.142,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-21",
    "name": "Watt Market Terminal",
    "address": "Calabar Road, Calabar",
    "city": "Calabar",
    "state": "Cross River",
    "latitude": 4.9589,
    "longitude": 8.3269,
    "category": "MARKET"
  },
  {
    "id": "ng-lm-22",
    "name": "Marian Market Roundabout",
    "address": "Ndidem Usang Iso Road, Calabar",
    "city": "Calabar",
    "state": "Cross River",
    "latitude": 4.975,
    "longitude": 8.341,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-23",
    "name": "8 Miles Flyover",
    "address": "Murtala Mohammed Highway, Calabar",
    "city": "Calabar",
    "state": "Cross River",
    "latitude": 5.042,
    "longitude": 8.351,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-24",
    "name": "Summit Junction Asaba",
    "address": "Benin-Asaba Expressway, Asaba",
    "city": "Asaba",
    "state": "Delta",
    "latitude": 6.1989,
    "longitude": 6.7022,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-25",
    "name": "Head Bridge Asaba Terminal",
    "address": "Onitsha-Asaba Bridgehead, Asaba",
    "city": "Asaba",
    "state": "Delta",
    "latitude": 6.162,
    "longitude": 6.758,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-26",
    "name": "Effurun Roundabout",
    "address": "PTI Road, Warri/Effurun",
    "city": "Warri",
    "state": "Delta",
    "latitude": 5.5586,
    "longitude": 5.7831,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-27",
    "name": "Enerhen Junction",
    "address": "Warri-Sapele Road, Warri",
    "city": "Warri",
    "state": "Delta",
    "latitude": 5.524,
    "longitude": 5.762,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-28",
    "name": "Vanco Junction",
    "address": "Ogoja Road, Abakaliki",
    "city": "Abakaliki",
    "state": "Ebonyi",
    "latitude": 6.3249,
    "longitude": 8.1137,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-29",
    "name": "International Market Park",
    "address": "Trans-Sahara Highway, Abakaliki",
    "city": "Abakaliki",
    "state": "Ebonyi",
    "latitude": 6.342,
    "longitude": 8.095,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-30",
    "name": "King Square (Ring Road)",
    "address": "Ring Road Roundabout, Benin City",
    "city": "Benin City",
    "state": "Edo",
    "latitude": 6.335,
    "longitude": 5.6275,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-31",
    "name": "Ramat Park Ikpoba Hill",
    "address": "Agbor Road, Benin City",
    "city": "Benin City",
    "state": "Edo",
    "latitude": 6.354,
    "longitude": 5.656,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-32",
    "name": "Uselu Shell Ramp",
    "address": "Lagos-Benin Expressway, Uselu, Benin City",
    "city": "Benin City",
    "state": "Edo",
    "latitude": 6.376,
    "longitude": 5.608,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-33",
    "name": "Ekpoma Junction Ambrose Alli",
    "address": "Benin-Auchi Road, Ekpoma",
    "city": "Ekpoma",
    "state": "Edo",
    "latitude": 6.742,
    "longitude": 6.138,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-34",
    "name": "Fajuyi Memorial Park",
    "address": "Secretariat Road, Ado-Ekiti",
    "city": "Ado-Ekiti",
    "state": "Ekiti",
    "latitude": 7.6294,
    "longitude": 5.2214,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-35",
    "name": "Okeyinmi Roundabout",
    "address": "Ijigbo Street, Ado-Ekiti",
    "city": "Ado-Ekiti",
    "state": "Ekiti",
    "latitude": 7.618,
    "longitude": 5.231,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-36",
    "name": "Holy Ghost Park Terminal",
    "address": "Old Park Road, Enugu",
    "city": "Enugu",
    "state": "Enugu",
    "latitude": 6.4428,
    "longitude": 7.4989,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-37",
    "name": "Okpara Square",
    "address": "Independence Layout, Enugu",
    "city": "Enugu",
    "state": "Enugu",
    "latitude": 6.438,
    "longitude": 7.514,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-38",
    "name": "New Market Roundabout",
    "address": "Abakaliki Road, GRA, Enugu",
    "city": "Enugu",
    "state": "Enugu",
    "latitude": 6.456,
    "longitude": 7.481,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-39",
    "name": "Opi Junction Nsukka",
    "address": "Enugu-Makurdi Expressway, Nsukka",
    "city": "Nsukka",
    "state": "Enugu",
    "latitude": 6.829,
    "longitude": 7.424,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-40",
    "name": "Gwarinpa Estate 1st Gate",
    "address": "Kubwa Expressway, Gwarinpa, Abuja",
    "city": "Gwarinpa",
    "state": "FCT Abuja",
    "latitude": 9.1089,
    "longitude": 7.4092,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-41",
    "name": "Wuse Zone 4 Interchange",
    "address": "Herbert Macaulay Way, Wuse, Abuja",
    "city": "Wuse",
    "state": "FCT Abuja",
    "latitude": 9.0622,
    "longitude": 7.4719,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-42",
    "name": "Berger Roundabout Abuja",
    "address": "Shehu Shagari Way / Olusegun Obasanjo Way, Abuja",
    "city": "Wuse",
    "state": "FCT Abuja",
    "latitude": 9.0711,
    "longitude": 7.4644,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-43",
    "name": "Jabi Lake Mall Terminal",
    "address": "Bala Sokoto Way, Jabi, Abuja",
    "city": "Jabi",
    "state": "FCT Abuja",
    "latitude": 9.0769,
    "longitude": 7.4258,
    "category": "SHOPPING_MALL"
  },
  {
    "id": "ng-lm-44",
    "name": "Area 1 Motor Park",
    "address": "Garki Area 1, Abuja",
    "city": "Garki",
    "state": "FCT Abuja",
    "latitude": 9.0289,
    "longitude": 7.4819,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-45",
    "name": "Kubwa Federal Housing Gate",
    "address": "Kubwa Expressway, Abuja",
    "city": "Kubwa",
    "state": "FCT Abuja",
    "latitude": 9.148,
    "longitude": 7.332,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-46",
    "name": "Lugbe Airport Road Bridge",
    "address": "Umaru Musa YarAdua Expressway, Lugbe, Abuja",
    "city": "Lugbe",
    "state": "FCT Abuja",
    "latitude": 8.972,
    "longitude": 7.378,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-47",
    "name": "Nyanya Bridge Interchange",
    "address": "Keffi-Abuja Expressway, Nyanya, Abuja",
    "city": "Nyanya",
    "state": "FCT Abuja",
    "latitude": 9.034,
    "longitude": 7.585,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-48",
    "name": "Gombe Central Park",
    "address": "Bauchi Road, Gombe",
    "city": "Gombe",
    "state": "Gombe",
    "latitude": 10.2897,
    "longitude": 11.1673,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-49",
    "name": "Emir Palace Roundabout Gombe",
    "address": "Ashaka Road, Gombe",
    "city": "Gombe",
    "state": "Gombe",
    "latitude": 10.282,
    "longitude": 11.178,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-50",
    "name": "Control Post Roundabout",
    "address": "Onitsha-Owerri Road, Owerri",
    "city": "Owerri",
    "state": "Imo",
    "latitude": 5.4839,
    "longitude": 7.0142,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-51",
    "name": "Wetheral Road Interchange",
    "address": "Wetheral / Douglas Road, Owerri",
    "city": "Owerri",
    "state": "Imo",
    "latitude": 5.481,
    "longitude": 7.035,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-52",
    "name": "Relief Market Motor Park",
    "address": "Egbu Road, Owerri",
    "city": "Owerri",
    "state": "Imo",
    "latitude": 5.475,
    "longitude": 7.052,
    "category": "MARKET"
  },
  {
    "id": "ng-lm-53",
    "name": "Dutse Central Motor Park",
    "address": "Kano-Maiduguri Road, Dutse",
    "city": "Dutse",
    "state": "Jigawa",
    "latitude": 11.7562,
    "longitude": 9.3389,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-54",
    "name": "Hadejia Emirate Junction",
    "address": "Nguru Road, Hadejia",
    "city": "Hadejia",
    "state": "Jigawa",
    "latitude": 12.451,
    "longitude": 10.042,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-55",
    "name": "Command Junction Kaduna",
    "address": "Abuja-Kaduna Expressway, Kaduna South",
    "city": "Kaduna",
    "state": "Kaduna",
    "latitude": 10.4619,
    "longitude": 7.4203,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-56",
    "name": "Kawo Flyover Terminal",
    "address": "Zaria Road, Kawo, Kaduna",
    "city": "Kaduna",
    "state": "Kaduna",
    "latitude": 10.562,
    "longitude": 7.451,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-57",
    "name": "Station Roundabout Kaduna",
    "address": "Ahmadu Bello Way, Kaduna",
    "city": "Kaduna",
    "state": "Kaduna",
    "latitude": 10.512,
    "longitude": 7.432,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-58",
    "name": "PZ Junction Zaria",
    "address": "Sokoto Road, Zaria",
    "city": "Zaria",
    "state": "Kaduna",
    "latitude": 11.082,
    "longitude": 7.712,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-59",
    "name": "Kofar Ruwa Flyover",
    "address": "Katsina Road, Kano",
    "city": "Kano",
    "state": "Kano",
    "latitude": 12.0125,
    "longitude": 8.5144,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-60",
    "name": "Sabon Gari Luxury Bus Park",
    "address": "New Road, Sabon Gari, Kano",
    "city": "Kano",
    "state": "Kano",
    "latitude": 12.001,
    "longitude": 8.541,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-61",
    "name": "Dangi Flyover Roundabout",
    "address": "Zaria Road, Kano",
    "city": "Kano",
    "state": "Kano",
    "latitude": 11.968,
    "longitude": 8.528,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-62",
    "name": "Bata Roundabout",
    "address": "Murtala Mohammed Way, Kano",
    "city": "Kano",
    "state": "Kano",
    "latitude": 11.996,
    "longitude": 8.532,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-63",
    "name": "Kofar Kwaya Roundabout",
    "address": "Kano Road, Katsina",
    "city": "Katsina",
    "state": "Katsina",
    "latitude": 12.9889,
    "longitude": 7.6014,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-64",
    "name": "Funtua Motor Park Terminal",
    "address": "Zaria-Sokoto Road, Funtua",
    "city": "Funtua",
    "state": "Katsina",
    "latitude": 11.524,
    "longitude": 7.311,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-65",
    "name": "Haliru Abdu Roundabout",
    "address": "Ahmadu Bello Way, Birnin Kebbi",
    "city": "Birnin Kebbi",
    "state": "Kebbi",
    "latitude": 12.4539,
    "longitude": 4.1975,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-66",
    "name": "Argungu Fishing Village Gate",
    "address": "Sokoto Road, Argungu",
    "city": "Argungu",
    "state": "Kebbi",
    "latitude": 12.742,
    "longitude": 4.532,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-67",
    "name": "Ganaja Junction Lokoja",
    "address": "Ajaokuta Road, Lokoja",
    "city": "Lokoja",
    "state": "Kogi",
    "latitude": 7.7844,
    "longitude": 6.7411,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-68",
    "name": "Nataco Transit Terminal",
    "address": "Abuja-Lokoja Highway, Lokoja",
    "city": "Lokoja",
    "state": "Kogi",
    "latitude": 7.821,
    "longitude": 6.729,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-69",
    "name": "Okene Total Roundabout",
    "address": "Auchi Road, Okene",
    "city": "Okene",
    "state": "Kogi",
    "latitude": 7.551,
    "longitude": 6.236,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-70",
    "name": "General Roundabout Ilorin",
    "address": "Murtala Mohammed Way, Ilorin",
    "city": "Ilorin",
    "state": "Kwara",
    "latitude": 8.4966,
    "longitude": 4.5421,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-71",
    "name": "Gari Alimi Flyover",
    "address": "Asa Dam Road, Ilorin",
    "city": "Ilorin",
    "state": "Kwara",
    "latitude": 8.468,
    "longitude": 4.531,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-72",
    "name": "Post Office Interchange",
    "address": "Muritala Way, Ilorin",
    "city": "Ilorin",
    "state": "Kwara",
    "latitude": 8.49,
    "longitude": 4.553,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-73",
    "name": "Berger Bus Stop",
    "address": "Lagos-Ibadan Expressway, Berger, Lagos",
    "city": "Berger",
    "state": "Lagos",
    "latitude": 6.6521,
    "longitude": 3.3591,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-74",
    "name": "Ojota Interchange Terminal",
    "address": "Ikorodu Road, Ojota, Lagos",
    "city": "Ojota",
    "state": "Lagos",
    "latitude": 6.5892,
    "longitude": 3.3853,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-75",
    "name": "Lekki Phase 1 Toll Gate",
    "address": "Lekki-Epe Expressway, Lekki, Lagos",
    "city": "Lekki",
    "state": "Lagos",
    "latitude": 6.4351,
    "longitude": 3.4411,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-76",
    "name": "Ajah Roundabout Terminal",
    "address": "Lekki-Epe Expressway, Ajah, Lagos",
    "city": "Ajah",
    "state": "Lagos",
    "latitude": 6.4674,
    "longitude": 3.5683,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-77",
    "name": "CMS Marina Terminal",
    "address": "Marina, Lagos Island, Lagos",
    "city": "Lagos Island",
    "state": "Lagos",
    "latitude": 6.4522,
    "longitude": 3.3911,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-78",
    "name": "Oshodi Transport Interchange",
    "address": "Agege Motor Road, Oshodi, Lagos",
    "city": "Oshodi",
    "state": "Lagos",
    "latitude": 6.5569,
    "longitude": 3.3514,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-79",
    "name": "Ikeja City Mall (Alausa)",
    "address": "Obafemi Awolowo Way, Ikeja, Lagos",
    "city": "Ikeja",
    "state": "Lagos",
    "latitude": 6.6194,
    "longitude": 3.3581,
    "category": "SHOPPING_MALL"
  },
  {
    "id": "ng-lm-80",
    "name": "Maryland Mall",
    "address": "Ikorodu Road, Maryland, Lagos",
    "city": "Maryland",
    "state": "Lagos",
    "latitude": 6.5721,
    "longitude": 3.3681,
    "category": "SHOPPING_MALL"
  },
  {
    "id": "ng-lm-81",
    "name": "Yaba Tech / Sabo Hub",
    "address": "Commercial Avenue, Yaba, Lagos",
    "city": "Yaba",
    "state": "Lagos",
    "latitude": 6.5165,
    "longitude": 3.3768,
    "category": "CAMPUS"
  },
  {
    "id": "ng-lm-82",
    "name": "Ikorodu BRT Terminal",
    "address": "Sagamu Road, Ikorodu, Lagos",
    "city": "Ikorodu",
    "state": "Lagos",
    "latitude": 6.6194,
    "longitude": 3.5081,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-83",
    "name": "Victoria Island Eko Hotel",
    "address": "Adetokunbo Ademola, Victoria Island, Lagos",
    "city": "Victoria Island",
    "state": "Lagos",
    "latitude": 6.4281,
    "longitude": 3.4219,
    "category": "HOTEL"
  },
  {
    "id": "ng-lm-84",
    "name": "Festac 1st Gate",
    "address": "Badagry Expressway, Festac, Lagos",
    "city": "Festac",
    "state": "Lagos",
    "latitude": 6.462,
    "longitude": 3.298,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-85",
    "name": "Mararaba Checkpoint Terminal",
    "address": "Abuja-Keffi Road, Mararaba",
    "city": "Mararaba",
    "state": "Nasarawa",
    "latitude": 9.0225,
    "longitude": 7.5942,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-86",
    "name": "Keffi Flyover Roundabout",
    "address": "Akwanga Road, Keffi",
    "city": "Keffi",
    "state": "Nasarawa",
    "latitude": 8.8475,
    "longitude": 7.8736,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-87",
    "name": "Lafia Modern Motor Park",
    "address": "Jos Road, Lafia",
    "city": "Lafia",
    "state": "Nasarawa",
    "latitude": 8.493,
    "longitude": 8.517,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-88",
    "name": "Suleja Babangida Market Park",
    "address": "Kaduna-Abuja Road, Suleja",
    "city": "Suleja",
    "state": "Niger",
    "latitude": 9.1789,
    "longitude": 7.1814,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-89",
    "name": "Mobil Roundabout Minna",
    "address": "Paiko Road, Minna",
    "city": "Minna",
    "state": "Niger",
    "latitude": 9.6142,
    "longitude": 6.5569,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-90",
    "name": "Panseke Garage Terminal",
    "address": "Ibara Road, Abeokuta",
    "city": "Abeokuta",
    "state": "Ogun",
    "latitude": 7.1475,
    "longitude": 3.3422,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-91",
    "name": "Sagamu Interchange",
    "address": "Lagos-Ibadan / Benin Expressway Interchange, Sagamu",
    "city": "Sagamu",
    "state": "Ogun",
    "latitude": 6.8489,
    "longitude": 3.6475,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-92",
    "name": "Ota Toll Gate",
    "address": "Lagos-Abeokuta Expressway, Ota",
    "city": "Ota",
    "state": "Ogun",
    "latitude": 6.685,
    "longitude": 3.238,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-93",
    "name": "Ijebu-Ode Bobasua Roundabout",
    "address": "Ibadan Road, Ijebu-Ode",
    "city": "Ijebu-Ode",
    "state": "Ogun",
    "latitude": 6.821,
    "longitude": 3.921,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-94",
    "name": "Cathedral Roundabout Akure",
    "address": "Oyemekun Road, Akure",
    "city": "Akure",
    "state": "Ondo",
    "latitude": 7.2526,
    "longitude": 5.1931,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-95",
    "name": "Ondo Garage Terminal",
    "address": "Ilesha-Owo Expressway, Akure",
    "city": "Akure",
    "state": "Ondo",
    "latitude": 7.241,
    "longitude": 5.214,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-96",
    "name": "Olaiya Flyover, Osogbo",
    "address": "Gbongan-Ibadan Road, Osogbo",
    "city": "Osogbo",
    "state": "Osun",
    "latitude": 7.7667,
    "longitude": 4.5572,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-osun-old-garage",
    "name": "Old Garage Central Motor Park",
    "address": "Station Road / MDS, Osogbo",
    "city": "Osogbo",
    "state": "Osun",
    "latitude": 7.7725,
    "longitude": 4.5615,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-osun-okefia",
    "name": "Oke-Fia Roundabout",
    "address": "Oke-Fia Express, Osogbo",
    "city": "Osogbo",
    "state": "Osun",
    "latitude": 7.7695,
    "longitude": 4.5445,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-osun-secretariat",
    "name": "Osun State Secretariat Abere",
    "address": "Gbongan-Osogbo Road, Abere",
    "city": "Osogbo",
    "state": "Osun",
    "latitude": 7.7380,
    "longitude": 4.5290,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-osun-uniosun",
    "name": "UNIOSUN Main Campus",
    "address": "Oke-Baale, Osogbo",
    "city": "Osogbo",
    "state": "Osun",
    "latitude": 7.7880,
    "longitude": 4.5910,
    "category": "CAMPUS"
  },
  {
    "id": "ng-lm-97",
    "name": "Mayfair Roundabout, Ile-Ife",
    "address": "Ibadan Road, Ile-Ife",
    "city": "Ile-Ife",
    "state": "Osun",
    "latitude": 7.502,
    "longitude": 4.538,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-osun-oau-gate",
    "name": "OAU Campus Main Gate",
    "address": "Road 1, Obafemi Awolowo University, Ile-Ife",
    "city": "Ile-Ife",
    "state": "Osun",
    "latitude": 7.5180,
    "longitude": 4.5290,
    "category": "CAMPUS"
  },
  {
    "id": "ng-lm-osun-lagere",
    "name": "Lagere Commercial Hub & Park",
    "address": "Lagere Road, Ile-Ife",
    "city": "Ile-Ife",
    "state": "Osun",
    "latitude": 7.4850,
    "longitude": 4.5450,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-osun-ede-poly",
    "name": "Federal Polytechnic Main Gate, Ede",
    "address": "Poly Road, Ede",
    "city": "Ede",
    "state": "Osun",
    "latitude": 7.7420,
    "longitude": 4.4550,
    "category": "CAMPUS"
  },
  {
    "id": "ng-lm-osun-adeleke-univ",
    "name": "Adeleke University Campus Gate",
    "address": "Loogun-Ogberin Road, Ede",
    "city": "Ede",
    "state": "Osun",
    "latitude": 7.7280,
    "longitude": 4.4390,
    "category": "CAMPUS"
  },
  {
    "id": "ng-lm-osun-ilesa-roundabout",
    "name": "Ilesa Central Roundabout",
    "address": "Akure-Ilesa Expressway Junction, Ilesa",
    "city": "Ilesa",
    "state": "Osun",
    "latitude": 7.6280,
    "longitude": 4.7410,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-osun-wesley",
    "name": "Wesley Guild Hospital Junction",
    "address": "Hospital Road, Ilesa",
    "city": "Ilesa",
    "state": "Osun",
    "latitude": 7.6350,
    "longitude": 4.7520,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-osun-ikirun-park",
    "name": "Ikirun Central Garage",
    "address": "Offa Road, Ikirun",
    "city": "Ikirun",
    "state": "Osun",
    "latitude": 7.9150,
    "longitude": 4.6720,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-osun-bowen-gate",
    "name": "Bowen University Main Gate",
    "address": "Bowen Road, Iwo",
    "city": "Iwo",
    "state": "Osun",
    "latitude": 7.6320,
    "longitude": 4.1850,
    "category": "CAMPUS"
  },
  {
    "id": "ng-lm-98",
    "name": "Iwo Road Interchange",
    "address": "Lagos-Ibadan Expressway, Iwo Road, Ibadan",
    "city": "Iwo Road",
    "state": "Oyo",
    "latitude": 7.4019,
    "longitude": 3.9472,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-99",
    "name": "Challenge Bus Stop Terminal",
    "address": "Lagos-Ibadan Express Bypass, Challenge, Ibadan",
    "city": "Challenge",
    "state": "Oyo",
    "latitude": 7.3489,
    "longitude": 3.8761,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-100",
    "name": "Dugbe Commercial Central",
    "address": "Queen Elizabeth II Road, Dugbe, Ibadan",
    "city": "Dugbe",
    "state": "Oyo",
    "latitude": 7.3872,
    "longitude": 3.8844,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-101",
    "name": "Bodija Market Terminal",
    "address": "Secretariat Road, Bodija, Ibadan",
    "city": "Bodija",
    "state": "Oyo",
    "latitude": 7.432,
    "longitude": 3.905,
    "category": "MARKET"
  },
  {
    "id": "ng-lm-102",
    "name": "University of Ibadan Main Gate",
    "address": "Ojo Road, UI, Ibadan",
    "city": "UI",
    "state": "Oyo",
    "latitude": 7.445,
    "longitude": 3.901,
    "category": "CAMPUS"
  },
  {
    "id": "ng-lm-103",
    "name": "Ogbomoso Caretaker Roundabout",
    "address": "Ilorin Road, Ogbomoso",
    "city": "Ogbomoso",
    "state": "Oyo",
    "latitude": 8.133,
    "longitude": 4.241,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-104",
    "name": "Terminus Roundabout Jos",
    "address": "Ahmadu Bello Way, Jos",
    "city": "Jos",
    "state": "Plateau",
    "latitude": 9.9285,
    "longitude": 8.8921,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-105",
    "name": "British America Junction",
    "address": "Murtala Mohammed Way, Jos",
    "city": "Jos",
    "state": "Plateau",
    "latitude": 9.914,
    "longitude": 8.885,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-106",
    "name": "Old Airport Junction Bukuru",
    "address": "Yakubu Gowon Way, Jos",
    "city": "Jos",
    "state": "Plateau",
    "latitude": 9.871,
    "longitude": 8.871,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-107",
    "name": "Waterlines Junction Flyover",
    "address": "Aba Road, Port Harcourt",
    "city": "Aba Road",
    "state": "Rivers",
    "latitude": 4.8219,
    "longitude": 7.0092,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-108",
    "name": "Garrison Roundabout Terminal",
    "address": "Aba Road, Port Harcourt",
    "city": "Garrison",
    "state": "Rivers",
    "latitude": 4.795,
    "longitude": 7.014,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-109",
    "name": "Rumuokoro Flyover Terminal",
    "address": "East-West Road, Port Harcourt",
    "city": "Rumuokoro",
    "state": "Rivers",
    "latitude": 4.8689,
    "longitude": 6.9856,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-110",
    "name": "Mile 1 Flyover Park",
    "address": "Ikwerre Road, Diobu, Port Harcourt",
    "city": "Diobu",
    "state": "Rivers",
    "latitude": 4.782,
    "longitude": 7.002,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-111",
    "name": "Choba UNIPORT Junction",
    "address": "East-West Road, Choba, Port Harcourt",
    "city": "Choba",
    "state": "Rivers",
    "latitude": 4.896,
    "longitude": 6.912,
    "category": "CAMPUS"
  },
  {
    "id": "ng-lm-112",
    "name": "Oil Mill Market Junction",
    "address": "Aba-Port Harcourt Expressway, Elelenwo",
    "city": "Oil Mill",
    "state": "Rivers",
    "latitude": 4.845,
    "longitude": 7.071,
    "category": "MARKET"
  },
  {
    "id": "ng-lm-113",
    "name": "Sultan Palace Roundabout",
    "address": "Sultan Bello Road, Sokoto",
    "city": "Sokoto",
    "state": "Sokoto",
    "latitude": 13.0622,
    "longitude": 5.2339,
    "category": "PUBLIC_LANDMARK"
  },
  {
    "id": "ng-lm-114",
    "name": "Central Motor Park Sokoto",
    "address": "Gusau Road, Sokoto",
    "city": "Sokoto",
    "state": "Sokoto",
    "latitude": 13.048,
    "longitude": 5.245,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-115",
    "name": "Jalingo City Gate Roundabout",
    "address": "Hammanruwa Way, Jalingo",
    "city": "Jalingo",
    "state": "Taraba",
    "latitude": 8.8922,
    "longitude": 11.3653,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-116",
    "name": "Wukari Central Junction",
    "address": "Takum Road, Wukari",
    "city": "Wukari",
    "state": "Taraba",
    "latitude": 7.871,
    "longitude": 9.778,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-117",
    "name": "Potiskum Cattle Market Park",
    "address": "Kano-Maiduguri Road, Potiskum",
    "city": "Potiskum",
    "state": "Yobe",
    "latitude": 11.7089,
    "longitude": 11.0811,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-118",
    "name": "Damaturu City Gate Roundabout",
    "address": "Maiduguri Road, Damaturu",
    "city": "Damaturu",
    "state": "Yobe",
    "latitude": 11.745,
    "longitude": 11.962,
    "category": "JUNCTION"
  },
  {
    "id": "ng-lm-119",
    "name": "Gusau Central Motor Park",
    "address": "Sokoto Road, Gusau",
    "city": "Gusau",
    "state": "Zamfara",
    "latitude": 12.1628,
    "longitude": 6.6614,
    "category": "TRANSIT_HUB"
  },
  {
    "id": "ng-lm-120",
    "name": "Government House Roundabout",
    "address": "Canteen Daji, Gusau",
    "city": "Gusau",
    "state": "Zamfara",
    "latitude": 12.17,
    "longitude": 6.671,
    "category": "PUBLIC_LANDMARK"
  }
];

export function searchNigerianLocations(query: string, stateFilter?: string): NigerianLandmark[] {
  const q = query.trim().toLowerCase();
  const normalizedState = stateFilter && stateFilter !== 'ALL' ? stateFilter.toLowerCase() : undefined;

  // When no query is entered, strictly return landmarks from the user's selected/home state
  if (!q) {
    if (normalizedState) {
      const stateLandmarks = ALL_NIGERIAN_LANDMARKS.filter(
        (lm) => lm.state.toLowerCase() === normalizedState
      );
      if (stateLandmarks.length > 0) return stateLandmarks;
    }
    return ALL_NIGERIAN_LANDMARKS.slice(0, 25);
  }

  // When a query is entered, search across all Nigerian landmarks but prioritize matches in the home state
  const directLandmarks = ALL_NIGERIAN_LANDMARKS.filter((lm) => {
    return (
      lm.name.toLowerCase().includes(q) ||
      lm.city.toLowerCase().includes(q) ||
      lm.state.toLowerCase().includes(q) ||
      lm.address.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    // 1. Boost items in the user's home state
    const aInState = normalizedState && a.state.toLowerCase() === normalizedState;
    const bInState = normalizedState && b.state.toLowerCase() === normalizedState;
    if (aInState && !bInState) return -1;
    if (!aInState && bInState) return 1;

    // 2. Boost items that start with the query
    const aStarts =
      a.name.toLowerCase().startsWith(q) ||
      a.city.toLowerCase().startsWith(q) ||
      a.state.toLowerCase().startsWith(q);
    const bStarts =
      b.name.toLowerCase().startsWith(q) ||
      b.city.toLowerCase().startsWith(q) ||
      b.state.toLowerCase().startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    return 0;
  });

  // Also match NIGERIAN_STATES for state names, capitals, or major cities
  const cityStateMatches: NigerianLandmark[] = [];
  const existingNames = new Set(directLandmarks.map((lm) => lm.name.toLowerCase()));

  for (const state of NIGERIAN_STATES) {
    const isHome = normalizedState && state.name.toLowerCase() === normalizedState;

    // Match state capital
    if (
      state.capital.toLowerCase().includes(q) &&
      !existingNames.has(`${state.capital} Central Motor Park & Interchange`.toLowerCase())
    ) {
      cityStateMatches.push({
        id: `state-cap-${state.capital.toLowerCase()}`,
        name: `${state.capital} Central Motor Park & Interchange`,
        address: `${state.capital} Express Corridor`,
        city: state.capital,
        state: state.name,
        latitude: isHome ? directLandmarks[0]?.latitude || 6.5244 : 9.0765,
        longitude: isHome ? directLandmarks[0]?.longitude || 3.3792 : 7.3986,
        category: 'TRANSIT_HUB',
      });
      existingNames.add(`${state.capital} Central Motor Park & Interchange`.toLowerCase());
    }

    // Match major cities
    for (const city of state.majorCities) {
      if (
        city.toLowerCase().includes(q) &&
        !existingNames.has(`${city} Main Highway Transit Junction`.toLowerCase())
      ) {
        cityStateMatches.push({
          id: `city-${city.toLowerCase()}`,
          name: `${city} Main Highway Transit Junction`,
          address: `${city} Corridor Bypass`,
          city: city,
          state: state.name,
          latitude: isHome ? directLandmarks[0]?.latitude || 6.5244 : 9.0765,
          longitude: isHome ? directLandmarks[0]?.longitude || 3.3792 : 7.3986,
          category: 'TRANSIT_HUB',
        });
        existingNames.add(`${city} Main Highway Transit Junction`.toLowerCase());
      }
    }
  }

  // If matches in state exist, they are at the top, followed by interstate matches
  return [...directLandmarks, ...cityStateMatches].slice(0, 35);
}

export interface StateRouteDefaults {
  origin: { label: string; landmark: string; latitude: number; longitude: number };
  destination: { label: string; landmark: string; latitude: number; longitude: number };
}

export const STATE_ROUTE_DEFAULTS: Record<string, StateRouteDefaults> = {
  'Osun': {
    origin: { label: 'Olaiya Flyover, Osogbo', landmark: 'Olaiya Flyover, Osogbo', latitude: 7.7667, longitude: 4.5572 },
    destination: { label: 'Mayfair Roundabout, Ile-Ife', landmark: 'Mayfair Roundabout, Ile-Ife', latitude: 7.502, longitude: 4.538 },
  },
  'Lagos': {
    origin: { label: 'Berger Bus Stop, Lagos', landmark: 'Oando Filling Station Berger', latitude: 6.6521, longitude: 3.3591 },
    destination: { label: 'Admiralty Way, Lekki Phase 1', landmark: 'Admiralty Way, Lekki', latitude: 6.4281, longitude: 3.4219 },
  },
  'FCT Abuja': {
    origin: { label: 'Gwarinpa Estate, Abuja', landmark: 'Gwarinpa 1st Gate', latitude: 9.1089, longitude: 7.4092 },
    destination: { label: 'Central Business District (CBD), Abuja', landmark: 'Federal Secretariat', latitude: 9.0550, longitude: 7.4950 },
  },
  'Oyo': {
    origin: { label: 'Iwo Road Interchange, Ibadan', landmark: 'Iwo Road Flyover', latitude: 7.4019, longitude: 3.9472 },
    destination: { label: 'Challenge Roundabout, Ibadan', landmark: 'Challenge Bus Terminal', latitude: 7.3450, longitude: 3.8820 },
  },
  'Rivers': {
    origin: { label: 'Waterlines Junction, Port Harcourt', landmark: 'Waterlines Flyover', latitude: 4.8219, longitude: 7.0092 },
    destination: { label: 'Main Park Aba, Abia State', landmark: 'Asa Road Motor Park', latitude: 5.1066, longitude: 7.3667 },
  },
  'Edo': {
    origin: { label: 'Ring Road, Benin City, Edo', landmark: 'King Square Roundabout', latitude: 6.3350, longitude: 5.6275 },
    destination: { label: 'Summit Junction, Asaba, Delta', landmark: 'Summit Stop Asaba', latitude: 6.1989, longitude: 6.7022 },
  },
  'Anambra': {
    origin: { label: 'Upper Iweka Flyover, Onitsha', landmark: 'Bridgehead Toll Point', latitude: 6.1368, longitude: 6.7933 },
    destination: { label: 'Aroma Junction, Awka', landmark: 'Awka Aroma Roundabout', latitude: 6.2209, longitude: 7.0706 },
  },
  'Enugu': {
    origin: { label: 'Holy Ghost Park, Enugu', landmark: 'Old Park Terminal', latitude: 6.4428, longitude: 7.4989 },
    destination: { label: 'Nsukka Total Roundabout', landmark: 'UNN Campus Gate', latitude: 6.8560, longitude: 7.3980 },
  },
  'Kano': {
    origin: { label: 'Kofar Ruwa Flyover, Kano', landmark: 'Katsina Road Flyover', latitude: 12.0125, longitude: 8.5144 },
    destination: { label: 'Command Junction, Kaduna', landmark: 'Abuja-Kaduna Express', latitude: 10.4619, longitude: 7.4203 },
  },
  'Kaduna': {
    origin: { label: 'Command Junction, Kaduna', landmark: 'Kaduna South Express', latitude: 10.4619, longitude: 7.4203 },
    destination: { label: 'Kawo Flyover, Kaduna North', landmark: 'Kawo Bus Terminal', latitude: 10.5820, longitude: 7.4450 },
  },
  'Delta': {
    origin: { label: 'Summit Junction, Asaba', landmark: 'Asaba Express Corridor', latitude: 6.1989, longitude: 6.7022 },
    destination: { label: 'Effurun Roundabout, Warri', landmark: 'PTI Junction, Warri', latitude: 5.5560, longitude: 5.7890 },
  },
  'Ogun': {
    origin: { label: 'Panseke Roundabout, Abeokuta', landmark: 'Panseke Motor Park', latitude: 7.1510, longitude: 3.3480 },
    destination: { label: 'Sagamu Interchange, Ogun', landmark: 'Sagamu Bypass Flyover', latitude: 6.8489, longitude: 3.6475 },
  },
};

export function getDefaultRouteForState(stateName: string): StateRouteDefaults {
  if (STATE_ROUTE_DEFAULTS[stateName]) {
    return STATE_ROUTE_DEFAULTS[stateName];
  }
  const foundState = NIGERIAN_STATES.find(
    (s) => s.name.toLowerCase() === (stateName || '').toLowerCase()
  );
  if (foundState) {
    const capital = foundState.capital;
    const secondCity = foundState.majorCities.find((c) => c !== capital) || 'Interchange Hub';
    return {
      origin: {
        label: `${capital} Central Terminal, ${foundState.name}`,
        landmark: `${capital} Central Terminal`,
        latitude: 9.0765,
        longitude: 7.3986,
      },
      destination: {
        label: `${secondCity} Junction, ${foundState.name}`,
        landmark: `${secondCity} Junction`,
        latitude: 9.0800,
        longitude: 7.4000,
      },
    };
  }
  return STATE_ROUTE_DEFAULTS['Lagos'];
}

