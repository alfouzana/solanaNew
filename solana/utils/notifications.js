import useNotificationStore from "../stores/useNotificationStore";

export function notify(newNotification) {
  const { notifications, set: setNotificationStore } =
    useNotificationStore.getState();

  setNotificationStore((state) => {
    state.notifications = [
      ...notifications,
      { type: "success", ...newNotification },
    ];
  });
}
