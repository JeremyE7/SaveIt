export const categories = {
  food_home: {
    value: "FoodHome",
    label: "Comida (supermercado)",
    group: "Food",
  },
  food_restaurant: {
    value: "FoodRestaurant",
    label: "Comida (restaurantes / delivery)",
    group: "Food",
  },

  transport_public: {
    value: "TransportPublic",
    label: "Transporte público",
    group: "Transport",
  },
  transport_fuel: {
    value: "TransportFuel",
    label: "Combustible",
    group: "Transport",
  },
  transport_taxi: {
    value: "TransportTaxi",
    label: "Taxi / Uber",
    group: "Transport",
  },
  transport_maintenance: {
    value: "TransportMaintenance",
    label: "Mantenimiento vehículo",
    group: "Transport",
  },

  housing_rent: {
    value: "HousingRent",
    label: "Alquiler",
    group: "Housing",
  },
  housing_utilities: {
    value: "HousingUtilities",
    label: "Servicios básicos",
    group: "Housing",
  },
  housing_internet: {
    value: "HousingInternet",
    label: "Internet / telefonía",
    group: "Housing",
  },
  housing_maintenance: {
    value: "HousingMaintenance",
    label: "Mantenimiento hogar",
    group: "Housing",
  },

  shopping_clothes: {
    value: "ShoppingClothes",
    label: "Ropa",
    group: "Shopping",
  },
  shopping_electronics: {
    value: "ShoppingElectronics",
    label: "Electrónica",
    group: "Shopping",
  },
  shopping_general: {
    value: "ShoppingGeneral",
    label: "Compras generales",
    group: "Shopping",
  },

  health_medicine: {
    value: "HealthMedicine",
    label: "Medicinas",
    group: "Health",
  },
  health_doctor: {
    value: "HealthDoctor",
    label: "Doctor / clínica",
    group: "Health",
  },
  health_insurance: {
    value: "HealthInsurance",
    label: "Seguro médico",
    group: "Health",
  },

  entertainment_streaming: {
    value: "EntertainmentStreaming",
    label: "Streaming (Netflix, Spotify)",
    group: "Entertainment",
  },
  entertainment_games: {
    value: "EntertainmentGames",
    label: "Videojuegos",
    group: "Entertainment",
  },
  entertainment_events: {
    value: "EntertainmentEvents",
    label: "Eventos / cine / conciertos",
    group: "Entertainment",
  },

  education_courses: {
    value: "EducationCourses",
    label: "Cursos / educación",
    group: "Education",
  },
  education_books: {
    value: "EducationBooks",
    label: "Libros / material educativo",
    group: "Education",
  },

  work_tools: {
    value: "WorkTools",
    label: "Herramientas de trabajo",
    group: "Work",
  },
  work_software: {
    value: "WorkSoftware",
    label: "Software / suscripciones",
    group: "Work",
  },

  finance_fees: {
    value: "FinanceFees",
    label: "Comisiones bancarias",
    group: "Finance",
  },
  finance_credit: {
    value: "FinanceCredit",
    label: "Pago tarjeta crédito",
    group: "Finance",
  },
  finance_investment: {
    value: "FinanceInvestment",
    label: "Inversiones",
    group: "Finance",
  },
  finance_savings: {
    value: "FinanceSavings",
    label: "Ahorros",
    group: "Finance",
  },

  personal_care: {
    value: "PersonalCare",
    label: "Cuidado personal",
    group: "Personal",
  },
  cleaning: {
    value: "Cleaning",
    label: "Aseo / limpieza",
    group: "Personal",
  },

  gifts: {
    value: "Gifts",
    label: "Regalos",
    group: "Other",
  },
  pets: {
    value: "Pets",
    label: "Mascotas",
    group: "Other",
  },
  travel: {
    value: "Travel",
    label: "Viajes",
    group: "Other",
  },

  taxes: {
    value: "Taxes",
    label: "Impuestos",
    group: "Finance",
  },
  donations: {
    value: "Donations",
    label: "Donaciones",
    group: "Other",
  },

  other: {
    value: "Other",
    label: "Otro",
    group: "Other",
  },
} as const;

export type Category = keyof typeof categories;
