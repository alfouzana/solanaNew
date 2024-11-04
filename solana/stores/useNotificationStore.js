import create from "zustand";
import produce from "immer";

const useNotificationStore = create((set, _get) => ({
  notifications: [],
  set: (fn) => set(produce(fn)),
}));

export default useNotificationStore;
