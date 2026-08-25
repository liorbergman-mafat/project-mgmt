import locations from "./preview-locations.json";

const notNeeded = async () => {
  throw new Error("preview harness: not implemented");
};

export const api = {
  projects: { list: notNeeded, get: notNeeded, create: notNeeded, update: notNeeded, remove: notNeeded },
  itemTypes: { list: async () => [], create: notNeeded, update: notNeeded, remove: notNeeded },
  itemModels: { list: async () => [], create: notNeeded, update: notNeeded, remove: notNeeded },
  itemStatuses: { list: async () => [], create: notNeeded, update: notNeeded, remove: notNeeded },
  locations: {
    list: async () => locations,
    create: notNeeded,
    update: notNeeded,
    remove: async (id: string) => {
      console.log("preview: delete", id);
    },
  },
  items: { list: notNeeded, create: notNeeded, update: notNeeded, remove: notNeeded },
  loans: { list: notNeeded, create: notNeeded, update: notNeeded, remove: notNeeded },
  feedback: { list: notNeeded, create: notNeeded, update: notNeeded, remove: notNeeded },
};
