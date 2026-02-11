export const categories = {
  food_home: {
    value: "FoodHome",
    label: "Comida (supermercado)",
    group: "Food",
    color: "#FF7A59",
  },
  food_restaurant: {
    value: "FoodRestaurant",
    label: "Comida (restaurantes / delivery)",
    group: "Food",
    color: "#FF4E50",
  },

  transport_public: {
    value: "TransportPublic",
    label: "Transporte público",
    group: "Transport",
    color: "#3A86FF",
  },
  transport_fuel: {
    value: "TransportFuel",
    label: "Combustible",
    group: "Transport",
    color: "#4361EE",
  },
  transport_taxi: {
    value: "TransportTaxi",
    label: "Taxi / Uber",
    group: "Transport",
    color: "#4895EF",
  },
  transport_maintenance: {
    value: "TransportMaintenance",
    label: "Mantenimiento vehículo",
    group: "Transport",
    color: "#4CC9F0",
  },

  housing_rent: {
    value: "HousingRent",
    label: "Alquiler",
    group: "Housing",
    color: "#2ECC71",
  },
  housing_utilities: {
    value: "HousingUtilities",
    label: "Servicios básicos",
    group: "Housing",
    color: "#27AE60",
  },
  housing_internet: {
    value: "HousingInternet",
    label: "Internet / telefonía",
    group: "Housing",
    color: "#1ABC9C",
  },
  housing_maintenance: {
    value: "HousingMaintenance",
    label: "Mantenimiento hogar",
    group: "Housing",
    color: "#16A085",
  },

  shopping_clothes: {
    value: "ShoppingClothes",
    label: "Ropa",
    group: "Shopping",
    color: "#9B5DE5",
  },
  shopping_electronics: {
    value: "ShoppingElectronics",
    label: "Electrónica",
    group: "Shopping",
    color: "#7209B7",
  },
  shopping_general: {
    value: "ShoppingGeneral",
    label: "Compras generales",
    group: "Shopping",
    color: "#B5179E",
  },

  health_medicine: {
    value: "HealthMedicine",
    label: "Medicinas",
    group: "Health",
    color: "#FF6B6B",
  },
  health_doctor: {
    value: "HealthDoctor",
    label: "Doctor / clínica",
    group: "Health",
    color: "#E63946",
  },
  health_insurance: {
    value: "HealthInsurance",
    label: "Seguro médico",
    group: "Health",
    color: "#FF8787",
  },

  entertainment_streaming: {
    value: "EntertainmentStreaming",
    label: "Streaming (Netflix, Spotify)",
    group: "Entertainment",
    color: "#F72585",
  },
  entertainment_games: {
    value: "EntertainmentGames",
    label: "Videojuegos",
    group: "Entertainment",
    color: "#FFBE0B",
  },
  entertainment_events: {
    value: "EntertainmentEvents",
    label: "Eventos / cine / conciertos",
    group: "Entertainment",
    color: "#FB5607",
  },

  education_courses: {
    value: "EducationCourses",
    label: "Cursos / educación",
    group: "Education",
    color: "#FFD166",
  },
  education_books: {
    value: "EducationBooks",
    label: "Libros / material educativo",
    group: "Education",
    color: "#F4A261",
  },

  work_tools: {
    value: "WorkTools",
    label: "Herramientas de trabajo",
    group: "Work",
    color: "#6C757D",
  },
  work_software: {
    value: "WorkSoftware",
    label: "Software / suscripciones",
    group: "Work",
    color: "#495057",
  },

  finance_fees: {
    value: "FinanceFees",
    label: "Comisiones bancarias",
    group: "Finance",
    color: "#2A9D8F",
  },
  finance_credit: {
    value: "FinanceCredit",
    label: "Pago tarjeta crédito",
    group: "Finance",
    color: "#2EC4B6",
  },
  finance_investment: {
    value: "FinanceInvestment",
    label: "Inversiones",
    group: "Finance",
    color: "#06D6A0",
  },
  finance_savings: {
    value: "FinanceSavings",
    label: "Ahorros",
    group: "Finance",
    color: "#118AB2",
  },

  personal_care: {
    value: "PersonalCare",
    label: "Cuidado personal",
    group: "Personal",
    color: "#FFAFCC",
  },
  cleaning: {
    value: "Cleaning",
    label: "Aseo / limpieza",
    group: "Personal",
    color: "#BDE0FE",
  },

  gifts: {
    value: "Gifts",
    label: "Regalos",
    group: "Other",
    color: "#ADB5BD",
  },
  pets: {
    value: "Pets",
    label: "Mascotas",
    group: "Other",
    color: "#8D99AE",
  },
  travel: {
    value: "Travel",
    label: "Viajes",
    group: "Other",
    color: "#457B9D",
  },

  taxes: {
    value: "Taxes",
    label: "Impuestos",
    group: "Finance",
    color: "#264653",
  },
  donations: {
    value: "Donations",
    label: "Donaciones",
    group: "Other",
    color: "#A8DADC",
  },

  other: {
    value: "Other",
    label: "Otro",
    group: "Other",
    color: "#CED4DA",
  },
} as const;

export type Category = keyof typeof categories;
